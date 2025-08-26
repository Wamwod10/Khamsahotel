import React, { useState } from "react";
import "./paymentmodal.scss";

const PaymentModal = ({ isOpen, onClose }) => {
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null); // 'success' | 'error' | null
  const [errorMessage, setErrorMessage] = useState("");

  if (!isOpen) return null;

  // MM/YY formatiga avtomatik slash qo'yish
  const handleExpiryChange = (e) => {
    let value = e.target.value.replace(/[^\d]/g, "").slice(0, 4); // faqat raqam, 4 ta raqam
    if (value.length > 2) {
      value = value.slice(0, 2) + "/" + value.slice(2);
    }
    setExpiry(value);
  };

  const validateInputs = () => {
    const cardRegex = /^\d{13,19}$/; // karta raqami 13-19 raqam
    const expiryRegex = /^(0[1-9]|1[0-2])\/\d{2}$/; // MM/YY formati
    const cvvRegex = /^\d{3,4}$/; // 3 yoki 4 raqam

    if (!cardRegex.test(cardNumber)) {
      setErrorMessage("Iltimos, to‘g‘ri karta raqamini kiriting.");
      return false;
    }
    if (!expiryRegex.test(expiry)) {
      setErrorMessage("Iltimos, amal qilish muddatini to‘g‘ri kiriting (MM/YY).");
      return false;
    }
    if (!cvvRegex.test(cvv)) {
      setErrorMessage("Iltimos, CVV kodini to‘g‘ri kiriting.");
      return false;
    }
    setErrorMessage("");
    return true;
  };

  const handlePayment = async () => {
    if (!validateInputs()) {
      setStatus("error");
      return;
    }

    setLoading(true);
    setStatus(null);

    try {
      const res = await fetch("http://localhost:5000/create-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: 1000 }), // demo summa
      });

      if (!res.ok) throw new Error("Server bilan bog‘lanishda xatolik");

      const data = await res.json();

      if (data.clientSecret) {
        setStatus("success");
      } else {
        setErrorMessage("To‘lovni amalga oshirishda xatolik yuz berdi.");
        setStatus("error");
      }
    } catch (error) {
      setErrorMessage(error.message);
      setStatus("error");
    } finally {
      setLoading(false);
    }
  };

  // Success yoki error modali
  if (status === "success") {
    return (
      <div className="payment-modal-overlay" onClick={onClose}>
        <div
          className="payment-modal success"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
        >
          <h2>To‘lov muvaffaqiyatli amalga oshirildi!</h2>
          <button className="btn btn-close" onClick={onClose}>
            Yopish
          </button>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="payment-modal-overlay" onClick={onClose}>
        <div
          className="payment-modal error"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
        >
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
      <div
        className="payment-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <h2>Pay Now</h2>
        <p>Please, Enter the Card Info</p>

        <label htmlFor="cardNumber">Karta raqami</label>
        <input
          id="cardNumber"
          type="text"
          maxLength={19}
          placeholder="XXXX XXXX XXXX XXXX"
          value={cardNumber}
          onChange={(e) => setCardNumber(e.target.value.replace(/\s/g, ""))}
          inputMode="numeric"
          autoComplete="cc-number"
        />

        <div className="row">
          <div className="col">
            <label htmlFor="expiry">Amal muddati</label>
            <input
              id="expiry"
              type="text"
              placeholder="MM/YY"
              maxLength={5}
              value={expiry}
              onChange={handleExpiryChange}
              inputMode="numeric"
              autoComplete="cc-exp"
            />
          </div>
          <div className="col">
            <label htmlFor="cvv">CVV</label>
            <input
              id="cvv"
              type="password"
              placeholder="***"
              maxLength={4}
              value={cvv}
              onChange={(e) => setCvv(e.target.value)}
              inputMode="numeric"
              autoComplete="cc-csc"
            />
          </div>
        </div>

        <button
          className="btn btn-pay"
          onClick={handlePayment}
          disabled={loading}
        >
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
