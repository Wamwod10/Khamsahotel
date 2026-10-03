import assert from "node:assert/strict";
import test from "node:test";

import {
  buildSafeAvailabilityTrace,
  createBnovoClient,
  getSafeBookingFields,
} from "../bnovo.js";

const booking = {
  id: 101993016,
  number: "JRC37-011026",
  room_name: "1",
  room_type_id: 497470,
  room_id: 934884,
  parent_room_type_id: 497470,
  plan_name: "Стандартный",
  status: { id: 1, name: "Новое", color: "acd87f" },
  dates: {
    arrival: "2026-12-11 12:00:00+03",
    departure: "2026-12-12 10:00:00+03",
    original_arrival: "2026-12-11 12:00:00+03",
    original_departure: "2026-12-12 10:00:00+03",
    real_arrival: "2026-12-11 12:00:00+03",
    real_departure: "2026-12-12 10:00:00+03",
  },
  extra_provider: {
    internal_info: {
      ota_roomtype_id: "1136527702",
      ota_roomtype_name: "Family Room with Shared Bathroom",
    },
  },
  customer: {
    name: "Must not leak",
    phone: "+998000000000",
    email: "private@example.test",
    passport: "AA0000000",
  },
  payment: { amount: 1000 },
};

const mapping = {
  identifierField: "room_type_id",
  STANDARD: new Set(["497469"]),
  FAMILY: new Set(["497470"]),
};

test("safe exact-booking diagnostic includes room identifiers but excludes PII", () => {
  const result = getSafeBookingFields(booking);
  assert.equal(result.id, 101993016);
  assert.equal(result.number, "JRC37-011026");
  assert.equal(result.room_type_id, 497470);
  assert.equal(result.otherRoomCategoryIdentifiers.room_id, 934884);
  assert.equal(
    result.otherRoomCategoryIdentifiers["extra_provider.internal_info.ota_roomtype_name"],
    "Family Room with Shared Bathroom",
  );
  const serialized = JSON.stringify(result);
  for (const secret of ["Must not leak", "+998000000000", "private@example.test", "AA0000000", "1000"]) {
    assert.equal(serialized.includes(secret), false);
  }
});

test("safe trace shows the PMS wall-clock interval and exact overlap decision", () => {
  const trace = buildSafeAvailabilityTrace(booking, {
    roomType: "FAMILY",
    checkIn: "2026-12-12",
    checkOut: "2026-12-13",
    startAt: "2026-12-12T10:00:00+05:00",
    endAt: "2026-12-12T13:00:00+05:00",
  }, mapping, { hotelOffsetMinutes: 300 });

  assert.deepEqual(trace, {
    bookingId: 101993016,
    bookingNumber: "JRC37-011026",
    status: { id: "1", name: "новое" },
    parsedStart: "2026-12-11T14:00:00+05:00",
    parsedEnd: "2026-12-12T12:00:00+05:00",
    requestedStart: "2026-12-12T10:00:00+05:00",
    requestedEnd: "2026-12-12T13:00:00+05:00",
    mappedRoomType: "FAMILY",
    overlap: true,
    skipReason: null,
  });
});

test("safe trace explains a room-type mismatch", () => {
  const trace = buildSafeAvailabilityTrace(booking, {
    roomType: "STANDARD",
    checkIn: "2026-12-12",
    checkOut: "2026-12-13",
    startAt: "2026-12-12T10:00:00+05:00",
    endAt: "2026-12-12T13:00:00+05:00",
  }, mapping, { hotelOffsetMinutes: 300 });
  assert.equal(trace.overlap, true);
  assert.equal(trace.skipReason, "ROOM_TYPE_MISMATCH");
});

test("BNOVO_DEBUG logs only the safe availability trace", () => {
  const logs = [];
  const client = createBnovoClient({
    env: {
      BNOVO_DEBUG: "true",
      HOTEL_TZ_OFFSET: "5",
      BNOVO_ROOM_IDENTIFIER_FIELD: "room_type_id",
      BNOVO_STANDARD_ROOM_IDS: "497469",
      BNOVO_FAMILY_ROOM_IDS: "497470",
    },
    logger: { log: (...parts) => logs.push(parts), warn() {} },
  });
  client.debugAvailabilityDecision(booking, {
    roomType: "FAMILY",
    checkIn: "2026-12-12",
    checkOut: "2026-12-13",
    startAt: "2026-12-12T10:00:00+05:00",
    endAt: "2026-12-12T13:00:00+05:00",
  });
  assert.equal(logs.length, 1);
  const serialized = JSON.stringify(logs);
  assert.equal(serialized.includes("JRC37-011026"), true);
  assert.equal(serialized.includes("Must not leak"), false);
  assert.equal(serialized.includes("private@example.test"), false);
});
