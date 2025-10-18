// src/pages/mybooking/MyBooking.jsx
import React, { useEffect, useMemo, useState } from "react";
import "./mybooking.scss";
import BookingCard from "./components/BookingCard/BookingCard";
import EditBookingModal from "./components/Edit/EditBookingModal";
import { v4 as uuidv4 } from "uuid";
import { useTranslation } from "react-i18next";

/* ===================== Helpers ===================== */

/** API bazasi — faqat .env dan (VITE_API_BASE_URL).
 *  Masalan: https://khamsa-backend.onrender.com
 */
function getApiBase() {
  const viteBase = import.meta?.env?.VITE_API_BASE_URL || "";
  if (!viteBase) {
    console.error("VITE_API_BASE_URL yo‘q! .env’da backend URL ni qo‘ying.");
  }
  return String(viteBase).replace(/\/+$/, "");
}

/** Duration → key (UI label uchun) */
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

/** Code → label (faqat description uchun) */
function roomCodeToLabel(code) {
  const c = String(code || "").toUpperCase();
  if (c === "STANDARD") return "Standard Room";
  if (c === "FAMILY") return "Family Room";
  return "-";
}

/** Narxni son qilib normalize qilish */
function normalizePrice(p) {
  if (typeof p === "number") return Number.isFinite(p) ? p : 0;
  if (typeof p === "string") {
    const n = Number(p.replace(/[^\d.,-]/g, "").replace(",", "."));
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

/* ===================== Component ===================== */
const MyBooking = () => {
  const [bookings, setBookings] = useState([]);
  const [editingBooking, setEditingBooking] = useState(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [paying, setPaying] = useState(false);

  const API_BASE = useMemo(getApiBase, []);
  const { t } = useTranslation();

  // Load from sessionStorage/localStorage
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
      rooms: toRoomCode(b.rooms), // "STANDARD" | "FAMILY"
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

  /** Pay Now → Octo create-payment (oxirgi qo‘shilgan booking bilan) */
  const handlePayment = async () => {
    if (!API_BASE) {
      alert(
        "API manzili topilmadi. VITE_API_BASE_URL ni .env’da belgilang (https)."
      );
      return;
    }
    if (totalAmount <= 0) {
      alert("To‘lov uchun summa mavjud emas");
      return;
    }
    const latestBooking = [...bookings]
      .sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0))
      .at(-1); // oxirgi
    if (!latestBooking?.email) {
      alert("Email maʼlumoti mavjud emas");
      return;
    }

    if (paying) return;
    setPaying(true);

    try {
      // ixtiyoriy health check (tarmoq/CORS tez tekshiruv)
      try {
        await fetch(`${API_BASE}/healthz`, { cache: "no-store" });
      } catch {}

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
          rooms: latestBooking.rooms, // "STANDARD" | "FAMILY"
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
        headers: { "Content-Type": "application/json" },
        // MUHIM: frontendda AbortController yo‘q — timeout backendda qilinadi
        body: JSON.stringify(body),
      });

      const ct = (res.headers.get("content-type") || "").toLowerCase();
      const data = ct.includes("application/json")
        ? await res.json()
        : await res.text().then((t) => {
            try {
              return JSON.parse(t);
            } catch {
              return t;
            }
          });

      if (res.ok && data && typeof data === "object" && data.paymentUrl) {
        window.location.href = data.paymentUrl; // Octo sahifasiga yo‘naltirish
        return;
      }

      const msg =
        (data && typeof data === "object" && (data.error || data.message)) ||
        (typeof data === "string" && data.slice(0, 300)) ||
        `Xatolik (status ${res.status})`;
      alert(`To‘lov yaratishda xatolik: ${msg}`);
      console.error("create-payment error:", { status: res.status, data });
    } catch (err) {
      const text =
        err?.name === "TypeError"
          ? "Tarmoq yoki CORS xatosi (HTTPS va domenlarni tekshiring)"
          : err?.message || String(err);
      alert(`To‘lov yaratishda xatolik yuz berdi: ${text}`);
      console.error("fetch failure:", err);
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
