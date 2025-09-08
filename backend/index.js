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

// Muhim .env o‘zgaruvchilar
const {
  OCTO_SHOP_ID,
  OCTO_SECRET,
  EMAIL_USER,
  EMAIL_PASS,
  MONGO_URL,
  TELEGRAM_BOT_TOKEN,
  TELEGRAM_CHAT_ID,
  FRONTEND_URL,
} = process.env;

// ❗ Muhim o‘zgaruvchilarni tekshirish
[
  "OCTO_SHOP_ID",
  "OCTO_SECRET",
  "EMAIL_USER",
  "EMAIL_PASS",
  "MONGO_URL",
  "TELEGRAM_BOT_TOKEN",
  "TELEGRAM_CHAT_ID",
  "FRONTEND_URL",
].forEach((key) => {
  if (!process.env[key]) {
    console.error(`❌ ${key} .env faylida yo‘q!`);
    process.exit(1);
  }
});

// 🔹 MongoDB ulanish
mongoose
  .connect(MONGO_URL)
  .then(() => console.log("✅ MongoDB ulandi"))
  .catch((err) => {
    console.error("❌ MongoDB ulanish xatosi:", err);
    process.exit(1);
  });

// 🔹 Booking modeli
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

// 🔹 Nodemailer sozlamalari
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS,
  },
});

// Email yuborish
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
  } catch (error) {
    console.error("❌ Email yuborishda xatolik:", error.message || error);
  }
}

// 🔹 Telegram bot
const telegramBot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: false });

async function sendTelegramMessage(messageText) {
  if (!messageText) return;
  try {
    const result = await telegramBot.sendMessage(TELEGRAM_CHAT_ID, messageText, {
      parse_mode: "Markdown",
    });
    console.log("✅ Telegramga xabar yuborildi:", result.message_id);
  } catch (error) {
    console.error("❌ Telegram xatolik:", error.message || error);
  }
}

// 🔹 Middleware
app.use(
  cors({
    origin: [
      "https://khamsahotel.uz",
      "https://www.khamsahotel.uz",
      "http://localhost:3000",
      "http://localhost:5173", // Vite uchun
    ],
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
  })
);
app.options("*", cors()); // <<< OPTIONS uchun ruxsat
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 🔹 To'lov yaratish
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

// 🔹 Booking saqlash
app.post("/save-booking", async (req, res) => {
  try {
    const bookingData = req.body;

    if (
      !bookingData.firstName ||
      !bookingData.lastName ||
      !bookingData.email ||
      !bookingData.phone ||
      !bookingData.price ||
      !bookingData.rooms ||
      !bookingData.checkIn ||
      !bookingData.checkOut
    ) {
      return res
        .status(400)
        .json({ success: false, error: "Booking ma'lumotlari to'liq emas" });
    }

    const newBooking = new Booking(bookingData);
    await newBooking.save();

    // Telegram xabari
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
  } catch (error) {
    console.error("❌ save-booking xatolik:", error);
    res.status(500).json({ success: false, error: "Xatolik yuz berdi" });
  }
});

// 🔹 Octo notify_url
app.post("/success", async (req, res) => {
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

    const telegramMessage = `
*Yangi to‘lov muvaffaqiyatli!*

📧 Email: ${email || "-"}
💰 Miqdor: ${Math.round(total_sum / EUR_TO_UZS)} EUR
📄 Ta'rif: ${description || "-"}

⏰ Vaqt: ${new Date().toLocaleString()}
`;
    await sendTelegramMessage(telegramMessage);

    res.json({ status: "success", message: "Email va Telegram xabar yuborildi" });
  } catch (error) {
    console.error("❌ /success xatolik:", error);
    res.status(500).json({ error: "Email yoki Telegram yuborilmadi" });
  }
});

// 🔹 Foydalanuvchi qaytishi uchun
app.get("/success", (req, res) => {
  res.redirect(`${FRONTEND_URL}/success`);
});

// 🔹 Octo callback
app.post("/payment-callback", (req, res) => {
  console.log("🔁 Callback body:", req.body);
  res.json({ status: "callback received" });
});

// 🔹 Server
app.listen(PORT, () => {
  console.log(`✅ Server ishga tushdi: ${BASE_URL} (port: ${PORT})`);
});
