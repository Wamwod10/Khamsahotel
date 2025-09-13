import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import dotenv from "dotenv";
import nodemailer from "nodemailer";

// 🔧 ENV o‘qish
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

// 🔐 Muhim env kalitlar mavjudligini tekshirish
["OCTO_SHOP_ID", "OCTO_SECRET", "EMAIL_USER", "EMAIL_PASS"].forEach((key) => {
  if (!process.env[key]) {
    console.error(`❌ .env faylida ${key} yo‘q!`);
    process.exit(1);
  }
});

// 📧 Nodemailer sozlamalari
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS,
  },
});

// 📬 Email yuboruvchi funksiya
async function sendEmail(to, subject, text) {
  try {
    if (!to || !subject || !text) {
      console.warn("⚠️ sendEmail: parametrlar to‘liq emas");
      return;
    }

    console.log(`📤 Email yuborilmoqda: ${to} | ${subject}`);
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

// 🔧 Middleware
app.use(cors({
  origin: ["https://khamsahotel.uz", "https://www.khamsahotel.uz"],
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type"],
}));
app.use(express.json());

/* ----------------------------- 💳 OCTO TO‘LOV ----------------------------- */

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
      console.error("❌ Octo noto‘g‘ri JSON:", responseText);
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

/* ------------------------- 📧 Email yuborish (mijoz + admin) ------------------------- */

app.post("/send-email", async (req, res) => {
  try {
    const { to, subject, text, adminInfo } = req.body;

    // 1️⃣ Mijozga email yuborish
    if (to && subject && text) {
      await sendEmail(to, subject, text);
    }

    // 2️⃣ Admin uchun email yuborish
    if (adminInfo) {
      const {
        checkIn,
        checkInTime,
        roomType,
        duration,
        price,
        firstName,
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

To‘lov sayt orqali amalga oshirildi.
`.trim();

      await sendEmail("shamshodochilov160@gmail.com", "🆕 Yangi buyurtma - Khamsa Hotel", adminText);
    }

    res.json({ success: true });
  } catch (err) {
    console.error("❌ /send-email xatolik:", err.message || err);
    res.status(500).json({ success: false, error: "Email yuborilmadi" });
  }
});

/* ------------------------- 🔁 Octo Callback (ixtiyoriy) ------------------------- */

app.post("/payment-callback", (req, res) => {
  console.log("🔁 Callback body:", req.body);
  res.json({ status: "callback received" });
});

/* ------------------------- 🚀 Serverni ishga tushirish ------------------------- */

app.listen(PORT, () => {
  console.log(`✅ Server ishga tushdi: ${BASE_URL} (port: ${PORT})`);
});
