// index.js (fixed)
import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import dotenv from "dotenv";
import nodemailer from "nodemailer";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5002;
const BASE_URL = (process.env.BASE_URL || `http://localhost:${PORT}`).replace(/\/+$/, "");
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

// --- Early env validation (log-only, serverni to'xtatmaymiz)
const missing = [];
if (!OCTO_SHOP_ID) missing.push("OCTO_SHOP_ID");
if (!OCTO_SECRET) missing.push("OCTO_SECRET");
if (!EMAIL_USER)  missing.push("EMAIL_USER");
if (!EMAIL_PASS)  missing.push("EMAIL_PASS");
if (missing.length) {
  console.warn("⚠️ .env dagi quyidagi maydonlar yo'q:", missing.join(", "));
  // payment yoki email endpointlarida baribir 500 qaytamiz — lekin server ishlayveradi
}

app.set("trust proxy", 1);

// --- CORS (www subdomain + dev originlar + OPTIONS ni allow qilish)
const ALLOWED_ORIGINS = [
  FRONTEND_URL,
  "https://www.khamsahotel.uz",
  "http://localhost:5173",
  "http://localhost:3000",
].filter(Boolean);

app.use(
  cors({
    origin(origin, cb) {
      // curl/postman yoki server-side requestlar uchun origin undefined bo'lishi mumkin
      if (!origin) return cb(null, true);
      if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
      console.warn("CORS block:", origin);
      return cb(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Accept"],
    credentials: false,
  })
);
// Preflight so'rovlarini ruxsat berish
app.options("*", cors());

// --- Body parsers (JSON, urlencoded, text)
// Octo callback va ba'zi proksi/vps-lar application/x-www-form-urlencoded yuborishi mumkin
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));
app.use(express.text({ type: ["text/*"], limit: "512kb" }));

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
  if (!EMAIL_USER || !EMAIL_PASS) throw new Error("email transport is not configured");
  if (!to || !subject || !text) throw new Error("email: invalid payload");
  const info = await transporter.sendMail({
    from: `"Khamsa Hotel" <${EMAIL_USER}>`,
    to,
    subject,
    text,
  });
  return info;
}

// --- Helper: xavfsiz JSON parse (agar HTML/text kelsa ham yiqilmaslik)
async function safeParseResponse(res) {
  const ct = (res.headers.get("content-type") || "").toLowerCase();
  if (ct.includes("application/json")) return res.json();
  const txt = await res.text();
  try {
    return JSON.parse(txt);
  } catch {
    return { _raw: txt };
  }
}

// --- Payment: Octo
app.post("/create-payment", async (req, res) => {
  try {
    if (!OCTO_SHOP_ID || !OCTO_SECRET) {
      return res.status(500).json({ error: "Payment sozlanmagan (env yo'q)" });
    }

    const { amount, description = "Mehmonxona to'lovi", email } = req.body || {};
    const amt = Number(amount);

    if (!Number.isFinite(amt) || amt <= 0 || !email) {
      return res.status(400).json({ error: "Ma'lumot yetarli emas yoki amount noto‘g‘ri" });
    }

    const amountUZS = Math.max(1000, Math.round(amt * EUR_TO_UZS));

    const payload = {
      octo_shop_id: Number(OCTO_SHOP_ID),
      octo_secret: OCTO_SECRET,
      shop_transaction_id: Date.now().toString(),
      auto_capture: true,
      test: false,
      init_time: new Date().toISOString().replace("T", " ").substring(0, 19),
      total_sum: amountUZS,
      currency: "UZS",
      description: `${description} (${amt} EUR)`,
      return_url: `${FRONTEND_URL}/success`,
      notify_url: `${BASE_URL}/payment-callback`,
      language: "uz",
      custom_data: { email },
    };

    // 20s timeout bilan yuboramiz
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 20000);

    const octoRes = await fetch("https://secure.octo.uz/prepare_payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    }).catch((e) => {
      throw new Error(`Octo fetch failed: ${e?.message || e}`);
    });
    clearTimeout(t);

    const data = await safeParseResponse(octoRes);

    if (octoRes.ok && data?.error === 0 && data?.data?.octo_pay_url) {
      return res.json({ paymentUrl: data.data.octo_pay_url });
    }

    // Octo ba'zan 200 qaytarmasligi yoki boshqa format yuborishi mumkin
    console.error("Octo error:", {
      status: octoRes.status,
      data: typeof data === "object" ? data : String(data),
    });
    const msg =
      (data && (data.errMessage || data.message)) ||
      `Octo error (status ${octoRes.status})`;
    return res.status(400).json({ error: msg });
  } catch (err) {
    console.error("❌ create-payment:", err);
    res.status(500).json({ error: "Server xatosi" });
  }
});

// --- send email to customer/admin
app.post("/send-email", async (req, res) => {
  try {
    const { to, subject, text } = req.body || {};
    if (!to || !subject || !text) {
      return res.status(400).json({ success: false, error: "To‘liq ma’lumot yuborilmadi" });
    }
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

// --- Octo callback (Octo turli Content-Type yuborishi mumkin)
app.post("/payment-callback", (req, res) => {
  try {
    console.log("🔁 payment-callback headers:", req.headers);
    console.log("🔁 payment-callback body:", req.body);
  } catch (e) {
    console.error("callback log error:", e);
  }
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
      if (EMAIL_USER && EMAIL_PASS) {
        await sendEmail(ADMIN_EMAIL, emailSubject, emailText);
        console.log("✅ Admin email yuborildi:", ADMIN_EMAIL);
      } else {
        console.warn("⚠️ Email yuborilmedi (EMAIL_USER/PASS yo'q)");
      }
    } catch (e) {
      console.error("❌ Admin email:", e?.message || e);
    }

    res.json({ success: true, message: "Bron muvaffaqiyatli tarzda yuborildi", createdAt });
  } catch (error) {
    console.error("❌ /api/bookings:", error);
    res.status(500).json({ error: "Bron qilishda server xatosi" });
  }
});

// --- 404 va error handlerlar (diagnostika uchun foydali)
app.use((req, res) => {
  res.status(404).json({ error: "Not Found", path: req.path });
});

app.use((err, req, res, _next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal Server Error" });
});

app.listen(PORT, () => {
  console.log(`✅ Server ishlayapti: ${BASE_URL} (port: ${PORT})`);
});
