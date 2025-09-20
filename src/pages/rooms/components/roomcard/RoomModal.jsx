// RoomModal.jsx
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { FaCheck } from "react-icons/fa";
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

// Qo'shish: agar kelajakda boshqa room turlari bo'lsa, ular ham shu yerga qo'shilsin
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
  // Fallback uchun bo'sh narxlar (yoki boshqa turlar bo'lsa)
  "2 Standard Rooms": {
    upTo3Hours: 80,
    upTo10Hours: 120,
    oneDay: 200,
  },
  "2 Family Rooms": {
    upTo3Hours: 140,
    upTo10Hours: 200,
    oneDay: 300,
  },
  "Standard + 1 Family room": {
    upTo3Hours: 110,
    upTo10Hours: 160,
    oneDay: 250,
  }
};

const normalizeDuration = (duration) => {
  if (!duration || typeof duration !== "string") {
    console.warn("normalizeDuration: duration invalid:", duration);
    return "";
  }
  const d = duration.toLowerCase();

  // misollar: "Up to 3 hours", "3 soat", "3 hours", "10 hours", "1 day", "kun", va h.k.
  if (d.includes("3") && (d.includes("hour") || d.includes("soat") || d.includes("saat"))) {
    return "upTo3Hours";
  }
  if (d.includes("10") && (d.includes("hour") || d.includes("soat") || d.includes("saat"))) {
    return "upTo10Hours";
  }
  if (
    (d.includes("1") || d.includes("bir")) &&
    (d.includes("day") || d.includes("kun") || d.includes("день"))
  ) {
    return "oneDay";
  }

  // Agar tushinarsiz duratsiya bo'lsa, fallback
  console.warn("normalizeDuration: unable to match duration:", duration);
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

const RoomModal = ({ isOpen, onClose, guests: propGuests, rooms: propRooms }) => {
  const { t } = useTranslation();

  const [bookingInfo, setBookingInfo] = useState({
    checkIn: "",
    checkOutTime: "",
    duration: "",
    hotel: t("TashkentAirportHotel") || "Tashkent Airport Hotel",
    guests: propGuests || 1,
    rooms: propRooms || "",
  });

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
  });

  const [showSuccess, setShowSuccess] = useState(false);

  // Yüklangan ma'lumotlar localStorage dan
  useEffect(() => {
    let parsed = null;
    try {
      const saved = localStorage.getItem("bookingInfo");
      if (saved) {
        parsed = JSON.parse(saved);
      }
    } catch (err) {
      console.error("RoomModal: Error parsing bookingInfo from localStorage:", err);
    }

    if (parsed && typeof parsed === "object") {
      // Tekshirish: parsed’da rooms va duration bo‘lishi kerak
      const roomsVal = parsed.rooms || propRooms || "";
      const durationVal = parsed.duration || "";

      setBookingInfo({
        checkIn: parsed.checkIn || "",
        checkOutTime: parsed.checkOutTime || "",
        duration: durationVal,
        hotel: parsed.hotel || (t("TashkentAirportHotel") || "Tashkent Airport Hotel"),
        guests: guestCountByRoomType[roomsVal] || propGuests || 1,
        rooms: roomsVal,
      });
    } else {
      // Agar localStorage’da ma’lumot yo‘q bo‘lsa yoki yaroqsiz bo‘lsa
      setBookingInfo((prev) => ({
        ...prev,
        guests: guestCountByRoomType[propRooms] || propGuests || 1,
        rooms: propRooms || "",
        hotel: t("TashkentAirportHotel") || "Tashkent Airport Hotel",
      }));
    }
  }, [t, propGuests, propRooms]);

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const parts = dateStr.split("-");
    if (parts.length !== 3) return dateStr;
    const [year, month, day] = parts;
    return `${day}.${month}.${year}`;
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return "-";
    // Agar timeStr format DateTime bo'lsa: "YYYY-MM-DDTHH:MM:SS..."
    if (timeStr.includes("T")) {
      const timePart = timeStr.split("T")[1];
      if (timePart) return timePart.slice(0,5); // HH:MM
    }
    // yoki to'g'ridan format bo'lsa
    return timeStr.length >=5 ? timeStr.slice(0,5) : timeStr;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleConfirm = (e) => {
    e.preventDefault();

    // Kerakli bookingInfo qiymatlari bo'lishini tekshirish
    if (!bookingInfo.checkIn || !bookingInfo.checkOutTime || !bookingInfo.duration || !bookingInfo.rooms) {
      toast.error(t("Siz ma'lumotlarni to'liq kiritmadingiz!") || "Iltimos, barcha booking ma'lumotlarini to'ldiring!", {
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

    const durationKey = normalizeDuration(bookingInfo.duration);
    if (!durationKey) {
      toast.error(t("Duration no valid") || "Duration no valid", {
        position: "top-center",
        autoClose: 3000,
      });
      return;
    }

    // rooms ham priceTable ichida bo'lishi kerak
    const roomKey = bookingInfo.rooms;
    const roomPricing = priceTable[roomKey];
    if (!roomPricing) {
      toast.error(t("Room type no valid") || "Room type not valid for pricing", {
        position: "top-center",
        autoClose: 3000,
      });
      return;
    }

    const price = roomPricing[durationKey];
    if (price === undefined || price === null) {
      toast.error(t("Price not available") || "Price not available for selected options", {
        position: "top-center",
        autoClose: 3000,
      });
      return;
    }

    const fullBookingInfo = {
      ...bookingInfo,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone.trim(),
      email: email.trim(),
      price,
    };

    try {
      const existingBookings = JSON.parse(sessionStorage.getItem("allBookings")) || [];
      const updatedBookings = [...existingBookings, fullBookingInfo];
      sessionStorage.setItem("allBookings", JSON.stringify(updatedBookings));
      sessionStorage.setItem("bookingInfo", JSON.stringify(fullBookingInfo));
      localStorage.setItem("bookingInfo", JSON.stringify(fullBookingInfo));
    } catch (err) {
      console.error("RoomModal: Storage error:", err);
      toast.error(t("Ma'lumotlarni saqlashda xatolik yuz berdi!") || "Error saving booking info", {
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

  const handleGoToMyBooking = () => {
    // Agar SPA bo'lsa, Router’dagi yo’naltirish; a’gar link bo'lsa window.location...
    window.location.href = "/mybooking";
  };

  if (!isOpen) {
    return null;
  }

  if (showSuccess) {
    return <SuccessModal onStayHere={handleStayHere} onGoToMyBooking={handleGoToMyBooking} />;
  }

  const durationKey = normalizeDuration(bookingInfo.duration);
  const roomKey = bookingInfo.rooms;
  const roomPricing = priceTable[roomKey];
  let priceDisplay = "-";

  if (roomPricing && durationKey && roomPricing[durationKey] !== undefined && roomPricing[durationKey] !== null) {
    priceDisplay = `${roomPricing[durationKey]}€`;
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
            <label>{t("check-in") || "Check‑In"}:</label>
            <p>{formatDate(bookingInfo.checkIn)}</p>
          </div>
          <div className="modal__section">
            <label>{t("check-in-hours") || "Check‑Out Time"}:</label>
            <p>{formatTime(bookingInfo.checkOutTime)}</p>
          </div>
          <div className="modal__section">
            <label>{t("duration") || "Duration"}:</label>
            <p>{bookingInfo.duration ? t(durationKey) || bookingInfo.duration : "-"}</p>
          </div>
          <div className="modal__section">
            <label>{t("rooms") || "Rooms"}:</label>
            <p>{roomKey ? (t(roomKeyMap[roomKey]) || roomKey) : "-"}</p>
          </div>
          <div className="modal__section">
            <label>{t("guests") || "Guests"}:</label>
            <p>{guestCountByRoomType[roomKey] || "-"}</p>
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

          {/* Payment method (agar boshqa imkoniyatlar bo'lsa kengaytirilishi mumkin) */}
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
