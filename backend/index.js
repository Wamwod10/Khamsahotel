// backend/index.js — Khamsa backend (Express + Bnovo + Octo + Postgres)
import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import dotenv from "dotenv";
import nodemailer from "nodemailer";
import crypto from "crypto";
import { Pool } from "pg";
import { checkAvailability, createBookingInBnovo } from "./bnovo.js";

dotenv.config();
const app = express();
const PORT = Number(process.env.PORT || 5004);
const BASE_URL = (process.env.BASE_URL || `http://localhost:${PORT}`).replace(
  /\/+$/,
  ""
);
const FRONTEND_URL = (
  process.env.FRONTEND_URL || "https://khamsahotel.uz"
).replace(/\/+$/, "");
const EUR_TO_UZS = Number(process.env.EUR_TO_UZS || 14700);

// Capacity/buffer defaults (env bilan boshqariladi)
const FAMILY_CAPACITY = Number(
  process.env.FAMILY_CAPACITY || process.env.FAMILY_STOCK || 1
);
const STANDARD_CAPACITY = Number(
  process.env.STANDARD_CAPACITY || process.env.STANDARD_STOCK || 23
);
const FAMILY_PRE_BUFFER_MIN = Number(process.env.FAMILY_PRE_BUFFER_MIN || 0);
const FAMILY_POST_BUFFER_MIN = Number(process.env.FAMILY_POST_BUFFER_MIN || 0);

const {
  OCTO_SHOP_ID,
  OCTO_SECRET,
  EMAIL_USER,
  EMAIL_PASS,
  TELEGRAM_BOT_TOKEN,
  TELEGRAM_CHAT_ID,
  ADMIN_EMAIL = "shamshodochilov160@gmail.com",
} = process.env;

const missing = [];
if (!OCTO_SHOP_ID) missing.push("OCTO_SHOP_ID");
if (!OCTO_SECRET) missing.push("OCTO_SECRET");
if (!EMAIL_USER) missing.push("EMAIL_USER");
if (!EMAIL_PASS) missing.push("EMAIL_PASS");
if (missing.length)
  console.warn("⚠️ .env dagi quyidagi maydonlar yo'q:", missing.join(", "));

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
      if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
      console.warn("CORS block:", origin);
      return cb(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Accept",
      "Authorization",
      "Idempotency-Key",
    ],
    credentials: false,
  })
);

// Yupqa preflight
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin))
    res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Accept, Authorization, Idempotency-Key"
  );
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

/* ====== Parsers ====== */
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));
app.use(express.text({ type: ["text/*"], limit: "512kb" }));

/* ====== Health ====== */
app.get("/", (_req, res) =>
  res.json({
    ok: true,
    name: "Khamsa backend",
    time: new Date().toISOString(),
    port: PORT,
  })
);
app.get("/healthz", (_req, res) => res.json({ ok: true }));

/* ====== Email ====== */
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: { user: EMAIL_USER, pass: EMAIL_PASS },
});

// Server start bo'lganda SMTP (Gmail) sozlanishini tekshiramiz
if (EMAIL_USER && EMAIL_PASS) {
  transporter
    .verify()
    .then(() => {
      console.log("✅ SMTP (Gmail) OK. EMAIL_USER =", EMAIL_USER);
    })
    .catch((e) => {
      console.error("❌ SMTP verify xato:", e.message || e);
    });
} else {
  console.warn(
    "⚠️ EMAIL_USER yoki EMAIL_PASS .env da yo'q. Email transport ishlamaydi."
  );
}

async function sendEmail(to, subject, text) {
  if (!EMAIL_USER || !EMAIL_PASS)
    throw new Error("email transport is not configured (EMAIL_USER/PASS yo'q)");
  if (!to || !subject || !text) throw new Error("email: invalid payload");
  return transporter.sendMail({
    from: `"Khamsa Hotel" <${EMAIL_USER}>`,
    to,
    subject,
    text,
  });
}

