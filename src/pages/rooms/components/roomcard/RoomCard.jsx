import React, { useState } from "react";
import "./RoomCard.scss";
import { FaWifi } from "react-icons/fa6";
import { TbBath } from "react-icons/tb";
import { MdOutlineLocalCafe, MdCleaningServices } from "react-icons/md";
import { PiLockers } from "react-icons/pi"; 
import { useTranslation } from "react-i18next";
import { FaRulerCombined } from "react-icons/fa";
import { FiUser, FiMapPin } from "react-icons/fi";
import RoomModal from "./RoomModal"; 
import NoticePopup from "./NoticePopup"; 

const standardImages = [
  "/5.jpg",
  "/24.jpg",
  "/13.jpg",
  "/23.jpg",
];

const familyImages = ["/4.jpg", "/25.jpg"];

const RoomCard = () => {
  const { t } = useTranslation();
  const [mainImage, setMainImage] = useState(standardImages[0]);
  const [familyImage, setFamilyImage] = useState(familyImages[0]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);

  const [noticeMessage, setNoticeMessage] = useState("");
  const [showNotice, setShowNotice] = useState(false);

  const openModalWithCheck = (roomData) => {
    if (roomData.type === "Standard Room" && roomData.guests > 1) {
      setNoticeMessage("Siz bu yerda faqatgina 1 kishi uchun xona bron qila olasiz");
      setShowNotice(true);
      return; 
    }

    if (roomData.type === "Family Room" && roomData.guests > 3) {
      setNoticeMessage("Siz bu yerda maksimum 3 kishi uchun xona bron qila olasiz");
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

  return (
    <div className="room-card">
      <div className="container">
        <h1 className="room-card__title">Hourly & Daily Room Options</h1>
        <p className="room-card__text">
          Explore our flexible room options designed for short or extended
          stays. Whether you need a few hours or a full day, we have got the
          perfect room for you.
        </p>

        <div className="room-card__list">
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
                alt="Main Room"
                className="room-card__image"
              />
            </div>

            <div className="room-card__body">
              <div className="room-card__allprice">
                <div className="room-card__prices">
                  <span>$70 / 2hr</span>
                  <span>$100 / 10hr</span>
                  <span>$150 / day</span>
                </div>
                <p className="room-card__number">Number of Rooms: 23</p>
              </div>

              <h3 className="room-card__room-title">Standard Room</h3>
              <p className="room-card__info">
                <FiUser /> 1 Guests &nbsp; | &nbsp; <FaRulerCombined /> 3.6 m²
              </p>
              <p className="room-card__location">
                <FiMapPin /> Tashkent Airport Khamsa Hotel
              </p>
              <p className="room-card__desc">
                A thoughtfully designed space offering peace, simplicity, and
                comfort — perfect for solo travelers seeking rest and privacy
                just minutes from the airport.
              </p>

              <h3 className="room-card__features-title">Features:</h3>
              <div className="roomcard__ft-box room-card__ft-box">
                <span className="roomcard__ft-span">
                  <FaWifi /> {t("roomwifi")}
                </span>
                <span className="roomcard__ft-span">
                  <PiLockers /> {t("roomlockers")}
                </span>
                <span className="roomcard__ft-span">
                  <MdOutlineLocalCafe /> USB Charging Ports
                </span>
                <span className="roomcard__ft-span">
                  <TbBath /> {t("roombath")}
                </span>
                <span className="roomcard__ft-span">
                  <MdCleaningServices /> {t("roomcleaning")}
                </span>
                <span className="roomcard__ft-span">
                  {t("roomcafe")}
                </span>
                <span className="roomcard__ft-span">
                  Security Cameras
                </span>
                <span className="roomcard__ft-span">
                  24/7 Reception
                </span>
              </div>

              <button
                className="room-card__btn"
                onClick={() =>
                  openModalWithCheck({
                    type: "Standard Room",
                    guests: 1,
                    size: "3.6 m²",
                    hotel: "Tashkent Airport Khamsa Hotel",
                  })
                }
              >
                Book Now
              </button>
            </div>
          </div>

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
                alt="Main Room"
                className="room-card__image"
              />
            </div>

            <div className="room-card__body">
              <div className="room-card__allprice">
                <div className="room-card__prices">
                  <span>$70 / 2hr</span>
                  <span>$100 / 10hr</span>
                  <span>$150 / day</span>
                </div>
                <p className="room-card__number">Number of Rooms: 1</p>
              </div>

              <h3 className="room-card__room-title">Family Room</h3>
              <p className="room-card__info">
                <FiUser /> 3 Guests &nbsp; | &nbsp; <FaRulerCombined /> 9.5 m²
              </p>
              <p className="room-card__location">
                <FiMapPin /> Tashkent Airport Khamsa Hotel
              </p>
              <p className="room-card__desc">
                A thoughtfully designed space offering peace, simplicity, and
                comfort — perfect for solo travelers seeking rest and privacy
                just minutes from the airport.
              </p>

              <h3 className="room-card__features-title">Features:</h3>
              <div className="roomcard__ft-box room-card__ft-box">
                <span className="roomcard__ft-span">
                  <FaWifi /> {t("roomwifi")}
                </span>
                <span className="roomcard__ft-span">
                  <PiLockers /> {t("roomlockers")}
                </span>
                <span className="roomcard__ft-span">
                  <MdOutlineLocalCafe /> USB Charging Ports
                </span>
                <span className="roomcard__ft-span">
                  <TbBath /> {t("roombath")}
                </span>
                <span className="roomcard__ft-span">
                  <MdCleaningServices /> {t("roomcleaning")}
                </span>
                <span className="roomcard__ft-span">
                  {t("roomcafe")}
                </span>
                <span className="roomcard__ft-span">
                  Security Cameras
                </span>
                <span className="roomcard__ft-span">
                  24/7 Reception
                </span>
              </div>

              <button
                className="room-card__btn"
                onClick={() =>
                  openModalWithCheck({
                    type: "Family Room",
                    guests: "1-3",
                    size: "9.5 m²",
                    hotel: "Tashkent Airport Khamsa Hotel",
                  })
                }
              >
                Book Now
              </button>
            </div>
          </div>
        </div>
      </div>

      {showNotice && (
        <NoticePopup
          message={noticeMessage}
          onOk={() => {
            setShowNotice(false);
          }}
        />
      )}

      {isModalOpen && selectedRoom && (
        <RoomModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          room={selectedRoom}
        />
      )}
    </div>
  );
};

export default RoomCard;
