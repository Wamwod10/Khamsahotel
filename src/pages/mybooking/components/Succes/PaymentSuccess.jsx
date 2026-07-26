import React, { useEffect, useMemo, useRef } from "react";
import "./PaymentSuccess.scss";

/* ===================== Helpers ===================== */

function getApiBase() {
  const isKhamsaProduction =
    typeof window !== "undefined" &&
    /(^|\.)khamsahotel\.uz$/i.test(window.location.hostname);
  if (isKhamsaProduction) return "/backend-api";

  const env = (import.meta?.env && import.meta.env.VITE_API_BASE_URL) || "";
  const fallback = "/backend-api";
  return (env || fallback).replace(/\/+$/, "");
}

async function safeFetchJson(input, init) {
  const res = await fetch(input, init);
  const ct = (res.headers.get("content-type") || "").toLowerCase();
  let data;
  try {
    data = ct.includes("application/json")
      ? await res.json()
      : await res.text();
  } catch {
    data = "";
  }
  return { ok: res.ok, status: res.status, data };
}

function fastHash(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = (h * 33) ^ str.charCodeAt(i);
  return (h >>> 0).toString(36);
}

function stableStringify(obj) {
  if (obj === null || typeof obj !== "object") return JSON.stringify(obj);
  if (Array.isArray(obj)) return `[${obj.map(stableStringify).join(",")}]`;
  const keys = Object.keys(obj).sort();
  return `{${keys
    .map((k) => JSON.stringify(k) + ":" + stableStringify(obj[k]))
    .join(",")}}`;
}

/* ===================== UI helpers ===================== */

const roomKeyMap = {
  "Standard Room": "Standard Room",
  "Family Room": "Family Room",
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
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

/* ===================== COMPONENT ===================== */

const PaymentSuccess = () => {
  const API_BASE = useMemo(getApiBase, []);
  const sentRef = useRef(false);

  useEffect(() => {
    if (sentRef.current) return;
    sentRef.current = true;

    let latest = null;

    try {
      const all = JSON.parse(sessionStorage.getItem("allBookings") || "[]");
      latest = all.length ? all[all.length - 1] : null;
    } catch {}

    if (!latest) {
      try {
        latest = JSON.parse(sessionStorage.getItem("lastBooking") || "null");
      } catch {}
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
      id,
    } = latest;

    /* ================= EMAIL ================= */

    if (email) {
      const emailText = `
Booking confirmed!

Guest: ${firstName} ${lastName}
Phone: ${phone}
Room: ${rooms}
Check-in: ${formatDate(checkIn)}
Time: ${formatTime(checkOutTime)}
Price: ${price}€

Thank you!
`.trim();

      const payload = {
        to: email,
        subject: "Booking Confirmation – Khamsa Hotel",
        text: emailText,
      };

      const idemKey = fastHash(stableStringify(payload));

      safeFetchJson(`${API_BASE}/send-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idemKey,
        },
        body: JSON.stringify(payload),
      }).then((r) => {
        console.log("EMAIL RESULT:", r);
      });
    }
  }, [API_BASE]);

  return (
    <div className="payment-success-container">
      <div className="success-icon">✓</div>
      <h1>To‘lov muvaffaqiyatli bajarildi!</h1>
      <p>Buyurtmangiz qabul qilindi</p>
      <a href="/">Bosh sahifa</a>
    </div>
  );
};

export default PaymentSuccess;
