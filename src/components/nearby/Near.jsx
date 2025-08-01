import "./near.scss";
import './nearMedia.scss'
import { FaStar } from "react-icons/fa";
import { IoLocationOutline } from "react-icons/io5";
import { PiCarProfileLight } from "react-icons/pi";
import { TbExternalLink } from "react-icons/tb";
import { IoTrainSharp } from "react-icons/io5";
import { FaRegBuilding } from "react-icons/fa";
import { FaMosque } from "react-icons/fa6";
import { FaHotel } from "react-icons/fa6";
import { PiPark } from "react-icons/pi";
import { useTranslation } from "react-i18next";
import { FaMapPin } from "react-icons/fa6";

const Near = () => {
  const { t } = useTranslation();

  return (
    <div className="near">
      <div className="container">
        <h1 className="near__title">{t("explorenear")}</h1>
        <p className="near__text">
          {t("neartext")}
        </p>
        <div className="near__box">
          <div className="near__box-card">
            <img src="/public/15.jpg" width={"100%"} height={"200px"} alt="" />
            <div className="near__box-absolute">
              <p className="near__absolute-text">
                <IoTrainSharp />
                {t("transport")}
              </p>
              <p className="near__absolute-rating">
                <FaStar /> 4.3
              </p>
            </div>
            <h2 className="near__box-title"> {t("tashkentrailway")}</h2>
            <p className="near__box-text">
              {t("railwaytext")}
            </p>
            <div className="near__box-distance">
              <p className="near__distance-text">
                <IoLocationOutline />
                2-5 {t("nearwalk")}
              </p>
              <p className="near__distance-text">
                <PiCarProfileLight />2 {t("neardrive")}
              </p>
            </div>
            <a
              href="https://www.google.com/maps/place/%D1%81%D1%82%D0%B0%D0%BD%D1%86%D0%B8%D1%8F+%D0%A2%D0%B0%D1%88%D0%BA%D0%B5%D0%BD%D1%82+%D0%9F%D0%B0%D1%81%D1%81+%D0%A6%D0%B5%D0%BD%D1%82%D1%80./@41.2913684,69.2843576,17z/data=!3m1!4b1!4m6!3m5!1s0x38ae8acace7628e5:0x6cb7260fa08bf75d!8m2!3d41.2913644!4d69.2869325!16s%2Fg%2F1q6jb20c7?entry=ttu&g_ep=EgoyMDI1MDcxNi4wIKXMDSoASAFQAw%3D%3D"
              target="blank"
              className="near__view-link"
            >
              {t("viewlocate")} <TbExternalLink />
            </a>
          </div>
          <div className="near__box-card">
            <img src="/public/16.webp" width={"100%"} height={"200px"} alt="" />
            <div className="near__box-absolute">
              <p className="near__absolute-text">
                <FaRegBuilding />
                {t("nearhistoric")}
              </p>
              <p className="near__absolute-rating">
                <FaStar /> 4.5
              </p>
            </div>
            <h2 className="near__box-title">{t("amirtemur")}</h2>
            <p className="near__box-text">
              {t("amirtemurtext")}
            </p>
            <div className="near__box-distance">
              <p className="near__distance-text">
                <IoLocationOutline />
                15 {t("nearwalk")}
              </p>
              <p className="near__distance-text">
                <PiCarProfileLight />
                5-7 {t("neardrive")}
              </p>
            </div>
            <a
              href="https://www.google.com/maps/search/Amir+Timur+Square+%26+Statue/@41.3110672,69.2769158,17z/data=!3m1!4b1?entry=ttu&g_ep=EgoyMDI1MDcxNi4wIKXMDSoASAFQAw%3D%3D"
              target="blank"
              className="near__view-link"
            >
              {t("viewlocate")} <TbExternalLink />
            </a>
          </div>
          <div className="near__box-card">
            <img src="/public/17.jpg" width={"100%"} height={"200px"} alt="" />
            <div className="near__box-absolute">
              <p className="near__absolute-text">
                <FaMosque />
                {t("religious")}
              </p>
              <p className="near__absolute-rating">
                <FaStar /> 4.6
              </p>
            </div>
            <h2 className="near__box-title">{t("hazratiimam")}</h2>
            <p className="near__box-text">
              {t("hazratiimamtext")}
            </p>
            <div className="near__box-distance">
              <p className="near__distance-text">
                <IoLocationOutline />
                20-25 {t("nearwalk")}
              </p>
              <p className="near__distance-text">
                <PiCarProfileLight />
                10-15 {t("neardrive")}
              </p>
            </div>
            <a
              href="https://www.google.com/maps/search/Hazrati+Imam+Complex/@41.3358843,69.2288262,14.75z?entry=ttu&g_ep=EgoyMDI1MDcxNi4wIKXMDSoASAFQAw%3D%3D"
              target="blank"
              className="near__view-link"
            >
              {t("viewlocate")} <TbExternalLink />
            </a>
          </div>
          <div className="near__box-card">
            <img src="/public/18.jpg" width={"100%"} height={"200px"} alt="" />
            <div className="near__box-absolute">
              <p className="near__absolute-text">
                <PiPark />
                {t("park")}
              </p>
              <p className="near__absolute-rating">
                <FaStar /> 4.4
              </p>
            </div>
            <h2 className="near__box-title">{t("alishernavoi")}</h2>
            <p className="near__box-text">
              {t("alishernavoitext")}
            </p>
            <div className="near__box-distance">
              <p className="near__distance-text">
                <IoLocationOutline />
                25 {t("nearwalk")}
              </p>
              <p className="near__distance-text">
                <PiCarProfileLight />
                15 {t("neardrive")}
              </p>
            </div>
            <a
              href="https://www.google.com/maps/place/%D0%9D%D0%B0%D1%86%D0%B8%D0%BE%D0%BD%D0%B0%D0%BB%D1%8C%D0%BD%D1%8B%D0%B9+%D0%BF%D0%B0%D1%80%D0%BA+%D0%A3%D0%B7%D0%B1%D0%B5%D0%BA%D0%B8%D1%81%D1%82%D0%B0%D0%BD%D0%B0+%D0%B8%D0%BC%D0%B5%D0%BD%D0%B8+%D0%90%D0%BB%D0%B8%D1%88%D0%B5%D1%80%D0%B0+%D0%9D%D0%B0%D0%B2%D0%BE%D0%B8/@41.3040172,69.2383706,17z/data=!3m1!4b1!4m6!3m5!1s0x38ae8ba9d183d907:0x98155ad335b37bfd!8m2!3d41.3040132!4d69.2409455!16s%2Fg%2F11cmh5syq0?entry=ttu&g_ep=EgoyMDI1MDcxNi4wIKXMDSoASAFQAw%3D%3D"
              target="blank"
              className="near__view-link"
            >
              {t("viewlocate")} <TbExternalLink />
            </a>
          </div>
        </div>
        <div className="near__views-location">
          <a
            href="https://www.google.com/maps/place/Qo'noq+Railway+hotel/@41.2915924,69.2819513,17z/data=!3m1!4b1!4m9!3m8!1s0x38ae8bc01ef9e86b:0x1f98bc7292fa4e7b!5m2!4m1!1i2!8m2!3d41.2915885!4d69.2868222!16s%2Fg%2F11y9nyf533?entry=ttu&g_ep=EgoyMDI1MDcxNi4wIKXMDSoASAFQAw%3D%3D"
            target="blank"
            className="near__view-link"
          >
            {t("hotellocate")} <FaMapPin />
          </a>
        </div>
      </div>
    </div>
  );
};

export default Near;
