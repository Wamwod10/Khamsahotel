import React, { useState, useEffect } from "react";
import "./header.scss";
import "./headerMedia.scss";
import { FaWifi, FaChevronDown } from "react-icons/fa";
import { IoTimeOutline } from "react-icons/io5";
import { GiCoffeeCup } from "react-icons/gi";
import { useTranslation } from "react-i18next";
import { AiOutlineSafety } from "react-icons/ai";
import { FaCircleCheck } from "react-icons/fa6";
import { MdOutlineCancel } from "react-icons/md";
import { useNavigate, useLocation } from "react-router-dom";
import { TbAirConditioning } from "react-icons/tb";
import { RiDrinks2Fill } from "react-icons/ri";

// 🔗 Backend bazaviy URL (env orqali ham, default ham)
const API_BASE =
  (typeof import.meta !== "undefined" && import.meta.env &&
    (import.meta.env.VITE_API_BASE || import.meta.env.VITE_API_BASE_URL)) ||
  window.__API_BASE__ ||
  "https://hotel-backend-bmlk.onrender.com";


const Header = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const [checkIn, setCheckIn] = useState("");
  const [checkOutTime, setCheckOutTime] = useState("");
  const [duration, setDuration] = useState("Up to 3 hours");
  const [rooms, setRooms] = useState("Standard Room");
  const [submitting, setSubmitting] = useState(false);

  const today = new Date().toISOString().split("T")[0];

  // i18n label -> kanonik nomga map
  const normalizeRoom = (val) => {
    const v = (val || "").toLowerCase();
    // Tarjima kalitlari yoki ko'rsatilgan matnlarni qo'llab-quvvatlash
    if (v.includes("family") || v.includes(t("family").toLowerCase())) return "Family Room";
    return "Standard Room";
  };

  const normalizeDuration = (val) => {
    const v = (val || "").toLowerCase();
    if (v.includes("10") || v.includes(t("upTo10Hours").toLowerCase())) return "Up to 10 hours";
    if (v.includes("one") || v.includes("1") || v.includes(t("oneDay").toLowerCase())) return "One day";
    return "Up to 3 hours";
  };

  useEffect(() => {
    if (location.state?.clearSearch) {
      localStorage.removeItem("bookingInfo");
      setCheckIn("");
      setCheckOutTime("");
      setDuration("Up to 3 hours");
      setRooms("Standard Room");
    }
  }, [location.state, t]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!checkIn || !checkOutTime || !duration || !rooms) {
      alert(t("fillAllFields") || "Please fill in all fields!");
      return;
    }

    setSubmitting(true);

    try {
      // nights – ichki hisob: 3/10 soat ham, “one day” ham serverda hal bo‘ladi, nights=1 kifoya
      const params = new URLSearchParams({
        checkIn,
        nights: "1",
      });

      // 🔎 Backenddan availability
      const resp = await fetch(`${API_BASE}/api/availability?${params.toString()}`);
      const availData = await resp.json();

      const roomsCanonical = normalizeRoom(rooms);
      const durationCanonical = normalizeDuration(duration);

      // Family tanlangan bo'lsa tekshiruv
      if (roomsCanonical === "Family Room") {
        const famFree = availData?.availability?.family?.free ?? 0;
        if (Number(famFree) <= 0) {
          alert(
            t("familyNotAvailable") ||
              "Family room is not available for the selected time. Please choose Standard."
          );
          setSubmitting(false);
          return;
        }
      }
      // Standard uchun frontendda cheklov yo'q (backend ham 0 chiqsa 1 qilib beradi)

      const formattedCheckOut = `${checkIn}T${checkOutTime}`;
      const bookingInfo = {
        checkIn,
        checkOut: formattedCheckOut,
        checkOutTime,
        duration: durationCanonical, // kanonik
        rooms: roomsCanonical, // kanonik
        hotel: t("TashkentAirportHotel"),
        timestamp: new Date().toISOString(),
        availability: availData?.availability || null, // 📦 keyingi sahifalar uchun
      };

      localStorage.setItem("bookingInfo", JSON.stringify(bookingInfo));
      navigate("/rooms");
    } catch (err) {
      console.error("availability fetch error:", err);
      alert(t("serverError") || "Server error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <header className="header">
      <div className="container">
        <div className="header__big-box">
          <div className="header__box">
            <h1 className="header__title">
              {t("headertitle")} <span>{t("khamsahotel")}</span>
            </h1>
            <p className="header__text">{t("headertext")}</p>
            <div className="header__conditions-box">
              <p className="header__conditions-text"><FaWifi /> {t("freewifi")}</p>
              <p className="header__conditions-text"><TbAirConditioning /> {t("freeparking")}</p>
              <p className="header__conditions-text"><RiDrinks2Fill /> {t("cafe")}</p>
              <p className="header__conditions-text"><IoTimeOutline /> {t("service24/7")}</p>
            </div>
          </div>

          <form className="header__form" onSubmit={handleSubmit}>
            <h2 className="header__form-title">{t("bookyourstay")}</h2>
            <p className="header__form-text">{t("booktext")}</p>

            <div className="header__form-row">
              <div className="header__form-group">
                <label htmlFor="checkin">{t("check-in")}</label>
                <input
                  id="checkin"
                  type="date"
                  value={checkIn}
                  min={today}
                  onChange={(e) => setCheckIn(e.target.value)}
                  required
                />
              </div>

              <div className="header__form-group">
                <label htmlFor="checkin-hours">{t("check-in-hours")}</label>
                <input
                  id="checkin-hours"
                  type="time"
                  value={checkOutTime}
                  onChange={(e) => setCheckOutTime(e.target.value)}
                  required
                  disabled={!checkIn}
                />
              </div>
            </div>

            <div className="header__form-row">
              <div className="header__form-group">
                <label htmlFor="duration">{t("duration")}</label>
                <div className="custom-select">
                  <select
                    id="duration"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                  >
                    <option>{t("upTo3Hours")}</option>
                    <option>{t("upTo10Hours")}</option>
                    <option>{t("oneDay")}</option>
                  </select>
                  <FaChevronDown className="select-icon" />
                </div>
              </div>

              <div className="header__form-group">
                <label htmlFor="rooms">{t("rooms")}</label>
                <div className="custom-select">
                  <select
                    id="rooms"
                    value={rooms}
                    onChange={(e) => setRooms(e.target.value)}
                  >
                    <option>{t("standard")}</option>
                    <option>{t("family")}</option>
                  </select>
                  <FaChevronDown className="select-icon" />
                </div>
              </div>
            </div>

            <div className="header__form-group full-width">
              <label htmlFor="hotel">{t("hotel")}</label>
              <input id="hotel" value={t("TashkentAirportHotel")} disabled />
            </div>

            <button
              type="submit"
              className="header__form-button"
              disabled={!checkIn || !checkOutTime || submitting}
            >
              {submitting ? (t("loading") || "Loading...") : (t("checkavailable"))}
            </button>

            <div className="header__info-row">
              <span className="header__color1"><AiOutlineSafety /> {t("secure")}</span>
              <span className="header__color2"><FaCircleCheck /> {t("instantconfirm")}</span>
              <span className="header__color3"><MdOutlineCancel /> {t("freecancel")}</span>
            </div>
          </form>
        </div>
      </div>
    </header>
  );
};

export default Header;
