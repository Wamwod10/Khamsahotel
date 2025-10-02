// index.js — CommonJS (Render va Node 18+ bilan mos)
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const nodemailer = require("nodemailer");
const crypto = require("crypto");

// Node 18+: fetch global bo‘lishi kerak
if (typeof fetch !== "function") {
  throw new Error("This server requires Node 18+ (global.fetch is missing).");
}

const {
  checkAvailability,
  findFamilyBookings,
  HOTEL_TZ_OFFSET,
  _listForRaw,
  setHotelFilterEnabled, // <-- diagnostika uchun
} = require("./bnovo.js");

dotenv.config();

/* ====== App & Config ====== */
const app = express();
const PORT = Number(process.env.PORT || 5002);
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

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@example.com";

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
  "https://khamsa-backend.onrender.com",
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
    tzOffset: HOTEL_TZ_OFFSET,
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
  try { return JSON.parse(txt); } catch { return { _raw: txt }; }
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
  try { return crypto.timingSafeEqual(Buffer.from(h), Buffer.from(sig || "")); } catch { return false; }
}

/* ====== Pending store (server-side) ====== */
app.locals._pending = new Map(); // key: shop_transaction_id
function savePending(id, payload) {
  app.locals._pending.set(String(id), { payload, ts: Date.now() });
}
function popPending(id) {
  const rec = app.locals._pending.get(String(id));
  if (rec) app.locals._pending.delete(String(id));
  return rec?.payload || null;
}
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of app.locals._pending.entries()) {
    if (now - (v?.ts || 0) > 24 * 60 * 60 * 1000) app.locals._pending.delete(k);
  }
}, 60 * 60 * 1000);

/* =======================
 *  BNOVO ROUTES
 * ======================= */

/**
 * GET /api/bnovo/availability
 * Query:
 *   checkIn=YYYY-MM-DD (majburiy)
 *   duration=1|3h|10h|...  (yo‘q bo‘lsa 1 kecha)
 *   rooms=1..N
 *   roomType=STANDARD|FAMILY (default STANDARD)
 *   nights=... (back-compat)
 */
app.get("/api/bnovo/availability", async (req, res) => {
  try {
    const { checkIn, duration, rooms = 1, roomType = "STANDARD", nights } = req.query || {};
    if (!checkIn) return res.status(400).json({ ok: false, error: "checkIn required" });

    const ciISO = String(checkIn).slice(0, 10);

    function computeCheckOut(checkInStr, durationStr, nightsStr) {
      const base = new Date(checkInStr + "T00:00:00Z");
      if (durationStr) {
        if (String(durationStr).includes("3")) base.setUTCHours(base.getUTCHours() + 3);
        else if (String(durationStr).includes("10")) base.setUTCHours(base.getUTCHours() + 10);
        else base.setUTCDate(base.getUTCDate() + 1);
      } else if (nightsStr) {
        base.setUTCDate(base.getUTCDate() + Number(nightsStr || 1));
      } else {
        base.setUTCDate(base.getUTCDate() + 1);
      }
      return base.toISOString().slice(0, 10);
    }

    const coISO = computeCheckOut(ciISO, duration, nights);

    const result = await checkAvailability({
      checkIn: ciISO,
      checkOut: coISO,
      roomType: String(roomType).toUpperCase(),
      rooms: Math.max(1, Number(rooms || 1)),
    });

    return res.json({
      ok: Boolean(result?.ok),
      roomType: String(result?.roomType || roomType).toUpperCase(),
      available: Boolean(result?.available),
      checkIn: ciISO,
      checkOut: coISO,
      ...(result?.freeRooms !== undefined ? { freeRooms: result.freeRooms } : {}),
      ...(result?.occupiedRooms !== undefined ? { occupiedRooms: result.occupiedRooms } : {}),
      ...(result?.totalRooms !== undefined ? { totalRooms: result.totalRooms } : {}),
      ...(result?.source ? { source: result.source } : {}),
      ...(result?.warning ? { warning: result.warning } : {}),
    });
  } catch (e) {
    console.error("/api/bnovo/availability error:", e);
    res.status(500).json({ ok: false, available: false, error: "availability failed" });
  }
});

