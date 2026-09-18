import React from "react";
import "./antifraud.scss";
import { useTranslation } from "react-i18next";
import { FaCheckCircle, FaShieldAlt } from "react-icons/fa";
import { MdEmail, MdOutlineLinkOff } from "react-icons/md";
import { BsTelephoneFill } from "react-icons/bs";

const AntiFraud = () => {
  const { t } = useTranslation();
  return (
    <section id="security-notice" className="anti-fraud" aria-labelledby="security-notice-title">
      <div className="container anti-fraud__container">
        <div className="anti-fraud__eyebrow"><FaShieldAlt /> {t("fraudEyebrow")}</div>
        <h2 id="security-notice-title" className="anti-fraud__title">{t("fraudTitle")}</h2>
        <div className="anti-fraud__grid">
          <div className="anti-fraud__copy">
            <p>{t("fraudText1")}</p>
            <p>{t("fraudText2")}</p>
            <p className="anti-fraud__strong">{t("fraudText3")}</p>
            <p>{t("fraudText4")}</p>
          </div>
          <aside className="anti-fraud__card" aria-label={t("fraudCardTitle")}>
            <div className="anti-fraud__card-head">
              <span className="anti-fraud__card-icon"><FaCheckCircle /></span>
              <div><h3>{t("fraudCardTitle")}</h3><p>{t("fraudCardSubtitle")}</p></div>
            </div>
            <div className="anti-fraud__rule"><FaShieldAlt /><span><b>{t("fraudOfficialSiteLabel")}</b> Khamsahotel.uz</span></div>
            <div className="anti-fraud__rule"><MdEmail /><span><b>{t("fraudInvoiceLabel")}</b> {t("fraudInvoiceValue")}</span></div>
            <div className="anti-fraud__rule"><MdOutlineLinkOff /><span><b>{t("fraudLinksLabel")}</b> {t("fraudLinksValue")}</span></div>
            <div className="anti-fraud__rule"><BsTelephoneFill /><span><b>{t("fraudSupportLabel")}</b> +998 95 877 24 24 · qonoqhotel@mail.ru</span></div>
            <div className="anti-fraud__alert">{t("fraudAlert")}</div>
          </aside>
        </div>
      </div>
    </section>
  );
};

export default AntiFraud;
