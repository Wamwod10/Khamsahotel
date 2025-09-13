// PaymentSuccess.jsx

import React, { useEffect } from "react";
import "./PaymentSuccess.scss";

const PaymentSuccess = () => {
  const API_BASE = import.meta.env.VITE_API_BASE_URL;

  useEffect(() => {
    const allBookings = JSON.parse(sessionStorage.getItem("allBookings")) || [];
    const latest = allBookings[0];

    if (latest) {
      const emailData = {
        to: latest.email,
        subject: "Information For Invoice",
        text: `Thank you for choosing to stay with us via Khamsahotel.uz! Please be informed that we are a SLEEP LOUNGE located inside the airport within the transit area. ...`, // to‘liq matnni qo‘shing
        adminInfo: {
          checkIn: latest.checkIn,
          checkInTime: latest.checkInTime,
          roomType: latest.roomType,
          duration: latest.duration,
          price: latest.price,
          firstName: latest.firstName,
          lastName: latest.lastName,
          phone: latest.phone,
          email: latest.email,
        },
      };

      fetch(`${API_BASE}/send-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(emailData),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            console.log("✅ Email yuborildi: mijoz + admin");
          } else {
            console.error("❌ Email yuborishda xatolik:", data.error);
          }
        })
        .catch((err) => {
          console.error("🔴 Email yuborishda xatolik:", err);
        });
    }
  }, []);

  return (
    <div className="payment-success-container">
      <div className="success-icon" role="img" aria-label="Success checkmark">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="72"
          height="72"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#27ae60"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="feather feather-check-circle"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M9 12l2 2 4-4" />
        </svg>
      </div>
      <h1>To‘lov muvaffaqiyatli bajarildi!</h1>
      <p className="message">
        Rahmat! Buyurtmangiz muvaffaqiyatli qabul qilindi. Sizga tasdiqnoma email orqali yuborildi.
      </p>
      <a className="back-home" href="/">
        Bosh sahifaga qaytish
      </a>
    </div>
  );
};

export default PaymentSuccess;
