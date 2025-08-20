import React, { useState } from "react";
import "./RoomCard.scss";
import "./Rmedia/RCmedia.scss";
import { FaWifi } from "react-icons/fa6";
import { TbBath } from "react-icons/tb";
import { MdOutlineLocalCafe, MdCleaningServices } from "react-icons/md";
import { PiLockers } from "react-icons/pi";
import { useTranslation } from "react-i18next";
import { FaRulerCombined } from "react-icons/fa";
import { FiUser, FiMapPin } from "react-icons/fi";
import RoomModal from "./RoomModal";
import NoticePopup from "./NoticePopup";
import { GiCctvCamera } from "react-icons/gi";
import { MdHeadsetMic } from "react-icons/md";
import { LuCoffee } from "react-icons/lu";

const standardImages = ["/5.jpg", "/24.jpg", "/13.jpg", "/23.jpg"];
const familyImages = ["/4.jpg", "/25.jpg", "/26.jpg", "/27.jpg"];

const RoomCard = () => {
  const { t } = useTranslation();
  const [mainImage, setMainImage] = useState(standardImages[0]);
  const [familyImage, setFamilyImage] = useState(familyImages[0]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);

  const [noticeMessage, setNoticeMessage] = useState("");
  const [showNotice, setShowNotice] = useState(false);

  const openModalWithCheck = (roomData) => {
    const { type, guests } = roomData;

    if (type === "Standard Room" && guests > 1) {
      setNoticeMessage(
        t("standardRoomGuestLimit") ||
          "Siz bu yerda faqatgina 1 kishi uchun xona bron qila olasiz"
      );
      setShowNotice(true);
      return;
    }

    if (type === "Family Room" && guests > 3) {
      setNoticeMessage(
        t("familyRoomGuestLimit") ||
          "Siz bu yerda maksimum 3 kishi uchun xona bron qila olasiz"
      );
      setShowNotice(true);
      return;
    }

    const today = new Date().toISOString().split("T")[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];

    setSelectedRoom({
      ...roomData,
      checkIn: today,
      checkOut: tomorrow,
    });
    setIsModalOpen(true);
  };

  return (
    <div className="room-card">
      <div className="container">
        <h1 className="room-card__title">{t("roomtitle")}</h1>
        <p className="room-card__text">{t("roomtext")}</p>

        <div className="room-card__list">
          {/* Standard Room Card */}
          <div className="room-card__item">
            <div className="room-card__thumbnails">
              {standardImages.map((img, idx) => (
                <img
                  key={idx}
                  src={img}
                  alt={`Room view ${idx + 1}`}
                  loading="lazy"
                  className={`room-card__thumbnail ${
                    mainImage === img ? "active" : ""
                  }`}
                  onClick={() => setMainImage(img)}
                />
              ))}
            </div>

            <div className="room-card__image-wrapper">
              <img
                src={mainImage}
                alt="Standard Room"
                className="room-card__image"
              />
            </div>

            <div className="room-card__body">
              <div className="room-card__allprice">
                <div className="room-card__prices">
                  <span>{t("roomprice1")}</span>
                  <span>{t("roomprice2")}</span>
                  <span>{t("roomprice3")}</span>
                </div>
                <p className="room-card__number">{t("numberrooms")}: 23</p>
              </div>

              <h3 className="room-card__room-title">{t("standard")}</h3>
              <p className="room-card__info">
                <FiUser /> 1 {t("guest")} &nbsp; | &nbsp; <FaRulerCombined /> 3.6
                m²
              </p>
              <p className="room-card__location">
                <FiMapPin /> {t("TashkentAirportHotel")}
              </p>
              <p className="room-card__desc">{t("roomcardtext1")}</p>

              <h3 className="room-card__features-title">{t("roomcardft")}:</h3>
              <div className="roomcard__ft-box room-card__ft-box">
                <span className="roomcard__ft-span">
                  <FaWifi /> {t("roomwifi")}
                </span>
                <span className="roomcard__ft-span">
                  <PiLockers /> {t("roomlockers")}
                </span>
                <span className="roomcard__ft-span">
                  <TbBath /> {t("roombath")}
                </span>
                <span className="roomcard__ft-span">
                  <MdCleaningServices /> {t("roomcleaning")}
                </span>
                <span className="roomcard__ft-span">
                  <LuCoffee /> {t("roomcafe")}
                </span>
                <span className="roomcard__ft-span">
                  <GiCctvCamera /> {t("securitycameras")}
                </span>
                <span className="roomcard__ft-span">
                  <MdHeadsetMic /> {t("service24/7")}
                </span>
              </div>

              <button
                className="room-card__btn"
                onClick={() =>
                  openModalWithCheck({
                    type: "Standard Room",
                    guests: 1,
                    size: "3.6 m²",
                    hotel: t("TashkentAirportHotel"),
                  })
                }
              >
                {t("booknow1")}
              </button>
            </div>
          </div>

          {/* Family Room Card */}
          <div className="room-card__item">
            <div className="room-card__thumbnails">
              {familyImages.map((img, idx) => (
                <img
                  key={idx}
                  src={img}
                  alt={`Room view ${idx + 1}`}
                  loading="lazy"
                  className={`room-card__thumbnail ${
                    familyImage === img ? "active" : ""
                  }`}
                  onClick={() => setFamilyImage(img)}
                />
              ))}
            </div>

            <div className="room-card__image-wrapper">
              <img
                src={familyImage}
                alt="Family Room"
                className="room-card__image"
              />
            </div>

            <div className="room-card__body">
              <div className="room-card__allprice">
                <div className="room-card__prices">
                  <span>{t("roomprice4")}</span>
                  <span>{t("roomprice5")}</span>
                  <span>{t("roomprice6")}</span>
                </div>
                <p className="room-card__number">{t("numberrooms")}: 1</p>
              </div>

              <h3 className="room-card__room-title">{t("family")}</h3>
              <p className="room-card__info">
                <FiUser /> 3 {t("guests")} &nbsp; | &nbsp; <FaRulerCombined /> 9.5
                m²
              </p>
              <p className="room-card__location">
                <FiMapPin /> {t("TashkentAirportHotel")}
              </p>
              <p className="room-card__desc">{t("roomcardtext2")}</p>

              <h3 className="room-card__features-title">{t("roomcardft")}:</h3>
              <div className="roomcard__ft-box room-card__ft-box">
                <span className="roomcard__ft-span">
                  <FaWifi /> {t("roomwifi")}
                </span>
                <span className="roomcard__ft-span">
                  <PiLockers /> {t("roomlockers")}
                </span>
                <span className="roomcard__ft-span">
                  <MdOutlineLocalCafe /> {t("usbcharging")}
                </span>
                <span className="roomcard__ft-span">
                  <TbBath /> {t("roombath")}
                </span>
                <span className="roomcard__ft-span">
                  <MdCleaningServices /> {t("roomcleaning")}
                </span>
                <span className="roomcard__ft-span">
                  <LuCoffee /> {t("roomcafe")}
                </span>
                <span className="roomcard__ft-span">
                  <GiCctvCamera /> {t("securitycameras")}
                </span>
                <span className="roomcard__ft-span">
                  <MdHeadsetMic /> 24/7 {t("reception")}
                </span>
              </div>

              <button
                className="room-card__btn"
                onClick={() =>
                  openModalWithCheck({
                    type: "Family Room",
                    guests: 3,
                    size: "9.5 m²",
                    hotel: t("TashkentAirportHotel"),
                  })
                }
              >
                {t("booknow1")}
              </button>
            </div>
          </div>
        </div>
      </div>

      {showNotice && (
        <NoticePopup
          message={noticeMessage}
          onOk={() => setShowNotice(false)}
        />
      )}

      {isModalOpen && selectedRoom && (
        <RoomModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          guests={selectedRoom.guests}
          rooms={selectedRoom.type}
          size={selectedRoom.size}
          hotel={selectedRoom.hotel}
          checkIn={selectedRoom.checkIn}
          checkOut={selectedRoom.checkOut}
        />
      )}
    </div>
  );
};

export default RoomCard;
