// PaymentSuccess.jsx
import React, { useEffect, useMemo, useRef } from "react";
import "./PaymentSuccess.scss";

/* ===================== Common helpers ===================== */

/** API bazasi (email backend uchun) – ketma-ket 3ta variantni sinab ko'ramiz */
function getApiBase() {
  const fromEnv =
    (import.meta?.env && import.meta.env.VITE_API_BASE_URL) ||
    (typeof process !== "undefined" && process.env?.REACT_APP_API_BASE_URL) ||
    "";

  // PROD backend (senda .env'da BASE_URL shu):
  const FALLBACK = "https://khamsa-backend.onrender.com";

  // Dev yoki nginx reverse-proxy bo'lsa, shu origin ham ishlashi mumkin
  const sameOrigin =
    (typeof window !== "undefined" && window.location?.origin) || "";

  // 1) Env -> 2) same origin -> 3) fallback (Render)
  // Bo'shlarni olib tashlaymiz va oxiridagi / ni kesamiz
  const candidates = [fromEnv, sameOrigin, FALLBACK]
    .map((s) => (s || "").replace(/\/+$/, ""))
    .filter(Boolean);

  // Birinchi variantni qaytaramiz, yuborishda esa agar xato bo'lsa qolganlarini sinaymiz
  return candidates[0];
}

/** JSON bo'lmasa ham xatoni to'g'ri qaytarish */
async function safeFetchJson(input, init) {
  const res = await fetch(input, init);
  const ct = res.headers.get("content-type") || "";
  let data;
  try {
    data = ct.includes("application/json")
      ? await res.json()
      : await res.text();
  } catch {
    data = await res.text().catch(() => "");
  }
  return { ok: res.ok, status: res.status, data };
}

/** Kichik, tez hash (idempotency key uchun). DJB2 varianti. */
function fastHash(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = (h * 33) ^ str.charCodeAt(i);
  return (h >>> 0).toString(36);
}

/** Barqaror stringify (kalitlarni sortlab) — aynan bir xil obyekt bir xil hash beradi */
function stableStringify(obj) {
  if (obj === null || typeof obj !== "object") return JSON.stringify(obj);
  if (Array.isArray(obj)) return `[${obj.map(stableStringify).join(",")}]`;
  const keys = Object.keys(obj).sort();
  return `{${keys
    .map((k) => JSON.stringify(k) + ":" + stableStringify(obj[k]))
    .join(",")}}`;
}

/** Mahalliy xotirada (localStorage) TTL bilan lock */
function setLock(name, key, ttlMs = 1000 * 60 * 60 * 24 * 2) {
  const now = Date.now();
  const payload = { t: now, exp: now + ttlMs };
  try {
    localStorage.setItem(`ps:lock:${name}:${key}`, JSON.stringify(payload));
  } catch {}
}
function hasValidLock(name, key) {
  try {
    const raw = localStorage.getItem(`ps:lock:${name}:${key}`);
    if (!raw) return false;
    const { exp } = JSON.parse(raw);
    return typeof exp === "number" && exp > Date.now();
  } catch {
    return false;
  }
}

/** Bir marta yuborish yordamchisi (idempotent). */
async function sendOnce({ name, uniquePayload, sender, ttlMs }) {
  const sig = fastHash(stableStringify(uniquePayload));
  if (hasValidLock(name, sig)) {
    return { ok: true, skipped: true, reason: "dedup-lock" };
  }
  const res = await sender();
  if (res?.ok) setLock(name, sig, ttlMs);
  return res;
}

/** Kichik retry yordamchisi (email uchun foydali) */
async function withRetry(fn, { tries = 3, baseDelay = 400 } = {}) {
  let last;
  for (let i = 0; i < tries; i++) {
    last = await fn();
    if (last?.ok) return last;
    await new Promise((r) => setTimeout(r, baseDelay * Math.pow(2, i)));
  }
  return last;
}

/* ===================== TELEGRAM ===================== */
/* .env.local:
   VITE_TG_BOT_TOKEN=xxxxxxxx:yyyy
   VITE_TG_CHAT_ID=-100...
*/
const TELEGRAM_BOT_TOKEN =
  (import.meta?.env && import.meta.env.VITE_TG_BOT_TOKEN) || "";
