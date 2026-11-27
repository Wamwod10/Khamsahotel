// Pure helpers keep guest-provided notes and payment request keys bounded.
export function sanitizeGuestComment(value) {
  return String(value ?? "").trim().slice(0, 500)
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "");
}
export function isValidGuestComment(value) {
  return value == null || String(value).length <= 500;
}
export function validPaymentRequestKey(value) {
  const key = String(value || "");
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(key) ? key : null;
}
