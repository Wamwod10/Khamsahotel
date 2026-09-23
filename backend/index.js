// backend/index.js — Khamsa backend (Express + Bnovo + Octo + Postgres)
import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import dotenv from "dotenv";
import nodemailer from "nodemailer";
import crypto from "crypto";
import { Pool } from "pg";
import { checkAvailability } from "./bnovo.js";
import { countOverlappingRoomItems, validateRoomCapacity } from "./bookingCapacity.js";

dotenv.config();
const app = express();
const PORT = Number(process.env.PORT || 5004);
const BASE_URL = (process.env.BASE_URL || `http://localhost:${PORT}`).replace(
  /\/+$/,
  "",
);
const FRONTEND_URL = (
  process.env.FRONTEND_URL || "https://khamsahotel.uz"
).replace(/\/+$/, "");
const EUR_TO_UZS = Number(process.env.EUR_TO_UZS || 14800);

// Capacity/buffer defaults (env bilan boshqariladi)
const FAMILY_CAPACITY = Number(
  process.env.FAMILY_CAPACITY || process.env.FAMILY_STOCK || 1,
);
const STANDARD_CAPACITY = Number(
  process.env.STANDARD_CAPACITY || process.env.STANDARD_STOCK || 23,
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

app.disable("x-powered-by");
const IS_PRODUCTION = String(process.env.NODE_ENV || "development").toLowerCase() === "production";

app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  if (IS_PRODUCTION) res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  if (req.path.startsWith("/api/admin") || req.path.startsWith("/api/checkins")) res.setHeader("Cache-Control", "no-store, max-age=0");
  next();
});

function createRateLimiter({ windowMs, max, name }) {
  const store = new Map();
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [key, value] of store) if (value.resetAt <= now) store.delete(key);
  }, Math.max(60000, Math.min(windowMs, 300000)));
  timer.unref?.();
  return (req, res, next) => {
    const now = Date.now();
    const key = `${name}:${req.ip || req.socket?.remoteAddress || "unknown"}`;
    const hit = store.get(key);
    if (!hit || hit.resetAt <= now) { store.set(key, { count: 1, resetAt: now + windowMs }); return next(); }
    hit.count += 1;
    if (hit.count > max) {
      res.setHeader("Retry-After", String(Math.max(1, Math.ceil((hit.resetAt - now) / 1000))));
      return res.status(429).json({ ok: false, error: "Too many requests" });
    }
    next();
  };
}

const adminLoginLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 8, name: "admin-login" });
const paymentLimiter = createRateLimiter({ windowMs: 10 * 60 * 1000, max: 25, name: "create-payment" });
const availabilityLimiter = createRateLimiter({ windowMs: 60 * 1000, max: 120, name: "availability" });
const callbackLimiter = createRateLimiter({ windowMs: 60 * 1000, max: 180, name: "payment-callback" });
const contactLimiter = createRateLimiter({ windowMs: 10 * 60 * 1000, max: 5, name: "contact-message" });

function safeStringEqual(a, b) {
  const left = crypto.createHash("sha256").update(String(a ?? "")).digest();
  const right = crypto.createHash("sha256").update(String(b ?? "")).digest();
  return crypto.timingSafeEqual(left, right);
}

const ADMIN_USERNAME_VALUE = String(process.env.ADMIN_USERNAME || "").trim();
const ADMIN_PASSWORD_VALUE = String(process.env.ADMIN_PASSWORD || "");
const ADMIN_TOKEN_SECRET_VALUE = String(process.env.ADMIN_TOKEN_SECRET || "").trim();
const ADMIN_TOKEN_TTL_MS = Math.max(15 * 60 * 1000, Number(process.env.ADMIN_TOKEN_TTL_MS || 8 * 60 * 60 * 1000));
const OCTO_CALLBACK_KEY_VALUE = String(process.env.OCTO_CALLBACK_KEY || "").trim();

function createAdminToken(username) {
  if (!ADMIN_TOKEN_SECRET_VALUE) throw new Error("ADMIN_TOKEN_SECRET is not configured");
  const payload = { sub: username, iat: Date.now(), exp: Date.now() + ADMIN_TOKEN_TTL_MS, nonce: crypto.randomBytes(12).toString("hex") };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", ADMIN_TOKEN_SECRET_VALUE).update(encoded).digest("base64url");
  return `${encoded}.${signature}`;
}

function verifyAdminToken(token) {
  try {
    if (!ADMIN_TOKEN_SECRET_VALUE) return null;
    const [encoded, signature] = String(token || "").split(".");
    if (!encoded || !signature) return null;
    const expected = crypto.createHmac("sha256", ADMIN_TOKEN_SECRET_VALUE).update(encoded).digest("base64url");
    if (!safeStringEqual(signature, expected)) return null;
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
    if (!payload?.sub || !payload?.exp || Date.now() >= Number(payload.exp)) return null;
    if (!safeStringEqual(payload.sub, ADMIN_USERNAME_VALUE)) return null;
    return payload;
  } catch { return null; }
}

function requireAdmin(req, res, next) {
  const auth = String(req.headers.authorization || "");
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  const payload = verifyAdminToken(token);
  if (!payload) return res.status(401).json({ ok: false, error: "Unauthorized" });
  req.admin = payload;
  next();
}

function requireOctoCallback(req, res, next) {
  // Optional defense-in-depth. Callback authenticity is always verified again
  // server-to-server with OCTO_SECRET before any payment status is changed.
  if (!OCTO_CALLBACK_KEY_VALUE) return next();
  const key = String(req.query?.key || "");
  if (!key) return next();
  if (!safeStringEqual(key, OCTO_CALLBACK_KEY_VALUE)) {
    return res.status(401).json({ ok: false });
  }
  next();
}

/* ====== CORS ====== */
function normalizeOrigin(value) {
  if (!value) return "";
  try {
    return new URL(value).origin;
  } catch {
    return String(value).trim().replace(/\/+$/, "");
  }
}

const ENV_ALLOWED_ORIGINS = String(
  process.env.CORS_ORIGINS || process.env.ALLOWED_ORIGINS || "",
)
  .split(",")
  .map(normalizeOrigin)
  .filter(Boolean);

const ALLOWED_ORIGINS = new Set(
  [
    FRONTEND_URL,
    "https://khamsahotel.uz",
    "https://www.khamsahotel.uz",
    ...(!IS_PRODUCTION ? ["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"] : []),
    ...ENV_ALLOWED_ORIGINS,
  ]
    .map(normalizeOrigin)
    .filter(Boolean),
);

function isAllowedOrigin(origin) {
  if (!origin) return true;
  return ALLOWED_ORIGINS.has(normalizeOrigin(origin));
}

const corsOptions = {
  origin(origin, cb) {
    if (isAllowedOrigin(origin)) return cb(null, true);
    console.warn("CORS block:", origin);
    return cb(null, false);
  },
  methods: ["GET", "POST", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Accept",
    "Authorization",
    "Idempotency-Key",
  ],
  credentials: false,
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));

// Yupqa preflight
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && isAllowedOrigin(origin))
    res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Accept, Authorization, Idempotency-Key",
  );
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

