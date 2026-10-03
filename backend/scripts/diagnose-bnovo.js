import "dotenv/config";
import { buildRoomMapping, createBnovoClient, getSafeDiagnosticRows } from "../bnovo.js";

const args = new Map();
for (let index = 2; index < process.argv.length; index += 2) {
  args.set(process.argv[index], process.argv[index + 1]);
}

const dateFrom = args.get("--from");
const dateTo = args.get("--to");
if (!/^\d{4}-\d{2}-\d{2}$/.test(dateFrom || "") || !/^\d{4}-\d{2}-\d{2}$/.test(dateTo || "")) {
  console.error("Usage: npm run bnovo:diagnose -- --from YYYY-MM-DD --to YYYY-MM-DD");
  process.exitCode = 1;
} else {
  try {
    const client = createBnovoClient();
    const { bookings, diagnostics } = await client.getBookingsDetailed({ dateFrom, dateTo });
    const rows = getSafeDiagnosticRows(bookings, buildRoomMapping());
    console.log(JSON.stringify({
      ok: true,
      dateFrom,
      dateTo,
      strategy: diagnostics.strategy,
      requestCount: diagnostics.requestCount,
      uniqueBookingCount: diagnostics.uniqueBookingCount,
      duplicateCount: diagnostics.duplicateCount,
      repeatedPageProtectionTriggered: diagnostics.repeatedPageProtectionTriggered,
      lastHttpStatus: diagnostics.lastHttpStatus,
      safeResponseMetadata: diagnostics.responseMetadata,
      uniqueRoomAndStatusValues: rows,
    }, null, 2));
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
