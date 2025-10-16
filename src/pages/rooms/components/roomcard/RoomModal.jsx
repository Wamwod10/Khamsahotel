// RoomModal.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { FaCheck } from "react-icons/fa";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./roommodal.scss";
import "./roomModalMedia.scss";

function normalizeRoomCode(v) {
  const s = String(v || "").toLowerCase().trim();
  if (s.includes("family")) return "FAMILY";
  if (s.includes("standard")) return "STANDARD";
  if (s === "family") return "FAMILY";
  if (s === "standard") return "STANDARD";
  return "";
}

function roomCodeToLabel(code, t) {
  const c = String(code || "").toUpperCase();
  if (c === "STANDARD") return t("standard") || "Standard Room";
  if (c === "FAMILY") return t("family") || "Family Room";
  return "-";
}

const guestCountByCode = { STANDARD: 1, FAMILY: 3 };

const priceTable = {
  STANDARD: { upTo3Hours: 0.001, upTo10Hours: 60, oneDay: 100 },
  FAMILY: { upTo3Hours: 70, upTo10Hours: 100, oneDay: 150 },
};

/** Duration → key (bardoshlilik kuchaytirildi) */
function normalizeDuration(duration) {
  if (!duration) return "";

  const raw = String(duration).trim();

  // 1) i18n kalitlari to‘g‘ridan-to‘g‘ri kelgan bo‘lsa
  const k = raw.replace(/\s+/g, "");
  if (/^upTo3Hours$/i.test(k)) return "upTo3Hours";
  if (/^upTo10Hours$/i.test(k)) return "upTo10Hours";
  if (/^oneDay$/i.test(k)) return "oneDay";

  // 2) label/ tarjimalarni matn bo‘yicha aniqlash
  const d = raw.toLowerCase();

  // "hour" so‘zining turli tillardagi/yozilishdagi variantlarini qamrab olamiz
  const HOUR_WORDS = [
    "hour", "hours",     // en
    "soat", "soatgacha", // uz
    "saat", "saatlar",   // tr
    "час", "часа", "часов", "ч", // ru
  ];

  const DAY_WORDS = [
    "day", "days",       // en
    "kun",               // uz
    "день", "сутки",     // ru
  ];

  const hasAny = (arr) => arr.some((w) => d.includes(w));

  // up to 3 hours
  if (d.includes("3") && hasAny(HOUR_WORDS)) return "upTo3Hours";

  // up to 10 hours  (NBSP/space muammolari uchun faqat "10" raqamiga qaraymiz)
  if (d.includes("10") && hasAny(HOUR_WORDS)) return "upTo10Hours";

  // one day
  if ((d.includes("one") || d.includes("1") || d.includes("bir")) && hasAny(DAY_WORDS))
    return "oneDay";

  return "";
}

/** Sana/vaqt format */
const formatDate = (s) => {
  if (!s) return "-";
  const [y, m, d] = s.split("-");
  return [d, m, y].join(".");
};
const formatTime = (s) => {
  if (!s) return "-";
  if (String(s).includes("T")) return s.split("T")[1].slice(0, 5);
  return s.slice(0, 5);
};


