import test from "node:test";
import assert from "node:assert/strict";
import { stat } from "node:fs/promises";

const budgets = {
  "public/hero-home.jpg": 400_000,
  "public/logo-small.png": 100_000,
  "public/room-standard.jpg": 220_000,
  "public/room-family.jpg": 220_000,
  "public/near-railway.jpg": 180_000,
  "public/near-medical.jpg": 180_000,
  "public/near-religious.jpg": 180_000,
  "public/near-park.jpg": 180_000,
};

test("keeps the home page image payload within per-image budgets", async () => {
  let totalBytes = 0;
  for (const [path, maxBytes] of Object.entries(budgets)) {
    const file = await stat(path).catch(() => null);
    assert.ok(file, `${path} is missing`);
    const { size } = file;
    totalBytes += size;
    assert.ok(size <= maxBytes, `${path} is ${size} bytes; budget is ${maxBytes}`);
  }
  assert.ok(totalBytes <= 700_000, `home image payload is ${totalBytes} bytes`);
});
