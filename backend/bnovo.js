// bnovo.js
import fetch from "node-fetch";

const BNOVO_API_BASE_URL = (process.env.BNOVO_API_BASE_URL || "https://api.pms.bnovo.ru").replace(/\/+$/,"");
const BNOVO_API_KEY = process.env.BNOVO_API_KEY;

/**
 * Family availability (1 ta xona) uchun tekshiruv.
 * Standard (23 ta) — hech qachon band ko'rsatilmaydi (frontend talabiga ko'ra).
 * Bu funksiya Bnovo’dan mavjud bronlar orasida Familyga tegishli kesishma bormi – shuni tekshiradi.
 */
export async function checkAvailability({ checkIn, checkOut, roomType }) {
  const rt = String(roomType || "").toUpperCase();
  if (rt === "STANDARD") {
    // Har doim mavjud deb qaytaramiz (23 ta mavjud)
    return { ok: true, roomType: rt, available: true, source: "static-standard-23" };
  }

  // FAMILY: Bnovo API orqali tekshirishga urinamiz (read endpoints)
  if (!BNOVO_API_KEY) {
    return { ok: false, roomType: rt, available: true, warning: "BNOVO_API_KEY yo'q, default: available" };
  }

  try {
    // ⚠️ Endpoint nomi Bnovo hisob konfiguratsiyasiga qarab farq qilishi mumkin.
    // Biz "bookings list" tipidagi ochiq endpointga GET orqali murojaat qilib ko'ramiz.
    const url = `${BNOVO_API_BASE_URL}/open-api/bookings?date_from=${encodeURIComponent(checkIn)}&date_to=${encodeURIComponent(checkOut)}&status=confirmed`;
    const res = await fetch(url, {
      headers: {
        "Authorization": `Bearer ${BNOVO_API_KEY}`,
        "Accept": "application/json"
      }
    });
    const data = await (async () => {
      const ct = (res.headers.get("content-type") || "").toLowerCase();
      if (ct.includes("application/json")) return res.json();
      const txt = await res.text();
      try { return JSON.parse(txt); } catch { return { _raw: txt }; }
    })();

    if (!res.ok) {
      console.error("Bnovo availability error:", res.status, data);
      // agar API ishlamasa – mijoz tajribasi uchun "available" deymiz, lekin warning bilan
      return { ok: false, roomType: rt, available: true, warning: `Bnovo ${res.status}` };
    }

    // data ichidagi bronlardan FAMILY xonasiga tegishlisini filtrlashga urinamiz
    // (room_type_code / roomType / categoryName va h.k. maydonlar turlicha bo‘lishi mumkin)
    const list = Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []);
    const hasFamilyBooked = list.some((b) => {
      const code = String(
        b?.room_type_code || b?.roomTypeCode || b?.room_type || b?.roomType || b?.category
      ).toUpperCase();
      return code.includes("FAMILY");
    });

    return { ok: true, roomType: rt, available: !hasFamilyBooked, source: "bnovo-open-api" };
  } catch (e) {
    console.error("Bnovo availability exception:", e);
    return { ok: false, roomType: rt, available: true, warning: "availability exception, default: available" };
  }
}

/**
 * Payment successdan keyin Bnovo'ga bron yaratish / push qilish.
 * Agar API 4xx/5xx qaytarsa, false qaytadi (fallback: email/telegram).
 */
export async function createBookingInBnovo(payload) {
  if (!BNOVO_API_KEY) {
    return { ok: false, error: "BNOVO_API_KEY missing" };
  }

  // payload — biz Octo custom_data.booking da yuborgan obyekt:
  // { checkIn, checkOut, duration, roomType, guests, firstName, lastName, phone, email, priceEur, payment: {...}, note }
  const {
    checkIn, checkOut, roomType, guests,
    firstName, lastName, phone, email,
    priceEur, note
  } = payload || {};

  // Minimal validatsiya
  if (!checkIn || !checkOut || !roomType || !firstName || !email) {
    return { ok: false, error: "invalid booking payload" };
  }

  // Bnovo APIga mos strukturaga keltiramiz (taxminiy umumiy model).
  // ⚠️ Agar sizda rasmiy “create booking” endpoint yo'l-yo'rig'i bo'lsa, shu yerda maydonlarni moslashtirasiz.
  const body = {
    // Dates
    check_in: checkIn,
    check_out: checkOut,

    // Guest
    guest: {
      first_name: firstName,
      last_name: lastName || "",
      phone: phone || "",
      email: email
    },

    // Room / Category
    room_type_code: String(roomType).toUpperCase(), // "STANDARD" | "FAMILY"
    guests: Number(guests || 1),

    // Price info
    currency: "EUR",
    total_amount: Number(priceEur || 0),

    // Comment / source
    comment: note || "Khamsa website (post-payment push)",
    source: "Website"
  };

  try {
    const res = await fetch(`${BNOVO_API_BASE_URL}/open-api/bookings`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${BNOVO_API_KEY}`,
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(body)
    });

    const data = await (async () => {
      const ct = (res.headers.get("content-type") || "").toLowerCase();
      if (ct.includes("application/json")) return res.json();
      const txt = await res.text();
      try { return JSON.parse(txt); } catch { return { _raw: txt }; }
    })();

    if (!res.ok) {
      console.error("Bnovo create booking failed:", res.status, data);
      return { ok: false, status: res.status, error: data };
    }

    // Muvaffaqiyatli yaratildi deb hisoblaymiz
    return { ok: true, data };
  } catch (e) {
    console.error("Bnovo create booking exception:", e);
    return { ok: false, error: e?.message || String(e) };
  }
}
