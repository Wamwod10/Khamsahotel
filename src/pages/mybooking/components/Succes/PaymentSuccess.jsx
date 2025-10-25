// src/pages/mybooking/Succes/PaymentSuccess.jsx
import React, { useEffect, useMemo, useRef } from "react";
import "./PaymentSuccess.scss";

/* ===================== Common helpers ===================== */

/** API bazasi (email backend uchun — ixtiyoriy) */
function getApiBase() {
  const env =
    (import.meta?.env && import.meta.env.VITE_API_BASE_URL) ||
    (typeof process !== "undefined" && process.env?.REACT_APP_API_BASE_URL) ||
    "";
  const fallback = "https://khamsa-backend.onrender.com";
  return (env || fallback).replace(/\/+$/, "");
}

/** JSON bo'lmasa ham xatoni to'g'ri qaytarish */
async function safeFetchJson(input, init) {
  const res = await fetch(input, init);
  const ct = (res.headers.get("content-type") || "").toLowerCase();
  let data;
  try {
    data = ct.includes("application/json")
      ? await res.json()
      : await res.text();
  } catch {
    try {
      data = await res.text();
    } catch {
      data = "";
    }
  }
  return { ok: res.ok, status: res.status, data };
}

/** Tez hash (idempotency key uchun) */
function fastHash(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = (h * 33) ^ str.charCodeAt(i);
  return (h >>> 0).toString(36);
}

/** Barqaror stringify */
function stableStringify(obj) {
  if (obj === null || typeof obj !== "object") return JSON.stringify(obj);
  if (Array.isArray(obj)) return `[${obj.map(stableStringify).join(",")}]`;
  const keys = Object.keys(obj).sort();
  return `{${keys
    .map((k) => JSON.stringify(k) + ":" + stableStringify(obj[k]))
    .join(",")}}`;
}

/** localStorage TTL lock (dedup) */
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

/** Bir marta yuborish yordamchisi */
async function sendOnce({ name, uniquePayload, sender, ttlMs }) {
  const sig = fastHash(stableStringify(uniquePayload));
  if (hasValidLock(name, sig))
    return { ok: true, skipped: true, reason: "dedup-lock" };
  const res = await sender();
  if (res?.ok) setLock(name, sig, ttlMs);
  return res;
}

/** Retry wrapper */
async function withRetry(fn, { tries = 3, baseDelay = 500 } = {}) {
  let last;
  for (let i = 0; i < tries; i++) {
    try {
      last = await fn();
      if (last?.ok) return last;
    } catch (e) {
      last = { ok: false, error: e?.message || String(e) };
    }
    await new Promise((r) => setTimeout(r, baseDelay * Math.pow(2, i)));
  }
  return last;
}

/* ===================== TELEGRAM (frontenddan) ===================== */
const TELEGRAM_BOT_TOKEN =
  (import.meta?.env && import.meta.env.VITE_TG_BOT_TOKEN) || "";
const TELEGRAM_CHAT_ID =
  (import.meta?.env && import.meta.env.VITE_TG_CHAT_ID) || "";

