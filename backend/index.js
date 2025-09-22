import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import dotenv from "dotenv";
import nodemailer from "nodemailer";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5002;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;
const FRONTEND_URL = (process.env.FRONTEND_URL || "https://khamsahotel.uz").replace(/\/+$/, "");
const EUR_TO_UZS = Number(process.env.EUR_TO_UZS || 14000);

const {
  OCTO_SHOP_ID,
  OCTO_SECRET,
  EMAIL_USER,
  EMAIL_PASS,
  TELEGRAM_BOT_TOKEN,
  TELEGRAM_CHAT_ID,
} = process.env;

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "shamshodochilov160@gmail.com";

if (!OCTO_SHOP_ID || !OCTO_SECRET || !EMAIL_USER || !EMAIL_PASS) {
  console.error("❌ .env da kerakli maydonlar yo‘q (OCTO_SHOP_ID/OCTO_SECRET/EMAIL_USER/EMAIL_PASS)");
  process.exit(1);
}

app.set("trust proxy", 1);
app.use(
  cors({
    origin: [FRONTEND_URL, `${FRONTEND_URL}/`],
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
    credentials: false,
  })
);
app.use(express.json({ limit: "1mb" }));

// --- Healthcheck
app.get("/healthz", (_req, res) => res.json({ ok: true }));

// --- Mail transporter
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: { user: EMAIL_USER, pass: EMAIL_PASS },
});

async function sendEmail(to, subject, text) {
  if (!to || !subject || !text) throw new Error("email: invalid payload");
  const info = await transporter.sendMail({
    from: `"Khamsa Hotel" <${EMAIL_USER}>`,
    to,
    subject,
    text,
  });
  return info;
}

// --- Payment: Octo
app.post("/create-payment", async (req, res) => {
  try {
    const { amount, description = "Mehmonxona to'lovi", email } = req.body || {};
    if (!amount || !email) return res.status(400).json({ error: "Ma'lumot yetarli emas" });

    const amountUZS = Math.max(1000, Math.round(Number(amount) * EUR_TO_UZS));

    const payload = {
      octo_shop_id: Number(OCTO_SHOP_ID),
      octo_secret: OCTO_SECRET,
      shop_transaction_id: Date.now().toString(),
      auto_capture: true,
      test: false,
      init_time: new Date().toISOString().replace("T", " ").substring(0, 19),
      total_sum: amountUZS,
      currency: "UZS",
      description: `${description} (${amount} EUR)`,
      return_url: `${FRONTEND_URL}/success`,
      notify_url: `${BASE_URL}/payment-callback`,
      language: "uz",
      custom_data: { email },
    };

    const octoRes = await fetch("https://secure.octo.uz/prepare_payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const ctype = octoRes.headers.get("content-type") || "";
    const raw = ctype.includes("application/json") ? await octoRes.json() : JSON.parse(await octoRes.text().catch(() => "{}"));

    if (raw?.error === 0 && raw?.data?.octo_pay_url) {
      return res.json({ paymentUrl: raw.data.octo_pay_url });
    }
    return res.status(400).json({ error: raw?.errMessage || "Octo xatosi" });
  } catch (err) {
    console.error("❌ create-payment:", err);
    res.status(500).json({ error: "Server xatosi" });
  }
});

// --- send email to customer/admin
app.post("/send-email", async (req, res) => {
  try {
    const { to, subject, text } = req.body || {};
    if (!to || !subject || !text) return res.status(400).json({ success: false, error: "To‘liq ma’lumot yuborilmadi" });
    await sendEmail(to, subject, text);
    res.json({ success: true });
  } catch (err) {
    console.error("❌ /send-email:", err);
    res.status(500).json({ success: false, error: "Email yuborilmadi" });
  }
});

// --- telegram notify (backend orqali, token .env da)
app.post("/notify-telegram", async (req, res) => {
  try {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
      return res.status(500).json({ ok: false, error: "Telegram sozlanmagan" });
    }
    const { text } = req.body || {};
    if (!text) return res.status(400).json({ ok: false, error: "Matn yo‘q" });

    const tgRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text }),
    });
    const data = await tgRes.json();
    if (!data.ok) return res.status(400).json({ ok: false, error: data });
    res.json({ ok: true });
  } catch (err) {
    console.error("❌ notify-telegram:", err);
    res.status(500).json({ ok: false, error: "Telegram xatosi" });
  }
});

// --- Octo callback (debug)
app.post("/payment-callback", (req, res) => {
  console.log("🔁 Callback body:", req.body);
  res.json({ status: "callback received" });
});

// --- Booking (Bnovo integratsiyasiz)
app.post("/api/bookings", async (req, res) => {
  try {
    const {
      checkIn,
      checkOutTime,
      duration,
      rooms,
      guests,
      firstName,
      lastName,
      phone,
      email,
      price,
    } = req.body || {};

    if (!checkIn || !checkOutTime || !rooms || !firstName || !email) {
      return res.status(400).json({ error: "Kerakli ma'lumotlar yetarli emas" });
    }

    const getCheckoutDate = (checkInStr, durationStr) => {
      const d = new Date(checkInStr);
      if (durationStr?.includes("3")) d.setHours(d.getHours() + 3);
      else if (durationStr?.includes("10")) d.setHours(d.getHours() + 10);
      else d.setDate(d.getDate() + 1);
      return d.toISOString().split("T")[0];
    };

    const checkOut = getCheckoutDate(checkIn, duration);
    const createdAt = new Date().toISOString();

    const emailSubject = "Yangi bron qilish haqida xabar";
    const emailText = `
Yangi bron qabul qilindi:

👤 Ism: ${firstName} ${lastName || ""}
📞 Telefon: ${phone || "Noma'lum"}
📧 Email: ${email}

📅 Kirish sana: ${checkIn}
📆 Chiqish sana: ${checkOut}
🛏️ Xona turi: ${rooms}
👥 Mehmonlar soni: ${guests || "Noma'lum"}
💶 Narx: ${price} EUR
🕓 Bron vaqti: ${createdAt}

🌐 Sayt: ${FRONTEND_URL}
`.trim();

    try {
      await sendEmail(ADMIN_EMAIL, emailSubject, emailText);
      console.log("✅ Admin email yuborildi:", ADMIN_EMAIL);
    } catch (e) {
      console.error("❌ Admin email:", e?.message || e);
    }

    res.json({ success: true, message: "Bron muvaffaqiyatli yuborildi", createdAt });
  } catch (error) {
    console.error("❌ /api/bookings:", error);
    res.status(500).json({ error: "Bron qilishda server xatosi" });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server ishlayapti: ${BASE_URL} (port: ${PORT})`);
});
