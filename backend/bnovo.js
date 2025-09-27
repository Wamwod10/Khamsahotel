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
export async function checkAvailability({ checkIn, checkOut, roomType }){
  const rt = String(roomType||"").toUpperCase();
  if (rt === "STANDARD"){
    return { ok:true, roomType:rt, available:true, source:"static-23-standard" };
  }
  const from = toISO(checkIn), to = toISO(checkOut);
  if (!from || !to) return { ok:false, roomType:rt, available:false, warning:"invalid dates" };

  // Build candidate URLs (most permissive → strict)
  const urls = [];
  // 1) api/v1 without status, with pagination (ko‘p hollarda kerak bo‘ladi)
  urls.push(`${API_BASES[0]}/bookings?date_from=${from}&date_to=${to}&limit=100&offset=0`);
  // 2) open-api minimal (faqat date_from/date_to)
  urls.push(`${API_BASES[1]}/bookings?date_from=${from}&date_to=${to}`);

  // 3) agar kerak bo‘lsa hotel_id bilan ham urib ko‘ramiz (v1 da ba’zi akkauntlarda shart)
  const hotelId = await tryGetHotelId();
  if (hotelId){
    urls.unshift(`${API_BASES[0]}/bookings?hotel_id=${hotelId}&date_from=${from}&date_to=${to}&limit=100&offset=0`);
  }

  let lastError = null, lastStatus = null, lastBody = null;
  for (const u of urls){
    try{
      const res = await doGet(u);
      const data = await safeParse(res);
      if (res.ok){
        const items = pickItems(data);
        const taken = items.some(b =>
          FAMILY_CODES.includes(String(b?.room_type_code || b?.roomType || "").toUpperCase())
        );
        return { ok:true, roomType:rt, available:!taken, source:u.includes("/open-api")?"open-api":"api-v1" };
      } else {
        lastError = data; lastStatus = res.status; lastBody = data?._raw || JSON.stringify(data);
        // 404/406 bo‘lsa keyingisini uramiz
        continue;
      }
    } catch(e){
      lastError = e?.message || String(e);
      continue;
    }
  }

  // Hech biri ishlamadi — xavfsizlik uchun band deb qaytaramiz (overbookingni oldini olish)
  if (lastStatus){
    console.error("Bnovo availability failed:", lastStatus, lastBody || lastError);
    return { ok:false, roomType:rt, available:false, warning:`Bnovo ${lastStatus}` };
  }
  console.error("Bnovo availability exception:", lastError);
  return { ok:false, roomType:rt, available:false, warning:`exception: ${lastError}` };
}

// Open API — read-only; POST create mavjud emas
export async function createBookingInBnovo(){
  return { ok:true, pushed:false, reason:"API is read-only; POST yo‘q" };
}
