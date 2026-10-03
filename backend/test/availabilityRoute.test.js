import assert from "node:assert/strict";
import test from "node:test";

import {
  availabilityRequestFromPaymentItem,
  checkPaymentAvailability,
  createAvailabilityHandler,
} from "../availabilityRoute.js";

function makeResponse() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

test("availability route returns 400 for invalid dates", async () => {
  const handler = createAvailabilityHandler({ check: async () => { throw new Error("must not run"); } });
  const response = makeResponse();
  await handler({ query: { checkIn: "2026-10-10", checkOut: "2026-10-10", roomType: "STANDARD" } }, response);
  assert.equal(response.statusCode, 400);
  assert.deepEqual(response.body, { ok: false, availabilityKnown: false, available: false, code: "INVALID_DATES" });
});

test("availability route returns a secret-free 503 when Bnovo is unknown", async () => {
  const handler = createAvailabilityHandler({
    check: async () => ({
      ok: false, availabilityKnown: false, roomType: "STANDARD", available: false,
      code: "BNOVO_UNAVAILABLE", internal: "BNOVO_API_KEY=do-not-return",
    }),
  });
  const response = makeResponse();
  await handler({ query: { checkIn: "2026-10-10", checkOut: "2026-10-12", roomType: "STANDARD" } }, response);
  assert.equal(response.statusCode, 503);
  assert.deepEqual(response.body, {
    ok: false,
    availabilityKnown: false,
    roomType: "STANDARD",
    available: false,
    code: "BNOVO_UNAVAILABLE",
  });
  assert.equal(JSON.stringify(response.body).includes("do-not-return"), false);
});

test("availability route returns only aggregate availability fields", async () => {
  const handler = createAvailabilityHandler({
    check: async () => ({
      ok: true, availabilityKnown: true, roomType: "FAMILY", available: true,
      availableCount: 1, totalCapacity: 1,
      occupiedCount: { bnovo: 0, local: 0, total: 0 },
      source: ["bnovo", "local"], guestName: "Must Not Leak",
    }),
  });
  const response = makeResponse();
  await handler({ query: { checkIn: "2026-10-10", checkOut: "2026-10-12", roomType: "FAMILY" } }, response);
  assert.equal(response.statusCode, 200);
  assert.equal(response.body.availableCount, 1);
  assert.equal("guestName" in response.body, false);
});

test("hourly payment windows use a one-day Bnovo query and preserve exact local timestamps", () => {
  assert.deepEqual(availabilityRequestFromPaymentItem({
    rooms: "FAMILY",
    checkIn: "2026-10-10",
    checkOut: "2026-10-10",
    checkInAt: new Date("2026-10-10T10:00:00+05:00"),
    checkOutAt: new Date("2026-10-10T13:00:00+05:00"),
  }), {
    roomType: "FAMILY",
    checkIn: "2026-10-10",
    checkOut: "2026-10-11",
    startAt: "2026-10-10T05:00:00.000Z",
    endAt: "2026-10-10T08:00:00.000Z",
  });
});

test("payment availability guard blocks unknown Bnovo availability", async () => {
  const result = await checkPaymentAvailability([{
    rooms: "STANDARD",
    checkIn: "2026-10-10",
    checkOut: "2026-10-10",
    checkInAt: new Date("2026-10-10T10:00:00+05:00"),
    checkOutAt: new Date("2026-10-10T13:00:00+05:00"),
  }], {
    check: async () => ({ ok: false, availabilityKnown: false, available: false, code: "BNOVO_UNAVAILABLE" }),
  });
  assert.deepEqual(result, { ok: false, code: "BNOVO_UNAVAILABLE", roomType: "STANDARD" });
});
