import React, { useState, useEffect } from "react";
import "./editbooking.scss";

const EditBookingModal = ({ isOpen, booking, onClose, onSave }) => {
  const [editData, setEditData] = useState(booking || {});

  useEffect(() => {
    if (booking) {
      setEditData(booking);
    }
  }, [booking]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;

    let updated = {
      ...editData,
      [name]: value,
    };

    if (name === "guests") {
      const guestNumber = parseInt(value);

      if (guestNumber >= 2 && guestNumber <= 3) {
        updated.rooms = "Family Room";
        updated.guests = guestNumber;
      } else if (guestNumber === 1) {
        updated.rooms = "Standard Room";
        updated.guests = 1;
      }
    }

    setEditData(updated);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(editData);
    onClose();
  };

  const guestMin = 1;
  const guestMax = editData.rooms === "Standard Room" ? 1 : 3;

  return (
    <div className="edit-modal-overlay" onClick={onClose}>
      <div
        className="edit-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <h2>Edit Booking</h2>

        <form onSubmit={handleSubmit} className="edit-modal-form">
          <label>
            Check-In:
            <input
              type="date"
              name="checkIn"
              required
              value={editData.checkIn || ""}
              onChange={handleChange}
            />
          </label>

          <label>
            Check-Out:
            <input
              type="date"
              name="checkOut"
              required
              value={editData.checkOut || ""}
              onChange={handleChange}
            />
          </label>

          <label>
            Room Type:
            <input
              type="text"
              name="rooms"
              required
              value={editData.rooms || ""}
              readOnly
            />
          </label>

          <label>
            Guests:
            <input
              type="number"
              name="guests"
              min={guestMin}
              max={guestMax}
              required
              value={editData.guests || 1}
              onChange={handleChange}
            />
          </label>

          <label>
            First Name:
            <input
              type="text"
              name="firstName"
              required
              value={editData.firstName || ""}
              onChange={handleChange}
            />
          </label>

          <label>
            Last Name:
            <input
              type="text"
              name="lastName"
              required
              value={editData.lastName || ""}
              onChange={handleChange}
            />
          </label>

          <label>
            Phone:
            <input
              type="tel"
              name="phone"
              required
              value={editData.phone || ""}
              onChange={handleChange}
            />
          </label>

          <label>
            Email:
            <input
              type="email"
              name="email"
              required
              value={editData.email || ""}
              onChange={handleChange}
            />
          </label>

          <div className="edit-modal-buttons">
            <button type="submit" className="btn btn-save">
              Save
            </button>
            <button type="button" className="btn btn-cancel" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditBookingModal;
