import React, { useState, useEffect } from "react";
import "./editbooking.scss";
import { useTranslation } from "react-i18next";

const EditBookingModal = ({ isOpen, booking, onClose, onSave }) => {
  const { t } = useTranslation();
  const [editData, setEditData] = useState(booking || {});

  useEffect(() => {
    if (booking) {
      setEditData(booking);
    }
  }, [booking]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    let updated = { ...editData, [name]: value };

    if (name === "guests") {
      const guestNumber = parseInt(value);
      if (guestNumber >= 2 && guestNumber <= 3) {
        updated.rooms = t("room_family");
        updated.guests = guestNumber;
      } else if (guestNumber === 1) {
        updated.rooms = t("room_standard");
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
  const guestMax = editData.rooms === t("room_standard") ? 1 : 3;

  return (
    <div className="edit-modal-overlay" onClick={onClose}>
      <div
        className="edit-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <h2>{t("editmodal_title")}</h2>

        <form onSubmit={handleSubmit} className="edit-modal-form">
          <label>
            {t("editmodal_checkin")}
            <input
              type="date"
              name="checkIn"
              required
              value={editData.checkIn || ""}
              onChange={handleChange}
            />
          </label>

          <label>
            {t("editmodal_checkout")}
            <input
              type="date"
              name="checkOut"
              required
              value={editData.checkOut || ""}
              onChange={handleChange}
            />
          </label>

          <label>
            {t("editmodal_roomtype")}
            <input
              type="text"
              name="rooms"
              required
              value={editData.rooms || ""}
              readOnly
            />
          </label>

          <label>
            {t("editmodal_guests")}
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
            {t("editmodal_firstname")}
            <input
              type="text"
              name="firstName"
              required
              value={editData.firstName || ""}
              onChange={handleChange}
            />
          </label>

          <label>
            {t("editmodal_lastname")}
            <input
              type="text"
              name="lastName"
              required
              value={editData.lastName || ""}
              onChange={handleChange}
            />
          </label>

          <label>
            {t("editmodal_phone")}
            <input
              type="tel"
              name="phone"
              required
              value={editData.phone || ""}
              onChange={handleChange}
            />
          </label>

          <label>
            {t("editmodal_email")}
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
              {t("editmodal_save")}
            </button>
            <button type="button" className="btn btn-cancel" onClick={onClose}>
              {t("editmodal_cancel")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditBookingModal;
