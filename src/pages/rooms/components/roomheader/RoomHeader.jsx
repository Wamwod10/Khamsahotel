import { useEffect, useState } from "react";
import { FaHotel, FaUser, FaBed, FaPen } from "react-icons/fa";
import { IoCalendar } from "react-icons/io5";
import "./RoomHeader.scss";
import { NavLink } from "react-router-dom";
import NoticePopup from "../roomcard/NoticePopup.jsx";
import { useTranslation } from "react-i18next";

export default function RoomHeader() {
  const { t } = useTranslation();

  // booking info state
  const [bookingInfo, setBookingInfo] = useState({
    checkIn: null,
    checkOut: null,
    guests: t("guest"),   
    rooms: "Standard Room",
    hotel: t("TashkentAirportHotel"),
  });

  // Notice popup state
  const [showNotice, setShowNotice] = useState(false);
  const [noticeMessage, setNoticeMessage] = useState("");

  // Parse guest count number from string like "4 Guests"
  const getGuestCount = (guestStr) => {
    const num = parseInt(guestStr, 10);
    return isNaN(num) ? 0 : num;
  };

  // Load booking info on mount, check if notice should show
  useEffect(() => {
    const savedData = sessionStorage.getItem("bookingInfo");

    if (savedData) {
      const data = JSON.parse(savedData);

      setBookingInfo({
        checkIn: data.checkIn,
        checkOut: data.checkOut,
        guests: data.guests,
        rooms: data.rooms,
        hotel: t("TashkentAirportHotel"),
      });

      const guestNum = getGuestCount(data.guests);
      const lastShownGuestNum = parseInt(sessionStorage.getItem("noticeShownForGuests") || "0", 10);

      // Show notice only if guestNum >= 4 AND notice NOT shown yet for this guestNum
      if (guestNum >= 4 && guestNum !== lastShownGuestNum) {
        setNoticeMessage(t("tooManyGuestsMessage"));
        setShowNotice(true);
      }
    }
  }, [t]);

  // If bookingInfo.guests changes, clear noticeShownForGuests if guestNum < 4
  // (Optional, depends on where you reset this in your Main Page)
  useEffect(() => {
    const guestNum = getGuestCount(bookingInfo.guests);
    if (guestNum < 4) {
      sessionStorage.removeItem("noticeShownForGuests");
    }
  }, [bookingInfo.guests]);

  // Close notice handler - save that notice was shown for current guest count
  const handleCloseNotice = () => {
    setShowNotice(false);

    const guestNum = getGuestCount(bookingInfo.guests);
    if (guestNum >= 4) {
      sessionStorage.setItem("noticeShownForGuests", guestNum.toString());
    }
  };

  const guestKeyMap = {
    "1 Guest": "guestCount_1",
    "2 Guest": "guestCount_2",
    "3 Guest": "guestCount_3",
    "4 Guest": "guestCount_4",
    "5 Guest": "guestCount_5",
    "6 Guest": "guestCount_6",
    "2 Guests": "guestCount_2",
    "3 Guests": "guestCount_3",
    "4 Guests": "guestCount_4",
    "5 Guests": "guestCount_5",
    "6 Guests": "guestCount_6",
  };

  // Room translation keys map
  const roomKeyMap = {
    "Standard Room": "roomType_standard",
    "Family Room": "roomType_family",
    "2 Standard Rooms": "roomType_twoStandard",
    "2 Family Rooms": "roomType_twoFamily",
    "Standard + 1 Family room": "roomType_mixed",
  };

  return (
    <div className="room-header">
      <div className="container">
        <div className="room-header__box">
          <div className="room-header__item">
            <IoCalendar className="room-header__icon" />
            <div>
              <p className="room-header__label">{t("check-in")}</p>
              <p className="room-header__value">
                {bookingInfo.checkIn || t("selectDate")}
              </p>
            </div>
          </div>

          <div className="room-header__item">
            <IoCalendar className="room-header__icon" />
            <div>
              <p className="room-header__label">{t("check-out")}</p>
              <p className="room-header__value">
                {bookingInfo.checkOut || t("selectDate")}
              </p>
            </div>
          </div>

          <div className="room-header__item">
            <FaUser className="room-header__icon" />
            <div>
              <p className="room-header__label">{t("guests")}</p>
              <p className="room-header__value">
                {bookingInfo.guests
                  ? t(guestKeyMap[bookingInfo.guests] || bookingInfo.guests)
                  : t("guestCount_1")}
              </p>
            </div>
          </div>

          <div className="room-header__item">
            <FaBed className="room-header__icon" />
            <div>
              <p className="room-header__label">{t("rooms")}</p>
              <p className="room-header__value">
                {t(roomKeyMap[bookingInfo.rooms] || "roomType_standard")}
              </p>
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

        <NavLink
          to="/"
          state={{ clearSearch: true }}
          className="room-header__button"
        >
          <FaPen className="room-header__button-icon" /> {t("modifysearch")}
        </NavLink>
      </div>

      {showNotice && (
        <NoticePopup
          message={noticeMessage}
          onBack={handleCloseNotice}
          onContinue={handleCloseNotice}
        />
      )}
    </div>
  );
}
