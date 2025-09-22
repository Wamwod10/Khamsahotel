import React, { useEffect, useMemo } from "react";
import "./PaymentSuccess.scss";

function getApiBase() {
  const env =
    (import.meta?.env && import.meta.env.VITE_API_BASE_URL) ||
    process.env?.REACT_APP_API_BASE_URL ||
    "";
  return (env || "").replace(/\/+$/, "") || window.location.origin;
}
async function safeFetchJson(input, init) {
  const res = await fetch(input, init);
  const ct = res.headers.get("content-type") || "";
  let data;
  try {
    data = ct.includes("application/json") ? await res.json() : await res.text();
  } catch {
    data = await res.text().catch(() => "");
  }
  return { ok: res.ok, status: res.status, data };
}

const PaymentSuccess = () => {
  const API_BASE = useMemo(getApiBase, []);

  const roomKeyMap = {
    "Standard Room": "Standard Room",
    "Family Room": "Family Room",
    "2 Standard Rooms": "2 Standard Rooms",
    "2 Family Rooms": "2 Family Rooms",
    "Standard + 1 Family room": "Standard + 1 Family room",
  };

  const formatDate = (s) => {
    if (!s) return "-";
    const [y, m, d] = s.split("-");
    return `${d}.${m}.${y}`;
  };
  const formatTime = (s) => {
    if (!s) return "-";
    if (s.includes("T")) return s.split("T")[1].slice(0, 5);
    return s.slice(0, 5);
  };
  const formatDateTime = (s) => {
    if (!s) return "-";
    const d = new Date(s);
    const pad = (n) => String(n).padStart(2, "0");
    return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  useEffect(() => {
    const all = JSON.parse(sessionStorage.getItem("allBookings") || "[]");
    const latest = all[0];
    if (!latest) return;

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
YOUR BOOKING DETAILS
------------------------------

Guest: ${firstName} ${lastName}
Email: ${email}
Phone: ${phone}

Booking Date: ${formatDateTime(createdAt)}
Check-in Date: ${formatDate(checkIn)}
Check-in Time: ${formatTime(checkOutTime)}
Room Type: ${roomKeyMap[rooms] || rooms}
Duration: ${duration}
Price: ${price ? `${price}€` : "-"}

Thank you for your reservation. We look forward to welcoming you!
- Khamsa Sleep Lounge Team
`.trim();

    // 1) mijozga email
    safeFetchJson(`${API_BASE}/send-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: email,
        subject: "Your Booking Confirmation – Khamsahotel.uz",
        text: emailText,
      }),
    }).then(({ ok, data }) => {
      if (!ok) console.error("send-email error:", data);
    });

    // 2) admin guruhiga telegramni backend orqali
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
`.trim();

    safeFetchJson(`${API_BASE}/notify-telegram`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: telegramText }),
    }).then(({ ok, data }) => {
      if (!ok) console.error("notify-telegram error:", data);
    });
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
        Rahmat! Buyurtmangiz qabul qilindi. Tasdiqnoma email orqali yuborildi.
      </p>
      <a className="back-home" href="/">Bosh sahifaga qaytish</a>
    </div>
  );
};

export default PaymentSuccess;
