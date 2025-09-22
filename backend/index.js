import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import dotenv from "dotenv";
import nodemailer from "nodemailer";

dotenv.config();

const app = express();

// === ENV & CONSTS ===
const PORT = process.env.PORT || 5002;
const BASE_URL = process.env.BASE_URL || "https://hotel-backend-bmlk.onrender.com";
const FRONTEND_URL = process.env.FRONTEND_URL || "https://khamsahotel.uz";
const EUR_TO_UZS = 14000;

const {
  OCTO_SHOP_ID,
  OCTO_SECRET,
  EMAIL_USER,
  EMAIL_PASS,
  TELEGRAM_BOT_TOKEN,
  TELEGRAM_CHAT_ID,
  // BNOVO_API_KEY,
  // BNOVO_API_BASE,
} = process.env;

// Admin email (bu yerda ixtiyoriy ravishda .env dan ham o'qishingiz mumkin)
const ADMIN_EMAIL = "shamshodochilov160@gmail.com";

// Minimal tekshiruvlar
if (!OCTO_SHOP_ID || !OCTO_SECRET || !EMAIL_USER || !EMAIL_PASS) {
  console.error("❌ .env faylida kerakli ma'lumotlar yetishmayapti (OCTO_SHOP_ID/OCTO_SECRET/EMAIL_USER/EMAIL_PASS).");
  process.exit(1);
}
if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
  console.warn("⚠️ TELEGRAM_BOT_TOKEN yoki TELEGRAM_CHAT_ID topilmadi. Telegram xabarlari ishlamasligi mumkin.");
}

// === EMAIL transporter (Gmail SMTP) ===
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS,
  },
});

// === HELPERS ===
async function sendEmail({ to, subject, text, html }) {
  if (!to || !subject || (!text && !html)) {
    console.warn("⚠️ Email yuborish uchun yetarli ma'lumot yo‘q (to/subject/text|html).");
    return;
  }
  try {
    const info = await transporter.sendMail({
      from: `"Khamsa Hotel" <${EMAIL_USER}>`,
      to,
      subject,
      text,
      html,
    });
    console.log(`✅ Email yuborildi: ${to}`);
    return info;
  } catch (err) {
    console.error(`❌ Email yuborishda xatolik (${to}):`, err?.message || err);
    throw err;
  }
}

async function sendTelegram(text) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.warn("⚠️ Telegram sozlamalari yo‘q — xabar yuborilmadi.");
    return { ok: false, skipped: true };
  }
  if (!text) {
    console.warn("⚠️ Telegram xabar matni yo‘q.");
    return { ok: false };
  }
  const tgResp = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text }),
  }).then((r) => r.json());

  if (!tgResp?.ok) {
    console.error("❌ Telegram xatolik:", tgResp);
    throw new Error("Telegram send failed");
  }
  console.log("✅ Telegramga xabar yuborildi");
  return tgResp;
}

// Backend darajasida idempotentlik uchun oddiy xotira kechasi
const sentMap = new Map(); // bookingId => timestamp

// === MIDDLEWARES ===
app.use(
  cors({
    origin: [FRONTEND_URL, `${FRONTEND_URL}/`],
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
  })
);
app.use(express.json({ limit: "1mb" }));

// === ROUTES ===

// 1) Octo orqali to‘lov yaratish
app.post("/create-payment", async (req, res) => {
  try {
    const { amount, description = "Mehmonxona to'lovi", email } = req.body;
    if (!amount || !email) {
      return res.status(400).json({ error: "Ma'lumot yetarli emas" });
    }

    const amountUZS = Math.round(amount * EUR_TO_UZS);

    const paymentData = {
      octo_shop_id: Number(OCTO_SHOP_ID),
      octo_secret: OCTO_SECRET,
      shop_transaction_id: Date.now().toString(),
      auto_capture: true,
      test: false,
      init_time: new Date().toISOString().replace("T", " ").substring(0, 19),
      total_sum: amountUZS,
      currency: "UZS",
      description: `${description} (${amount} EUR)`,
      return_url: `${FRONTEND_URL}/success`,
      notify_url: `${BASE_URL}/payment-callback`,
      language: "uz",
      custom_data: { email },
    };

    const response = await fetch("https://secure.octo.uz/prepare_payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(paymentData),
    });

    const responseText = await response.text();
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (_) {
      console.error("❌ Octo javobi JSON emas:", responseText);
      return res.status(400).json({ error: "Octobank javobi noto‘g‘ri formatda" });
    }

    if (data.error === 0 && data.data?.octo_pay_url) {
      return res.json({ paymentUrl: data.data.octo_pay_url });
    } else {
      return res.status(400).json({ error: data.errMessage || "Octobank xatosi" });
    }
  } catch (err) {
    console.error("❌ create-payment xatolik:", err);
    res.status(500).json({ error: "Server xatosi" });
  }
});

