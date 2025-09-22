// Minimal config helper
const raw = (import.meta as any)?.env?.VITE_API_BASE ?? "";
export const API_BASE = (raw.trim() || "https://hotel-backend-bmlk.onrender.com").replace(/\/+$/,"");
