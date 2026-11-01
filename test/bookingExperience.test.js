import test from "node:test";
import assert from "node:assert/strict";
import {addHotelHours, checkoutPreview, durationToHours, hotelNowParts,
  isPastHotelSlot, readBookingDraft, saveBookingDraft, DRAFT_KEY} from "../src/utils/bookingExperience.js";
test("Tashkent date does not depend on browser timezone", () => {
  assert.deepEqual(hotelNowParts(new Date("2026-11-01T20:00:00Z")),
    { date: "2026-11-02", time: "01:00" });
  assert.equal(isPastHotelSlot("2026-11-01", "23:30", new Date("2026-11-01T20:00:00Z")), true);
  assert.equal(isPastHotelSlot("2026-11-02", "01:01", new Date("2026-11-01T20:00:00Z")), false);
});
test("3, 10, 24-hour windows cross dates correctly", () => {
  assert.deepEqual(addHotelHours("2026-11-01", "23:30", 3), { date: "2026-11-02", time: "02:30" });
  assert.deepEqual(checkoutPreview("2026-11-30", "12:00", "One day"), {date:"2026-12-01", time:"12:00"});
  assert.equal(durationToHours("Up to 10 hours"), 10);
  assert.equal(durationToHours("3 часа"), 3);
});
test("draft does not store PII", () => {
  const map = new Map();
  const storage = {getItem:(k)=>map.get(k),setItem:(k,v)=>map.set(k,v)};
  saveBookingDraft(storage,{checkIn:"2026-12-01",checkOutTime:"14:30",duration:"3h",rooms:"STANDARD",email:"x@example.test"});
  assert.equal(map.get(DRAFT_KEY).includes("x@example.test"),false);
  assert.equal(readBookingDraft(storage).checkOutTime,"14:30");
});
