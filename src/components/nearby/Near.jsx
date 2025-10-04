import React from "react";
import "./near.scss";
import './nearMedia.scss'
import { FaBookOpen, FaStar } from "react-icons/fa";
import { IoTimeOutline } from "react-icons/io5";
import { TbExternalLink } from "react-icons/tb";
import { MdLocalCafe } from "react-icons/md";
import { FaBriefcaseMedical } from "react-icons/fa";
import { FaShoppingBag } from "react-icons/fa";
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
            <img src="/15.jpg" width={"100%"} height={"200px"} alt="" />
            <div className="near__box-absolute">
              <p className="near__absolute-text">
                <MdLocalCafe />
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
                <IoTimeOutline />
                {t("nearwalk")} 24/7 {t("neardrive")} 8:00 - 20:00
              </p>
              {/* <p className="near__distance-text">
                <PiCarProfileLight />2 {t("neardrive")}
              </p> */}
            </div>
            <a
              href="https://www.google.com/maps/place/%D0%A2%D0%BE%D1%88%D0%BA%D0%B5%D0%BD%D1%82+%D0%B0%D1%8D%D1%80%D0%BE%D0%BF%D0%BE%D1%80%D1%82%D0%B8/@41.254284,69.263781,14z/data=!4m14!1m7!3m6!1s0x38ae6005c5142bf3:0xe04bf246835d2d7f!2z0JzQtdC20LTRg9C90LDRgNC-0LTQvdGL0Lkg0JDRjdGA0L7Qv9C-0YDRgiDQuNC80LXQvdC4INCY0YHQu9Cw0LzQsCDQmtCw0YDQuNC80L7QstCw!8m2!3d41.2595981!4d69.279151!16zL20vMDhkanh4!3m5!1s0x38ae6105c32b0717:0xd595d6c1d7923035!8m2!3d41.2508097!4d69.2648719!16s%2Fg%2F11vc6h0n90?entry=ttu&g_ep=EgoyMDI1MDczMC4wIKXMDSoASAFQAw%3D%3D"
              target="blank"
              className="near__view-link"
            >
              {t("viewlocate")} <TbExternalLink />
            </a>
          </div>
          <div className="near__box-card">
            <img src="/16.png" width={"100%"} height={"200px"} alt="" />
            <div className="near__box-absolute">
              <p className="near__absolute-text">
                <FaBriefcaseMedical />
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
                <IoTimeOutline />
                {t("nearwalk")} 24/7 {t("neardrive")} 9:00 - 17:00
              </p>
              {/* <p className="near__distance-text">
                <PiCarProfileLight />
                5-7 {t("neardrive")}
              </p> */}
            </div>
            <a
              href="https://www.google.com/maps/place/%D0%A2%D0%BE%D1%88%D0%BA%D0%B5%D0%BD%D1%82+%D0%B0%D1%8D%D1%80%D0%BE%D0%BF%D0%BE%D1%80%D1%82%D0%B8/@41.254284,69.263781,14z/data=!4m14!1m7!3m6!1s0x38ae6005c5142bf3:0xe04bf246835d2d7f!2z0JzQtdC20LTRg9C90LDRgNC-0LTQvdGL0Lkg0JDRjdGA0L7Qv9C-0YDRgiDQuNC80LXQvdC4INCY0YHQu9Cw0LzQsCDQmtCw0YDQuNC80L7QstCw!8m2!3d41.2595981!4d69.279151!16zL20vMDhkanh4!3m5!1s0x38ae6105c32b0717:0xd595d6c1d7923035!8m2!3d41.2508097!4d69.2648719!16s%2Fg%2F11vc6h0n90?entry=ttu&g_ep=EgoyMDI1MDczMC4wIKXMDSoASAFQAw%3D%3D"
              target="blank"
              className="near__view-link"
            >
              {t("viewlocate")} <TbExternalLink />
            </a>
          </div>
          <div className="near__box-card">
            <img src="/17.jpg" width={"100%"} height={"200px"} alt="" />
            <div className="near__box-absolute">
              <p className="near__absolute-text">
                <FaBookOpen />
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
                <IoTimeOutline />
                {t("nearwalk")} 8:00 - 22:00 {t("neardrive")} 24/7
              </p>
              {/* <p className="near__distance-text">
                <PiCarProfileLight />
                {t("neardrive")}  8:00 - 22:00
              </p> */}
            </div>
            <a
              href="https://www.google.com/maps/place/%D0%A2%D0%BE%D1%88%D0%BA%D0%B5%D0%BD%D1%82+%D0%B0%D1%8D%D1%80%D0%BE%D0%BF%D0%BE%D1%80%D1%82%D0%B8/@41.254284,69.263781,14z/data=!4m14!1m7!3m6!1s0x38ae6005c5142bf3:0xe04bf246835d2d7f!2z0JzQtdC20LTRg9C90LDRgNC-0LTQvdGL0Lkg0JDRjdGA0L7Qv9C-0YDRgiDQuNC80LXQvdC4INCY0YHQu9Cw0LzQsCDQmtCw0YDQuNC80L7QstCw!8m2!3d41.2595981!4d69.279151!16zL20vMDhkanh4!3m5!1s0x38ae6105c32b0717:0xd595d6c1d7923035!8m2!3d41.2508097!4d69.2648719!16s%2Fg%2F11vc6h0n90?entry=ttu&g_ep=EgoyMDI1MDczMC4wIKXMDSoASAFQAw%3D%3D"
              target="blank"
              className="near__view-link"
            >
              {t("viewlocate")} <TbExternalLink />
            </a>
          </div>
          <div className="near__box-card">
            <img src="/18.jpg" width={"100%"} height={"200px"} alt="" />
            <div className="near__box-absolute">
              <p className="near__absolute-text">
                <FaShoppingBag />
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
                <IoTimeOutline />
                {t("nearwalk")} 24/7 {t("neardrive")} 8:00 - 20:00
              </p>
              {/* <p className="near__distance-text">
                <PiCarProfileLight />
                15 {t("neardrive")}
              </p> */}
            </div>
            <a
              href="https://www.google.com/maps/place/%D0%A2%D0%BE%D1%88%D0%BA%D0%B5%D0%BD%D1%82+%D0%B0%D1%8D%D1%80%D0%BE%D0%BF%D0%BE%D1%80%D1%82%D0%B8/@41.254284,69.263781,14z/data=!4m14!1m7!3m6!1s0x38ae6005c5142bf3:0xe04bf246835d2d7f!2z0JzQtdC20LTRg9C90LDRgNC-0LTQvdGL0Lkg0JDRjdGA0L7Qv9C-0YDRgiDQuNC80LXQvdC4INCY0YHQu9Cw0LzQsCDQmtCw0YDQuNC80L7QstCw!8m2!3d41.2595981!4d69.279151!16zL20vMDhkanh4!3m5!1s0x38ae6105c32b0717:0xd595d6c1d7923035!8m2!3d41.2508097!4d69.2648719!16s%2Fg%2F11vc6h0n90?entry=ttu&g_ep=EgoyMDI1MDczMC4wIKXMDSoASAFQAw%3D%3D"
              target="blank"
              className="near__view-link"
            >
              {t("viewlocate")} <TbExternalLink />
            </a>
          </div>
        </div>
        <div className="near__views-location">
          <a
            href="https://www.google.com/maps/place/Khamsa+hotel+taschkent+airoport/@41.2619429,69.2626267,17z/data=!3m1!4b1!4m9!3m8!1s0x38ae61007cb3de3b:0x62705b2323c597e!5m2!4m1!1i2!8m2!3d41.261939!4d69.2674976!16s%2Fg%2F11whhjjr13?entry=ttu&g_ep=EgoyMDI1MDczMC4wIKXMDSoASAFQAw%3D%3D"
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