/* === Public send-email endpoint (+idempotency) === */
const emailLocks = new Map(); // key -> timestamp
app.post("/send-email", async (req, res) => {
  try {
    const { to, subject, text } = req.body || {};
    const idem = req.headers["idempotency-key"];
    if (!to || !subject || !text) {
      return res
        .status(400)
        .json({ ok: false, error: "to/subject/text required" });
    }
    // 24 soat ichida bir xil kalitni qayta qabul qilmaslik
    if (idem) {
      const hit = emailLocks.get(idem);
      if (hit && Date.now() - hit < 24 * 60 * 60 * 1000) {
        return res.json({ ok: true, skipped: true, reason: "idempotent" });
      }
    }
    await sendEmail(to, subject, text);
    if (idem) emailLocks.set(idem, Date.now());
    res.json({ ok: true });
  } catch (e) {
    console.error("send-email error:", e);
    res.status(500).json({
      ok: false,
      error: "send-email failed",
      detail: e?.message || String(e),
    });
  }
});

/* ====== Telegram ====== */
async function notifyTelegram(text) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;
  try {
    await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text }),
      }
    );
  } catch (e) {
    console.error("Telegram error:", e);
  }
}

/* ====== Helpers ====== */
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
  const sig = crypto
    .createHmac("sha256", SIGN_SECRET)
    .update(json)
    .digest("hex");
  return { json, sig };
}
function verifyData(json, sig) {
  const h = crypto.createHmac("sha256", SIGN_SECRET).update(json).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(h), Buffer.from(sig || ""));
  } catch {
    return false;
  }
}

/* ====== Pending store (Octo) ====== */
const PENDING = new Map();
const savePending = (id, payload) =>
  PENDING.set(String(id), { payload, ts: Date.now() });
const popPending = (id) => {
  const r = PENDING.get(String(id));
  if (r) PENDING.delete(String(id));
  return r?.payload || null;
};
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of PENDING)
    if (now - (v?.ts || 0) > 86400000) PENDING.delete(k);
}, 3600000);

/* ====== Payment results (Octo redirect uchun) ====== */
const PAYMENT_RESULTS = new Map();
const savePaymentResult = (id, success) =>
  PAYMENT_RESULTS.set(String(id), { success, ts: Date.now() });
const takePaymentResult = (id) => {
  const v = PAYMENT_RESULTS.get(String(id));
  if (v) PAYMENT_RESULTS.delete(String(id));
  return v || null;
};
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of PAYMENT_RESULTS)
    if (now - (v?.ts || 0) > 86400000) PAYMENT_RESULTS.delete(k);
}, 3600000);

/* =========================================================
 *  Postgres
 * ========================================================= */


const pgPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
  keepAlive: true,
  max: 10,
});

pgPool.on("connect", () => {
  console.log("✅ Neon DB connected");
});

pgPool.on("error", (err) => {
  console.error("🔥 Neon Pool error:", err.message);
});


pgPool
  .query("SELECT now() AS now")
  .then((r) => console.log("[DB] connected:", r.rows[0].now))
  .catch((e) => console.error("[DB] connect error:", e.message));

