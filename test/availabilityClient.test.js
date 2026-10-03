import assert from "node:assert/strict";
import test from "node:test";

import {
  buildAvailabilityRequest,
  fetchRoomAvailability,
} from "../src/utils/availability.js";

function response(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => "application/json" },
    async json() { return body; },
  };
}

test("builds a one-day Bnovo range while keeping exact hourly timestamps", () => {
  assert.deepEqual(buildAvailabilityRequest({
    checkIn: "2026-10-10",
    checkInTime: "10:00",
    duration: "Up to 3 hours",
    roomType: "STANDARD",
  }), {
    checkIn: "2026-10-10",
    checkOut: "2026-10-11",
    roomType: "STANDARD",
    startAt: "2026-10-10T10:00:00+05:00",
    endAt: "2026-10-10T13:00:00+05:00",
  });
});

test("availability client returns known aggregate availability", async () => {
  const result = await fetchRoomAvailability({
    apiBase: "/backend-api",
    checkIn: "2026-10-10",
    checkInTime: "10:00",
    duration: "Up to 3 hours",
    roomType: "STANDARD",
    fetchImpl: async () => response(200, {
      ok: true, availabilityKnown: true, roomType: "STANDARD", available: true,
      availableCount: 4, totalCapacity: 23, source: ["bnovo", "local"],
    }),
  });
  assert.equal(result.available, true);
  assert.equal(result.availableCount, 4);
});

test("availability client fails closed for HTTP and malformed responses", async () => {
  const common = {
    apiBase: "/backend-api", checkIn: "2026-10-10", checkInTime: "10:00",
    duration: "Up to 3 hours", roomType: "FAMILY",
  };
  const unavailable = await fetchRoomAvailability({
    ...common,
    fetchImpl: async () => response(503, { ok: false, code: "BNOVO_UNAVAILABLE" }),
  });
  const malformed = await fetchRoomAvailability({
    ...common,
    fetchImpl: async () => response(200, { ok: true }),
  });
  assert.equal(unavailable.available, false);
  assert.equal(unavailable.availabilityKnown, false);
  assert.equal(malformed.available, false);
  assert.equal(malformed.availabilityKnown, false);
});

test("availability client fails closed on a network error", async () => {
  const result = await fetchRoomAvailability({
    apiBase: "/backend-api", checkIn: "2026-10-10", checkInTime: "10:00",
    duration: "Up to 3 hours", roomType: "STANDARD",
    fetchImpl: async () => { throw new Error("network down"); },
  });
  assert.deepEqual(result, {
    ok: false,
    availabilityKnown: false,
    available: false,
    code: "BNOVO_UNAVAILABLE",
  });
});
