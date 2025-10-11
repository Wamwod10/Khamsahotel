import React from "react";
import "./roomcard.scss";
import './roomcardMedia.scss'
import { FaArrowRight, FaFan, FaRegUser } from "react-icons/fa";
import { IoResizeSharp } from "react-icons/io5";
import { FaWifi } from "react-icons/fa6";
import { RiCustomerServiceLine } from "react-icons/ri";
import { PiHairDryerBold } from "react-icons/pi";
import { MdOutlinePower } from "react-icons/md";
import { CiCircleMore } from "react-icons/ci";
import { IoIosListBox } from "react-icons/io";
import { FaMapLocationDot } from "react-icons/fa6";
import { MdCleaningServices } from "react-icons/md";
import { RiGroupLine } from "react-icons/ri";
import { GiHanger } from "react-icons/gi";
import { useTranslation } from 'react-i18next';
import { LuExternalLink } from "react-icons/lu";

const Roomcard = () => {
  
  const { t } = useTranslation();
  
  return (
    <div className="roomcard">
      <div className="container">
        <div className="roomcard__box">
          <h1 className="roomcard__title">{t("roomcardtitle")}</h1>
          <p className="roomcard__txt">
            {t("roomcardtext")}
          </p>
          <div className="roomcard__line"></div>
          <div className="roomcard__boxes">
            <div className="roomcard__boxes-card">
              <div className="roomcard__price-badges">
                <span>{t("roomprice1")}</span>
                <span>{t("roomprice2")}</span>
                <span>{t("roomprice3")}</span>
              </div>
              <img className="roomcard__boxes-img" src="/5.jpg" alt="" />
              <div className="roomcard__title-box">
                <h2 className="roomcard__boxes-title">{t("standard1")}</h2>
                <div className="roomcard__boxes-spans">
                  <p className="roomcard__span">
                    <FaRegUser /> 1 {t("guest")}
                  </p>
                  <p className="roomcard__span">
                    <IoResizeSharp /> 3.2 m²
                  </p>
                </div>
              </div>
              <p className="roomcard__location roomcard__boxes-text">
                <FaMapLocationDot /> {t('TashkentAirportHotel')}
              </p>
              <p className="roomcard__boxes-text">
                {t("roomtext1")}
              </p>
              <h3 className="roomcard__boxes-ft">{t("roomcardft")}:</h3>
              <div className="roomcard__ft-box">
                <span className="roomcard__ft-span">
                  <FaWifi /> {t("roomwifi")}
                </span>
                <span className="roomcard__ft-span">
                  <RiCustomerServiceLine /> {t("roomrcp")}
                </span>
                <span className="roomcard__ft-span">
                  <PiHairDryerBold /> {t("roombath")}
                </span>
                <span className="roomcard__ft-span">
                  <MdOutlinePower /> {t("roomoutlets")}
                </span>
                <span className="roomcard__ft-span">
                  <FaFan /> {t('roomcafe')}
                </span>
                <span className="roomcard__ft-span">
                  <CiCircleMore /> {t("more")}...
                </span>
              </div>
              <div className="roomcard__box-link">
                <a href="" className="roomcard__link">
                  <IoIosListBox /> {t("booknow")}
                </a>
              </div>
            </div>
            <div className="roomcard__boxes-card">
              <div className="roomcard__price-badges">
                <span>{t("roomprice4")}</span>
                <span>{t("roomprice5")}</span>
                <span>{t("roomprice6")}</span>
              </div>
              <img className="roomcard__boxes-img" src="/4.jpg" alt="" />
              <div className="roomcard__title-box">
                <h2 className="roomcard__boxes-title">{t("family1")}</h2>
                <div className="roomcard__boxes-spans">
                  <p className="roomcard__span">
                    <RiGroupLine /> 2 {t("guests")} + {t("child")}
                  </p>
                  <p className="roomcard__span">
                    <IoResizeSharp /> 7.5 m²
                  </p>
                </div>
              </div>
              <p className="roomcard__location roomcard__boxes-text">
                <FaMapLocationDot /> {t("TashkentAirportHotel")}
              </p>
              <p className="roomcard__boxes-text">
                {t("roomtext2")}
              </p>
              <h3 className="roomcard__boxes-ft">{t("roomcardft")}:</h3>
              <div className="roomcard__ft-box">
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
                  <CiCircleMore /> {t("more")}...
                </span>
              </div>
              <div className="roomcard__box-link">
                <a href="" className="roomcard__link">
                  <IoIosListBox /> {t("booknow")}
                </a>
              </div>
            </div>
            <div className="roomcard__boxes-card card-color">
              <img className="roomcard__boxes-img img-radius" src="/35.jpg" alt="" />
              <div className="roomcard__title-box">
                <h2 className="roomcard__boxes-title title-color">Qo'noq Railway Hotel</h2>
              </div>
              <p className="roomcard__location roomcard__boxes-text txt-color">
                <FaMapLocationDot /> Qo'noq Hotel Tashkent Railway
              </p>
              <p className="roomcard__boxes-text txt-color">
                {t("roomtext3")}
              </p>
              <h3 className="roomcard__boxes-ft text-color">{t("roomcardft")}:</h3>
              <div className="roomcard__ft-box">
                <span className="roomcard__ft-span span-color">
                  <FaWifi /> {t("roomwifi")}
                </span>
                <span className="roomcard__ft-span span-color">
                  <RiCustomerServiceLine /> {t("roomrcp")}
                </span>
                <span className="roomcard__ft-span span-color">
                  <PiHairDryerBold /> {t("roombath")}
                </span>
                <span className="roomcard__ft-span span-color">
                  <MdOutlinePower /> {t("roomoutlets")}
                </span>
                <span className="roomcard__ft-span span-color">
                  <FaFan /> {t("roomcafe")}
                </span>
                <span className="roomcard__ft-span span-color">
                  <CiCircleMore /> {t("more")}...
                </span>
              </div>
              <div className="roomcard__box-link roomcard-color">
                <a href="https://qonoqhotel.uz/" target="blank" className="roomcard__link">
                  <LuExternalLink /> {t("oficialsite")}
                </a>
              </div>
            </div>
          </div>
         
        </div>
      </div>
    </div>
  );
};

export default Roomcard;
