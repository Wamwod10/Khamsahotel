// backend/index.js — Khamsa backend (Express + Bnovo + Octo + Postgres)
// REAL Octo (testsiz), kengaytirilgan CORS, 120s timeout + retry, Telegram + Email, debug route’lar.

import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import dotenv from "dotenv";
import nodemailer from "nodemailer";
import crypto from "crypto";
import { Pool } from "pg";
import { checkAvailability, createBookingInBnovo } from "./bnovo.js";

dotenv.config();

/* ====== App & Config ====== */
const app = express();
const PORT = Number(process.env.PORT || 5004);
const BASE_URL = (process.env.BASE_URL || `http://localhost:${PORT}`).replace(
  /\/+$/,
  ""
);
const FRONTEND_URL = (
  process.env.FRONTEND_URL || "https://khamsahotel.uz"
).replace(/\/+$/, "");
const EUR_TO_UZS = Number(process.env.EUR_TO_UZS || 14000);
const OCTO_TEST =
  String(process.env.OCTO_TEST ?? "false").toLowerCase() === "true"; // default false (REAL)

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
// www va non-www, prod va dev domenlarini qamrab olamiz
const ORIGIN_OK = (o) => {
  if (!o) return true; // server-to-server yoki curl uchun
  const allow = [
    FRONTEND_URL, // env dagi
    "https://khamsahotel.uz",
    "https://www.khamsahotel.uz",
    "https://khamsa-backend.onrender.com",
    "http://localhost:5173",
    "http://localhost:3000",
  ];
  return allow.some(
    (x) =>
      x &&
      x.replace(/\/+$/, "").toLowerCase() ===
        o.replace(/\/+$/, "").toLowerCase()
  );
};

app.use(
  cors({
    origin(origin, cb) {
      if (ORIGIN_OK(origin)) return cb(null, true);
      console.warn("CORS block:", origin);
      return cb(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Accept",
      "Authorization",
      "Idempotency-Key",
      "X-Requested-With",
    ],
    credentials: false,
  })
);

// Yupqa preflight + headerlar
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (ORIGIN_OK(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin || "*");
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Accept, Authorization, Idempotency-Key, X-Requested-With"
  );
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

/* ====== Parsers ====== */
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));
app.use(express.text({ type: ["text/*"], limit: "512kb" }));

