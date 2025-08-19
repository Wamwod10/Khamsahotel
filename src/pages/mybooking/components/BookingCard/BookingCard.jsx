// BookingCard.jsx
import React from "react";
import "./bookingcard.scss";

const BookingCard = ({ booking, onEdit, onDelete }) => {
  if (!booking) return null;

  return (
    <div className="booking-card">
      <h2>Tashkent Airport Hotel</h2>

      <div className="booking-row">
        <span>Check-In:</span>
        <span>{booking.checkIn}</span>
      </div>

      <div className="booking-row">
        <span>Check-Out:</span>
        <span>{booking.checkOut}</span>
      </div>

      <div className="booking-row">
        <span>Room Type:</span>
        <span>{booking.rooms}</span>
      </div>

      <div className="booking-row">
        <span>Guests:</span>
        <span>{booking.guests}</span>
      </div>

      <h3>Guest Information</h3>

      <div className="booking-row">
        <span>First Name:</span>
        <span>{booking.firstName}</span>
      </div>

      <div className="booking-row">
        <span>Last Name:</span>
        <span>{booking.lastName}</span>
      </div>

      <div className="booking-row">
        <span>Phone:</span>
        <span>{booking.phone}</span>
      </div>

      <div className="booking-row">
        <span>Email:</span>
        <span>{booking.email}</span>
      </div>

      <div className="booking-actions">
        <button className="btn btn-edit" onClick={onEdit}>
          Edit
        </button>
        <button className="btn btn-delete" onClick={onDelete}>
          Delete
        </button>
      </div>
    </div>
  );
};

export default BookingCard;