/** Diagnostika: family bronlar (auto +1 kun) + noHotel rejim */
app.get("/api/bnovo/debug-family", async (req, res) => {
  try {
    const { from, to, noHotel } = req.query || {};
    const f = (from || "").slice(0, 10);
    let t = (to || "").slice(0, 10);
    if (!f) return res.status(400).json({ ok: false, error: "from required (YYYY-MM-DD)" });
    // Bnovo: date_from < date_to bo'lishi shart
    if (!t || t <= f) {
      const base = new Date(f + "T00:00:00Z");
      base.setUTCDate(base.getUTCDate() + 1);
      t = base.toISOString().slice(0, 10);
    }

    // noHotel=1 bo‘lsa hotel_id filtrini vaqtincha o‘chiramiz
    const disableFilter = String(noHotel || "") === "1";
    const prev = setHotelFilterEnabled(!disableFilter);
    try {
      const data = await findFamilyBookings({ from: f, to: t });
      res.json({ ok: true, from: f, to: t, noHotel: !!disableFilter, ...data });
    } finally {
      // holatni qaytarib qo'yamiz
      setHotelFilterEnabled(prev);
    }
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
});

/** Diagnostika: xom ro‘yxat (family tokenlarini aniqlashga yordam beradi) + noHotel */
app.get("/api/bnovo/raw", async (req, res) => {
  try {
    const { from, to, noHotel } = req.query || {};
    const f = (from || "").slice(0, 10);
    let t = (to || "").slice(0, 10);
    if (!f) return res.status(400).json({ ok: false, error: "from required (YYYY-MM-DD)" });
    if (!t || t <= f) {
      const d = new Date(f + "T00:00:00Z");
      d.setUTCDate(d.getUTCDate() + 1);
      t = d.toISOString().slice(0, 10);
    }

    const disableFilter = String(noHotel || "") === "1";
    const prev = setHotelFilterEnabled(!disableFilter);
    try {
      const raw = await _listForRaw(f, t); // { applied_params, url, count, items }
      res.json({ ok: true, from: f, to: t, noHotel: !!disableFilter, ...raw });
    } finally {
      setHotelFilterEnabled(prev);
    }
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
});

/* =======================
 *  PAYMENTS (Octo)
 * ======================= */

app.post("/create-payment", async (req, res) => {
  try {
    if (!OCTO_SHOP_ID || !OCTO_SECRET) {
      return res.status(500).json({ error: "Payment sozlanmagan (env yo'q)" });
    }

    const { amount, description = "Mehmonxona to'lovi", email, booking = {} } = req.body || {};
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

    const { json: booking_json, sig: booking_sig } = (function sign(obj) {
      const json = JSON.stringify(obj);
      const h = crypto
        .createHmac("sha256", crypto.createHash("sha256").update(String(process.env.OCTO_SECRET || "octo")).digest())
        .update(json)
        .digest("hex");
      return { json, sig: h };
    })(bookingPayload);

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
      custom_data: { email, booking_json, booking_sig },
    };

    savePending(shopTransactionId, bookingPayload);

    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 20000);

    const octoRes = await fetch("https://secure.octo.uz/prepare_payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    }).catch((e) => { throw new Error(`Octo fetch failed: ${e?.message || e}`); });
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

app.post("/payment-callback", async (req, res) => {
  try {
    const body = typeof req.body === "string" ? (() => { try { return JSON.parse(req.body); } catch { return {}; } })() : req.body || {};
    console.log("🔁 payment-callback body:", body);

    const statusFields = [body?.status, body?.payment_status, body?.transaction_status, body?.result]
      .map((s) => String(s || "").toLowerCase());
    const isSuccess =
      statusFields.some((s) => ["ok", "success", "succeeded", "paid", "captured", "approved", "done"].includes(s)) ||
      body?.paid === true ||
      body?.error === 0 ||
      String(body?.state || "").toUpperCase() === "CAPTURED";

    let verifiedPayload = null;
    try {
      let custom = body?.custom_data;
      if (typeof custom === "string") { try { custom = JSON.parse(custom); } catch {} }
      const json = custom?.booking_json;
      if (json) { try { verifiedPayload = JSON.parse(json); } catch {} }
    } catch {}

    if (!verifiedPayload) {
      const stid = body?.shop_transaction_id || body?.data?.shop_transaction_id;
      if (stid) verifiedPayload = popPending(stid);
    }

    if (isSuccess && verifiedPayload) {
      // Read-only: push yo'q
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

Bnovo push: ⚠️ Skipped (read-only)
      `.trim();

      try { await sendEmail(ADMIN_EMAIL, "Khamsa: Payment Success", human); } catch {}
      try { await notifyTelegram(human); } catch {}

      return res.json({ ok: true });
    }

    console.warn("⚠️ Payment not success yoki payload topilmadi.");
    return res.json({ ok: true });
  } catch (e) {
    console.error("❌ /payment-callback:", e);
    res.status(200).json({ ok: true });
  }
});

/* ====== 404 & error handlers ====== */
app.use((req, res) => res.status(404).json({ error: "Not Found", path: req.path }));
app.use((err, req, res, _next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal Server Error" });
});

/* ====== Start ====== */
app.listen(PORT, () => {
  console.log(`✅ Server ishlayapti: ${BASE_URL} (port: ${PORT})`);
  console.log(`[BNOVO] tzOffset=${HOTEL_TZ_OFFSET}`);
});