// 2) Faqat email yuborish (oddiy endpoint)
app.post("/send-email", async (req, res) => {
  try {
    const { to, subject, text, html } = req.body;
    if (!to || !subject || (!text && !html)) {
      return res.status(400).json({ success: false, error: "To‘liq ma’lumot yuborilmadi" });
    }
    await sendEmail({ to, subject, text, html });
    res.json({ success: true });
  } catch (err) {
    console.error("❌ /send-email xatolik:", err);
    res.status(500).json({ success: false, error: "Email yuborilmadi" });
  }
});

// 3) Telegram xabar yuborish (oddiy endpoint)
app.post("/send-telegram", async (req, res) => {
  try {
    const { text } = req.body || {};
    if (!text) return res.status(400).json({ ok: false, error: "text required" });

    const r = await sendTelegram(text);
    res.json({ ok: true, result: r });
  } catch (e) {
    console.error("❌ /send-telegram xatolik:", e?.message || e);
    res.status(500).json({ ok: false, error: "Telegram yuborilmadi" });
  }
});

// 4) To‘lov callback (audit uchun)
app.post("/payment-callback", (req, res) => {
  console.log("🔁 Callback body:", req.body);
  res.json({ status: "callback received" });
});

// 5) Booking (Bnovo integratsiyasiz, admin emailga xabar)
app.post("/api/bookings", async (req, res) => {
  try {
    const {
      checkIn,
      checkOutTime,
      duration,
      rooms,
      guests,
      firstName,
      lastName,
      phone,
      email,
      price,
    } = req.body;

    if (!checkIn || !checkOutTime || !rooms || !firstName || !email) {
      return res.status(400).json({ error: "Kerakli ma'lumotlar yetarli emas" });
    }

    const getCheckoutDate = (checkIn, duration) => {
      const date = new Date(checkIn);
      if (duration && duration.includes("3")) date.setHours(date.getHours() + 3);
      else if (duration && duration.includes("10")) date.setHours(date.getHours() + 10);
      else date.setDate(date.getDate() + 1);
      return date.toISOString().split("T")[0];
    };

    const checkOut = getCheckoutDate(checkIn, duration);

    const roomTypeMap = {
      "Standard Room": 117445,
      "Family Room": 117446,
      "2 Standard Rooms": 117445,
      "2 Family Rooms": 117446,
      "Standard + 1 Family room": 117447,
    };
    const room_type_id = roomTypeMap[rooms] || 117445;

    const createdAt = new Date().toISOString();

    const bookingPayload = {
      date_from: checkIn,
      date_to: checkOut,
      rooms: [{ room_type_id, guests }],
      customer: {
        first_name: firstName,
        last_name: lastName,
        phone,
        email,
      },
      comment: `Xona: ${rooms} | Narx: ${price} EUR | Sayt: ${FRONTEND_URL}`,
    };

    // const bnovoResponse = await bnovo.createBooking(bookingPayload); // olib tashlangan

    const emailSubject = "Yangi bron qilish haqida xabar";
    const emailText = `
Yangi bron qabul qilindi:

👤 Ism: ${firstName} ${lastName}
📞 Telefon: ${phone || "Noma'lum"}
📧 Email: ${email}

📅 Kirish sana: ${checkIn}
📆 Chiqish sana: ${checkOut}
🛏️ Xona turi: ${rooms}
👥 Mehmonlar soni: ${guests || "Noma'lum"}
💶 Narx: ${price} EUR
🕓 Bron qilingan vaqt: ${createdAt}

🌐 Sayt: ${FRONTEND_URL}
`.trim();

    try {
      await sendEmail({ to: ADMIN_EMAIL, subject: emailSubject, text: emailText });
      console.log("✅ Admin email yuborildi:", ADMIN_EMAIL);
    } catch (emailErr) {
      console.error("❌ Admin email yuborishda xatolik:", emailErr?.message || emailErr);
    }

    res.json({
      success: true,
      message: "Bron muvaffaqiyatli yuborildi",
      createdAt,
      bookingPayload, // audit uchun foydali
      room_type_id,
    });
  } catch (error) {
    console.error("❌ /api/bookings xatolik:", error?.message || error);
    res.status(500).json({ error: "Bron qilishda server xatosi" });
  }
});

