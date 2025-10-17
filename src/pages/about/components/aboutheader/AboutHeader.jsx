import React from "react";
import "./aboutheader.scss";
import { useTranslation } from "react-i18next";

const AboutHeader = () => {
    const { t } = useTranslation();
  return (
    <div className="about service-header">
      <div className="container">
        <div className="about__box">
          <h1 className="service-header__title">{t("abouttitle")}</h1>
          <p className="service-header__subtitle">{t("aboutsubtitle")}</p>
          <p className="service-header__description">
            {t("aboutdescription")}
          </p>
          <div className="service-header__buttons">
            <a href="/" className="btn btn-primary">
              {t("serviceprimary")}
            </a>
            <a href="/contact" className="btn btn-secondary">
              {t("servicesecondary")}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutHeader;
