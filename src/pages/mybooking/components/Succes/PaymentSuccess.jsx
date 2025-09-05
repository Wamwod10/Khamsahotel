import React, { useEffect } from "react";
import "./PaymentSuccess.scss";

const PaymentSuccess = () => {
  const API_BASE = import.meta.env.VITE_API_BASE_URL;

  useEffect(() => {
    const allBookings = JSON.parse(sessionStorage.getItem("allBookings")) || [];
    const latest = allBookings[0];

    if (latest) {
      const payload = {
        firstName: latest.firstName,
        lastName: latest.lastName,
        email: latest.email,
        phone: latest.phone,
        amount: latest.price,
        extra: `Xona turi: ${latest.rooms}, Sana: ${latest.checkIn} - ${latest.checkOut}`,
      };

      // 1. Telegramga yuborish
      fetch(`${API_BASE}/send-to-telegram`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            console.log("✅ Telegramga yuborildi");
          } else {
            console.error("❌ Telegramga yuborilmadi:", data);
          }
        })
        .catch((err) => {
          console.error("🔴 Telegram xatolik:", err);
        });

      // 2. Email yuborish (mijoz va admin uchun)
      fetch(`${API_BASE}/send-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: latest.email,
          subject: "To'lov tasdiqlandi - Khamsa Hotel",
          text: `Hurmatli ${latest.firstName}, siz ${latest.price} EUR miqdorida to'lov amalga oshirdingiz.\n\nXona: ${latest.rooms}\nSanalar: ${latest.checkIn} - ${latest.checkOut}\n\nRahmat!`,
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            console.log("✅ Email mijozga yuborildi");
          } else {
            console.error("❌ Email yuborishda xatolik:", data);
          }
        })
        .catch((err) => {
          console.error("🔴 Email xatolik:", err);
        });
    }
  }, []);

  return (
    <div className="payment-success-container">
      <div className="success-icon">✅</div>
      <h1>To‘lov muvaffaqiyatli bajarildi!</h1>
      <p>Rahmat! Buyurtmangiz qabul qilindi va sizga email ham yuborildi.</p>
      <a className="back-home" href="/">
        Bosh sahifaga qaytish
      </a>
    </div>
  );
};

export default PaymentSuccess;