/* ====== Parsers ====== */
app.use(express.json({ limit: "256kb" }));
app.use(express.urlencoded({ extended: true, limit: "256kb" }));
app.use(express.text({ type: ["text/*"], limit: "128kb" }));

app.post("/api/admin/login", adminLoginLimiter, (req, res) => {
  if (!ADMIN_USERNAME_VALUE || !ADMIN_PASSWORD_VALUE || !ADMIN_TOKEN_SECRET_VALUE) {
    console.error("Admin auth env is not configured");
    return res.status(503).json({ ok: false, error: "Admin authentication is not configured" });
  }
  const username = String(req.body?.username || "");
  const password = String(req.body?.password || "");
  if (!safeStringEqual(username, ADMIN_USERNAME_VALUE) || !safeStringEqual(password, ADMIN_PASSWORD_VALUE)) {
    return res.status(401).json({ ok: false, error: "Invalid credentials" });
  }
  return res.json({ ok: true, token: createAdminToken(username), expiresIn: Math.floor(ADMIN_TOKEN_TTL_MS / 1000) });
});

app.get("/api/admin/session", requireAdmin, (req, res) => res.json({ ok: true, user: req.admin.sub }));

/* ====== Health ====== */
app.get("/", (_req, res) =>
  res.json({
    ok: true,
    name: "Khamsa backend",
    time: new Date().toISOString(),
    port: PORT,
  }),
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
    "⚠️ EMAIL_USER yoki EMAIL_PASS .env da yo'q. Email transport ishlamaydi.",
  );
}

async function sendEmail(to, subject, text, html = undefined) {
  if (!EMAIL_USER || !EMAIL_PASS)
    throw new Error("email transport is not configured (EMAIL_USER/PASS yo'q)");
  if (!to || !subject || !text) throw new Error("email: invalid payload");
  return transporter.sendMail({
    from: `"Khamsa Hotel" <${EMAIL_USER}>`,
    to,
    subject,
    text,
    ...(html ? { html } : {}),
  });
}

/* === Admin-only manual email endpoint (+idempotency) === */
const emailLocks = new Map(); // key -> timestamp
app.post("/send-email", requireAdmin, async (req, res) => {
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
    });
  }
});


function formatEuroSymbol(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return `${value ?? "-"}€`;
  return `${Number.isInteger(n) ? n : n.toFixed(2)}€`;
}

function buildGuestConfirmationEmail(bookings) {
  const rows = getBookingRows(bookings);
  const booking = rows[0] || {};
  const groups = getBookingGroups(rows);
  const totalPrice = rows.reduce((sum, row) => sum + (Number(row?.price) || 0), 0);
  const guestName = `${booking?.first_name || ""} ${booking?.last_name || ""}`.trim() || "Guest";
  const roomSummary = groups.map((g) => `${roomLabel(g.rooms)} × ${g.count}`).join(", ") || roomLabel(booking?.rooms);
  const durationText = groups.map((g) => g.durationLabel).filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(", ") || formatDurationLabel(booking?.duration || "-");
  const bookingDate = formatDisplayDate(booking?.created_at);
  const checkInDate = formatDisplayDate(booking?.check_in);
  const checkInTime = formatDisplayTime(booking?.check_in_at || booking?.check_in_time);

  const text = `Thank you for choosing to stay with us via Khamsahotel.uz!

Please be informed that we are a SLEEP LOUNGE located inside the airport within the transit area.
To stay with us, you must have a valid boarding pass departing from Tashkent Airport.

IMPORTANT SECURITY NOTICE
Please be alert to fraudulent messages sent in the name of Khamsa Sleep Lounge / Khamsahotel.uz.
We will never ask you for your credit card details through WhatsApp, Telegram, SMS, social media, or any third-party website.
We do not send links through WhatsApp, Telegram, SMS, or social media to confirm, cancel, verify, or pay for your booking.
Official invoice and payment information from our team is sent only by email.
If you receive a suspicious message asking you to follow a link, provide card details, confirm your reservation, or make an urgent payment, do not open the link and do not provide any payment information.

If you have any doubts about your booking status, please check via Khamsahotel.uz only, call us at +998 95 877 24 24 (tel/WhatsApp/Telegram), or email us at qonoqhotel@mail.ru.

YOUR BOOKING DETAILS

Guest: ${guestName}
Email: ${booking?.email || "-"}
Phone: ${booking?.phone || "-"}

Booking Date: ${bookingDate}
Check-in Date: ${checkInDate}
Check-in Time: ${checkInTime}
Room Type: ${roomSummary}
Duration: ${durationText}
Total Price: ${formatEuroSymbol(totalPrice)}

Thank you for your reservation. We look forward to welcoming you!
— Khamsa Sleep Lounge Team`;

  const html = `<div style="margin:0;background:#f7f8fa;padding:24px;font-family:Arial,Helvetica,sans-serif;color:#24364f;line-height:1.6"><div style="max-width:680px;margin:0 auto;background:#fff;border:1px solid #edf0f4;border-radius:18px;overflow:hidden;box-shadow:0 10px 30px rgba(32,53,86,.08)"><div style="height:6px;background:#ffa930"></div><div style="padding:30px"><h2 style="margin:0 0 14px;color:#ffa930;font-size:24px">Thank you for choosing Khamsa Sleep Lounge!</h2><p><strong>Please be informed that we are a SLEEP LOUNGE located inside the airport within the transit area.</strong><br>To stay with us, you must have a valid boarding pass departing from Tashkent Airport.</p><div style="margin:24px 0;padding:18px 20px;border:1px solid #ffd59a;background:#fff8ee;border-radius:14px"><div style="font-weight:700;color:#b95f00;margin-bottom:8px">IMPORTANT SECURITY NOTICE</div><p style="margin:0 0 9px">Please be alert to fraudulent messages sent in the name of Khamsa Sleep Lounge / Khamsahotel.uz.</p><p style="margin:0 0 9px"><strong>We will never ask for your credit card details through WhatsApp, Telegram, SMS, social media, or any third-party website.</strong></p><p style="margin:0 0 9px"><strong>We do not send links through WhatsApp, Telegram, SMS, or social media to confirm, cancel, verify, or pay for your booking.</strong></p><p style="margin:0 0 9px"><strong>Official invoice and payment information from our team is sent only by email.</strong></p><p style="margin:0">If a message asks you to open a link, enter card details, confirm your reservation, or make an urgent payment, do not open the link and do not provide payment information.</p></div><p>If you have any doubts, use <strong>Khamsahotel.uz</strong> or contact us directly at <strong>+998 95 877 24 24</strong> (tel/WhatsApp/Telegram) or <strong>qonoqhotel@mail.ru</strong>.</p><div style="border:1px solid #e8edf3;border-radius:14px;padding:20px"><div style="font-size:13px;letter-spacing:.08em;color:#75839a;font-weight:700;margin-bottom:14px">YOUR BOOKING DETAILS</div><table role="presentation" style="width:100%;border-collapse:collapse;font-size:15px"><tr><td style="padding:5px 0;color:#75839a;width:38%">Guest</td><td style="padding:5px 0;font-weight:700">${escapeHtml(guestName)}</td></tr><tr><td style="padding:5px 0;color:#75839a">Email</td><td>${escapeHtml(booking?.email || "-")}</td></tr><tr><td style="padding:5px 0;color:#75839a">Phone</td><td>${escapeHtml(booking?.phone || "-")}</td></tr><tr><td style="padding:5px 0;color:#75839a">Booking Date</td><td>${escapeHtml(bookingDate)}</td></tr><tr><td style="padding:5px 0;color:#75839a">Check-in Date</td><td>${escapeHtml(checkInDate)}</td></tr><tr><td style="padding:5px 0;color:#75839a">Check-in Time</td><td>${escapeHtml(checkInTime)}</td></tr><tr><td style="padding:5px 0;color:#75839a">Room Type</td><td>${escapeHtml(roomSummary)}</td></tr><tr><td style="padding:5px 0;color:#75839a">Duration</td><td>${escapeHtml(durationText)}</td></tr><tr><td style="padding:8px 0 0;color:#75839a">Total Price</td><td style="padding:8px 0 0;font-weight:700;color:#ffa930">${escapeHtml(formatEuroSymbol(totalPrice))}</td></tr></table></div><p style="margin:24px 0 0">Thank you for your reservation. We look forward to welcoming you!<br><strong>— Khamsa Sleep Lounge Team</strong></p></div></div></div>`;

  return { text, html, guestEmail: booking?.email || "" };
}

