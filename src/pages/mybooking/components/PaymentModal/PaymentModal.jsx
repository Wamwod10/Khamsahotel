// PaymentModal.jsx
import React from "react";
import "./paymentmodal.scss";
import { useTranslation } from "react-i18next";

const PaymentModal = ({ isOpen, onClose }) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  return (
    <div className="payment-modal-overlay" onClick={onClose}>
      <div
        className="payment-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <h2>{t("paymentmodal_title")}</h2>
        <p>{t("paymentmodal_text")}</p>
        <button className="btn btn-close" onClick={onClose}>
          {t("paymentmodal_close")}
        </button>
      </div>
    </div>
  );
};

export default PaymentModal;
