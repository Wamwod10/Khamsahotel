import React from "react";
import "./PaymentSuccess.scss";

const PaymentSuccess = () => {
  return (
    <div className="payment-success-container">
      <div className="success-icon">✓</div>
      <h1>To‘lov muvaffaqiyatli bajarildi!</h1>
      <p>Buyurtmangiz qabul qilindi. Bron tasdig‘i emailingizga avtomatik yuboriladi.</p>
      <a href="/">Bosh sahifa</a>
    </div>
  );
};

export default PaymentSuccess;