app.get("/db/health", async (_req, res) => {
  try {
    const r = await pgPool.query("SELECT 1 AS ok");
    res.json({ ok: true, db: r.rows[0].ok });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

/* ====== DB schema ensure ====== */
const isISO = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ""));
const isISODateTime = (s) =>
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?/.test(String(s || ""));
const toTz = (s) => {
  if (!s) return null;
  if (isISODateTime(s)) return s;
  if (isISO(s)) return `${s}T00:00:00`;
  return null;
};

async function ensureSchema() {
  await pgPool.query(
    `CREATE TABLE IF NOT EXISTS public.khamsachekin (id SERIAL PRIMARY KEY);`
  );
  await pgPool.query(`
    DO $$
    DECLARE _t text := 'khamsachekin';
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=_t AND column_name='created_at') THEN
        EXECUTE 'ALTER TABLE public.'||_t||' ADD COLUMN created_at TIMESTAMPTZ DEFAULT now()';
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=_t AND column_name='check_in') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=_t AND column_name='start_at') THEN
          EXECUTE 'ALTER TABLE public.'||_t||' RENAME COLUMN start_at TO check_in';
        ELSE
          EXECUTE 'ALTER TABLE public.'||_t||' ADD COLUMN check_in DATE';
        END IF;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=_t AND column_name='check_out') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=_t AND column_name='end_at') THEN
          EXECUTE 'ALTER TABLE public.'||_t||' RENAME COLUMN end_at TO check_out';
        ELSE
          EXECUTE 'ALTER TABLE public.'||_t||' ADD COLUMN check_out DATE';
        END IF;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=_t AND column_name='rooms') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=_t AND column_name='room_type') THEN
          EXECUTE 'ALTER TABLE public.'||_t||' RENAME COLUMN room_type TO rooms';
        ELSE
          EXECUTE 'ALTER TABLE public.'||_t||' ADD COLUMN rooms TEXT';
        END IF;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=_t AND column_name='duration') THEN
        EXECUTE 'ALTER TABLE public.'||_t||' ADD COLUMN duration INTEGER';
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=_t AND column_name='check_in_time') THEN
        EXECUTE 'ALTER TABLE public.'||_t||' ADD COLUMN check_in_time TEXT';
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=_t AND column_name='price') THEN
        EXECUTE 'ALTER TABLE public.'||_t||' ADD COLUMN price NUMERIC(12,2)';
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=_t AND column_name='first_name') THEN
        EXECUTE 'ALTER TABLE public.'||_t||' ADD COLUMN first_name TEXT';
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=_t AND column_name='last_name') THEN
        EXECUTE 'ALTER TABLE public.'||_t||' ADD COLUMN last_name TEXT';
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=_t AND column_name='phone') THEN
        EXECUTE 'ALTER TABLE public.'||_t||' ADD COLUMN phone TEXT';
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=_t AND column_name='email') THEN
        EXECUTE 'ALTER TABLE public.'||_t||' ADD COLUMN email TEXT';
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='khamsachekin_time_idx') THEN
        EXECUTE 'CREATE INDEX khamsachekin_time_idx ON public.'||_t||'(rooms, check_in, check_out)';
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=_t AND column_name='check_in_at') THEN
        EXECUTE 'ALTER TABLE public.'||_t||' ADD COLUMN check_in_at TIMESTAMPTZ';
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=_t AND column_name='check_out_at') THEN
        EXECUTE 'ALTER TABLE public.'||_t||' ADD COLUMN check_out_at TIMESTAMPTZ';
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='khamsachekin_time_at_idx') THEN
        EXECUTE 'CREATE INDEX khamsachekin_time_at_idx ON public.'||_t||'(rooms, check_in_at, check_out_at)';
      END IF;
    END $$;`);
}

// YANGI: room_types jadvali (Render’da ham mavjud bo‘lishi uchun)
async function ensureRoomTypes() {
  await pgPool.query(`
    CREATE TABLE IF NOT EXISTS public.room_types (
      room_type TEXT PRIMARY KEY,
      capacity  INT  NOT NULL,
      pre_buffer_minutes  INT NOT NULL DEFAULT 0,
      post_buffer_minutes INT NOT NULL DEFAULT 0,
      updated_at TIMESTAMPTZ DEFAULT now()
    );
  `);

  // FAMILY
  await pgPool.query(
    `INSERT INTO public.room_types (room_type, capacity, pre_buffer_minutes, post_buffer_minutes)
     VALUES ($1,$2,$3,$4)
     ON CONFLICT (room_type) DO UPDATE
       SET capacity = EXCLUDED.capacity,
           pre_buffer_minutes = EXCLUDED.pre_buffer_minutes,
           post_buffer_minutes = EXCLUDED.post_buffer_minutes,
           updated_at = now();`,
    ["FAMILY", FAMILY_CAPACITY, FAMILY_PRE_BUFFER_MIN, FAMILY_POST_BUFFER_MIN]
  );

  // STANDARD (buffer 0/0 default)
  await pgPool.query(
    `INSERT INTO public.room_types (room_type, capacity)
     VALUES ($1,$2)
     ON CONFLICT (room_type) DO UPDATE
       SET capacity = EXCLUDED.capacity,
           updated_at = now();`,
    ["STANDARD", STANDARD_CAPACITY]
  );
}

ensureSchema()
  .then(ensureRoomTypes)
  .catch((e) => console.error("schema error:", e));


/* ===== Tarif helpers ===== */
async function getRoomTypeCfg(roomType) {
  const { rows } = await pgPool.query(
    `SELECT capacity, pre_buffer_minutes, post_buffer_minutes FROM public.room_types WHERE room_type=$1`,
    [roomType]
  );
  if (!rows[0]) {
    // Fallback: agar jadval bo‘lmasa ham default qaytaramiz
    if (roomType === "FAMILY") {
      return {
        capacity: FAMILY_CAPACITY,
        pre_buffer_minutes: FAMILY_PRE_BUFFER_MIN,
        post_buffer_minutes: FAMILY_POST_BUFFER_MIN,
      };
    }
    return {
      capacity: STANDARD_CAPACITY,
      pre_buffer_minutes: 0,
      post_buffer_minutes: 0,
    };
  }
  return rows[0];
}
async function getNeighbors(roomType, startISO) {
  const qPrev = pgPool.query(
    `SELECT MAX(COALESCE(check_out_at, check_out::timestamp)) AS p_end
     FROM public.khamsachekin
     WHERE rooms=$1 AND COALESCE(check_out_at, check_out::timestamp) <= $2::timestamptz`,
    [roomType, startISO]
  );
  const qNext = pgPool.query(
    `SELECT MIN(COALESCE(check_in_at, check_in::timestamp)) AS n_start
     FROM public.khamsachekin
     WHERE rooms=$1 AND COALESCE(check_in_at, check_in::timestamp) >= $2::timestamptz`,
    [roomType, startISO]
  );
  const [r1, r2] = await Promise.all([qPrev, qNext]);
  return {
    p_end: r1.rows[0]?.p_end || null,
    n_start: r2.rows[0]?.n_start || null,
  };
}
async function getPeakConcurrency(roomType, fromTs, toTs) {
  const { rows } = await pgPool.query(
    `SELECT
        GREATEST(COALESCE(check_in_at,  check_in::timestamp), $2::timestamptz)  AS st,
        LEAST   (COALESCE(check_out_at, check_out::timestamp), $3::timestamptz) AS en
     FROM public.khamsachekin
     WHERE rooms=$1
       AND COALESCE(check_in_at,  check_in::timestamp)  < $3::timestamptz
       AND COALESCE(check_out_at, check_out::timestamp) > $2::timestamptz`,
    [roomType, fromTs, toTs]
  );
  const events = [];
  for (const r of rows) {
    const st = new Date(r.st);
    const en = new Date(r.en);
    if (st < en) {
      events.push({ t: st, d: +1 });
      events.push({ t: en, d: -1 });
    }
  }
  events.sort((a, b) => a.t - b.t || a.d - b.d);
  let cur = 0,
    peak = 0;
  for (const e of events) {
    cur += e.d;
    if (cur > peak) peak = cur;
  }
  return peak;
}

/* =======================
 *  BNOVO ROUTES
 * ======================= */
app.get("/api/bnovo/availability", async (req, res) => {
  try {
    const { checkIn, nights = 1, roomType = "STANDARD" } = req.query || {};
    if (!checkIn)
      return res.status(400).json({ ok: false, error: "checkIn required" });
    const ci = String(checkIn).slice(0, 10);
    const n = Math.max(1, Number(nights || 1));
    const checkInDate = new Date(ci + "T00:00:00Z");
    if (Number.isNaN(checkInDate.getTime()))
      return res.status(400).json({ ok: false, error: "checkIn invalid" });
    const checkOut = new Date(checkInDate.getTime() + n * 86400000)
      .toISOString()
      .slice(0, 10);
    const avail = await checkAvailability({
      checkIn: ci,
      checkOut,
      roomType: String(roomType).toUpperCase(),
    });
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
    res
      .status(500)
      .json({ ok: false, available: false, error: "availability failed" });
  }
});

/* =======================
 *  PAYMENTS (Octo)
 * ======================= */
app.post("/create-payment", async (req, res) => {
  try {
    if (!OCTO_SHOP_ID || !OCTO_SECRET)
      return res.status(500).json({ error: "Payment sozlanmagan (env yo'q)" });
    const {
      amount,
      description = "Mehmonxona to'lovi",
      email,
      booking = {},
    } = req.body || {};
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0 || !email)
      return res
        .status(400)
        .json({ error: "Ma'lumot yetarli emas yoki amount noto‘g‘ri" });

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
      roomType: booking.rooms,
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

    const returnUrlWithTid = `${BASE_URL}/octo-return?stid=${encodeURIComponent(
      shopTransactionId
    )}`;

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
      return_url: returnUrlWithTid,
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
    if (octoRes.ok && data?.error === 0 && data?.data?.octo_pay_url)
      return res.json({ paymentUrl: data.data.octo_pay_url });

    console.error("Octo error:", { status: octoRes.status, data });
    const msg =
      (data && (data.errMessage || data.message)) ||
      `Octo error (status ${octoRes.status})`;
    return res.status(400).json({ error: msg });
  } catch (err) {
    console.error("❌ create-payment:", err);
    res.status(500).json({ error: "Server xatosi" });
  }
});

