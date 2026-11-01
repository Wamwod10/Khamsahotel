// Guest-facing booking dates and times must always use the hotel's clock,
// not the Render process timezone or the viewer's browser timezone.
const HOTEL_TIME_ZONE = "Asia/Tashkent";

const hotelPartsFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: HOTEL_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function hotelParts(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return Object.fromEntries(
    hotelPartsFormatter.formatToParts(date).map(({ type, value: part }) => [type, part]),
  );
}

function dateOnlyParts(value) {
  if (value instanceof Date) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ""));
  if (!match) return null;
  return { year: match[1], month: match[2], day: match[3] };
}

function localDateTimeParts(value) {
  if (value instanceof Date) return null;
  const raw = String(value || "");
  // Offset-free timestamps represent hotel-local wall clock time.
  // Never interpret them in the server's system timezone.
  if (/(?:Z|[+-]\d{2}:?\d{2})$/i.test(raw)) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::\d{2}(?:\.\d+)?)?$/.exec(raw);
  if (!match) return null;
  return { year: match[1], month: match[2], day: match[3], hour: match[4], minute: match[5] };
}

export function formatDisplayDate(value) {
  if (!value) return "-";
  const parts = dateOnlyParts(value) || localDateTimeParts(value) || hotelParts(value);
  if (!parts) return String(value);
  return parts.day + "." + parts.month + "." + parts.year;
}

export function formatDisplayTime(value) {
  if (!value) return "-";
  const raw = String(value).trim();
  if (/^\d{2}:\d{2}(?::\d{2})?$/.test(raw)) return raw.slice(0, 5);
  const parts = localDateTimeParts(value) || hotelParts(value);
  return parts ? parts.hour + ":" + parts.minute : raw.slice(0, 5);
}

export function formatDisplayDateTime(value) {
  if (!value) return "-";
  const parts = localDateTimeParts(value) || hotelParts(value);
  if (!parts) return "-";
  return parts.day + "." + parts.month + "." + parts.year + " " + parts.hour + ":" + parts.minute;
}
