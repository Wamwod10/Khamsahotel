import React from "react";
import "./roomcard.scss";
import './roomcardMedia.scss'
import { FaRegUser } from "react-icons/fa";
import { IoResizeSharp } from "react-icons/io5";
import { FaWifi } from "react-icons/fa6";
import { RiCustomerServiceLine } from "react-icons/ri";
import { TbBath } from "react-icons/tb";
import { MdOutlinePower } from "react-icons/md";
import { MdOutlineLocalCafe } from "react-icons/md";
import { CiCircleMore } from "react-icons/ci";
import { IoIosListBox } from "react-icons/io";
import { FaMapLocationDot } from "react-icons/fa6";
import { MdCleaningServices } from "react-icons/md";
import { RiGroupLine } from "react-icons/ri";
import { PiLockers } from "react-icons/pi";
import { useTranslation } from 'react-i18next';

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
              <img className="roomcard__boxes-img" src="./public/5.jpg" alt="" />
              <div className="roomcard__title-box">
                <h2 className="roomcard__boxes-title">{t("standard1")}</h2>
                <div className="roomcard__boxes-spans">
                  <p className="roomcard__span">
                    <FaRegUser /> 1 {t("guest")}
                  </p>
                  <p className="roomcard__span">
                    <IoResizeSharp /> 3.6 m²
                  </p>
                </div>
              </div>
              <p className="roomcard__location roomcard__boxes-text">
                <FaMapLocationDot /> {t('TashkentTrainHotel')}
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
                  <TbBath /> {t("roombath")}
                </span>
                <span className="roomcard__ft-span">
                  <MdOutlinePower /> {t("roomoutlets")}
                </span>
                <span className="roomcard__ft-span">
                  <MdOutlineLocalCafe /> {t('roomcafe')}
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
              <img className="roomcard__boxes-img" src="./public/4.jpg" alt="" />
              <div className="roomcard__title-box">
                <h2 className="roomcard__boxes-title">{t("family1")}</h2>
                <div className="roomcard__boxes-spans">
                  <p className="roomcard__span">
                    <RiGroupLine /> 3 {t("guests")}
                  </p>
                  <p className="roomcard__span">
                    <IoResizeSharp /> 9.5 m²
                  </p>
                </div>
              </div>
              <p className="roomcard__location roomcard__boxes-text">
                <FaMapLocationDot /> {t("TashkentTrainHotel")}
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
                  <PiLockers /> {t("roomlockers")}
                </span>
                <span className="roomcard__ft-span">
                  <TbBath /> {t("roombath")}
                </span>
                <span className="roomcard__ft-span">
                  <MdCleaningServices /> {t("roomcleaning")}
                </span>
                <span className="roomcard__ft-span">
                  <MdOutlineLocalCafe /> {t("roomcafe")}
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
                <span>{t("roomprice1")}</span>
                <span>{t("roomprice2")}</span>
                <span>{t("roomprice3")}</span>
              </div>
              <img className="roomcard__boxes-img" src="./public/3.jpg" alt="" />
              <div className="roomcard__title-box">
                <h2 className="roomcard__boxes-title">{t("standard1")}</h2>
                <div className="roomcard__boxes-spans">
                  <p className="roomcard__span">
                    <FaRegUser /> 1 {t("guest")}
                  </p>
                  <p className="roomcard__span">
                    <IoResizeSharp /> 3.6 m²
                  </p>
                </div>
              </div>
              <p className="roomcard__location roomcard__boxes-text">
                <FaMapLocationDot /> {t("TashkentAirportHotel")}
              </p>
              <p className="roomcard__boxes-text">
                {t("roomtext3")}
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
                  <TbBath /> {t("roombath")}
                </span>
                <span className="roomcard__ft-span">
                  <MdOutlinePower /> {t("roomoutlets")}
                </span>
                <span className="roomcard__ft-span">
                  <MdOutlineLocalCafe /> {t("roomcafe")}
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default Roomcard;
