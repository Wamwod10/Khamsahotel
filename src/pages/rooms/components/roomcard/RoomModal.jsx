import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./roommodal.scss";
import './roomModalMedai.scss';
const roomKeyMap = {
  "Standard Room": "roomType_standard",
  "Family Room": "roomType_family",
  "2 Standard Rooms": "roomType_twoStandard",
  "2 Family Rooms": "roomType_twoFamily",
  "Standard + 1 Family room": "roomType_mixed",
};

const RoomModal = ({ isOpen, onClose, guests, rooms }) => {
  const { t } = useTranslation();

  const [bookingInfo, setBookingInfo] = useState({
    checkIn: "",
    checkOut: "",
    hotel: t("TashkentAirportHotel"),
  });

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
  });

  useEffect(() => {
    const saved = sessionStorage.getItem("bookingInfo");
    if (saved) {
      const parsed = JSON.parse(saved);
      setBookingInfo({
        checkIn: parsed.checkIn,
        checkOut: parsed.checkOut,
        hotel: t("TashkentAirportHotel"),
      });
    }
  }, [t]);

  const { checkIn, checkOut, hotel } = bookingInfo;

  if (!isOpen) return null;

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleConfirm = (e) => {
    e.preventDefault();

    if (!checkIn || checkIn === "-" || !checkOut || checkOut === "-") {
      toast.error(t("Siz ma'lumotlarni to'liq kiritmadingiz"), {
        position: "top-center",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        style: { opacity: 1, zIndex: 99999 },
        toastId: "incomplete-dates-toast",
      });
      return;
    }

    // ✅ Avval modalni yopamiz
    onClose();

    // ✅ Toastni keyin ko‘rsatamiz
    toast.success(t("Sizning xonangiz bron qilindi"), {
      position: "top-center",
      autoClose: 2500,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: false,
      draggable: false,
      style: { opacity: 1, zIndex: 99999 },
    });
  };

  return (
    <div className="modal-main">
      <div className="modal-overlay" onClick={onClose} />
      <div className="modal">
        <h2 className="modal__title">{t("bookyourstay")}</h2>

        <div className="modal_all__section">
          <div className="modal__section">
            <label>{t("check-in")}:</label>
            <p>{checkIn || "-"}</p>
          </div>

          <div className="modal__section">
            <label>{t("check-out")}:</label>
            <p>{checkOut || "-"}</p>
          </div>

          <div className="modal__section">
            <label>{t("rooms")}:</label>
            <p>{rooms ? t(roomKeyMap[rooms] || rooms) : "-"}</p>
          </div>

          <div className="modal__section">
            <label>{t("guests")}:</label>
            <p>{guests || "-"}</p>
          </div>
        </div>

        <div className="modal__section">
          <label>{t("hotel")}:</label>
          <p>{hotel}</p>
        </div>

        <form className="modal__form" onSubmit={handleConfirm}>
          <div className="modal__field">
            <label>{t("firstName")}</label>
            <input
              type="text"
              name="firstName"
              placeholder={t("enterFirstName")}
              required
              value={formData.firstName}
              onChange={handleInputChange}
            />
          </div>

          <div className="modal__field">
            <label>{t("lastName")}</label>
            <input
              type="text"
              name="lastName"
              placeholder={t("enterLastName")}
              required
              value={formData.lastName}
              onChange={handleInputChange}
            />
          </div>

          <div className="modal__field">
            <label>{t("phone")}</label>
            <input
              type="tel"
              name="phone"
              placeholder={t("enterphonenumb")}
              required
              value={formData.phone}
              onChange={handleInputChange}
            />
          </div>

          <div className="modal__field">
            <label>{t("email")}</label>
            <input
              type="email"
              name="email"
              placeholder="you@example.com"
              required
              value={formData.email}
              onChange={handleInputChange}
            />
          </div>

          <div className="modal__field custom-select">
            <label htmlFor="payment-method">{t("paymentMethod")}</label>
            <div className="input-wrapper">
              <img src="/28.png" alt="Octobank" className="input-icon" />
              <input
                id="payment-method"
                name="payment-method"
                value="Octobank"
                disabled
              />
            </div>
          </div>

          <div className="modal__buttons">
            <button type="submit" className="modal__confirm">
              {t("confirm")}
            </button>
            <button
              type="button"
              className="modal__cancel"
              onClick={onClose}
            >
              {t("cancel")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RoomModal;
