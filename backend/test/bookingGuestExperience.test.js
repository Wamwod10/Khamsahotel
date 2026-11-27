import test from "node:test";
import assert from "node:assert/strict";
import { sanitizeGuestComment, isValidGuestComment, validPaymentRequestKey } from "../bookingGuestExperience.js";
test("guest comment is optional and bounded", () => {
  assert.equal(sanitizeGuestComment(null), "");
  assert.ok(isValidGuestComment("Hello"));
  assert.ok(!isValidGuestComment("x".repeat(501)));
  assert.equal(sanitizeGuestComment(" x\\n ").trim(), "x\\n");
  assert.equal(sanitizeGuestComment(" abc\\u0000 "), "abc\\u0000");
});
test("request key accepts valid UUID and rejects malformed values", () => {
  assert.equal(validPaymentRequestKey("12345678-1234-4123-8123-123456789abc"), "12345678-1234-4123-8123-123456789abc");
  assert.equal(validPaymentRequestKey("12345678----4123-8123-123456789abc"), null);
  assert.equal(validPaymentRequestKey(null), null);
});
