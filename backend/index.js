import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import dotenv from "dotenv";
import nodemailer from "nodemailer";
import mongoose from "mongoose";
import TelegramBot from "node-telegram-bot-api";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5002;
const BASE_URL = process.env.BASE_URL || "https://khamsahotel.uz";
const EUR_TO_UZS = 14000;

// ✅ Env variables
const {
  OCTO_SHOP_ID,
  OCTO_SECRET,
  EMAIL_USER,
  EMAIL_PASS,
  MONGO_URL,
  TELEGRAM_BOT_TOKEN,
  TELEGRAM_CHAT_ID,
} = process.env;

// ✅ Check env variables
[
  "OCTO_SHOP_ID",
  "OCTO_SECRET",
  "EMAIL_USER",
  "EMAIL_PASS",
  "MONGO_URL",
  "TELEGRAM_BOT_TOKEN",
  "TELEGRAM_CHAT_ID",
].forEach((key) => {
  if (!process.env[key]) {
    console.error(`❌ ${key} .env faylida yo‘q!`);
    process.exit(1);
  }
});

// ✅ MongoDB connection
mongoose
  .connect(MONGO_URL)
  .then(() => console.log("✅ MongoDB ulandi"))
  .catch((err) => {
    console.error("❌ MongoDB ulanish xatosi:", err);
    process.exit(1);
  });

// ✅ Booking Schema
const bookingSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  email: String,
  phone: String,
  price: Number,
  rooms: String,
  checkIn: String,
  checkOut: String,
  createdAt: { type: Date, default: Date.now },
});

const Booking = mongoose.model("Booking", bookingSchema);

// ✅ Nodemailer
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS,
  },
});

async function sendEmail(to, subject, text) {
  if (!to || !subject || !text) return;
  try {
    const info = await transporter.sendMail({
      from: `"Khamsa Hotel" <${EMAIL_USER}>`,
      to,
      subject,
      text,
    });
    console.log("✅ Email yuborildi:", info.messageId);
    return info;
  } catch (err) {
    console.error("❌ Email yuborishda xatolik:", err);
  }
}

// ✅ Telegram Bot
const telegramBot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: false });

async function sendTelegramMessage(text) {
  if (!text) return;
  try {
    await telegramBot.sendMessage(TELEGRAM_CHAT_ID, text, { parse_mode: "Markdown" });
    console.log("✅ Telegramga xabar yuborildi");
  } catch (err) {
    console.error("❌ Telegramga xabar yuborishda xatolik:", err);
  }
}

// ✅ Middleware
app.use(cors({
  origin: [
    "https://khamsahotel.uz",
    "https://www.khamsahotel.uz",
  ],
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type"],
}));
app.use(express.json());

// ✅ Payment yaratish
app.post("/create-payment", async (req, res) => {
  try {
    const { amount, description = "Mehmonxona to'lovi", email } = req.body;

    if (!amount || typeof amount !== "number" || amount <= 0) {
      return res.status(400).json({ error: "Noto‘g‘ri amount qiymati" });
    }
    if (!email || typeof email !== "string") {
      return res.status(400).json({ error: "Email kiritilishi shart" });
    }

    const amountUZS = Math.round(amount * EUR_TO_UZS);
    const shop_transaction_id = Date.now().toString();

    const paymentData = {
      octo_shop_id: Number(OCTO_SHOP_ID),
      octo_secret: OCTO_SECRET,
      shop_transaction_id,
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
    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      console.error("❌ Octo noto‘g‘ri javob:", responseText);
      return res.status(500).json({ error: "Octo noto‘g‘ri javob" });
    }

    if (data.error === 0 && data.data?.octo_pay_url) {
      return res.json({ paymentUrl: data.data.octo_pay_url });
    } else {
      return res.status(400).json({ error: data.errMessage || "Octo xatosi" });
    }
  } catch (err) {
    console.error("❌ create-payment xatolik:", err);
    res.status(500).json({ error: "Server xatosi" });
  }
});

// ✅ Booking saqlash
app.post("/save-booking", async (req, res) => {
  try {
    const bookingData = req.body;
    const newBooking = new Booking(bookingData);
    await newBooking.save();
    console.log("✅ Booking saqlandi:", newBooking._id);

    const message = `
*Yangi buyurtma qabul qilindi!*

Ism: ${bookingData.firstName}
Familiya: ${bookingData.lastName}
Telefon: ${bookingData.phone}
Email: ${bookingData.email}
Narxi: ${bookingData.price} UZS
Xonalar: ${bookingData.rooms}
Check-in: ${bookingData.checkIn}
Check-out: ${bookingData.checkOut}
Booking ID: ${newBooking._id}
`;

    await sendTelegramMessage(message);
    res.json({ success: true, bookingId: newBooking._id });
  } catch (err) {
    console.error("❌ save-booking xatolik:", err);
    res.status(500).json({ success: false, error: "Xatolik yuz berdi" });
  }
});

// ✅ To‘lov muvaffaqiyatli bo‘lsa
app.post("/success", async (req, res) => {
  console.log("➡️ /success body:", req.body);
  try {
    const { total_sum, description, custom_data } = req.body || {};
    const email = custom_data?.email;

    if (email) {
      const amount = Math.round(total_sum / EUR_TO_UZS);

      await sendEmail(email, "To‘lov muvaffaqiyatli", "✅ Sizning to‘lovingiz amalga oshirildi.");
      await sendEmail(
        EMAIL_USER,
        "Yangi to‘lov - Khamsa Hotel",
        `Mijoz ${email} ${description} uchun ${amount} EUR to‘lov qildi.`
      );
    }

    res.json({ status: "success", message: "Email yuborildi" });
  } catch (err) {
    console.error("❌ /success xatolik:", err);
    res.status(500).json({ error: "Email yuborilmadi" });
  }
});

// ✅ Octo callback uchun fallback
app.post("/payment-callback", (req, res) => {
  console.log("🔁 Callback body:", req.body);
  res.json({ status: "callback received" });
});

// ✅ Serverni ishga tushurish
app.listen(PORT, () => {
  console.log(`✅ Server ishga tushdi: ${BASE_URL} (port: ${PORT})`);
});
