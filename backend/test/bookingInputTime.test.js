import test from "node:test";
import assert from "node:assert/strict";
import { readGuestCheckInSelection } from "../bookingInputTime.js";
import { buildHotelAvailabilityWindow } from "../availabilityWindow.js";
import { formatDisplayDate, formatDisplayTime } from "../bookingDisplayTime.js";

test("15:00 guest selection is preserved in Tashkent for DB and Telegram", () => {
  const selected = readGuestCheckInSelection({ checkIn: "2026-11-04", checkOutTime: "15:00" });
  assert.deepEqual(selected, { date: "2026-11-04", time: "15:00", localDateTime: "2026-11-04T15:00:00" });
  const window = buildHotelAvailabilityWindow({ checkInDate: selected.date, checkInTime: selected.time, durationHours: 3 });
  assert.equal(window.startAt, "2026-11-04T15:00:00+05:00");
  const stored = new Date(window.startAt);
  assert.equal(stored.toISOString(), "2026-11-04T10:00:00.000Z");
  assert.equal(formatDisplayTime(stored), "15:00");
  assert.equal(formatDisplayDate(stored), "04.11.2026");
});

test("absent or malformed time must never silently become midnight", () => {
  for (const missing of [undefined, null, "", "invalid", "25:00", "15:99", "2026-11-04T10:00:00Z"]) {
    assert.equal(readGuestCheckInSelection({ checkIn: "2026-11-04", checkOutTime: missing }), null);
  }
  assert.equal(readGuestCheckInSelection({ checkIn: "2026-02-30", checkOutTime: "15:00" }), null);
});

test("00:00 is accepted only if the guest explicitly selected midnight", () => {
  assert.equal(readGuestCheckInSelection({ checkIn: "2026-11-04", checkOutTime: "00:00" }).time, "00:00");
});

test("separate payment items retain their own times and cannot borrow parent time", () => {
  const booking = {
    checkIn: "2026-11-04", checkOutTime: "15:00",
    items: [
      { checkIn: "2026-11-04", checkOutTime: "15:00" },
      { checkIn: "2026-11-04", checkOutTime: "18:30" },
      { checkIn: "2026-11-04" },
    ],
  };
  assert.equal(readGuestCheckInSelection(booking.items[0]).time, "15:00");
  assert.equal(readGuestCheckInSelection(booking.items[1]).time, "18:30");
  assert.equal(readGuestCheckInSelection(booking.items[2]), null);
});

test("contradictory aliases cannot silently override the chosen time", () => {
  assert.equal(readGuestCheckInSelection({
    checkIn: "2026-11-04", checkOutTime: "15:00", checkInTime: "00:00",
  }), null);
  assert.equal(readGuestCheckInSelection({
    checkIn: "2026-11-04", checkOutTime: "15:00", checkInTime: "15:00:00",
  }).time, "15:00");
});

test("near-midnight times keep correct Tashkent calendar date", () => {
  const selected = readGuestCheckInSelection({ checkIn: "2026-11-04", checkOutTime: "23:55" });
  const window = buildHotelAvailabilityWindow({ checkInDate: selected.date, checkInTime: selected.time, durationHours: 3 });
  assert.equal(window.endAt, "2026-11-05T02:55:00+05:00");
  assert.equal(formatDisplayTime(new Date(window.startAt)), "23:55");
});
