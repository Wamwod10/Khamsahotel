import React, { useState, useEffect, useRef } from "react";
import "./RoomCard.scss";
import "./Rmedia/RCmedia.scss";

import { FaWifi, FaRulerCombined, FaFan } from "react-icons/fa";
import { PiHairDryerBold } from "react-icons/pi";
import { MdCleaningServices, MdHeadsetMic } from "react-icons/md";
import { GiHanger, GiCctvCamera } from "react-icons/gi";
import { FiUser, FiMapPin } from "react-icons/fi";
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
  const [preview, setPreview] = useState(null);
  const touchStart = useRef(null);
  const movePreview = (direction) => {
    setPreview((previous) => previous ? {
      ...previous,
      index: (previous.index + direction + previous.images.length) % previous.images.length,
    } : null);
  };
  useEffect(() => {
    if (!preview) return;
    const onKey = (event) => {
      if (event.key === "Escape") setPreview(null);
      if (event.key === "ArrowLeft") movePreview(-1);
      if (event.key === "ArrowRight") movePreview(1);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [preview]);

  // "STANDARD" | "FAMILY"
  const [selectedRoomType, setSelectedRoomType] = useState("STANDARD");

  useEffect(() => {
    // LocalStorage dan booking info ni o'qib selectedRoomType ni yangilash
    const bookingInfo = localStorage.getItem("bookingInfo");
    if (bookingInfo) {
      try {
        const parsed = JSON.parse(bookingInfo);
        if (parsed.rooms) {
          // rooms endi kodda saqlanadi: "STANDARD" | "FAMILY"
          setSelectedRoomType(String(parsed.rooms).toUpperCase());
        }
      } catch (e) {
        console.error("Error parsing bookingInfo from localStorage", e);
      }
    }
  }, []);

  // Modalni ochishdan oldin mehmon soni uchun tekshiruvlar
  const openModalWithCheck = (roomData) => {
    // Limitlar: STANDARD <=1, FAMILY <=3
    if (roomData.typeCode === "STANDARD" && roomData.guests > 1) {
      setNoticeMessage(
        t("standardRoomGuestLimit") ||
          "Siz bu yerda faqatgina 1 kishi uchun xona bron qila olasiz"
      );
      setShowNotice(true);
      return;
    }

    if (roomData.typeCode === "FAMILY" && roomData.guests > 3) {
      setNoticeMessage(
        t("familyRoomGuestLimit") ||
          "Siz bu yerda maksimum 3 kishi uchun xona bron qila olasiz"
      );
      setShowNotice(true);
      return;
    }

    // bookingInfo dan sanalarni olib Modalga uzatamiz
    const bookingInfo = localStorage.getItem("bookingInfo");
    let checkInDate = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    let checkOutDate = new Date(Date.now() + 86400000).toISOString(); // ISO

    if (bookingInfo) {
      try {
        const parsed = JSON.parse(bookingInfo);
        if (parsed.checkIn) checkInDate = parsed.checkIn; // YYYY-MM-DD
        if (parsed.checkOut) checkOutDate = parsed.checkOut; // ISO (YYYY-MM-DDTHH:mm)
      } catch {}
    }

    setSelectedRoom({
      ...roomData,
      checkIn: checkInDate,
      checkOut: checkOutDate,
    });
    setIsModalOpen(true);
  };

  const isStandardDisabled = selectedRoomType === "FAMILY";
  const isFamilyDisabled = selectedRoomType === "STANDARD";

  return (
    <div className="room-card">
      <div className="container">
        <h1 className="room-card__title">{t("roomtitle")} <small style={{ color: "#888", fontSize: "0.35em", fontWeight: 400, whiteSpace: "nowrap" }}>· {t("bookingStepRoom")}</small></h1>
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
              <img src={mainImage} alt={t("standard")} className="room-card__image"
                loading="lazy" decoding="async" tabIndex={0} role="button"
                aria-label={t("bookingExpandPhoto")}
                onClick={() => setPreview({ images: standardImages, index: standardImages.indexOf(mainImage) })}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setPreview({ images: standardImages, index: standardImages.indexOf(mainImage) }); } }} />
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
                <FiUser /> 1 {t("guest")} &nbsp; | &nbsp; <FaRulerCombined /> 3.2 m²
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
                    typeCode: "STANDARD",
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
              <img src={familyImage} alt={t("family")} className="room-card__image"
                loading="lazy" decoding="async" tabIndex={0} role="button"
                aria-label={t("bookingExpandPhoto")}
                onClick={() => setPreview({ images: familyImages, index: familyImages.indexOf(familyImage) })}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setPreview({ images: familyImages, index: familyImages.indexOf(familyImage) }); } }} />
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

              <h3 className="room-card__room-title">{t("family") || "Family Room"}</h3>
              <p className="room-card__info">
                <FiUser /> 2 {t("guests")} + {t("child")} &nbsp; | &nbsp; <FaRulerCombined /> 7.5 m²
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
                    typeCode: "FAMILY",
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

      {preview && (
        <div className="room-image-lightbox" role="dialog" aria-modal="true"
          aria-label={t("bookingRoomGallery")}
          onClick={() => setPreview(null)}
          onTouchStart={(event) => { touchStart.current = event.touches[0]?.clientX ?? null; }}
          onTouchEnd={(event) => {
            const start = touchStart.current;
            const end = event.changedTouches[0]?.clientX;
            if (start != null && end != null && Math.abs(start - end) > 45) movePreview(start > end ? 1 : -1);
            touchStart.current = null;
          }}>
          <button type="button" className="room-image-lightbox__close"
            aria-label={t("cancel")} onClick={() => setPreview(null)}>×</button>
          <button type="button" className="room-image-lightbox__arrow" aria-label={t("bookingPreviousPhoto")}
            onClick={(event) => { event.stopPropagation(); movePreview(-1); }}>‹</button>
          <div className="room-image-lightbox__photo" onClick={(event) => event.stopPropagation()}>
            <img src={preview.images[preview.index]} alt={t("bookingRoomGallery") + " " + (preview.index + 1)} />
            <span>{preview.index + 1} / {preview.images.length}</span>
          </div>
          <button type="button" className="room-image-lightbox__arrow" aria-label={t("bookingNextPhoto")}
            onClick={(event) => { event.stopPropagation(); movePreview(1); }}>›</button>
        </div>
      )}
      {showNotice && (
        <NoticePopup message={noticeMessage} onOk={() => setShowNotice(false)} />
      )}

      {isModalOpen && selectedRoom && (
        <RoomModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          guests={selectedRoom.guests}
          rooms={selectedRoom.typeCode}   
          checkIn={selectedRoom.checkIn}
          checkOut={selectedRoom.checkOut}
          hotel={selectedRoom.hotel}
        />
      )}
    </div>
  );
};

export default RoomCard;
