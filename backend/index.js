// index.js
import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import dotenv from "dotenv";
import nodemailer from "nodemailer";
import crypto from "crypto";
import { checkAvailability, createBookingInBnovo } from "./bnovo.js";

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

// --- Early env validation (log-only)
const missing = [];
if (!OCTO_SHOP_ID) missing.push("OCTO_SHOP_ID");
if (!OCTO_SECRET) missing.push("OCTO_SECRET");
if (!EMAIL_USER)  missing.push("EMAIL_USER");
if (!EMAIL_PASS)  missing.push("EMAIL_PASS");
if (missing.length) {
  console.warn("⚠️ .env dagi quyidagi maydonlar yo'q:", missing.join(", "));
}

app.set("trust proxy", 1);

// --- CORS
const ALLOWED_ORIGINS = [
  FRONTEND_URL,
  "https://www.khamsahotel.uz",
  "http://localhost:5173",
  "http://localhost:3000",
].filter(Boolean);

app.use(
  cors({
    origin(origin, cb) {
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
app.options("*", cors());

// --- Body parsers
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));
app.use(express.text({ type: ["text/*"], limit: "512kb" }));

// --- Health
app.get("/healthz", (_req, res) => res.json({ ok: true }));

// --- Mail
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

// --- Telegram
async function notifyTelegram(text) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text }),
    });
  } catch (e) {
    console.error("Telegram error:", e);
  }
}

// --- Helper: xavfsiz JSON parse
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

// --- SIGN helper (Octo custom_data integrity)
const SIGN_SECRET = crypto.createHash("sha256").update(String(process.env.OCTO_SECRET || "octo")).digest();

function signData(obj) {
  const json = JSON.stringify(obj);
  const h = crypto.createHmac("sha256", SIGN_SECRET).update(json).digest("hex");
  return { json, sig: h };
}
function verifyData(json, sig) {
  const h = crypto.createHmac("sha256", SIGN_SECRET).update(json).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(h), Buffer.from(sig || ""));
  } catch {
    return false;
  }
}

/* =======================
 *  BNOVO ROUTES
 * ======================= */

/** Availability (frontend Header/Room oqimi)
 *  GET /api/bnovo/availability?checkIn=YYYY-MM-DD&nights=1&roomType=STANDARD|FAMILY
 */
app.get("/api/bnovo/availability", async (req, res) => {
  try {
    const { checkIn, nights = 1, roomType = "STANDARD" } = req.query || {};
    if (!checkIn) return res.status(400).json({ error: "checkIn required" });

    const checkInDate = new Date(checkIn);
    const checkOut = new Date(checkInDate.getTime() + Number(nights) * 86400000)
      .toISOString().slice(0,10);

    const avail = await checkAvailability({
      checkIn: String(checkIn).slice(0,10),
      checkOut,
      roomType: String(roomType).toUpperCase(),
    });

    // ✅ muhim: avval avail ni qo'yamiz, keyin ok:true bilan ustidan yozamiz
    return res.json({
      ...avail,
      ok: true,                     // doim true: warning bo'lsa ham API ishlayapti
      checkIn: String(checkIn).slice(0,10),
      checkOut
    });
  } catch (e) {
    console.error("/api/bnovo/availability error:", e);
    res.status(500).json({ ok: false, error: "availability failed" });
  }
});


/* =======================
 *  PAYMENTS
 * ======================= */

