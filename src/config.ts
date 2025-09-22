// Minimal config helper
const raw = (import.meta as any)?.env?.VITE_API_BASE_URL ?? "";
export const API_BASE = (raw.trim() || "https://khamsa-backend.onrender.com").replace(/\/+$/,"");
