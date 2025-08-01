import "./bookingform.scss";
import "./bookingMedia.scss"
import { IoMdTime } from "react-icons/io";
import { FaWifi } from "react-icons/fa6";
import { IoSparkles } from "react-icons/io5";
import { IoCarSport } from "react-icons/io5";
import { MdOutlineFreeBreakfast } from "react-icons/md";
import { HiOutlineUserGroup } from "react-icons/hi";
import { useTranslation } from "react-i18next";

const Bookingform = () => {
  const { t } = useTranslation();

  return (
    <div className="booking">
      <div className="container">
        <h1 className="booking__title">{t("whykhamsa")}</h1>
        <p className="booking__text">
          {t("bookingtext")}
        </p>
        <div className="booking__box">
          <div className="booking__box-offers">
            <div className="booking__icon-div">
              <IoMdTime className="booking__icon-rotate" />
            </div>
            <h2 className="booking__box-title">{t("roomrcp")}</h2>
            <p className="booking__box-text">
              {t("bookingtext1")}
            </p>
          </div>
          <div className="booking__box-offers">
            <div className="booking__icon-div">
              <FaWifi className="booking__icon-translate" />
            </div>
            <h2 className="booking__box-title">{t("bookingwifi")}</h2>
            <p className="booking__box-text">
              {t("bookingtext2")}
            </p>
          </div>
          <div className="booking__box-offers">
            <div className="booking__icon-div">
              <IoSparkles />
            </div>
            <h2 className="booking__box-title">{t("bookingclean")}</h2>
            <p className="booking__box-text">
              {t("bookingtext3")}
            </p>
          </div>
          <div className="booking__box-offers">
            <div className="booking__icon-div">
              <IoCarSport className="booking__icon-translate" />
            </div>
            <h2 className="booking__box-title">{t("bookingparking")}</h2>
            <p className="booking__box-text">
              {t("bookingtext4")}
            </p>
          </div>
          <div className="booking__box-offers">
            <div className="booking__icon-div">
              <MdOutlineFreeBreakfast />
            </div>
            <h2 className="booking__box-title">{t("bookingbf")}</h2>
            <p className="booking__box-text">
              {t("bookingtext5")}
            </p>
          </div>
          <div className="booking__box-offers">
            <div className="booking__icon-div">
              <HiOutlineUserGroup />
            </div>
            <h2 className="booking__box-title">{t("bookingservice")}</h2>
            <p className="booking__box-text">
              {t("bookingtext6")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Bookingform;
