// bnovo.js — CommonJS, global.fetch (Node 18+)
const dotenv = require("dotenv");
dotenv.config();

/* ========= ENV ========= */
const BASE = (
  process.env.BNOVO_API_BASE_URL || "https://api.pms.bnovo.ru/api/v1"
).replace(/\/+$/, "");
const AUTH_URL =
  process.env.BNOVO_AUTH_URL || "https://api/pms.bnovo.ru/api/v1/auth"; // fallback safe
const TOKEN_TTL = Number(process.env.BNOVO_TOKEN_TTL || 300);

// Hotel timezone (Asia/Tashkent = UTC+5)
const HOTEL_TZ_OFFSET = Number(process.env.HOTEL_TZ_OFFSET || 5); // hours

// Inventory (front tomonga hisobot uchun)
const STANDARD_STOCK = Number(process.env.STANDARD_STOCK || 23);
const FAMILY_STOCK = Number(process.env.FAMILY_STOCK || 1);

// Auth creds
const BNOVO_ID = process.env.BNOVO_ID;
const BNOVO_PASSWORD = process.env.BNOVO_PASSWORD;

// (Ixtiyoriy) — noto‘g‘ri bo‘lsa qo‘ymang!
const BNOVO_HOTEL_ID = (process.env.BNOVO_HOTEL_ID || "").trim();

const DEBUG = /^1|true|yes$/i.test(process.env.BNOVO_DEBUG || "");

/* ========= Family matching sozlamalari ========= */
const FAMILY_CODES = (process.env.BNOVO_FAMILY_CODES || "FAMILY,FAM")
  .split(",")
  .map((s) => s.trim().toUpperCase())
  .filter(Boolean);

const FAMILY_NAMES = (
  process.env.BNOVO_FAMILY_NAMES || "FAMILY,СЕМЕЙ,СЕМЕЙНЫЙ,OILAVIY"
)
  .split(",")
  .map((s) => s.trim().toUpperCase())
  .filter(Boolean);

