// backend/pgAdmin.cjs
// Run: node backend/pgAdmin.cjs
// Deps: npm i express cors dotenv pg

/* ================== Imports ================== */
const express = require("express");
const dotenv = require("dotenv");
const path = require("path");
const { Pool, types } = require("pg");

/* ================== ENV ================== */
// .env ni 2 joydan ham sinab yuklaymiz (repo ildizi va backend/)
dotenv.config({ path: path.resolve(__dirname, "../.env") });
dotenv.config({ path: path.resolve(__dirname, ".env") });

// ENV ichidagi inline kommentlarni ( # ... ) tozalash helper
const clean = (v, def = "") =>
  String(v ?? def)
    .split("#")[0]
    .trim();

/* ================== Server cfg ================== */
const HOST = clean(process.env.HOST, "0.0.0.0");
const PORT = Number(
  clean(process.env.PGADMIN_PORT, "") || clean(process.env.PORT, "") || 5004
);

const app = express();
app.use(express.json());

/* === CORS (khamsahotel.uz + preflight) === */
const ALLOWED_ORIGINS = [
  (process.env.CLIENT_ORIGIN || "").trim(),
  (process.env.FRONTEND_URL || "").trim(),
  "https://khamsahotel.uz",
].filter(Boolean);

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

// PG: DATE (OID 1082) -> 'YYYY-MM-DD' string (default)
types.setTypeParser(1082, (val) => val);

/* ================== PG config ================== */
const DB_NAME = clean(process.env.PGDATABASE, "khamsahotel").toLowerCase();
const PG_CONFIG = {
  host: clean(process.env.PGHOST, "127.0.0.1"),
  port: Number(clean(process.env.PGPORT, "5432")),
  user: clean(process.env.PGUSER, "postgres"),
  password: clean(process.env.PGPASSWORD, "postgres"),
  ssl:
    clean(process.env.PGSSLMODE, "disable").toLowerCase() === "require"
      ? { rejectUnauthorized: false }
      : undefined,
};

const isLocalHost =
  ["localhost", "127.0.0.1"].includes(PG_CONFIG.host) ||
  PG_CONFIG.host.startsWith("192.168.") ||
  PG_CONFIG.host.startsWith("10.") ||
  PG_CONFIG.host.startsWith("172.16.");

const makePool = (db) => new Pool({ ...PG_CONFIG, database: db });
let pool = makePool(DB_NAME);

console.log(
  `[BOOT] HOST=${HOST} PORT=${PORT} DB=${DB_NAME} PGHOST=${
    PG_CONFIG.host
  } SSL=${PG_CONFIG.ssl ? "on" : "off"}`
);

/* ================== DB ensure ================== */
async function ensureDatabase() {
  try {
    await pool.query("SELECT 1");
  } catch (e) {
    if (e && e.code === "3D000") {
      if (!isLocalHost) {
        throw new Error(
          `Database "${DB_NAME}" topilmadi. Bulut/remote Postgresda avval DB’ni provayder panelida yarating. Original: ${e.message}`
        );
      }
      const admin = makePool("postgres");
      console.log(`Database "${DB_NAME}" topilmadi, yaratamiz...`);
      await admin.query(
        `CREATE DATABASE ${DB_NAME} ENCODING 'UTF8' OWNER ${PG_CONFIG.user};`
      );
      await admin.end();
      try {
        await pool.end();
      } catch {}
      pool = makePool(DB_NAME);
      console.log("Database yaratildi.");
    } else {
      throw e;
    }
  }
}

