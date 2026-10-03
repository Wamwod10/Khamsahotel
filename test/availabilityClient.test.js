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

test("builds the normalized time-aware request model", () => {
  assert.deepEqual(buildAvailabilityRequest({
    checkIn: "2026-10-10",
    checkInTime: "10:00",
    duration: "Up to 3 hours",
    roomType: "STANDARD",
  }), {
    checkInDate: "2026-10-10",
    checkInTime: "10:00",
    durationHours: 3,
    roomType: "STANDARD",
  });
});

test("changing only duration changes the availability request", async () => {
  const urls = [];
  const fetchImpl = async (url) => {
    urls.push(url);
    return response(200, { ok: true, availabilityKnown: true, roomType: "FAMILY", available: true, availableCount: 1, totalCapacity: 1 });
  };
  const common = { apiBase: "/backend-api", checkIn: "2026-10-26", checkInTime: "14:00", roomType: "FAMILY", fetchImpl };
  await fetchRoomAvailability({ ...common, duration: "Up to 3 hours" });
  await fetchRoomAvailability({ ...common, duration: "Up to 10 hours" });
  assert.equal(new URL(urls[0], "https://test.local").searchParams.get("durationHours"), "3");
  assert.equal(new URL(urls[1], "https://test.local").searchParams.get("durationHours"), "10");
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
