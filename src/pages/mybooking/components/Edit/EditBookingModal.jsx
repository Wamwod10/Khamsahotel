import React, { useState, useEffect } from "react";
import "./editbooking.scss";
import { useTranslation } from "react-i18next";

const durationOptions = [
  { value: "up_to_2_hours", label: "up_to_2_hours" },
  { value: "up_to_10_hours", label: "up_to_10_hours" },
  { value: "for_a_day", label: "for_a_day" },
];

const roomOptions = [
  { value: "Standard Room", label: "Standard room" },
  { value: "Family Room", label: "Family room" },
];

const EditBookingModal = ({ isOpen, booking, onClose, onSave }) => {
  const { t } = useTranslation();
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
  {
    durationOptions.map((option) => (
      <option key={option.value} value={option.value}>
        {t(option.label)}
      </option>
    ))
  }
  useEffect(() => {
    if (booking) {
      setEditData({
        checkIn: booking.checkIn ||  "",
        checkInTime: booking.checkOutTime ||  "",
        duration: booking.duration || "",
        rooms: booking.rooms || "",
        firstName: booking.firstName || "",
        lastName: booking.lastName || "",
        phone: booking.phone || "",
        email: booking.email || "",
      });
    }
  }, [booking]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setEditData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(editData);
    onClose();
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
          {/* Check In Date */}
          <label>
            {t("check-in")}
            <input
              type="date"
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
              name="checkInTime"
              required
              value={editData.checkOutTime}
              onChange={handleChange}
            />
          </label>

          {/* Duration Select */}
          <label>
            {t("duration")}
            <select
              name="duration"
              required
              value={editData.duration}
              onChange={handleChange}
            >
              <option value="" disabled>{t("select_duration")}</option>
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
              <option value="" disabled>{t("select_room")}</option>
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