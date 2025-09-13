// index.js

import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import dotenv from "dotenv";
import nodemailer from "nodemailer";
import BnovoAPI from "./bnovo.js";

// .env faylini yuklash
dotenv.config();

// Express ilova
const app = express();
const PORT = process.env.PORT || 5002;
const BASE_URL = process.env.BASE_URL || "https://hotel-backend-bmlk.onrender.com";
const FRONTEND_URL = process.env.FRONTEND_URL || "https://khamsahotel.uz";
const EUR_TO_UZS = 14000;

// Muhit o'zgaruvchilar
const {
  OCTO_SHOP_ID,
  OCTO_SECRET,
  EMAIL_USER,
  EMAIL_PASS,
  BNOVO_API_KEY,
  BNOVO_API_BASE,
} = process.env;

<<<<<<< HEAD
// Muhim ma'lumotlar mavjudligini tekshirish
if (!OCTO_SHOP_ID || !OCTO_SECRET || !EMAIL_USER || !EMAIL_PASS) {
=======
// .env tekshiruv
if (!OCTO_SHOP_ID || !OCTO_SECRET || !EMAIL_USER || !EMAIL_PASS || !BNOVO_API_KEY) {
>>>>>>> 0e765f8 (dda)
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

<<<<<<< HEAD
// Foydalanuvchiga email yuborish funksiyasi
const sendEmail = async (to, subject, text) => {
=======
// Email yuborish funksiyasi
async function sendEmail(to, subject, text) {
>>>>>>> 0e765f8 (dda)
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
};

// Middleware
app.use(cors({
  origin: [FRONTEND_URL, `${FRONTEND_URL}/`],
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type"],
}));
app.use(express.json());

<<<<<<< HEAD
// To‘lov yaratish endpoint
app.post("/create-payment", async (req, res) => {
  try {
    const { amount, description = "Mehmonxona to'lovi", email } = req.body;

    if (!amount || !email) {
      return res.status(400).json({ error: "Ma'lumot yetarli emas" });
    }
=======
// Octobank orqali to‘lov yaratish
app.post("/create-payment", async (req, res) => {
  try {
    const { amount, description = "Mehmonxona to'lovi", email } = req.body;
    if (!amount || !email) return res.status(400).json({ error: "Ma'lumot yetarli emas" });
>>>>>>> 0e765f8 (dda)

    const amountUZS = Math.round(amount * EUR_TO_UZS);

    const paymentData = {
      octo_shop_id: Number(OCTO_SHOP_ID),
      octo_secret: OCTO_SECRET,
      shop_transaction_id: Date.now().toString(),
      auto_capture: true,
      test: false, // Test rejimi o‘chirib qo‘yilgan
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
    const data = JSON.parse(responseText);

    if (data.error === 0 && data.data?.octo_pay_url) {
<<<<<<< HEAD
      return res.json({ paymentUrl: data.data.octo_pay_url });
=======
      res.json({ paymentUrl: data.data.octo_pay_url });
    } else {
      res.status(400).json({ error: data.errMessage || "Octobank xatosi" });
>>>>>>> 0e765f8 (dda)
    }

    res.status(400).json({ error: data.errMessage || "Octo xatosi" });

  } catch (err) {
    console.error("❌ /create-payment xatolik:", err);
    res.status(500).json({ error: "Server xatosi" });
  }
});

// Email yuborish endpoint
app.post("/send-email", async (req, res) => {
  try {
    const { to, subject, text } = req.body;

    if (to && subject && text) {
      await sendEmail(to, subject, text);
      return res.json({ success: true });
    }

    res.status(400).json({ success: false, error: "To‘liq ma’lumot yuborilmadi" });

  } catch (err) {
    console.error("❌ /send-email xatolik:", err);
    res.status(500).json({ success: false, error: "Email yuborilmadi" });
  }
});

<<<<<<< HEAD
// Octo tomonidan yuboriladigan callback endpoint (ixtiyoriy)
=======
// Octobank callback
>>>>>>> 0e765f8 (dda)
app.post("/payment-callback", (req, res) => {
  console.log("🔁 Callback body:", req.body);
  res.json({ status: "callback received" });
});

// Bnovo API client yaratamiz
const bnovo = new BnovoAPI(BNOVO_API_KEY, BNOVO_API_BASE);

// Booking endpoint — Bnovoga bron yuborish
app.post("/api/bookings", async (req, res) => {
  try {
    const {
      checkIn,
      checkOutTime,
      duration,
      rooms,
      guests,
      hotel,
      firstName,
      lastName,
      phone,
      email,
      price,
    } = req.body;

    if (!checkIn || !checkOutTime || !rooms || !firstName || !email) {
      return res.status(400).json({ error: "Kerakli ma'lumotlar yetarli emas" });
    }

    // Checkout hisoblash
    const getCheckoutDate = (checkIn, duration) => {
      const date = new Date(checkIn);
      if (duration.includes("3")) date.setHours(date.getHours() + 3);
      else if (duration.includes("10")) date.setHours(date.getHours() + 10);
      else date.setDate(date.getDate() + 1); // 1 kun
      return date.toISOString().split("T")[0];
    };

    const checkOut = getCheckoutDate(checkIn, duration);

    // Xonalarni mapping qilish
    const roomTypeMap = {
      "Standard Room": 117445,
      "Family Room": 117446,
      "2 Standard Rooms": 117445,
      "2 Family Rooms": 117446,
      "Standard + 1 Family room": 117447,
    };

    const room_type_id = roomTypeMap[rooms] || 117445;

    const bookingPayload = {
      date_from: checkIn,
      date_to: checkOut,
      rooms: [
        {
          room_type_id: room_type_id,
          guests: guests,
        },
      ],
      customer: {
        first_name: firstName,
        last_name: lastName,
        phone: phone,
        email: email,
      },
      comment: `Xona: ${rooms} | Narx: ${price} EUR | Sayt: ${FRONTEND_URL}`,
    };

    const bnovoResponse = await bnovo.createBooking(bookingPayload);

    res.json({
      success: true,
      message: "Bron muvaffaqiyatli yuborildi",
      bnovoData: bnovoResponse,
    });
  } catch (error) {
    console.error("❌ Bnovo booking xatolik:", error.message);
    res.status(500).json({ error: "Bron qilishda server xatosi" });
  }
});

// Serverni ishga tushiramiz
app.listen(PORT, () => {
  console.log(`✅ Server ishlayapti: ${BASE_URL} (port: ${PORT})`);
});
