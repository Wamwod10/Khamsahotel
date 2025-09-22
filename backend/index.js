import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import dotenv from "dotenv";
import nodemailer from "nodemailer";

dotenv.config();

const app = express();

/* =========================
   ENV & CONSTANTS
   ========================= */
const {
  PORT = 5002,
  BASE_URL = "https://hotel-backend-bmlk.onrender.com",
  FRONTEND_URL = "https://khamsahotel.uz",

  OCTO_SHOP_ID,
  OCTO_SECRET,
  EMAIL_USER,
  EMAIL_PASS,

  TELEGRAM_BOT_TOKEN,
  TELEGRAM_CHAT_ID,

  // Quyidagilar hozir ishlatilmayapti, lekin .env da bor:
  // BNOVO_API_KEY,
  // BNOVO_API_BASE,
} = process.env;

// EUR → UZS kursi (zarur bo‘lsa .env ga olib chiqishingiz mumkin)
const EUR_TO_UZS = 14000;

// TEST rejimi (istasa .env da OCTO_TEST=true qilib yoqish mumkin)
const OCTO_TEST = process.env.OCTO_TEST === "true";

// Adminga xabar jo‘natiladigan email
const ADMIN_EMAIL = "shamshodochilov160@gmail.com";

/* =========================
   STARTUP VALIDATION
   ========================= */
if (!OCTO_SHOP_ID || !OCTO_SECRET || !EMAIL_USER || !EMAIL_PASS) {
  console.error("❌ Kerakli .env qiymatlari yetishmayapti (OCTO_SHOP_ID, OCTO_SECRET, EMAIL_USER, EMAIL_PASS).");
  process.exit(1);
}
if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
  console.warn("⚠️ TELEGRAM_BOT_TOKEN yoki TELEGRAM_CHAT_ID topilmadi. Telegram xabarlari ishlamasligi mumkin.");
}

/* =========================
   EMAIL (Nodemailer / Gmail)
   ========================= */
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: { user: EMAIL_USER, pass: EMAIL_PASS },
});

async function sendEmail({ to, subject, text, html }) {
  if (!to || !subject || (!text && !html)) {
    const msg = "Email yuborish uchun to/subject/text|html kerak.";
    console.warn("⚠️", msg);
    throw new Error(msg);
  }
  const info = await transporter.sendMail({
    from: `"Khamsa Hotel" <${EMAIL_USER}>`,
    to,
    subject,
    text,
    html,
  });
  console.log(`✅ Email yuborildi → ${to} (messageId=${info.messageId})`);
  return info;
}

/* =========================
   TELEGRAM
   ========================= */
async function sendTelegram(text) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.warn("⚠️ Telegram sozlamalari yo‘q — xabar yuborilmadi.");
    return { ok: false, skipped: true };
  }
  if (!text) throw new Error("Telegram xabar matni bo‘sh bo‘lishi mumkin emas.");

  const resp = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text }),
  });
  const data = await resp.json();
  if (!data?.ok) {
    console.error("❌ Telegram xatolik:", data);
    throw new Error(`Telegram send failed: ${JSON.stringify(data)}`);
  }
  console.log("✅ Telegramga xabar yuborildi");
  return data;
}

/* =========================
   UTILS
   ========================= */
