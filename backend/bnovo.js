// bnovo.js — Robust availability (JWT + multi-endpoint fallback)
import "dotenv/config";
import fetch from "node-fetch";

/* ===== ENV ===== */
const AUTH_URL = process.env.BNOVO_AUTH_URL || "https://api.pms.bnovo.ru/api/v1/auth";
const API_BASES = [
  (process.env.BNOVO_API_BASE_URL || "https://api.pms.bnovo.ru/api/v1").replace(/\/+$/,""),
  "https://api.pms.bnovo.ru/open-api" // fallback
];
const BNOVO_ID = process.env.BNOVO_ID;
const BNOVO_PASSWORD = process.env.BNOVO_PASSWORD;
const TOKEN_TTL = Number(process.env.BNOVO_TOKEN_TTL || 300);
const FAMILY_CODES = (process.env.BNOVO_FAMILY_CODES || "FAMILY,FAM")
  .split(",").map(s=>s.trim().toUpperCase()).filter(Boolean);

/* ===== helpers ===== */
const toISO = (d)=>{
  if (typeof d==="string" && /^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
  const x = new Date(d);
  return Number.isNaN(x.getTime()) ? null : x.toISOString().slice(0,10);
};
async function safeParse(res){
  const ct = (res.headers.get("content-type")||"").toLowerCase();
  if (ct.includes("application/json")) return res.json();
  const txt = await res.text();
  try { return JSON.parse(txt); } catch { return { _raw: txt }; }
}
function pickItems(payload){
  if (!payload) return [];
  if (Array.isArray(payload?.data?.items)) return payload.data.items;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload)) return payload;
  return [];
}

/* ===== auth cache ===== */
let cached = { token:null, exp:0 };
async function auth(force=false){
  const now = Math.floor(Date.now()/1000);
  if (!force && cached.token && cached.exp > now+30) return cached.token;
  if (!BNOVO_ID || !BNOVO_PASSWORD) throw new Error("BNOVO_ID/BNOVO_PASSWORD yo‘q");

  const r = await fetch(AUTH_URL, {
    method:"POST",
    headers: { "Content-Type":"application/json", "Accept":"application/json" },
    body: JSON.stringify({ id: Number(BNOVO_ID), password: BNOVO_PASSWORD })
  });
  const j = await safeParse(r);
  if (!r.ok) throw new Error(`auth ${r.status} ${JSON.stringify(j)}`);

  const p = j?.data || j;
  const token = p?.access_token || p?.token;
  const ttl = Number(p?.expires_in || TOKEN_TTL || 300);
  if (!token) throw new Error(`auth token missing: ${JSON.stringify(j)}`);

  cached = { token, exp: now + ttl };
  return token;
}

/* ===== single request with retry ===== */
async function doGet(url){
  const token = await auth(false);
  let res = await fetch(url, {
    headers: { Accept: "application/json, */*;q=0.1", Authorization: `Bearer ${token}` }
  });
  if (res.status === 401){
    const t2 = await auth(true);
    res = await fetch(url, {
      headers: { Accept: "application/json, */*;q=0.1", Authorization: `Bearer ${t2}` }
    });
  }
  return res;
}

/* ===== optional: get hotel id (v1) ===== */
async function tryGetHotelId(){
  try{
    const base = API_BASES[0]; // api/v1
    const r = await doGet(`${base}/hotels?limit=1&offset=0`);
    const j = await safeParse(r);
    if (!r.ok) return null;
    const items = pickItems(j);
    const id = items?.[0]?.id;
    return id || null;
  }catch{ return null; }
}

/* ===== public ===== */
// bnovo.js ichida — eski checkAvailability’ni to‘liq shu bilan almashtiring
export async function checkAvailability({ checkIn, checkOut, roomType }) {
  const rt = String(roomType || "").toUpperCase();

  // STANDARD — biznes qoidangiz: doim bor
  if (rt === "STANDARD") {
    return { ok: true, roomType: rt, available: true, source: "static-23-standard" };
  }

  // YYYY-MM-DD ga normalize
  const toISO = (d) => (typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : new Date(d).toISOString().slice(0,10));
  const from = toISO(checkIn);
  const to   = toISO(checkOut);
  if (!from || !to) {
    return { ok: false, roomType: rt, available: false, warning: "invalid dates" };
  }

  // ENV: hotel_id (agar alohida bo'lsa BNOVO_HOTEL_ID ni .env ga qo'ying)
  const hotelId = process.env.BNOVO_HOTEL_ID || process.env.BNOVO_ID;
  const FAMILY_CODES = (process.env.BNOVO_FAMILY_CODES || "FAMILY,FAM")
    .split(",").map(s => s.trim().toUpperCase()).filter(Boolean);

  try {
    const LIMIT = 20;  // v1 cheklovi: 20 dan katta bo'lmaydi
    let offset = 0;
    let anyFamilyTaken = false;

    while (true) {
      const q = new URLSearchParams({
        hotel_id: String(hotelId || ""),
        date_from: from,
        date_to: to,
        limit: String(LIMIT),
        offset: String(offset),
      }).toString();

      const res = await bnovoFetch(`/bookings?${q}`);
      const data = await (async () => {
        const ct = (res.headers.get("content-type") || "").toLowerCase();
        if (ct.includes("application/json")) return res.json();
        const txt = await res.text(); try { return JSON.parse(txt); } catch { return { _raw: txt }; }
      })();

      if (!res.ok) {
        const raw = data?._raw || JSON.stringify(data);
        console.error("Bnovo availability error:", res.status, raw);
        return { ok: false, roomType: rt, available: false, warning: `Bnovo ${res.status}` };
      }

      // v1 javobi ko'pincha { data: { items: [...], meta: {...} } }
      const payload = data?.data ? data.data : data;
      const items = Array.isArray(payload?.items) ? payload.items
                  : Array.isArray(payload)      ? payload
                  : [];

      // FAMILY bandligini tekshirish
      const taken = items.some(b =>
        FAMILY_CODES.includes(String(b?.room_type_code || b?.roomType || "").toUpperCase())
      );
      if (taken) { anyFamilyTaken = true; break; }

      // Sahifalash tugashi sharti
      if (items.length < LIMIT) break;
      offset += LIMIT;
    }

    return { ok: true, roomType: rt, available: !anyFamilyTaken, source: "bnovo-api-v1" };
  } catch (e) {
    console.error("Bnovo availability exception:", e);
    return { ok: false, roomType: rt, available: false, warning: `exception: ${e?.message || e}` };
  }
}


// Open API — read-only; POST create mavjud emas
export async function createBookingInBnovo(){
  return { ok:true, pushed:false, reason:"API is read-only; POST yo‘q" };
}
