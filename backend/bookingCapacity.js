function toTime(value) {
  const time = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isFinite(time) ? time : null;
}

function windowsOverlap(left, right) {
  const leftStart = toTime(left?.checkInAt);
  const leftEnd = toTime(left?.checkOutAt);
  const rightStart = toTime(right?.checkInAt);
  const rightEnd = toTime(right?.checkOutAt);
  if (leftStart == null || leftEnd == null || rightStart == null || rightEnd == null) {
    return false;
  }
  return leftStart < rightEnd && leftEnd > rightStart;
}

export function countOverlappingRoomItems(items, targetItem) {
  return items.filter(
    (item) => item?.rooms === targetItem?.rooms && windowsOverlap(item, targetItem),
  ).length;
}

export function validateRoomCapacity(items, capacities) {
  for (const item of items) {
    const roomType = item?.rooms;
    const capacity = Number(capacities?.[roomType]);
    if (!roomType || !Number.isFinite(capacity)) continue;

    const requested = countOverlappingRoomItems(items, item);
    if (requested > capacity) {
      return {
        ok: false,
        roomType,
        capacity,
        requested,
      };
    }
  }

  return { ok: true };
}

const BOOKING_TARIFFS = [
  { code: "3h", hours: 3 },
  { code: "10h", hours: 10 },
  { code: "24h", hours: 24 },
];

export async function getAllowedTariffCodes({
  roomType,
  startAt,
  nextBlockStart,
  postBufferMinutes = 0,
  capacity,
  getPeakConcurrency,
}) {
  const start = new Date(startAt);
  const nextStart = nextBlockStart ? new Date(nextBlockStart) : null;
  const allowed = [];

  for (const tariff of BOOKING_TARIFFS) {
    const end = new Date(start.getTime() + tariff.hours * 60 * 60 * 1000);
    const endWithPost = new Date(
      end.getTime() + Number(postBufferMinutes || 0) * 60 * 1000,
    );

    if (nextStart && endWithPost > nextStart) continue;

    const peakExisting = await getPeakConcurrency(roomType, start, endWithPost);
    if (peakExisting + 1 <= Number(capacity)) allowed.push(tariff.code);
  }

  return allowed;
}
