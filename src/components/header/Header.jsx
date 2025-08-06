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
import { useNavigate } from "react-router-dom";
import { useLocation } from "react-router-dom";

const Header = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const roomKeys = {
    "Standard Room": "standardRoom",
    "Family Room": "familyRoom",
    "2 Standard Rooms": "twoStandardRooms",
    "2 Family Rooms": "twoFamilyRooms",
    "Standard + 1 Family room": "standardPlusFamilyRoom",
  };

  // Booking states
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState("1 Guest");
  const [rooms, setRooms] = useState("Standard Room");

  // Clear booking info if instructed
  useEffect(() => {
    if (location.state?.clearSearch) {
      localStorage.removeItem("bookingInfo");
      setCheckIn("");
      setCheckOut("");
      setGuests("1 Guest");
      setRooms("Standard Room");
    }
  }, [location.state]);

  // Helpers
  const getNextDay = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    date.setDate(date.getDate() + 1);
    return date.toISOString().split("T")[0];
  };


  const handleCheckInChange = (e) => {
    const newCheckIn = e.target.value;
    setCheckIn(newCheckIn);

    if (checkOut && checkOut <= newCheckIn) {
      setCheckOut(getNextDay(newCheckIn));
    }
  };

  const handleCheckOutChange = (e) => {
    const newCheckOut = e.target.value;
    if (checkIn && newCheckOut <= checkIn) {
      setCheckOut(getNextDay(checkIn));
    } else {
      setCheckOut(newCheckOut);
    }
  };

  // Extract number from "X Guest(s)"
  const getGuestCount = (guestStr) => parseInt(guestStr);

  // Check room-guest compatibility
  const isRoomSuitableForGuests = (roomOption, guestCount) => {
    switch (roomOption) {
      case "Standard Room":
        return guestCount === 1;
      case "Family Room":
        return guestCount >= 1 && guestCount <= 3;
      case "2 Standard Rooms":
        return guestCount === 2;
      case "2 Family Rooms":
        return guestCount >= 4 && guestCount <= 6;
      case "Standard + 1 Family room":
        return guestCount === 3 || guestCount === 4;
      default:
        return false;
    }
  };

  // Adjust room selection if not suitable
  useEffect(() => {
    const guestCount = getGuestCount(guests);
    if (!isRoomSuitableForGuests(rooms, guestCount)) {
      if (guestCount === 1) setRooms("Standard Room");
      else if (guestCount === 2) setRooms("Family Room");
      else if (guestCount === 3 || guestCount === 4)
        setRooms("Standard + 1 Family room");
      else if (guestCount >= 5 && guestCount <= 6) setRooms("2 Family Rooms");
      else setRooms("Standard Room");
    }
  }, [guests, rooms]);

  // Disable unsuitable options
  const isDisabled = (option) => {
    const guestCount = getGuestCount(guests);
    return !isRoomSuitableForGuests(option, guestCount);
  };

  // Submit handler
  const handleSubmit = (e) => {
    e.preventDefault();

    if (!checkIn || !checkOut || !guests || !rooms) {
      alert(t("fillAllFields") || "Please fill in all fields!");
      return;
    }

    const bookingInfo = {
      checkIn,
      checkOut,
      guests,
      rooms,
      hotel: t("TashkentAirportHotel"),
    };

    localStorage.setItem("bookingInfo", JSON.stringify(bookingInfo));

    const queryParams = new URLSearchParams({
      checkIn,
      checkOut,
      guests,
      rooms,
    });

    navigate(`/rooms?${queryParams.toString()}`);
  };

  return (
    <header className="header">
      <div className="container">
        <div className="header__big-box">
          <div className="header__box">
            <h1 className="header__title">
              {t("headertitle")} <span>Khamsa Hotel</span>
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
                  min={new Date().toISOString().split("T")[0]}
                  onChange={handleCheckInChange}
                  placeholder="ДД.ММ.ГГГГ"
                  required
                />
              </div>

              <div className="header__form-group">
                <label htmlFor="checkout">{t("check-out")}</label>
                <input
                  id="checkout"
                  type="date"
                  value={checkOut}
                  min={getNextDay(
                    checkIn || new Date().toISOString().split("T")[0]
                  )}
                  onChange={handleCheckOutChange}
                  placeholder="ДД.ММ.ГГГГ"
                  required
                />
              </div>
            </div>

            <div className="header__form-row">
              <div className="header__form-group">
                <label htmlFor="guests">{t("guests")}</label>
                <div className="custom-select">
                  <select
                    id="guests"
                    value={guests}
                    onChange={(e) => setGuests(e.target.value)}
                  >
                    {[1, 2, 3, 4, 5, 6].map((num) => (
                      <option key={num}>
                        {num} {t("guest")}
                      </option>
                    ))}
                  </select>
                  <FaChevronDown className="select-icon" />
                </div>
              </div>

              <div className="header__form-group select-wrapper">
                <label htmlFor="rooms">{t("rooms")}</label>
                <div className="custom-select">
                  <select
                    id="rooms"
                    value={rooms}
                    onChange={(e) => setRooms(e.target.value)}
                  >
                    {[
                      "Standard Room",
                      "Family Room",
                      "2 Standard Rooms",
                      "2 Family Rooms",
                      "Standard + 1 Family room",
                    ].map((roomOption) => (
                      <option
                        key={roomOption}
                        value={roomOption}
                        disabled={isDisabled(roomOption)}
                        className={
                          isDisabled(roomOption) ? "disabled-option" : ""
                        }
                      >
                        {t(`roomspart.${roomKeys[roomOption]}`)}
                      </option>
                    ))}
                  </select>
                  <FaChevronDown className="select-icon" />
                </div>
              </div>
            </div>

            <div className="header__form-group select-wrapper full-width">
              <label htmlFor="hotel">{t("TashkentAirportHotel")}</label>
              <div className="custom-select">
                <select id="hotel" value={t("TashkentAirportHotel")} disabled>
                  <option>{t("TashkentAirportHotel")}</option>
                </select>
              </div>
            </div>

            <button type="submit" className="header__form-button">
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