/* ================== Schema ensure (+ migratsiya) ================== */
async function ensureSchema() {
  // marker
  await pool.query(
    `CREATE TABLE IF NOT EXISTS public.khamsachekin (id SERIAL PRIMARY KEY);`
  );

  // === room_types (YANGI) ===
  await pool.query(`
    CREATE TABLE IF NOT EXISTS public.room_types (
      room_type TEXT PRIMARY KEY,
      capacity  INT  NOT NULL,
      pre_buffer_minutes  INT NOT NULL DEFAULT 0,
      post_buffer_minutes INT NOT NULL DEFAULT 0,
      updated_at TIMESTAMPTZ DEFAULT now()
    );
  `);

  // seed defaults agar bo'sh bo'lsa
  await pool.query(`
    INSERT INTO public.room_types (room_type, capacity, pre_buffer_minutes, post_buffer_minutes)
    VALUES
      ('FAMILY',   1, 0, 0),
      ('STANDARD', 23, 0, 0)
    ON CONFLICT (room_type) DO NOTHING;
  `);

  // khamsachekin ustunlarini moslashtirish
  await pool.query(`
  DO $$
  DECLARE _t text := 'khamsachekin';
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name=_t AND column_name='created_at'
    ) THEN
      EXECUTE 'ALTER TABLE public.'||_t||' ADD COLUMN created_at TIMESTAMPTZ DEFAULT now()';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name=_t AND column_name='check_in'
    ) THEN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema='public' AND table_name=_t AND column_name='start_at'
      ) THEN
        EXECUTE 'ALTER TABLE public.'||_t||' RENAME COLUMN start_at TO check_in';
      ELSE
        EXECUTE 'ALTER TABLE public.'||_t||' ADD COLUMN check_in DATE';
      END IF;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name=_t AND column_name='check_out'
    ) THEN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema='public' AND table_name=_t AND column_name='end_at'
      ) THEN
        EXECUTE 'ALTER TABLE public.'||_t||' RENAME COLUMN end_at TO check_out';
      ELSE
        EXECUTE 'ALTER TABLE public.'||_t||' ADD COLUMN check_out DATE';
      END IF;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name=_t AND column_name='rooms'
    ) THEN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema='public' AND table_name=_t AND column_name='room_type'
      ) THEN
        EXECUTE 'ALTER TABLE public.'||_t||' RENAME COLUMN room_type TO rooms';
      ELSE
        EXECUTE 'ALTER TABLE public.'||_t||' ADD COLUMN rooms TEXT';
      END IF;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name=_t AND column_name='duration'
    ) THEN
      EXECUTE 'ALTER TABLE public.'||_t||' ADD COLUMN duration INTEGER';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name=_t AND column_name='check_in_time'
    ) THEN
      EXECUTE 'ALTER TABLE public.'||_t||' ADD COLUMN check_in_time TEXT';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name=_t AND column_name='price'
    ) THEN
      EXECUTE 'ALTER TABLE public.'||_t||' ADD COLUMN price NUMERIC(12,2)';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name=_t AND column_name='first_name'
    ) THEN
      EXECUTE 'ALTER TABLE public.'||_t||' ADD COLUMN first_name TEXT';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name=_t AND column_name='last_name'
    ) THEN
      EXECUTE 'ALTER TABLE public.'||_t||' ADD COLUMN last_name TEXT';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name=_t AND column_name='phone'
    ) THEN
      EXECUTE 'ALTER TABLE public.'||_t||' ADD COLUMN phone TEXT';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name=_t AND column_name='email'
    ) THEN
      EXECUTE 'ALTER TABLE public.'||_t||' ADD COLUMN email TEXT';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_indexes
      WHERE schemaname='public' AND indexname='khamsachekin_time_idx'
    ) THEN
      EXECUTE 'CREATE INDEX khamsachekin_time_idx ON public.'||_t||'(rooms, check_in, check_out)';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name=_t AND column_name='check_in_at'
    ) THEN
      EXECUTE 'ALTER TABLE public.'||_t||' ADD COLUMN check_in_at TIMESTAMPTZ';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name=_t AND column_name='check_out_at'
    ) THEN
      EXECUTE 'ALTER TABLE public.'||_t||' ADD COLUMN check_out_at TIMESTAMPTZ';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_indexes
      WHERE schemaname='public' AND indexname='khamsachekin_time_at_idx'
    ) THEN
      EXECUTE 'CREATE INDEX khamsachekin_time_at_idx ON public.'||_t||'(rooms, check_in_at, check_out_at)';
    END IF;
  END $$;
  `);
}

/* ================== Small helpers ================== */
const isISO = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ""));
const isISODateTime = (s) =>
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?/.test(String(s || ""));
const addDaysISO = (ymd, n) => {
  const d = new Date(ymd);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};
const toTz = (s) => {
  if (!s) return null;
  if (isISODateTime(s)) return s; // 'YYYY-MM-DDTHH:mm' yoki '...:ss'
  if (isISO(s)) return `${s}T00:00:00`;
  return null;
};

/* ==== NEW helpers for tariffs ==== */
async function getRoomTypeCfg(roomType) {
  const { rows } = await pool.query(
    `SELECT capacity, pre_buffer_minutes, post_buffer_minutes
     FROM public.room_types WHERE room_type=$1`,
    [roomType]
  );
  if (!rows[0]) {
    throw new Error(`Unknown room type: ${roomType}`);
  }
  return rows[0];
}

