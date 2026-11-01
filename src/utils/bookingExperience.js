const DAY_MS = 86400000;
export const DRAFT_KEY = "khamsa_booking_draft_v1";
export function hotelNowParts(now = new Date()) {
  const fields = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Tashkent", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(now);
  const p = Object.fromEntries(fields.map((field) => [field.type, field.value]));
  return { date: p.year + "-" + p.month + "-" + p.day, time: p.hour + ":" + p.minute };
}
export function durationToHours(value) {
  const s = String(value ?? "").toLowerCase().replace(/\s+/g, "");
  if (s === "24h" || s === "oneday" || s.includes("1day") || s.includes("1kun") ||
      s.includes("1день") || s.includes("сутки") || s.includes("1сут")) return 24;
  if (s === "10h" || s.includes("10")) return 10;
  if (s === "3h" || s.includes("3")) return 3;
  return null;
}
function dateTimeMs(date, time) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(date || ""));
  const clock = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(time || ""));
  if (!match || !clock) return null;
  const ms = Date.UTC(+match[1], +match[2] - 1, +match[3], +clock[1], +clock[2]);
  const d = new Date(ms);
  if (d.getUTCFullYear() !== +match[1] || d.getUTCMonth() !== +match[2] - 1 ||
      d.getUTCDate() !== +match[3]) return null;
  return ms;
}
export function isPastHotelSlot(date, time, now = new Date()) {
  const selected = dateTimeMs(date, time);
  if (selected === null) return true;
  const hotel = hotelNowParts(now);
  return selected < dateTimeMs(hotel.date, hotel.time);
}
export function addHotelHours(date, time, hours) {
  const start = dateTimeMs(date, time);
  if (start === null || !Number.isFinite(hours)) return null;
  const d = new Date(start + hours * 3600000);
  return { date: d.toISOString().slice(0, 10), time: d.toISOString().slice(11, 16) };
}
export function checkoutPreview(date, time, duration) {
  const hours = durationToHours(duration);
  return hours ? addHotelHours(date, time, hours) : null;
}
export function readBookingDraft(storage) {
  try {
    const item = JSON.parse(storage?.getItem(DRAFT_KEY) || "null");
    if (!item || typeof item !== "object" || Date.now() - Number(item.savedAt) > 7 * DAY_MS) return null;
    const { checkIn, checkOutTime, duration, rooms } = item;
    if (checkIn && !/^\d{4}-\d{2}-\d{2}$/.test(checkIn)) return null;
    if (checkOutTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(checkOutTime)) return null;
    if (rooms && !["STANDARD", "FAMILY"].includes(rooms)) return null;
    return { checkIn: checkIn || "", checkOutTime: checkOutTime || "",
      duration: duration || "Up to 3 hours", rooms: rooms || "STANDARD" };
  } catch { return null; }
}
export function saveBookingDraft(storage, draft) {
  try {
    storage?.setItem(DRAFT_KEY, JSON.stringify({ checkIn: draft.checkIn,
      checkOutTime: draft.checkOutTime, duration: draft.duration,
      rooms: draft.rooms, savedAt: Date.now() }));
  } catch { /* storage can be disabled */ }
}