/* ====== Telegram ====== */
async function notifyTelegram(text) {
  console.log("📨 notifyTelegram FUNCTION ISHLADI");

  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.warn("⚠️ Telegram env yo'q");
    return;
  }

  try {
    const res = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text,
          parse_mode: "HTML",
        }),
      },
    );

    const data = await res.json();

    if (!data.ok) {
      console.error("❌ Telegram API error:", data);
    } else {
      console.log("✅ Telegram yuborildi");
    }
  } catch (e) {
    console.error("❌ Telegram fetch error:", e.message);
  }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function pad2(value) {
  return String(value).padStart(2, "0");
}

function formatDisplayDate(isoLike) {
  if (!isoLike) return "-";
  const d = new Date(isoLike);
  if (Number.isNaN(d.getTime())) return escapeHtml(isoLike);
  return `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.${d.getFullYear()}`;
}

function formatDisplayDateTime(isoLike) {
  if (!isoLike) return "-";
  const d = new Date(isoLike);
  if (Number.isNaN(d.getTime())) return "-";
  return `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.${d.getFullYear()} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function formatDisplayTime(value) {
  if (!value) return "-";
  if (String(value).includes("T")) {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) {
      return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
    }
  }
  return String(value).slice(0, 5);
}

function roomLabel(roomCode) {
  const roomKeyMap = {
    STANDARD: "Standard Room",
    FAMILY: "Family Room",
    SMART: "Smart Capsule",
    CAPSULE: "Capsule",
    DELUXE: "Deluxe",
  };
  return roomKeyMap[roomCode] || roomCode || "-";
}

function normalizeRoomCode(value) {
  const s = String(value || "").toUpperCase().trim();
  if (s.includes("FAMILY")) return "FAMILY";
  if (s.includes("STANDARD")) return "STANDARD";
  return s;
}

function formatEuro(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return value == null ? "-" : `${value} EUR`;
  const formatted = Number.isInteger(n) ? String(n) : n.toFixed(2);
  return `${formatted} EUR`;
}

function buildCheckInValue(checkIn, checkInTime) {
  const date = String(checkIn || "").slice(0, 10);
  if (!date) return checkIn;

  const rawTime = String(checkInTime || "").trim();
  if (!rawTime) return date;
  if (rawTime.includes("T")) return rawTime;

  const time = rawTime.slice(0, 5);
  if (!/^\d{2}:\d{2}$/.test(time)) return date;
  return `${date}T${time}:00`;
}

function getBookingRows(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  return value ? [value] : [];
}

function getBookingGroups(bookings) {
  const groups = new Map();

  for (const booking of getBookingRows(bookings)) {
    const durationLabel = formatDurationLabel(booking?.duration || "-");
    const key = [
      booking?.rooms || "",
      booking?.check_in || "",
      booking?.check_in_at || booking?.check_in_time || "",
      durationLabel,
    ].join("|");

    const current =
      groups.get(key) || {
        rooms: booking?.rooms,
        check_in: booking?.check_in,
        check_in_at: booking?.check_in_at,
        check_in_time: booking?.check_in_time,
        duration: booking?.duration,
        durationLabel,
        count: 0,
        total: 0,
      };

    current.count += 1;
    current.total += Number(booking?.price) || 0;
    groups.set(key, current);
  }

  return Array.from(groups.values());
}

function normalizePaymentItems(booking, fallbackAmount) {
  const rawItems = Array.isArray(booking?.items) && booking.items.length
    ? booking.items
    : [booking || {}];

  return rawItems.map((item) => {
    const checkInValue = buildCheckInValue(
      firstNonEmpty(item?.checkIn, booking?.checkIn),
      firstNonEmpty(
        item?.checkOutTime,
        item?.checkInTime,
        item?.check_in_time,
        booking?.checkOutTime,
        booking?.checkInTime,
      ),
    );
    const bookingWindow = computeBookingWindow(
      checkInValue,
      firstNonEmpty(item?.duration, booking?.duration),
    );
    const price = Number(firstNonEmpty(item?.price, fallbackAmount));

    return {
      raw: item,
      checkIn: String(firstNonEmpty(item?.checkIn, booking?.checkIn) || "").slice(0, 10),
      checkInAt: bookingWindow.startAt,
      checkOut: bookingWindow.checkOutDate,
      checkOutAt: bookingWindow.endAt,
      duration: bookingWindow.duration,
      rooms: normalizeRoomCode(firstNonEmpty(item?.rooms, booking?.rooms)),
      guests: firstNonEmpty(item?.guests, booking?.guests),
      firstName: firstNonEmpty(item?.firstName, booking?.firstName),
      lastName: firstNonEmpty(item?.lastName, booking?.lastName),
      phone: firstNonEmpty(item?.phone, booking?.phone),
      email: firstNonEmpty(item?.email, booking?.email),
      price,
    };
  });
}


const OFFICIAL_BOOKING_PRICES_EUR = Object.freeze({
  STANDARD: Object.freeze({ "3h": 45, "10h": 70, "24h": 115 }),
  FAMILY: Object.freeze({ "3h": 80, "10h": 115, "24h": 175 }),
});

function getOfficialBookingPrice(item) {
  const room = normalizeRoomCode(item?.rooms);
  const duration = item?.duration;
  let durationKey = "";
  if (duration?.kind === "hours" && Number(duration.dbValue) === 3) durationKey = "3h";
  if (duration?.kind === "hours" && Number(duration.dbValue) === 10) durationKey = "10h";
  if (duration?.kind === "days" && Number(duration.dbValue) === 1) durationKey = "24h";
  return OFFICIAL_BOOKING_PRICES_EUR[room]?.[durationKey] ?? null;
}

function isReasonableGuestText(value, maxLength) {
  const text = String(value ?? "").trim();
  return text.length > 0 && text.length <= maxLength && !/[\u0000-\u001f\u007f]/.test(text);
}

function isValidGuestEmail(value) {
  const email = String(value || "").trim();
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function notifyTelegramHtml(html) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.warn("Telegram env yo'q");
    return { ok: false, skipped: true, reason: "missing_env" };
  }

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
    if (!data?.ok) {
      console.error("Telegram send error:", data);
      return { ok: false, data };
    }
    console.log("Telegram HTML yuborildi");
    return { ok: true, data };
  } catch (e) {
    console.error("Telegram error:", e);
    return { ok: false, error: e };
  }
}


app.post("/notify/telegram", contactLimiter, async (req, res) => {
  try {
    const fullName = String(req.body?.fullName || "").trim();
    const email = String(req.body?.email || "").trim();
    const phone = String(req.body?.phone || "").trim();
    const method = String(req.body?.method || "").trim().toLowerCase();
    const message = String(req.body?.message || "").trim();

    if (
      !isReasonableGuestText(fullName, 120) ||
      !isValidGuestEmail(email) ||
      !isReasonableGuestText(phone, 40) ||
      !["telegram", "email", "whatsapp"].includes(method) ||
      !isReasonableGuestText(message, 2000)
    ) {
      return res.status(400).json({ ok: false, error: "Invalid contact form" });
    }

    const html = [
      "📩 <b>Yangi xabar</b>",
      `👤 <b>Ism:</b> ${escapeHtml(fullName)}`,
      `📧 <b>Email:</b> ${escapeHtml(email)}`,
      `📞 <b>Telefon:</b> ${escapeHtml(phone)}`,
      `💬 <b>Aloqa usuli:</b> ${escapeHtml(method)}`,
      `📝 <b>Xabar:</b> ${escapeHtml(message)}`,
    ].join("\n");

    const result = await notifyTelegramHtml(html);
    if (!result?.ok) return res.status(502).json({ ok: false, error: "Message delivery failed" });
    return res.json({ ok: true });
  } catch (e) {
    console.error("contact telegram error:", e?.message || e);
    return res.status(500).json({ ok: false, error: "Message delivery failed" });
  }
});

function buildBookingTelegramHtml(booking) {
  const createdAt = booking?.created_at || new Date().toISOString();
  return [
    "📢 <b>Yangi bron qabul qilindi</b>",
    "",
    `👤 <b>Ism:</b> ${escapeHtml(booking?.first_name || "-")} ${escapeHtml(booking?.last_name || "")}`,
    `📧 <b>Email:</b> ${escapeHtml(booking?.email || "-")}`,
    `📞 <b>Telefon:</b> ${escapeHtml(booking?.phone || "-")}`,
    "",
    `🗓️ <b>Bron vaqti:</b> ${escapeHtml(formatDisplayDateTime(createdAt))}`,
    `📅 <b>Kirish sanasi:</b> ${escapeHtml(formatDisplayDate(booking?.check_in))}`,
    `🕒 <b>Kirish vaqti:</b> ${escapeHtml(formatDisplayTime(booking?.check_in_at || booking?.check_in_time))}`,
    `🛏️ <b>Xona:</b> ${escapeHtml(roomLabel(booking?.rooms))}`,
    `📆 <b>Davomiylik:</b> ${escapeHtml(formatDurationLabel(booking?.duration || "-"))}`,
    `💶 <b>Narx:</b> ${booking?.price != null ? escapeHtml(`${booking.price}€`) : "-"}`,
    "",
    `❕ <b>@freemustafa Send an Invoice to the guest!</b>`,
    `✅ <b>Mijoz kelganda, mavjud bo‘sh xonaga joylashtiriladi</b>`,
    `🌐 <b>Sayt:</b> khamsahotel.uz`,
  ].join("\n");
}

function buildBookingHumanText(booking) {
  return `
To'lov muvaffaqiyatli.
Bron:
- Ism: ${booking?.first_name || "-"} ${booking?.last_name || ""}
- Tel: ${booking?.phone || "-"}
- Email: ${booking?.email || "-"}
- Xona: ${booking?.rooms || "-"}
- Check-in: ${booking?.check_in || "-"}
- Check-out: ${booking?.check_out || "-"}
- Davomiylik: ${formatDurationLabel(booking?.duration || "-")}
- Narx (EUR): ${booking?.price != null ? booking.price : "-"}
`.trim();
}

function buildBookingTelegramHtmlForRows(bookings) {
  const rows = getBookingRows(bookings);
  const booking = rows[0] || {};
  const createdAt = booking?.created_at || new Date().toISOString();
  const groups = getBookingGroups(rows);
  const totalPrice = rows.reduce((sum, item) => sum + (Number(item?.price) || 0), 0);
  const roomLines = groups.map((group) => {
    const roomText = `${roomLabel(group.rooms)} ${group.count}x`;
    const dateText = formatDisplayDate(group.check_in);
    const timeText = formatDisplayTime(group.check_in_at || group.check_in_time);
    return `- ${escapeHtml(roomText)} | ${escapeHtml(dateText)} ${escapeHtml(timeText)} | ${escapeHtml(group.durationLabel)} | ${escapeHtml(formatEuro(group.total))}`;
  });

  return [
    "📢 <b>Yangi bron qabul qilindi</b>",
    "",
    `👤 <b>Ism:</b> ${escapeHtml(booking?.first_name || "-")} ${escapeHtml(booking?.last_name || "")}`,
    `📧 <b>Email:</b> ${escapeHtml(booking?.email || "-")}`,
    `📞 <b>Telefon:</b> ${escapeHtml(booking?.phone || "-")}`,
    "",
    `🗓️ <b>Bron vaqti:</b> ${escapeHtml(formatDisplayDateTime(createdAt))}`,
    "🛏️ <b>Xonalar:</b>",
    ...roomLines,
    `💶 <b>Jami:</b> ${escapeHtml(formatEuro(totalPrice))}`,
    "",
    "❕ <b>@freemustafa Send an Invoice to the guest!</b>",
    "✅ <b>Mijoz kelganda, mavjud bosh xonaga joylashtiriladi</b>",
    "🌐 <b>Sayt:</b> khamsahotel.uz",
  ].join("\n");
}

function buildBookingHumanTextForRows(bookings) {
  const rows = getBookingRows(bookings);
  const booking = rows[0] || {};
  const groups = getBookingGroups(rows);
  const totalPrice = rows.reduce((sum, item) => sum + (Number(item?.price) || 0), 0);
  const roomLines = groups
    .map((group) => {
      const roomText = `${roomLabel(group.rooms)} ${group.count}x`;
      const dateText = formatDisplayDate(group.check_in);
      const timeText = formatDisplayTime(group.check_in_at || group.check_in_time);
      return `  - ${roomText} | ${dateText} ${timeText} | ${group.durationLabel} | ${formatEuro(group.total)}`;
    })
    .join("\n");

  return `
To'lov muvaffaqiyatli.
Bron:
- Ism: ${booking?.first_name || "-"} ${booking?.last_name || ""}
- Tel: ${booking?.phone || "-"}
- Email: ${booking?.email || "-"}
- Xonalar:
${roomLines || "  - -"}
- Jami: ${formatEuro(totalPrice)}
`.trim();
}


async function sendBookingConfirmationEmailIfNeeded(transactionId) {
  const txId = String(transactionId || "").trim();
  if (!txId) return { ok: false, reason: "transaction_id_missing" };
  const client = await pgPool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [`guest-confirmation:${txId}`]);
    const { rows } = await client.query(`SELECT * FROM public.khamsachekin WHERE transaction_id=$1 ORDER BY id ASC`, [txId]);
    if (!rows.length) { await client.query("ROLLBACK"); return { ok: false, reason: "booking_not_found" }; }
    if (rows.some((row) => row.confirmation_email_sent_at)) { await client.query("COMMIT"); return { ok: true, skipped: true, reason: "already_sent" }; }
    if (!rows.some((row) => row.status === "paid")) { await client.query("COMMIT"); return { ok: false, skipped: true, reason: "payment_not_paid" }; }
    const template = buildGuestConfirmationEmail(rows);
    if (!template.guestEmail) { await client.query("ROLLBACK"); return { ok: false, reason: "guest_email_missing" }; }
    await sendEmail(template.guestEmail, "Important: Your Booking Confirmation & Security Notice - Khamsa Sleep Lounge", template.text, template.html);
    await client.query(`UPDATE public.khamsachekin SET confirmation_email_sent_at=now() WHERE transaction_id=$1`, [txId]);
    await client.query("COMMIT");
    console.log("✅ Guest booking confirmation email sent:", txId);
    return { ok: true };
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}

async function retryRecentGuestConfirmationEmails() {
  if (!EMAIL_USER || !EMAIL_PASS) return;
  const { rows } = await pgPool.query(`SELECT DISTINCT transaction_id FROM public.khamsachekin WHERE status='paid' AND transaction_id IS NOT NULL AND confirmation_email_sent_at IS NULL AND created_at >= now() - interval '24 hours' LIMIT 25`);
  for (const row of rows) {
    try { await sendBookingConfirmationEmailIfNeeded(row.transaction_id); }
    catch (e) { console.error("Guest confirmation retry error:", row.transaction_id, e?.message || e); }
  }
}

async function sendBookingTelegramIfNeeded(transactionId) {
  const { rows } = await pgPool.query(
    `SELECT *
       FROM public.khamsachekin
      WHERE transaction_id=$1
      ORDER BY id ASC`,
    [transactionId],
  );

  const booking = rows[0];
  if (!rows.length) {
    await notifyTelegram(
      `❗ Booking topilmadi\n🆔 ${transactionId}\n📦 Telegram fallback ishladi`,
    );
    return { ok: false, reason: "booking_not_found" };
  }

  if (rows.some((item) => item.telegram_notified_at)) {
    console.log("Telegram allaqachon yuborilgan:", transactionId);
    return { ok: true, skipped: true, bookings: rows };
  }

  const html =
    rows.length === 1
      ? buildBookingTelegramHtml(rows[0])
      : buildBookingTelegramHtmlForRows(rows);
  const tg = await notifyTelegramHtml(html);
  if (!tg.ok) return { ok: false, reason: "telegram_send_failed", bookings: rows };

  await pgPool.query(
    `UPDATE public.khamsachekin
        SET telegram_notified_at = now()
      WHERE transaction_id=$1`,
    [transactionId],
  );

  return { ok: true, bookings: rows };
}

function firstNonEmpty(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return value;
    }
  }
  return undefined;
}

function normalizePaymentCallbackPayload(body) {
  const nested = body?.data && typeof body.data === "object" ? body.data : {};

  const rawStatus = String(
    firstNonEmpty(
      body?.status,
      body?.payment_status,
      body?.transaction_status,
      body?.result,
      nested?.status,
      nested?.payment_status,
      nested?.transaction_status,
      nested?.result,
    ) || "",
  ).toLowerCase();

  const stid = firstNonEmpty(
    body?.shop_transaction_id,
    nested?.shop_transaction_id,
    body?.merchant_trans_id,
    nested?.merchant_trans_id,
    body?.merchantTransId,
    nested?.merchantTransId,
    body?.shopTransactionId,
    nested?.shopTransactionId,
  );

  const errorCode = Number(firstNonEmpty(body?.error, nested?.error));
  const successStatuses = new Set([
    "success",
    "successful",
    "succeeded",
    "paid",
    "captured",
    "completed",
    "approved",
  ]);

  const isSuccess =
    successStatuses.has(rawStatus) ||
    errorCode === 0 ||
    body?.paid === true ||
    nested?.paid === true;

  return { rawStatus, stid, isSuccess, errorCode };
}

function normalizeBookingDuration(durationValue) {
  if (Number.isFinite(durationValue)) {
    const n = Number(durationValue);
    if (n === 10) return { dbValue: 10, label: "10 soat", kind: "hours" };
    if (n === 3 || n === 2) return { dbValue: 3, label: "3 soat", kind: "hours" };
    if (n === 24 || n === 1) return { dbValue: 1, label: "1 kun", kind: "days" };
    return { dbValue: Math.max(1, Math.round(n)), label: String(n), kind: "days" };
  }

  const raw = String(durationValue || "").trim();
  const lower = raw.toLowerCase();

  if (lower.includes("10")) {
    return { dbValue: 10, label: raw || "10 soat", kind: "hours" };
  }
  if (
    lower.includes("3") ||
    lower.includes("2") ||
    lower.includes("hour") ||
    lower.includes("soat") ||
    lower.includes("час")
  ) {
    return { dbValue: 3, label: raw || "3 soat", kind: "hours" };
  }
  if (
    lower.includes("day") ||
    lower.includes("kun") ||
    lower.includes("день") ||
    lower.includes("сут")
  ) {
    return { dbValue: 1, label: raw || "1 kun", kind: "days" };
  }

  return { dbValue: 1, label: raw || "1 kun", kind: "days" };
}

function computeBookingWindow(checkInStr, durationValue) {
  const startAt = new Date(
    String(checkInStr || "").includes("T")
      ? checkInStr
      : `${String(checkInStr || "").slice(0, 10)}T00:00:00`,
  );

  if (Number.isNaN(startAt.getTime())) {
    return {
      startAt: null,
      endAt: null,
      checkOutDate: null,
      duration: normalizeBookingDuration(durationValue),
    };
  }

  const duration = normalizeBookingDuration(durationValue);
  const endAt = new Date(startAt);

  if (duration.kind === "hours") {
    endAt.setHours(endAt.getHours() + duration.dbValue);
  } else {
    endAt.setDate(endAt.getDate() + duration.dbValue);
  }

  return {
    startAt,
    endAt,
    checkOutDate: endAt.toISOString().slice(0, 10),
    duration,
  };
}

function formatDurationLabel(durationValue) {
  return normalizeBookingDuration(durationValue).label;
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

async function verifyOctoTransactionStatus(transactionId) {
  const stid = String(transactionId || "").trim();
  if (!stid || !OCTO_SHOP_ID || !OCTO_SECRET) {
    throw new Error("Octo status verification is not configured");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch("https://secure.octo.uz/prepare_payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        octo_shop_id: Number(OCTO_SHOP_ID),
        octo_secret: OCTO_SECRET,
        shop_transaction_id: stid,
      }),
      signal: controller.signal,
    });

    const data = await safeParseResponse(response);
    if (!response.ok || Number(data?.error ?? 0) !== 0) {
      throw new Error(`Octo status check failed (${response.status})`);
    }

    const status = String(
      data?.data?.status || data?.status || data?.data?.payment_status || "",
    ).toLowerCase();

    if (!status) throw new Error("Octo status is missing");
    return { status, data };
  } finally {
    clearTimeout(timeout);
  }
}

async function finalizePaidTransaction(transactionId) {
  const stid = String(transactionId || "").trim();
  if (!stid) return { ok: false, reason: "transaction_id_missing" };

  const bookingRes = await pgPool.query(
    `SELECT * FROM public.khamsachekin WHERE transaction_id=$1 ORDER BY id ASC`,
    [stid],
  );
  if (!bookingRes.rows.length) {
    await notifyTelegram(`❗ Booking topilmadi\n🆔 ${escapeHtml(stid)}`);
    return { ok: false, reason: "booking_not_found" };
  }

  const transition = await pgPool.query(
    `UPDATE public.khamsachekin
        SET status='paid'
      WHERE transaction_id=$1 AND status IS DISTINCT FROM 'paid'
      RETURNING id`,
    [stid],
  );

  const refreshedRes = await pgPool.query(
    `SELECT * FROM public.khamsachekin WHERE transaction_id=$1 ORDER BY id ASC`,
    [stid],
  );
  const paidBookings = refreshedRes.rows.length ? refreshedRes.rows : bookingRes.rows;

  if (transition.rowCount > 0) {
    try {
      await sendEmail(
        ADMIN_EMAIL,
        "Khamsa: Payment Success",
        buildBookingHumanTextForRows(paidBookings),
      );
    } catch (e) {
      console.error("Admin email send error:", e?.message || e);
    }
  }

  try {
    await sendBookingConfirmationEmailIfNeeded(stid);
  } catch (e) {
    console.error("Guest confirmation email error:", e?.message || e);
  }

  try {
    const tgResult = await sendBookingTelegramIfNeeded(stid);
    console.log("Telegram notify result:", {
      ok: !!tgResult?.ok,
      skipped: !!tgResult?.skipped,
    });
  } catch (e) {
    console.error("Telegram notify wrapper error:", e?.message || e);
  }

  savePaymentResult(stid, true);
  return { ok: true, bookings: paidBookings };
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
  console.log("✅ Neon Db good connected");
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
    console.error("DB health error:", e?.message || e);
    res.status(500).json({ ok: false, error: "database unavailable" });
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
    `CREATE TABLE IF NOT EXISTS public.khamsachekin (id SERIAL PRIMARY KEY);`,
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
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
WHERE table_schema='public' AND table_name=_t AND column_name='transaction_id') THEN
  EXECUTE 'ALTER TABLE public.'||_t||' ADD COLUMN transaction_id TEXT';
END IF;

IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
WHERE table_schema='public' AND table_name=_t AND column_name='status') THEN
  EXECUTE 'ALTER TABLE public.'||_t||' ADD COLUMN status TEXT DEFAULT ''pending''';
END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=_t AND column_name='telegram_notified_at') THEN
        EXECUTE 'ALTER TABLE public.'||_t||' ADD COLUMN telegram_notified_at TIMESTAMPTZ';
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=_t AND column_name='confirmation_email_sent_at') THEN
        EXECUTE 'ALTER TABLE public.'||_t||' ADD COLUMN confirmation_email_sent_at TIMESTAMPTZ';
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
    ["FAMILY", FAMILY_CAPACITY, FAMILY_PRE_BUFFER_MIN, FAMILY_POST_BUFFER_MIN],
  );

  // STANDARD (buffer 0/0 default)
  await pgPool.query(
    `INSERT INTO public.room_types (room_type, capacity)
     VALUES ($1,$2)
     ON CONFLICT (room_type) DO UPDATE
       SET capacity = EXCLUDED.capacity,
           updated_at = now();`,
    ["STANDARD", STANDARD_CAPACITY],
  );
}

/* ===== Tarif helpers ===== */
async function getRoomTypeCfg(roomType) {
  const { rows } = await pgPool.query(
    `SELECT capacity, pre_buffer_minutes, post_buffer_minutes FROM public.room_types WHERE room_type=$1`,
    [roomType],
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
    [roomType, startISO],
  );
  const qNext = pgPool.query(
    `SELECT MIN(COALESCE(check_in_at, check_in::timestamp)) AS n_start
     FROM public.khamsachekin
     WHERE rooms=$1 AND COALESCE(check_in_at, check_in::timestamp) >= $2::timestamptz`,
    [roomType, startISO],
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
    [roomType, fromTs, toTs],
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

async function validatePaymentCapacity(paymentItems) {
  const roomTypes = [...new Set(paymentItems.map((item) => item.rooms).filter(Boolean))];
  const capacityEntries = await Promise.all(
    roomTypes.map(async (roomType) => {
      const cfg = await getRoomTypeCfg(roomType);
      return [roomType, Number(cfg.capacity)];
    }),
  );
  const capacities = Object.fromEntries(capacityEntries);

  const requestCapacity = validateRoomCapacity(paymentItems, capacities);
  if (!requestCapacity.ok) return requestCapacity;

  for (const item of paymentItems) {
    const capacity = capacities[item.rooms];
    if (!Number.isFinite(capacity)) continue;

    const existing = await getPeakConcurrency(item.rooms, item.checkInAt, item.checkOutAt);
    const requested = countOverlappingRoomItems(paymentItems, item);
    if (existing + requested > capacity) {
      return {
        ok: false,
        roomType: item.rooms,
        capacity,
        requested,
        existing,
      };
    }
  }

  return { ok: true };
}

/* =======================
 *  BNOVO ROUTES
 * ======================= */
app.get("/api/bnovo/availability", availabilityLimiter, async (req, res) => {
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
app.post("/create-payment", paymentLimiter, async (req, res) => {
  try {
    if (!OCTO_SHOP_ID || !OCTO_SECRET)
      return res.status(500).json({ error: "Payment sozlanmagan (env yo'q)" });

    const shopTransactionId = crypto.randomUUID();

    const {
      amount,
      description = "Mehmonxona to'lovi",
      email,
      booking = {},
    } = req.body || {};

    const requestedAmount = Number(amount);
    const paymentItems = normalizePaymentItems(booking, requestedAmount);

    if (!paymentItems.length || paymentItems.length > 24) {
      return res.status(400).json({ error: "Booking items soni noto‘g‘ri" });
    }

    // Narx clientdan ishonib olinmaydi. Serverdagi rasmiy tariflar source of truth.
    for (const item of paymentItems) {
      const officialPrice = getOfficialBookingPrice(item);
      if (!Number.isFinite(officialPrice)) {
        return res.status(400).json({ error: "Room yoki duration tarifi noto‘g‘ri" });
      }
      item.price = officialPrice;
    }

    const hasInvalidItem = paymentItems.some(
      (item) =>
        !["STANDARD", "FAMILY"].includes(item.rooms) ||
        !item.checkIn ||
        !item.checkOut ||
        !item.checkInAt ||
        !item.checkOutAt ||
        !isReasonableGuestText(item.firstName, 100) ||
        !isReasonableGuestText(item.lastName, 100) ||
        !isReasonableGuestText(item.phone, 40) ||
        !isValidGuestEmail(item.email || email),
    );
    const effectiveAmount = paymentItems.reduce((sum, item) => sum + item.price, 0);
    const payerEmail = String(email || paymentItems.find((item) => item.email)?.email || "").trim();

    if (
      !Number.isFinite(requestedAmount) ||
      requestedAmount <= 0 ||
      !isValidGuestEmail(payerEmail) ||
      hasInvalidItem ||
      !Number.isFinite(effectiveAmount) ||
      effectiveAmount <= 0
    ) {
      return res
        .status(400)
        .json({ error: "Ma'lumot yetarli emas yoki booking noto‘g‘ri" });
    }

    // Frontend narxi eski/manipulyatsiya qilingan bo‘lsa to‘lovni boshlamaymiz.
    if (Math.abs(requestedAmount - effectiveAmount) > 0.01) {
      return res.status(409).json({
        error: "Booking narxi yangilangan. Sahifani yangilab qayta urinib ko‘ring.",
      });
    }

    const capacityCheck = await validatePaymentCapacity(paymentItems);
    if (!capacityCheck.ok) {
      const roomName =
        capacityCheck.roomType === "FAMILY" ? "Family room" : capacityCheck.roomType;
      return res.status(409).json({
        error: `${roomName} uchun bo'sh xona yo'q. Bizda bu turdagi xona soni: ${capacityCheck.capacity}.`,
      });
    }

    const firstPaymentItem = paymentItems[0];
    const checkOut = firstPaymentItem.checkOut;
    const normalizedDuration = firstPaymentItem.duration;

    if (!firstPaymentItem.checkIn || !checkOut || !firstPaymentItem.checkInAt || !firstPaymentItem.checkOutAt) {
      return res.status(400).json({
        error: "Booking sanasi noto'g'ri",
      });
    }

    const amountUZS = Math.max(1000, Math.round(effectiveAmount * EUR_TO_UZS));

    /* ===== BOOKING PAYLOAD ===== */
    const bookingPayload = {
      checkIn: booking.checkIn,
      checkOut,
      duration: normalizedDuration.label,
      roomType: booking.rooms,
      guests: booking.guests,
      firstName: booking.firstName,
      lastName: booking.lastName,
      phone: booking.phone,
      email: booking.email,
      priceEur: effectiveAmount,
    };

    /* =========================================================
       🔥 MUHIM: PAYMENT DAN OLDIN DB GA YOZAMIZ
    ========================================================= */

    const client = await pgPool.connect();
    try {
      await client.query("BEGIN");

      for (const item of paymentItems) {
        await client.query(
        `
    INSERT INTO public.khamsachekin
    (transaction_id, status, rooms, check_in, check_out, check_in_at, check_out_at,
     duration, price, first_name, last_name, phone, email)
    VALUES ($1,'pending',$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
    `,
        [
          shopTransactionId,
          item.rooms,
          item.checkIn,
          item.checkOut,
          item.checkInAt,
          item.checkOutAt,
          item.duration.dbValue,
          item.price,
          item.firstName,
          item.lastName,
          item.phone,
          item.email || payerEmail,
        ],
        );
      }

      await client.query("COMMIT");
      client.release();

      console.log("✅ PENDING booking saqlandi");
    } catch (e) {
      console.error("❌ DB insert error:", e.message);

      // 🔥 MUHIM: requestni to‘xtatamiz
      await client.query("ROLLBACK").catch(() => {});
      client.release();
      return res.status(500).json({ error: "Bookingni saqlashda xatolik" });
    }

    /* ===== OCTO ===== */
    const signed = signData(bookingPayload);

    const returnUrlWithTid = `${BASE_URL}/octo-return?stid=${encodeURIComponent(
      shopTransactionId,
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
      description: `${description} (${effectiveAmount} EUR)`,
      return_url: returnUrlWithTid,
      notify_url: OCTO_CALLBACK_KEY_VALUE
        ? `${BASE_URL}/payment-callback?key=${encodeURIComponent(OCTO_CALLBACK_KEY_VALUE)}`
        : `${BASE_URL}/payment-callback`,
      language: "uz",

      // 🔥 STRING bo‘lishi kerak
      // custom_data: JSON.stringify({
      //   email,
      //   booking_json: signed.json,
      //   booking_sig: signed.sig,
      // }),
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

    const msg =
      (data && (data.errMessage || data.message)) ||
      `Octo error (status ${octoRes.status})`;

    return res.status(400).json({ error: msg });
  } catch (err) {
    console.error("❌ create-payment:", err);
    res.status(500).json({ error: "Server xatosi" });
  }
});

// Octo redirect: DB holati va Octo'ning server-to-server statusi bilan tasdiqlaymiz.
app.get("/octo-return", async (req, res) => {
  try {
    const stid = String(
      req.query.stid ||
        req.query.shop_transaction_id ||
        req.query.merchant_trans_id ||
        req.query.merchantTransId ||
        "",
    ).trim();

    if (!stid) return res.redirect(302, `${FRONTEND_URL}/cancelpayment`);

    const { rows } = await pgPool.query(
      `SELECT status FROM public.khamsachekin WHERE transaction_id=$1 LIMIT 1`,
      [stid],
    );

    if (!rows.length) return res.redirect(302, `${FRONTEND_URL}/cancelpayment`);

    if (rows[0]?.status === "paid") {
      await finalizePaidTransaction(stid);
      return res.redirect(302, `${FRONTEND_URL}/success`);
    }

    // Callback redirectdan keyinroq kelishi mumkin. Shuning uchun Octo'dan
    // merchant secret bilan authoritative statusni tekshiramiz.
    try {
      const verified = await verifyOctoTransactionStatus(stid);
      if (verified.status === "succeeded") {
        await finalizePaidTransaction(stid);
        return res.redirect(302, `${FRONTEND_URL}/success`);
      }

      if (verified.status === "canceled") {
        await pgPool.query(
          `UPDATE public.khamsachekin
              SET status='failed'
            WHERE transaction_id=$1 AND status IS DISTINCT FROM 'paid'`,
          [stid],
        );
        savePaymentResult(stid, false);
      }
    } catch (e) {
      console.error("octo-return status verification error:", e?.message || e);
    }

    return res.redirect(302, `${FRONTEND_URL}/cancelpayment`);
  } catch (e) {
    console.error("octo-return error:", e?.message || e);
    return res.redirect(302, `${FRONTEND_URL}/cancelpayment`);
  }
});

app.post(
  "/payment-callback",
  callbackLimiter,
  requireOctoCallback,
  async (req, res) => {
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

      const { stid } = normalizePaymentCallbackPayload(body);
      const effectiveStid = String(stid || "").trim();

      if (
        !effectiveStid ||
        effectiveStid.length > 120 ||
        !/^[A-Za-z0-9_-]+$/.test(effectiveStid)
      ) {
        console.warn("payment-callback: invalid transaction id");
        return res.status(400).json({ ok: false });
      }

      const localBooking = await pgPool.query(
        `SELECT 1 FROM public.khamsachekin WHERE transaction_id=$1 LIMIT 1`,
        [effectiveStid],
      );
      if (!localBooking.rowCount) {
        console.warn("payment-callback: unknown transaction id");
        return res.status(404).json({ ok: false });
      }

      // Incoming callback statusning o'ziga ishonmaymiz. To'lov holatini Octo
      // serveridan OCTO_SECRET bilan qayta tekshiramiz.
      let verified;
      try {
        verified = await verifyOctoTransactionStatus(effectiveStid);
      } catch (e) {
        console.error(
          "payment-callback Octo verification error:",
          effectiveStid,
          e?.message || e,
        );
        // Octo callbackni keyinroq qayta yuborishi uchun transient error.
        return res.status(503).json({ ok: false });
      }

      console.log("payment-callback verified:", {
        transactionId: effectiveStid,
        status: verified.status,
      });

      if (verified.status === "succeeded") {
        const finalized = await finalizePaidTransaction(effectiveStid);
        if (!finalized.ok && finalized.reason === "booking_not_found") {
          return res.status(404).json({ ok: false });
        }
        return res.json({ ok: true });
      }

      if (verified.status === "canceled") {
        await pgPool.query(
          `UPDATE public.khamsachekin
              SET status='failed'
            WHERE transaction_id=$1 AND status IS DISTINCT FROM 'paid'`,
          [effectiveStid],
        );
        savePaymentResult(effectiveStid, false);
        return res.json({ ok: true });
      }

      // created / wait_user_action / waiting_for_capture kabi holatlar hali
      // yakuniy emas; pending bookingni paid yoki failed qilib yubormaymiz.
      return res.json({ ok: true, pending: true });
    } catch (e) {
      console.error("/payment-callback:", e?.message || e);
      return res.status(500).json({ ok: false });
    }
  },
);

