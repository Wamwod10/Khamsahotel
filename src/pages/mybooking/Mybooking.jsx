import React, { useState, useEffect } from "react";
import "./mybooking.scss";
import BookingCard from "./components/BookingCard/BookingCard";
import EditBookingModal from "./components/Edit/EditBookingModal";

const MyBooking = () => {
  const [bookings, setBookings] = useState([]);
  const [editingBooking, setEditingBooking] = useState(null);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const API_BASE = import.meta.env.VITE_API_BASE_URL;

  useEffect(() => {
    const savedBookings =
      JSON.parse(sessionStorage.getItem("allBookings")) || [];
    const roomModalData = JSON.parse(localStorage.getItem("bookingInfo"));
    let updatedBookings = [];

    if (roomModalData && roomModalData.firstName) {
      if (!roomModalData.id) roomModalData.id = Date.now();
      if (roomModalData.checkOutTime && !roomModalData.checkOut) {
        roomModalData.checkOut = roomModalData.checkOutTime;
      }
      const filteredBookings = savedBookings.filter(
        (b) => b.id !== roomModalData.id
      );
      updatedBookings = [roomModalData, ...filteredBookings];
      localStorage.removeItem("bookingInfo");
      sessionStorage.setItem("allBookings", JSON.stringify(updatedBookings));
    } else {
      updatedBookings = savedBookings;
    }

    setBookings(updatedBookings);
  }, []);

  const saveBookingsToStorage = (arr) => {
    sessionStorage.setItem("allBookings", JSON.stringify(arr));
  };

  const addNewBooking = () => {
    window.location.href = "/";
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

    const email = bookings[0]?.email;
    if (!email) {
      alert("Iltimos, email manzilingizni kiriting");
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/create-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: totalAmount,
          description: "Hotel to'lovi",
          email,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server xatosi: ${response.status}`);
      }

      const data = await response.json();

      if (data.paymentUrl) {
        window.location.href = data.paymentUrl;
      } else {
        alert("To‘lov yaratilmadi: " + (data.error || "Noma’lum xato"));
      }
    } catch (error) {
      alert("Xatolik: " + error.message);
    }
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
              Pay Now (
              {totalAmount > 0
                ? totalAmount.toLocaleString() + "€"
                : "No amount"}
              )
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
