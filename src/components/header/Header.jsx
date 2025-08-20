import React, { useState, useEffect } from "react";
import "./header.scss";
import "./headerMedia.scss";
import { FaWifi, FaChevronDown } from "react-icons/fa";
import { IoCarSport, IoTimeOutline } from "react-icons/io5";
import { GiCoffeeCup } from "react-icons/gi";
import { useTranslation } from "react-i18next";
import { AiOutlineSafety } from "react-icons/ai";
import { FaCircleCheck } from "react-icons/fa6";
import { MdOutlineCancel } from "react-icons/md";
import { useNavigate, useLocation } from "react-router-dom";

const Header = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const [checkIn, setCheckIn] = useState("");
  const [checkOutTime, setCheckOutTime] = useState("");
  const [duration, setDuration] = useState("Up to 2 hours");
  const [rooms, setRooms] = useState("Standard Room");

  useEffect(() => {
    if (location.state?.clearSearch) {
      localStorage.removeItem("bookingInfo");
      setCheckIn("");
      setCheckOutTime("");
      setDuration("Up to 2 hours");
      setRooms("Standard Room");
    }
  }, [location.state]);

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!checkIn || !checkOutTime || !duration || !rooms) {
      alert(t("fillAllFields") || "Please fill in all fields!");
      return;
    }

    // To'liq check-out sanasini yaratish (check-in sanasi + kiritilgan vaqt)
    const formattedCheckOut = `${checkIn}T${checkOutTime}`;

    const bookingInfo = {
      checkIn: checkIn,
      checkOut: formattedCheckOut,
      checkOutTime: checkOutTime, // Vaqtni alohida saqlash
      duration,
      rooms,
      hotel: t("TashkentAirportHotel"),
      timestamp: new Date().toISOString() // Cache busting uchun
    };

    // Booking ma'lumotlarini localStorage ga saqlaymiz
    localStorage.setItem("bookingInfo", JSON.stringify(bookingInfo));
    console.log("Saved to localStorage:", bookingInfo);

    // Query params orqali /rooms sahifasiga yo'naltiramiz
    const queryParams = new URLSearchParams({
      checkIn,
      checkOut: formattedCheckOut,
      duration,
      rooms,
    });

    navigate(`/rooms?${queryParams.toString()}`);
  };

  // Bugungi sanani olish
  const today = new Date().toISOString().split('T')[0];

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
              <p className="header__conditions-text">
                <FaWifi /> {t("freewifi")}
              </p>
              <p className="header__conditions-text">
                <IoCarSport /> {t("freeparking")}
              </p>
              <p className="header__conditions-text">
                <GiCoffeeCup /> {t("cafe")}
              </p>
              <p className="header__conditions-text">
                <IoTimeOutline className="header__icon" /> {t("service24/7")}
              </p>
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
                <label htmlFor="checkout">{t("check-out")} (Vaqt)</label>
                <input
                  id="checkout"
                  type="time"
                  value={checkOutTime}
                  onChange={(e) => setCheckOutTime(e.target.value)}
                  required
                  disabled={!checkIn} // Faqat check-in tanlanganida ishlaydi
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
                    <option>Up to 2 hours</option>
                    <option>Up to 10 hours</option>
                    <option>1 day</option>
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
                    <option>Standard Room</option>
                    <option>Family Room</option>
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
              disabled={!checkIn || !checkOutTime}
            >
              {t("checkavailable")}
            </button>

            <div className="header__info-row">
              <span className="header__color1">
                <AiOutlineSafety /> {t("secure")}
              </span>
              <span className="header__color2">
                <FaCircleCheck /> {t("instantconfirm")}
              </span>
              <span className="header__color3">
                <MdOutlineCancel /> {t("freecancel")}
              </span>
            </div>
          </form>
        </div>
      </div>
    </header>
  );
};

export default Header;