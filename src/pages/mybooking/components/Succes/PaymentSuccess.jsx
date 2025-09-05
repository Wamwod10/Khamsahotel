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
          subject: "Information For Invoice",
          text: `Thank you for choosing to stay with us via Khamsahotel.uz!  Please be informed that we are a SLEEP LOUNGE located inside the airport within the transit area. In order to stay with us you must be in possession of a valid boarding pass departing from airport Tashkent. If your flight commences from Tashkent, kindly verify with your airline first if you can check-in early for your flight as you'll need to go through passport control and security before you may access our lounge. IMPORTANT NOTE:  We will never ask you for your credit card details, or share any messages with links with you via Khamsahotel.uz for online payments or reconfirmation of your reservation with sleep ’n fly. In case of any doubt about your booking status with us please check via the Khamsahotel.uz website or app only, call Khamsahotel.uz, or contact us directly on  998 95 877 24 24 tel.whatshapp.telegram , qonoqhotel@mail.ru for Tashkent International Airport reservations.  Your Reservations Team`,
          subjectru: "Информация Для Счета",
          textru: `Спасибо, что решили остановиться у нас через Khamsahotel.uz! Обратите внимание, что мы являемся SLEEP LOUNGE, расположенным в транзитной зоне аэропорта. Чтобы остановиться у нас, у вас должен быть действительный посадочный талон на вылет из аэропорта Ташкента. Если ваш рейс начинается в Ташкенте, пожалуйста, сначала уточните у своей авиакомпании, можете ли вы зарегистрироваться на рейс заранее, так как вам нужно будет пройти паспортный контроль и проверку безопасности, прежде чем вы сможете попасть в наш зал ожидания.
         ВАЖНОЕ ПРИМЕЧАНИЕ: Мы никогда не попросим вас предоставить данные вашей кредитной карты или передать вам какие-либо сообщения со ссылками через Khamsahotel.uz для онлайн-платежей или повторного подтверждения вашего бронирования с sleep ’n fly. В случае возникновения сомнений относительно статуса вашего бронирования у нас, пожалуйста, проверьте его только через веб-сайт или приложение Khamsahotel.uz, позвоните в Khamsahotel.uz или свяжитесь с нами напрямую по телефону 998 95 877 24 24 tel.whatshapp.telegram, qonoqhotel@mail.ru для бронирования в международном аэропорту Ташкента. Ваша команда по бронированию`
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
