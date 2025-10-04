// index.js — Khamsa backend (Express + Bnovo + Octo)
import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import dotenv from "dotenv";
import nodemailer from "nodemailer";
import crypto from "crypto";
import { checkAvailability, createBookingInBnovo } from "./bnovo.js";

/* === Qo'shildi: Postgres === */
import { Pool } from "pg";

dotenv.config();

/* ====== App & Config ====== */
const app = express();
const PORT = Number(process.env.PORT || 5004);
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

const missing = [];
if (!OCTO_SHOP_ID) missing.push("OCTO_SHOP_ID");
if (!OCTO_SECRET) missing.push("OCTO_SECRET");
if (!EMAIL_USER) missing.push("EMAIL_USER");
if (!EMAIL_PASS) missing.push("EMAIL_PASS");
if (missing.length) {
  console.warn("⚠️ .env dagi quyidagi maydonlar yo'q:", missing.join(", "));
}

app.set("trust proxy", 1);

/* ====== CORS ====== */
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

/* ====== Body parsers ====== */
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));
app.use(express.text({ type: ["text/*"], limit: "512kb" }));

/* ====== Health ====== */
app.get("/", (_req, res) => {
  res.json({
    ok: true,
    name: "Khamsa backend",
    time: new Date().toISOString(),
    port: PORT,
  });
});
app.get("/healthz", (_req, res) => res.json({ ok: true }));

/* ====== Email ====== */
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

/* ====== Telegram ====== */
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

/* ====== Utils ====== */
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

const SIGN_SECRET = crypto
  .createHash("sha256")
  .update(String(process.env.OCTO_SECRET || "octo"))
  .digest();

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

/* ====== Pending store (server-side) ====== */
const PENDING = new Map(); // key: shop_transaction_id
function savePending(id, payload) {
  PENDING.set(String(id), { payload, ts: Date.now() });
}
function popPending(id) {
  const rec = PENDING.get(String(id));
  if (rec) PENDING.delete(String(id));
  return rec?.payload || null;
}
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of PENDING.entries()) {
    if (now - (v?.ts || 0) > 24 * 60 * 60 * 1000) PENDING.delete(k);
  }
}, 60 * 60 * 1000);

/* =========================================================
 *  Qo'shildi: Postgres ulanishi + /db/health endpoint (ESM)
 * ========================================================= */
const PGHOST = process.env.PGHOST || "";
const PGPORT = Number(process.env.PGPORT || 5432);
const PGDATABASE = process.env.PGDATABASE || "";
const PGUSER = process.env.PGUSER || "";
const PGPASSWORD = process.env.PGPASSWORD || "";
const PGSSLMODE = String(process.env.PGSSLMODE || "disable").toLowerCase();

const pgPool = new Pool({
  host: PGHOST,
  port: PGPORT,
  database: PGDATABASE,
  user: PGUSER,
  password: PGPASSWORD,
  ssl: PGSSLMODE === "require" ? { rejectUnauthorized: false } : undefined,
});

// ishga tushganda ulanish logi
pgPool
  .query("SELECT now() AS now")
  .then((r) => console.log("[DB] connected:", r.rows[0].now))
  .catch((e) => console.error("[DB] connect error:", e.message));

// DB health
app.get("/db/health", async (_req, res) => {
  try {
    const r = await pgPool.query("SELECT 1 AS ok");
    res.json({ ok: true, db: r.rows[0].ok });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

/* =======================
 *  BNOVO ROUTES
 * ======================= */

/** GET /api/bnovo/availability?checkIn=YYYY-MM-DD&nights=1&roomType=STANDARD|FAMILY */
app.get("/api/bnovo/availability", async (req, res) => {
  try {
    const { checkIn, nights = 1, roomType = "STANDARD" } = req.query || {};
    if (!checkIn) return res.status(400).json({ ok: false, error: "checkIn required" });

    const ci = String(checkIn).slice(0, 10);
    const n = Math.max(1, Number(nights || 1));
    const checkInDate = new Date(ci + "T00:00:00Z");
    if (Number.isNaN(checkInDate.getTime())) {
      return res.status(400).json({ ok: false, error: "checkIn invalid" });
    }

    const checkOut = new Date(checkInDate.getTime() + n * 86400000).toISOString().slice(0, 10);

    // Bnovo
    const avail = await checkAvailability({
      checkIn: ci,
      checkOut,
      roomType: String(roomType).toUpperCase(),
    });

    // Frontend uchun soddalashtirilgan, ammo to‘liq javob
    return res.json({
      ok: Boolean(avail?.ok),
      roomType: String(avail?.roomType || roomType).toUpperCase(),
      available: Boolean(avail?.available),
      checkIn: ci,
      checkOut,
      ...(avail?.source ? { source: avail.source } : {}),
      ...(avail?.warning ? { warning: avail.warning } : {}),
    });
  } catch (e) {
    console.error("/api/bnovo/availability error:", e);
    res.status(500).json({ ok: false, available: false, error: "availability failed" });
  }
});

/* =======================
 *  PAYMENTS (Octo)
 * ======================= */

// Create payment
app.post("/create-payment", async (req, res) => {
  try {
    if (!OCTO_SHOP_ID || !OCTO_SECRET) {
      return res.status(500).json({ error: "Payment sozlanmagan (env yo'q)" });
    }

    const {
      amount, // EUR
      description = "Mehmonxona to'lovi",
      email,
      booking = {}, // {checkIn, duration, rooms, guests, firstName, lastName, phone, email, price}
    } = req.body || {};

    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0 || !email) {
      return res.status(400).json({ error: "Ma'lumot yetarli emas yoki amount noto‘g‘ri" });
    }

    const computeCheckOut = (checkInStr, durationStr) => {
      const d = new Date(checkInStr);
      if (durationStr?.includes("3")) d.setHours(d.getHours() + 3);
      else if (durationStr?.includes("10")) d.setHours(d.getHours() + 10);
      else d.setDate(d.getDate() + 1);
      return d.toISOString().split("T")[0];
    };

    const checkOut = computeCheckOut(booking.checkIn, booking.duration);
    const amountUZS = Math.max(1000, Math.round(amt * EUR_TO_UZS));

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
      note: "Khamsa website payment success → push to Bnovo",
    };

    const signed = signData(bookingPayload);
    const shopTransactionId = Date.now().toString();

    const payload = {
      octo_shop_id: Number(OCTO_SHOP_ID),
      octo_secret: OCTO_SECRET,
      shop_transaction_id: shopTransactionId,
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
        email,
        booking_json: signed.json,
        booking_sig: signed.sig,
      },
    };

    savePending(shopTransactionId, bookingPayload);

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
    const msg =
      (data && (data.errMessage || data.message)) || `Octo error (status ${octoRes.status})`;
    return res.status(400).json({ error: msg });
  } catch (err) {
    console.error("❌ create-payment:", err);
    res.status(500).json({ error: "Server xatosi" });
  }
});

