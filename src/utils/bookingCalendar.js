// Calendar events are generated only from the backend's confirmed, PAID booking summary.
// All booking hours are local to Asia/Tashkent (UTC+05:00), regardless of guest device settings.
function calendarUtc(date, time) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date)) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(String(time))) {
    throw new TypeError("Invalid booking date/time");
  }
  const value = new Date(date + "T" + time + ":00+05:00");
  if (Number.isNaN(value.getTime())) throw new TypeError("Invalid booking datetime");
  return value.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}
export function calendarEvent(item) {
  if (!item || !["STANDARD", "FAMILY"].includes(String(item.room).toUpperCase())) throw new TypeError("Invalid room");
  const start = calendarUtc(item.checkInDate, item.checkInTime);
  const end = calendarUtc(item.checkOutDate, item.checkOutTime);
  if (end <= start) throw new TypeError("Invalid booking interval");
  return { start, end, title: "Khamsa Hotel · " + (item.room === "FAMILY" ? "Family Room" : "Standard Room"),
    details: "Khamsa Sleep Lounge — Tashkent Airport transit area. A valid onward boarding pass is required.",
    location: "Tashkent International Airport, transit area" };
}
export function googleCalendarUrl(item) {
  const e = calendarEvent(item);
  const url = new URL("https://calendar.google.com/calendar/render");
  url.searchParams.set("action", "TEMPLATE");
  url.searchParams.set("text", e.title);
  url.searchParams.set("dates", e.start + "/" + e.end);
  url.searchParams.set("details", e.details);
  url.searchParams.set("location", e.location);
  url.searchParams.set("ctz", "Asia/Tashkent");
  return url.href;
}
function escapeIcs(value) {
  return String(value).replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n")
    .replace(/,/g, "\\,").replace(/;/g, "\\;");
}
export function bookingIcs(items, reference) {
  if (!Array.isArray(items) || !items.length) throw new TypeError("No calendar items");
  const safeRef = String(reference || "").replace(/[^A-Za-z0-9-]/g, "");
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const lines = ["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Khamsa Hotel//Booking//EN","CALSCALE:GREGORIAN","METHOD:PUBLISH"];
  items.forEach((item, i) => {
    const e = calendarEvent(item);
    lines.push("BEGIN:VEVENT","UID:" + safeRef + "-" + i + "@khamsahotel.uz","DTSTAMP:" + stamp,
      "DTSTART:" + e.start,"DTEND:" + e.end,"SUMMARY:" + escapeIcs(e.title),
      "DESCRIPTION:" + escapeIcs(e.details),"LOCATION:" + escapeIcs(e.location),"END:VEVENT");
  });
  lines.push("END:VCALENDAR");
  return lines.join("\r\n") + "\r\n";
}
export function confirmationText(data) {
  return "Khamsa Hotel · " + data.reference + "\n" + data.items.map((item) =>
    item.room + ": " + item.checkInDate + " " + item.checkInTime + " — " +
    item.checkOutDate + " " + item.checkOutTime + " (Tashkent, UTC+5)").join("\n");
}
