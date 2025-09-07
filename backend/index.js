import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import dotenv from "dotenv";
import nodemailer from "nodemailer";
import mongoose from "mongoose";
import TelegramBot from "node-telegram-bot-api";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5002;
const BASE_URL = process.env.BASE_URL || "https://khamsahotel.uz";
const EUR_TO_UZS = 14000;

// ✅ .env dagi muhim qiymatlar
const { 
  OCTO_SHOP_ID, 
  OCTO_SECRET, 
  EMAIL_USER, 
  EMAIL_PASS, 
  MONGO_URL,
  TELEGRAM_BOT_TOKEN,
  TELEGRAM_CHAT_ID
} = process.env;

if (!OCTO_SHOP_ID || !OCTO_SECRET || !EMAIL_USER || !EMAIL_PASS || !MONGO_URL || !TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
  console.error("❌ .env fayldagi muhim qiymatlar yo‘q!");
  process.exit(1);
}

// ✅ MongoDB ulanish
mongoose.connect(MONGO_URL)
  .then(() => console.log("✅ MongoDB ulandi"))
  .catch((err) => {
    console.error("❌ MongoDB ulanish xatosi:", err);
    process.exit(1);
  });


// ✅ Booking schema
const bookingSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  email: String,
  phone: String,
  price: Number,
  rooms: String,
  checkIn: String,
  checkOut: String,
  createdAt: { type: Date, default: Date.now }
});

const Booking = mongoose.model("Booking", bookingSchema);

// ✅ Nodemailer transporter
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS, // Gmail app password
  },
});

// ✅ Email yuborish
async function sendEmail(to, subject, text) {
  if (!to || !subject || !text) return;
  try {
    const mailOptions = {
      from: `"Khamsa Hotel" <${EMAIL_USER}>`,
      to,
      subject,
      text,
    };
    const info = await transporter.sendMail(mailOptions);
    console.log("✅ Email yuborildi:", info.messageId);
    return info;
  } catch (err) {
    console.error("❌ Email yuborishda xatolik:", err);
  }
}

// ✅ Telegram botini yaratamiz
const telegramBot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: false });

// ✅ Telegramga xabar yuborish funksiyasi
async function sendTelegramMessage(text) {
  try {
    await telegramBot.sendMessage(TELEGRAM_CHAT_ID, text, { parse_mode: "Markdown" });
    console.log("✅ Telegramga xabar yuborildi");
  } catch (err) {
    console.error("❌ Telegramga xabar yuborishda xatolik:", err);
  }
}

// ✅ Middleware
app.use(
  cors({
    origin: [
      "https://khamsahotel.uz",
      "https://www.khamsahotel.uz",
    ],
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
  })
);
app.use(express.json());

// ✅ To‘lov yaratish
app.post("/create-payment", async (req, res) => {
  try {
    const { amount, description = "Mehmonxona to'lovi", email } = req.body;

    if (!amount || typeof amount !== "number") {
      return res.status(400).json({ error: "Noto‘g‘ri amount qiymati" });
    }
    if (!email || typeof email !== "string") {
      return res.status(400).json({ error: "Email kiritilishi shart" });
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

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      console.error("❌ Octo noto‘g‘ri javob:", text);
      return res.status(500).json({ error: "Octo noto‘g‘ri javob" });
    }

    if (data.error === 0 && data.data?.octo_pay_url) {
      return res.json({ paymentUrl: data.data.octo_pay_url });
    } else {
      return res.status(400).json({ error: data.errMessage || "Octo xatosi" });
    }
  } catch (error) {
    console.error("❌ create-payment xato:", error);
    res.status(500).json({ error: "Server xatosi" });
  }
});

// ✅ Bookingni saqlash (faqat MongoDB)
app.post("/save-booking", async (req, res) => {
  try {
    const bookingData = req.body;
    const newBooking = new Booking(bookingData);
    await newBooking.save();
    console.log("✅ MongoDB ga saqlandi:", newBooking._id);

    // Telegramga xabar matni
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

    // Telegramga xabar yuborish
    await sendTelegramMessage(message);

    res.json({ success: true, bookingId: newBooking._id });
  } catch (err) {
    console.error("❌ save-booking xatolik:", err);
    res.status(500).json({ success: false, error: "Xatolik" });
  }
});

// ✅ Payment success (Email + MongoDB)
app.post("/success", async (req, res) => {
  console.log("➡️ /success ga kelgan body:", req.body);
  try {
    const { total_sum, description, custom_data } = req.body || {};
    if (custom_data?.email) {
      const amount = Math.round(total_sum / EUR_TO_UZS);

      // mijozga email
      await sendEmail(
        custom_data.email,
        "Information For Invoice",
        "✅ Sizning to‘lovingiz muvaffaqiyatli amalga oshirildi."
      );

      // admin ga email
      await sendEmail(
        EMAIL_USER,
        "Yangi to‘lov - Khamsa Hotel",
        `Mijoz ${custom_data.email} ${description} uchun ${amount} EUR to‘lov qildi.`
      );
    }
    res.json({ status: "success", message: "Email yuborildi" });
  } catch (error) {
    console.error("❌ /success xatolik:", error);
    res.status(500).json({ error: "Email yuborilmadi" });
  }
});

// ✅ Callback fallback
app.post("/payment-callback", async (req, res) => {
  console.log("🔁 Callback body:", req.body);
  res.json({ status: "callback received" });
});

// ✅ Server ishga tushdi
app.listen(PORT, () => {
  console.log(`✅ Backend ishga tushdi: ${BASE_URL} (port ${PORT})`);
});
