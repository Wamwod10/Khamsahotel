import React, { useState, useEffect, useMemo } from "react";
import "./mybooking.scss";
import BookingCard from "./components/BookingCard/BookingCard";
import EditBookingModal from "./components/Edit/EditBookingModal";
import { v4 as uuidv4 } from "uuid";

/** API bazasini aniqlash — Vite/CRA/prod uchun */
function getApiBase() {
  // 1) Vite
  const vite = import.meta?.env?.VITE_API_BASE_URL;
  // 2) CRA
  const cra = process.env?.REACT_APP_API_BASE_URL;
  // 3) fallback: shu domen (agar backend shu domen ostida proksi qilingan bo'lsa)
  const fallback = window.location.origin;

  const pick = (vite || cra || fallback || "").replace(/\/+$/, "");
  return pick;
}

/** JSON bo'lmasa ham xatoni to'g'ri qaytarish */
async function safeFetchJson(input, init) {
  const res = await fetch(input, init);
  const ct = (res.headers.get("content-type") || "").toLowerCase();
  let data;
  try {
    if (ct.includes("application/json")) data = await res.json();
    else {
      const text = await res.text();
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
    }
  } catch {
    data = "";
  }
  return { ok: res.ok, status: res.status, data };
}

/** Timeout bilan fetch */
async function fetchWithTimeout(url, options = {}, ms = 15000) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(t);
  }
}

const MyBooking = () => {
  const [bookings, setBookings] = useState([]);
  const [editingBooking, setEditingBooking] = useState(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [paying, setPaying] = useState(false);
  const API_BASE = useMemo(getApiBase, []);

  useEffect(() => {
    const saved = JSON.parse(sessionStorage.getItem("allBookings") || "[]");

    const normalized = saved.map((b) => ({
      id: b.id || uuidv4(),
      ...b,
      // raqamga majburiy aylantirish
      price:
        typeof b.price === "string"
          ? Number(String(b.price).replace(/[^\d.,-]/g, "").replace(",", ".")) || 0
          : Number(b.price) || 0,
    }));

    setBookings(normalized);
    sessionStorage.setItem("allBookings", JSON.stringify(normalized));
    localStorage.setItem("allBookings", JSON.stringify(normalized));
  }, []);

  const saveBookingsToStorage = (updated) => {
    sessionStorage.setItem("allBookings", JSON.stringify(updated));
    localStorage.setItem("allBookings", JSON.stringify(updated));
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

  const totalAmount = bookings.reduce((sum, b) => sum + (Number(b.price) || 0), 0);

  const handlePayment = async () => {
    if (!API_BASE) {
      alert("API manzili topilmadi. Iltimos .env dagi VITE_API_BASE_URL/REACT_APP_API_BASE_URL ni tekshiring.");
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
      // 1) Cold-start ping — backend uyg'otiladi (agar uxlab bo'lsa)
      try {
        await fetch(`${API_BASE}/healthz`, { cache: "no-store" });
      } catch {
        /* ping muvaffaqiyatsiz bo'lsa ham davom etamiz */
      }

      // 2) To'lov yaratish
      const res = await fetchWithTimeout(`${API_BASE}/create-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
         amount: Number(totalAmount),// EUR, 2 decimal
          description: `Booking Payment for ${(latestBooking.firstName || "").trim()} ${(latestBooking.lastName || "").trim()}`.trim(),
          email: latestBooking.email,
        }),
      });

      const ct = (res.headers.get("content-type") || "").toLowerCase();
      const data =
        ct.includes("application/json") ? await res.json() : await res.text().then((t) => {
          try { return JSON.parse(t); } catch { return t; }
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
      // Bu yerga odatda CORS/preflight yoki network timeoutlar tushadi
      const text = err?.name === "AbortError" ? "Server javob bermadi (timeout)" : (err?.message || String(err));
      alert(`To‘lov yaratishda xatolik yuz berdi: ${text}`);
      console.error("fetch failure:", err);
    } finally {
      setPaying(false);
    }
  };

  const addNewBooking = () => {
    window.location.href = "/";
  };

  return (
    <div className="my-booking-container">
      <div className="booking-header">
        <h1>My Bookings</h1>
        <button className="btn btn-add" onClick={addNewBooking} disabled={paying}>
          + New Booking
        </button>
      </div>

      {bookings.length === 0 ? (
        <div className="my-booking-empty">
          <p>No Bookings yet</p>
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
                : `Pay Now (${totalAmount > 0 ? `${totalAmount.toLocaleString()}€` : "No amount"})`}
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
