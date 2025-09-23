// bnovo.js
import fetch from "node-fetch";

const RAW_BASE = process.env.BNOVO_API_BASE_URL || "https://api.pms.bnovo.ru/open-api";
const BNOVO_API_BASE_URL = RAW_BASE.replace(/\/+$/, "");
const BNOVO_API_KEY = process.env.BNOVO_API_KEY;
const BNOVO_ALLOW_POST = String(process.env.BNOVO_ALLOW_POST || "false").toLowerCase() === "true";

// JSON/HTML safe parse
async function safeParse(res) {
  const ct = (res.headers.get("content-type") || "").toLowerCase();
  if (ct.includes("application/json")) return res.json();
  const txt = await res.text();
  try { return JSON.parse(txt); } catch { return { _raw: txt }; }
}

// Qo‘shib yoziladigan fetch (majburiy Accept)
async function bnovoFetch(url, init = {}) {
  const headers = {
    Accept: "application/json",
    ...(init.headers || {}),
  };
  return fetch(url, { ...init, headers });
}

/**
 * Availability tekshirish:
 * - `open-api/bookings` bo‘yicha shu davrda FAMILY/roomType bandmi-yo‘qmi deb tekshiradi
 * - Agar API kalit bo‘lmasa yoki API JSON bermasa, “available: true” fallback qaytaradi
 */
export async function checkAvailability({ checkIn, checkOut, roomType }) {
  const rt = String(roomType || "").toUpperCase();

  // STANDARD bo‘yicha sizda doimiy 23 ta xona bor deb ko‘rsatilgan edi — saqlab qo‘ydim
  if (rt === "STANDARD") {
    return { ok: true, roomType: rt, available: true, source: "static-23-standard" };
  }

  if (!BNOVO_API_KEY) {
    return { ok: false, roomType: rt, available: true, warning: "BNOVO_API_KEY yo‘q (fallback available=true)" };
  }

  try {
    const url = `${BNOVO_API_BASE_URL}/bookings?date_from=${checkIn}&date_to=${checkOut}&status=confirmed`;
    const res = await bnovoFetch(url, {
      headers: { Authorization: `Basic ${BNOVO_API_KEY}` },
    });
    const data = await safeParse(res);

    if (!res.ok) {
      console.error("Bnovo availability error:", res.status, data);
      // API JSON o‘rniga HTML qaytarsa ham frontend yiqilmasin
      return { ok: false, roomType: rt, available: true, warning: `Bnovo ${res.status}` };
    }

    const items = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
    const familyTaken = items.some((b) =>
      String(b?.room_type_code || b?.roomType || "").toUpperCase().includes("FAMILY")
    );

    return { ok: true, roomType: rt, available: !familyTaken, source: "bnovo-open-api" };
  } catch (e) {
    console.error("Bnovo availability exception:", e);
    return { ok: false, roomType: rt, available: true, warning: "availability exception" };
  }
}

/**
 * Bnovo’da bron yaratish (POST):
 * - BNOVO_ALLOW_POST=false bo‘lsa, API cheklovi sabab soft-return (push qilmaydi)
 * - true bo‘lsa, POST urib ko‘radi; muvaffaqiyatli bo‘lsa `pushed:true`
 */
export async function createBookingInBnovo(payload) {
  if (!BNOVO_API_KEY) {
    return { ok: false, pushed: false, error: "BNOVO_API_KEY yo‘q" };
  }

  const {
    checkIn, checkOut, roomType, guests,
    firstName, lastName, phone, email,
    priceEur, note,
  } = payload || {};

  if (!checkIn || !checkOut || !roomType || !firstName || !email) {
    return { ok: false, pushed: false, error: "Invalid booking payload" };
  }

  const body = {
    check_in: checkIn,
    check_out: checkOut,
    guest: {
      first_name: firstName,
      last_name: lastName || "",
      phone: phone || "",
      email,
    },
    room_type_code: String(roomType).toUpperCase(),
    guests: Number(guests || 1),
    currency: "EUR",
    total_amount: Number(priceEur || 0),
    comment: note || "Khamsa website (post-payment push)",
    source: "Website",
  };

  if (!BNOVO_ALLOW_POST) {
    // Soft-fallback: API ruxsati bo‘lmaganda oqimni to‘xtatmaymiz
    return { ok: true, pushed: false, reason: "BNOVO_ALLOW_POST=false (open-api odatda POSTni qo‘ymaydi)", data: body };
  }

  try {
    const res = await bnovoFetch(`${BNOVO_API_BASE_URL}/bookings`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${BNOVO_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await safeParse(res);
    if (!res.ok) {
      console.error("Bnovo create booking failed:", res.status, data);
      return { ok: false, pushed: false, status: res.status, error: data };
    }
    return { ok: true, pushed: true, data };
  } catch (e) {
    console.error("Bnovo create booking exception:", e);
    return { ok: false, pushed: false, error: e?.message || String(e) };
  }
}