/* ====== Health & Debug ====== */
app.get("/", (_req, res) =>
  res.json({
    ok: true,
    name: "Khamsa backend",
    time: new Date().toISOString(),
    port: PORT,
  })
);
app.get("/healthz", (_req, res) => res.json({ ok: true }));
app.get("/debug/ping", (_req, res) =>
  res.json({ ok: true, now: Date.now(), base: BASE_URL })
);
app.get("/debug/egress-ip", async (_req, res) => {
  try {
    const r = await fetch("https://api.ipify.org?format=json");
    const j = await r.json();
    res.json({ ok: true, ip: j.ip });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});
app.get("/debug/octo-head", async (_req, res) => {
  try {
    const r = await fetch("https://secure.octo.uz/", { method: "GET" });
    res.json({ ok: r.ok, status: r.status });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

/* ====== Email (Gmail) ====== */
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: { user: EMAIL_USER, pass: EMAIL_PASS }, // App Password talab qilinadi
  pool: true,
  maxConnections: 3,
  maxMessages: 100,
  connectionTimeout: 20_000,
  greetingTimeout: 15_000,
  socketTimeout: 30_000,
  tls: { servername: "smtp.gmail.com", rejectUnauthorized: true },
  keepAlive: true,
});

let _smtpReady = false;
async function ensureEmailTransport() {
  if (_smtpReady) return;
  try {
    await transporter.verify();
    _smtpReady = true;
    console.log("✅ SMTP ready");
  } catch (e) {
    console.warn("⚠️ SMTP verify failed (continue):", e?.message || e);
  }
}
function cleanSubject(s) {
  const sub = String(s ?? "")
    .trim()
    .replace(/\r?\n/g, " ")
    .slice(0, 200);
  return sub || "Khamsa notification";
}
async function sendEmail({ to, subject, text, html, replyTo, fromName }) {
  if (!EMAIL_USER || !EMAIL_PASS)
    throw new Error("EMAIL_USER/EMAIL_PASS is not configured");
  if (!to) throw new Error("Missing 'to'");
  if (!subject) throw new Error("Missing 'subject'");
  if (!text && !html) throw new Error("Missing 'text' or 'html'");
  await ensureEmailTransport();
  const fromHeader = fromName
    ? `"${fromName.replace(/"/g, "'")}" <${EMAIL_USER}>`
    : EMAIL_USER;
  const info = await transporter.sendMail({
    from: fromHeader,
    to,
    subject: cleanSubject(subject),
    text: text || undefined,
    html: html || undefined,
    replyTo: replyTo || EMAIL_USER,
  });
  return info;
}

// In-memory idempotency lock (2 kun)
const EMAIL_LOCKS = new Map(); // key -> expTs
function putEmailLock(key, ttlMs = 1000 * 60 * 60 * 24 * 2) {
  EMAIL_LOCKS.set(key, Date.now() + ttlMs);
}
function hasEmailLock(key) {
  const exp = EMAIL_LOCKS.get(key);
  if (!exp) return false;
  if (Date.now() > exp) {
    EMAIL_LOCKS.delete(key);
    return false;
  }
  return true;
}
function djb2(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = (h * 33) ^ str.charCodeAt(i);
  return (h >>> 0).toString(36);
}
function stableStringify(obj) {
  if (obj === null || typeof obj !== "object") return JSON.stringify(obj);
  if (Array.isArray(obj)) return `[${obj.map(stableStringify).join(",")}]`;
  const keys = Object.keys(obj).sort();
  return `{${keys
    .map((k) => JSON.stringify(k) + ":" + stableStringify(obj[k]))
    .join(",")}}`;
}

/** Frontend chaqiradi: mijozga email jo‘natish */
app.post("/send-email", async (req, res) => {
  try {
    const {
      to,
      subject,
      text = "",
      html = "",
      idempotencyKey,
      replyTo,
      fromName = "Khamsa Hotel",
    } = req.body || {};
    const headerKey = req.get("Idempotency-Key") || "";
    if (!to || !subject || (!text && !html)) {
      return res
        .status(400)
        .json({
          ok: false,
          error: "Fields 'to', 'subject' and 'text' or 'html' are required",
        });
    }
    const autoKey = djb2(
      stableStringify({ to, subject: cleanSubject(subject), text, html })
    );
    const key = String(idempotencyKey || headerKey || autoKey);
    if (hasEmailLock(key))
      return res.json({ ok: true, deduped: true, idempotencyKey: key });

    const info = await sendEmail({
      to,
      subject,
      text,
      html,
      replyTo,
      fromName,
    });
    putEmailLock(key);
    return res.json({
      ok: true,
      idempotencyKey: key,
      messageId: info?.messageId || null,
      accepted: info?.accepted || [],
      rejected: info?.rejected || [],
      response: info?.response || null,
    });
  } catch (e) {
    console.error("[/send-email] error:", e?.response || e?.message || e);
    return res.status(500).json({
      ok: false,
      error: e?.message || "send-email failed",
      hint: "Gmail App Password ishlatilayotganini va FROM=EMAIL_USER ekanini tekshiring.",
    });
  }
});

/* ====== Telegram ====== */
async function notifyTelegram(text) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;
  try {
    const r = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text,
          parse_mode: "HTML",
          disable_web_page_preview: true,
        }),
      }
    );
    const j = await r.json().catch(() => ({}));
    if (!r.ok || j?.ok === false) console.error("Telegram error:", j);
  } catch (e) {
    console.error("Telegram fetch error:", e?.message || e);
  }
}
app.post("/notify/telegram/test", async (_req, res) => {
  try {
    await notifyTelegram("🔔 Test: backend telegram ok");
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});
app.get("/notify/telegram/test", async (_req, res) => {
  try {
    await notifyTelegram("🔔 Test: backend telegram ok (GET)");
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});
app.post("/notify/telegram", async (req, res) => {
  try {
    const { text = "ℹ️ Empty text" } = req.body || {};
    await notifyTelegram(String(text));
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

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

/* =========================================================
 *  Postgres
 * ========================================================= */
const pgPool = new Pool({
  host: process.env.PGHOST || "",
  port: Number(process.env.PGPORT || 5432),
  database: process.env.PGDATABASE || "",
  user: process.env.PGUSER || "",
  password: process.env.PGPASSWORD || "",
  ssl:
    String(process.env.PGSSLMODE || "disable").toLowerCase() === "require"
      ? { rejectUnauthorized: false }
      : undefined,
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

async function ensureRoomTypes() {
  await pgPool.query(`
    CREATE TABLE IF NOT EXISTS public.room_types (
      room_type TEXT PRIMARY KEY,
      capacity  INT  NOT NULL,
      pre_buffer_minutes  INT NOT NULL DEFAULT 0,
      post_buffer_minutes INT NOT NULL DEFAULT 0,
      updated_at TIMESTAMPTZ DEFAULT now()
    );`);
  await pgPool.query(
    `INSERT INTO public.room_types (room_type, capacity, pre_buffer_minutes, post_buffer_minutes)
     VALUES ($1,$2,$3,$4)
     ON CONFLICT (room_type) DO UPDATE
       SET capacity = EXCLUDED.capacity,
           pre_buffer_minutes = EXCLUDED.pre_buffer_minutes,
           post_buffer_minutes = EXCLUDED.post_buffer_minutes,
           updated_at = now();`,
    [
      "FAMILY",
      Number(process.env.FAMILY_CAPACITY || process.env.FAMILY_STOCK || 1),
      Number(process.env.FAMILY_PRE_BUFFER_MIN || 0),
      Number(process.env.FAMILY_POST_BUFFER_MIN || 0),
    ]
  );
  await pgPool.query(
    `INSERT INTO public.room_types (room_type, capacity)
     VALUES ($1,$2)
     ON CONFLICT (room_type) DO UPDATE
       SET capacity = EXCLUDED.capacity,
           updated_at = now();`,
    [
      "STANDARD",
      Number(process.env.STANDARD_CAPACITY || process.env.STANDARD_STOCK || 23),
    ]
  );
}
ensureSchema()
  .then(ensureRoomTypes)
  .catch((e) => console.error("ensureSchema/room_types error:", e));

/* ===== Tarif helpers ===== */
async function getRoomTypeCfg(roomType) {
  const { rows } = await pgPool.query(
    `SELECT capacity, pre_buffer_minutes, post_buffer_minutes FROM public.room_types WHERE room_type=$1`,
    [roomType]
  );
  if (!rows[0]) {
    if (roomType === "FAMILY") {
      return {
        capacity: Number(
          process.env.FAMILY_CAPACITY || process.env.FAMILY_STOCK || 1
        ),
        pre_buffer_minutes: Number(process.env.FAMILY_PRE_BUFFER_MIN || 0),
        post_buffer_minutes: Number(process.env.FAMILY_POST_BUFFER_MIN || 0),
      };
    }
    return {
      capacity: Number(
        process.env.STANDARD_CAPACITY || process.env.STANDARD_STOCK || 23
      ),
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
 *  PAYMENTS (Octo, REAL)
 * ======================= */
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

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
    if (!Number.isFinite(amt) || amt <= 0 || !email) {
      return res
        .status(400)
        .json({ error: "Ma'lumot yetarli emas yoki amount noto‘g‘ri" });
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

    const payload = {
      octo_shop_id: Number(OCTO_SHOP_ID),
      octo_secret: OCTO_SECRET,
      shop_transaction_id: shopTransactionId,
      auto_capture: true,
      test: OCTO_TEST, // REAL uchun .env da false qoldiring
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

    // Retry + 120s timeout (REAL)
    let lastErr = null;
    for (let i = 0; i < 3; i++) {
      try {
        const controller = new AbortController();
        const t = setTimeout(() => controller.abort(), 120000); // 120s
        const octoRes = await fetch("https://secure.octo.uz/prepare_payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
        clearTimeout(t);

        const data = await safeParseResponse(octoRes);
        if (octoRes.ok && data?.error === 0 && data?.data?.octo_pay_url) {
          return res.json({ paymentUrl: data.data.octo_pay_url });
        }
        console.error("Octo error:", { status: octoRes.status, data });
        lastErr = new Error(
          (data && (data.errMessage || data.message)) ||
            `Octo status ${octoRes.status}`
        );
      } catch (e) {
        lastErr = e;
        if (String(e?.name).includes("AbortError")) {
          console.error("Octo fetch aborted (timeout)");
        } else {
          console.error("Octo fetch error:", e?.message || e);
        }
      }
      await sleep(500 * Math.pow(2, i)); // 500ms, 1000ms, 2000ms
    }

    if (String(lastErr?.name).includes("AbortError")) {
      return res
        .status(504)
        .json({ error: "Octo timeout — qayta urinib ko‘ring" });
    }
    return res.status(400).json({ error: lastErr?.message || "Octo error" });
  } catch (err) {
    console.error("❌ create-payment:", err);
    res.status(500).json({ error: "Server xatosi" });
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

    let verifiedPayload = null;
    try {
      let custom = body?.custom_data;
      if (typeof custom === "string") {
        try {
          custom = JSON.parse(custom);
        } catch {}
      }
      const json = custom?.booking_json,
        sig = custom?.booking_sig;
      if (json && sig && verifyData(json, sig))
        verifiedPayload = JSON.parse(json);
      else if (json && !sig) {
        try {
          verifiedPayload = JSON.parse(json);
        } catch {}
      }
    } catch (e) {
      console.warn("custom_data parse error:", e);
    }

    if (!verifiedPayload) {
      const stid = body?.shop_transaction_id || body?.data?.shop_transaction_id;
      if (stid) verifiedPayload = popPending(stid);
    }

    if (isSuccess && verifiedPayload) {
      const pushRes = await createBookingInBnovo(verifiedPayload);
      const human = `
<b>To'lov muvaffaqiyatli</b>
<b>Bron:</b>
- Ism: ${verifiedPayload.firstName} ${verifiedPayload.lastName || ""}
- Tel: ${verifiedPayload.phone || "-"}
- Email: ${verifiedPayload.email}
- Xona: ${verifiedPayload.roomType}
- Check-in: ${verifiedPayload.checkIn}
- Check-out: ${verifiedPayload.checkOut}
- Mehmonlar: ${verifiedPayload.guests || 1}
- Narx (EUR): ${verifiedPayload.priceEur}
Bnovo push: ${
        pushRes.pushed
          ? "✅ Pushed"
          : pushRes.ok
          ? "⚠️ Skipped (cheklov)"
          : "❌ Fail"
      }
${
  pushRes.ok
    ? pushRes.pushed
      ? ""
      : `Reason: ${pushRes.reason || ""}`
    : `Reason: ${JSON.stringify(
        pushRes.error || pushRes.status || pushRes.data || {},
        null,
        2
      )}`
}
      `.trim();

      try {
        await sendEmail({
          to: ADMIN_EMAIL,
          subject: "Khamsa: Payment Success",
          text: human,
        });
      } catch {}
      try {
        await notifyTelegram(human);
      } catch {}
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
  console.log(`✅ Server yaxshi ishlayapti: ${BASE_URL} (port: ${PORT})`);
  console.log(
    `[BNOVO] mode=${process.env.BNOVO_AUTH_MODE} auth_url=${
      process.env.BNOVO_AUTH_URL
    } id_set=${!!process.env.BNOVO_ID} pass_set=${!!process.env.BNOVO_PASSWORD}`
  );
});
