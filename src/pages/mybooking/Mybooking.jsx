import React, { useState, useEffect } from "react";
import "./mybooking.scss";
import BookingCard from "./components/BookingCard/BookingCard";
import EditBookingModal from "./components/Edit/EditBookingModal";
import { v4 as uuidv4 } from "uuid";

const MyBooking = () => {
  const [bookings, setBookings] = useState([]);
  const [editingBooking, setEditingBooking] = useState(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isBnovoOpen, setIsBnovoOpen] = useState(false);

  // Session va LocalStorage dan o‘qish
  useEffect(() => {
    const savedBookings =
      JSON.parse(sessionStorage.getItem("allBookings")) || [];

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

  const addNewBooking = () => {
    window.location.href = "/";
  };

  // Bnovo widjetni dinamik ulash
  useEffect(() => {
    if (isBnovoOpen) {
      // eski scriptni tozalash
      const oldScript = document.querySelector(
        'script[src="https://widget.bnovo.ru/v2/js/bnovo.js"]'
      );
      if (oldScript) oldScript.remove();

      const script = document.createElement("script");
      script.src = "https://widget.bnovo.ru/v2/js/bnovo.js";
      script.async = true;
      script.onload = () => {
        if (window.Bnovo_Widget) {
          window.Bnovo_Widget.init(() => {
            window.Bnovo_Widget.open("_bn_widget_", {
              type: "vertical",
              lcode: "b6d5e4b4-cee2-4cf4-a123-af43b2b6daaf", // ✅ sizning ID
              lang: "ru",
              width: "100%",
              background: "#ffffff",
              bg_alpha: "100",
              padding: "20",
              border_radius: "12",
              font_type: "arial",
              font_size: "16",
              title_color: "#222222",
              title_size: "18",
              inp_color: "#222222",
              inp_bordhover: "#3796e5",
              inp_bordcolor: "#cccccc",
              inp_alpha: "100",
              btn_background: "#ff8c40",
              btn_background_over: "#de5900",
              btn_textcolor: "#ffffff",
              btn_textover: "#ffffff",
              btn_bordcolor: "#eb5e00",
              btn_bordhover: "#de5900",
              text_concierge: "Забронируй номер через Khamsa Hotel",
            });
          });
        }
      };

      document.body.appendChild(script);
    }
  }, [isBnovoOpen]);

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
              onClick={() => setIsBnovoOpen(true)}
              disabled={totalAmount === 0}
            >
              Pay Now (
              {totalAmount > 0
                ? `${totalAmount.toLocaleString()}€`
                : "No amount"}
              )
            </button>
          </div>
        </>
      )}

      {/* Tahrirlash modali */}
      <EditBookingModal
        isOpen={isEditOpen}
        booking={editingBooking}
        onClose={() => setIsEditOpen(false)}
        onSave={handleSaveBooking}
      />

      {/* Bnovo Modal */}
      {isBnovoOpen && (
        <div className="bnovo-overlay">
          <div className="bnovo-modal">
            <button
              className="bnovo-close"
              onClick={() => setIsBnovoOpen(false)}
            >
              ✕
            </button>
            <div id="_bn_widget_" />
          </div>
        </div>
      )}
    </div>
  );
};

export default MyBooking;
