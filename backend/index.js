import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import dotenv from "dotenv";
import nodemailer from "nodemailer";
import BnovoAPI from "./bnovo.js";

dotenv.config();

const app = express();
const HOST = "0.0.0.0";

/* ========= ENV ========= */
const PORT = process.env.PORT || 5002;
const BASE_URL =
  process.env.BASE_URL || "https://hotel-backend-bmlk.onrender.com";
const FRONTEND_URL = process.env.FRONTEND_URL || "https://khamsahotel.uz";
const EUR_TO_UZS = Number(process.env.EUR_TO_UZS || 14000);

const {
  OCTO_SHOP_ID,
  OCTO_SECRET,
  EMAIL_USER,
  EMAIL_PASS,

  // Bnovo
  BNOVO_API_KEY,
  BNOVO_API_BASE,
  BNOVO_CREATE_PATH,
  BNOVO_READ_PATH,

  // Stocks
  HOTEL_STANDARD_STOCK = 23,
  HOTEL_FAMILY_STOCK = 1,

  // Telegram (optional)
  TELEGRAM_BOT_TOKEN,
  TELEGRAM_CHAT_ID,
} = process.env;

const ADMIN_EMAIL = "shamshodochilov160@gmail.com";

// majburiy env tekshiruvi
if (
  !OCTO_SHOP_ID ||
  !OCTO_SECRET ||
  !EMAIL_USER ||
  !EMAIL_PASS ||
  !BNOVO_API_KEY ||
  !BNOVO_API_BASE
) {
  console.error("❌ .env yetarli emas (OCTO_*, EMAIL_*, BNOVO_* shart).");
  process.exit(1);
}

/* ========= EMAIL ========= */
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: { user: EMAIL_USER, pass: EMAIL_PASS },
});
async function sendEmail(to, subject, text) {
  if (!to || !subject || !text) return;
  await transporter.sendMail({
    from: `"Khamsa Hotel" <${EMAIL_USER}>`,
    to,
    subject,
    text,
  });
}

/* ========= TELEGRAM (optional) ========= */
async function sendTelegram(text) {
  try {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;
    await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text }),
      }
    );
  } catch {}
}

/* ========= BNOVO ========= */
const bnovo = new BnovoAPI({
  apiKey: BNOVO_API_KEY,
  baseUrl: BNOVO_API_BASE,
  createPath: BNOVO_CREATE_PATH || "/api/v1/bookings",
  readPath: BNOVO_READ_PATH || "/api/v1/bookings",
});

/* ========= MIDDLEWARES ========= */
const ALLOWED_ORIGINS = [
  FRONTEND_URL,
  `${FRONTEND_URL}/`,
  "https://your-frontend.onrender.com", 
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
].filter(Boolean);

