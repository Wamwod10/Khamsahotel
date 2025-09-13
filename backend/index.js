// index.js

import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import dotenv from "dotenv";
import nodemailer from "nodemailer";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5002;
const BASE_URL = process.env.BASE_URL || "https://khamsahotel.uz";
const EUR_TO_UZS = 14000;

const {
  OCTO_SHOP_ID,
  OCTO_SECRET,
  EMAIL_USER,
  EMAIL_PASS,
} = process.env;

if (!OCTO_SHOP_ID || !OCTO_SECRET || !EMAIL_USER || !EMAIL_PASS) {
  console.error("❌ .env faylida kerakli ma'lumotlar yo‘q");
  process.exit(1);
}

// Nodemailer sozlamalari
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS,
  },
});

// Email yuborish funksiyasi
async function sendEmail(to, subject, text) {
  if (!to || !subject || !text) return;
  try {
    const info = await transporter.sendMail({
      from: `"Khamsa Hotel" <${EMAIL_USER}>`,
      to,
      subject,
      text,
    });
    console.log(`✅ Email yuborildi: ${to}`);
  } catch (err) {
    console.error("❌ Email yuborishda xatolik:", err.message || err);
  }
}

// Middleware
app.use(cors({
  origin: ["https://khamsahotel.uz", "https://www.khamsahotel.uz"],
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type"],
}));
app.use(express.json());

// To‘lov yaratish
app.post("/create-payment", async (req, res) => {
  try {
    const { amount, description = "Mehmonxona to'lovi", email } = req.body;
    if (!amount || !email) return res.status(400).json({ error: "Malumot yetarli emas" });

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
      return_url: `${BASE_URL}/success`,
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
    const data = JSON.parse(responseText);

    if (data.error === 0 && data.data?.octo_pay_url) {
      res.json({ paymentUrl: data.data.octo_pay_url });
    } else {
      res.status(400).json({ error: data.errMessage || "Octo xatosi" });
    }
  } catch (err) {
    console.error("❌ create-payment xatolik:", err);
    res.status(500).json({ error: "Server xatosi" });
  }
});

// Email yuborish (mijoz + admin)
app.post("/send-email", async (req, res) => {
  try {
    const { to, subject, text, adminInfo } = req.body;

    if (to && subject && text) {
      await sendEmail(to, subject, text);
    }

    if (adminInfo) {
      const {
        checkIn,
        checkInTime,
        roomType,
        duration,
        price,
        firstName,
        lastName,
        phone,
        email,
      } = adminInfo;

      const adminText = `
🆕 Yangi buyurtma:

👤 Mijoz: ${firstName} ${lastName}
📧 Email: ${email}
📞 Telefon: ${phone}

🏨 Xona turi: ${roomType}
📅 Check-In: ${checkIn}
⏰ Check-In vaqti: ${checkInTime}
🕒 Davomiylik: ${duration}
💰 Narxi: ${price}

Sayt orqali to‘lov amalga oshirildi.
`.trim();

      await sendEmail("shamshodochilov160@gmail.com", "🆕 Yangi buyurtma - Khamsa Hotel", adminText);
    }

    res.json({ success: true });
  } catch (err) {
    console.error("❌ /send-email xatolik:", err);
    res.status(500).json({ success: false, error: "Email yuborilmadi" });
  }
});

// Callback (optional)
app.post("/payment-callback", (req, res) => {
  console.log("🔁 Callback body:", req.body);
  res.json({ status: "callback received" });
});

// Serverni ishga tushirish
app.listen(PORT, () => {
  console.log(`✅ Server ishlayapti: ${BASE_URL} (port: ${PORT})`);
});
