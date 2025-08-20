import React from "react";
import "./bookingcard.scss";
import { useTranslation } from "react-i18next";

const BookingCard = ({ booking, onEdit, onDelete }) => {
  const { t } = useTranslation();
  if (!booking) return null;

  return (
    <div className="booking-card">
      <h2>{t("bookingcard_hotel")}</h2>

      <div className="booking-section">
        <div className="booking-row">
          <span>{t("bookingcard_checkin")}</span>
          <span>{booking.checkIn}</span>
        </div>

        <div className="booking-row">
          <span>{t("bookingcard_checkout")}</span>
          <span>{booking.checkOut}</span>
        </div>

        <div className="booking-row">
          <span>{t("bookingcard_roomtype")}</span>
          <span>{booking.rooms}</span>
        </div>

        <div className="booking-row">
          <span>{t("bookingcard_guests")}</span>
          <span>{booking.guests}</span>
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
         <div className="booking-row_gmail">
           <span>{t("bookingcard_email")}</span>
          <span>{booking.email}</span>
         </div>
        </div>
      </div>

      <div className="booking-actions">
        <button className="btn btn-edit" onClick={() => onEdit(booking)}>
          {t("bookingcard_edit")}
        </button>
        <button className="btn btn-delete" onClick={() => onDelete(booking)}>
          {t("bookingcard_delete")}
        </button>
      </div>
    </div>
  );
};

export default BookingCard;
