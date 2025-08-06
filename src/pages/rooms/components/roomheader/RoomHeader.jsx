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
    checkIn: null,
    checkOut: null,
    guests: "1 Guest",
    rooms: "Standard Room",
    hotel: t("TashkentAirportHotel"),
  });

  const [showNotice, setShowNotice] = useState(false);
  const [noticeMessage, setNoticeMessage] = useState("");

useEffect(() => {
  const savedData = localStorage.getItem("bookingInfo");

  if (savedData) {
    const data = JSON.parse(savedData);

    console.log("bookingInfo (parsed):", data);

    setBookingInfo({
      checkIn: data.checkIn,
      checkOut: data.checkOut,
      guests: data.guests,
      rooms: data.rooms,
      hotel: t("TashkentAirportHotel"),
    });

    const guestNum = parseInt(data.guests);
    const lastShownGuestNum = parseInt(localStorage.getItem("noticeShownForGuests") || "0");

    console.log("guestNum:", guestNum);
    console.log("lastShownGuestNum:", lastShownGuestNum);

    if (guestNum > 3 && guestNum !== lastShownGuestNum) {
      console.log("✅ NoticePopup sharti BAJARILDI");
      setNoticeMessage(t("tooManyGuestsMessage"));
      setShowNotice(true);
    } else {
      console.log("❌ NoticePopup sharti bajarilmadi");
    }
  }
}, [t]);


  const handleCloseNotice = () => {
    setShowNotice(false);
    const guestNum = parseInt(bookingInfo.guests, 10);
    if (guestNum > 3) {
      localStorage.setItem("noticeShownForGuests", guestNum.toString());
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
              <p className="room-header__value">{bookingInfo.checkIn || t("selectDate")}</p>
            </div>
          </div>

          <div className="room-header__item">
            <IoCalendar className="room-header__icon" />
            <div>
              <p className="room-header__label">{t("check-out")}</p>
              <p className="room-header__value">{bookingInfo.checkOut || t("selectDate")}</p>
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

        <NavLink to="/" state={{ clearSearch: true }} className="room-header__button">
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
