import React, { useState, useEffect } from "react";
import "./editbooking.scss";
import { useTranslation } from "react-i18next";
import { durationToHours, checkoutPreview, hotelNowParts } from "../../../../utils/bookingExperience.js";

const durationOptions = [
  { value: "Up to 3 hours", label: "upTo3Hours" },
  { value: "Up to 10 hours", label: "upTo10Hours" },
  { value: "One day", label: "oneDay" },
];

const roomOptions = [
  { value: "STANDARD", label: "standard" },
  { value: "FAMILY", label: "family" },
];

const EditBookingModal = ({ isOpen, booking, onClose, onSave }) => {
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [editData, setEditData] = useState({
    checkIn: "",
    checkOutTime: "",
    duration: "",
    rooms: "",
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
  });

  useEffect(() => {
    if (booking) {
      setEditData({
        checkIn: booking.checkIn || "",
        checkOutTime: booking.checkOutTime || "",
        duration: durationToHours(booking.duration) === 3 ? "Up to 3 hours" :
          durationToHours(booking.duration) === 10 ? "Up to 10 hours" :
          durationToHours(booking.duration) === 24 ? "One day" : "",
        rooms: String(booking.rooms || "").toUpperCase().includes("FAMILY") ? "FAMILY" : "STANDARD",
        firstName: booking.firstName || "",
        lastName: booking.lastName || "",
        phone: booking.phone || "",
        email: booking.email || "",
      });
    }
  }, [booking]);

  if (!isOpen) return null;
  const checkout = checkoutPreview(editData.checkIn, editData.checkOutTime, editData.duration);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setEditData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setError("");
    try { await onSave(editData); }
    catch (err) { setError(err?.message || t("bookingSaveFailed")); }
    finally { setSaving(false); }
  };

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
          {error && <p className="edit-booking-error" role="alert">{error}</p>}
          {/* Check In Date */}
          <label>
            {t("check-in")}
            <input
              type="date"
              min={hotelNowParts().date}
              name="checkIn"
              required
              value={editData.checkIn}
              onChange={handleChange}
            />
          </label>

          {/* Check In Time */}
          <label>
            {t("check-in-hours")}
            <input
              type="time"
              name="checkOutTime"
              required
              value={editData.checkOutTime}
              onChange={handleChange}
            />
          </label>

          {checkout && <small className="edit-booking-checkout">{t("bookingCheckoutLabel")}: {checkout.date} · {checkout.time}</small>}
          {/* Duration Select */}
          <label>
            {t("duration")}
            <select
              name="duration"
              required
              value={editData.duration}
              onChange={handleChange}
            >
              <option value="" disabled>
                {t("select_duration")}
              </option>
              {durationOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {t(option.label)}
                </option>
              ))}
            </select>
          </label>

          {/* Rooms Select */}
          <label>
            {t("editmodal_roomtype")}
            <select
              name="rooms"
              required
              value={editData.rooms}
              onChange={handleChange}
            >
              <option value="" disabled>
                {t("select_room")}
              </option>
              {roomOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {t(option.label)}
                </option>
              ))}
            </select>
          </label>

          {/* First Name */}
          <label>
            {t("editmodal_firstname")}
            <input
              type="text"
              name="firstName"
              required
              value={editData.firstName}
              onChange={handleChange}
            />
          </label>

          {/* Last Name */}
          <label>
            {t("editmodal_lastname")}
            <input
              type="text"
              name="lastName"
              required
              value={editData.lastName}
              onChange={handleChange}
            />
          </label>

          {/* Phone */}
          <label>
            {t("editmodal_phone")}
            <input
              type="tel"
              name="phone"
              required
              value={editData.phone}
              onChange={handleChange}
            />
          </label>

          {/* Email */}
          <label>
            {t("editmodal_email")}
            <input
              type="email"
              name="email"
              required
              value={editData.email}
              onChange={handleChange}
            />
          </label>

          {/* Buttons */}
          <div className="edit-modal-buttons">
            <button type="submit" className="btn btn-save" disabled={saving} aria-busy={saving}>
              {saving ? t("bookingSaving") : t("editmodal_save")}
            </button>
            <button type="button" className="btn btn-cancel" onClick={onClose} disabled={saving}>
              {t("editmodal_cancel")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditBookingModal;
