import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import dotenv from "dotenv";
import nodemailer from "nodemailer";
import BnovoAPI from "./bnovo.js";

dotenv.config();

const app = express();

// ====== ENV / CONFIG ======
const PORT = process.env.PORT || 5002;
const BASE_URL = process.env.BASE_URL || "https://hotel-backend-bmlk.onrender.com";
const FRONTEND_URL = process.env.FRONTEND_URL || "https://khamsahotel.uz";
const EUR_TO_UZS = Number(process.env.EUR_TO_UZS || 14000);

const {
  OCTO_SHOP_ID,
  OCTO_SECRET,
  EMAIL_USER,
  EMAIL_PASS,

  // --- Bnovo ---
  BNOVO_API_KEY,
  BNOVO_API_BASE,
  BNOVO_CREATE_PATH, // ixtiyoriy, default: /api/v1/bookings
  BNOVO_READ_PATH,   // ixtiyoriy, default: /api/v1/bookings

  // Xona fondi (asosiy eslatma bo'yicha)
  HOTEL_STANDARD_STOCK = 23,
  HOTEL_FAMILY_STOCK   = 1,

  // ixtiyoriy Telegram
  TELEGRAM_BOT_TOKEN,
  TELEGRAM_CHAT_ID,
} = process.env;

const ADMIN_EMAIL = "shamshodochilov160@gmail.com";

// Majburiy env tekshirish
if (!OCTO_SHOP_ID || !OCTO_SECRET || !EMAIL_USER || !EMAIL_PASS || !BNOVO_API_KEY || !BNOVO_API_BASE) {
  console.error("❌ .env yetarli emas (OCTO_*, EMAIL_*, BNOVO_* shart).");
  process.exit(1);
}

// ====== Transporter (email) ======
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: { user: EMAIL_USER, pass: EMAIL_PASS },
});

async function sendEmail(to, subject, text) {
  if (!to || !subject || !text) return;
  const info = await transporter.sendMail({
    from: `"Khamsa Hotel" <${EMAIL_USER}>`,
    to,
    subject,
    text,
  });
  return info;
}

// (ixtiyoriy) Telegram xabar
async function sendTelegram(text) {
  try {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text }),
    });
  } catch (e) {
    console.warn("Telegram yuborilmadi:", e?.message || e);
  }
}

// ====== Bnovo klienti ======
const bnovo = new BnovoAPI({
  apiKey: BNOVO_API_KEY,
  baseUrl: BNOVO_API_BASE,
  createPath: BNOVO_CREATE_PATH || "/api/v1/bookings",
  readPath: BNOVO_READ_PATH || "/api/v1/bookings",
});

// ====== Middlewares ======
app.use(cors({
  origin: [FRONTEND_URL, `${FRONTEND_URL}/`],
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type"],
}));
app.use(express.json());

// ====== Helpers ======
function getCheckoutDate(checkIn, duration) {
  const date = new Date(checkIn);
  if (duration && duration.includes("3")) date.setHours(date.getHours() + 3);
  else if (duration && duration.includes("10")) date.setHours(date.getHours() + 10);
  else date.setDate(date.getDate() + 1);
  return date.toISOString().split("T")[0];
}

function formatBookingEmail({ firstName, lastName, phone, email, checkIn, checkOut, rooms, guests, price }) {
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

// ====== Payments ======
app.post("/create-payment", async (req, res) => {
  try {
    const { amount, description = "Mehmonxona to'lovi", email } = req.body;
    if (!amount || !email) return res.status(400).json({ error: "Ma'lumot yetarli emas" });

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

    const response = await fetch("https://secure.octo.uz/prepare_payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(paymentData),
    });

    const raw = await response.text();
    let data; try { data = JSON.parse(raw); } catch { data = { raw }; }

    if (data.error === 0 && data.data?.octo_pay_url) {
      return res.json({ paymentUrl: data.data.octo_pay_url, shop_transaction_id: paymentData.shop_transaction_id });
    }
    return res.status(400).json({ error: data.errMessage || "Octobank xatosi" });
  } catch (err) {
    console.error("❌ create-payment xatolik:", err);
    res.status(500).json({ error: "Server xatosi" });
  }
});

// Octobank callback (server-2-server)
app.post("/payment-callback", (req, res) => {
  // Octobank formati loyihaga qarab farq qiladi; hozir log qilib qo'yamiz.
  console.log("🔁 Callback body:", req.body);
  res.json({ status: "callback received" });
});