// Create payment
app.post("/create-payment", async (req, res) => {
  try {
    if (!OCTO_SHOP_ID || !OCTO_SECRET) {
      return res.status(500).json({ error: "Payment sozlanmagan (env yo'q)" });
    }

    const {
      amount,                       // EUR
      description = "Mehmonxona to'lovi",
      email,
      // 🔽 BU YERDA bron uchun barcha ma’lumotlar keladi (frontenddan yuborasiz)
      booking = {}                  // {checkIn, duration, rooms (STANDARD|FAMILY), guests, firstName, lastName, phone, email, price}
    } = req.body || {};

    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0 || !email) {
      return res.status(400).json({ error: "Ma'lumot yetarli emas yoki amount noto‘g‘ri" });
    }

    // checkout sanasi
    const computeCheckOut = (checkInStr, durationStr) => {
      const d = new Date(checkInStr);
      if (durationStr?.includes("3")) d.setHours(d.getHours() + 3);
      else if (durationStr?.includes("10")) d.setHours(d.getHours() + 10);
      else d.setDate(d.getDate() + 1);
      return d.toISOString().split("T")[0];
    };

    const checkOut = computeCheckOut(booking.checkIn, booking.duration);

    // Octo'ga UZS jo'natamiz
    const amountUZS = Math.max(1000, Math.round(amt * EUR_TO_UZS));

    // custom_data'ni imzolab yuboramiz – callbackda tekshiramiz
    const bookingPayload = {
      checkIn: booking.checkIn,
      checkOut,
      duration: booking.duration,
      roomType: booking.rooms, // "STANDARD" | "FAMILY"
      guests: booking.guests,
      firstName: booking.firstName,
      lastName: booking.lastName,
      phone: booking.phone,
      email: booking.email,
      priceEur: amt,
      note: "Khamsa website payment success → push to Bnovo"
    };
    const signed = signData(bookingPayload); // {json, sig}

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
      custom_data: {
        // mijoz emaili + imzolangan booking ma’lumotlari
        email,
        booking_json: signed.json,
        booking_sig: signed.sig
      },
    };

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

    console.error("Octo error:", { status: octoRes.status, data });
    const msg = (data && (data.errMessage || data.message)) || `Octo error (status ${octoRes.status})`;
    return res.status(400).json({ error: msg });
  } catch (err) {
    console.error("❌ create-payment:", err);
    res.status(500).json({ error: "Server xatosi" });
  }
});

// Octo notify (SUCCESS → Bnovo)
app.post("/payment-callback", async (req, res) => {
  try {
    // Octo bu yerga turli Content-Type yuborishi mumkin (json/urlencoded) — biz parserlarni yoqqanmiz.
    const body =
      typeof req.body === "string"
        ? (() => { try { return JSON.parse(req.body); } catch { return {}; } })()
        : (req.body || {});
    console.log("🔁 payment-callback body:", body);

    // Octo custom_data
    const custom = body?.custom_data || {};
    const json = custom?.booking_json;
    const sig  = custom?.booking_sig;

    let verifiedPayload = null;
    if (json && sig && verifyData(json, sig)) {
      try { verifiedPayload = JSON.parse(json); } catch {}
    } else {
      console.warn("⚠️ custom_data signature verify failed, fallback to empty payload");
    }

    // Octo success holatini aniqlash
    const statusFields = [
      body?.status, body?.payment_status, body?.transaction_status, body?.result
    ].map((s) => String(s || "").toLowerCase());
    const isSuccess =
      statusFields.some((s) =>
        ["success", "succeeded", "paid", "captured", "approved"].includes(s)
      ) || body?.paid === true || body?.error === 0;

    if (isSuccess && verifiedPayload) {
      // 1) Bnovo'ga push
      const pushRes = await createBookingInBnovo(verifiedPayload);

      // 2) Adminga xabar (email + telegram)
      const human = `
To'lov muvaffaqiyatli.

Bron:
- Ism: ${verifiedPayload.firstName} ${verifiedPayload.lastName || ""}
- Tel: ${verifiedPayload.phone || "-"}
- Email: ${verifiedPayload.email}
- Xona: ${verifiedPayload.roomType}
- Check-in: ${verifiedPayload.checkIn}
- Check-out: ${verifiedPayload.checkOut}
- Mehmonlar: ${verifiedPayload.guests || 1}
- Narx (EUR): ${verifiedPayload.priceEur}

Bnovo push: ${pushRes.ok ? "✅ OK" : "❌ FAIL"}
${pushRes.ok ? "" : `Reason: ${JSON.stringify(pushRes.error || pushRes.status || pushRes.data || {}, null, 2)}`}
      `.trim();

      try { await sendEmail(ADMIN_EMAIL, "Khamsa: Payment Success", human); } catch {}
      try { await notifyTelegram(human); } catch {}

      // 3) Javob qaytaramiz
      return res.json({ ok: true });
    }

    console.warn("⚠️ Payment not success or no verified payload:", { statusFields, paid: body?.paid });
    return res.json({ ok: true });
  } catch (e) {
    console.error("❌ /payment-callback:", e);
    res.status(200).json({ ok: true }); // Octo qayta urmasin deb 200 qaytaramiz
  }
});

/* =======================
 *  MISC (sendagi endpointlar)
 * ======================= */

// Email endpoint (manual)
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

// Legacy booking (agar frontend eski oqimni ham yuborsa)
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

    try { await sendEmail(ADMIN_EMAIL, emailSubject, emailText); } catch {}

    res.json({ success: true, message: "Bron muvaffaqiyatli tarzda yuborildi", createdAt });
  } catch (error) {
    console.error("❌ /api/bookings:", error);
    res.status(500).json({ error: "Bron qilishda server xatosi" });
  }
});

// 404 & error
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
