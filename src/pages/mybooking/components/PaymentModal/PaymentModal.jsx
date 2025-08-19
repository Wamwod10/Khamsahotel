// PaymentModal.jsx
import React from "react";
import "./paymentmodal.scss";

const PaymentModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="payment-modal-overlay" onClick={onClose}>
      <div
        className="payment-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <h2>Pay Now</h2>
        <p>To'lov uchun tizim hali ishlab chiqilmoqda.</p>
        <button className="btn btn-close" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
};

export default PaymentModal;
