// src/pages/mybooking/MyBooking.jsx
import React, { useEffect, useMemo, useState } from "react";
import "./mybooking.scss";
import BookingCard from "./components/BookingCard/BookingCard";
import EditBookingModal from "./components/Edit/EditBookingModal";
import { v4 as uuidv4 } from "uuid";
import { useTranslation } from "react-i18next";

/* ===================== Helpers ===================== */

/** API bazasi — .env (VITE_API_BASE_URL) dan, HTTPS majburiy */
function getApiBase() {
  let base = (import.meta?.env?.VITE_API_BASE_URL || "").trim();
  if (!base) {
    console.error("VITE_API_BASE_URL topilmadi! .env faylini tekshiring.");
    base = "https://khamsa-backend.onrender.com";
  }
  base = base.replace(/\/+$/, "");
  try {
    const u = new URL(base);
    if (u.protocol !== "https:") {
      console.warn(
        "API_BASE HTTPS emas — brauzer CORS/MixedContent bloklashi mumkin."
      );
    }
  } catch {
    console.error("API_BASE noto‘g‘ri URL:", base);
  }
  return base;
}

/** Duration → key (label uchun) */
function normalizeDuration(duration) {
  if (!duration || typeof duration !== "string") return "";
  const d = duration.toLowerCase();
  if (
    d.includes("3") &&
    (d.includes("hour") || d.includes("soat") || d.includes("saat"))
  )
    return "upTo3Hours";
  if (
    d.includes("10") &&
    (d.includes("hour") || d.includes("soat") || d.includes("saat"))
  )
    return "upTo10Hours";
  if (
    (d.includes("1") || d.includes("bir")) &&
    (d.includes("day") || d.includes("kun") || d.includes("день"))
  )
    return "oneDay";
  return "";
}

/** Label/code → code */
function toRoomCode(v) {
  const s = String(v || "").toLowerCase();
  if (s.includes("family")) return "FAMILY";
  if (s.includes("standard")) return "STANDARD";
  if (s === "family") return "FAMILY";
  if (s === "standard") return "STANDARD";
  return "";
}

/** Code → label (faqat description) */
function roomCodeToLabel(code) {
  const c = String(code || "").toUpperCase();
  if (c === "STANDARD") return "Standard Room";
  if (c === "FAMILY") return "Family Room";
  return "-";
}