const TELEGRAM_CHAT_ID =
  (import.meta?.env && import.meta.env.VITE_TG_CHAT_ID) || "";

async function sendTelegramMessage(text) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.error("Telegram sozlanmagan: BOT_TOKEN yoki CHAT_ID yo‘q");
    return { ok: false, reason: "missing-config" };
  }
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  const body = {
    chat_id: TELEGRAM_CHAT_ID,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data?.ok === false) {
      console.error("Telegram sendMessage error:", data);
      return { ok: false, status: res.status, data };
    }
    return { ok: true, data };
  } catch (e) {
    console.error("Telegram sendMessage failed:", e);
    return { ok: false, reason: "network-error" };
  }
}

/* ===================== UI helpers ===================== */
const roomKeyMap = {
  "Standard Room": "Standard Room",
  "Family Room": "Family Room",
  "2 Standard Rooms": "2 Standard Rooms",
  "2 Family Rooms": "2 Family Rooms",
  "Standard + 1 Family room": "Standard + 1 Family room",
};

function formatDate(isoDate /* YYYY-MM-DD */) {
  if (!isoDate) return "-";
  const [y, m, d] = String(isoDate).split("-");
  return `${d}.${m}.${y}`;
}
function formatTime(s) {
  if (!s) return "-";
  if (s.includes("T")) return s.split("T")[1].slice(0, 5);
  return s.slice(0, 5);
}
function formatDateTime(s) {
  if (!s) return "-";
  const d = new Date(s);
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

/* ===================== Component ===================== */

const PaymentSuccess = () => {
  const PRIMARY_API_BASE = useMemo(getApiBase, []);
  const mountedRef = useRef(false);

  // email uchun bir nechta API bazani sinash
  const apiBases = useMemo(() => {
    const FALLBACK = "https://khamsa-backend.onrender.com";
    const sameOrigin =
      (typeof window !== "undefined" && window.location?.origin) || "";
    const fromEnv =
      (import.meta?.env && import.meta.env.VITE_API_BASE_URL) ||
      (typeof process !== "undefined" && process.env?.REACT_APP_API_BASE_URL) ||
      "";

    return [fromEnv, sameOrigin, FALLBACK]
      .map((s) => (s || "").replace(/\/+$/, ""))
      .filter(Boolean);
  }, []);

  async function postEmailWithFallback(path, options) {
    let last;
    for (const base of apiBases) {
      try {
        last = await safeFetchJson(`${base}${path}`, options);
        if (last?.ok) return last;
        // 404 yoki CORS bo'lsa keyingisini sinaymiz
      } catch (e) {
        // keyingisini sinaymiz
      }
    }
    return last || { ok: false, status: 0, data: "no-endpoint" };
  }

  useEffect(() => {
    if (mountedRef.current) return; // StrictMode double-run guard
    mountedRef.current = true;

    // 1) Eng so‘nggi bronni sessiyadan o‘qiymiz
    let latest = null;
    try {
      const all = JSON.parse(sessionStorage.getItem("allBookings") || "[]");
      latest = all?.[0] || null;
    } catch {
      latest = null;
    }
    if (!latest) return;

    const {
      firstName,
      lastName,
      phone,
      email,
      checkIn,
      checkOutTime,
      rooms,
      duration,
      price,
      createdAt,
      id, // bo'lsa zo'r
    } = latest;

    // 2) Idempotency uchun yagona imzo
    const uniq = {
      id: id || null,
      email: email || null,
      price: price || null,
      createdAt: createdAt || null,
      checkIn: checkIn || null,
      room: rooms || null,
      name: `${firstName || ""} ${lastName || ""}`.trim(),
      phone: phone || null,
    };

    // 3) Telegram (xohlasa) — bu qismi o'zgarmagan
    const telegramText = `
📢 Yangi bron qabul qilindi

👤 Ism: ${firstName || "-"} ${lastName || ""}
📧 Email: ${email || "-"}
📞 Telefon: ${phone || "-"}

🗓️ Bron vaqti: ${formatDateTime(createdAt)}
📅 Kirish sanasi: ${formatDate(checkIn)}
⏰ Kirish vaqti: ${formatTime(checkOutTime)}
🛏️ Xona: ${roomKeyMap[rooms] || rooms || "-"}
📆 Davomiylik: ${duration || "-"}
💶 To'lov summasi: ${price ? `${price}€` : "-"}

✅ Mijoz kelganda, mavjud bo‘lgan ixtiyoriy bo‘sh xonaga joylashtiriladi
🌐 khamsahotel.uz
    `.trim();

    sendOnce({
      name: "telegram",
      uniquePayload: { ...uniq, channel: "group" },
      ttlMs: 1000 * 60 * 60 * 24 * 2,
      sender: async () => await sendTelegramMessage(telegramText),
    });

    // 4) EMAIL — success pagega kelganda jo'natamiz (bir marta)
    if (email) {
      const emailText = `
Thank you for choosing to stay with us via Khamsahotel.uz!

Please be informed that we are a SLEEP LOUNGE located inside the airport within the transit area.
To stay with us, you must have a valid boarding pass departing from Tashkent Airport.

IMPORTANT NOTE:
We will never ask you for your credit card details or send links via Khamsahotel.uz for online payments or booking confirmation.

If you have any doubts about your booking status, please check via the Khamsahotel.uz website or app only,
call us at +998 95 877 24 24 (tel/WhatsApp/Telegram), or email us at qonoqhotel@mail.ru

------------------------------
YOUR BOOKING DETAILS
------------------------------

👤Guest: ${firstName || "-"} ${lastName || ""}
📧Email: ${email}
📞Phone: ${phone || "-"}

🗓️Booking Date: ${formatDateTime(createdAt)}
📅Check-in Date: ${formatDate(checkIn)}
⏰Check-in Time: ${formatTime(checkOutTime)}
🛏️Room Type: ${roomKeyMap[rooms] || rooms || "-"}
📆Duration: ${duration || "-"}
💶Price: ${price ? `${price}€` : "-"}

Thank you for your reservation. We look forward to welcoming you!
- Khamsa Sleep Lounge Team
      `.trim();

      const idemKey = fastHash(
        stableStringify({
          to: email,
          subject: "Your Booking Confirmation – Khamsahotel.uz",
          createdAt: createdAt || null,
          checkIn: checkIn || null,
          price: price || null,
          id: id || null,
        })
      );

      sendOnce({
        name: "email",
        uniquePayload: {
          ...uniq,
          to: email,
          subject: "Your Booking Confirmation – Khamsahotel.uz",
        },
        ttlMs: 1000 * 60 * 60 * 24 * 2,
        sender: () =>
          withRetry(
            () =>
              postEmailWithFallback("/send-email", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Idempotency-Key": idemKey,
                },
                body: JSON.stringify({
                  to: email,
                  subject: "Your Booking Confirmation – Khamsahotel.uz",
                  text: emailText,
                  idempotencyKey: idemKey,
                }),
              }),
            { tries: 3, baseDelay: 500 }
          ),
      }).then((r) => {
        if (!r?.ok && !r?.skipped) {
          console.error("send-email failed:", r);
        }
      });
    }
  }, [PRIMARY_API_BASE]); // PRIMARY_API_BASE o'zgarsa ham qayta jo'natilmaydi (mounted guard bor)

  return (
    <div className="payment-success-container">
      <div className="success-icon" role="img" aria-label="Success checkmark">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="72"
          height="72"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#27ae60"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="feather feather-check-circle"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M9 12l2 2 4-4" />
        </svg>
      </div>
      <h1>To‘lov muvaffaqiyatli bajarildi!</h1>
      <p className="message">
        Rahmat! Buyurtmangiz qabul qilindi. Tasdiqnoma email orqali yuborildi.
      </p>
      <a className="back-home" href="/">
        Bosh sahifaga qaytish
      </a>
    </div>
  );
};

export default PaymentSuccess;
