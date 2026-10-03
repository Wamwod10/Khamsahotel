import assert from "node:assert/strict";
import test from "node:test";

import { createAvailabilityService, validateAvailabilityQuery } from "../availability.js";

function makeBnovoClient(bookings = []) {
  return {
    mapping: {
      identifierField: "room_name",
      STANDARD: new Set(["S1", "S2", "S3"]),
      FAMILY: new Set(["F1"]),
    },
    assertRoomMapping(roomType) {
      if (!this.mapping[roomType]?.size) throw new Error("mapping missing");
    },
    bookingBlocksInventory(booking) {
      return String(booking?.status?.name || "").toLowerCase() !== "cancelled";
    },
    async getBookings() { return bookings; },
  };
}

test("invalid dates return a validation error", () => {
  assert.deepEqual(validateAvailabilityQuery({ checkIn: "2026-02-30", checkOut: "2026-03-02", roomType: "STANDARD" }), {
    ok: false,
    status: 400,
    code: "INVALID_DATES",
  });
  assert.equal(validateAvailabilityQuery({ checkIn: "2026-10-05", checkOut: "2026-10-05", roomType: "STANDARD" }).ok, false);
});

test("multiple Standard bookings calculate availableCount from capacity 23", async () => {
  const bookings = ["S1", "S2"].map((room_name) => ({
    room_name,
    status: { name: "Confirmed" },
    dates: { arrival: "2026-10-10", departure: "2026-10-12" },
  }));
  const service = createAvailabilityService({
    bnovoClient: makeBnovoClient(bookings),
    loadLocalBookings: async () => [],
    getCapacity: async () => 23,
  });

  const result = await service.check({ checkIn: "2026-10-10", checkOut: "2026-10-12", roomType: "STANDARD" });

  assert.equal(result.available, true);
  assert.equal(result.availableCount, 21);
  assert.equal(result.totalCapacity, 23);
  assert.deepEqual(result.source, ["bnovo", "local"]);
});

test("STANDARD is not always available", async () => {
  const bookings = Array.from({ length: 23 }, (_, index) => ({
    room_name: `S${index + 1}`,
    status: { name: "Confirmed" },
    dates: { arrival: "2026-10-10", departure: "2026-10-12" },
  }));
  const mapping = Object.fromEntries(bookings.map((booking) => [booking.room_name, booking.room_name]));
  const client = makeBnovoClient(bookings);
  client.mapping.STANDARD = new Set(Object.keys(mapping));
  const service = createAvailabilityService({
    bnovoClient: client,
    loadLocalBookings: async () => [],
    getCapacity: async () => 23,
  });

  const result = await service.check({ checkIn: "2026-10-10", checkOut: "2026-10-12", roomType: "STANDARD" });

  assert.equal(result.available, false);
  assert.equal(result.availableCount, 0);
});

test("Family capacity one is consumed by an overlapping active booking", async () => {
  const service = createAvailabilityService({
    bnovoClient: makeBnovoClient([{
      room_name: "F1",
      status: { name: "Confirmed" },
      dates: { arrival: "2026-10-01", departure: "2026-10-05" },
    }]),
    loadLocalBookings: async () => [],
    getCapacity: async () => 1,
  });

  const result = await service.check({ checkIn: "2026-10-04", checkOut: "2026-10-06", roomType: "FAMILY" });

  assert.equal(result.available, false);
  assert.equal(result.availableCount, 0);
});

test("same-day Bnovo checkout does not block a new local arrival", async () => {
  const service = createAvailabilityService({
    bnovoClient: makeBnovoClient([{
      room_name: "F1",
      status: { name: "Confirmed" },
      dates: { arrival: "2026-10-01", departure: "2026-10-05" },
    }]),
    loadLocalBookings: async () => [],
    getCapacity: async () => 1,
  });

  const result = await service.check({ checkIn: "2026-10-05", checkOut: "2026-10-07", roomType: "FAMILY" });

  assert.equal(result.available, true);
  assert.equal(result.availableCount, 1);
});

test("same-day hourly Bnovo booking blocks an overlapping website time window", async () => {
  const service = createAvailabilityService({
    bnovoClient: makeBnovoClient([{
      room_name: "F1",
      status: { name: "Confirmed" },
      dates: {
        arrival: "2026-10-10 10:00:00+05:00",
        departure: "2026-10-10 13:00:00+05:00",
      },
    }]),
    loadLocalBookings: async () => [],
    getCapacity: async () => 1,
  });

  const result = await service.check({
    checkIn: "2026-10-10",
    checkOut: "2026-10-11",
    roomType: "FAMILY",
    startAt: "2026-10-10T12:00:00+05:00",
    endAt: "2026-10-10T15:00:00+05:00",
  });

  assert.equal(result.available, false);
  assert.equal(result.occupiedCount.bnovo, 1);
});

