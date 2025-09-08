import React, { useState, useEffect } from "react";
import "./RoomCard.scss";
import "./Rmedia/RCmedia.scss";

import { FaWifi, FaRulerCombined, FaFan } from "react-icons/fa";
import { PiHairDryerBold } from "react-icons/pi";
import { MdCleaningServices, MdHeadsetMic } from "react-icons/md";
import { GiHanger } from "react-icons/gi";
import { FiUser, FiMapPin } from "react-icons/fi";
import { GiCctvCamera } from "react-icons/gi";
import { LuCoffee } from "react-icons/lu";
import { BsFillUsbPlugFill } from "react-icons/bs";

import { useTranslation } from "react-i18next";
import RoomModal from "./RoomModal";
import NoticePopup from "./NoticePopup";

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
  const [selectedRoomType, setSelectedRoomType] = useState("Standard Room");

  useEffect(() => {
    const bookingInfo = localStorage.getItem("bookingInfo");
    if (bookingInfo) {
      try {
        const parsed = JSON.parse(bookingInfo);
        if (parsed.rooms) {
          setSelectedRoomType(parsed.rooms);
        }
      } catch (e) {
        console.error("Error parsing bookingInfo from localStorage", e);
      }
    }
  }, []);

  const openModalWithCheck = (roomData) => {
    if (roomData.type === "Standard Room" && roomData.guests > 1) {
      setNoticeMessage(
        "Siz bu yerda faqatgina 1 kishi uchun xona bron qila olasiz"
      );
      setShowNotice(true);
      return;
    }

    if (roomData.type === "Family Room" && roomData.guests > 3) {
      setNoticeMessage(
        "Siz bu yerda maksimum 3 kishi uchun xona bron qila olasiz"
      );
      setShowNotice(true);
      return;
    }

    setSelectedRoom({
      ...roomData,
      checkIn: new Date().toLocaleDateString(),
      checkOut: new Date(Date.now() + 86400000).toLocaleDateString(),
    });
    setIsModalOpen(true);
  };

  const isStandardDisabled = selectedRoomType === "Family Room";
  const isFamilyDisabled = selectedRoomType === "Standard Room";

  return (
    <div className="room-card">
      <div className="container">
        <h1 className="room-card__title">{t("roomtitle")}</h1>
        <p className="room-card__text">{t("roomtext")}</p>

        <div className="room-card__list">
          {/* Standard Room */}
          <div
            className="room-card__item"
            style={{
              opacity: isStandardDisabled ? 0.3 : 1,
              pointerEvents: isStandardDisabled ? "none" : "auto",
            }}
          >
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
                alt="Main Room"
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
                <FiUser /> 1 {t("guest")} &nbsp; | &nbsp; <FaRulerCombined />{" "}
                3.2 m²
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
                  <GiHanger /> {t("roomlockers")}
                </span>
                <span className="roomcard__ft-span">
                  <PiHairDryerBold /> {t("roombath")}
                </span>
                <span className="roomcard__ft-span">
                  <MdCleaningServices /> {t("roomcleaning")}
                </span>
                <span className="roomcard__ft-span">
                  <FaFan /> {t("roomcafe")}
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
                    size: "3.2 m²",
                    hotel: "Tashkent Airport Khamsa Hotel",
                  })
                }
                disabled={isStandardDisabled}
              >
                {t("booknow1")}
              </button>
            </div>
          </div>

          {/* Family Room */}
          <div
            className="room-card__item"
            style={{
              opacity: isFamilyDisabled ? 0.8 : 1,
              pointerEvents: isFamilyDisabled ? "none" : "auto",
            }}
          >
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
                alt="Main Room"
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

              <h3 className="room-card__room-title">Family Room</h3>
              <p className="room-card__info">
                <FiUser /> 3 Guests &nbsp; | &nbsp; <FaRulerCombined />  7.5 m²
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
                  <GiHanger /> {t("roomlockers")}
                </span>
                <span className="roomcard__ft-span">
                  <BsFillUsbPlugFill /> {t("usbcharging")}
                </span>
                <span className="roomcard__ft-span">
                  <PiHairDryerBold /> {t("roombath")}
                </span>
                <span className="roomcard__ft-span">
                  <MdCleaningServices /> {t("roomcleaning")}
                </span>
                <span className="roomcard__ft-span">
                  <FaFan /> {t("roomcafe")}
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
                    size: "7.5 m²",
                    hotel: "Tashkent Airport Khamsa Hotel",
                  })
                }
                disabled={isFamilyDisabled}
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
        />
      )}
    </div>
  );
};

export default RoomCard;
