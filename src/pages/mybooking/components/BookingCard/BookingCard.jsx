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

export default function BookingCard({ booking, onEdit, onDelete, isLatest }) {
  const { t } = useTranslation();
  if (!booking) return null;

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const [y, m, d] = dateStr.split("-");
    return `${d}.${m}.${y}`;
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return "-";
    if (timeStr.includes("T")) return timeStr.split("T")[1].slice(0, 5);
    return timeStr.slice(0, 5);
  };

  const roomLabel = booking.rooms ? t(roomKeyMap[booking.rooms] || booking.rooms) : "-";
  const status = booking.status || "pending";

  return (
    <div className="booking-card">
      <div className="booking-card__header">
        <h2>{t("bookingcard_hotel")}</h2>
        <div className="booking-card__badges">
          {isLatest && <span className="badge badge-primary">{t("latest") || "Latest"}</span>}
          <span
            className={`badge ${status === "paid" ? "badge-success" : "badge-warn"}`}
            title={status === "paid" ? "Paid" : "Pending"}
          >
            {status === "paid" ? (t("paid") || "Paid") : (t("pending") || "Pending")}
          </span>
        </div>
      </div>

      <div className="booking-section">
        <div className="booking-row">
          <span>{t("bookingcard_checkin")}</span>
          <span>{formatDate(booking.checkIn)}</span>
        </div>

        <div className="booking-row">
          <span>{t("check-in-hours")}</span>
          <span>{formatTime(booking.checkOutTime)}</span>
        </div>

        <div className="booking-row">
          <span>{t("bookingcard_roomtype")}</span>
          <span>{roomLabel}</span>
        </div>

        <div className="booking-row">
          <span>{t("duration")}:</span>
          <span>{t(booking.duration)}</span>
        </div>

        <div className="booking-row">
          <span>{t("bookingcard_price")}</span>
          <span>{booking.price ? `${booking.price}€` : "-"}</span>
        </div>
      </div>

      <h3>{t("bookingcard_guestinfo")}</h3>

      <div className="booking-section">
        <div className="booking-row">
          <span>{t("bookingcard_firstname")}</span>
          <span>{booking.firstName}</span>
        </div>

        <div className="booking-row">
          <span>{t("bookingcard_lastname")}</span>
          <span>{booking.lastName}</span>
        </div>

        <div className="booking-row">
          <span>{t("bookingcard_phone")}</span>
          <span>{booking.phone}</span>
        </div>

        <div className="booking-row">
          <span>{t("bookingcard_email")}</span>
          <span>{booking.email}</span>
        </div>
      </div>

      <div className="booking-actions">
        <button className="btn btn-edit" onClick={() => onEdit(booking)}>
          {t("bookingcard_edit")}
        </button>
        <button className="btn btn-delete" onClick={() => onDelete(booking.id)}>
          {t("bookingcard_delete")}
        </button>
      </div>
    </div>
  );
}
