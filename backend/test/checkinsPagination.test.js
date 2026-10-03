import test from "node:test";
import assert from "node:assert/strict";

import { normalizeCheckinsPagination } from "../checkinsPagination.js";

test("normalizes a requested check-ins page without dropping its offset", () => {
  assert.deepEqual(normalizeCheckinsPagination({ limit: "200", offset: "400" }), {
    limit: 200,
    offset: 400,
  });
});

test("caps page size and rejects negative offsets", () => {
  assert.deepEqual(normalizeCheckinsPagination({ limit: "900", offset: "-5" }), {
    limit: 500,
    offset: 0,
  });
});

test("keeps the legacy default for omitted, empty, zero, or negative limits", () => {
  for (const limit of [undefined, "", "0", "-5"]) {
    assert.equal(normalizeCheckinsPagination({ limit }).limit, 300);
  }
});
