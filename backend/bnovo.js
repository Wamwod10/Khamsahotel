// bnovo.js — Bnovo api/v1 bilan availability tekshirish (Bearer JWT, pagination, robust matching)
import "dotenv/config";
import fetch from "node-fetch";

/* ========= ENV ========= */
const BASE = (process.env.BNOVO_API_BASE_URL || "https://api.pms.bnovo.ru/api/v1").replace(/\/+$/, "");
const AUTH_URL = process.env.BNOVO_AUTH_URL || "https://api.pms.bnovo.ru/api/v1/auth";
const TOKEN_TTL = Number(process.env.BNOVO_TOKEN_TTL || 300);

const BNOVO_ID       = process.env.BNOVO_ID;        // masalan: 109828
const BNOVO_PASSWORD = process.env.BNOVO_PASSWORD;  // Octopus -> API Пароль
const BNOVO_HOTEL_ID = process.env.BNOVO_HOTEL_ID || ""; // ixtiyoriy (bor bo'lsa filtr qilamiz)

const DEBUG = /^1|true|yes$/i.test(process.env.BNOVO_DEBUG || "");

// Family aniqlash sozlamalari (3 yo'l: room_name, plan_name, room_type_code)
const FAMILY_CODES = (process.env.BNOVO_FAMILY_CODES || "FAMILY,FAM")
  .split(",").map(s => s.trim().toUpperCase()).filter(Boolean);

const FAMILY_NAMES = (process.env.BNOVO_FAMILY_NAMES || "FAMILY,СЕМЕЙ")
  .split(",").map(s => s.trim().toUpperCase()).filter(Boolean);

// room_name(lar): masalan "1" (Bnovo “Family Room” qatori uchun ostidagi raqam/nom)
const FAMILY_ROOM_NAMES = (process.env.BNOVO_FAMILY_ROOM_NAMES || "")
  .split(",").map(s => s.trim()).filter(Boolean);

/* ========= Helpers ========= */
const toISO = (d) => {
  if (typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
  const x = new Date(d);
  return Number.isNaN(x.getTime()) ? null : x.toISOString().slice(0, 10);
};

async function safeParse(res) {
  const ct = (res.headers.get("content-type") || "").toLowerCase();
  if (ct.includes("application/json")) return res.json();
  const txt = await res.text();
  try { return JSON.parse(txt); } catch { return { _raw: txt }; }
}

const qs = (o = {}) => {
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(o)) {
    if (v !== undefined && v !== null && String(v).length) u.set(k, String(v));
  }
  return u.toString();
};

// "2025-10-01 23:00:00+03" -> Date ms
function parseBnovoDate(s) {
  if (!s) return NaN;
  return new Date(String(s).replace(" ", "T")).getTime();
}

// Kun oralig'i kesishishini tekshirish (from/to — YYYY-MM-DD)
function overlapsDays(fromISO, toISO, arrStr, depStr) {
  const dayStart = new Date(fromISO + "T00:00:00Z").getTime();
  const dayEnd   = new Date(toISO   + "T23:59:59Z").getTime();
  const arr = parseBnovoDate(arrStr);
  const dep = parseBnovoDate(depStr);
  if (Number.isNaN(arr) || Number.isNaN(dep)) return false;
  return !(dep < dayStart || arr > dayEnd);
}

/* ========= Auth (cache) ========= */
let cached = { token: null, exp: 0 };

async function auth(force = false) {
  if (!AUTH_URL || !BNOVO_ID || !BNOVO_PASSWORD) {
    throw new Error("Bnovo auth envs missing: BNOVO_AUTH_URL/BNOVO_ID/BNOVO_PASSWORD");
  }
  const now = Math.floor(Date.now() / 1000);
  if (!force && cached.token && cached.exp > now + 30) {
    return { Authorization: `Bearer ${cached.token}` };
  }

  const r = await fetch(AUTH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json, */*;q=0.1" },
    body: JSON.stringify({ id: Number(BNOVO_ID), password: BNOVO_PASSWORD }),
  });

  const j = await safeParse(r);
  if (!r.ok) throw new Error(`Auth failed: ${r.status} ${JSON.stringify(j)}`);

  const payload = j?.data ?? j;
  const token = payload?.access_token || payload?.token;
  const ttl   = Number(payload?.expires_in || TOKEN_TTL || 300);
  if (!token) throw new Error(`Auth token missing: ${JSON.stringify(j)}`);

  cached = { token, exp: now + ttl };
  if (DEBUG) console.log("[BNOVO] token updated, ttl:", ttl);
  return { Authorization: `Bearer ${token}` };
}

async function bnovoFetch(path, init = {}, retry401 = true) {
  const url = path.startsWith("http") ? path : `${BASE}${path.startsWith("/") ? "" : "/"}${path}`;
  let headers = {
    Accept: "application/json, */*;q=0.1", // 406 ning oldini oladi
    ...(init.headers || {}),
    ...(await auth()),
  };

  let res = await fetch(url, { ...init, headers });
  if (retry401 && res.status === 401) {
    headers = { ...headers, ...(await auth(true)) };
    res = await fetch(url, { ...init, headers });
  }
  return res;
}

