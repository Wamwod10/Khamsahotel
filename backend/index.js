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

// ✅ Muhim env tekshirish
[
  "OCTO_SHOP_ID",
  "OCTO_SECRET",
  "EMAIL_USER",
  "EMAIL_PASS",
].forEach((key) => {
  if (!process.env[key]) {
    console.error(`❌ ${key} .env faylida yo‘q!`);
    process.exit(1);
  }
});

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

// ✅ Middleware
app.use(
  cors({
    origin: ["https://khamsahotel.uz", "https://www.khamsahotel.uz"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type"],
  })
);
app.use(express.json());

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

    res.json({
      status: "success",
      message: "Email yuborildi",
    });
  } catch (err) {
    console.error("❌ /success xatolik:", err);
    res.status(500).json({ error: "Email yuborilmadi" });
  }
});

// To‘lov callback
app.post("/payment-callback", (req, res) => {
  console.log("🔁 Callback body:", req.body);
  res.json({ status: "callback received" });
});

/* ----------------- 🔹 Admin Email Endpoint qo‘shildi ----------------- */

// ✅ Email yuborish (mijoz va admin uchun) - frontenddan keladi
app.post("/send-email", async (req, res) => {
  try {
    const {
      to,
      subject,
      text,
      subjectru,
      textru,
      adminInfo
    } = req.body;

    // 1️⃣ Mijozga email yuborish
    if (to && subject && text) {
      await sendEmail(to, subject, text);
    }

    // 2️⃣ Admin email
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
        email
      } = adminInfo;

      const adminText = `
Yangi to‘lov haqida ma'lumot:

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
    console.error("❌ /send-email xatolik:", err.message || err);
    res.status(500).json({ success: false, error: "Email yuborishda xatolik" });
  }
});

/* ----------------- 🔹 Server ishga tushishi ----------------- */

app.listen(PORT, () => {
  console.log(`✅ Server ishga tushdi: ${BASE_URL} (port: ${PORT})`);
});