// room_name(lar): masalan "1"
const FAMILY_ROOM_NAMES = (process.env.BNOVO_FAMILY_ROOM_NAMES || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const FAMILY_TYPE_IDS = (process.env.BNOVO_FAMILY_TYPE_IDS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const FAMILY_PLAN_TOKENS = (process.env.BNOVO_FAMILY_PLAN_TOKENS || "")
  .split(",")
  .map((s) => s.trim().toUpperCase())
  .filter(Boolean);

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
  try {
    return JSON.parse(txt);
  } catch {
    return { _raw: txt };
  }
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
  const t = Date.parse(String(s).replace(" ", "T"));
  return Number.isNaN(t) ? NaN : t;
}

function dateOnly10(s) {
  if (!s) return "";
  return String(s).replace(" ", "T").slice(0, 10);
}

/** Kalendar kesish (departure kuni yotish kuni emas, [a,d) interval) */
function overlapsByCalendarDays(fromISO, toISO, arrStr, depStr) {
  const a = dateOnly10(arrStr);
  const d = dateOnly10(depStr);
  if (!a || !d) return false;
  // [a, d) ∩ [fromISO, toISO) ≠ ∅
  return a < toISO && d > fromISO;
}

/** Mahalliy (Tashkent) kun diapazonini UTC ms ga konvert */
function localDayRangeMs(fromISO, toISO, tzOffsetHours = HOTEL_TZ_OFFSET) {
  const offsetMs = tzOffsetHours * 3600_000;
  const d1 = Date.parse(fromISO + "T00:00:00Z") - offsetMs;
  const d2 = Date.parse(toISO + "T23:59:59Z") - offsetMs;
  return [d1, d2];
}

/** TZ-aware kesish */
function overlapsLocalDays(fromISO, toISO, arrStr, depStr) {
  const [L1, L2] = localDayRangeMs(fromISO, toISO);
  const arr = parseBnovoDate(arrStr);
  const dep = parseBnovoDate(depStr);
  if (Number.isNaN(arr) || Number.isNaN(dep)) return false;
  return !(dep < L1 || arr > L2);
}

/* ========= Auth (cache) ========= */
let cached = { token: null, exp: 0 };

async function auth(force = false) {
  if (!AUTH_URL || !BNOVO_ID || !BNOVO_PASSWORD) {
    throw new Error(
      "Bnovo auth envs missing: BNOVO_AUTH_URL/BNOVO_ID/BNOVO_PASSWORD"
    );
  }
  const now = Math.floor(Date.now() / 1000);
  if (!force && cached.token && cached.exp > now + 30) {
    return { Authorization: `Bearer ${cached.token}` };
  }

  const r = await fetch(AUTH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, */*;q=0.1",
    },
    body: JSON.stringify({ id: Number(BNOVO_ID), password: BNOVO_PASSWORD }),
  });

  const j = await safeParse(r);
  if (!r.ok) throw new Error(`Auth failed: ${r.status} ${JSON.stringify(j)}`);

  const payload = j?.data ?? j;
  const token = payload?.access_token || payload?.token;
  const ttl = Number(payload?.expires_in || TOKEN_TTL || 300);
  if (!token) throw new Error(`Auth token missing: ${JSON.stringify(j)}`);

  cached = { token, exp: now + ttl };
  if (DEBUG) console.log("[BNOVO] token updated, ttl:", ttl);
  return { Authorization: `Bearer ${token}` };
}

async function bnovoFetch(path, init = {}, retry401 = true) {
  const url = path.startsWith("http")
    ? path
    : `${BASE}${path.startsWith("/") ? "" : "/"}${path}`;
  let headers = {
    Accept: "application/json, */*;q=0.1",
    ...(init.headers || {}),
    ...(await auth()),
  };

  if (DEBUG) console.log("[BNOVO GET]", url);

  let res = await fetch(url, { ...init, headers });
  if (retry401 && res.status === 401) {
    headers = { ...headers, ...(await auth(true)) };
    res = await fetch(url, { ...init, headers });
  }
  return res;
}

/* ========= Family booking aniqlash ========= */
function isFamilyBooking(b, _debugOut) {
  // status tekshiruv
  const st = (b?.status?.name || b?.status || "").toString().toLowerCase();
  if (
    st.includes("cancel") ||
    st.includes("отмена") ||
    st.includes("no_show")
  ) {
    _debugOut && (_debugOut.reason = "canceled/no_show");
    return false;
  }

  // maydonlar
  const rnRaw = b?.room_name ?? b?.room?.name ?? b?.room?.number ?? "";
  const rn = String(rnRaw).trim();
  const plan = String(b?.plan_name ?? b?.rate_plan?.name ?? "").toUpperCase();
  const rtname = String(
    b?.room_type?.name ?? b?.roomTypeName ?? ""
  ).toUpperCase();
  const rcode = String(
    b?.room_type_code || b?.roomType || b?.room_category_code || ""
  ).toUpperCase();
  const rtid = String(
    b?.room_type?.id ?? b?.room_type_id ?? b?.roomTypeId ?? ""
  );
  const bigText = `${plan} ${rtname} ${String(rnRaw).toUpperCase()}`;

  // ENV o‘qilgan tokenlar
  const NAME_TOKENS = new Set([
    ...FAMILY_NAMES, // env: FAMILY, СЕМЕЙ...
    ...FAMILY_PLAN_TOKENS, // env: qo‘shimcha plan tokenlari
    "FAMILY",
    "FAMILY ROOM",
    "FAM",
    "СЕМЕЙ",
    "СЕМЕЙНЫЙ",
    "СЕМЕЙНАЯ",
    "OILAVIY",
    "OILA",
    "OILAVIY ROOM",
  ]);

  // 1) room_name bo‘yicha
  const byRoomName = FAMILY_ROOM_NAMES.length
    ? FAMILY_ROOM_NAMES.includes(rn)
    : false;

  // 2) code bo‘yicha
  const byCode = !!rcode && FAMILY_CODES.includes(rcode);

  // 3) room_type.id bo‘yicha (ixtiyoriy)
  const byTypeId = !!rtid && FAMILY_TYPE_IDS.includes(rtid);

  // 4) plan/name tokenlari bo‘yicha
  const byToken = Array.from(NAME_TOKENS).some((t) => t && bigText.includes(t));

  // 5) rooms[] massivida familyga o‘xshash nomlar
  let byRoomsArray = false;
  if (Array.isArray(b?.rooms)) {
    for (const r of b.rooms) {
      const nm = (r?.name || r?.number || r?.title || "")
        .toString()
        .toUpperCase();
      if (!nm) continue;
      if (Array.from(NAME_TOKENS).some((t) => t && nm.includes(t))) {
        byRoomsArray = true;
        break;
      }
      if (
        FAMILY_ROOM_NAMES.length &&
        FAMILY_ROOM_NAMES.includes(String(r?.name || r?.number || "").trim())
      ) {
        byRoomsArray = true;
        break;
      }
    }
  }

  const verdict = byRoomName || byCode || byTypeId || byToken || byRoomsArray;
  if (_debugOut) {
    _debugOut.flags = { byRoomName, byCode, byTypeId, byToken, byRoomsArray };
    _debugOut.fields = {
      room_name: rn,
      plan_name: plan,
      room_type_name: rtname,
      room_type_code: rcode,
      room_type_id: rtid,
    };
  }
  return verdict;
}

/* ========= Bookings list (paginate, limit ≤ 20) ========= */
async function listBookingsPaged(params) {
  const LIMIT = Math.min(20, Number(process.env.BNOVO_PAGE_LIMIT || 20));
  let offset = 0;
  let total = null;
  const all = [];

  while (true) {
    const q = { ...params, limit: LIMIT, offset };
    if (BNOVO_HOTEL_ID) q.hotel_id = BNOVO_HOTEL_ID; // ixtiyoriy — noto‘g‘ri bo‘lsa qo‘ymang!
    const url = `/bookings?${qs(q)}`;
    const res = await bnovoFetch(url);
    const data = await safeParse(res);
    if (!res.ok) throw new Error(`Bnovo ${res.status} ${JSON.stringify(data)}`);

    const payload = data?.data ?? data;
    const items = Array.isArray(payload?.bookings)
      ? payload.bookings
      : Array.isArray(payload?.items)
      ? payload.items
      : Array.isArray(payload)
      ? payload
      : [];

    all.push(...items);

    const metaTotal = Number(payload?.meta?.total ?? NaN);
    if (Number.isFinite(metaTotal)) {
      total = metaTotal;
      offset += items.length;
      if (offset >= total) break;
    } else {
      if (items.length < LIMIT) break;
      offset += LIMIT;
    }
  }
  return all;
}

/** Aqlli list — bo‘sh kelsa intervalni kengaytirib ko‘radi (chegaradagi bronlarni tutish uchun) */
async function listBookingsSmart(fromISO, toISO) {
  // 1) Asosiy
  const base = await listBookingsPaged({ date_from: fromISO, date_to: toISO });
  if (base.length) return base;

  // 2) to + 1 kun
  const toPlus1 = new Date(toISO + "T00:00:00Z");
  toPlus1.setUTCDate(toPlus1.getUTCDate() + 1);
  const toP1 = toPlus1.toISOString().slice(0, 10);
  const plus = await listBookingsPaged({ date_from: fromISO, date_to: toP1 });
  if (plus.length) return plus;

  // 3) from - 1 … to + 1
  const fromMinus1 = new Date(fromISO + "T00:00:00Z");
  fromMinus1.setUTCDate(fromMinus1.getUTCDate() - 1);
  const fm1 = fromMinus1.toISOString().slice(0, 10);
  const wide = await listBookingsPaged({ date_from: fm1, date_to: toP1 });
  return wide;
}

/* ========= Public API ========= */
async function checkAvailability({ checkIn, checkOut, roomType, rooms = 1 }) {
  const rt = String(roomType || "").toUpperCase();
  const from = toISO(checkIn);
  const to = toISO(checkOut);
  const reqRooms = Math.max(1, Number(rooms || 1));

  if (!from || !to) {
    return {
      ok: false,
      roomType: rt,
      available: false,
      warning: "invalid dates",
    };
  }

  try {
    // Chegaradagi holatlar uchun smart ro‘yxat
    const items = await listBookingsSmart(from, to);

    if (rt === "FAMILY") {
      let taken = false;

      for (const b of items) {
        if (!isFamilyBooking(b)) continue;

        const d = b?.dates || {};
        const arr = String(d.real_arrival || d.arrival || "");
        const dep = String(d.real_departure || d.departure || "");
        if (!arr || !dep) continue;

        const sameArrival = from === dateOnly10(arr); // aynan shu kunda check-in
        const overlapCal = overlapsByCalendarDays(from, to, arr, dep); // kalendar kesish
        const overlapTZ = overlapsLocalDays(from, to, arr, dep); // TZ-aware kesish

        if (sameArrival || overlapCal || overlapTZ) {
          taken = true;
          break;
        }
      }

      const occupied = taken ? Math.min(FAMILY_STOCK, 1) : 0;
      const free = Math.max(0, FAMILY_STOCK - occupied);
      const available = free >= reqRooms;

      return {
        ok: true,
        roomType: rt,
        available,
        totalRooms: FAMILY_STOCK,
        occupiedRooms: occupied,
        freeRooms: free,
        source: "bnovo-api-v1",
      };
    }

    // STANDARD — real hisob (family’larni qo‘shmaymiz)
    let occupied = 0;
    for (const b of items) {
      if (isFamilyBooking(b)) continue;
      const s = (b?.status?.name || b?.status || "").toString().toLowerCase();
      const canceled =
        s.includes("cancel") || s.includes("отмена") || s.includes("no_show");
      if (canceled) continue;

      const d = b?.dates || {};
      const arr = String(d.real_arrival || d.arrival || "");
      const dep = String(d.real_departure || d.departure || "");
      if (!arr || !dep) continue;

      if (!overlapsLocalDays(from, to, arr, dep)) continue;

      const roomsCount = Number(b?.roomsCount || b?.rooms || b?.qty || 1);
      occupied += Math.max(1, roomsCount);
    }

    const total = STANDARD_STOCK;
    const free = Math.max(0, total - occupied);
    const available = free >= reqRooms;

    return {
      ok: true,
      roomType: rt,
      available,
      totalRooms: total,
      occupiedRooms: Math.min(occupied, total),
      freeRooms: free,
      source: "bnovo-api-v1",
    };
  } catch (e) {
    if (DEBUG) console.error("Bnovo availability exception:", e);
    return {
      ok: false,
      roomType: rt,
      available: false,
      warning: `exception: ${e?.message || e}`,
    };
  }
}

async function findFamilyBookings({ from, to }) {
  const f = toISO(from);
  const t = toISO(to);
  if (!f || !t) return { ok: false, items: [], warning: "invalid dates" };

  const items = await listBookingsSmart(f, t);
  const hits = [];

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
      status: b?.status?.name || b?.status,
    });
  }

  return { ok: true, items: hits };
}

