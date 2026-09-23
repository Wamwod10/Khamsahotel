function roomCode(value) {
  const normalized = String(value || "").trim().toUpperCase();
  return normalized.includes("FAMILY") ? "FAMILY" : normalized;
}

function durationHours(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized.includes("10")) return 10;
  if (normalized.includes("24")) return 24;
  if (normalized.includes("3")) return 3;
  if (
    normalized === "oneday" ||
    normalized.includes("one day") ||
    normalized.includes("1 day") ||
    normalized.includes("1 kun") ||
    normalized.includes("1 день")
  ) {
    return 24;
  }
  return null;
}

function bookingWindow(booking) {
  const date = String(booking?.checkIn || "").slice(0, 10);
  const time = String(booking?.checkOutTime || "").slice(0, 5);
  const hours = durationHours(booking?.duration);
  if (!date || !time || !hours) return null;

  const start = new Date(`${date}T${time}:00`);
  if (Number.isNaN(start.getTime())) return null;

  return {
    start: start.getTime(),
    end: start.getTime() + hours * 60 * 60 * 1000,
  };
}

export function hasOverlappingFamilyBooking(bookings, candidate) {
  if (roomCode(candidate?.rooms) !== "FAMILY") return false;

  const candidateWindow = bookingWindow(candidate);
  if (!candidateWindow) return false;

  return (Array.isArray(bookings) ? bookings : []).some((booking) => {
    if (roomCode(booking?.rooms) !== "FAMILY") return false;
    const existingWindow = bookingWindow(booking);
    if (!existingWindow) return false;

    return (
      candidateWindow.start < existingWindow.end &&
      candidateWindow.end > existingWindow.start
    );
  });
}