const SuccessModal = ({ onStayHere, onGoToMyBooking }) => {
  const { t } = useTranslation();
  return (
    <div className="modal-main">
      <div className="modal-overlay" />
      <div className="modal success-modal" role="dialog" aria-modal="true" aria-labelledby="success-modal-title">
        <h2 id="success-modal-title">
          {t("bookingsucced") || "Bron qabul qilindi"} <FaCheck className="modal-icon" />
        </h2>
        <p>{t("bookingsuccess") || "Booking success!"}</p>
        <div className="success-modal-buttons">
          <button className="btn-stay" onClick={onStayHere}>
            {t("stayhere") || "Stay here"}
          </button>
          <button className="btn-mybooking" onClick={onGoToMyBooking}>
            {t("mybooking1") || "My Booking"}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ---------------- Main component ---------------- */

const RoomModal = ({ isOpen, onClose, guests: propGuests, rooms: propRooms }) => {
  const { t } = useTranslation();

  const [bookingInfo, setBookingInfo] = useState({
    checkIn: "",
    checkOutTime: "",
    duration: "",
    hotel: t("TashkentAirportHotel") || "Tashkent Airport Hotel",
    guests: propGuests || 1,
    rooms: normalizeRoomCode(propRooms || ""), 
  });

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
  });

  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("bookingInfo");
      if (saved) {
        const parsed = JSON.parse(saved);
        const roomsCode = normalizeRoomCode(parsed.rooms || propRooms || "");
        setBookingInfo({
          checkIn: parsed.checkIn || "",
          checkOutTime: parsed.checkOutTime || "",
          duration: parsed.duration || "",
          hotel: parsed.hotel || (t("TashkentAirportHotel") || "Tashkent Airport Hotel"),
          guests: guestCountByCode[roomsCode] || propGuests || 1,
          rooms: roomsCode,
        });
      } else {
        const roomsCode = normalizeRoomCode(propRooms || "");
        setBookingInfo((prev) => ({
          ...prev,
          hotel: t("TashkentAirportHotel") || "Tashkent Airport Hotel",
          guests: guestCountByCode[roomsCode] || propGuests || 1,
          rooms: roomsCode,
        }));
      }
    } catch (err) {
      console.error("RoomModal: bookingInfo parse error:", err);
    }
  }, [t, propGuests, propRooms]);

  const durationKey = useMemo(
    () => normalizeDuration(bookingInfo.duration),
    [bookingInfo.duration]
  );

  const price = useMemo(() => {
    const table = priceTable[bookingInfo.rooms];
    if (!table || !durationKey) return null;
    return table[durationKey];
  }, [bookingInfo.rooms, durationKey]);

  const priceDisplay = useMemo(() => (price != null ? `${price}€` : "-"), [price]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
  };

  /** Confirm: faqat local/sessionStorage'ga saqlaymiz + success modal (Octo yo'q) */
  const handleConfirm = (e) => {
    e.preventDefault();

    if (!bookingInfo.checkIn || !bookingInfo.checkOutTime || !bookingInfo.duration || !bookingInfo.rooms) {
      toast.error(t("Siz ma'lumotlarni to'liq kiritmadingiz!") || "Please complete booking info", {
        position: "top-center",
        autoClose: 3000,
      });
      return;
    }
    const { firstName, lastName, phone, email } = formData;
    if (!firstName.trim() || !lastName.trim() || !phone.trim() || !email.trim()) {
      toast.error(t("Iltimos, barcha maydonlarni to'ldiring") || "Please fill all fields", {
        position: "top-center",
        autoClose: 3000,
      });
      return;
    }
    if (!durationKey) {
      toast.error(t("Duration no valid") || "Duration invalid", { position: "top-center", autoClose: 3000 });
      return;
    }
    const priceEur = Number(price);
    if (!Number.isFinite(priceEur) || priceEur <= 0) {
      toast.error(t("Price not available") || "Price not available", { position: "top-center", autoClose: 3000 });
      return;
    }

    const full = {
      ...bookingInfo,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone.trim(),
      email: email.trim(),
      price: priceEur,
      createdAt: new Date().toISOString(),
    };

    try {
      const existing = JSON.parse(sessionStorage.getItem("allBookings") || "[]");
      const updated = [full, ...existing];
      sessionStorage.setItem("allBookings", JSON.stringify(updated));
      sessionStorage.setItem("bookingInfo", JSON.stringify(full));
      localStorage.setItem("bookingInfo", JSON.stringify(full));
      localStorage.setItem("allBookings", JSON.stringify(updated));
    } catch (err) {
      console.error("RoomModal: Storage error:", err);
      toast.error(t("Ma'lumotlarni saqlashda xatolik yuz berdi!") || "Storage error", {
        position: "top-center",
        autoClose: 4000,
      });
      return;
    }

    setShowSuccess(true);
  };

  const handleStayHere = () => {
    setShowSuccess(false);
    onClose && onClose();
  };
  const handleGoToMyBooking = () => (window.location.href = "/mybooking");

  if (!isOpen) return null;
  if (showSuccess) return <SuccessModal onStayHere={handleStayHere} onGoToMyBooking={handleGoToMyBooking} />;

  return (
    <div className="modal-main">
      <div className="modal-overlay" onClick={onClose} />
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <h2 className="modal__title" id="modal-title">
          {t("bookyourstay") || "Book Your Stay"}
        </h2>

        <div className="modal_all__section">
          <div className="modal__section">
            <label>{t("check-in") || "Check-In"}:</label>
            <p>{bookingInfo.checkIn ? formatDate(bookingInfo.checkIn) : "-"}</p>
          </div>
          <div className="modal__section">
            <label>{t("check-in-hours") || "Check-In Time"}:</label>
            <p>{bookingInfo.checkOutTime ? formatTime(bookingInfo.checkOutTime) : "-"}</p>
          </div>
          <div className="modal__section">
            <label>{t("duration") || "Duration"}:</label>
            <p>{bookingInfo.duration ? (t(durationKey) || bookingInfo.duration) : "-"}</p>
          </div>
          <div className="modal__section">
            <label>{t("rooms") || "Room"}:</label>
            <p>{roomCodeToLabel(bookingInfo.rooms, t)}</p>
          </div>
          <div className="modal__section">
            <label>{t("guests") || "Guests"}:</label>
            <p>{guestCountByCode[bookingInfo.rooms] || "-"}</p>
          </div>
          <div className="modal__section">
            <label>{t("hotel") || "Hotel"}:</label>
            <p>{bookingInfo.hotel}</p>
          </div>
        </div>

        <form className="modal__form" onSubmit={handleConfirm} noValidate>
          <div className="modal__field">
            <label htmlFor="firstName">{t("firstName") || "First Name"}</label>
            <input
              id="firstName"
              type="text"
              name="firstName"
              placeholder={t("enterFirstName") || "Enter first name"}
              required
              value={formData.firstName}
              onChange={handleInputChange}
              autoComplete="given-name"
            />
          </div>

          <div className="modal__field">
            <label htmlFor="lastName">{t("lastName") || "Last Name"}</label>
            <input
              id="lastName"
              type="text"
              name="lastName"
              placeholder={t("enterLastName") || "Enter last name"}
              required
              value={formData.lastName}
              onChange={handleInputChange}
              autoComplete="family-name"
            />
          </div>

          <div className="modal__field">
            <label htmlFor="phone">{t("phone") || "Phone"}</label>
            <input
              id="phone"
              type="tel"
              name="phone"
              placeholder={t("enterphonenumb") || "Enter phone number"}
              required
              value={formData.phone}
              onChange={handleInputChange}
              autoComplete="tel"
            />
          </div>

          <div className="modal__field">
            <label htmlFor="email">{t("email") || "Email"}</label>
            <input
              id="email"
              type="email"
              name="email"
              placeholder="you@example.com"
              required
              value={formData.email}
              onChange={handleInputChange}
              autoComplete="email"
            />
          </div>

          {/* Payment method (indikativ) */}
          <div className="modal__field custom-select">
            <label htmlFor="payment-method">{t("paymentMethod") || "Payment Method"}</label>
            <div className="input-wrapper">
              <img src="/28.png" alt="Octobank" className="input-icon" />
              <input id="payment-method" value="Octobank" disabled />
            </div>
          </div>

          <div className="total-price-display">
            <label>{t("totalPrice") || "Total Price"}:</label>
            <p style={{ fontWeight: 600, color: "#f7931e", marginTop: "0.2rem" }}>
              {priceDisplay}
            </p>
          </div>

          <div className="modal__buttons">
            <button type="submit" className="modal__confirm">
              {t("confirm") || "Confirm"}
            </button>
            <button type="button" className="modal__cancel" onClick={onClose}>
              {t("cancel") || "Cancel"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RoomModal;
