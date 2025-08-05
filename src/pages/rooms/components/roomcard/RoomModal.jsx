import React, { useEffect, useState } from "react";
import { MdArrowDropDown } from "react-icons/md";
import { useTranslation } from "react-i18next";
import "./roommodal.scss";

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

  useEffect(() => {
    const saved = localStorage.getItem("bookingInfo");
    if (saved) {
      const parsed = JSON.parse(saved);
      setBookingInfo({
        checkIn: parsed.checkIn,
        checkOut: parsed.checkOut,
        hotel: t("TashkentAirportHotel"),
      });
    }
  }, [t]);

  if (!isOpen) return null;

  const { checkIn, checkOut, hotel } = bookingInfo;

  return (
    <div className="modal-main">
      <div className="modal-overlay">
        <div className="modal">
          <h2 className="modal__title">{t("bookyourstay")}</h2>

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
            <p>{guests ? t(guests) : "-"}</p>
          </div>

          <div className="modal__section">
            <label>{t("hotel")}:</label>
            <p>{hotel}</p>
          </div>

          {/* Form */}
          <form className="modal__form">
            <div className="modal__field">
              <label>{t("firstName")}</label>
              <input type="text" placeholder={t("enterFirstName")} required />
            </div>
            <div className="modal__field">
              <label>{t("lastName")}</label>
              <input type="text" placeholder={t("enterLastName")} required />
            </div>
            <div className="modal__field">
              <label>{t("phone")}</label>
              <input type="tel" placeholder={t("enterphonenumb")} required />
            </div>
            <div className="modal__field">
              <label>{t("email")}</label>
              <input type="email" placeholder="Your@gmail.com" required />
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

            {/* Buttons */}
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
    </div>
  );
};

export default RoomModal;
