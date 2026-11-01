// src/pages/mybooking/MyBooking.jsx
import React, { useEffect, useMemo, useState } from "react";
import "./mybooking.scss";
import BookingCard from "./components/BookingCard/BookingCard";
import EditBookingModal from "./components/Edit/EditBookingModal";
import { v4 as uuidv4 } from "uuid";
import { useTranslation } from "react-i18next";
import { fetchRoomAvailability } from "../../utils/availability.js";
import { durationToHours, isPastHotelSlot } from "../../utils/bookingExperience.js";
import { hasOverlappingFamilyBooking } from "../../utils/familyBookingAvailability.js";

/* ===================== Helpers ===================== */

/** API bazasi — .env (VITE_API_BASE_URL) dan */
function getApiBase() {
  const isKhamsaProduction =
    typeof window !== "undefined" &&
    /(^|\.)khamsahotel\.uz$/i.test(window.location.hostname);
  if (isKhamsaProduction) return "/backend-api";

  let base = (import.meta.env.VITE_API_BASE_URL || "").trim();
  if (!base) {
    console.warn("VITE_API_BASE_URL topilmadi, /backend-api ishlatiladi.");
    base = "/backend-api";
  }
  base = base.replace(/\/+$/, "");
  if (/^https?:\/\//i.test(base)) {
    try {
      const u = new URL(base);
      if (u.protocol !== "https:" && window.location.protocol === "https:") {
        console.warn(
          "API_BASE HTTPS emas — brauzer MixedContent bloklashi mumkin."
        );
      }
    } catch {
      console.error("API_BASE noto‘g‘ri URL:", base);
    }
  } else if (!base.startsWith("/")) {
    console.error("API_BASE relative yo'l / bilan boshlanishi kerak:", base);
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

function summarizeRooms(items) {
  const counts = items.reduce((acc, item) => {
    const code = toRoomCode(item.rooms);
    if (!code) return acc;
    acc[code] = (acc[code] || 0) + 1;
    return acc;
  }, {});

  return Object.entries(counts)
    .map(([code, count]) => `${roomCodeToLabel(code)} ${count}x`)
    .join(" + ");
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
      saved = JSON.parse(sessionStorage.getItem("allBookings") || localStorage.getItem("allBookings") || "[]");
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

  const handleSaveBooking = async (updatedBooking) => {
    if (!editingBooking) throw new Error(t("bookingInvalidSelection"));
    const hours = durationToHours(updatedBooking.duration);
    const rooms = toRoomCode(updatedBooking.rooms);
    const duration = hours === 3 ? "Up to 3 hours" : hours === 10 ? "Up to 10 hours" : hours === 24 ? "One day" : null;
    const tariff = { STANDARD: {3:45,10:70,24:115}, FAMILY: {3:80,10:115,24:175} };
    const price = tariff[rooms]?.[hours];
    if (!duration || !price || !updatedBooking.checkIn || !updatedBooking.checkOutTime) throw new Error(t("bookingInvalidSelection"));
    if (isPastHotelSlot(updatedBooking.checkIn, updatedBooking.checkOutTime)) throw new Error(t("bookingPastTime"));
    const next = { ...editingBooking, ...updatedBooking, duration, rooms, price, guests: rooms === "FAMILY" ? 3 : 1 };
    if (hasOverlappingFamilyBooking(bookings.filter(b => b.id !== editingBooking.id), next)) throw new Error(t("familyAlreadySelected"));
    const availability = await fetchRoomAvailability({
      apiBase: API_BASE, checkIn: next.checkIn, checkInTime: next.checkOutTime,
      duration: next.duration, roomType: next.rooms,
    });
    if (!availability.ok || !availability.availabilityKnown) throw new Error(t("availabilityUnknown"));
    if (!availability.available || availability.availableCount <= 0) throw new Error(t("roomNotAvailable"));
    const updated = bookings.map((b) => b.id === editingBooking.id ? next : b);
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
    const payerBooking = bookings.find((b) => b?.email) || bookings[0];
    if (!payerBooking?.email) {
      alert("Email maʼlumoti mavjud emas.");
      return;
    }
    if (paying) return;
    setPaying(true);

    try {
      await quickHealth(); // diagnostika uchun, xato bo‘lsa ham davom etadi

      const paymentItems = bookings.map((booking) => ({
        checkIn: booking.checkIn,
        checkOutTime: booking.checkOutTime,
        duration: booking.duration,
        rooms: booking.rooms,
        guests: booking.guests,
        firstName: booking.firstName,
        lastName: booking.lastName,
        phone: booking.phone,
        email: booking.email,
        price: Number(booking.price) || 0,
      }));

      const durationKey = normalizeDuration(payerBooking.duration);
      const roomSummary = summarizeRooms(paymentItems);
      const body = {
        amount: Number(totalAmount), // EUR
        description: `Booking Payment (${
          roomSummary || roomCodeToLabel(payerBooking.rooms)
        } / ${durationKey || payerBooking.duration || ""})`,
        email: payerBooking.email,
        booking: {
          checkIn: payerBooking.checkIn,
          checkOutTime: payerBooking.checkOutTime,
          duration: payerBooking.duration,
          rooms: payerBooking.rooms,
          guests: payerBooking.guests,
          firstName: payerBooking.firstName,
          lastName: payerBooking.lastName,
          phone: payerBooking.phone,
          email: payerBooking.email,
          price: Number(totalAmount),
          items: paymentItems,
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
          ? "Backend serverga ulanish yopildi. Sayt /backend-api proxy orqali qayta deploy qilinganini va Render backend ishlayotganini tekshiring."
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
        <h1>{t("mybookings")} <small style={{ fontSize: "0.72rem", fontWeight: 400, color: "#858585", whiteSpace: "nowrap" }}>· {t("bookingStepPayment")}</small></h1>
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

          <p className="my-booking-requirement">{t("bookingTransitRequirement")}</p>
          <div className="my-booking-buttons">
            <button
              className="btn btn-pay"
              onClick={handlePayment}
              disabled={totalAmount <= 0 || paying}
              aria-busy={paying ? "true" : "false"}
            >
              {paying
                ? "Processing..."
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
