import React, { useEffect } from "react";
import "./PaymentSuccess.scss";

const PaymentSuccess = () => {
  const API_BASE = import.meta.env.VITE_API_BASE_URL;

  const roomKeyMap = {
    "Standard Room": "Standard Room",
    "Family Room": "Family Room",
    "2 Standard Rooms": "2 Standard Rooms",
    "2 Family Rooms": "2 Family Rooms",
    "Standard + 1 Family room": "Standard + 1 Family room",
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const [year, month, day] = dateStr.split("-");
    return `${day}.${month}.${year}`;
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return "-";
    if (timeStr.includes("T")) return timeStr.split("T")[1].slice(0, 5);
    return timeStr.slice(0, 5);
  };

  const formatDateTime = (dateTimeStr) => {
    if (!dateTimeStr) return "-";
    const date = new Date(dateTimeStr);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${day}.${month}.${year} ${hours}:${minutes}`;
  };

  useEffect(() => {
    const allBookings = JSON.parse(sessionStorage.getItem("allBookings")) || [];
    const latest = allBookings[0];

    if (latest) {
      const {
        firstName,
        lastName,
        phone,
        email,
        checkIn,
        checkOutTime,
        rooms,
        duration,
        price,
        createdAt,
      } = latest;

      const emailText = `
Thank you for choosing to stay with us via Khamsahotel.uz!

Please be informed that we are a SLEEP LOUNGE located inside the airport within the transit area. 
To stay with us, you must have a valid boarding pass departing from Tashkent Airport.

IMPORTANT NOTE:
We will never ask you for your credit card details or send links via Khamsahotel.uz for online payments or booking confirmation.

If you have any doubts about your booking status, please check via the Khamsahotel.uz website or app only, 
call us at +998 95 877 24 24 (tel/WhatsApp/Telegram), or email us at qonoqhotel@mail.ru

------------------------------
🔔 YOUR BOOKING DETAILS
------------------------------

👤 Guest: ${firstName} ${lastName}
📧 Email: ${email}
📞 Phone: ${phone}

🗓️ Booking Date: ${formatDateTime(createdAt)}
📅 Check-in Date: ${formatDate(checkIn)}
⏰ Check-in Time: ${formatTime(checkOutTime)}
🛏️ Room Type: ${roomKeyMap[rooms] || rooms}
📆 Duration: ${duration}
💶 Price: ${price ? `${price}€` : "-"}

-------------------------------------
Thank you for your reservation. We look forward to welcoming you! 

- Khamsa Sleep Lounge Team
`;

      const emailData = {
        to: email,
        subject: "Your Booking Confirmation – Khamsahotel.uz",
        text: emailText,
      };

      // 1. EMAIL YUBORISH
      fetch(`${API_BASE}/send-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(emailData),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            console.log("✅ Email mijozga yuborildi");

            // 2. EMAIL YUBORILGANDAN KEYIN TELEGRAMGA YUBORAMIZ
            const telegramText = `
📢 Yangi bron qabul qilindi:

👤 Ism: ${firstName} ${lastName}
📧 Email: ${email}
📞 Telefon: ${phone}

🗓️ Bron vaqti: ${formatDateTime(createdAt)}
📅 Kirish sanasi: ${formatDate(checkIn)}
⏰ Kirish vaqti: ${formatTime(checkOutTime)}
🛏️ Xona: ${roomKeyMap[rooms] || rooms}
📆 Davomiylik: ${duration}
💶 To'lov Summasi: ${price ? `${price}€` : "-"}

✅ Mijoz kelganda, mavjud bo‘lgan ixtiyoriy bo‘sh xonaga joylashtiriladi

🌐 Sayt: khamsahotel.uz
`;

            const TELEGRAM_BOT_TOKEN = "8066986640:AAFpZPlyOkbjxWaSQTgBMbf3v8j7lgMg4Pk";
            const TELEGRAM_CHAT_ID = "-1002944437298";

            fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                chat_id: TELEGRAM_CHAT_ID,
                text: telegramText,
              }),
            })
              .then((res) => res.json())
              .then((data) => {
                if (data.ok) {
                  console.log("✅ Telegramga xabar yuborildi");
                } else {
                  console.error("❌ Telegram xabar xatosi:", data);
                }
              })
              .catch((err) => {
                console.error("🔴 Telegram fetch xatolik:", err);
              });
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
