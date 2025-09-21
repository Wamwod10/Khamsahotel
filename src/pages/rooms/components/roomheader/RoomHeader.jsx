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
    duration: null,      // canonical: "Up to 3 hours" | "Up to 10 hours" | "One day"
    rooms: null,         // canonical: "Standard Room" | "Family Room"
    hotel: null,
    availability: null,  // { standard:{free,total}, family:{free,total} }
  });

  // === Helpers: format ===
  const formatDate = (dateString) => {
    if (!dateString) return t("selectDate");
    try {
      const date = new Date(dateString);
      const day = String(date.getDate()).padStart(2, "0");
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const year = date.getFullYear();
      return `${day}.${month}.${year}`;
    } catch {
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
    } catch {
      return timeString;
    }
  };

  // === Helpers: i18n mapping (canonical → label) ===
  const roomLabel = (val) => {
    const v = (val || "").toLowerCase();
    if (v.includes("family")) return t("family");
    return t("standard");
  };

  const durationLabel = (val) => {
    const v = (val || "").toLowerCase();
    if (v.includes("10")) return t("upTo10Hours");
    if (v.includes("one") || v.includes("1")) return t("oneDay");
    return t("upTo3Hours");
  };

  useEffect(() => {
    // ✅ localStorage dan o‘qish
    const saved = localStorage.getItem("bookingInfo");
    if (!saved) return;
    try {
      const data = JSON.parse(saved);
      setBookingInfo({
        checkIn: data.checkIn || null,
        checkOut: data.checkOut || null,
        checkOutTime: data.checkOutTime || null,
        duration: data.duration || null,       // canonical keldi (Header.jsx da normalize qilingan)
        rooms: data.rooms || null,             // canonical keldi
        hotel: data.hotel || t("TashkentAirportHotel"),
        availability: data.availability || null,
      });
    } catch (e) {
      console.error("Error parsing bookingInfo:", e);
    }
  }, [location.key, t]);

  // === Availability badges ===
  const stdFree = bookingInfo.availability?.standard?.free ?? null;
  const stdTotal = bookingInfo.availability?.standard?.total ?? null;
  const famFree = bookingInfo.availability?.family?.free ?? null;
  const famTotal = bookingInfo.availability?.family?.total ?? null;

  const familySelectedButUnavailable =
    (bookingInfo.rooms || "").toLowerCase().includes("family") && typeof famFree === "number" && famFree <= 0;

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
              {bookingInfo.duration ? durationLabel(bookingInfo.duration) : t("notSelected")}
            </p>
          </div>
        </div>

        <div className="room-header__item">
          <FaBed className="room-header__icon" />
          <div>
            <p className="room-header__label">{t("rooms")}</p>
            <p className="room-header__value">
              {bookingInfo.rooms ? roomLabel(bookingInfo.rooms) : t("notSelected")}
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

      {/* Availability pilllar (bor bo'lsa) */}
      {bookingInfo.availability && (
        <div className="room-header__availability">
          <span className="room-header__badge">
            {t("standard")}: {typeof stdFree === "number" ? stdFree : "—"}/{typeof stdTotal === "number" ? stdTotal : "—"}
          </span>
          <span
            className={`room-header__badge ${familySelectedButUnavailable ? "room-header__badge--warn" : ""}`}
            title={familySelectedButUnavailable ? (t("familyNotAvailable") || "Family room is not available") : ""}
          >
            {t("family")}: {typeof famFree === "number" ? famFree : "—"}/{typeof famTotal === "number" ? famTotal : "—"}
          </span>
        </div>
      )}

      <NavLink to="/" className="room-header__button">
        <IoSearch className="room-header-icon" />
        {t("modifysearch")}
      </NavLink>
    </div>
  );
}
