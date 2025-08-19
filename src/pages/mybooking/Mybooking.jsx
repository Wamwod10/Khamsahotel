import React, { useState, useEffect } from "react";
import "./mybooking.scss";
import BookingCard from "./components/BookingCard/BookingCard";
import PaymentModal from "./components/PaymentModal/PaymentModal";
import EditBookingModal from "./components/Edit/EditBookingModal";

const MyBooking = () => {
  const [bookings, setBookings] = useState([]);
  const [editingBooking, setEditingBooking] = useState(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);

  useEffect(() => {
    const savedBookings = JSON.parse(sessionStorage.getItem("allBookings")) || [];
    const bookingInfo = JSON.parse(sessionStorage.getItem("bookingInfo"));
    let updatedBookings = [];

    if (bookingInfo) {
      if (!bookingInfo.id) {
        bookingInfo.id = Date.now();
      }

      // BookingInfo ni boshida joylashtiramiz va takrorlanishini oldini olamiz
      const filteredBookings = savedBookings.filter(b => b.id !== bookingInfo.id);
      updatedBookings = [bookingInfo, ...filteredBookings];

      // BookingInfo ni sessiondan olib tashlaymiz, takrorlanmasligi uchun
      sessionStorage.removeItem("bookingInfo");

      // Va yangilangan ro'yxatni sessionStorage ga saqlaymiz
      sessionStorage.setItem("allBookings", JSON.stringify(updatedBookings));
    } else {
      updatedBookings = savedBookings;
    }

    setBookings(updatedBookings);
  }, []);

  const saveBookingsToStorage = (bookingsArray) => {
    sessionStorage.setItem("allBookings", JSON.stringify(bookingsArray));
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

  const handleDeleteBooking = (booking) => {
    const filtered = bookings.filter((b) => b.id !== booking.id);
    setBookings(filtered);
    saveBookingsToStorage(filtered);
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
              onDelete={() => handleDeleteBooking(booking)}
            />
          ))}

          <div className="my-booking-buttons">
            <button
              className="btn btn-pay"
              onClick={() => setIsPaymentOpen(true)}
            >
              Pay Now
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

      <PaymentModal
        isOpen={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
      />
    </div>
  );
};

export default MyBooking;