/* =======================
 *  CHECKINS (DB) — frontend
 * ======================= */
app.get("/api/checkins", requireAdmin, async (req, res) => {
  const { roomType = "", limit = "300" } = req.query;
  const type = String(req.query.type || "").toLowerCase();
  try {
    const params = [];
    const where = [];
    if (type === "booking") {
      where.push(
        `(first_name IS NOT NULL OR email IS NOT NULL OR phone IS NOT NULL)`
      );
    } else if (type === "block") {
      where.push(
        `first_name IS NULL AND last_name IS NULL AND email IS NULL AND phone IS NULL`
      );
    }
    if (roomType) {
      params.push(roomType);
      where.push(`rooms = $${params.length}`);
    }
    params.push(Math.min(Math.max(Number(limit) || 300, 1), 500));
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

app.get("/api/checkins/day", requireAdmin, async (req, res) => {
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
      [d, roomType],
    );
    res.json({ ok: true, free: !r.rows[0], block: r.rows[0] || null });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.get("/api/checkins/range/check", requireAdmin, async (req, res) => {
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
      [roomType, A, B],
    );
    res.json({ ok: true, conflict: !!r.rows[0], block: r.rows[0] || null });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.post("/api/checkins/range", requireAdmin, async (req, res) => {
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
      [roomType, A, B],
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
      [roomType, dateOnlyStart, dateOnlyEnd, A, B, note || null],
    );
    res.status(201).json({ ok: true, item: r.rows[0] });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.post("/api/checkins/full", requireAdmin, async (req, res) => {
  try {
    const {
      roomType,
      startAt,
      endAt,
      firstName,
      lastName,
      phone,
      email,
      price,
      duration,
    } = req.body;

    const startDate = startAt.slice(0, 10);
    const endDate = endAt.slice(0, 10);

    const r = await pgPool.query(
      `
  INSERT INTO public.khamsachekin
  (rooms, check_in, check_out, check_in_at, check_out_at,
   duration, price, first_name, last_name, phone, email)
  VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
  RETURNING *;
  `,
      [
        roomType,
        startDate,
        endDate,
        new Date(startAt), // 🔥 MUHIM
        new Date(endAt), // 🔥 MUHIM
        duration,
        price,
        firstName,
        lastName,
        phone,
        email,
      ],
    );

    res.json({ ok: true, item: r.rows[0] });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false });
  }
});

app.get("/api/checkins/next-block", availabilityLimiter, async (req, res) => {
  const { roomType = "", start = "", startAt = "" } = req.query;
  const A = toTz(startAt || start);
  if (!roomType || !A)
    return res
      .status(400)
      .json({ ok: false, error: "roomType,startAt ISO required" });
  try {
    const r = await pgPool.query(
      `
      SELECT rooms,
            COALESCE(check_in_at,  check_in::timestamp)  AS start_date,
            COALESCE(check_out_at, check_out::timestamp) AS end_date
      FROM public.khamsachekin
      WHERE rooms = $1
        AND COALESCE(check_in_at,  check_in::timestamp) <= $2::timestamptz
        AND COALESCE(check_out_at, check_out::timestamp) >  $2::timestamptz
      ORDER BY start_date DESC
      LIMIT 1;`,
      [roomType, A],
    );
    res.json({ ok: true, block: r.rows[0] || null });
  } catch (e) {
    res.status(500).json({ ok: false, error: "availability failed" });
  }
});

/* ====== Allowed tariffs (3h/10h/24h) ====== */
app.get("/api/availability/allowed-tariffs", availabilityLimiter, async (req, res) => {
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
      new Date(new Date(S).getTime() + 24 * 60 * 60 * 1000),
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
    res.status(500).json({ ok: false, error: "availability failed" });
  }
});

/* === DELETE by id === */
app.delete("/api/checkins/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0)
    return res.status(400).json({ ok: false, error: "Invalid id" });
  try {
    const r = await pgPool.query(
      "DELETE FROM public.khamsachekin WHERE id = $1 RETURNING id;",
      [id],
    );
    if (r.rowCount === 0)
      return res.status(404).json({ ok: false, error: "Not found" });
    res.json({ ok: true, id: r.rows[0].id });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});


app.get("/debug-last-booking", requireAdmin, async (req, res) => {
  try {
    const r = await pgPool.query(
      "SELECT * FROM khamsachekin ORDER BY id DESC LIMIT 1",
    );
    res.json(r.rows[0] || {});
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ====== 404 & error handlers ====== */
app.use((req, res) =>
  res.status(404).json({ error: "Not Found", path: req.path }),
);
app.use((err, req, res, _next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal Server Error" });
});

/* ====== Start ====== */
async function startServer() {
  try {
    await ensureSchema();
    await ensureRoomTypes();
    retryRecentGuestConfirmationEmails().catch((e) => console.error("Initial guest email retry error:", e?.message || e));
    const emailRetryTimer = setInterval(() => {
      retryRecentGuestConfirmationEmails().catch((e) => console.error("Guest email retry error:", e?.message || e));
    }, 5 * 60 * 1000);
    emailRetryTimer.unref?.();

    app.listen(PORT, () => {
  console.log(`✅ Server alo darajada ishlayapti: ${BASE_URL} (port: ${PORT})`);
  console.log(
    `[BNOVO] mode=${process.env.BNOVO_AUTH_MODE} auth_url=${
      process.env.BNOVO_AUTH_URL
    } id_set=${!!process.env.BNOVO_ID} pass_set=${!!process.env.BNOVO_PASSWORD}`,
  );
    });
  } catch (e) {
    console.error("startup schema error:", e);
    process.exit(1);
  }
}

startServer();
