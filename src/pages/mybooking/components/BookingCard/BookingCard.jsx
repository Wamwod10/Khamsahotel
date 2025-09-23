import React from "react";
import "./bookingcard.scss";
import { useTranslation } from "react-i18next";

/** API bazasini aniqlash — Vite/CRA uchun mos */
function getApiBase() {
  const env =
    (import.meta?.env && import.meta.env.VITE_API_BASE_URL) ||
    (process.env && process.env.REACT_APP_API_BASE_URL) ||
    "";
  const cleaned = (env || "").replace(/\/+$/, "");
  return cleaned || window.location.origin;
}

/** rooms kodi -> ko‘rinadigan label */
function roomCodeToLabel(code, t) {
  const c = String(code || "").toUpperCase();
  if (c === "STANDARD") return t("standard") || "Standard Room";
  if (c === "FAMILY") return t("family") || "Family Room";
  return code || "-";
}

/** duration matnini backendga mos kalitga normalizatsiya (faqat description uchun) */
function normalizeDuration(duration) {
  if (!duration || typeof duration !== "string") return "";
  const d = duration.toLowerCase();
  if (d.includes("3") && (d.includes("hour") || d.includes("soat") || d.includes("saat"))) return "upTo3Hours";
  if (d.includes("10") && (d.includes("hour") || d.includes("soat") || d.includes("saat"))) return "upTo10Hours";
  if ((d.includes("1") || d.includes("bir")) && (d.includes("day") || d.includes("kun") || d.includes("день"))) return "oneDay";
  return "";
}

const BookingCard = ({ booking, onEdit, onDelete }) => {
  const { t } = useTranslation();
  if (!booking) return null;

  const formatDate = (s) => {
    if (!s) return "-";
    const [y, m, d] = String(s).split("-");
    if (!y || !m || !d) return s;
    return `${d}.${m}.${y}`;
  };

  const formatTime = (s) => {
    if (!s) return "-";
    if (String(s).includes("T")) return s.split("T")[1].slice(0, 5);
    return String(s).slice(0, 5);
  };

  const roomLabel = roomCodeToLabel(booking.rooms, t);

  // Pay tugmasi
  const handlePay = async () => {
    try {
      // Majburiy ma’lumotlar
      if (!booking?.price || !booking?.email) {
        alert(t("fillAllFields") || "Please fill in all fields!");
        return;
      }

      // Backendga to‘lov yaratish
      const base = getApiBase();
      const durationKey = normalizeDuration(booking.duration);
      const body = {
        amount: Number(booking.price),                  // EUR
        email: booking.email,
        description: `${roomLabel} / ${durationKey || booking.duration || ""}`.trim(),
        booking: {
          checkIn: booking.checkIn,                    // YYYY-MM-DD
          duration: booking.duration,                  // human-readable
          rooms: booking.rooms,                        // "STANDARD" | "FAMILY"
          guests: booking.guests,
          firstName: booking.firstName,
          lastName: booking.lastName,
          phone: booking.phone,
          email: booking.email,
          price: Number(booking.price),
        },
      };

      const resp = await fetch(`${base}/create-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const ct = (resp.headers.get("content-type") || "").toLowerCase();
      const data = ct.includes("application/json") ? await resp.json() : { _raw: await resp.text() };

      if (!resp.ok || !data?.paymentUrl) {
        console.error("create-payment error:", resp.status, data);
        alert((data && (data.error || data.message)) || "Payment init failed");
        return;
      }

      // Octobank to‘lov sahifasiga yo‘naltirish
      window.location.href = data.paymentUrl;
    } catch (e) {
      console.error("handlePay exception:", e);
      alert("Network error while creating payment");
    }
  };

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
        <button className="btn btn-edit" onClick={() => onEdit && onEdit(booking)}>
          {t("bookingcard_edit", { defaultValue: "Edit" })}
        </button>
        <button className="btn btn-delete" onClick={() => onDelete && onDelete(booking.id)}>
          {t("bookingcard_delete", { defaultValue: "Delete" })}
        </button>
        {/* PAY tugmasi
        <button className="btn btn-pay" onClick={handlePay}>
          {t("pay", { defaultValue: "Pay" })}
        </button> */}
      </div>
    </div>
  );
};

export default BookingCard;
