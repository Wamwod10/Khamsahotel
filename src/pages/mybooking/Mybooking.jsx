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

  // 🔽 Bnovo skriptini dinamik yuklash
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://ibe.bnovo.ru/online/booking/widget.js";
    script.async = true;
    script.setAttribute("data-bnovo-object-id", "b6d5e4b4-cee2-4cf4-a123-af43b2b6daaf");

    script.onload = () => {
      console.log("✅ Bnovo widget yuklandi");
    };

    script.onerror = () => {
      console.error("❌ Bnovo widgetni yuklashda xatolik");
    };

    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
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

  // 🔽 To‘lov tugmasi vidjetni ochadi
  const handlePayment = () => {
    if (totalAmount === 0) {
      alert("To‘lov uchun summa mavjud emas");
      return;
    }

    if (
      typeof window.BnovoBookingWidget !== "undefined" &&
      typeof window.BnovoBookingWidget.open === "function"
    ) {
      window.BnovoBookingWidget.open({
        objectId: "b6d5e4b4-cee2-4cf4-a123-af43b2b6daaf",
        lang: "en", // kerak bo‘lsa "ru" yoki "uz" qilib o‘zgartiring
      });
    } else {
      alert("Bnovo vidjeti hali yuklanmagan. Iltimos, sahifani biroz kuting yoki qayta yuklang.");
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
