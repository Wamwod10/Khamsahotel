import assert from "node:assert/strict";
import test from "node:test";

import {
  ACTIVE_LOCAL_STATUS_SQL,
  isLocalInventoryBlockingStatus,
  withRoomTypeLocks,
} from "../localInventory.js";

test("pending and paid local statuses block while failed and cancelled statuses do not", () => {
  assert.equal(isLocalInventoryBlockingStatus("pending"), true);
  assert.equal(isLocalInventoryBlockingStatus("paid"), true);
  assert.equal(isLocalInventoryBlockingStatus("failed"), false);
  assert.equal(isLocalInventoryBlockingStatus("cancelled"), false);
  assert.equal(isLocalInventoryBlockingStatus("canceled"), false);
});

test("active local SQL policy matches the JavaScript status policy", () => {
  assert.match(ACTIVE_LOCAL_STATUS_SQL, /failed/);
  assert.match(ACTIVE_LOCAL_STATUS_SQL, /cancelled/);
  assert.match(ACTIVE_LOCAL_STATUS_SQL, /canceled/);
});

test("room locks are acquired in deterministic order before capacity work", async () => {
  const calls = [];
  const db = {
    async query(sql, params) {
      calls.push({ sql, params });
      return { rows: [] };
    },
  };
  const result = await withRoomTypeLocks(db, ["STANDARD", "FAMILY", "FAMILY"], async () => {
    calls.push({ work: true });
    return "done";
  });
  assert.equal(result, "done");
  assert.deepEqual(calls.slice(0, 2).map((call) => call.params[0]), [
    "khamsa-inventory:FAMILY",
    "khamsa-inventory:STANDARD",
  ]);
  assert.equal(calls[2].work, true);
});