// 6) NOTIFY: mijozga email + admin email + telegram — barchasi bitta chaqiriqda
app.post("/notify-booking", async (req, res) => {
  try {
    const { bookingId, customerEmail, subject, emailText, telegramText, booking } = req.body || {};

    if (!bookingId) return res.status(400).json({ ok: false, error: "bookingId required" });
    if (!customerEmail) return res.status(400).json({ ok: false, error: "customerEmail required" });
    if (!emailText && !subject) return res.status(400).json({ ok: false, error: "email content required" });

    // idempotentlik: server darajasida ham tekshiramiz
    if (sentMap.has(bookingId)) {
      return res.json({ ok: true, skipped: true, reason: "Already sent for this bookingId" });
    }

    // 6.1) Mijozga email (text + HTML versiya)
    const html = `
      <div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#111">
        <p>Thank you for choosing to stay with us via <strong>Khamsahotel.uz</strong>!</p>
        <p>Please be informed that we are a <strong>SLEEP LOUNGE</strong> located inside the airport within the transit area.
        To stay with us, you must have a valid boarding pass departing from Tashkent Airport.</p>
        <p><strong>IMPORTANT NOTE:</strong><br/>
        We will never ask you for your credit card details or send links via Khamsahotel.uz for online payments or booking confirmation.</p>
        <p>If you have any doubts about your booking status, please check via the Khamsahotel.uz website or app only,
        call us at <a href="tel:+998958772424">+998 95 877 24 24</a> (tel/WhatsApp/Telegram), or email us at
        <a href="mailto:qonoqhotel@mail.ru">qonoqhotel@mail.ru</a>.</p>
        <hr/>
        <h3>🔔 YOUR BOOKING DETAILS</h3>
        <ul>
          <li>👤 Guest: ${booking?.firstName || ""} ${booking?.lastName || ""}</li>
          <li>📧 Email: ${booking?.email || customerEmail || ""}</li>
          <li>📞 Phone: ${booking?.phone || ""}</li>
          <li>🗓️ Booking Date: ${booking?.createdAt || ""}</li>
          <li>📅 Check-in: ${booking?.checkIn || ""}</li>
          <li>⏰ Time: ${booking?.checkOutTime || ""}</li>
          <li>🛏️ Room: ${booking?.rooms || ""}</li>
          <li>📆 Duration: ${booking?.duration || ""}</li>
          <li>💶 Price: ${booking?.price ? `${booking.price}€` : "-"}</li>
        </ul>
        <p>Thank you for your reservation. We look forward to welcoming you!</p>
        <p>– Khamsa Sleep Lounge Team</p>
      </div>
    `;

    await sendEmail({
      to: customerEmail,
      subject: subject || "Your Booking Confirmation – Khamsahotel.uz",
      text: emailText,
      html,
    });

    // 6.2) Admin emailga nusxa (ixtiyoriy, teleqram matnini yuboramiz)
    if (ADMIN_EMAIL) {
      await sendEmail({
        to: ADMIN_EMAIL,
        subject: `New Booking – ${booking?.firstName || ""} ${booking?.lastName || ""}`,
        text: telegramText || "[no telegram text provided]",
      });
    }

    // 6.3) Telegramga xabar
    if (telegramText) {
      await sendTelegram(telegramText);
    }

    // idempotent belgi
    sentMap.set(bookingId, Date.now());

    res.json({ ok: true });
  } catch (e) {
    console.error("❌ /notify-booking xatolik:", e?.message || e);
    res.status(500).json({ ok: false, error: "Notify failed" });
  }
});

// 7) Health-check
app.get("/health", (_, res) => res.json({ ok: true }));

// === START ===
app.listen(PORT, () => {
  console.log(`✅ Server ishlayapti: ${BASE_URL} (port: ${PORT})`);
});
