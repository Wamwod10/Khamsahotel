import test from "node:test";
import assert from "node:assert/strict";
import { formatDisplayDate, formatDisplayDateTime, formatDisplayTime } from "../bookingDisplayTime.js";

test("stored UTC check-in displays exactly the selected Tashkent time", () => {
  const stored = new Date("2026-10-26T09:00:00.000Z"); // guest selected 14:00 +05:00
  assert.equal(formatDisplayTime(stored), "14:00");
  assert.equal(formatDisplayTime(stored.toISOString()), "14:00");
  assert.equal(formatDisplayTime("2026-10-26T14:00:00+05:00"), "14:00");
});

test("date and time are correct around midnight in Tashkent", () => {
  const stored = new Date("2026-11-01T23:50:00.000Z");
  assert.equal(formatDisplayDate(stored), "02.11.2026");
  assert.equal(formatDisplayDateTime(stored), "02.11.2026 04:50");
  assert.equal(formatDisplayTime(stored), "04:50");
});

test("legacy wall-clock values and DATE columns are not timezone shifted", () => {
  assert.equal(formatDisplayTime("14:00"), "14:00");
  assert.equal(formatDisplayTime("2026-10-26T14:00:00"), "14:00");
  assert.equal(formatDisplayDate("2026-10-26"), "26.10.2026");
  assert.equal(formatDisplayDateTime("2026-10-26T14:00:00"), "26.10.2026 14:00");
});

test("empty and invalid values are safe", () => {
  assert.equal(formatDisplayTime(null), "-");
  assert.equal(formatDisplayDateTime("invalid"), "-");
  assert.equal(formatDisplayDate(null), "-");
});
