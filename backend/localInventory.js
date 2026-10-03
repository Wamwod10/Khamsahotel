const NON_BLOCKING_LOCAL_STATUSES = new Set(["failed", "cancelled", "canceled", "refunded"]);

export const ACTIVE_LOCAL_STATUS_SQL =
  "LOWER(COALESCE(status, 'pending')) NOT IN ('failed', 'cancelled', 'canceled', 'refunded')";

export function isLocalInventoryBlockingStatus(status) {
  return !NON_BLOCKING_LOCAL_STATUSES.has(String(status || "pending").trim().toLowerCase());
}

export async function withRoomTypeLocks(database, roomTypes, work) {
  const uniqueRoomTypes = [...new Set(roomTypes.map((value) => String(value || "").toUpperCase()).filter(Boolean))].sort();
  for (const roomType of uniqueRoomTypes) {
    await database.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`khamsa-inventory:${roomType}`]);
  }
  return work();
}
