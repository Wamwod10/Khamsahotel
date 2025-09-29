// bnovo.js — Availability (Bnovo api/v1, JWT, room_name/name/codes + check_in filter)
import "dotenv/config";
import fetch from "node-fetch";

/* ========= ENV ========= */
const BASE = (process.env.BNOVO_API_BASE_URL || "https://api.pms.bnovo.ru/api/v1").replace(/\/+$/, "");
const AUTH_URL = process.env.BNOVO_AUTH_URL || "https://api.pms.bnovo.ru/api/v1/auth";
const TOKEN_TTL = Number(process.env.BNOVO_TOKEN_TTL || 300);

const BNOVO_ID       = process.env.BNOVO_ID;        // 109828
const BNOVO_PASSWORD = process.env.BNOVO_PASSWORD;  // Octopus -> API Пароль
const BNOVO_HOTEL_ID = process.env.BNOVO_HOTEL_ID || ""; // bo'lmasa filtrsiz

// Family aniqlash sozlamalari
const FAMILY_CODES = (process.env.BNOVO_FAMILY_CODES || "FAMILY,FAM")
  .split(",").map(s => s.trim().toUpperCase()).filter(Boolean);

const FAMILY_NAMES = (process.env.BNOVO_FAMILY_NAMES || "FAMILY,СЕМЕЙ")
  .split(",").map(s => s.trim().toUpperCase()).filter(Boolean);

// room_name(lar): masalan "1" yoki "Family 1", vergul bilan
const FAMILY_ROOM_NAMES = (process.env.BNOVO_FAMILY_ROOM_NAMES || "")
  .split(",").map(s => s.trim()).filter(Boolean);

/* ========= Helpers ========= */
const toISO = d => {
  if (typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
  const x = new Date(d);
  return Number.isNaN(x.getTime()) ? null : x.toISOString().slice(0, 10);
};
async function safeParse(res){
  const ct = (res.headers.get("content-type")||"").toLowerCase();
  if (ct.includes("application/json")) return res.json();
  const txt = await res.text(); try { return JSON.parse(txt); } catch { return { _raw: txt }; }
}
const qs = (o={})=>{
  const u = new URLSearchParams();
  for (const [k,v] of Object.entries(o)) if (v!==undefined && v!==null && String(v).length) u.set(k,String(v));
  return u.toString();
};
const overlaps = (a1,a2,b1,b2)=>{
  // ISO "YYYY-MM-DD" -> start 00:00, end 23:59:59
  const A1 = new Date(a1+"T00:00:00Z").getTime();
  const A2 = new Date(a2+"T23:59:59Z").getTime();
  const B1 = new Date(b1.replace(" ","T")).getTime(); // "YYYY-MM-DD hh:mm:ss+03"
  const B2 = new Date(b2.replace(" ","T")).getTime();
  return !(B2 < A1 || B1 > A2);
};

/* ========= Auth (cache) ========= */
let cached = { token:null, exp:0 };
async function auth(force=false){
  if (!AUTH_URL || !BNOVO_ID || !BNOVO_PASSWORD) throw new Error("Auth envs missing");
  const now = Math.floor(Date.now()/1000);
  if (!force && cached.token && cached.exp > now+30) return { Authorization:`Bearer ${cached.token}` };

  const r = await fetch(AUTH_URL,{
    method:"POST",
    headers:{ "Content-Type":"application/json", Accept:"application/json" },
    body: JSON.stringify({ id:Number(BNOVO_ID), password:BNOVO_PASSWORD }),
  });
  const j = await safeParse(r);
  if (!r.ok) throw new Error(`Auth failed: ${r.status} ${JSON.stringify(j)}`);

  const payload = j?.data ?? j;
  const token = payload?.access_token || payload?.token;
  const ttl   = Number(payload?.expires_in || TOKEN_TTL || 300);
  if (!token) throw new Error(`Auth token missing: ${JSON.stringify(j)}`);

  cached = { token, exp: now+ttl };
  return { Authorization:`Bearer ${token}` };
}

async function bnovoFetch(path, init={}, retry401=true){
  const url = path.startsWith("http") ? path : `${BASE}${path.startsWith("/")?"":"/"}${path}`;
  let headers = { Accept:"application/json, */*;q=0.1", ...(init.headers||{}), ...(await auth()) };
  let res = await fetch(url, { ...init, headers });
  if (retry401 && res.status===401){
    headers = { ...headers, ...(await auth(true)) };
    res = await fetch(url, { ...init, headers });
  }
  return res;
}

/* ========= Public ========= */
export async function checkAvailability({ checkIn, checkOut, roomType }){
  const rt = String(roomType||"").toUpperCase();

  // STANDARD — har doim mavjud (biznes qoida)
  if (rt === "STANDARD") {
    return { ok:true, roomType:rt, available:true, source:"static-23-standard" };
  }

  const from = toISO(checkIn);
  const to   = toISO(checkOut);
  if (!from || !to) return { ok:false, roomType:rt, available:false, warning:"invalid dates" };

  try {
    // API: date_* majburiy; check_in_* bilan toraytiramiz
    const LIMIT = 20;
    let offset = 0;
    let taken = false;

    while (true) {
      const params = {
        date_from: from,
        date_to: to,
        check_in_from: from,
        check_in_to: to,
        limit: LIMIT,
        offset,
      };
      if (BNOVO_HOTEL_ID) params.hotel_id = BNOVO_HOTEL_ID;

      const res = await bnovoFetch(`/bookings?${qs(params)}`);
      const data = await safeParse(res);
      if (!res.ok){
        console.error("Bnovo availability failed:", res.status, data);
        return { ok:false, roomType:rt, available:false, warning:`Bnovo ${res.status}` };
      }

      const payload = data?.data ?? data;
      const items = Array.isArray(payload?.bookings) ? payload.bookings
                  : Array.isArray(payload?.items)    ? payload.items
                  : Array.isArray(payload)           ? payload
                  : [];

      // Familyga tegishli bronni topamiz
      for (const b of items){
        const rn = String(b?.room_name ?? "").trim();         // "1"
        const plan = String(b?.plan_name ?? "").toUpperCase(); // "Семейный" etc
        const rtype = String(b?.room_type_code ?? "").toUpperCase();
        const arr = String(b?.dates?.arrival ?? "");
        const dep = String(b?.dates?.departure ?? "");

        const isFamilyByRoomName = FAMILY_ROOM_NAMES.length
          ? FAMILY_ROOM_NAMES.some(x => x === rn)
          : false;

        const isFamilyByName = FAMILY_NAMES.some(n => plan.includes(n));
        const isFamilyByCode = rtype && FAMILY_CODES.includes(rtype);

        const isFamily = isFamilyByRoomName || isFamilyByName || isFamilyByCode;

        if (isFamily && arr && dep && overlaps(from,to, arr,dep)){
          taken = true; break;
        }
      }

      if (taken) break;
      if (items.length < LIMIT) break;
      offset += LIMIT;
    }

    return { ok:true, roomType:rt, available:!taken, source:"bnovo-api-v1" };
  } catch (e){
    console.error("Bnovo availability exception:", e);
    return { ok:false, roomType:rt, available:false, warning:`exception: ${e?.message||e}` };
  }
}

export async function createBookingInBnovo(){
  return { ok:true, pushed:false, reason:"API read-only; POST yo‘q" };
}
