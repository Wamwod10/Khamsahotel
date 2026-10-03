const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_ONLY = /^(\d{2}):(\d{2})$/;
const ALLOWED_DURATION_HOURS = new Set([3, 10, 24]);

function pad(value) {
  return String(value).padStart(2, "0");
}

function validDateParts(value) {
  const match = DATE_ONLY.exec(String(value || ""));
  if (!match) return null;
  const parts = { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  return date.getUTCFullYear() === parts.year &&
    date.getUTCMonth() === parts.month - 1 &&
    date.getUTCDate() === parts.day ? parts : null;
}

function validTimeParts(value) {
  const match = TIME_ONLY.exec(String(value || ""));
  if (!match) return null;
  const parts = { hour: Number(match[1]), minute: Number(match[2]) };
  return parts.hour >= 0 && parts.hour <= 23 && parts.minute >= 0 && parts.minute <= 59 ? parts : null;
}

function timezoneSuffix(offsetHours) {
  const numeric = Number(offsetHours);
  if (!Number.isFinite(numeric) || Math.abs(numeric) > 14) throw new TypeError("Invalid hotel timezone offset");
  const totalMinutes = Math.round(numeric * 60);
  const sign = totalMinutes < 0 ? "-" : "+";
  const absolute = Math.abs(totalMinutes);
  return `${sign}${pad(Math.floor(absolute / 60))}:${pad(absolute % 60)}`;
}

function formatUtcParts(date) {
  return {
    date: `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`,
    time: `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`,
  };
}

export function buildHotelAvailabilityWindow(input = {}, options = {}) {
  const checkInDate = String(input.checkInDate || "");
  const checkInTime = String(input.checkInTime || "");
  const date = validDateParts(checkInDate);
  const time = validTimeParts(checkInTime);
  const durationHours = Number(input.durationHours);
  if (!date || !time) throw new TypeError("Invalid check-in date or time");
  if (!ALLOWED_DURATION_HOURS.has(durationHours)) throw new TypeError("Invalid booking duration");

  const roomType = String(input.roomType || "").toUpperCase();
  const localStart = new Date(Date.UTC(date.year, date.month - 1, date.day, time.hour, time.minute));
  const localEnd = new Date(localStart.getTime() + durationHours * 3_600_000);
  const end = formatUtcParts(localEnd);
  const nextDay = formatUtcParts(new Date(Date.UTC(date.year, date.month - 1, date.day + 1))).date;
  const suffix = timezoneSuffix(options.hotelOffsetHours ?? Number(process.env.HOTEL_TZ_OFFSET || 5));

  return {
    checkInDate,
    checkInTime,
    durationHours,
    roomType,
    checkIn: checkInDate,
    checkOut: end.date > checkInDate ? end.date : nextDay,
    startAt: `${checkInDate}T${checkInTime}:00${suffix}`,
    endAt: `${end.date}T${end.time}:00${suffix}`,
  };
}

export const _internals = { validDateParts, validTimeParts, timezoneSuffix };
