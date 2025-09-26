// bnovo.js — Availability (Bearer/JWT, read-only)
import fetch from "node-fetch";

/* =======================
 * ENV
 * ======================= */
const RAW_BASE = process.env.BNOVO_API_BASE_URL || "https://api.pms.bnovo.ru/open-api";
const BNOVO_API_BASE_URL = RAW_BASE.replace(/\/+$/, "");
const AUTH_MODE = String(process.env.BNOVO_AUTH_MODE || "bearer").toLowerCase();
const AUTH_URL = process.env.BNOVO_AUTH_URL || "https://api.pms.bnovo.ru/api/v1/auth";
const AUTH_PAYLOAD = process.env.BNOVO_AUTH_PAYLOAD ? JSON.parse(process.env.BNOVO_AUTH_PAYLOAD) : null;
const TOKEN_TTL = Number(process.env.BNOVO_TOKEN_TTL || 300);

// FAMILY kodlarini .env dan sozlash (mas: FAMILY,FAM,FAM1)
const FAMILY_CODES = (process.env.BNOVO_FAMILY_CODES || "FAMILY,FAM")
  .split(",")
  .map((s) => s.trim().toUpperCase())
  .filter(Boolean);

/* =======================
 * Helpers
 * ======================= */
function toISODate(d) {
  // Kutilgan format: YYYY-MM-DD
  if (typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
  const dd = new Date(d);
  if (Number.isNaN(dd.getTime())) return null;
  return dd.toISOString().slice(0, 10);
}

async function safeParse(res) {
  const ct = (res.headers.get("content-type") || "").toLowerCase();
  if (ct.includes("application/json")) return res.json();
  const txt = await res.text();
  try { return JSON.parse(txt); } catch { return { _raw: txt }; }
}

function qs(params = {}) {
  const usp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && String(v).length) usp.set(k, String(v));
  });
  return usp.toString();
}

/* =======================
 * Auth (Bearer) with cache
 * ======================= */
let cachedToken = { value: null, exp: 0 };

async function getBearerHeader(forceRenew = false) {
  if (AUTH_MODE !== "bearer") {
    throw new Error("BNOVO_AUTH_MODE=bearer bo'lishi kerak (read-only Open API JWT).");
  }
  if (!AUTH_URL || !AUTH_PAYLOAD) {
    throw new Error("BNOVO_AUTH_URL yoki BNOVO_AUTH_PAYLOAD sozlanmagan.");
  }

  const now = Math.floor(Date.now() / 1000);
  if (!forceRenew && cachedToken.value && cachedToken.exp > now + 30) {
    return { Authorization: `Bearer ${cachedToken.value}` };
  }

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 15000);

  const r = await fetch(AUTH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(AUTH_PAYLOAD),
    signal: controller.signal,
  }).catch((e) => {
    throw new Error(`Auth fetch failed: ${e?.message || e}`);
  });

  clearTimeout(t);
  const j = await safeParse(r);
  if (!r.ok) {
    throw new Error(`Auth failed: ${r.status} ${JSON.stringify(j)}`);
  }

  const token = j.access_token || j.token;
  const ttl = Number(j.expires_in || TOKEN_TTL || 300);
  if (!token) throw new Error("Auth token missing in response");

  cachedToken = { value: token, exp: now + ttl };
  return { Authorization: `Bearer ${token}` };
}

async function bnovoFetch(path, { method = "GET", headers = {}, body, retry401 = true } = {}) {
  const url = path.startsWith("http") ? path : `${BNOVO_API_BASE_URL}${path.startsWith("/") ? "" : "/"}${path}`;

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 15000);

  // 1) token (cached or fresh)
  let auth = await getBearerHeader(false);

  let res = await fetch(url, {
    method,
    headers: { Accept: "application/json", ...auth, ...headers },
    body,
    signal: controller.signal,
  }).catch((e) => {
    clearTimeout(t);
    throw new Error(`Fetch failed: ${e?.message || e}`);
  });

  // 2) 401 bo‘lsa — bir marta tokenni yangilab qayta uramiz
  if (retry401 && res.status === 401) {
    try {
      auth = await getBearerHeader(true);
      res = await fetch(url, {
        method,
        headers: { Accept: "application/json", ...auth, ...headers },
        body,
        signal: controller.signal,
      });
    } catch (e) {
      clearTimeout(t);
      throw e;
    }
  }

  clearTimeout(t);
  return res;
}

/* =======================
 * Public API
 * ======================= */

/**
 * Availability check:
 *  - STANDARD: har doim available (biznes qoida — 23 ta xona)
 *  - Boshqa (FAMILY): Bnovo /bookings ro'yxatiga qarab bandlikni aniqlaydi
 */
export async function checkAvailability({ checkIn, checkOut, roomType }) {
  const rt = String(roomType || "").toUpperCase();

  // STANDARD — sizdagi qoida
  if (rt === "STANDARD") {
    return { ok: true, roomType: rt, available: true, source: "static-23-standard" };
  }

  // Sanalarni tozalab/tekshirib olaylik
  const from = toISODate(checkIn);
  const to = toISODate(checkOut);
  if (!from || !to) {
    return { ok: false, roomType: rt, available: false, warning: "invalid dates" };
  }

  try {
    const query = qs({ date_from: from, date_to: to, status: "confirmed" });
    const res = await bnovoFetch(`/bookings?${query}`);
    const data = await safeParse(res);

    if (!res.ok) {
      console.error("Bnovo availability error:", res.status, data);
      // Ehtiyot chorasi: API nosoz bo‘lsa, overbookingni oldini olish uchun band deb qaytaramiz
      return { ok: false, roomType: rt, available: false, warning: `Bnovo ${res.status}` };
    }

    // Ba'zi akkauuntlarda items massiv emas — ehtiyotkorlik bilan ajratamiz
    const items = Array.isArray(data?.items)
      ? data.items
      : Array.isArray(data)
      ? data
      : [];

    // Family bandligini tekshirish (kodingizga mos ravishda sozlanadi)
    const isFamilyTaken = items.some((b) =>
      FAMILY_CODES.includes(String(b?.room_type_code || b?.roomType || "").toUpperCase())
    );

    return { ok: true, roomType: rt, available: !isFamilyTaken, source: "bnovo-open-api" };
  } catch (e) {
    console.error("Bnovo availability exception:", e);
    return { ok: false, roomType: rt, available: false, warning: `exception: ${e?.message || e}` };
  }
}

/**
 * POST create — Open API bilan mavjud emas (read-only).
 * Interfeys uchun mos javob qaytaramiz.
 */
export async function createBookingInBnovo() {
  return { ok: true, pushed: false, reason: "Open API faqat read-only; POST yo‘q" };
}
