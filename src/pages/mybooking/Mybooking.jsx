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
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [status, setStatus] = useState(null); // "success" | "error" | null

  useEffect(() => {
    const savedBookings =
      JSON.parse(sessionStorage.getItem("allBookings")) || [];
    const roomModalData = JSON.parse(localStorage.getItem("bookingInfo"));
    let updatedBookings = [];

    if (roomModalData && roomModalData.firstName) {
      if (!roomModalData.id) {
        roomModalData.id = Date.now();
      }

      // BookingInfo ichida checkOutTime borligini checkOut deb yozamiz
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

      <PaymentModal
        isOpen={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        onStatus={(result) => {
          setPaymentOpen(false);
          setStatus(result); // 'success' or 'error'
        }}
      />

      {status && (
        <StatusModal status={status} onClose={() => setStatus(null)} />
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
