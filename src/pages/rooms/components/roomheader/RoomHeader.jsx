import { useEffect, useState } from "react";
import { FaHotel, FaUser, FaBed, FaPen } from "react-icons/fa";
import { IoCalendar } from "react-icons/io5";
import "./RoomHeader.scss";
import { NavLink } from "react-router-dom";
import NoticePopup from "../roomcard/NoticePopup.jsx";
import { useTranslation } from "react-i18next";

export default function RoomHeader() {
  const { t } = useTranslation();
  
  const [bookingInfo, setBookingInfo] = useState({
    checkIn: "Select date",
    checkOut: "Select date",
    guests: "1 Guest",
    rooms: "Standard Room",
    hotel: "Tashkent Airport Hotel",
  });

  const [showNotice, setShowNotice] = useState(false);
  const [noticeMessage, setNoticeMessage] = useState("");

  useEffect(() => {
    const savedData = localStorage.getItem("bookingInfo");
    if (savedData) {
      const data = JSON.parse(savedData);
      setBookingInfo(data);

      const guestNum = parseInt(data.guests);

      if (guestNum > 3) {
        setNoticeMessage(
          "Hurmatli mijoz, Bizda 3 kishigacha bo'lgan xonalarimiz mavjud. Iltimos, qo'shimcha mehmonlar uchun alohida xona tanlashni ko'rib chiqing. Asosiy saxifada sizga mos bo'lgan variantlarni ko'rishingiz mumkin."
        );
        setShowNotice(true);
      }
    }
  }, []);

  const { checkIn, checkOut, guests, rooms,} = bookingInfo;

  const handleBack = () => {
    setShowNotice(false);
  };

  const handleContinue = () => {
    setShowNotice(false);
  };

  return (
    <div className="room-header">
      <div className="container">
        <div className="room-header__box">
          <div className="room-header__item">
            <IoCalendar className="room-header__icon" />
            <div>
              <p className="room-header__label">{t("check-in")}</p>
              <p className="room-header__value">{checkIn}</p>
            </div>
          </div>

          <div className="room-header__item">
            <IoCalendar className="room-header__icon" />
            <div>
              <p className="room-header__label">{t("check-out")}</p>
              <p className="room-header__value">{checkOut}</p>
            </div>
          </div>

          <div className="room-header__item">
            <FaUser className="room-header__icon" />
            <div>
              <p className="room-header__label">{t("guests")}</p>
              <p className="room-header__value">{guests}</p>
            </div>
          </div>

          <div className="room-header__item">
            <FaBed className="room-header__icon" />
            <div>
              <p className="room-header__label">{t("rooms")}</p>
              <p className="room-header__value">{rooms}</p>
            </div>
          </div>

          <div className="room-header__item">
            <FaHotel className="room-header__icon" />
            <div>
              <p className="room-header__label">{t("hotel")}</p>
              <p className="room-header__value">{t("TashkentAirportHotel")}</p>
            </div>
          </div>
        </div>

        <NavLink to="/" className="room-header__button">
          <FaPen className="room-header__button-icon" />
          Modify Search
        </NavLink>
      </div>

      {/* Notice Popup */}
      {showNotice && (
        <NoticePopup
          message={noticeMessage}
          onBack={handleBack}
          onContinue={handleContinue}
        />
      )}
    </div>
  );
}
