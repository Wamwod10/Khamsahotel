import React, { useState, useEffect } from "react";
import "./mybooking.scss";
import BookingCard from "./components/BookingCard/BookingCard";
import EditBookingModal from "./components/Edit/EditBookingModal";
import { v4 as uuidv4 } from "uuid";

// 🔗 Backend bazaviy URL
const API_BASE =
  (typeof import.meta !== "undefined" && import.meta.env && (import.meta.env.VITE_API_BASE || import.meta.env.VITE_API_BASE_URL)) ||
  window.__API_BASE__ ||
  "https://hotel-backend-bmlk.onrender.com";

const MyBooking = () => {
  const [bookings, setBookings] = useState([]);
  const [editingBooking, setEditingBooking] = useState(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // 1) sessionStorage -> allBookings
    const saved = JSON.parse(sessionStorage.getItem("allBookings")) || [];
    const normalized = saved.map((b) => ({ ...b, id: b.id || uuidv4() }));
    setBookings(normalized);
    sessionStorage.setItem("allBookings", JSON.stringify(normalized));

    // 2) Agar RoomModal oxirgi bookingni localStorage.bookingInfo ga yozgan bo'lsa — sinxronlab qo'yamiz
    try {
      const last = JSON.parse(localStorage.getItem("bookingInfo"));
      if (last && last.createdAt) {
        const exists = normalized.some((b) => b.createdAt === last.createdAt);
        if (!exists) {
          const withId = { ...last, id: uuidv4() };
          const updated = [withId, ...normalized];
          setBookings(updated);
          sessionStorage.setItem("allBookings", JSON.stringify(updated));
          localStorage.setItem("allBookings", JSON.stringify(updated));
        }
      }
    } catch {}
  }, []);

  const saveBookingsToStorage = (list) => {
    sessionStorage.setItem("allBookings", JSON.stringify(list));
    localStorage.setItem("allBookings", JSON.stringify(list));
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

  // 👉 To'lovni hozircha faqat eng so'nggi yaratilgan booking uchun qilamiz (commit ham shunga mos)
  const latestBooking = bookings[0] || null;

  const handlePayment = async () => {
    if (!latestBooking) {
      alert("Hech qanday booking topilmadi");
      return;
    }
    if (!latestBooking.price || !latestBooking.email) {
      alert("Booking uchun narx yoki email mavjud emas");
      return;
    }

    setLoading(true);
    try {
      const description = `Booking Payment for ${latestBooking.firstName} ${latestBooking.lastName}`;
      const resp = await fetch(`${API_BASE}/create-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(latestBooking.price), // EUR
          description,
          email: latestBooking.email,
        }),
      });

      const text = await resp.text();
      let data = {};
      try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }

      if (resp.ok && data?.paymentUrl) {
        // Success sahifada /api/bookings/commit qilish uchun ma'lumotlarni saqlab qo'yamiz
        const pending = {
          bookingId: latestBooking.id,
          amount: latestBooking.price,
          email: latestBooking.email,
          description,
          shop_transaction_id: data.shop_transaction_id || null,
          // commit uchun kerak bo'ladigan booking fieldlari
          commitPayload: {
            checkIn: latestBooking.checkIn,
            duration: latestBooking.duration,
            rooms: latestBooking.rooms,
            firstName: latestBooking.firstName,
            lastName: latestBooking.lastName,
            phone: latestBooking.phone,
            email: latestBooking.email,
            guests: latestBooking.guests || 1,
            price: latestBooking.price,
          },
          createdAt: new Date().toISOString(),
        };
        sessionStorage.setItem("pendingPayment", JSON.stringify(pending));
        localStorage.setItem("pendingPayment", JSON.stringify(pending)); // zaxira

        // Octobank sahifasiga yo'naltiramiz
        window.location.href = data.paymentUrl;
      } else {
        alert(`To‘lov yaratishda xatolik: ${data.error || "Noma'lum xatolik"}`);
      }
    } catch (e) {
      alert(`To‘lov yaratishda xatolik yuz berdi: ${e?.message || e}`);
    } finally {
      setLoading(false);
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
              isLatest={latestBooking && booking.id === latestBooking.id}
            />
          ))}

          <div className="my-booking-buttons">
            <button
              className="btn btn-pay"
              onClick={handlePayment}
              disabled={!latestBooking || !latestBooking.price || loading}
              title={!latestBooking ? "No booking to pay" : ""}
            >
              {loading ? "Loading..." : `Pay Now ${latestBooking?.price ? `(${latestBooking.price}€)` : ""}`}
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
