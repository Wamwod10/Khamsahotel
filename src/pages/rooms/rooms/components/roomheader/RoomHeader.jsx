import React, { useEffect, useState } from "react";
import { FaHotel, FaBed, FaClock } from "react-icons/fa";
import { IoCalendar } from "react-icons/io5";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import "./RoomHeader.scss";

export default function RoomHeader() {
  const { t } = useTranslation();
  const location = useLocation(); 

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
        setBookingInfo({
          checkIn: data.checkIn,
          checkOut: data.checkOut,
          checkOutTime: data.checkOutTime,
          duration: data.duration,
          rooms: data.rooms,
          hotel: data.hotel || t("TashkentAirportHotel"),
        });
      } catch (error) {
        console.error("Error parsing bookingInfo:", error);
      }
    }
  }, [location.key, t]);

  const formatDate = (dateString) => {
    if (!dateString) return t("selectDate");
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (timeString) => {
    if (!timeString) return t("selectTime");
    if (timeString.includes("T")) {
      const date = new Date(timeString);
      return date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
    }
    return timeString;
  };

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
};
