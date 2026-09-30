import assert from "node:assert/strict";
import test from "node:test";

import {
  getAllowedTariffCodes,
  validateRoomCapacity,
} from "../bookingCapacity.js";

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

test("allows a 3-hour family tariff ending exactly when the next block starts", async () => {
  const nextBlockStart = new Date("2026-10-01T14:00:00.000Z");
  const allowed = await getAllowedTariffCodes({
    roomType: "FAMILY",
    startAt: new Date("2026-10-01T11:00:00.000Z"),
    nextBlockStart,
    postBufferMinutes: 0,
    capacity: 1,
    getPeakConcurrency: async (_roomType, _start, end) =>
      end <= nextBlockStart ? 0 : 1,
  });

  assert.deepEqual(allowed, ["3h"]);
});
