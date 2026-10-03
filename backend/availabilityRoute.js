import { validateAvailabilityQuery } from "./availability.js";
import { countOverlappingRoomItems } from "./bookingCapacity.js";

function addOneDay(dateOnly) {
  const [year, month, day] = String(dateOnly).split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + 1));
  return date.toISOString().slice(0, 10);
}

function safeAvailabilityBody(result) {
  if (!result?.ok) {
    return {
      ok: false,
      availabilityKnown: false,
      roomType: result?.roomType,
      available: false,
      code: result?.code || "BNOVO_UNAVAILABLE",
    };
  }
  return {
    ok: true,
    availabilityKnown: true,
    roomType: result.roomType,
    available: Boolean(result.available),
    availableCount: Number(result.availableCount),
    totalCapacity: Number(result.totalCapacity),
    occupiedCount: result.occupiedCount,
    source: Array.isArray(result.source) ? result.source : ["bnovo", "local"],
  };
}

export function createAvailabilityHandler(availabilityService) {
  return async function availabilityHandler(req, res) {
    const query = req.query || {};
    const validation = validateAvailabilityQuery(query);
    if (!validation.ok) {
      return res.status(validation.status).json({
        ok: false,
        availabilityKnown: false,
        available: false,
        code: validation.code,
      });
    }
    const result = await availabilityService.check({
      ...validation.value,
      startAt: query.startAt,
      endAt: query.endAt,
    });
    const body = safeAvailabilityBody(result);
    return res.status(result.ok ? 200 : 503).json(body);
  };
}

export function availabilityRequestFromPaymentItem(item) {
  const checkIn = String(item?.checkIn || "").slice(0, 10);
  let checkOut = String(item?.checkOut || "").slice(0, 10);
  if (!checkOut || checkOut <= checkIn) checkOut = addOneDay(checkIn);
  return {
    roomType: String(item?.rooms || "").toUpperCase(),
    checkIn,
    checkOut,
    startAt: new Date(item.checkInAt).toISOString(),
    endAt: new Date(item.checkOutAt).toISOString(),
  };
}

export async function checkPaymentAvailability(paymentItems, availabilityService) {
  const resultCache = new Map();
  for (const item of paymentItems) {
    const request = availabilityRequestFromPaymentItem(item);
    const key = JSON.stringify(request);
    let result = resultCache.get(key);
    if (!result) {
      result = await availabilityService.check(request);
      resultCache.set(key, result);
    }
    if (!result.ok || !result.availabilityKnown) {
      return { ok: false, code: result.code || "BNOVO_UNAVAILABLE", roomType: request.roomType };
    }
    const requested = countOverlappingRoomItems(paymentItems, item);
    if (!result.available || result.availableCount < requested) {
      return {
        ok: false,
        code: "ROOM_UNAVAILABLE",
        roomType: request.roomType,
        availableCount: result.availableCount,
        totalCapacity: result.totalCapacity,
      };
    }
  }
  return { ok: true };
}

export const _internals = { addOneDay, safeAvailabilityBody };