// ====== Availability (Bnovo READ) ======
app.get("/api/availability", async (req, res) => {
  try {
    const { checkIn, nights = 1 } = req.query;
    if (!checkIn) return res.status(400).json({ error: "checkIn required" });

    const checkInDate = new Date(checkIn);
    const dateFrom = checkInDate.toISOString().slice(0,10);
    const dateToDt = new Date(checkInDate);
    dateToDt.setDate(dateToDt.getDate() + Number(nights));
    const dateTo = dateToDt.toISOString().slice(0,10);

    const bookings = await bnovo.getBookings(dateFrom, dateTo);
    const availability = BnovoAPI.computeAvailability({
      bookings,
      checkInISO: checkIn,
      nights: Number(nights),
      stock: { standard: Number(HOTEL_STANDARD_STOCK), family: Number(HOTEL_FAMILY_STOCK) },
    });

    // Talab: "Standard band bo'lishi mumkin emas" — himoya sifatida 0 bo'lsa ham 1 ko'rsatamiz
    if (availability.standard.free <= 0) availability.standard.free = 1;

    res.json({ availability, range: { dateFrom, dateTo } });
  } catch (e) {
    console.error("availability xato:", e?.data || e?.message || e);
    // Xato bo'lsa ham UXni buzmaslik: local stockni qaytaramiz
    res.json({
      availability: {
        standard: { free: Number(HOTEL_STANDARD_STOCK), total: Number(HOTEL_STANDARD_STOCK) },
        family:   { free: Number(HOTEL_FAMILY_STOCK),   total: Number(HOTEL_FAMILY_STOCK) },
      },
      fallback: true,
    });
  }
});

// ====== OLD (bron saqlash – to'lovdan oldingi bosqich, front foydalanayotgan bo'lishi mumkin) ======
app.post("/api/bookings", async (req, res) => {
  try {
    const {
      checkIn, checkOutTime, duration, rooms, guests,
      firstName, lastName, phone, email, price,
    } = req.body;

    if (!checkIn || !checkOutTime || !rooms || !firstName || !email) {
      return res.status(400).json({ error: "Kerakli ma'lumotlar yetarli emas" });
    }

    const checkOut = getCheckoutDate(checkIn, duration);
    const { subject, text } = formatBookingEmail({ firstName, lastName, phone, email, checkIn, checkOut, rooms, guests, price });

    // Admin xabari (to'lovdan oldin)
    try { await sendEmail(ADMIN_EMAIL, subject, `[PRE-PAY]\n\n${text}`); } catch {}

    res.json({ success: true, message: "Bron ma'lumotlari qabul qilindi (pre-pay)", checkOut });
  } catch (error) {
    console.error("❌ /api/bookings xato:", error?.message || error);
    res.status(500).json({ error: "Server xatosi" });
  }
});

// ====== COMMIT (to'lov SUCCESS'dan keyin Bnovo'ga YUBORILADI) ======
app.post("/api/bookings/commit", async (req, res) => {
  try {
    const {
      // majburiy:
      checkIn, duration, rooms,
      firstName, lastName, phone, email,
      guests, price,

      // ixtiyoriy:
      paymentId, shopTxId, comment,
    } = req.body;

    if (!checkIn || !rooms || !firstName || !email) {
      return res.status(400).json({ error: "Kerakli ma'lumotlar yetarli emas" });
    }

    const checkOut = getCheckoutDate(checkIn, duration);

    // Xona turi -> room_type_id mapping (siz bergan ID'lar bo'yicha)
    const roomTypeMap = {
      "Standard Room": 117445,
      "Family Room": 117446,
      "2 Standard Rooms": 117445,
      "2 Family Rooms": 117446,
      "Standard + 1 Family room": 117447,
      // Kiritilgan boshqa qiymatlar bo'lsa default qilib Standard
    };
    const room_type_id = roomTypeMap[rooms] || 117445;

    const bookingPayload = {
      date_from: checkIn,
      date_to: checkOut,
      rooms: [{ room_type_id, guests }],
      customer: {
        first_name: firstName,
        last_name: lastName,
        phone,
        email,
      },
      comment: (comment ? `${comment}\n` : "") +
        `Xona: ${rooms} | Narx: ${price} EUR | To'lov: ${paymentId || shopTxId || "N/A"} | Sayt: ${FRONTEND_URL}`,
    };

    // 1) Bnovo'ga jo'natamiz
    let bnovoResp = null, bnovoOk = false, bnovoErr = null;
    try {
      bnovoResp = await bnovo.createBooking(bookingPayload);
      bnovoOk = true;
    } catch (e) {
      bnovoErr = e?.data || e?.message || e;
      console.error("❌ Bnovo createBooking xato:", bnovoErr);
    }

    // 2) Admin/xodimga email + (ixtiyoriy) Telegram
    const { subject, text } = formatBookingEmail({ firstName, lastName, phone, email, checkIn, checkOut, rooms, guests, price });
    try { await sendEmail(ADMIN_EMAIL, subject, `[PAID]\n\n${text}\n\nBnovo status: ${bnovoOk ? "OK" : "FAIL"}`); } catch {}
    try { await sendTelegram(`PAID bron\n${firstName} ${lastName}\n${checkIn} → ${checkOut}\n${rooms}\n${price} EUR\nBnovo: ${bnovoOk ? "OK" : "FAIL"}`); } catch {}

    if (!bnovoOk) {
      return res.status(502).json({ success: false, error: "Bnovo'ga bron yuborilmadi", details: bnovoErr });
    }
    res.json({ success: true, bnovo: bnovoResp });
  } catch (error) {
    console.error("❌ /api/bookings/commit xato:", error?.message || error);
    res.status(500).json({ error: "Server xatosi" });
  }
});

// ====== Server start ======
app.listen(PORT, () => {
  console.log(`✅ Server ishlayapti: ${BASE_URL} (port: ${PORT})`);
});
