import {
  BnovoMappingError,
  BnovoUnavailableError,
  bookingOverlapsRequest,
  hasValidBookingWindow,
  mapBookingRoomType,
  overlapsDateRange,
} from "./bnovo.js";
import { isLocalInventoryBlockingStatus } from "./localInventory.js";

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;
const ROOM_TYPES = new Set(["STANDARD", "FAMILY"]);

function epochDay(value) {
  const match = DATE_ONLY.exec(String(value || ""));
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return Math.floor(date.getTime() / 86_400_000);
}

export function validateAvailabilityQuery(input = {}) {
  const checkIn = String(input.checkIn || "");
  const checkOut = String(input.checkOut || "");
  const roomType = String(input.roomType || "STANDARD").toUpperCase();
  const start = epochDay(checkIn);
  const end = epochDay(checkOut);
  if (start == null || end == null || end <= start || end - start > 30) {
    return { ok: false, status: 400, code: "INVALID_DATES" };
  }
  if (!ROOM_TYPES.has(roomType)) {
    return { ok: false, status: 400, code: "INVALID_ROOM_TYPE" };
  }
  return { ok: true, value: { checkIn, checkOut, roomType } };
}

function localBookingBlocksInventory(booking) {
  return isLocalInventoryBlockingStatus(booking?.status);
}

function localBookingOverlaps(booking, request) {
  if (request.startAt && request.endAt && booking?.checkInAt && booking?.checkOutAt) {
    const requestedStart = Date.parse(request.startAt);
    const requestedEnd = Date.parse(request.endAt);
    const existingStart = Date.parse(booking.checkInAt);
    const existingEnd = Date.parse(booking.checkOutAt);
    if ([requestedStart, requestedEnd, existingStart, existingEnd].every(Number.isFinite)) {
      return existingStart < requestedEnd && existingEnd > requestedStart;
    }
  }
  return overlapsDateRange(request.checkIn, request.checkOut, booking?.checkIn, booking?.checkOut);
}

export function createAvailabilityService({ bnovoClient, loadLocalBookings, getCapacity }) {
  if (!bnovoClient || typeof loadLocalBookings !== "function" || typeof getCapacity !== "function") {
    throw new TypeError("Availability service dependencies are required");
  }

  async function check(input) {
    const validation = validateAvailabilityQuery(input);
    const roomType = String(input?.roomType || "STANDARD").toUpperCase();
    if (!validation.ok) {
      return {
        ok: false,
        availabilityKnown: false,
        roomType,
        available: false,
        code: validation.code,
      };
    }

    const request = {
      ...validation.value,
      startAt: input?.startAt,
      endAt: input?.endAt,
    };

    try {
      bnovoClient.assertRoomMapping(request.roomType);
      const [bnovoBookings, localBookings, rawCapacity] = await Promise.all([
        bnovoClient.getBookings({ dateFrom: request.checkIn, dateTo: request.checkOut }),
        loadLocalBookings(request),
        getCapacity(request.roomType),
      ]);
      const totalCapacity = Number(rawCapacity);
      if (!Number.isInteger(totalCapacity) || totalCapacity < 1) throw new Error("invalid capacity");

      for (const identifier of bnovoClient.mapping.STANDARD || []) {
        if (bnovoClient.mapping.FAMILY?.has(identifier)) {
          throw new BnovoMappingError("Bnovo identifier is assigned to multiple room types");
        }
      }

      const bnovoCount = (Array.isArray(bnovoBookings) ? bnovoBookings : []).filter((booking) => {
        if (!bnovoClient.bookingBlocksInventory(booking)) return false;
        const mappedRoomType = mapBookingRoomType(booking, bnovoClient.mapping);
        if (!mappedRoomType) throw new BnovoMappingError("Active Bnovo booking has an unmapped room identifier");
        const validWindow = bnovoClient.hasValidBookingWindow
          ? bnovoClient.hasValidBookingWindow(booking)
          : hasValidBookingWindow(booking);
        if (!validWindow) throw new BnovoUnavailableError("Active Bnovo booking has invalid dates");
        if (mappedRoomType !== request.roomType) return false;
        return bnovoClient.bookingOverlapsRequest
          ? bnovoClient.bookingOverlapsRequest(booking, request)
          : bookingOverlapsRequest(booking, request);
      }).length;

      const localCount = (Array.isArray(localBookings) ? localBookings : []).filter((booking) =>
        String(booking?.roomType || "").toUpperCase() === request.roomType &&
        localBookingBlocksInventory(booking) &&
        localBookingOverlaps(booking, request),
      ).length;

      const occupied = bnovoCount + localCount;
      const availableCount = Math.max(0, totalCapacity - occupied);
      return {
        ok: true,
        availabilityKnown: true,
        roomType: request.roomType,
        available: availableCount > 0,
        availableCount,
        totalCapacity,
        occupiedCount: { bnovo: bnovoCount, local: localCount, total: occupied },
        source: ["bnovo", "local"],
      };
    } catch (error) {
      return {
        ok: false,
        availabilityKnown: false,
        roomType: request.roomType,
        available: false,
        code: error?.code === "BNOVO_MAPPING_INCOMPLETE" ? error.code : "BNOVO_UNAVAILABLE",
      };
    }
  }

  return { check };
}

export const _internals = { epochDay, localBookingBlocksInventory, localBookingOverlaps };
