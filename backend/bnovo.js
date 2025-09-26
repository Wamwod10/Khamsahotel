// bnovo.js — Availability (Bearer/JWT, read-only)
import fetch from "node-fetch";

const RAW_BASE = process.env.BNOVO_API_BASE_URL || "https://api.pms.bnovo.ru/open-api";
const BNOVO_API_BASE_URL = RAW_BASE.replace(/\/+$/, "");

/* ---------- helpers ---------- */
async function safeParse(res) {
  const ct = (res.headers.get("content-type") || "").toLowerCase();
  if (ct.includes("application/json")) return res.json();
  const txt = await res.text();
  try { return JSON.parse(txt); } catch { return { _raw: txt }; }
}

let cachedToken = { value: null, exp: 0 };
async function getAuthHeader() {
  const mode = (process.env.BNOVO_AUTH_MODE || "bearer").toLowerCase();
  if (mode !== "bearer") throw new Error("BNOVO_AUTH_MODE=bearer bo'lishi kerak");

  const now = Math.floor(Date.now() / 1000);
  if (cachedToken.value && cachedToken.exp > now + 30) {
    return { Authorization: `Bearer ${cachedToken.value}` };
  }

  const url = process.env.BNOVO_AUTH_URL;
  const payload = process.env.BNOVO_AUTH_PAYLOAD ? JSON.parse(process.env.BNOVO_AUTH_PAYLOAD) : null;
  if (!url || !payload) throw new Error("BNOVO_AUTH_URL yoki BNOVO_AUTH_PAYLOAD yo‘q");

  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept": "application/json" },
    body: JSON.stringify(payload),
  });
  const j = await safeParse(r);
  if (!r.ok) throw new Error(`Auth failed: ${r.status} ${JSON.stringify(j)}`);

  const token = j.access_token || j.token;
  const ttl = Number(j.expires_in || process.env.BNOVO_TOKEN_TTL || 300);
  if (!token) throw new Error("Auth token missing in response");

  cachedToken = { value: token, exp: now + ttl };
  return { Authorization: `Bearer ${token}` };
}

async function bnovoFetch(url, init = {}) {
  const auth = await getAuthHeader();
  const headers = { Accept: "application/json", ...auth, ...(init.headers || {}) };
  return fetch(url, { ...init, headers });
}

/* ---------- Availability ---------- */
export async function checkAvailability({ checkIn, checkOut, roomType }) {
  const rt = String(roomType || "").toUpperCase();

  // STANDARD — sizning biznes qoidadagi 23 ta xonaga mos
  if (rt === "STANDARD") {
    return { ok: true, roomType: rt, available: true, source: "static-23-standard" };
  }

  try {
    const url = `${BNOVO_API_BASE_URL}/bookings?date_from=${checkIn}&date_to=${checkOut}&status=confirmed`;
    const res = await bnovoFetch(url);
    const data = await safeParse(res);

    if (!res.ok) {
      console.error("Bnovo availability error:", res.status, data);
      // xavfsiz tomonga: API ishlamasa family'ni band deb ko'rib, overbookingdan saqlanamiz
      return { ok: false, roomType: rt, available: false, warning: `Bnovo ${res.status}` };
    }

    const items = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
    // Kerak bo'lsa kodlarni kengaytirasiz: ["FAMILY","FAM","FAM1", ...]
    const FAMILY_CODES = ["FAMILY", "FAM"];
    const isFamilyTaken = items.some(b =>
      FAMILY_CODES.includes(String(b?.room_type_code || b?.roomType || "").toUpperCase())
    );

    return { ok: true, roomType: rt, available: !isFamilyTaken, source: "bnovo-open-api" };
  } catch (e) {
    console.error("Bnovo availability exception:", e);
    return { ok: false, roomType: rt, available: false, warning: "availability exception" };
  }
}

/* POST create yo'q (read-only) */
export async function createBookingInBnovo() {
  return { ok: true, pushed: false, reason: "Open API faqat read-only; POST yo‘q" };
}