app.use(
  cors({
    origin(origin, cb) {
      if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
      return cb(new Error("Not allowed by CORS: " + origin));
    },
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
  })
);
app.use((req, res, next) => {
  const o = req.headers.origin;
  if (o && ALLOWED_ORIGINS.includes(o))
    res.setHeader("Access-Control-Allow-Origin", o);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

// minimal log
app.use((req, _res, next) => {
  console.log(req.method, req.url);
  next();
});

// ========= HEALTH (ikki yo‘l bir xil javob) =========
function healthHandler(_req, res) {
  res.status(200).json({
    ok: true,
    pid: process.pid,
    port: process.env.PORT,
    time: new Date().toISOString(),
  });
}
app.get("/health", healthHandler);
app.get("/healthz", healthHandler); // Render /healthz bo'lsa ham OK
app.get("/", (_req, res) => res.status(200).send("OK"));
app.get("/version", (_req, res) => res.json({ tag: "build-2025-09-21-1" }));


/* ========= HELPERS ========= */
function getCheckoutDate(checkIn, duration) {
  const d = new Date(checkIn);
  if (duration?.includes("3")) d.setHours(d.getHours() + 3);
  else if (duration?.includes("10")) d.setHours(d.getHours() + 10);
  else d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
}
function formatBookingEmail({
  firstName,
  lastName,
  phone,
  email,
  checkIn,
  checkOut,
  rooms,
  guests,
  price,
}) {
  const createdAt = new Date().toISOString();
  return {
    subject: "Yangi bron qilish haqida xabar",
    text: `
Yangi bron qabul qilindi:

👤 Ism: ${firstName} ${lastName}
📞 Telefon: ${phone || "Noma'lum"}
📧 Email: ${email}

📅 Kirish sana: ${checkIn}
📆 Chiqish sana: ${checkOut}
🛏️ Xona turi: ${rooms}
👥 Mehmonlar soni: ${guests || "Noma'lum"}
💶 Narx: ${price} EUR
🕓 Bron qilingan vaqt: ${createdAt}

🌐 Sayt: ${FRONTEND_URL}
    `.trim(),
  };
}

/* ========= ROUTES ========= */

// Availability (Bnovo READ)
app.get("/api/availability", async (req, res) => {
  try {
    const { checkIn, nights = 1 } = req.query;
    if (!checkIn) return res.status(400).json({ error: "checkIn required" });

    const ci = new Date(checkIn);
    const from = ci.toISOString().slice(0, 10);
    const toDt = new Date(ci);
    toDt.setDate(toDt.getDate() + Number(nights));
    const to = toDt.toISOString().slice(0, 10);

    const bookings = await bnovo.getBookings(from, to);
    const availability = BnovoAPI.computeAvailability({
      bookings,
      checkInISO: checkIn,
      nights: Number(nights),
      stock: {
        standard: Number(HOTEL_STANDARD_STOCK),
        family: Number(HOTEL_FAMILY_STOCK),
      },
    });

    // Standard hech qachon 0 bo'lib ko‘rinmasin:
    if (availability.standard.free <= 0) availability.standard.free = 1;

    res.json({ availability, range: { dateFrom: from, dateTo: to } });
  } catch (e) {
    console.error("availability xato:", e?.data || e?.message || e);
    // fallback: UX to‘xtamasin
    res.json({
      availability: {
        standard: {
          free: Number(HOTEL_STANDARD_STOCK),
          total: Number(HOTEL_STANDARD_STOCK),
        },
        family: {
          free: Number(HOTEL_FAMILY_STOCK),
          total: Number(HOTEL_FAMILY_STOCK),
        },
      },
      fallback: true,
    });
  }
});

// Payment → Octobank
app.post("/create-payment", async (req, res) => {
  try {
    const { amount, description = "Mehmonxona to'lovi", email } = req.body;
    if (!amount || !email)
      return res.status(400).json({ error: "Ma'lumot yetarli emas" });

    const amountUZS = Math.round(Number(amount) * EUR_TO_UZS);
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
      return_url: `${FRONTEND_URL}/success`,
      notify_url: `${BASE_URL}/payment-callback`,
      language: "uz",
      custom_data: { email },
    };

    const r = await fetch("https://secure.octo.uz/prepare_payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(paymentData),
    });
    const raw = await r.text();
    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      data = { raw };
    }

    if (data.error === 0 && data.data?.octo_pay_url) {
      return res.json({
        paymentUrl: data.data.octo_pay_url,
        shop_transaction_id: paymentData.shop_transaction_id,
      });
    }
    return res
      .status(400)
      .json({ error: data.errMessage || "Octobank xatosi" });
  } catch (err) {
    console.error("❌ create-payment xatolik:", err);
    res.status(500).json({ error: "Server xatosi" });
  }
});

// Octobank notify (server-2-server)
app.post("/payment-callback", (req, res) => {
  console.log("🔁 Octobank callback body:", req.body);
  res.json({ status: "callback received" });
});

