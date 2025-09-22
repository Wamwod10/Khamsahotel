import React from "react";
import "./bookingcard.scss";
import { useTranslation } from "react-i18next";

const roomKeyMap = {
  "Standard Room": "roomType_standard",
  "Family Room": "roomType_family",
  "2 Standard Rooms": "roomType_twoStandard",
  "2 Family Rooms": "roomType_twoFamily",
  "Standard + 1 Family room": "roomType_mixed",
};

const BookingCard = ({ booking, onEdit, onDelete }) => {
  const { t } = useTranslation();
  if (!booking) return null;

  const formatDate = (s) => {
    if (!s) return "-";
    const [y, m, d] = s.split("-");
    return `${d}.${m}.${y}`;
  };

  const formatTime = (s) => {
    if (!s) return "-";
    if (s.includes("T")) return s.split("T")[1].slice(0, 5);
    return s.slice(0, 5);
  };

  const roomLabel = booking.rooms ? t(roomKeyMap[booking.rooms] || booking.rooms) : "-";

  return (
    <div className="booking-card">
      <h2>{t("bookingcard_hotel", { defaultValue: "Khamsa Hotel" })}</h2>

      <div className="booking-section">
        <div className="booking-row">
          <span>{t("bookingcard_checkin", { defaultValue: "Check-in date" })}</span>
          <span>{formatDate(booking.checkIn)}</span>
        </div>

        <div className="booking-row">
          <span>{t("check-in-hours", { defaultValue: "Check-in time" })}</span>
          <span>{formatTime(booking.checkOutTime)}</span>
        </div>

        <div className="booking-row">
          <span>{t("bookingcard_roomtype", { defaultValue: "Room Type" })}</span>
          <span>{roomLabel}</span>
        </div>

        <div className="booking-row">
          <span>{t("duration", { defaultValue: "Duration" })}</span>
          <span>{booking.duration || "-"}</span>
        </div>

        <div className="booking-row">
          <span>{t("bookingcard_price", { defaultValue: "Price" })}</span>
          <span>{booking.price ? `${booking.price}€` : "-"}</span>
        </div>
      </div>

      <h3>{t("bookingcard_guestinfo", { defaultValue: "Guest Information" })}</h3>

      <div className="booking-section">
        <div className="booking-row">
          <span>{t("bookingcard_firstname", { defaultValue: "First Name" })}</span>
          <span>{booking.firstName || "-"}</span>
        </div>

        <div className="booking-row">
          <span>{t("bookingcard_lastname", { defaultValue: "Last Name" })}</span>
          <span>{booking.lastName || "-"}</span>
        </div>

        <div className="booking-row">
          <span>{t("bookingcard_phone", { defaultValue: "Phone" })}</span>
          <span>{booking.phone || "-"}</span>
        </div>

        <div className="booking-row">
          <span>{t("bookingcard_email", { defaultValue: "Email" })}</span>
          <span>{booking.email || "-"}</span>
        </div>
      </div>

      <div className="booking-actions">
        <button className="btn btn-edit" onClick={() => onEdit(booking)}>
          {t("bookingcard_edit", { defaultValue: "Edit" })}
        </button>
        <button className="btn btn-delete" onClick={() => onDelete(booking.id)}>
          {t("bookingcard_delete", { defaultValue: "Delete" })}
        </button>
      </div>
    </div>
  );
};

export default BookingCard;
