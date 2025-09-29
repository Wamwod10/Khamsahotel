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

// Family aniqlash sozlamalari (bir nechta yo'l bilan tekshiramiz)
const FAMILY_CODES = (process.env.BNOVO_FAMILY_CODES || "FAMILY,FAM")
  .split(",").map(s => s.trim().toUpperCase()).filter(Boolean);

const FAMILY_NAMES = (process.env.BNOVO_FAMILY_NAMES || "FAMILY,СЕМЕЙ")
  .split(",").map(s => s.trim().toUpperCase()).filter(Boolean);

// room_name(lar): masalan "1" (Bnovo “Family Room” qatori ostidagi raqam)
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

// "2025-10-01 23:00:00+03" -> ms
function parseBnovoDate(s) {
  if (!s) return NaN;
  return new Date(s.replace(" ", "T")).getTime();
}

// Kun oralig'i kesishishini tekshirish (from/to — YYYY-MM-DD)
function overlapsDays(fromISO, toISO, arrivalStr, departureStr) {
  const dayStart = new Date(fromISO + "T00:00:00Z").getTime();
  const dayEnd   = new Date(toISO   + "T23:59:59Z").getTime();
  const arr = parseBnovoDate(arrivalStr);
  const dep = parseBnovoDate(departureStr);
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
    headers: { "Content-Type": "application/json", Accept: "application/json" },
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

/* ========= Family aniqlash ========= */
function isFamilyBooking(b) {
  // 1) room_name orqali (eng ishonchli, agar FAMILY qatori aniq raqamda bo‘lsa)
  const rn = String(b?.room_name ?? "").trim(); // masalan "1"
  const isByRoomName = FAMILY_ROOM_NAMES.length
    ? FAMILY_ROOM_NAMES.some(x => x === rn)
    : false;

  // 2) tarif/plan nomida family so‘zi (СЕМЕЙ, FAMILY, va h.k.)
  const plan = String(b?.plan_name ?? "").toUpperCase();
  const isByName = FAMILY_NAMES.some(n => plan.includes(n));

  // 3) room_type_code/codes bo‘yicha (agar bor bo‘lsa)
  const rcode = String(b?.room_type_code || b?.roomType || "").toUpperCase();
  const isByCode = !!rcode && FAMILY_CODES.includes(rcode);

  return isByRoomName || isByName || isByCode;
}

/* ========= Public API ========= */

/**
 * Family disponibilidad:
 * - STANDARD: har doim true (biznes qoida).
 * - FAMILY: api/v1/bookings orqali check_in oralig‘ida family bron bor-yo‘qligini aniqlaydi.
 *   Bnovo’da `date_from/date_to` ko‘pincha **create_date** bo‘yicha bo‘lgani uchun
 *   keng oynada qidiramiz (wideFrom/To) va `check_in_from/to` bilan toraytiramiz.
 */
export async function checkAvailability({ checkIn, checkOut, roomType }) {
  const rt = String(roomType || "").toUpperCase();
  if (rt === "STANDARD") {
    return { ok: true, roomType: rt, available: true, source: "static-23-standard" };
  }

  const from = toISO(checkIn);
  const to   = toISO(checkOut);
  if (!from || !to) {
    return { ok: false, roomType: rt, available: false, warning: "invalid dates" };
  }

  const LIMIT = 20;
  const tryOnce = async (params) => {
    let offset = 0, taken = false, total = null;

    while (true) {
      const res = await bnovoFetch(`/bookings?${qs({ ...params, limit: LIMIT, offset })}`);
      const data = await safeParse(res);

      if (!res.ok) {
        // 406 bo‘lsa tashqarida fallback qilamiz
        return { http: res.status, data };
      }

      const payload = data?.data ?? data;
      const items = Array.isArray(payload?.bookings) ? payload.bookings
                  : Array.isArray(payload?.items)    ? payload.items
                  : Array.isArray(payload)           ? payload
                  : [];

      const metaTotal = Number(payload?.meta?.total ?? NaN);
      if (Number.isFinite(metaTotal)) total = metaTotal;

      for (const b of items) {
        const d = b?.dates || {};
        const arr = String(d.real_arrival || d.arrival || "");
        const dep = String(d.real_departure || d.departure || "");
        const isFamily =
          (FAMILY_ROOM_NAMES.length ? FAMILY_ROOM_NAMES.includes(String(b?.room_name ?? "").trim()) : false) ||
          (String(b?.plan_name ?? "").toUpperCase() && FAMILY_NAMES.some(n => String(b?.plan_name ?? "").toUpperCase().includes(n))) ||
          (String(b?.room_type_code ?? "").toUpperCase() && FAMILY_CODES.includes(String(b?.room_type_code ?? "").toUpperCase()));
        if (isFamily && arr && dep && overlapsDays(from, to, arr, dep)) {
          taken = true; break;
        }
      }
      if (taken) return { ok: true, taken };

      if (total != null) {
        offset += items.length;
        if (offset >= total) break;
      } else {
        if (items.length < LIMIT) break;
        offset += LIMIT;
      }
    }

    return { ok: true, taken: false };
  };

  try {
    // 1) To‘liq filtr (ko‘proq aniq)
    const baseParams = { date_from: from, date_to: to };
    if (process.env.BNOVO_HOTEL_ID) baseParams.hotel_id = process.env.BNOVO_HOTEL_ID;

    const res1 = await tryOnce({ ...baseParams, check_in_from: from, check_in_to: to });
    if (res1.ok) return { ok: true, roomType: rt, available: !res1.taken, source: "bnovo-api-v1" };

    // 406 / validatsiya xatosi bo‘lsa — 2) check_in_*siz fallback
    if (res1.http === 406) {
      const res2 = await tryOnce(baseParams);
      if (res2.ok) {
        return { ok: true, roomType: rt, available: !res2.taken, source: "bnovo-fallback-no-checkin" };
      }

      // 3) Yana ham soddaroq fallback: hotel_id’siz (ba’zi akkuntlarda kerak bo‘ladi)
      const { hotel_id, ...noHotel } = baseParams;
      const res3 = await tryOnce(noHotel);
      if (res3.ok) {
        return { ok: true, roomType: rt, available: !res3.taken, source: "bnovo-fallback-no-checkin-no-hotel" };
      }

      return { ok: false, roomType: rt, available: false, warning: `Bnovo ${res2.http || res3.http || 406}` };
    }

    // boshqa HTTP xatolar
    return { ok: false, roomType: rt, available: false, warning: `Bnovo ${res1.http || "error"}` };
  } catch (e) {
    console.error("Availability exception:", e);
    return { ok: false, roomType: rt, available: false, warning: `exception: ${e?.message || e}` };
  }
}


/**
 * Diagnostika uchun: ko‘rsatilgan kun oralig‘ida topilgan “family” bronlar ro‘yxati.
 */
export async function findFamilyBookings({ from, to }) {
  const f = toISO(from);
  const t = toISO(to);
  if (!f || !t) return { ok: false, items: [], warning: "invalid dates" };

  const padDays = 180;
  const wideFrom = new Date(new Date(f).getTime() - padDays * 86400000).toISOString().slice(0, 10);
  const wideTo   = new Date(new Date(t).getTime() + padDays * 86400000).toISOString().slice(0, 10);

  const LIMIT = 100;
  let offset = 0;
  const hits = [];

  while (true) {
    const params = {
      date_from: wideFrom,
      date_to: wideTo,
      check_in_from: f,
      check_in_to: t,
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

// Test/diagnostika uchun ichki util’lar (ixtiyoriy)
export const _internals = { isFamilyBooking, overlapsDays, parseBnovoDate };
