// RoomModal.jsx
import React, { useEffect, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { FaCheck } from "react-icons/fa";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./roommodal.scss";
import "./roomModalMedia.scss";

/** Rooms kod → ko‘rinadigan label */
function roomCodeToLabel(code, t) {
  const c = String(code || "").toUpperCase();
  if (c === "STANDARD") return t("standard") || "Standard Room";
  if (c === "FAMILY") return t("family") || "Family Room";
  return code || "-";
}

/** Guests limiti (kod bilan) */
const guestCountByCode = {
  STANDARD: 1,
  FAMILY: 3,
};

/** Narx jadvali (EUR) — kod bilan */
const priceTable = {
  STANDARD: {
    upTo3Hours: 0.001, // test/cheap
    upTo10Hours: 60,
    oneDay: 100,
  },
  FAMILY: {
    upTo3Hours: 70,
    upTo10Hours: 100,
    oneDay: 150,
  },
};

const normalizeDuration = (duration) => {
  if (!duration || typeof duration !== "string") {
    return "";
  }
  const d = duration.toLowerCase();
  if (d.includes("3") && (d.includes("hour") || d.includes("soat") || d.includes("saat"))) {
    return "upTo3Hours";
  }
  if (d.includes("10") && (d.includes("hour") || d.includes("soat") || d.includes("saat"))) {
    return "upTo10Hours";
  }
  if ((d.includes("1") || d.includes("bir")) && (d.includes("day") || d.includes("kun") || d.includes("день"))) {
    return "oneDay";
  }
  return "";
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

/** Asosiy modal */
const RoomModal = ({ isOpen, onClose, guests: propGuests, rooms: propRooms }) => {
  const { t } = useTranslation();

  // bookingInfo: rooms endi KOD (STANDARD|FAMILY)
  const [bookingInfo, setBookingInfo] = useState({
    checkIn: "",
    checkOutTime: "",
    duration: "",
    hotel: t("TashkentAirportHotel") || "Tashkent Airport Hotel",
    guests: propGuests || 1,
    rooms: (propRooms || "").toUpperCase(), // KOD
  });

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
  });

  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    // localStorage.bookingInfo dan o‘qish
    try {
      const saved = localStorage.getItem("bookingInfo");
      if (saved) {
        const parsed = JSON.parse(saved);
        const roomsCode = String(parsed.rooms || propRooms || "").toUpperCase();
        setBookingInfo({
          checkIn: parsed.checkIn || "",
          checkOutTime: parsed.checkOutTime || "",
          duration: parsed.duration || "",
          hotel: parsed.hotel || (t("TashkentAirportHotel") || "Tashkent Airport Hotel"),
          guests: guestCountByCode[roomsCode] || propGuests || 1,
          rooms: roomsCode, // KOD
        });
      } else {
        const roomsCode = String(propRooms || "").toUpperCase();
        setBookingInfo((prev) => ({
          ...prev,
          hotel: t("TashkentAirportHotel") || "Tashkent Airport Hotel",
          guests: guestCountByCode[roomsCode] || propGuests || 1,
          rooms: roomsCode,
        }));
      }
    } catch (err) {
      console.error("RoomModal: Error parsing bookingInfo from localStorage:", err);
    }
  }, [t, propGuests, propRooms]);

  const durationKey = useMemo(() => normalizeDuration(bookingInfo.duration), [bookingInfo.duration]);

  const price = useMemo(() => {
    const table = priceTable[bookingInfo.rooms];
    if (!table || !durationKey) return null;
    return table[durationKey];
  }, [bookingInfo.rooms, durationKey]);

  const priceDisplay = useMemo(() => (price != null ? `${price}€` : "-"), [price]);

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const parts = dateStr.split("-");
    if (parts.length !== 3) return dateStr;
    const [year, month, day] = parts;
    return `${day}.${month}.${year}`;
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return "-";
    if (String(timeStr).includes("T")) {
      const timePart = timeStr.split("T")[1];
      if (timePart) return timePart.slice(0, 5);
    }
    return timeStr.length >= 5 ? timeStr.slice(0, 5) : timeStr;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  /** Confirm → FAKAT saqlash + Success modal (Octo yo‘q) */
  const handleConfirm = (e) => {
    e.preventDefault();

    // Booking ma'lumotlari to'liqmi?
    if (!bookingInfo.checkIn || !bookingInfo.checkOutTime || !bookingInfo.duration || !bookingInfo.rooms) {
      toast.error(t("Siz ma'lumotlarni to'liq kiritmadingiz!") || "Iltimos, barcha booking ma'lumotlarini to'ldiring!", {
        position: "top-center",
        autoClose: 3000,
      });
      return;
    }

    // Form to‘liqmi?
    const { firstName, lastName, phone, email } = formData;
    if (!firstName.trim() || !lastName.trim() || !phone.trim() || !email.trim()) {
      toast.error(t("Iltimos, barcha maydonlarni to'ldiring") || "Please fill all fields", {
        position: "top-center",
        autoClose: 3000,
      });
      return;
    }

    if (!durationKey) {
      toast.error(t("Duration no valid") || "Duration no valid", {
        position: "top-center",
        autoClose: 3000,
      });
      return;
    }

    const priceEur = Number(price);
    if (!Number.isFinite(priceEur) || priceEur <= 0) {
      toast.error(t("Price not available") || "Price not available for selected options", {
        position: "top-center",
        autoClose: 3000,
      });
      return;
    }

    // localStorage/sessionStorage’ga to‘liq bookingni saqlab qo‘yamiz (SPA oqimi uchun)
    const fullBookingInfo = {
      ...bookingInfo,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone.trim(),
      email: email.trim(),
      price: priceEur,
      createdAt: new Date().toISOString(),
    };

    try {
      const existingBookings = JSON.parse(sessionStorage.getItem("allBookings") || "[]");
      const updatedBookings = [fullBookingInfo, ...existingBookings]; // eng yangisi boshida
      sessionStorage.setItem("allBookings", JSON.stringify(updatedBookings));
      sessionStorage.setItem("bookingInfo", JSON.stringify(fullBookingInfo));
      localStorage.setItem("bookingInfo", JSON.stringify(fullBookingInfo));
      localStorage.setItem("allBookings", JSON.stringify(updatedBookings));
    } catch (err) {
      console.error("RoomModal: Storage error:", err);
      toast.error(t("Ma'lumotlarni saqlashda xatolik yuz berdi!") || "Error saving booking info", {
        position: "top-center",
        autoClose: 4000,
      });
      return;
    }

    // ✅ Endi faqat success modalni ko‘rsatamiz
    setShowSuccess(true);
  };

  const handleStayHere = () => {
    setShowSuccess(false);
    onClose && onClose();
  };

  const handleGoToMyBooking = () => {
    window.location.href = "/mybooking";
  };

  if (!isOpen) return null;
  if (showSuccess) {
    return <SuccessModal onStayHere={handleStayHere} onGoToMyBooking={handleGoToMyBooking} />;
  }

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
            <label>{t("check-in-hours") || "Check-Out Time"}:</label>
            <p>{bookingInfo.checkOutTime ? formatTime(bookingInfo.checkOutTime) : "-"}</p>
          </div>
          <div className="modal__section">
            <label>{t("duration") || "Duration"}:</label>
            <p>{bookingInfo.duration ? (t(normalizeDuration(bookingInfo.duration)) || bookingInfo.duration) : "-"}</p>
          </div>
          <div className="modal__section">
            <label>{t("rooms") || "Rooms"}:</label>
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

          {/* Payment method (hozircha ko‘rsatmacha sifatida) */}
          <div className="modal__field custom-select">
            <label htmlFor="payment-method">{t("paymentMethod") || "Payment Method"}</label>
            <div className="input-wrapper">
              <img src="/28.png" alt="Octobank" className="input-icon" />
              <input id="payment-method" value="Octobank" disabled />
            </div>
          </div>

          <div className="total-price-display">
            <label>{t("totalPrice") || "Total Price"}:</label>
            <p style={{ fontWeight: "600", color: "#f7931e", marginTop: "0.2rem" }}>
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