// Octo notify (SUCCESS → optional Bnovo push)
app.post("/payment-callback", async (req, res) => {
  try {
    const body =
      typeof req.body === "string"
        ? (() => {
            try {
              return JSON.parse(req.body);
            } catch {
              return {};
            }
          })()
        : req.body || {};
    console.log("🔁 payment-callback body:", body);

    const statusFields = [
      body?.status,
      body?.payment_status,
      body?.transaction_status,
      body?.result,
    ].map((s) => String(s || "").toLowerCase());
    const isSuccess =
      statusFields.some((s) =>
        ["ok", "success", "succeeded", "paid", "captured", "approved", "done"].includes(s)
      ) ||
      body?.paid === true ||
      body?.error === 0 ||
      String(body?.state || "").toUpperCase() === "CAPTURED";

    let verifiedPayload = null;
    try {
      let custom = body?.custom_data;
      if (typeof custom === "string") {
        try {
          custom = JSON.parse(custom);
        } catch {}
      }
      const json = custom?.booking_json;
      const sig = custom?.booking_sig;
      if (json && sig && verifyData(json, sig)) {
        verifiedPayload = JSON.parse(json);
      } else if (json && !sig) {
        try {
          verifiedPayload = JSON.parse(json);
        } catch {}
      }
    } catch (e) {
      console.warn("custom_data parse error:", e);
    }

    if (!verifiedPayload) {
      console.warn("⚠️ custom_data yo‘q yoki verify bo‘lmadi — pending store’dan izlaymiz");
      const stid = body?.shop_transaction_id || body?.data?.shop_transaction_id;
      if (stid) {
        verifiedPayload = popPending(stid);
        if (!verifiedPayload) console.warn("⚠️ pending store’da ham topilmadi:", stid);
      } else {
        console.warn("⚠️ shop_transaction_id kelmadi");
      }
    }

    if (isSuccess && verifiedPayload) {
      const pushRes = await createBookingInBnovo(verifiedPayload);

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

Bnovo push: ${
        pushRes.pushed ? "✅ Pushed" : pushRes.ok ? "⚠️ Skipped (cheklov)" : "❌ Fail"
      }
${
  pushRes.ok
    ? pushRes.pushed
      ? ""
      : `Reason: ${pushRes.reason || ""}`
    : `Reason: ${JSON.stringify(pushRes.error || pushRes.status || pushRes.data || {}, null, 2)}`
}
      `.trim();

      try {
        await sendEmail(ADMIN_EMAIL, "Khamsa: Payment Success", human);
      } catch {}
      try {
        await notifyTelegram(human);
      } catch {}

      return res.json({ ok: true });
    }

    console.warn("⚠️ Payment not success yoki payload topilmadi:", {
      statusFields,
      paid: body?.paid,
    });
    return res.json({ ok: true }); // Octo qayta urmasin
  } catch (e) {
    console.error("❌ /payment-callback:", e);
    res.status(200).json({ ok: true });
  }
});

/* =======================
 *  Legacy booking notify
 * ======================= */
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
    } catch {}

    res.json({
      success: true,
      message: "Bron muvaffaqiyatli tarzda yuborildi",
      createdAt,
    });
  } catch (error) {
    console.error("❌ /api/bookings:", error);
    res.status(500).json({ error: "Bron qilishda server xatosi" });
  }
});

/* ====== 404 & error handlers ====== */
app.use((req, res) => {
  res.status(404).json({ error: "Not Found", path: req.path });
});
app.use((err, req, res, _next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal Server Error" });
});

/* ====== Start ====== */
app.listen(PORT, () => {
  console.log(`✅ Server ishlayapti: ${BASE_URL} (port: ${PORT})`);
  console.log(
    `[BNOVO] mode=${process.env.BNOVO_AUTH_MODE} auth_url=${process.env.BNOVO_AUTH_URL} id_set=${!!process.env.BNOVO_ID} pass_set=${!!process.env.BNOVO_PASSWORD}`
  );
});
