import React, { useEffect } from "react";
import "./PaymentSuccess.scss";

/**
 * Ushbu komponent:
 *  - sessionStorage dan oxirgi bookingni oladi (allBookings[0])
 *  - localStorage ga tarix sifatida qo‘shadi
 *  - bookingId (deterministik) hisoblaydi va idempotentlikni ta’minlaydi
 *  - backenddagi /notify-booking endpointiga bitta so‘rov bilan
 *    - mijozga email
 *    - admin email
 *    - Telegram xabar
 *    yuborishni boshlaydi (token/parollar serverda)
 */

const PaymentSuccess = () => {
  // Vite bilan: oldingi BNOVO_API_BASE o‘rniga VITE_API_BASE ishlatamiz
  const API_BASE = import.meta.env.VITE_API_BASE;

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

  // Bron uchun barqaror ID yaratamiz (email + createdAt + checkIn + rooms asosida)
  const makeBookingId = (b) => {
    const seed = `${b?.email || ""}|${b?.createdAt || ""}|${b?.checkIn || ""}|${b?.rooms || ""}`;
    let h = 0;
    for (let i = 0; i < seed.length; i++) {
      h = (h << 5) - h + seed.charCodeAt(i);
      h |= 0;
    }
    return `bk_${Math.abs(h)}`;
  };

  useEffect(() => {
    (async () => {
      try {
        if (!API_BASE) {
          console.error("🔴 VITE_API_BASE aniqlanmadi. .env faylini tekshiring.");
          return;
        }

        // 1) Oxirgi bookingni sessionStorage’dan olamiz
        const allBookings = JSON.parse(sessionStorage.getItem("allBookings")) || [];
        const latest = allBookings[0];
        if (!latest) {
          console.warn("⚠️ SessionStorage’da allBookings topilmadi yoki bo‘sh.");
          return;
        }

        // 2) Tarix uchun localStorage ga qo‘shib qo‘yamiz (boshiga)
        const bookingWithSource = { ...latest, source: "local" };
        const localBookings = JSON.parse(localStorage.getItem("allBookings")) || [];
        const updatedLocalBookings = [bookingWithSource, ...localBookings];
        localStorage.setItem("allBookings", JSON.stringify(updatedLocalBookings));

        // 3) Idempotentlik kaliti
        const bookingId = makeBookingId(latest);
        const sentKey = `bookingSent:${bookingId}`;
        if (localStorage.getItem(sentKey)) {
          // allaqachon yuborilgan
          return;
        }

        // 4) Kerakli maydonlarni ajratib olamiz
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
          createdAt, // agar backend /api/bookings qaytargan bo‘lsa, bo‘ladi
        } = latest;

        // createdAt bo‘lmasa – hozirgi vaqtni yozib yuboramiz, formatDateTime bilan chiroyli chiqarish uchun
        const createdAtSafe = createdAt || new Date().toISOString();

        // 5) Mijozga boradigan email matni (TEXT)
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
📞 Phone: ${phone || "-"}

🗓️ Booking Date: ${formatDateTime(createdAtSafe)}
📅 Check-in Date: ${formatDate(checkIn)}
⏰ Check-in Time: ${formatTime(checkOutTime)}
🛏️ Room Type: ${roomKeyMap[rooms] || rooms || "-"}
📆 Duration: ${duration || "-"}
💶 Price: ${price ? `${price}€` : "-"}

-------------------------------------
Thank you for your reservation. We look forward to welcoming you! 

- Khamsa Sleep Lounge Team
`.trim();

        // 6) Telegramga guruh xabari
        const telegramText = `
📢 Yangi bron qabul qilindi:

👤 Ism: ${firstName} ${lastName}
📧 Email: ${email}
📞 Telefon: ${phone || "-"}

🗓️ Bron vaqti: ${formatDateTime(createdAtSafe)}
📅 Kirish sanasi: ${formatDate(checkIn)}
⏰ Kirish vaqti: ${formatTime(checkOutTime)}
🛏️ Xona: ${roomKeyMap[rooms] || rooms || "-"}
📆 Davomiylik: ${duration || "-"}
💶 To'lov Summasi: ${price ? `${price}€` : "-"}

✅ Mijoz kelganda, mavjud bo‘lgan ixtiyoriy bo‘sh xonaga joylashtiriladi

🌐 Sayt: khamsahotel.uz
`.trim();

        // 7) Backendga bitta so‘rov bilan hammasini yuborish
        const resp = await fetch(`${API_BASE}/notify-booking`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bookingId,                 // idempotent
            customerEmail: email,      // mijoz emaili
            subject: "Your Booking Confirmation – Khamsahotel.uz",
            emailText,                 // mijozga TEXT
            telegramText,              // Telegram guruhga matn
            booking: {
              firstName,
              lastName,
              phone,
              email,
              checkIn,
              checkOutTime,
              rooms,
              duration,
              price,
              createdAt: createdAtSafe,
            },
          }),
        });

        const data = await resp.json();
        if (resp.ok && data?.ok) {
          localStorage.setItem(sentKey, "true");
          console.log("✅ Xabarnomalar yuborildi (email + telegram).");
        } else if (data?.skipped) {
          // Server: Already sent for this bookingId
          localStorage.setItem(sentKey, "true");
          console.log("ℹ️ Bu booking uchun xabarlar allaqachon yuborilgan.");
        } else {
          console.error("❌ Xabarnomalar yuborishda xatolik:", data);
        }
      } catch (err) {
        console.error("🔴 PaymentSuccess useEffect xatolik:", err);
      }
    })();
  }, [API_BASE]);

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
