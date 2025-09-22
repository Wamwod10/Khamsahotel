import React, { useState, useEffect, useMemo } from "react";
import "./mybooking.scss";
import BookingCard from "./components/BookingCard/BookingCard";
import EditBookingModal from "./components/Edit/EditBookingModal";
import { v4 as uuidv4 } from "uuid";

/** API bazasini aniqlash — Vite/Cra uchun */
function getApiBase() {
  const env =
    (import.meta?.env && import.meta.env.VITE_API_BASE_URL) ||
    process.env?.REACT_APP_API_BASE_URL ||
    "";
  // trailing slash yo'q
  const cleaned = (env || "").replace(/\/+$/, "");
  // hech narsa bo'lmasa — shu domen
  return cleaned || window.location.origin;
}

/** JSON bo'lmasa ham xatoni to'g'ri qaytarish */
async function safeFetchJson(input, init) {
  const res = await fetch(input, init);
  const ct = res.headers.get("content-type") || "";
  let data;
  try {
    data = ct.includes("application/json") ? await res.json() : await res.text();
  } catch (e) {
    data = await res.text().catch(() => "");
  }
  return { ok: res.ok, status: res.status, data };
}

const MyBooking = () => {
  const [bookings, setBookings] = useState([]);
  const [editingBooking, setEditingBooking] = useState(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const API_BASE = useMemo(getApiBase, []);

  useEffect(() => {
    const saved = JSON.parse(sessionStorage.getItem("allBookings") || "[]");

    const normalized = saved.map((b) => ({
      id: b.id || uuidv4(),
      ...b,
      // number bo'lishi uchun
      price: typeof b.price === "string" ? Number(b.price) || 0 : (b.price || 0),
    }));

    setBookings(normalized);
    sessionStorage.setItem("allBookings", JSON.stringify(normalized));
    // Tezkor kirish uchun localStorage ham yangilanadi
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
      alert("API manzili topilmadi. Iltimos .env dagi VITE_API_BASE_URL ni tekshiring.");
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

    try {
      const { ok, status, data } = await safeFetchJson(`${API_BASE}/create-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Math.round(totalAmount * 100) / 100,
          description: `Booking Payment for ${latestBooking.firstName || ""} ${latestBooking.lastName || ""}`.trim(),
          email: latestBooking.email,
        }),
      });

      if (ok && data && typeof data === "object" && data.paymentUrl) {
        window.location.href = data.paymentUrl;
      } else {
        const msg =
          (data && data.error) ||
          (typeof data === "string" && data.slice(0, 300)) ||
          `Xatolik (status ${status})`;
        alert(`To‘lov yaratishda xatolik: ${msg}`);
        console.error("create-payment error:", { status, data });
      }
    } catch (err) {
      alert(`To‘lov yaratishda xatolik yuz berdi: ${err?.message || String(err)}`);
      console.error(err);
    }
  };

  const addNewBooking = () => {
    window.location.href = "/";
  };

  return (
    <div className="my-booking-container">
      <div className="booking-header">
        <h1>My Bookings</h1>
        <button className="btn btn-add" onClick={addNewBooking}>
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
            <button className="btn btn-pay" onClick={handlePayment} disabled={totalAmount <= 0}>
              {`Pay Now (${totalAmount > 0 ? `${totalAmount.toLocaleString()}€` : "No amount"})`}
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