// Pre-pay (front Confirm bosganda e-mail yuborish)
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
    } = req.body;
    if (!checkIn || !checkOutTime || !rooms || !firstName || !email) {
      return res
        .status(400)
        .json({ error: "Kerakli ma'lumotlar yetarli emas" });
    }
    const checkOut = getCheckoutDate(checkIn, duration);
    const { subject, text } = formatBookingEmail({
      firstName,
      lastName,
      phone,
      email,
      checkIn,
      checkOut,
      rooms,
      guests,
      price,
    });
    try {
      await sendEmail(ADMIN_EMAIL, subject, `[PRE-PAY]\n\n${text}`);
    } catch {}
    res.json({
      success: true,
      message: "Bron ma'lumotlari qabul qilindi (pre-pay)",
      checkOut,
    });
  } catch (error) {
    console.error("❌ /api/bookings xato:", error?.message || error);
    res.status(500).json({ error: "Server xatosi" });
  }
});

// Commit (to'lov SUCCESS'dan keyin Bnovo'ga YUBORILADI)
app.post("/api/bookings/commit", async (req, res) => {
  try {
    const {
      checkIn,
      duration,
      rooms,
      firstName,
      lastName,
      phone,
      email,
      guests,
      price,
      paymentId,
      shopTxId,
      comment,
    } = req.body;
    if (!checkIn || !rooms || !firstName || !email) {
      return res
        .status(400)
        .json({ error: "Kerakli ma'lumotlar yetarli emas" });
    }

    const checkOut = getCheckoutDate(checkIn, duration);
    const roomTypeMap = {
      "Standard Room": 117445,
      "Family Room": 117446,
      "2 Standard Rooms": 117445,
      "2 Family Rooms": 117446,
      "Standard + 1 Family room": 117447,
    };
    const room_type_id = roomTypeMap[rooms] || 117445;

    const bookingPayload = {
      date_from: checkIn,
      date_to: checkOut,
      rooms: [{ room_type_id, guests }],
      customer: { first_name: firstName, last_name: lastName, phone, email },
      comment:
        (comment ? `${comment}\n` : "") +
        `Xona: ${rooms} | Narx: ${price} EUR | To'lov: ${
          paymentId || shopTxId || "N/A"
        } | Sayt: ${FRONTEND_URL}`,
    };

    let bnovoResp = null,
      bnovoOk = false,
      bnovoErr = null;
    try {
      bnovoResp = await bnovo.createBooking(bookingPayload);
      bnovoOk = true;
    } catch (e) {
      bnovoErr = e?.data || e?.message || e;
      console.error("❌ Bnovo createBooking xato:", bnovoErr);
    }

    const { subject, text } = formatBookingEmail({
      firstName,
      lastName,
      phone,
      email,
      checkIn,
      checkOut,
      rooms,
      guests,
      price,
    });
    try {
      await sendEmail(
        ADMIN_EMAIL,
        subject,
        `[PAID]\n\n${text}\n\nBnovo status: ${bnovoOk ? "OK" : "FAIL"}`
      );
    } catch {}
    try {
      await sendTelegram(
        `PAID bron\n${firstName} ${lastName}\n${checkIn} → ${checkOut}\n${rooms}\n${price} EUR\nBnovo: ${
          bnovoOk ? "OK" : "FAIL"
        }`
      );
    } catch {}

    if (!bnovoOk)
      return res
        .status(502)
        .json({
          success: false,
          error: "Bnovo'ga bron yuborilmadi",
          details: bnovoErr,
        });
    res.json({ success: true, bnovo: bnovoResp });
  } catch (error) {
    console.error("❌ /api/bookings/commit xato:", error?.message || error);
    res.status(500).json({ error: "Server xatosi" });
  }
});

/* ========= START ========= */
app.listen(PORT, HOST, () => {
  console.log(`✅ Server ishlayapti: ${BASE_URL} (port: ${PORT})`);
});
