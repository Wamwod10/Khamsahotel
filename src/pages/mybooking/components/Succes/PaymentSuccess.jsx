import React, { useEffect } from "react";
import "./PaymentSuccess.scss";

const PaymentSuccess = () => {
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

      fetch("http://localhost:5000/send-to-telegram", {
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
          console.error("🔴 Xatolik:", err);
        });
    }
  }, []);

  return (
    <div className="payment-success-container">
      <div className="success-icon">✅</div>
      <h1>To‘lov muvaffaqiyatli bajarildi!</h1>
      <p>Rahmat! Buyurtmangiz qabul qilindi va Telegram orqali yuborildi.</p>
      <a className="back-home" href="/">
        Bosh sahifaga qaytish
      </a>
    </div>
  );
};

export default PaymentSuccess;
