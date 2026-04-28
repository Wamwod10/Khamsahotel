import React, { useEffect } from "react";
import "./staff.scss";

const StaffBookingModal = ({ booking, onClose, onDelete }) => {
  if (!booking) return null;

  // ESC bilan yopish
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div className="staff-detail">
      <div className="staff-detail__overlay" onClick={onClose}></div>

      <div className="staff-detail__content">
        <h2>Bron tafsiloti</h2>

        <div className="staff-detail__info">
          <p>👤 <b>Ism:</b> {booking.firstName} {booking.lastName}</p>
          <p>📧 <b>Email:</b> {booking.email || "-"}</p>
          <p>📞 <b>Telefon:</b> {booking.phone}</p>

          <hr />

          <p>🗓️ <b>Bron vaqti:</b> {booking.createdAt || "-"}</p>
          <p>📅 <b>Kirish sanasi:</b> {booking.date}</p>
          <p>⏰ <b>Kirish vaqti:</b> {booking.time || "-"}</p>
          <p>🛏️ <b>Xona:</b> {booking.room}</p>
          <p>📆 <b>Davomiylik:</b> {booking.duration}</p>
          <p>💶 <b>Narx:</b> {booking.price}€</p>
        </div>

        <div className="staff-detail__actions">
          <button
            className="delete"
            onClick={() => {
              onDelete(booking.id);
              onClose();
            }}
          >
            O‘chirish
          </button>

          <button onClick={onClose}>Yopish</button>
        </div>
      </div>
    </div>
  );
};

export default StaffBookingModal;