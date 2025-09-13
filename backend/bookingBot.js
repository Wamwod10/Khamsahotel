// backend/bookingBot.js

import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import fetch from "node-fetch";
import cors from "cors";

dotenv.config();

const app = express();
const PORT = process.env.BOOKING_BOT_PORT || 5005;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const MONGO_URI = process.env.MONGO_URI;

if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID || !MONGO_URI) {
  console.error("❌ .env faylida TELEGRAM yoki MONGO ma’lumotlari yo‘q!");
  process.exit(1);
}

app.use(cors());
app.use(express.json());

// Mongo ulanish
mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log("✅ MongoDB ulandi");
}).catch((err) => {
  console.error("❌ MongoDB ulanishda xatolik:", err);
});

// Mongo schema
const bookingSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  phone: String,
  email: String,
  checkIn: String,
  checkOutTime: String,
  rooms: String,
  duration: String,
  price: Number,
}, { timestamps: true });

const Booking = mongoose.model("Booking", bookingSchema);

// 1. Bookingni saqlash (MyBooking tugmasidan)
app.post("/api/bookings", async (req, res) => {
  try {
    const booking = new Booking(req.body);
    await booking.save();
    res.json({ success: true, message: "Booking saqlandi", booking });
  } catch (err) {
    console.error("❌ Booking saqlashda xatolik:", err);
    res.status(500).json({ success: false, error: "Saqlashda xatolik" });
  }
});

// 2. Success bo'lganda oxirgi bookingni yuborish
app.get("/api/notify-latest-booking", async (req, res) => {
  try {
    const latest = await Booking.findOne().sort({ createdAt: -1 });

    if (!latest) {
      return res.status(404).json({ success: false, error: "Booking topilmadi" });
    }

    const message = `
📩 Yangi Booking:
👤 ${latest.firstName} ${latest.lastName}
📧 ${latest.email}
📞 ${latest.phone}
🛏 ${latest.rooms}
📅 ${latest.checkIn}
🕑 ${latest.checkOutTime}
🕓 Duration: ${latest.duration}
💰 Price: ${latest.price} EUR
`;

    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
      }),
    });

    res.json({ success: true, message: "Telegramga yuborildi" });
  } catch (err) {
    console.error("❌ Telegramga yuborishda xatolik:", err);
    res.status(500).json({ success: false, error: "Yuborishda xatolik" });
  }
});

// Server
app.listen(PORT, () => {
  console.log(`🚀 Booking Bot server: http://localhost:${PORT}`);
});
