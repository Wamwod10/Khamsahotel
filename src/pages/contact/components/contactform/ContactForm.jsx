import React from "react";
import { FaLocationArrow, FaUtensils, FaTaxi } from "react-icons/fa6";
import { GiShoppingBag } from "react-icons/gi";
import { LuExternalLink } from "react-icons/lu";
import { MdMarkEmailRead } from "react-icons/md";
import { useTranslation } from "react-i18next";
import "./contactform.scss";

const ContactForm = () => {
  const { t } = useTranslation();

  return (
    <div className="contactform">
      <div className="container">
        <div className="contactform__box">
          <div className="contactform__title-box">
            <h2 className="contactform__title">{t("hotelLocation")}</h2>
            <a href="https://www.google.com/maps/place/Khamsa+hotel+taschkent+airoport/@41.2620646,69.2675622,3a,75y,322.94h,76.57t/data=!3m8!1e1!3m6!1sCIHM0ogKEICAgIDav4jwIg!2e10!3e11!6shttps:%2F%2Flh3.googleusercontent.com%2Fgpms-cs-s%2FAB8u6HYzQPpOSG5huCCz7Pn98iBi3z0mgak7rmiWPbsQBwEQRqXBcFXV9zlFw5nnvhz7VPKQld_qPqArkncvTR7YJsXbiE7cKWuNnFIiIkp5tst7bxoED9XGqSjQ7EjOcgK-75l0YLM%3Dw900-h600-k-no-pi13.430341118955397-ya183.93791184466573-ro0-fo100!7i11264!8i5632!4m20!1m10!3m9!1s0x38ae61007cb3de3b:0x62705b2323c597e!2sKhamsa+hotel+taschkent+airoport!5m2!4m1!1i2!8m2!3d41.261939!4d69.2674976!16s%2Fg%2F11whhjjr13!3m8!1s0x38ae61007cb3de3b:0x62705b2323c597e!5m2!4m1!1i2!8m2!3d41.261939!4d69.2674976!16s%2Fg%2F11whhjjr13?entry=ttu&g_ep=EgoyMDI1MDgxNy4wIKXMDSoASAFQAw%3D%3D" className="contactform__link">
              <FaLocationArrow /> {t("getDirections")}
            </a>
          </div>
          <div className="contactform__map-box">
            <iframe
              className="contactform__map"
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3721.6087235148198!2d69.26492267656143!3d41.261943003766085!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x38ae61007cb3de3b%3A0x62705b2323c597e!2sKhamsa%20hotel%20taschkent%20airoport!5e1!3m2!1sru!2s!4v1755668900789!5m2!1sru!2s "
              allowFullScreen=""
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            ></iframe>
            <div className="contactform__map-div">
              <h3 className="contactform__map-title">{t("hotelName")}</h3>
              <p className="contactform__map-text">{t("hotelAddress")}</p>
            </div>
          </div>
          <div className="contactform__nears">
            <h3 className="contactform__nears-title">{t("placesNear")}</h3>
            <div className="contactform__nears-box">
              <div className="contactform__nears-div">
                <div className="contactform__titles-div">
                  <div className="contactform__nears-icon">
                    <GiShoppingBag className="icon icon-rotate"/>
                  </div>
                  <div>
                    <h3 className="contactform__div-title">{t("dutyFree")}</h3>
                    <p className="contactform__div-text">200-300 m</p>
                  </div>
                </div>
                <a href="https://www.google.com/maps/place/Duty+Free+Uzbekistan/@41.2615049,69.2640989,17z/data=!3m1!4b1!4m6!3m5!1s0x38ae6106a39f7119:0x61ee61e06f62dfd1!8m2!3d41.2615009!4d69.2666738!16s%2Fg%2F11vbjcn400?entry=ttu&g_ep=EgoyMDI1MDgxNy4wIKXMDSoASAFQAw%3D%3D" className="contactform__nears-icon">
                  <LuExternalLink className="icon"/>
                </a>
              </div>
              <div className="contactform__nears-div">
                <div className="contactform__titles-div">
                  <div className="contactform__nears-icon">
                    <FaUtensils className="icon icon-rotate"/>
                  </div>
                  <div>
                    <h3 className="contactform__div-title">{t("diningAreas")}</h3>
                    <p className="contactform__div-text">150-250 m</p>
                  </div>
                </div>
                <a href="https://www.google.com/maps/place/Pie+republic+airport/@41.2619429,69.2626267,17z/data=!4m17!1m10!3m9!1s0x38ae61007cb3de3b:0x62705b2323c597e!2sKhamsa+hotel+taschkent+airoport!5m2!4m1!1i2!8m2!3d41.261939!4d69.2674976!16s%2Fg%2F11whhjjr13!3m5!1s0x38ae61003ece355d:0xfaddc7b3cb7efaaa!8m2!3d41.2612865!4d69.2667655!16s%2Fg%2F11y3n38zp5?entry=ttu&g_ep=EgoyMDI1MDgxNy4wIKXMDSoASAFQAw%3D%3D" className="contactform__nears-icon">
                  <LuExternalLink className="icon"/>
                </a>
              </div>
              <div className="contactform__nears-div">
                <div className="contactform__titles-div">
                  <div className="contactform__nears-icon">
                    <MdMarkEmailRead className="icon icon-rotate"/>
                  </div>
                  <div>
                    <h3 className="contactform__div-title">{t("postOffice")}</h3>
                    <p className="contactform__div-text">300-350 m</p>
                  </div>
                </div>
                <a href="https://www.google.com/maps/place/%D0%9F%D1%80%D0%B8%D0%B3%D1%80%D0%B0%D0%BD%D0%B8%D1%87%D0%BD%D1%8B%D0%B9+%D1%82%D0%B0%D0%BC%D0%BE%D0%B6%D0%B5%D0%BD%D0%BD%D1%8B%D0%B9+%D0%BF%D0%BE%D1%81%D1%82+%22%D0%9C%D0%B5%D0%B6%D0%B4%D1%83%D0%BD%D0%B0%D1%80%D0%BE%D0%B4%D0%BD%D1%8B%D0%B9+%D0%B0%D1%8D%D1%80%D0%BE%D0%BF%D0%BE%D1%80%D1%82+%22+%D0%A2%D0%B0%D1%88%D0%BA%D0%B5%D0%BD%D1%82%22+%D0%B8%D0%BC%D0%B5%D0%BD%D0%B8+%D0%98%D1%81%D0%BB%D0%B0%D0%BC%D0%B0+%D0%9A%D0%B0%D1%80%D0%B8%D0%BC%D0%BE%D0%B2%D0%B0%22/@41.2400628,69.233189,12z/data=!4m10!1m2!2m1!1spost+office+in+airport+tashkent!3m6!1s0x38ae617ffae37419:0x5240289413dc0d39!8m2!3d41.2623777!4d69.2664335!15sCh9wb3N0IG9mZmljZSBpbiBhaXJwb3J0IHRhc2hrZW50kgEOY3VzdG9tc19vZmZpY2WqAWMKCC9tLzBkaDhzEAEqDyILcG9zdCBvZmZpY2UoADIfEAEiG7e-z9aHjBeTs6FZRWjqa4NkNJT_wN3-CUfQmTIjEAIiH3Bvc3Qgb2ZmaWNlIGluIGFpcnBvcnQgdGFzaGtlbnTgAQA!16s%2Fg%2F11qgg8j97w?entry=ttu&g_ep=EgoyMDI1MDgxNy4wIKXMDSoASAFQAw%3D%3D" className="contactform__nears-icon">
                  <LuExternalLink className="icon"/>
                </a>
              </div>
              <div className="contactform__nears-div">
                <div className="contactform__titles-div">
                  <div className="contactform__nears-icon">
                    <FaTaxi className="icon icon-rotate"/>
                  </div>
                  <div>
                    <h3 className="contactform__div-title">{t("taxiService")}</h3>
                    <p className="contactform__div-text">50-100 m</p>
                  </div>
                </div>
                <a href="https://www.google.com/maps/place/Taxi+Airport+Tashkent/@41.2789862,69.2312244,14z/data=!4m10!1m2!2m1!1staxi+service+in+airport+tashkent!3m6!1s0x38ae6125aaca46ab:0xb0f9f592c4551a6!8m2!3d41.2641434!4d69.2684467!15sCiB0YXhpIHNlcnZpY2UgaW4gYWlycG9ydCB0YXNoa2VudFoiIiB0YXhpIHNlcnZpY2UgaW4gYWlycG9ydCB0YXNoa2VudJIBDHRheGlfc2VydmljZZoBI0NoWkRTVWhOTUc5blMwVkpRMEZuU1VSYWIyVmxkVlpuRUFFqgFlCggvbS8wcGc1MhABKhAiDHRheGkgc2VydmljZSgAMh8QASIbU9nn6qaXvK5ZOzqbtlQnxW3j7cj6gD30SirFMiQQAiIgdGF4aSBzZXJ2aWNlIGluIGFpcnBvcnQgdGFzaGtlbnTgAQD6AQQIABA9!16s%2Fg%2F11s8tq9cdg?entry=ttu&g_ep=EgoyMDI1MDgxNy4wIKXMDSoASAFQAw%3D%3D" className="contactform__nears-icon">
                  <LuExternalLink className="icon"/>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactForm;