/** Narxni son ko‘rinishiga keltirish */
function normalizePrice(p) {
  if (typeof p === "number") return Number.isFinite(p) ? p : 0;
  if (typeof p === "string") {
    const n = Number(p.replace(/[^\d.,-]/g, "").replace(",", "."));
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

/** JSON bo‘lmasa ham mazmuni ko‘rinadigan parse */
async function parseMaybeJson(res) {
  const ct = (res.headers.get("content-type") || "").toLowerCase();
  if (ct.includes("application/json")) {
    try {
      return await res.json();
    } catch {
      /* fallthrough */
    }
  }
  try {
    const txt = await res.text();
    try {
      return JSON.parse(txt);
    } catch {
      return { _raw: txt };
    }
  } catch {
    return null;
  }
}

/* ===================== Component ===================== */
const MyBooking = () => {
  const [bookings, setBookings] = useState([]);
  const [editingBooking, setEditingBooking] = useState(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [paying, setPaying] = useState(false);

  const API_BASE = useMemo(getApiBase, []);
  const { t } = useTranslation();

  // Sessiyadan yuklash
  useEffect(() => {
    let saved = [];
    try {
      saved = JSON.parse(sessionStorage.getItem("allBookings") || "[]");
      if (!Array.isArray(saved)) saved = [];
    } catch {
      saved = [];
    }
    const normalized = saved.map((b) => ({
      id: b.id || uuidv4(),
      ...b,
      rooms: toRoomCode(b.rooms),
      price: normalizePrice(b.price),
    }));
    setBookings(normalized);
    try {
      sessionStorage.setItem("allBookings", JSON.stringify(normalized));
      localStorage.setItem("allBookings", JSON.stringify(normalized));
    } catch {}
  }, []);

  const saveBookingsToStorage = (updated) => {
    try {
      sessionStorage.setItem("allBookings", JSON.stringify(updated));
      localStorage.setItem("allBookings", JSON.stringify(updated));
    } catch {}
  };

  const handleEditBooking = (booking) => {
    setEditingBooking(booking);
    setIsEditOpen(true);
  };

  const handleSaveBooking = (updatedBooking) => {
    const updated = bookings.map((b) =>
      b.id === editingBooking.id
        ? {
            ...updatedBooking,
            id: b.id,
            price: normalizePrice(updatedBooking.price),
          }
        : b
    );
    setBookings(updated);
    saveBookingsToStorage(updated);
    setIsEditOpen(false);
  };

  const handleDeleteBooking = (id) => {
    const filtered = bookings.filter((b) => b.id !== id);
    setBookings(filtered);
    saveBookingsToStorage(filtered);
  };

  const totalAmount = bookings.reduce(
    (sum, b) => sum + (Number(b.price) || 0),
    0
  );

  /** Tarmoq/CORS tez sinov */
  async function quickHealth() {
    try {
      const r = await fetch(`${API_BASE}/healthz`, {
        mode: "cors",
        cache: "no-store",
      });
      if (!r.ok) console.warn("healthz status:", r.status);
      return true;
    } catch (e) {
      console.error("healthz fail:", e);
      return false;
    }
  }

  /** Pay Now → backend /create-payment */
  const handlePayment = async () => {
    if (!API_BASE) {
      alert(
        "API manzili topilmadi. .env faylida VITE_API_BASE_URL ni belgilang (HTTPS)."
      );
      return;
    }
    if (totalAmount <= 0) {
      alert("To‘lov uchun summa mavjud emas.");
      return;
    }
    const latestBooking = bookings.at(-1);
    if (!latestBooking?.email) {
      alert("Email maʼlumoti mavjud emas.");
      return;
    }
    if (paying) return;
    setPaying(true);

    try {
      await quickHealth(); // diagnostika uchun, xato bo‘lsa ham davom etadi

      const durationKey = normalizeDuration(latestBooking.duration);
      const body = {
        amount: Number(totalAmount), // EUR
        description: `Booking Payment (${roomCodeToLabel(
          latestBooking.rooms
        )} / ${durationKey || latestBooking.duration || ""})`,
        email: latestBooking.email,
        booking: {
          checkIn: latestBooking.checkIn,
          duration: latestBooking.duration,
          rooms: latestBooking.rooms,
          guests: latestBooking.guests,
          firstName: latestBooking.firstName,
          lastName: latestBooking.lastName,
          phone: latestBooking.phone,
          email: latestBooking.email,
          price: Number(latestBooking.price),
        },
      };

      const res = await fetch(`${API_BASE}/create-payment`, {
        method: "POST",
        mode: "cors", // ko‘rinishi uchun aniq belgilab qo‘ydik
        headers: { "Content-Type": "application/json" },
        // frontendda timeout/abort YO‘Q — backend 120s retry/timeout qiladi
        body: JSON.stringify(body),
      });

      const data = await parseMaybeJson(res);

      if (res.ok && data && typeof data === "object" && data.paymentUrl) {
        window.location.href = data.paymentUrl; // Octo sahifasiga o‘tish
        return;
      }

      // Backenddan xato qaytdi
      const msg =
        (data && typeof data === "object" && (data.error || data.message)) ||
        (data && data._raw) ||
        `Xatolik (status ${res.status})`;
      console.error("create-payment response:", { status: res.status, data });
      alert(`To‘lov yaratishda xatolik: ${msg}`);
    } catch (err) {
      // Brauzer tarmoq/CORS xatosi
      console.error("create-payment fetch error:", err);
      const guess =
        err?.name === "TypeError"
          ? "Tarmoq yoki CORS xatosi. HTTPS domenlari va CORS ruxsatlarini tekshiring."
          : err?.message || String(err);
      alert(`To‘lov yaratishda xatolik yuz berdi: ${guess}`);
    } finally {
      setPaying(false);
    }
  };

  const addNewBooking = () => (window.location.href = "/");

  return (
    <div className="my-booking-container">
      <div className="booking-header">
        <h1>{t("mybookings")}</h1>
        <button
          className="btn btn-add"
          onClick={addNewBooking}
          disabled={paying}
        >
          + {t("newbooking")}
        </button>
      </div>

      {bookings.length === 0 ? (
        <div className="my-booking-empty">
          <p>{t("nobooking")}</p>
        </div>
      ) : (
        <>
          {bookings.map((booking) => (
            <BookingCard
              key={booking.id}
              booking={booking}
              onEdit={() => handleEditBooking(booking)}
              onDelete={() => handleDeleteBooking(booking.id)}
            />
          ))}

          <div className="my-booking-summary">
            <div className="total">
              {t("total")}:{" "}
              {totalAmount > 0 ? `${totalAmount.toLocaleString()}€` : "0€"}
            </div>
          </div>

          <div className="my-booking-buttons">
            <button
              className="btn btn-pay"
              onClick={handlePayment}
              disabled={totalAmount <= 0 || paying}
              aria-busy={paying ? "true" : "false"}
            >
              {paying
                ? t("processing") || "Processing..."
                : `${t("paynow") || "Pay Now"} (${
                    totalAmount > 0 ? `${totalAmount.toLocaleString()}€` : "0€"
                  })`}
            </button>
          </div>
        </>
      )}

      <EditBookingModal
        isOpen={isEditOpen}
        booking={editingBooking}
        onClose={() => setIsEditOpen(false)}
        onSave={handleSaveBooking}
      />
    </div>
  );
};

export default MyBooking;
