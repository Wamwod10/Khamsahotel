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
    // SessionStorage dan allBookings ni o‘qiymiz
    const savedBookings = JSON.parse(sessionStorage.getItem("allBookings")) || [];

    // SessionStorage dan bookingInfo ni ham o‘qiymiz (oxirgi qo‘shilgan booking)
    const bookingInfo = JSON.parse(sessionStorage.getItem("bookingInfo"));

    // Agar bookingInfo mavjud bo‘lsa va allBookings ichida yo‘q bo‘lsa, uni qo‘shamiz
    let updatedBookings = [...savedBookings];
    if (bookingInfo) {
      // Agar bookingInfo da id bo‘lmasa, hozir yaratamiz
      if (!bookingInfo.id) {
        bookingInfo.id = Date.now();
      }

      const exists = savedBookings.some((b) => b.id === bookingInfo.id);
      if (!exists) {
        updatedBookings.push(bookingInfo);
      }
    }

    setBookings(updatedBookings);
  }, []);

  // Saqlash funksiyasi (har safar bookinglar o‘zgarganda chaqiriladi)
  const saveBookingsToStorage = (bookingsArray) => {
    sessionStorage.setItem("allBookings", JSON.stringify(bookingsArray));
  };

  // Yangi booking qo‘shish sahifasiga yo‘naltirish
  const addNewBooking = () => {
    window.location.href = "/";
  };

  // Tahrirlash modalini ochish
  const handleEditBooking = (booking) => {
    setEditingBooking(booking);
    setIsEditOpen(true);
  };

  // Tahrirlangan bookingni saqlash
  const handleSaveBooking = (updatedBooking) => {
    const updatedList = bookings.map((b) =>
      b.id === editingBooking.id ? { ...updatedBooking, id: b.id } : b
    );
    setBookings(updatedList);
    saveBookingsToStorage(updatedList);
    setIsEditOpen(false);
  };

  // Bookingni o‘chirish
  const handleDeleteBooking = (booking) => {
    const filtered = bookings.filter((b) => b.id !== booking.id);
    setBookings(filtered);
    saveBookingsToStorage(filtered);
  };

  return (
    <div className="my-booking-container">
      <button className="btn-add" onClick={addNewBooking}>
        Add a New Booking
      </button>

      {bookings.length === 0 ? (
        <div className="my-booking-empty">
          <p>No bookings yet.</p>
        </div>
      ) : (
        bookings.map((booking) => (
          <BookingCard
            key={booking.id}
            booking={booking}
            onEdit={() => handleEditBooking(booking)}
            onDelete={() => handleDeleteBooking(booking)}
          />
        ))
      )}

      <div className="my-booking-buttons">
        <button className="btn-pay" onClick={() => setIsPaymentOpen(true)}>
          Pay Now
        </button>
      </div>

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
