import { durationToHours } from "./bookingExperience.js";

const durationHours = durationToHours;

export function buildAvailabilityRequest({ checkIn, checkInTime, duration, roomType }) {
  const hours = durationHours(duration);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(checkIn || "")) || !/^\d{2}:\d{2}$/.test(String(checkInTime || "")) || !hours) {
    return null;
  }
  return {
    checkInDate: checkIn,
    checkInTime,
    durationHours: hours,
    roomType: String(roomType || "").toUpperCase(),
  };
}

function unknownAvailability(code = "BNOVO_UNAVAILABLE") {
  return { ok: false, availabilityKnown: false, available: false, code };
}

export async function fetchRoomAvailability({
  apiBase,
  checkIn,
  checkInTime,
  duration,
  roomType,
  signal,
  fetchImpl = fetch,
}) {
  const request = buildAvailabilityRequest({ checkIn, checkInTime, duration, roomType });
  if (!request) return unknownAvailability("INVALID_DATES");
  const query = new URLSearchParams(request).toString();
  try {
    const response = await fetchImpl(`${String(apiBase || "").replace(/\/+$/, "")}/api/availability?${query}`, {
      credentials: "omit",
      signal,
    });
    const contentType = String(response.headers?.get?.("content-type") || "").toLowerCase();
    const body = contentType.includes("application/json") ? await response.json() : null;
    if (!response.ok || !body?.ok || body.availabilityKnown !== true || typeof body.available !== "boolean") {
      return unknownAvailability(body?.code || "BNOVO_UNAVAILABLE");
    }
    if (!Number.isFinite(Number(body.availableCount)) || !Number.isFinite(Number(body.totalCapacity))) {
      return unknownAvailability("INVALID_AVAILABILITY_RESPONSE");
    }
    return {
      ok: true,
      availabilityKnown: true,
      roomType: String(body.roomType || roomType).toUpperCase(),
      available: body.available,
      availableCount: Number(body.availableCount),
      totalCapacity: Number(body.totalCapacity),
      source: Array.isArray(body.source) ? body.source : [],
    };
  } catch (error) {
    if (error?.name === "AbortError") throw error;
    return unknownAvailability();
  }
}

export const _internals = { durationHours };
