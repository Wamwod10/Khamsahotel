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
