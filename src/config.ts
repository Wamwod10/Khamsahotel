// Minimal config helper
const isKhamsaProduction =
  typeof window !== "undefined" &&
  /(^|\.)khamsahotel\.uz$/i.test(window.location.hostname);
const raw = (import.meta as any)?.env?.VITE_API_BASE_URL ?? "";
export const API_BASE = (
  isKhamsaProduction ? "/backend-api" : raw.trim() || "/backend-api"
).replace(/\/+$/,"");
