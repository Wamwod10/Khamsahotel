import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./roommodal.scss";
import "./roomModalMedia.scss";

const roomKeyMap = {
  "Standard Room": "roomType_standard",
  "Family Room": "roomType_family",
  "2 Standard Rooms": "roomType_twoStandard",
  "2 Family Rooms": "roomType_twoFamily",
  "Standard + 1 Family room": "roomType_mixed",
};

const guestCountByRoomType = {
  "Standard Room": 1,
  "Family Room": 3,
  "2 Standard Rooms": 2,
  "2 Family Rooms": 6,
  "Standard + 1 Family room": 4,
};

// 🔥 PriceTable – faqat inglizcha kalitlar
const priceTable = {
  "Standard Room": {
    upTo3Hours: 40,
    upTo10Hours: 60,
    oneDay: 100,
  },
  "Family Room": {
    upTo3Hours: 70,
    upTo10Hours: 100,
    oneDay: 150,
  },
};

// 🔧 Duration normalizatsiya qiluvchi funksiya
const normalizeDuration = (duration) => {
  if (!duration) return "";

  const d = duration.toLowerCase();

  if (d.includes("3")) return "upTo3Hours";
  if (d.includes("10")) return "upTo10Hours";
  if (d.includes("1") && (d.includes("day") || d.includes("kun") || d.includes("день"))) {
    return "oneDay";
  }

  return duration; // fallback
};

