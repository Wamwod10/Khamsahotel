import React, { useEffect, useMemo, useState } from "react";
import "./mybooking.scss";
import BookingCard from "./components/BookingCard/BookingCard";
import EditBookingModal from "./components/Edit/EditBookingModal";
import { v4 as uuidv4 } from "uuid";
import { useTranslation } from "react-i18next";

/** API bazasi (Vite/CRA) */
function getApiBase() {
  const viteBase =
    (import.meta?.env && import.meta.env.VITE_API_BASE_URL) || "";
  const craBase =
    (typeof process !== "undefined" && process?.env?.REACT_APP_API_BASE_URL) ||
    "";
  const fallback =
    (typeof window !== "undefined" && window.location.origin) || "";
  return (viteBase || craBase || fallback).replace(/\/+$/, "");
}

/** Timeout bilan fetch */
async function fetchWithTimeout(url, options = {}, ms = 15000) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(t);
  }
}

/** Duration → key */
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

const MyBooking = () => {
  const [bookings, setBookings] = useState([]);
  const [editingBooking, setEditingBooking] = useState(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [paying, setPaying] = useState(false);
  const API_BASE = useMemo(getApiBase, []);

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
      price:
        typeof b.price === "string"
          ? Number(
              String(b.price)
                .replace(/[^\d.,-]/g, "")
                .replace(",", ".")
            ) || 0
          : Number(b.price) || 0,
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
      b.id === editingBooking.id ? { ...updatedBooking, id: b.id } : b
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

  /** Pay Now → Octo create-payment (oxirgi booking ma’lumoti bilan) */
  const handlePayment = async () => {
    if (!API_BASE) {
      alert(
        "API manzili topilmadi. .env dagi VITE_API_BASE_URL/REACT_APP_API_BASE_URL ni tekshiring."
      );
      return;
    }
    if (totalAmount <= 0) {
      alert("To‘lov uchun summa mavjud emas");
      return;
    }
    const latestBooking = bookings[0];
    if (!latestBooking?.email) {
      alert("Email maʼlumoti mavjud emas");
      return;
    }

    setPaying(true);
    try {
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

      const res = await fetchWithTimeout(`${API_BASE}/create-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
        window.location.href = data.paymentUrl;
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
        err?.name === "AbortError"
          ? "Server javob bermadi (timeout)"
          : err?.message || String(err);
      alert(`To‘lov yaratishda xatolik yuz berdi: ${text}`);
      console.error("fetch failure:", err);
    } finally {
      setPaying(false);
    }
  };

  const addNewBooking = () => (window.location.href = "/");

  const { t } = useTranslation();

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

          <div className="my-booking-buttons">
            <button
              className="btn btn-pay"
              onClick={handlePayment}
              disabled={totalAmount <= 0 || paying}
              aria-busy={paying ? "true" : "false"}
            >
              {paying
                ? "Processing..."
                : `Pay Now (${
                    totalAmount > 0
                      ? `${totalAmount.toLocaleString()}€`
                      : "No amount"
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
