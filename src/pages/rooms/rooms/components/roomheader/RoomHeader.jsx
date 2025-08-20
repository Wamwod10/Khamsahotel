import React, { useEffect, useState } from "react";
import { FaHotel, FaBed, FaClock } from "react-icons/fa";
import { IoCalendar } from "react-icons/io5";
import { useTranslation } from "react-i18next";
import "./RoomHeader.scss";

export default function RoomHeader() {
  const { t } = useTranslation();

  const [bookingInfo, setBookingInfo] = useState({
    checkIn: null,
    checkOut: null,
    checkOutTime: null,
    duration: null,
    rooms: null,
    hotel: null,
  });

  useEffect(() => {
    const savedData = localStorage.getItem("bookingInfo");
    if (savedData) {
      try {
        const data = JSON.parse(savedData);
        console.log("Loaded from localStorage:", data);
        
        setBookingInfo({
          checkIn: data.checkIn || null,
          checkOut: data.checkOut || null,
          checkOutTime: data.checkOutTime || null,
          duration: data.duration || null,
          rooms: data.rooms || null,
          hotel: data.hotel || t("TashkentAirportHotel"),
        });
      } catch (error) {
        console.error("Error parsing localStorage data:", error);
      }
    }
  }, [t]);

  // Sana va vaqtni formatlash funksiyasi
  const formatDate = (dateString) => {
    if (!dateString) return t("selectDate");
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      return dateString;
    }
  };

  // Vaqtni formatlash funksiyasi
  const formatTime = (timeString) => {
    if (!timeString) return t("selectTime");
    
    try {
      // Agar to'liq ISO string bo'lsa
      if (timeString.includes('T')) {
        const date = new Date(timeString);
        return date.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        });
      }
      
      // Agar faqat vaqt bo'lsa (HH:MM formatida)
      return timeString;
    } catch (error) {
      return timeString;
    }
  };

  // Check-out ni to'liq ko'rsatish
  const getCheckOutDisplay = () => {
    if (bookingInfo.checkOut) {
      const date = formatDate(bookingInfo.checkOut);
      const time = formatTime(bookingInfo.checkOutTime || bookingInfo.checkOut);
      return `${date} ${time}`;
    }
    return t("selectTime");
  };

  return (
    <div className="room-header">
      <div className="room-header__box">
        <div className="room-header__item">
          <IoCalendar className="room-header__icon" />
          <div>
            <p className="room-header__label">{t("check-in")}</p>
            <p className="room-header__value">
              {formatDate(bookingInfo.checkIn)}
            </p>
          </div>
        </div>

        <div className="room-header__item">
          <IoCalendar className="room-header__icon" />
          <div>
            <p className="room-header__label">{t("check-out")}</p>
            <p className="room-header__value">
              {getCheckOutDisplay()}
            </p>
          </div>
        </div>

        <div className="room-header__item">
          <FaClock className="room-header__icon" />
          <div>
            <p className="room-header__label">{t("duration")}</p>
            <p className="room-header__value">
              {bookingInfo.duration || t("notSelected")}
            </p>
          </div>
        </div>

        <div className="room-header__item">
          <FaBed className="room-header__icon" />
          <div>
            <p className="room-header__label">{t("rooms")}</p>
            <p className="room-header__value">
              {bookingInfo.rooms || t("notSelected")}
            </p>
          </div>
        </div>

        <div className="room-header__item">
          <FaHotel className="room-header__icon" />
          <div>
            <p className="room-header__label">{t("hotel")}</p>
            <p className="room-header__value">
              {bookingInfo.hotel || t("notSelected")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}