/* ========= Core family-matching ========= */
function isFamilyBooking(b) {
  // 1) room_name orqali (eng ishonchli, agar FAMILY qatordagi son/nomni bilsak)
  const rn = String(b?.room_name ?? "").trim(); // masalan "1"
  const isByRoomName = FAMILY_ROOM_NAMES.length
    ? FAMILY_ROOM_NAMES.some(x => x === rn)
    : false;

  // 2) tarif nomida "СЕМЕЙ"/"FAMILY" borligi
  const plan = String(b?.plan_name ?? "").toUpperCase();
  const isByName = plan && FAMILY_NAMES.some(n => plan.includes(n));

  // 3) room_type_code/codes bo‘yicha
  const rcode = String(b?.room_type_code || b?.roomType || "").toUpperCase();
  const isByCode = !!rcode && FAMILY_CODES.includes(rcode);

  return isByRoomName || isByName || isByCode;
}

/* ========= Public API ========= */

/**
 * Family disponibilidad:
 * - STANDARD: har doim true (biznes qoida).
 * - FAMILY: api/v1/bookings orqali check_in oralig‘ida family bron bor-yo‘qligini aniqlaydi.
 */
export async function checkAvailability({ checkIn, checkOut, roomType }) {
  const rt = String(roomType || "").toUpperCase();

  // STANDARD — doim bor
  if (rt === "STANDARD") {
    return { ok: true, roomType: rt, available: true, source: "static-23-standard" };
  }

  const from = toISO(checkIn);
  const to   = toISO(checkOut);
  if (!from || !to) {
    return { ok: false, roomType: rt, available: false, warning: "invalid dates" };
  }

  const getArrDep = (b) => {
    const d = b?.dates || {};
    const arr = String(d.real_arrival || d.arrival || "");
    const dep = String(d.real_departure || d.departure || "");
    return [arr, dep];
  };

  try {
    const LIMIT = 20;
    let offset = 0;
    let taken = false;
    let total = null;

    while (true) {
      // Muhimi: date_from/date_to majburiy; check_in_* ni qo‘shish shart emas (ba’zida 406 beradi)
      const params = {
        date_from: from,
        date_to: to,
        limit: LIMIT,
        offset,
      };
      if (BNOVO_HOTEL_ID) params.hotel_id = BNOVO_HOTEL_ID;

      const res = await bnovoFetch(`/bookings?${qs(params)}`);
      const data = await safeParse(res);
      if (!res.ok) {
        if (DEBUG) console.error("Bnovo availability failed:", res.status, data);
        return { ok: false, roomType: rt, available: false, warning: `Bnovo ${res.status}` };
      }

      const payload = data?.data ?? data;
      const items = Array.isArray(payload?.bookings) ? payload.bookings
                  : Array.isArray(payload?.items)    ? payload.items
                  : Array.isArray(payload)           ? payload
                  : [];

      const metaTotal = Number(payload?.meta?.total ?? NaN);
      if (Number.isFinite(metaTotal)) total = metaTotal;

      for (const b of items) {
        const [arr, dep] = getArrDep(b);
        if (isFamilyBooking(b) && arr && dep && overlapsDays(from, to, arr, dep)) {
          taken = true;
          break;
        }
      }

      if (taken) break;

      // paginate
      if (total != null) {
        offset += items.length;
        if (offset >= total) break;
      } else {
        if (items.length < LIMIT) break;
        offset += LIMIT;
      }
    }

    return { ok: true, roomType: rt, available: !taken, source: "bnovo-api-v1" };
  } catch (e) {
    if (DEBUG) console.error("Bnovo availability exception:", e);
    return { ok: false, roomType: rt, available: false, warning: `exception: ${e?.message || e}` };
  }
}

/**
 * Diagnostika: ko‘rsatilgan kun oralig‘ida topilgan “family” bronlar ro‘yxati.
 */
export async function findFamilyBookings({ from, to }) {
  const f = toISO(from);
  const t = toISO(to);
  if (!f || !t) return { ok: false, items: [], warning: "invalid dates" };

  const LIMIT = 20;
  let offset = 0;
  const hits = [];

  while (true) {
    const params = {
      date_from: f,
      date_to: t,
      limit: LIMIT,
      offset,
    };
    if (BNOVO_HOTEL_ID) params.hotel_id = BNOVO_HOTEL_ID;

    const res = await bnovoFetch(`/bookings?${qs(params)}`);
    const data = await safeParse(res);
    if (!res.ok) throw new Error(`${res.status} ${JSON.stringify(data)}`);

    const payload = data?.data ?? data;
    const items = Array.isArray(payload?.bookings) ? payload.bookings
                : Array.isArray(payload?.items)    ? payload.items
                : Array.isArray(payload)           ? payload
                : [];

    for (const b of items) {
      if (!isFamilyBooking(b)) continue;
      const d = b?.dates || {};
      hits.push({
        number: b?.number,
        room_name: b?.room_name,
        plan_name: b?.plan_name,
        room_type_code: b?.room_type_code,
        arrival: d.arrival,
        departure: d.departure,
        real_arrival: d.real_arrival,
        real_departure: d.real_departure,
        status: b?.status?.name,
      });
    }

    if (items.length < LIMIT) break;
    offset += LIMIT;
  }

  return { ok: true, items: hits };
}

/* POST yo‘q — faqat o‘qish */
export async function createBookingInBnovo() {
  return { ok: true, pushed: false, reason: "API read-only; POST mavjud emas" };
}

// Ichki util’lar (test/diagnostika uchun)
export const _internals = { isFamilyBooking, overlapsDays, parseBnovoDate };
