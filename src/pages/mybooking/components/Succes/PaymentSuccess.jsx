// PaymentSuccess.jsx
import React, { useEffect, useState } from "react";
import "./PaymentSuccess.scss";

// 🔗 Backend bazaviy URL (Vite yoki global window orqali)
const API_BASE =
  (typeof import.meta !== "undefined" &&
    import.meta.env &&
    (import.meta.env.VITE_API_BASE || import.meta.env.VITE_API_BASE_URL)) ||
  window.__API_BASE__ ||
  "https://hotel-backend-bmlk.onrender.com";

// ⚠️ Telegram token/chat ID — siz so‘raganingizdek FRONTENDDA qoldirildi
const TELEGRAM_BOT_TOKEN = "8066986640:AAFpZPlyOkbjxWaSQTgBMbf3v8j7lgMg4Pk";
const TELEGRAM_CHAT_ID = "-1002944437298";

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

export default function PaymentSuccess() {
  const [state, setState] = useState({ status: "working", msg: "" }); // working | ok | fail | idle

  useEffect(() => {
    let cancelled = false;

    async function run() {
      // 0) MyBooking bilan moslashuv: allBookings[0] ni localStorage ga ham qo‘shib qo‘yamiz
      const allBookings = JSON.parse(sessionStorage.getItem("allBookings")) || [];
      const latest = allBookings[0] || null;
      if (latest) {
        const withSource = { ...latest, source: "local" };
        const localAll = JSON.parse(localStorage.getItem("allBookings")) || [];
        localStorage.setItem("allBookings", JSON.stringify([withSource, ...localAll]));
      }

      // 1) pendingPayment (commit uchun zarur)
      const pending =
        JSON.parse(sessionStorage.getItem("pendingPayment")) ||
        JSON.parse(localStorage.getItem("pendingPayment"));
      if (!pending || !pending.commitPayload) {
        if (!cancelled) setState({ status: "idle", msg: "Hech qanday to‘lov ma’lumoti topilmadi." });
        return;
      }

      // 2) Commit’ni 2 marta yubormaslik uchun flag
      if (sessionStorage.getItem("commitDone") === "true") {
        if (!cancelled) setState({ status: "ok", msg: "To‘lov avval tasdiqlangan." });
      } else {
        try {
          // Backendga commit (Bnovo’ga bron yuborishni backend qiladi)
          const body = {
            ...pending.commitPayload, // { checkIn, duration, rooms, firstName, lastName, phone, email, guests, price }
            shopTxId: pending.shop_transaction_id || null,
          };

          const resp = await fetch(`${API_BASE}/api/bookings/commit`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });

          const text = await resp.text();
          let data = {};
          try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }

          if (!resp.ok || !data?.success) {
            if (!cancelled)
              setState({
                status: "fail",
                msg:
                  (data && (data.error || data.details)) ||
                  "Bnovo’ga bron yuborishda xatolik yuz berdi.",
              });
          } else {
            // 3) allBookings ichida mos yozuvni 'paid' qilish
            const markPaid = (list) => {
              if (!Array.isArray(list)) return list;
              return list.map((b, idx) => {
                // bookingId bo‘lsa shu bo‘yicha, bo‘lmasa latest’ni
                if (pending.bookingId && b.id === pending.bookingId) return { ...b, status: "paid" };
                if (!pending.bookingId && idx === 0) return { ...b, status: "paid" };
                return b;
              });
            };
            const s1 = JSON.parse(sessionStorage.getItem("allBookings")) || [];
            const l1 = JSON.parse(localStorage.getItem("allBookings")) || [];
            const s2 = markPaid(s1);
            const l2 = markPaid(l1);
            sessionStorage.setItem("allBookings", JSON.stringify(s2));
            localStorage.setItem("allBookings", JSON.stringify(l2));
            sessionStorage.setItem("commitDone", "true");

            if (!cancelled) setState({ status: "ok", msg: "To‘lov tasdiqlandi, bron yaratildi." });
          }
        } catch (e) {
          if (!cancelled) setState({ status: "fail", msg: e?.message || "Commit xatolik." });
        }
      }

      // 4) Email & Telegram — faqat bir marta frontenddan yuboramiz (siz so‘raganidek)
      const alreadySent = localStorage.getItem("bookingSent");
      const latestAfter = (JSON.parse(sessionStorage.getItem("allBookings")) || [])[0] || latest;
      if (!latestAfter) return; // safety

      if (!alreadySent) {
        try {
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
          } = latestAfter;

          // Email matni
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
`.trim();

          // 4.1 EMAIL (frontenddan)
          const emailData = {
            to: email,
            subject: "Your Booking Confirmation – Khamsahotel.uz",
            text: emailText,
          };
          const mailRes = await fetch(`${API_BASE}/send-email`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(emailData),
          });
          const mailJson = await mailRes.json();
          if (!mailJson?.success) {
            console.error("❌ Email yuborishda xato:", mailJson);
          }

          // 4.2 TELEGRAM (frontenddan)
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
`.trim();

          await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: telegramText }),
          });

          localStorage.setItem("bookingSent", "true");
        } catch (err) {
          console.error("Email/Telegram yuborishda xato:", err);
        }
      }
    }

    run();
    return () => { cancelled = true; };
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
        {state.status === "fail"
          ? `Xatolik: ${state.msg}`
          : state.status === "ok"
          ? "Rahmat! Buyurtmangiz tasdiqlandi. Sizga tasdiqnoma email orqali yuborildi."
          : state.status === "idle"
          ? "To‘lov ma’lumoti topilmadi, ammo broningiz saqlangan bo‘lishi mumkin."
          : "Yakunlanmoqda..."}
      </p>

      <a className="back-home" href="/">
        Bosh sahifaga qaytish
      </a>
      <a className="back-home" style={{ marginLeft: 12 }} href="/mybooking">
        MyBooking
      </a>
    </div>
  );
}
