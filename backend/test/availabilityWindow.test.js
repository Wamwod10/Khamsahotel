import assert from "node:assert/strict";
import test from "node:test";

import { buildHotelAvailabilityWindow } from "../availabilityWindow.js";

test("3-hour stay ends on the exact same-day boundary", () => {
  assert.deepEqual(buildHotelAvailabilityWindow({
    checkInDate: "2026-10-26",
    checkInTime: "14:00",
    durationHours: 3,
    roomType: "FAMILY",
  }, { hotelOffsetHours: 5 }), {
    checkInDate: "2026-10-26",
    checkInTime: "14:00",
    durationHours: 3,
    roomType: "FAMILY",
    checkIn: "2026-10-26",
    checkOut: "2026-10-27",
    startAt: "2026-10-26T14:00:00+05:00",
    endAt: "2026-10-26T17:00:00+05:00",
  });
});

test("10-hour stay crosses midnight", () => {
  const result = buildHotelAvailabilityWindow({
    checkInDate: "2026-10-26", checkInTime: "14:00", durationHours: 10, roomType: "STANDARD",
  }, { hotelOffsetHours: 5 });
  assert.equal(result.endAt, "2026-10-27T00:00:00+05:00");
  assert.equal(result.checkOut, "2026-10-27");
});

test("24-hour stay ends at the same local time next day", () => {
  const result = buildHotelAvailabilityWindow({
    checkInDate: "2026-10-26", checkInTime: "14:00", durationHours: 24, roomType: "STANDARD",
  }, { hotelOffsetHours: 5 });
  assert.equal(result.endAt, "2026-10-27T14:00:00+05:00");
});

test("invalid local date, time, or unsupported duration is rejected", () => {
  assert.throws(() => buildHotelAvailabilityWindow({ checkInDate: "2026-02-30", checkInTime: "14:00", durationHours: 3, roomType: "STANDARD" }));
  assert.throws(() => buildHotelAvailabilityWindow({ checkInDate: "2026-10-26", checkInTime: "24:00", durationHours: 3, roomType: "STANDARD" }));
  assert.throws(() => buildHotelAvailabilityWindow({ checkInDate: "2026-10-26", checkInTime: "14:00", durationHours: 4, roomType: "STANDARD" }));
});
