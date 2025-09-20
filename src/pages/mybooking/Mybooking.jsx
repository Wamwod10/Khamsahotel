import React, { useState, useEffect } from "react";
import "./mybooking.scss";
import BookingCard from "./components/BookingCard/BookingCard";
import EditBookingModal from "./components/Edit/EditBookingModal";
import { v4 as uuidv4 } from "uuid";

const MyBooking = () => {
  const [bookings, setBookings] = useState([]);
  const [editingBooking, setEditingBooking] = useState(null);
  const [isEditOpen, setIsEditOpen] = useState(false);

  useEffect(() => {
    const savedBookings = JSON.parse(sessionStorage.getItem("allBookings")) || [];

    const normalizedBookings = savedBookings.map((b) => ({
      ...b,
      id: b.id || uuidv4(),
    }));

    setBookings(normalizedBookings);
    sessionStorage.setItem("allBookings", JSON.stringify(normalizedBookings));
  }, []);

  const saveBookingsToStorage = (updatedList) => {
    sessionStorage.setItem("allBookings", JSON.stringify(updatedList));
    localStorage.setItem("allBookings", JSON.stringify(updatedList));
  };

  const handleEditBooking = (booking) => {
    setEditingBooking(booking);
    setIsEditOpen(true);
  };

  const handleSaveBooking = (updatedBooking) => {
    const updatedList = bookings.map((b) =>
      b.id === editingBooking.id ? { ...updatedBooking, id: b.id } : b
    );
    setBookings(updatedList);
    saveBookingsToStorage(updatedList);
    setIsEditOpen(false);
  };

  const handleDeleteBooking = (id) => {
    const filtered = bookings.filter((b) => b.id !== id);
    setBookings(filtered);
    saveBookingsToStorage(filtered);
  };

  const totalAmount = bookings.reduce((sum, b) => sum + (b.price || 0), 0);

  const handlePayment = async () => {
    if (totalAmount === 0) {
      alert("To‘lov uchun summa mavjud emas");
      return;
    }

    const latestBooking = bookings[0];
    if (!latestBooking || !latestBooking.email) {
      alert("Email ma'lumotlari mavjud emas");
      return;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/create-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: totalAmount,
          description: `Booking Payment for ${latestBooking.firstName} ${latestBooking.lastName}`,
          email: latestBooking.email,
        }),
      });

      let data = {};
      try {
        const text = await response.text();
        data = text ? JSON.parse(text) : {};
      } catch (parseError) {
        alert("Serverdan noto'g'ri javob keldi");
        return;
      }

      if (response.ok && data.paymentUrl) {
        window.location.href = data.paymentUrl;
      } else {
        alert(`To‘lov yaratishda xatolik: ${data.error || "Noma'lum xatolik"}`);
      }
    } catch (error) {
      alert(`To‘lov yaratishda xatolik yuz berdi: ${error.message || error}`);
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
            <button
              className="btn btn-pay"
              onClick={handlePayment}
              disabled={totalAmount === 0}
            >
              Pay Now ({totalAmount > 0 ? `${totalAmount.toLocaleString()}€` : "No amount"})
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