async function getNeighbors(roomType, startISO) {
  // Oldingi tugagan eng yaqini (<= S) va keyingi boshlanadigan eng yaqini (>= S)
  const qPrev = pool.query(
    `SELECT MAX(COALESCE(check_out_at, check_out::timestamp)) AS p_end
     FROM public.khamsachekin
     WHERE rooms=$1 AND COALESCE(check_out_at, check_out::timestamp) <= $2::timestamptz`,
    [roomType, startISO]
  );
  const qNext = pool.query(
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
  // fromTs..toTs oralig'ida overlap qilgan hamma intervalni olib, sweep-line
  const { rows } = await pool.query(
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
    if (r.st < r.en) {
      events.push({ t: new Date(r.st), d: +1 });
      events.push({ t: new Date(r.en), d: -1 });
    }
  }
  // sort (vaqt, keyin d)
  events.sort((a, b) => a.t - b.t || a.d - b.d);
  let cur = 0,
    peak = 0;
  for (const e of events) {
    cur += e.d;
    if (cur > peak) peak = cur;
  }
  return peak;
}

/* ================== Health ================== */
app.get("/healthz", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.get("/db/health", async (_req, res) => {
  try {
    const r = await pool.query("SELECT 1 AS ok");
    res.json({ ok: true, db: r.rows[0].ok });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

/* ================== Routes ================== */
/** Ro‘yxat */
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
            first_name, last_name, phone, email,
            check_in_time, created_at
      FROM public.khamsachekin
      ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
      ORDER BY COALESCE(check_in_at, check_in::timestamp) ASC
      LIMIT $${params.length};`;
    const r = await pool.query(sql, params);
    res.json({ ok: true, items: r.rows });
  } catch (e) {
    console.error("LIST ERR:", e.stack || e.message);
    res.status(500).json({ ok: false, error: e.message });
  }
});

/** Kun bandmi? (DATE kesimi — o‘zgarmadi) */
app.get("/api/checkins/day", async (req, res) => {
  const { start = "", date = "", roomType = "" } = req.query;
  const d = start || date;
  if (!roomType || !isISO(d))
    return res
      .status(400)
      .json({ ok: false, error: "roomType,start YYYY-MM-DD" });
  try {
    const r = await pool.query(
      `
      WITH s AS (SELECT $1::date AS d)
      SELECT k.id, k.rooms,
            k.check_in AS start_date,
            COALESCE(
              k.check_out,
              (k.check_in + (COALESCE(k.duration,0) * INTERVAL '1 day'))
            )::date AS end_date
      FROM public.khamsachekin k, s
      WHERE k.rooms = $2
        AND k.check_in <= s.d
        AND COALESCE(k.check_out,(k.check_in + (COALESCE(k.duration,0) * INTERVAL '1 day')))::date > s.d
      ORDER BY k.check_in DESC
      LIMIT 1;`,
      [d, roomType]
    );
    const block = r.rows[0] || null;
    res.json({ ok: true, free: !block, block });
  } catch (e) {
    console.error("DAY ERR:", e.stack || e.message);
    res.status(500).json({ ok: false, error: e.message });
  }
});

/** Bir kun insert [d, d+1) (eski) */
app.post("/api/checkins/day", async (req, res) => {
  const { date, roomType, note } = req.body || {};
  if (!isISO(date) || !roomType)
    return res
      .status(400)
      .json({ ok: false, error: "date YYYY-MM-DD, roomType required" });
  try {
    const conflict = await pool.query(
      `
      WITH s AS (SELECT $1::date AS d)
      SELECT 1 FROM public.khamsachekin k, s
      WHERE k.rooms=$2 AND k.check_in<=s.d
        AND COALESCE(k.check_out,(k.check_in + (COALESCE(k.duration,0) * INTERVAL '1 day')))::date > s.d
      LIMIT 1;`,
      [date, roomType]
    );
    if (conflict.rowCount)
      return res.status(409).json({ ok: false, error: "BUSY" });

    const end = addDaysISO(date, 1);
    const r = await pool.query(
      `
      INSERT INTO public.khamsachekin (check_in, check_out, rooms, duration, check_in_time)
      VALUES ($1::date, $2::date, $3, 1, $4)
      RETURNING id, check_in, check_out, rooms, duration;`,
      [date, end, roomType, note || null]
    );
    res.status(201).json({ ok: true, item: r.rows[0] });
  } catch (e) {
    console.error("DAY INSERT ERR:", e.stack || e.message);
    res.status(500).json({ ok: false, error: e.message });
  }
});

/** Interval overlap tekshiruv — datetime qo‘llaydi */
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
    const r = await pool.query(
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
    const block = r.rows[0] || null;
    res.json({ ok: true, conflict: !!block, block });
  } catch (e) {
    console.error("RANGE CHECK ERR:", e.stack || e.message);
    res.status(500).json({ ok: false, error: e.message });
  }
});

/** Interval insert [start,end) — datetime */
app.post("/api/checkins/range", async (req, res) => {
  const { roomType, start, end, startAt, endAt, note } = req.body || {};
  const A = toTz(startAt || start);
  const B = toTz(endAt || end);
  if (!roomType || !A || !B)
    return res
      .status(400)
      .json({ ok: false, error: "roomType,startAt,endAt ISO required" });

  try {
    const q = await pool.query(
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

    const r = await pool.query(
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
    console.error("RANGE INSERT ERR:", e.stack || e.message);
    res.status(500).json({ ok: false, error: e.message });
  }
});

/** Header.jsx uchun: berilgan vaqtda ustida turgan blok (agar ichida bo‘lsa) */
app.get("/api/checkins/next-block", async (req, res) => {
  const { roomType = "", start = "", startAt = "" } = req.query;
  const A = toTz(startAt || start);
  if (!roomType || !A)
    return res
      .status(400)
      .json({ ok: false, error: "roomType,startAt ISO required" });
  try {
    const r = await pool.query(
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
    console.error("NEXT-BLOCK ERR:", e.stack || e.message);
    res.status(500).json({ ok: false, error: e.message });
  }
});

/* ===== NEW: Allowed tariffs (3h/10h/24h) =====
   GET /api/availability/allowed-tariffs?roomType=STANDARD&start=2025-10-08T03:00
*/
app.get("/api/availability/allowed-tariffs", async (req, res) => {
  try {
    const roomType = String(req.query.roomType || "STANDARD");
    const S = toTz(req.query.start);
    if (!S)
      return res.status(400).json({ ok: false, error: "start ISO required" });

    const cfg = await getRoomTypeCfg(roomType);
    const pre = cfg.pre_buffer_minutes || 0;
    const post = cfg.post_buffer_minutes || 0;

    const { p_end, n_start } = await getNeighbors(roomType, S);

    // oldingi bilan urishmasin
    if (p_end) {
      const minStart = new Date(new Date(p_end).getTime() + pre * 60 * 1000);
      if (new Date(S) < minStart) {
        return res.json({
          ok: true,
          allowed: [],
          reason: "start_too_early_hits_previous",
          details: { p_end, requiredEarliestStart: minStart },
        });
      }
    }

    const tariffs = [
      { code: "3h", hours: 3 },
      { code: "10h", hours: 10 },
      { code: "24h", hours: 24 },
    ];

    const allowed = [];
    for (const t of tariffs) {
      const Dms = t.hours * 60 * 60 * 1000;
      const end = new Date(new Date(S).getTime() + Dms);
      const endWithPost = new Date(end.getTime() + post * 60 * 1000);

      // keyingi bronni bosib o'tmasin
      if (n_start && endWithPost > new Date(n_start)) {
        continue;
      }

      // capacity check (bizning bronni ham qo'shib)
      const fromTs = new Date(S);
      const toTs = endWithPost;
      const peakExisting = await getPeakConcurrency(roomType, fromTs, toTs);
      const peakWithUs = peakExisting + 1;
      if (peakWithUs <= cfg.capacity) {
        allowed.push(t.code);
      }
    }

    res.json({
      ok: true,
      roomType,
      start: S,
      neighbors: { p_end, n_start },
      buffers: { pre, post },
      allowed,
    });
  } catch (e) {
    console.error("ALLOWED-TARIFFS ERR:", e);
    res.status(500).json({ ok: false, error: "server_error" });
  }
});

/** DELETE by id */
app.delete("/api/checkins/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ ok: false, error: "Invalid id" });
  }
  try {
    const r = await pool.query(
      "DELETE FROM public.khamsachekin WHERE id = $1 RETURNING id;",
      [id]
    );
    if (r.rowCount === 0) {
      return res.status(404).json({ ok: false, error: "Not found" });
    }
    res.json({ ok: true, id: r.rows[0].id });
  } catch (e) {
    console.error("DELETE ERR:", e.stack || e.message);
    res.status(500).json({ ok: false, error: e.message });
  }
});

/* 404 */
app.use((_req, res) => res.status(404).json({ ok: false, error: "Not Found" }));

/* ================== Start ================== */
(async () => {
  try {
    await ensureDatabase();
    await ensureSchema();
    await pool.query("SELECT 1");

    const t = await pool.query("SELECT now() AS now");
    console.log("[DB] connected:", t.rows[0].now);

    app.listen(PORT, HOST, () => {
      console.log(`pgAdmin server on http://${HOST}:${PORT} (DB=${DB_NAME})`);
    });
  } catch (e) {
    console.error("Boot error:", e);
    process.exit(1);
  }
})();
