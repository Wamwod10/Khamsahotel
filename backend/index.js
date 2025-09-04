import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import dotenv from "dotenv";
import nodemailer from "nodemailer";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const OCTO_API_URL = "https://secure.octo.uz/prepare_payment";
const SHOP_ID = process.env.OCTO_SHOP_ID;
const SECRET_KEY = process.env.OCTO_SECRET;
const EUR_TO_UZS = 14000;

app.use(cors());
app.use(express.json());

// Nodemailer transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Email yuborish funksiyasi
async function sendPaymentEmail(toEmail, amount, description) {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: toEmail,
    subject: "To'lov tasdiqlandi - Khamsa Hotel",
    text: `Hurmatli mijoz, siz Khamsa ${description} uchun ${amount} EUR miqdorida to'lov amalga oshirdingiz. Rahmat!`,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("✅ Email yuborildi:", toEmail);
  } catch (error) {
    console.error("❌ Email yuborishda xatolik:", error);
  }
}

// To‘lov yaratish
app.post("/create-payment", async (req, res) => {
  try {
    const { amount, description = "Mehmonxona to'lovi", email } = req.body;

    if (!amount || typeof amount !== "number") {
      return res.status(400).json({ error: "Noto‘g‘ri amount qiymati" });
    }
    if (!email) {
      return res.status(400).json({ error: "Email kiritilishi shart" });
    }

    const amountUZS = Math.round(amount * EUR_TO_UZS);

    const body = {
      octo_shop_id: Number(SHOP_ID),
      octo_secret: SECRET_KEY,
      shop_transaction_id: Date.now().toString(),
      auto_capture: true,
      test: false,
      init_time: new Date().toISOString().replace("T", " ").substring(0, 19),
      total_sum: amountUZS,
      currency: "UZS",
      description: `${description} (${amount} EUR)`,
      return_url: "https://khamsahotel.uz/success", // foydalanuvchini qaytarish sahifasi
      notify_url: `${process.env.BASE_URL}/payment-callback`, // BACKEND URL bo‘lishi kerak!
      language: "uz",
      custom_data: { email }, // emailni callback orqali olish uchun
    };

    const response = await fetch(OCTO_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (data.error === 0 && data.data?.octo_pay_url) {
      return res.json({ paymentUrl: data.data.octo_pay_url });
    } else {
      return res.status(400).json({ error: data.errMessage || "Octo xatosi" });
    }
  } catch (error) {
    console.error("❌ To'lov yaratishda xatolik:", error);
    res.status(500).json({ error: error.message || "Server xatosi" });
  }
});

// OctoBank callback (to‘lov muvaffaqiyatli bo‘lganda chaqiriladi)
app.post("/payment-callback", async (req, res) => {
  try {
    const { total_sum, description, custom_data } = req.body;

    if (custom_data?.email) {
      const amount = Math.round(total_sum / EUR_TO_UZS);
      await sendPaymentEmail(custom_data.email, amount, description);
    }

    res.json({ status: "ok" });
  } catch (error) {
    console.error("Callback xatosi:", error);
    res.status(500).json({ error: "Callback ishlamadi" });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Backend ${PORT}-portda ishlayapti`);
});
