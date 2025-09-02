import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const OCTO_API_URL = "https://secure.octo.uz/prepare_payment";
const SHOP_ID = process.env.OCTO_SHOP_ID;
const SECRET_KEY = process.env.OCTO_SECRET;
const EUR_TO_UZS = 14000;

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

app.use(cors());
app.use(express.json());

/**
 * 1. To'lov yaratish endpoint
 */
app.post("/create-payment", async (req, res) => {
  try {
    const { amount, description = "Mehmonxona to'lovi" } = req.body;

    if (!amount || typeof amount !== "number") {
      return res.status(400).json({ error: "Noto'g'ri amount qiymati" });
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
      return_url: "https://khamsahotel.vercel.app/success", // O'zgartiring kerak bo'lsa
      notify_url: `http://localhost:${PORT}/payment-callback`, // Bizning callback endpoint
      language: "uz",
    };

    const response = await fetch(OCTO_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (data.error === 0 && data.data?.octo_pay_url) {
      return res.json({ paymentUrl: data.data.octo_pay_url, transactionId: body.shop_transaction_id });
    } else {
      return res.status(400).json({ error: data.errMessage || "Octo API xatosi" });
    }
  } catch (error) {
    console.error("❌ To‘lov yaratishda xato:", error.message);
    res.status(500).json({ error: error.message || "Server xatosi" });
  }
});

/**
 * 2. To'lov callback endpoint (notify_url)
 * Octo to'lov tizimi to'lov holatini shu yerga yuboradi
 */
app.post("/payment-callback", async (req, res) => {
  try {
    const paymentInfo = req.body;

    // Bu yerda paymentInfo ni tekshirishingiz mumkin (masalan, sign tekshirish)

    console.log("📩 To'lov callback:", paymentInfo);

    // Agar to'lov muvaffaqiyatli bo'lsa Telegramga xabar yuborish
    if (paymentInfo?.state === "COMPLETED") {
      // Telegramga yuborish
      const message = `
📥 Yangi to‘lov:

🆔 Tranzaksiya ID: ${paymentInfo.shop_transaction_id || "-"}
💰 Summa: ${(paymentInfo.total_sum / EUR_TO_UZS).toFixed(2)} EUR
🕒 Vaqt: ${paymentInfo.pay_date || new Date().toISOString()}
      `;

      const tgUrl = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;

      await fetch(tgUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: message,
          parse_mode: "HTML",
        }),
      });

      console.log("✅ Telegramga xabar yuborildi");
    }

    // Octo serveriga 200 status qaytarish shart
    res.json({ ok: true });
  } catch (error) {
    console.error("❌ Callback xatosi:", error.message);
    res.status(500).json({ error: error.message || "Callback server xatosi" });
  }
});

/**
 * 3. Server ishga tushirish
 */
app.listen(PORT, () => {
  console.log(`🚀 Server ${PORT} portda ishga tushdi`);
});