/* Diagnostika — xom ro‘yxat (preview) */
async function _listForRaw(from, to) {
  const itemsFull = await listBookingsSmart(from, to);
  const preview = itemsFull.map((b) => ({
    number: b?.number,
    room_name: b?.room_name,
    plan_name: b?.plan_name,
    room_type: b?.room_type?.name,
    room_type_code: b?.room_type_code,
    status: b?.status?.name || b?.status,
    arrival: b?.dates?.arrival,
    departure: b?.dates?.departure,
  }));

  return {
    strategy: "smart( base → to+1 → from-1..to+1 )",
    count: preview.length,
    items: preview,
  };
}

/* POST yo‘q — read-only */
async function createBookingInBnovo() {
  return {
    ok: true,
    pushed: false,
    reason: "API read-only; POST mavjud emas yoki ishlamayapti",
  };
}

async function debugFamilyMatch(from, to) {
  const f = toISO(from);
  const t = toISO(to);
  if (!f || !t) return { ok: false, items: [], warning: "invalid dates" };

  const items = await listBookingsSmart(f, t);
  const out = [];

  for (const b of items) {
    const d = b?.dates || {};
    const record = {
      number: b?.number,
      status: b?.status?.name || b?.status,
      room_name: b?.room_name ?? b?.room?.name ?? b?.room?.number,
      plan_name: b?.plan_name ?? b?.rate_plan?.name,
      room_type_code: b?.room_type_code || b?.roomType || b?.room_category_code,
      room_type_name: b?.room_type?.name || b?.roomTypeName,
      room_type_id: b?.room_type?.id || b?.room_type_id || b?.roomTypeId,
      arrival: d.arrival,
      departure: d.departure,
      real_arrival: d.real_arrival,
      real_departure: d.real_departure,
    };
    const dbg = {};
    const isFam = isFamilyBooking(b, dbg);
    out.push({
      ...record,
      isFamily: isFam,
      ...(dbg.flags ? { flags: dbg.flags, fields: dbg.fields } : {}),
    });
  }

  return { ok: true, from: f, to: t, count: out.length, items: out };
}

module.exports = {
  HOTEL_TZ_OFFSET,
  checkAvailability,
  findFamilyBookings,
  createBookingInBnovo,
  _listForRaw,
  debugFamilyMatch, // <-- YANGI
  // test utils:
  _internals: {
    parseBnovoDate,
    overlapsLocalDays,
    localDayRangeMs,
    overlapsByCalendarDays,
  },
};
