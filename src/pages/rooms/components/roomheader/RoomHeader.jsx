import React, { useEffect, useState } from "react";
import { FaHotel, FaBed, FaClock } from "react-icons/fa";
import { IoCalendar, IoSearch } from "react-icons/io5";
import { useTranslation } from "react-i18next";
import { NavLink, useLocation } from "react-router-dom";
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
    // ✅ localStorage dan o‘qiydi
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

    try {
      const date = new Date(dateString);
      const day = String(date.getDate()).padStart(2, "0");
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const year = date.getFullYear();
      return `${day}.${month}.${year}`;
    } catch (error) {
      return dateString;
    }
  };

  const formatTime = (timeString) => {
    if (!timeString) return t("selectTime");

    try {
      if (timeString.includes("T")) {
        return timeString.split("T")[1]?.slice(0, 5);
      }
      return timeString.slice(0, 5);
    } catch (error) {
      return timeString;
    }
  };

  return (
    <div className="room-header">
      <div className="room-header__box">
        <div className="room-header__item">
          <IoCalendar className="room-header__icon" />
          <div>
            <p className="room-header__label">{t("check-in")}</p>
            <p className="room-header__value">
              {bookingInfo.checkIn ? formatDate(bookingInfo.checkIn) : t("selectDate")}
            </p>
          </div>
        </div>

        <div className="room-header__item">
          <IoCalendar className="room-header__icon" />
          <div>
            <p className="room-header__label">{t("check-in-hours")}</p>
            <p className="room-header__value">
              {bookingInfo.checkOutTime ? formatTime(bookingInfo.checkOutTime) : t("selectTime")}
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

      <NavLink to="/" className="room-header__button">
        <IoSearch className="room-header-icon" />
        {t("modifysearch")}
      </NavLink>
    </div>
  );
}