function nowISO() {
  return new Date().toISOString();
}
function octoInitTime() {
  // "YYYY-MM-DD HH:MM:SS" format
  return new Date().toISOString().replace("T", " ").substring(0, 19);
}
function parseJSONSafe(text, fallback = null) {
  try {
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}

/* =========================
   STATE (Idempotentlik uchun)
   ========================= */
const sentMap = new Map(); // bookingId => timestamp

/* =========================
   MIDDLEWARES
   ========================= */
app.use(
  cors({
    origin: [FRONTEND_URL, `${FRONTEND_URL}/`],
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
    credentials: false,
  })
);
app.use(express.json({ limit: "1mb" }));

/* =========================
   ROUTES
   ========================= */

// 1) Octo orqali to‘lov yaratish
app.post("/create-payment", async (req, res) => {
  try {
    const { amount, description = "Mehmonxona to'lovi", email } = req.body || {};
    if (!amount || !email) {
      return res.status(400).json({ error: "amount va email majburiy" });
    }

    // EUR → UZS
    const amountUZS = Math.round(Number(amount) * EUR_TO_UZS);
    if (!Number.isFinite(amountUZS) || amountUZS <= 0) {
      return res.status(400).json({ error: "amount noto‘g‘ri" });
    }

    const payload = {
      octo_shop_id: Number(OCTO_SHOP_ID),
      octo_secret: OCTO_SECRET,
      shop_transaction_id: Date.now().toString(),
      auto_capture: true,
      test: OCTO_TEST, // test rejimi .env orqali boshqariladi
      init_time: octoInitTime(),
      total_sum: amountUZS,
      currency: "UZS",
      description: `${description} (${amount} EUR)`,
      return_url: `${FRONTEND_URL}/success`,
      notify_url: `${BASE_URL}/payment-callback`,
      language: "uz",
      custom_data: { email },
    };

    console.log("➡️ Octo prepare_payment payload:", payload);

    const resp = await fetch("https://secure.octo.uz/prepare_payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const raw = await resp.text();
    const data = parseJSONSafe(raw, null);

    console.log("⬅️ Octo status:", resp.status);
    console.log("⬅️ Octo raw:", raw);

    if (!data) {
      return res.status(502).json({ error: "Octo javobi JSON emas" });
    }
    if (data.error === 0 && data?.data?.octo_pay_url) {
      return res.json({ paymentUrl: data.data.octo_pay_url });
    }

    // Octo qaytargan xatoni iloji boricha foydali qilib yuboramiz
    return res.status(400).json({
      error: data.errMessage || data.message || "Octobank xatosi",
      details: data,
    });
  } catch (err) {
    console.error("❌ /create-payment xatolik:", err?.message || err);
    return res.status(500).json({ error: "Server xatosi" });
  }
});

// 2) Faqat email yuborish
app.post("/send-email", async (req, res) => {
  try {
    const { to, subject, text, html } = req.body || {};
    await sendEmail({ to, subject, text, html });
    res.json({ success: true });
  } catch (err) {
    console.error("❌ /send-email xatolik:", err?.message || err);
    res.status(500).json({ success: false, error: "Email yuborilmadi" });
  }
});

// 3) Faqat telegram xabar yuborish
app.post("/send-telegram", async (req, res) => {
  try {
    const { text } = req.body || {};
    const data = await sendTelegram(text);
    res.json({ ok: true, result: data });
  } catch (err) {
    console.error("❌ /send-telegram xatolik:", err?.message || err);
    res.status(500).json({ ok: false, error: "Telegram yuborilmadi" });
  }
});

// 4) Octo callback (audit/log)
app.post("/payment-callback", (req, res) => {
  console.log("🔁 /payment-callback at", nowISO());
  console.log("Body:", req.body);
  res.json({ status: "callback received" });
});

// 5) Booking: admin emailga xabar (Bnovo integratsiyasiz)
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
    } = req.body || {};

    if (!checkIn || !checkOutTime || !rooms || !firstName || !email) {
      return res.status(400).json({ error: "Kerakli maydonlar yetarli emas" });
    }

    const getCheckoutDate = (checkInISO, dur) => {
      const date = new Date(checkInISO);
      if (dur && dur.includes("3")) date.setHours(date.getHours() + 3);
      else if (dur && dur.includes("10")) date.setHours(date.getHours() + 10);
      else date.setDate(date.getDate() + 1);
      return date.toISOString().split("T")[0];
    };
    const checkOut = getCheckoutDate(checkIn, duration);

    const createdAt = nowISO();

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
    } catch (e) {
      console.error("❌ Admin email yuborishda xatolik:", e?.message || e);
    }

    res.json({
      success: true,
      message: "Bron muvaffaqiyatli yuborildi",
      createdAt,
      payload: { checkIn, checkOut, rooms, guests, firstName, lastName, phone, email, price, duration },
    });
  } catch (err) {
    console.error("❌ /api/bookings xatolik:", err?.message || err);
    res.status(500).json({ error: "Bron qilishda server xatosi" });
  }
});

// 6) NOTIFY: mijozga email + admin email + telegram (barchasi bir joyda) — idempotent
app.post("/notify-booking", async (req, res) => {
  try {
    const { bookingId, customerEmail, subject, emailText, telegramText, booking } = req.body || {};

    if (!bookingId) return res.status(400).json({ ok: false, error: "bookingId required" });
    if (!customerEmail) return res.status(400).json({ ok: false, error: "customerEmail required" });
    if (!emailText && !subject) return res.status(400).json({ ok: false, error: "email content required" });

    if (sentMap.has(bookingId)) {
      return res.json({ ok: true, skipped: true, reason: "Already sent for this bookingId" });
    }

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

    // 1) Mijozga email
    await sendEmail({
      to: customerEmail,
      subject: subject || "Your Booking Confirmation – Khamsahotel.uz",
      text: emailText,
      html,
    });

    // 2) Admin emailga nusxa
    if (ADMIN_EMAIL) {
      await sendEmail({
        to: ADMIN_EMAIL,
        subject: `New Booking – ${booking?.firstName || ""} ${booking?.lastName || ""}`,
        text: telegramText || "[no telegram text provided]",
      });
    }

    // 3) Telegram
    if (telegramText) {
      await sendTelegram(telegramText);
    }

    // Idempotent belgilash
    sentMap.set(bookingId, Date.now());

    res.json({ ok: true });
  } catch (err) {
    console.error("❌ /notify-booking xatolik:", err?.message || err);
    res.status(500).json({ ok: false, error: "Notify failed" });
  }
});

// Health
app.get("/health", (_req, res) => res.json({ ok: true, ts: nowISO() }));

/* =========================
   START SERVER
   ========================= */
app.listen(Number(PORT), () => {
  console.log(`✅ Server ishlayapti: ${BASE_URL} (port: ${PORT})`);
});
