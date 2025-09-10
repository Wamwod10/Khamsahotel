import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import dotenv from "dotenv";
import nodemailer from "nodemailer";
import mongoose from "mongoose";
import TelegramBot from "node-telegram-bot-api";
import { getRooms, getRoomPrice, createBooking } from "./bnovo.js";

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
  MONGO_URL,
  TELEGRAM_BOT_TOKEN,
  TELEGRAM_CHAT_ID,
} = process.env;

// ✅ Muhim env tekshirish
[
  "OCTO_SHOP_ID",
  "OCTO_SECRET",
  "EMAIL_USER",
  "EMAIL_PASS",
  "MONGO_URL",
  "TELEGRAM_BOT_TOKEN",
  "TELEGRAM_CHAT_ID",
  "BNOVO_API_KEY",
].forEach((key) => {
  if (!process.env[key]) {
    console.error(`❌ ${key} .env faylida yo‘q!`);
    process.exit(1);
  }
});

// ✅ MongoDB ulanish
mongoose
  .connect(MONGO_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
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
  duration: String,
  guests: Number,
  createdAt: { type: Date, default: Date.now },
});

const Booking = mongoose.model("Booking", bookingSchema);

// ✅ Nodemailer sozlamalari
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS,
  },
});

// ✅ Email yuborish funksiyasi
async function sendEmail(to, subject, text) {
  try {
    if (!to || !subject || !text) return;
    const info = await transporter.sendMail({
      from: `"Khamsa Hotel" <${EMAIL_USER}>`,
      to,
      subject,
      text,
    });
    console.log("✅ Email yuborildi:", info.messageId);
  } catch (err) {
    console.error("❌ Email yuborishda xatolik:", err.message || err);
  }
}

// ✅ Telegram sozlamalari
const telegramBot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: false });

async function sendTelegramMessage(messageText) {
  if (!messageText) return;
  try {
    const result = await telegramBot.sendMessage(TELEGRAM_CHAT_ID, messageText, {
      parse_mode: "Markdown",
    });
    console.log("✅ Telegramga xabar yuborildi:", result.message_id);
  } catch (err) {
    console.error("❌ Telegram xatolik:", err.message || err);
  }
}

// ✅ Middleware
app.use(
  cors({
    origin: ["https://khamsahotel.uz", "https://www.khamsahotel.uz"],
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
  })
);
app.use(express.json());

/* ----------------- 🔹 Bnovo Endpointlari ----------------- */

// Xonalar ro‘yxatini olish
app.get("/get-rooms", async (req, res) => {
  try {
    const rooms = await getRooms();
    res.json(rooms);
  } catch (err) {
    console.error("❌ get-rooms xatolik:", err);
    res.status(500).json({ error: "Xonalarni olishda xatolik" });
  }
});

// Narx hisoblash
app.post("/calculate-price", async (req, res) => {
  try {
    const { roomId, checkIn, duration } = req.body;
    if (!roomId || !checkIn || !duration) {
      return res.status(400).json({ error: "Malumot to‘liq emas" });
    }
    const price = await getRoomPrice(roomId, checkIn, duration);
    res.json(price);
  } catch (err) {
    console.error("❌ calculate-price xatolik:", err);
    res.status(500).json({ error: "Narx hisoblashda xatolik" });
  }
});

// Bron qilish
app.post("/confirm-booking", async (req, res) => {
  try {
    const bookingData = req.body;
    const bookingResponse = await createBooking(bookingData);

    // MongoDB ga saqlash
    const newBooking = new Booking(bookingData);
    await newBooking.save();

    // Telegram xabari
    await sendTelegramMessage(`
*Yangi bron qabul qilindi!*

👤 ${bookingData.firstName} ${bookingData.lastName}
📞 ${bookingData.phone}
📧 ${bookingData.email}
🏨 Xona: ${bookingData.rooms}
📅 Check-in: ${bookingData.checkIn}
⏱ Davomiylik: ${bookingData.duration}
👥 Mehmonlar: ${bookingData.guests || 1}
💰 Narx: ${bookingData.price} EUR
    `);

    res.json({ success: true, booking: bookingResponse });
  } catch (err) {
    console.error("❌ confirm-booking xatolik:", err);
    res.status(500).json({ error: "Bron qilishda xatolik" });
  }
});

/* ----------------- 🔹 Octo To‘lov Endpointlari ----------------- */

// To‘lov yaratish
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
    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      console.error("❌ Octo noto‘g‘ri JSON javobi:", responseText);
      return res.status(500).json({ error: "Octo noto‘g‘ri javob qaytardi" });
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

// To‘lov muvaffaqiyatli endpointi
app.post("/success", async (req, res) => {
  try {
    const { total_sum, description, custom_data } = req.body || {};
    const email = custom_data?.email;

    if (email) {
      const amount = Math.round(total_sum / EUR_TO_UZS);
      await sendEmail(
        email,
        "To‘lov muvaffaqiyatli",
        "✅ Sizning to‘lovingiz amalga oshirildi."
      );
      await sendEmail(
        EMAIL_USER,
        "Yangi to‘lov - Khamsa Hotel",
        `Mijoz ${email} ${description} uchun ${amount} EUR to‘lov qildi.`
      );
    }

    const telegramMessage = `
*Yangi to‘lov muvaffaqiyatli!*

📧 Email: ${email || "-"}
💰 Miqdor: ${Math.round(total_sum / EUR_TO_UZS)} EUR
📄 Ta'rif: ${description || "-"}

⏰ Vaqt: ${new Date().toLocaleString()}
    `;

    await sendTelegramMessage(telegramMessage);

    res.json({
      status: "success",
      message: "Email va Telegram xabar yuborildi",
    });
  } catch (err) {
    console.error("❌ /success xatolik:", err);
    res.status(500).json({ error: "Email yoki Telegram yuborilmadi" });
  }
});

// To‘lov callback
app.post("/payment-callback", (req, res) => {
  console.log("🔁 Callback body:", req.body);
  res.json({ status: "callback received" });
});

// ✅ Serverni ishga tushirish
app.listen(PORT, () => {
  console.log(`✅ Server ishga tushdi: ${BASE_URL} (port: ${PORT})`);
});
