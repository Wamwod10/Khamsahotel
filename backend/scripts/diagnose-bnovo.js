import "dotenv/config";
import {
  buildRoomMapping,
  buildSafeAvailabilityTrace,
  createBnovoClient,
  getSafeBookingFields,
  getSafeDiagnosticRows,
} from "../bnovo.js";

const args = new Map();
for (let index = 2; index < process.argv.length; index += 2) {
  args.set(process.argv[index], process.argv[index + 1]);
}

const dateFrom = args.get("--from");
const dateTo = args.get("--to");
const bookingNumber = args.get("--booking-number");
const roomType = args.get("--room-type");
const requestStart = args.get("--request-start");
const requestEnd = args.get("--request-end");
if (!/^\d{4}-\d{2}-\d{2}$/.test(dateFrom || "") || !/^\d{4}-\d{2}-\d{2}$/.test(dateTo || "")) {
  console.error("Usage: npm run bnovo:diagnose -- --from YYYY-MM-DD --to YYYY-MM-DD [--booking-number NUMBER] [--room-type STANDARD|FAMILY --request-start ISO --request-end ISO]");
  process.exitCode = 1;
} else {
  try {
    const client = createBnovoClient();
    const { bookings, diagnostics } = await client.getBookingsDetailed({ dateFrom, dateTo });
    const mapping = buildRoomMapping();
    const rows = getSafeDiagnosticRows(bookings, mapping);
    const matchingBookings = bookingNumber
      ? bookings.filter((booking) => String(
        booking?.number ?? booking?.booking_number ?? "",
      ) === bookingNumber)
      : [];
    const canTrace = roomType && requestStart && requestEnd;
    const bookingTraces = canTrace
      ? matchingBookings.map((booking) => buildSafeAvailabilityTrace(booking, {
        roomType: String(roomType).toUpperCase(),
        checkIn: String(requestStart).slice(0, 10),
        checkOut: String(requestEnd).slice(0, 10),
        startAt: requestStart,
        endAt: requestEnd,
      }, mapping, {
        hotelOffsetMinutes: Number(process.env.HOTEL_TZ_OFFSET || 5) * 60,
      }))
      : [];
    console.log(JSON.stringify({
      ok: true,
      dateFrom,
      dateTo,
      selectionDataType: "checkmate",
      strategy: diagnostics.strategy,
      requestCount: diagnostics.requestCount,
      uniqueBookingCount: diagnostics.uniqueBookingCount,
      duplicateCount: diagnostics.duplicateCount,
      repeatedPageProtectionTriggered: diagnostics.repeatedPageProtectionTriggered,
      lastHttpStatus: diagnostics.lastHttpStatus,
      safeResponseMetadata: diagnostics.responseMetadata,
      uniqueRoomAndStatusValues: rows,
      ...(bookingNumber ? {
        bookingNumber,
        matchingBookingCount: matchingBookings.length,
        matchingBookings: matchingBookings.map(getSafeBookingFields),
        ...(canTrace ? { bookingTraces } : {}),
      } : {}),
    }, null, 2));
    if (bookingNumber && matchingBookings.length === 0) process.exitCode = 2;
  } catch (error) {
    console.error(JSON.stringify({
      ok: false,
      code: error?.code || "BNOVO_UNAVAILABLE",
      strategy: error?.diagnostics?.strategy || null,
      requestCount: error?.diagnostics?.requestCount || 0,
      uniqueBookingCount: error?.diagnostics?.uniqueBookingCount || 0,
      duplicateCount: error?.diagnostics?.duplicateCount || 0,
      repeatedPageProtectionTriggered:
        error?.diagnostics?.repeatedPageProtectionTriggered || false,
      lastHttpStatus: error?.diagnostics?.lastHttpStatus || null,
      safeResponseMetadata: error?.diagnostics?.responseMetadata || null,
    }, null, 2));
    process.exitCode = 1;
  }
}
