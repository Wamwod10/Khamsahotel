// Booking requests carry the guest-selected Tashkent wall clock, not UTC.
// No date-only or missing-time fallback: silently using 00:00 corrupts reservations.
const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME = /^([01]\d|2[0-3]):([0-5]\d)(?::00)?$/;

export function readGuestCheckInSelection(item) {
  if (!item || typeof item !== "object") return null;
  const date = String(item.checkIn ?? "").trim();
  const parts = DATE.exec(date);
  if (!parts) return null;
  const valid = new Date(Date.UTC(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3])));
  if (valid.getUTCFullYear() !== Number(parts[1]) ||
      valid.getUTCMonth() !== Number(parts[2]) - 1 ||
      valid.getUTCDate() !== Number(parts[3])) return null;

  const rawValues = [item.checkOutTime, item.checkInTime, item.check_in_time]
    .filter((value) => value !== undefined && value !== null && String(value).trim() !== "");
  if (!rawValues.length) return null;
  const times = rawValues.map((value) => {
    const match = TIME.exec(String(value).trim());
    return match ? match[1] + ":" + match[2] : null;
  });
  if (times.some((value) => !value) || new Set(times).size !== 1) return null;

  return {
    date,
    time: times[0],
    localDateTime: date + "T" + times[0] + ":00",
  };
}