const RoomModal = ({ isOpen, onClose, guests, rooms }) => {
  const { t } = useTranslation();
  const API_BASE = import.meta.env.VITE_API_BASE_URL;

  const [bookingInfo, setBookingInfo] = useState({
    checkIn: "",
    checkOutTime: "",
    duration: "",
    hotel: t("TashkentAirportHotel"),
    guests: guests,
    rooms: rooms,
  });

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
  });

  useEffect(() => {
    const savedBooking = localStorage.getItem("bookingInfo");
    if (savedBooking) {
      const parsed = JSON.parse(savedBooking);
      setBookingInfo({
        checkIn: parsed.checkIn || "",
        checkOutTime: parsed.checkOutTime || "",
        duration: parsed.duration || "",
        hotel: parsed.hotel || t("TashkentAirportHotel"),
        guests: guestCountByRoomType[parsed.rooms] || guests,
        rooms: parsed.rooms || rooms,
      });
    } else {
      setBookingInfo((prev) => ({
        ...prev,
        guests: guestCountByRoomType[rooms] || guests,
        rooms,
        hotel: t("TashkentAirportHotel"),
      }));
    }
  }, [t, guests, rooms]);

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const [year, month, day] = dateStr.split("-");
    return `${day}.${month}.${year}`;
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return "-";
    return timeStr.length > 5 ? timeStr.slice(11, 16) : timeStr;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleConfirm = async (e) => {
    e.preventDefault();

    if (!bookingInfo.checkIn || !bookingInfo.checkOutTime) {
      toast.error(t("Siz ma'lumotlarni to'liq kiritmadingiz!"), {
        position: "top-center",
        autoClose: 3000,
      });
      return;
    }

    const { firstName, lastName, phone, email } = formData;

    if (!firstName.trim() || !lastName.trim() || !phone.trim() || !email.trim()) {
      toast.error(t("Iltimos, barcha maydonlarni to'ldiring"), {
        position: "top-center",
        autoClose: 3000,
      });
      return;
    }

    // 🔥 Narxni hisoblash uchun normalizeDuration ishlatiladi
    const durationKey = normalizeDuration(bookingInfo.duration);
    const price = priceTable[bookingInfo.rooms]?.[durationKey] || 0;

    const fullBookingInfo = {
      ...bookingInfo,
      firstName,
      lastName,
      phone,
      email,
      id: Date.now(),
      price,
    };

    const existingBookings = JSON.parse(sessionStorage.getItem("allBookings")) || [];
    const updatedBookings = [...existingBookings, fullBookingInfo];

    sessionStorage.setItem("allBookings", JSON.stringify(updatedBookings));
    sessionStorage.setItem("bookingInfo", JSON.stringify(fullBookingInfo));

    try {
      const response = await fetch(`${API_BASE}/bookings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fullBookingInfo),
      });

      if (!response.ok) {
        throw new Error(`Server xatosi: ${response.status}`);
      }

      const data = await response.json();
      console.log("✅ Booking saved to backend:", data);

      toast.success(t("Sizning xonangiz backendga ham saqlandi!"), {
        position: "top-center",
        autoClose: 4000,
      });
    } catch (err) {
      console.error("❌ Backend error:", err.message);
      toast.warn(t("Internet yo‘q yoki server ishlamayapti. Faqat localda saqlandi"), {
        position: "top-center",
        autoClose: 4000,
      });
    }

    onClose();

    toast.success(
      t("Sizning xonangiz bron qilindi, Mening Bronlarim sahifasida ko'rishingiz mumkin"),
      {
        position: "top-center",
        autoClose: 4000,
      }
    );
  };

  if (!isOpen) return null;

  const durationKey = normalizeDuration(bookingInfo.duration);
  const price = priceTable[bookingInfo.rooms]?.[durationKey] || "-";

  return (
    <div className="modal-main">
      <div className="modal-overlay" onClick={onClose} />
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <h2 className="modal__title" id="modal-title">
          {t("bookyourstay")}
        </h2>

        <div className="modal_all__section">
          <div className="modal__section">
            <label>{t("check-in")}:</label>
            <p>{formatDate(bookingInfo.checkIn)}</p>
          </div>
          <div className="modal__section">
            <label>{t("check-in-hours")}:</label>
            <p>{formatTime(bookingInfo.checkOutTime)}</p>
          </div>
          <div className="modal__section">
            <label>{t("duration")}:</label>
            <p>{t(durationKey)}</p> {/* ✅ Endi tarjima ishlaydi */}
          </div>
          <div className="modal__section">
            <label>{t("rooms")}:</label>
            <p>{rooms ? t(roomKeyMap[rooms]) : "-"}</p>
          </div>
          <div className="modal__section">
            <label>{t("guests")}:</label>
            <p>{guestCountByRoomType[rooms] || "-"}</p>
          </div>
          <div className="modal__section">
            <label>{t("hotel")}:</label>
            <p>{bookingInfo.hotel}</p>
          </div>
        </div>

        <form className="modal__form" onSubmit={handleConfirm} noValidate>
          <div className="modal__field">
            <label htmlFor="firstName">{t("firstName")}</label>
            <input
              id="firstName"
              type="text"
              name="firstName"
              placeholder={t("enterFirstName")}
              required
              value={formData.firstName}
              onChange={handleInputChange}
              autoComplete="given-name"
            />
          </div>

          <div className="modal__field">
            <label htmlFor="lastName">{t("lastName")}</label>
            <input
              id="lastName"
              type="text"
              name="lastName"
              placeholder={t("enterLastName")}
              required
              value={formData.lastName}
              onChange={handleInputChange}
              autoComplete="family-name"
            />
          </div>

          <div className="modal__field">
            <label htmlFor="phone">{t("phone")}</label>
            <input
              id="phone"
              type="tel"
              name="phone"
              placeholder={t("enterphonenumb")}
              required
              value={formData.phone}
              onChange={handleInputChange}
              autoComplete="tel"
            />
          </div>

          <div className="modal__field">
            <label htmlFor="email">{t("email")}</label>
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

          <div className="modal__field custom-select">
            <label htmlFor="payment-method">{t("paymentMethod")}</label>
            <div className="input-wrapper">
              <img src="/28.png" alt="Octobank" className="input-icon" />
              <input id="payment-method" value="Octobank" disabled />
            </div>
          </div>

          <div className="total-price-display">
            <label>{t("totalPrice")}:</label>
            <p
              style={{
                fontWeight: "600",
                color: "#f7931e",
                marginTop: "0.2rem",
              }}
            >
              {price !== "-" ? `${price}€` : "-"}
            </p>
          </div>

          <div className="modal__buttons">
            <button type="submit" className="modal__confirm">
              {t("confirm")}
            </button>
            <button type="button" className="modal__cancel" onClick={onClose}>
              {t("cancel")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RoomModal;
