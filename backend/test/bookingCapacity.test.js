import assert from "node:assert/strict";
import test from "node:test";

import { validateRoomCapacity } from "../bookingCapacity.js";

const baseItem = {
  rooms: "FAMILY",
  checkInAt: new Date("2026-10-01T10:00:00"),
  checkOutAt: new Date("2026-10-01T13:00:00"),
};

test("rejects booking more family rooms than capacity in the same payment", () => {
  const result = validateRoomCapacity(
    [
      { ...baseItem },
      { ...baseItem },
    ],
    { FAMILY: 1 },
  );

  assert.equal(result.ok, false);
  assert.equal(result.roomType, "FAMILY");
  assert.equal(result.capacity, 1);
});