test("cancelled Bnovo booking and cancelled local booking do not consume inventory", async () => {
  const service = createAvailabilityService({
    bnovoClient: makeBnovoClient([{
      room_name: "F1",
      status: { name: "Cancelled" },
      dates: { arrival: "2026-10-10", departure: "2026-10-12" },
    }]),
    loadLocalBookings: async () => [{
      source: "local", roomType: "FAMILY", checkIn: "2026-10-10", checkOut: "2026-10-12", status: "cancelled",
    }],
    getCapacity: async () => 1,
  });

  const result = await service.check({ checkIn: "2026-10-10", checkOut: "2026-10-12", roomType: "FAMILY" });

  assert.equal(result.availableCount, 1);
});

test("local booking and Bnovo booking are both counted", async () => {
  const service = createAvailabilityService({
    bnovoClient: makeBnovoClient([{
      room_name: "S1",
      status: { name: "Confirmed" },
      dates: { arrival: "2026-10-10", departure: "2026-10-12" },
    }]),
    loadLocalBookings: async () => [{
      source: "local", roomType: "STANDARD", checkIn: "2026-10-10", checkOut: "2026-10-12", status: "paid",
    }],
    getCapacity: async () => 23,
  });

  const result = await service.check({ checkIn: "2026-10-10", checkOut: "2026-10-12", roomType: "STANDARD" });

  assert.equal(result.availableCount, 21);
  assert.deepEqual(result.occupiedCount, { bnovo: 1, local: 1, total: 2 });
});

test("Bnovo failure returns unknown availability without secrets", async () => {
  const client = makeBnovoClient();
  client.getBookings = async () => { throw new Error("BNOVO_API_KEY=secret-value"); };
  const service = createAvailabilityService({
    bnovoClient: client,
    loadLocalBookings: async () => [],
    getCapacity: async () => 23,
  });

  const result = await service.check({ checkIn: "2026-10-10", checkOut: "2026-10-12", roomType: "STANDARD" });

  assert.deepEqual(result, {
    ok: false,
    availabilityKnown: false,
    roomType: "STANDARD",
    available: false,
    code: "BNOVO_UNAVAILABLE",
  });
  assert.equal(JSON.stringify(result).includes("secret-value"), false);
});

test("active unmapped Bnovo inventory makes availability unknown", async () => {
  const service = createAvailabilityService({
    bnovoClient: makeBnovoClient([{
      room_name: "UNMAPPED",
      status: { name: "Confirmed" },
      dates: { arrival: "2026-10-10", departure: "2026-10-12" },
    }]),
    loadLocalBookings: async () => [],
    getCapacity: async () => 1,
  });

  const result = await service.check({ checkIn: "2026-10-10", checkOut: "2026-10-12", roomType: "FAMILY" });
  assert.equal(result.ok, false);
  assert.equal(result.availabilityKnown, false);
  assert.equal(result.code, "BNOVO_MAPPING_INCOMPLETE");
});

test("mapped active Bnovo booking with missing dates makes availability unknown", async () => {
  const service = createAvailabilityService({
    bnovoClient: makeBnovoClient([{
      room_name: "F1",
      status: { name: "Confirmed" },
      dates: {},
    }]),
    loadLocalBookings: async () => [],
    getCapacity: async () => 1,
  });

  const result = await service.check({ checkIn: "2026-10-10", checkOut: "2026-10-12", roomType: "FAMILY" });
  assert.equal(result.ok, false);
  assert.equal(result.availabilityKnown, false);
  assert.equal(result.code, "BNOVO_UNAVAILABLE");
});

test("overlapping identifier sets make mapping incomplete", async () => {
  const client = makeBnovoClient([]);
  client.mapping.STANDARD.add("F1");
  const service = createAvailabilityService({
    bnovoClient: client,
    loadLocalBookings: async () => [],
    getCapacity: async () => 1,
  });
  const result = await service.check({ checkIn: "2026-10-10", checkOut: "2026-10-12", roomType: "FAMILY" });
  assert.equal(result.ok, false);
  assert.equal(result.availabilityKnown, false);
});
