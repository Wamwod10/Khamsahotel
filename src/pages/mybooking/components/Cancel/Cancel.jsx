import React from "react";
import { useTranslation } from "react-i18next";
import "./cancel.scss";
import { GiCancel } from "react-icons/gi";

const Cancel = () => {
  const { t } = useTranslation();
  return (
    <div className="payment-success-container">
      <div className="success-icon">
        <div className="icon-div"><GiCancel className="icon-cancel" /></div>
      </div>
      <h1 className="red">{t("bookingPaymentNotConfirmed")}</h1>
      <p className="message">{t("bookingCheckPaymentFirst")}</p>
      <a className="back-home" href="/mybooking">{t("bookingReturnSelection")}</a>
      <p><a href="/">{t("bookingBackHome")}</a></p>
    </div>
  );
};

export default Cancel;
