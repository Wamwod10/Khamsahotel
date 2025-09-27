// bnovo.js — Availability (Bnovo api/v1, JWT, pagination 20, hotel_id)
import "dotenv/config";
import fetch from "node-fetch";

/* =======================
 * ENV
 * ======================= */
const RAW_BASE = process.env.BNOVO_API_BASE_URL || "https://api.pms.bnovo.ru/api/v1";
const BNOVO_API_BASE_URL = RAW_BASE.replace(/\/+$/, "");

const AUTH_URL  = process.env.BNOVO_AUTH_URL || "https://api.pms.bnovo.ru/api/v1/auth";
const TOKEN_TTL = Number(process.env.BNOVO_TOKEN_TTL || 300);

const BNOVO_ID       = process.env.BNOVO_ID;        // mas: 109828
const BNOVO_PASSWORD = process.env.BNOVO_PASSWORD;  // Octopus oynasidagi "Пароль"
const BNOVO_HOTEL_ID = process.env.BNOVO_HOTEL_ID || process.env.BNOVO_ID; // ko‘pincha ID bilan bir xil

const FAMILY_CODES = (process.env.BNOVO_FAMILY_CODES || "FAMILY,FAM")
  .split(",")
  .map((s) => s.trim().toUpperCase())
  .filter(Boolean);

/* =======================
 * Helpers
 * ======================= */
function toISODate(d) {
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
  if (!AUTH_URL || !BNOVO_ID || !BNOVO_PASSWORD) {
    throw new Error("BNOVO_AUTH_URL yoki BNOVO_ID yoki BNOVO_PASSWORD sozlanmagan.");
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
    body: JSON.stringify({ id: Number(BNOVO_ID), password: BNOVO_PASSWORD }),
    signal: controller.signal,
  }).catch((e) => {
    throw new Error(`Auth fetch failed: ${e?.message || e}`);
  });

  clearTimeout(t);
  const j = await safeParse(r);
  if (!r.ok) {
    throw new Error(`Auth failed: ${r.status} ${JSON.stringify(j)}`);
  }

  const payload = j?.data ? j.data : j;
  const token = payload?.access_token || payload?.token;
  const ttl = Number(payload?.expires_in || TOKEN_TTL || 300);

  if (!token) throw new Error(`Auth token missing in response: ${JSON.stringify(j)}`);

  cachedToken = { value: token, exp: now + ttl };
  return { Authorization: `Bearer ${token}` };
}

/* =======================
 * Thin fetch wrapper (with 401 retry)
 * ======================= */
async function bnovoFetch(path, { method = "GET", headers = {}, body, retry401 = true } = {}) {
  const url = path.startsWith("http")
    ? path
    : `${BNOVO_API_BASE_URL}${path.startsWith("/") ? "" : "/"}${path}`;

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 20000);

  let auth = await getBearerHeader(false);

  let res = await fetch(url, {
    method,
    headers: {
      // 406 oldini olish uchun Accept’ni kengaytiramiz
      Accept: "application/json, */*;q=0.1",
      ...auth,
      ...headers,
    },
    body,
    signal: controller.signal,
  }).catch((e) => {
    clearTimeout(t);
    throw new Error(`Fetch failed: ${e?.message || e}`);
  });

  if (retry401 && res.status === 401) {
    auth = await getBearerHeader(true);
    res = await fetch(url, {
      method,
      headers: {
        Accept: "application/json, */*;q=0.1",
        ...auth,
        ...headers,
      },
      body,
      signal: controller.signal,
    });
  }

  clearTimeout(t);
  return res;
}

/* =======================
 * Public API
 * ======================= */

/**
 * Availability check:
 *  - STANDARD: doim available (biznes qoida — 23 ta xona)
 *  - FAMILY: api/v1/bookings (hotel_id + pagination limit=20)
 */
export async function checkAvailability({ checkIn, checkOut, roomType }) {
  const rt = String(roomType || "").toUpperCase();

  if (rt === "STANDARD") {
    return { ok: true, roomType: rt, available: true, source: "static-23-standard" };
  }

  const from = toISODate(checkIn);
  const to   = toISODate(checkOut);
  if (!from || !to) {
    return { ok: false, roomType: rt, available: false, warning: "invalid dates" };
  }

  try {
    const LIMIT = 20;  // v1 cheklovi
    let offset = 0;
    let anyFamilyTaken = false;

    while (true) {
      const query = qs({
        hotel_id: BNOVO_HOTEL_ID,
        date_from: from,
        date_to: to,
        limit: LIMIT,
        offset,
      });

      const res = await bnovoFetch(`/bookings?${query}`);
      const data = await safeParse(res);

      if (!res.ok) {
        const raw = data?._raw || JSON.stringify(data);
        console.error("Bnovo availability error:", res.status, raw);
        return { ok: false, roomType: rt, available: false, warning: `Bnovo ${res.status}` };
      }

      // v1 odatda { data: { items: [...], meta: {...} } }
      const payload = data?.data ? data.data : data;
      const items = Array.isArray(payload?.items)
        ? payload.items
        : Array.isArray(payload)
        ? payload
        : [];

      const taken = items.some((b) =>
        FAMILY_CODES.includes(String(b?.room_type_code || b?.roomType || "").toUpperCase())
      );
      if (taken) { anyFamilyTaken = true; break; }

      if (items.length < LIMIT) break; // so‘nggi sahifa
      offset += LIMIT;
    }

    return { ok: true, roomType: rt, available: !anyFamilyTaken, source: "bnovo-api-v1" };
  } catch (e) {
    console.error("Bnovo availability exception:", e);
    return { ok: false, roomType: rt, available: false, warning: `exception: ${e?.message || e}` };
  }
}

/**
 * POST create — Bnovo Open API bilan mavjud emas (read-only).
 */
export async function createBookingInBnovo() {
  return { ok: true, pushed: false, reason: "API read-only; POST yo‘q" };
}
