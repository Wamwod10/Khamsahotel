import React from "react";
import { AiOutlineWarning, AiOutlinePhone } from "react-icons/ai";
import "./contactheader.scss";
import { useTranslation } from "react-i18next";

const ContactHeader = () => {
   const { t } = useTranslation();
  return (
<section className="contact-header">
  <div className="container">
    <h2 className="contact-header__title">{t("contacth_title")}</h2>
    <p className="contact-header__subtitle">{t("contacth_subtitle")}</p>

    <div className="contact-alert">
      <div className="contact-alert__info">
        <AiOutlineWarning className="contact-alert__icon" />
        <div className="contact-alert__text">
          <p className="contact-alert__main-text">{t("contacth_alert_main")}</p>
          <p className="contact-alert__number">{t("contacth_alert_number")}</p>
        </div>
      </div>
      <button className="contact-alert__button">
        <AiOutlinePhone className="contact-alert__button-icon" />
        {t("contacth_alert_button")}
      </button>
    </div>
  </div>
</section>
  );
};

export default ContactHeader;
