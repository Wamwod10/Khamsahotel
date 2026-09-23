import assert from "node:assert/strict";
import test from "node:test";

import { hasOverlappingFamilyBooking } from "../src/utils/familyBookingAvailability.js";

const existingFamilyBooking = {
  rooms: "FAMILY",
  checkIn: "2026-10-01",
  checkOutTime: "10:00",
  duration: "Up to 3 hours",
};

test("blocks a family booking whose stay overlaps a family booking in My bookings", () => {
  const candidate = {
    rooms: "FAMILY",
    checkIn: "2026-10-01",
    checkOutTime: "12:00",
    duration: "Up to 3 hours",
  };

  assert.equal(hasOverlappingFamilyBooking([existingFamilyBooking], candidate), true);
});

test("allows a family booking that starts when the existing booking ends", () => {
  const candidate = {
    rooms: "FAMILY",
    checkIn: "2026-10-01",
    checkOutTime: "13:00",
    duration: "Up to 3 hours",
  };

  assert.equal(hasOverlappingFamilyBooking([existingFamilyBooking], candidate), false);
});