/** HTML qochirish (Telegram parse_mode=HTML uchun) */
function esc(s = "") {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

async function sendTelegramMessage(text) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.error(
      "❌ Telegram sozlanmagan: VITE_TG_BOT_TOKEN yoki VITE_TG_CHAT_ID yo‘q"
    );
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
      console.error("❌ Telegram sendMessage error:", data);
      return { ok: false, status: res.status, data };
    }
    return { ok: true, data };
  } catch (e) {
    console.error("❌ Telegram sendMessage failed:", e);
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

function formatDate(isoDate) {
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
  if (isNaN(d.getTime())) return "-";
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

/* ===================== Component ===================== */
const PaymentSuccess = () => {
  const API_BASE = useMemo(getApiBase, []);
  const sentRef = useRef(false);

  useEffect(() => {
    if (sentRef.current) return;
    sentRef.current = true;

    // 1) Sessiyadan eng so‘nggi bronni olish (bir nechta kalitga fallback)
    let latest = null;
    try {
      const all = JSON.parse(sessionStorage.getItem("allBookings") || "[]");
      // Oxirgi qo‘shilgan bronni olish xavfsizroq:
      latest = Array.isArray(all) && all.length ? all[all.length - 1] : null;
    } catch {}
    if (!latest) {
      try {
        latest = JSON.parse(sessionStorage.getItem("lastBooking") || "null");
      } catch {}
    }

    // 2) Maydonga ajratib olish
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
      id,
    } = latest || {};

    // 3) Idem bazasi
    const uniq = {
      id: id || null,
      email: email || null,
      price: price || null,
      createdAt: createdAt || null,
      checkIn: checkIn || null,
      room: rooms || null,
      name: `${firstName || ""} ${lastName || ""}`.trim(),
      phone: phone || null,
      ts: new Date().toISOString(),
    };

    // 4) Xabar matni — bron bo‘lsa to‘liq, bo‘lmasa fallback
    let telegramText;
    if (latest) {
      telegramText = [
        "📢 <b>Yangi bron qabul qilindi</b>",
        "",
        `👤 <b>Ism:</b> ${esc(firstName || "-")} ${esc(lastName || "")}`,
        `📧 <b>Email:</b> ${esc(email || "-")}`,
        `📞 <b>Telefon:</b> ${esc(phone || "-")}`,
        "",
        `🗓️ <b>Bron vaqti:</b> ${esc(formatDateTime(createdAt))}`,
        `📅 <b>Kirish sanasi:</b> ${esc(formatDate(checkIn))}`,
        `⏰ <b>Kirish vaqti:</b> ${esc(formatTime(checkOutTime))}`,
        `🛏️ <b>Xona:</b> ${esc(roomKeyMap[rooms] || rooms || "-")}`,
        `📆 <b>Davomiylik:</b> ${esc(duration || "-")}`,
        `💶 <b>Narx:</b> ${esc(price ? `${price}€` : "-")}`,
        "",
        `✅ <b> Mijoz kelganda, mavjud bo‘lgan ixtiyoriy bo‘sh xonaga joylashtiriladi</b>`
        `🌐 <b>Sayt:</b> khamsahotel.uz`,
      ].join("\n");
    } 
    

    // 5) Telegram — dedup + retry
    sendOnce({
      name: "telegram",
      uniquePayload: {
        ...uniq,
        channel: "group",
        path: window.location.pathname,
      },
      ttlMs: 1000 * 60 * 60 * 24 * 2,
      sender: () =>
        withRetry(() => sendTelegramMessage(telegramText), {
          tries: 3,
          baseDelay: 700,
        }),
    }).then((r) => {
      if (r?.skipped) {
        console.log("ℹ️ Telegram skipped (dedup).", r);
      } else if (r?.ok) {
        console.log("✅ Telegram yuborildi.", r);
      } else {
        console.error("❌ Telegram yuborishda muammo:", r);
      }
    });

    // 6) (Ixtiyoriy) Email yuborish backend orqali — faqat email bo‘lsa
    if (latest?.email) {
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
          to: latest.email,
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
          to: latest.email,
          subject: "Your Booking Confirmation – Khamsahotel.uz",
        },
        ttlMs: 1000 * 60 * 60 * 24 * 2,
        sender: () =>
          withRetry(
            () =>
              safeFetchJson(`${API_BASE}/send-email`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Idempotency-Key": idemKey,
                },
                body: JSON.stringify({
                  to: latest.email,
                  subject: "Your Booking Confirmation – Khamsahotel.uz",
                  text: emailText,
                  idempotencyKey: idemKey,
                }),
              }),
            { tries: 3, baseDelay: 600 }
          ),
      }).then((r) => {
        if (!r?.ok && !r?.skipped) console.error("❌ send-email error:", r);
        else console.log("ℹ️ send-email result:", r);
      });
    }
  }, [API_BASE]);

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