// Octo qaytargan redirect — endi callback’dan kelgan natijaga qarab yuboramiz
app.get("/octo-return", (req, res) => {
  try {
    const stid =
      req.query.stid ||
      req.query.shop_transaction_id ||
      req.query.merchant_trans_id ||
      req.query.merchantTransId;

    if (stid) {
      const result = takePaymentResult(stid);
      if (result && result.success) {
        return res.redirect(302, `${FRONTEND_URL}/success`);
      }
      // Agar result bor-u, success bo'lmasa YOKI result yo'q bo'lsa (no info) → cancel
      return res.redirect(302, `${FRONTEND_URL}/cancelpayment`);
    }

    // stid bo'lmasa ham xavfsiz tomoni — cancelpayment
    return res.redirect(302, `${FRONTEND_URL}/cancelpayment`);
  } catch (e) {
    console.error("octo-return error:", e);
    return res.redirect(302, `${FRONTEND_URL}/cancelpayment`);
  }
});

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
        [
          "ok",
          "success",
          "succeeded",
          "paid",
          "captured",
          "approved",
          "done",
        ].includes(s)
      ) ||
      body?.paid === true ||
      body?.error === 0 ||
      String(body?.state || "").toUpperCase() === "CAPTURED";

    const stid =
      body?.shop_transaction_id ||
      body?.data?.shop_transaction_id ||
      body?.merchant_trans_id ||
      body?.merchantTransId;

    if (stid) {
      savePaymentResult(stid, isSuccess);
    }

    let verifiedPayload = null;
    try {
      let custom = body?.custom_data;
      if (typeof custom === "string") {
        try {
          custom = JSON.parse(custom);
        } catch { }
      }
      const json = custom?.booking_json,
        sig = custom?.booking_sig;
      if (json && sig && verifyData(json, sig))
        verifiedPayload = JSON.parse(json);
      else if (json && !sig) {
        try {
          verifiedPayload = JSON.parse(json);
        } catch { }
      }
    } catch (e) {
      console.warn("custom_data parse error:", e);
    }

    if (!verifiedPayload && stid) {
      verifiedPayload = popPending(stid);
    }

    if (isSuccess && verifiedPayload) {
      const pushRes = await createBookingInBnovo(verifiedPayload);

      // ==== Frontend uslubidagi HTML xabar (aniqlanmagan o‘zgaruvchilarsiz) ====
      const esc = (v) =>
        String(v ?? "")
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;");

      const pad = (n) => String(n).padStart(2, "0");
      const formatDate = (isoLike) => {
        if (!isoLike) return "-";
        const d = new Date(isoLike);
        if (isNaN(d)) return esc(isoLike);
        return `${pad(d.getDate())}.${pad(
          d.getMonth() + 1
        )}.${d.getFullYear()}`;
      };
      const formatDateTime = (isoLike) => {
        if (!isoLike) return "-";
        const d = new Date(isoLike);
        if (isNaN(d)) return "-";
        return `${pad(d.getDate())}.${pad(
          d.getMonth() + 1
        )}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
      };

      const roomKeyMap = {
        STANDARD: "Standard Room",
        FAMILY: "Family Room",
        SMART: "Smart Capsule",
        CAPSULE: "Capsule",
        DELUXE: "Deluxe",
      };

      const {
        firstName,
        lastName,
        phone,
        email,
        roomType,
        checkIn,
        checkOut,
        guests,
        priceEur,
        duration,
      } = verifiedPayload;

      const createdAt = new Date().toISOString();

      const humanHtml = [
        "📢 <b>Yangi bron qabul qilindi</b>",
        "",
        `👤 <b>Ism:</b> ${esc(firstName || "-")} ${esc(lastName || "")}`,
        `📧 <b>Email:</b> ${esc(email || "-")}`,
        `📞 <b>Telefon:</b> ${esc(phone || "-")}`,
        "",
        `🗓️ <b>Bron vaqti:</b> ${esc(formatDateTime(createdAt))}`,
        `📅 <b>Kirish sanasi:</b> ${esc(formatDate(checkIn))}`,
        `📅 <b>Chiqish sanasi:</b> ${esc(formatDate(checkOut))}`,
        `🛏️ <b>Xona:</b> ${esc(roomKeyMap[roomType] || roomType || "-")}`,
        `📆 <b>Davomiylik:</b> ${esc(duration || "-")}`,
        `💶 <b>Narx:</b> ${priceEur != null ? esc(`${priceEur}€`) : "-"}`,
        "",
        `❕ <b>@freemustafa Send an Invoice to the guest!</b>`,
        `✅ <b>Mijoz kelganda, mavjud bo‘lgan ixtiyoriy bo‘lgan bo‘sh xonaga joylashtiriladi</b>`,
        `🌐 <b>Sayt:</b> khamsahotel.uz`,
      ].join("\n");

      const humanText = `
To'lov muvaffaqiyatli.
Bron:
- Ism: ${firstName || "-"} ${lastName || ""}
- Tel: ${phone || "-"}
- Email: ${email || "-"}
- Xona: ${roomType || "-"}
- Check-in: ${checkIn || "-"}
- Check-out: ${checkOut || "-"}
- Mehmonlar: ${guests || 1}
- Narx (EUR): ${priceEur != null ? priceEur : "-"}
`.trim();

      // Lokal HTML yuboruvchi helper (notifyTelegram ni o'zgartirmadik)
      async function notifyTelegramHtml(html) {
        if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;
        const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
        const payload = {
          chat_id: TELEGRAM_CHAT_ID,
          text: html,
          parse_mode: "HTML",
          disable_web_page_preview: true,
        };
        try {
          const r = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          const data = await r.json().catch(() => ({}));
          if (!data?.ok) console.error("Telegram send error:", data);
        } catch (e) {
          console.error("Telegram error:", e);
        }
      }

      try {
        await sendEmail(ADMIN_EMAIL, "Khamsa: Payment Success", humanText);
      } catch { }

      try {
        await notifyTelegramHtml(humanHtml);
      } catch { }

      return res.json({ ok: true });
    }

    console.warn("⚠️ Payment not success yoki payload topilmadi");
    return res.json({ ok: true });
  } catch (e) {
    console.error("❌ /payment-callback:", e);
    res.status(200).json({ ok: true });
  }
});

/* =======================
 *  CHECKINS (DB) — frontend
 * ======================= */
app.get("/api/checkins", async (req, res) => {
  const { roomType = "", limit = "300" } = req.query;
  try {
    const params = [];
    const where = [];
    if (roomType) {
      params.push(roomType);
      where.push(`rooms = $${params.length}`);
    }
    params.push(+limit || 300);
    const sql = `
      SELECT id, rooms,
             check_in, check_out,
             check_in_at, check_out_at,
             COALESCE(check_in_at,  (check_in::timestamp))  AS start_at,
             COALESCE(check_out_at, (check_out::timestamp)) AS end_at,
             duration, price,
             first_name, last_name, phone, email, check_in_time, created_at
      FROM public.khamsachekin
      ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
      ORDER BY COALESCE(check_in_at, check_in::timestamp) ASC
      LIMIT $${params.length};`;
    const r = await pgPool.query(sql, params);
    res.json({ ok: true, items: r.rows });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.get("/api/checkins/day", async (req, res) => {
  const { start = "", date = "", roomType = "" } = req.query;
  const d = start || date;
  if (!roomType || !isISO(d))
    return res
      .status(400)
      .json({ ok: false, error: "roomType,start YYYY-MM-DD" });
  try {
    const r = await pgPool.query(
      `
      WITH s AS (SELECT $1::date AS d)
      SELECT k.id, k.rooms,
             k.check_in AS start_date,
             COALESCE(k.check_out,(k.check_in + (COALESCE(k.duration,0) * INTERVAL '1 day')))::date AS end_date
      FROM public.khamsachekin k, s
      WHERE k.rooms=$2 AND k.check_in<=s.d
        AND COALESCE(k.check_out,(k.check_in + (COALESCE(k.duration,0) * INTERVAL '1 day')))::date > s.d
      ORDER BY k.check_in DESC
      LIMIT 1;`,
      [d, roomType]
    );
    res.json({ ok: true, free: !r.rows[0], block: r.rows[0] || null });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.get("/api/checkins/range/check", async (req, res) => {
  const {
    roomType = "",
    start = "",
    end = "",
    startAt = "",
    endAt = "",
  } = req.query;
  const A = toTz(startAt || start);
  const B = toTz(endAt || end);
  if (!roomType || !A || !B)
    return res
      .status(400)
      .json({ ok: false, error: "roomType,startAt,endAt ISO required" });
  try {
    const r = await pgPool.query(
      `
      SELECT id, rooms,
             COALESCE(check_in_at,  check_in::timestamp)  AS start_date,
             COALESCE(check_out_at, check_out::timestamp) AS end_date
      FROM public.khamsachekin
      WHERE rooms = $1
        AND COALESCE(check_in_at,  check_in::timestamp)  < $3::timestamptz
        AND COALESCE(check_out_at, check_out::timestamp) > $2::timestamptz
      ORDER BY start_date ASC
      LIMIT 1;`,
      [roomType, A, B]
    );
    res.json({ ok: true, conflict: !!r.rows[0], block: r.rows[0] || null });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.post("/api/checkins/range", async (req, res) => {
  const { roomType, start, end, startAt, endAt, note } = req.body || {};
  const A = toTz(startAt || start);
  const B = toTz(endAt || end);
  if (!roomType || !A || !B)
    return res
      .status(400)
      .json({ ok: false, error: "roomType,startAt,endAt ISO required" });
  try {
    const q = await pgPool.query(
      `
      SELECT 1 FROM public.khamsachekin
      WHERE rooms=$1
        AND COALESCE(check_in_at,  check_in::timestamp)  < $3::timestamptz
        AND COALESCE(check_out_at, check_out::timestamp) > $2::timestamptz
      LIMIT 1;`,
      [roomType, A, B]
    );
    if (q.rowCount) return res.status(409).json({ ok: false, error: "BUSY" });

    const dateOnlyStart = A.slice(0, 10);
    const dateOnlyEnd = B.slice(0, 10);

    const r = await pgPool.query(
      `
      INSERT INTO public.khamsachekin
        (rooms, check_in, check_out, check_in_at, check_out_at, duration, check_in_time)
      VALUES
        ($1,   $2::date, $3::date,  $4::timestamptz, $5::timestamptz,
         GREATEST(1, ($3::date - $2::date)), $6)
      RETURNING id, rooms, check_in, check_out, check_in_at, check_out_at;`,
      [roomType, dateOnlyStart, dateOnlyEnd, A, B, note || null]
    );
    res.status(201).json({ ok: true, item: r.rows[0] });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.get("/api/checkins/next-block", async (req, res) => {
  const { roomType = "", start = "", startAt = "" } = req.query;
  const A = toTz(startAt || start);
  if (!roomType || !A)
    return res
      .status(400)
      .json({ ok: false, error: "roomType,startAt ISO required" });
  try {
    const r = await pgPool.query(
      `
      SELECT id, rooms,
            COALESCE(check_in_at,  check_in::timestamp)  AS start_date,
            COALESCE(check_out_at, check_out::timestamp) AS end_date
      FROM public.khamsachekin
      WHERE rooms = $1
        AND COALESCE(check_in_at,  check_in::timestamp) <= $2::timestamptz
        AND COALESCE(check_out_at, check_out::timestamp) >  $2::timestamptz
      ORDER BY start_date DESC
      LIMIT 1;`,
      [roomType, A]
    );
    res.json({ ok: true, block: r.rows[0] || null });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

/* ====== Allowed tariffs (3h/10h/24h) ====== */
app.get("/api/availability/allowed-tariffs", async (req, res) => {
  try {
    const roomType = String(req.query.roomType || "STANDARD").toUpperCase();
    const S = toTz(req.query.start);
    if (!S)
      return res.status(400).json({ ok: false, error: "start ISO required" });

    let cfg;
    try {
      cfg = await getRoomTypeCfg(roomType);
    } catch {
      cfg = {
        capacity: STANDARD_CAPACITY,
        pre_buffer_minutes: 0,
        post_buffer_minutes: 0,
      };
    }
    const pre = cfg.pre_buffer_minutes || 0;
    const post = cfg.post_buffer_minutes || 0;

    const { p_end, n_start } = await getNeighbors(roomType, S);

    if (p_end) {
      const minStart = new Date(new Date(p_end).getTime() + pre * 60 * 1000);
      if (new Date(S) < minStart) {
        return res.json({
          ok: true,
          allowed: [],
          reason: "start_too_early_hits_previous",
        });
      }
    }

    const tariffs = [
      { code: "3h", hours: 3 },
      { code: "10h", hours: 10 },
      { code: "24h", hours: 24 },
    ];

    const peakExisting = await getPeakConcurrency(
      roomType,
      new Date(S),
      new Date(new Date(S).getTime() + 24 * 60 * 60 * 1000)
    );

    const allowed = [];
    for (const t of tariffs) {
      const end = new Date(new Date(S).getTime() + t.hours * 60 * 60 * 1000);
      const endWithPost = new Date(end.getTime() + post * 60 * 1000);

      if (n_start && endWithPost > new Date(n_start)) continue;
      if (peakExisting + 1 <= cfg.capacity) allowed.push(t.code);
    }

    res.json({
      ok: true,
      roomType,
      start: S,
      allowed,
    });
  } catch (e) {
    console.error("ALLOWED-TARIFFS ERR:", e);
    res.status(500).json({ ok: false, error: e.message });
  }
});


/* === DELETE by id === */
app.delete("/api/checkins/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0)
    return res.status(400).json({ ok: false, error: "Invalid id" });
  try {
    const r = await pgPool.query(
      "DELETE FROM public.khamsachekin WHERE id = $1 RETURNING id;",
      [id]
    );
    if (r.rowCount === 0)
      return res.status(404).json({ ok: false, error: "Not found" });
    res.json({ ok: true, id: r.rows[0].id });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

/* ====== 404 & error handlers ====== */
app.use((req, res) =>
  res.status(404).json({ error: "Not Found", path: req.path })
);
app.use((err, req, res, _next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal Server Error" });
});

/* ====== Start ====== */
app.listen(PORT, () => {
  console.log(`✅ Server juda yaxshi ishlayapti: ${BASE_URL} (port: ${PORT})`);
  console.log(
    `[BNOVO] mode=${process.env.BNOVO_AUTH_MODE} auth_url=${process.env.BNOVO_AUTH_URL
    } id_set=${!!process.env.BNOVO_ID} pass_set=${!!process.env.BNOVO_PASSWORD}`
  );
});
