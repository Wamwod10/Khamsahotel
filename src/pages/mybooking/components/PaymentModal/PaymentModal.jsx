// frontend/src/PaymentModal.jsx

import React, { useState, useEffect } from "react";
import "./paymentmodal.scss";

// Siz Octo bankning rasmiy SDK sini o'rnatishingiz kerak:
// npm install @octo/payment-js

// import { OctoPayment } from "@octo/payment-js";

const PaymentModal = ({ isOpen, onClose, amount }) => {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null); // 'success', 'error', null
  const [errorMessage, setErrorMessage] = useState("");
  const [clientSecret, setClientSecret] = useState(null);
  const [paymentInstance, setPaymentInstance] = useState(null);

  useEffect(() => {
    if (!isOpen) return;

    // Backenddan clientSecret olish
    const fetchClientSecret = async () => {
      setLoading(true);
      try {
        const res = await fetch("http://localhost:5000/create-payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount }),
        });
        const data = await res.json();

        if (res.ok && data.clientSecret) {
          setClientSecret(data.clientSecret);
          // OctoPayment instance yaratamiz
          const payment = new OctoPayment(data.clientSecret);
          setPaymentInstance(payment);
          setStatus(null);
        } else {
          setErrorMessage(data.error || "To‘lov serveridan xatolik olindi");
          setStatus("error");
        }
      } catch (error) {
        setErrorMessage(error.message);
        setStatus("error");
      } finally {
        setLoading(false);
      }
    };

    fetchClientSecret();
  }, [isOpen, amount]);

  const handlePayment = async () => {
    if (!paymentInstance) {
      setErrorMessage("To‘lov tizimi yuklanmadi");
      setStatus("error");
      return;
    }
    setLoading(true);
    try {
      await paymentInstance.confirmCardPayment();
      setStatus("success");
    } catch (error) {
      setErrorMessage(error.message || "To‘lovni amalga oshirishda xatolik");
      setStatus("error");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  if (status === "success") {
    return (
      <div className="payment-modal-overlay" onClick={onClose}>
        <div className="payment-modal success" onClick={(e) => e.stopPropagation()}>
          <h2>To‘lov muvaffaqiyatli amalga oshirildi!</h2>
          <button className="btn btn-close" onClick={onClose}>Yopish</button>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="payment-modal-overlay" onClick={onClose}>
        <div className="payment-modal error" onClick={(e) => e.stopPropagation()}>
          <h2>Xatolik yuz berdi</h2>
          <p>{errorMessage}</p>
          <button
            className="btn btn-close"
            onClick={() => {
              setStatus(null);
              setErrorMessage("");
            }}
          >
            Qaytish
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="payment-modal-overlay" onClick={onClose}>
      <div className="payment-modal" onClick={(e) => e.stopPropagation()}>
        <h2>To‘lovni amalga oshirish</h2>

        {/* OctoPayment SDK to'lov shakli shu yerda avtomatik chiqadi */}

        <button className="btn btn-pay" onClick={handlePayment} disabled={loading}>
          {loading ? "Jarayon davom etmoqda..." : "To‘lovni amalga oshirish"}
        </button>
        <button className="btn btn-close" onClick={onClose} disabled={loading}>
          Yopish
        </button>
      </div>
    </div>
  );
};

export default PaymentModal;
