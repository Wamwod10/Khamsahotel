import React, { useState, useEffect } from "react";
import "./mybooking.scss";
import BookingCard from "./components/BookingCard/BookingCard";
import EditBookingModal from "./components/Edit/Editbookingmodal";
import PaymentModal from "./components/PaymentModal/PaymentModal";

const MyBooking = () => {
  const [bookings, setBookings] = useState([]);
  const [editingBooking, setEditingBooking] = useState(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);

  // Dastlab sessionStorage dan bookinglarni o‘qib olish
  useEffect(() => {
    const savedBookings = sessionStorage.getItem("allBookings");
    if (savedBookings) {
      setBookings(JSON.parse(savedBookings));
    }
  }, []);

  // Bookinglarni sessionStorage ga saqlash uchun yordamchi funksiya
  const saveBookingsToStorage = (bookingsArray) => {
    sessionStorage.setItem("allBookings", JSON.stringify(bookingsArray));
  };

  // Yangi booking qo‘shish
  const addNewBooking = () => {
    // Masalan, RoomModal ga redirect qilish uchun:
    window.location.href = "/"; // yoki sizning RoomModal sahifangiz manzili
  };

  // RoomModal dan kelgan yangi bookingni qo‘shish (bu funksiya RoomModal dan chaqirilishi mumkin)
  const addBookingFromModal = (newBooking) => {
    const bookingWithId = { ...newBooking, id: Date.now() };
    const updatedBookings = [...bookings, bookingWithId];
    setBookings(updatedBookings);
    saveBookingsToStorage(updatedBookings);
  };

  // Edit qilish uchun bookingni ochish
  const handleEditBooking = (booking) => {
    setEditingBooking(booking);
    setIsEditOpen(true);
  };

  // Saqlash (edit qilingan bookingni yangilash)
  const handleSaveBooking = (updatedBooking) => {
    const updatedList = bookings.map((b) =>
      b.id === editingBooking.id ? { ...updatedBooking, id: b.id } : b
    );
    setBookings(updatedList);
    saveBookingsToStorage(updatedList);
    setIsEditOpen(false);
  };

  // O‘chirish
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
