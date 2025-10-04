// backend/pgAdmin.cjs
// Run: node backend/pgAdmin.cjs
// Deps: npm i express cors dotenv pg

/* ================== Imports ================== */
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const { Pool, types } = require("pg");

/* ================== ENV ================== */
// .env ni 2 joydan ham sinab yuklaymiz (repo ildizi va backend/)
dotenv.config({ path: path.resolve(__dirname, "../.env") });
dotenv.config({ path: path.resolve(__dirname, ".env") });

// ENV ichidagi inline kommentlarni ( # ... ) tozalash helper
const clean = (v, def = "") => String(v ?? def).split("#")[0].trim();

/* ================== Server cfg ================== */
const HOST = clean(process.env.HOST, "0.0.0.0");
const PORT = Number(clean(process.env.PGADMIN_PORT, "") || clean(process.env.PORT, "") || 5004);

// CORS
const app = express();
app.use(express.json());
app.use(
  cors({
    origin: clean(process.env.CLIENT_ORIGIN, "*"),
    credentials: false,
  })
);

// PG: DATE (OID 1082) -> 'YYYY-MM-DD' string (default)
types.setTypeParser(1082, (val) => val);

/* ================== PG config ================== */
// Postgres unquoted DB nomlarini baribir lowercase qiladi — biz ham shunday qilamiz
const DB_NAME = clean(process.env.PGDATABASE, "khamsahotel").toLowerCase();
const PG_CONFIG = {
  host: clean(process.env.PGHOST, "127.0.0.1"),
  port: Number(clean(process.env.PGPORT, "5432")),
  user: clean(process.env.PGUSER, "postgres"),
  password: clean(process.env.PGPASSWORD, "postgres"),
  // Prod/remote’da ko‘pincha SSL kerak bo‘ladi
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
  `[BOOT] HOST=${HOST} PORT=${PORT} DB=${DB_NAME} PGHOST=${PG_CONFIG.host} SSL=${PG_CONFIG.ssl ? "on" : "off"}`
);

/* ================== DB ensure ================== */
/**
 * Localda (127.0.0.1) DB bo‘lmasa – CREATE DATABASE.
 * Remote/bulutda 3D000 chiqsa – yaratmaymiz (ko‘p provayderlarda ruxsat berilmaydi), xatoni tashlaymiz.
 */
async function ensureDatabase() {
  try {
    await pool.query("SELECT 1");
  } catch (e) {
    if (e && e.code === "3D000") {
      if (!isLocalHost) {
        // remote host – DB’ni bu yerda yaratmaymiz
        throw new Error(
          `Database "${DB_NAME}" topilmadi. Bulut/remote Postgresda avval DB’ni provayder panelida yarating. Original: ${e.message}`
        );
      }
      // local — yaratib yuboramiz
      const admin = makePool("postgres");
      console.log(`Database "${DB_NAME}" topilmadi, yaratamiz...`);
      await admin.query(`CREATE DATABASE ${DB_NAME} ENCODING 'UTF8' OWNER ${PG_CONFIG.user};`);
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
  // minimal marker jadval
  await pool.query(`CREATE TABLE IF NOT EXISTS public.khamsachekin (id SERIAL PRIMARY KEY);`);

  // ustunlarni mavjudligiga qarab qo‘shish/rename
  await pool.query(`
  DO $$
  DECLARE _t text := 'khamsachekin';
  BEGIN
    -- created_at
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name=_t AND column_name='created_at'
    ) THEN
      EXECUTE 'ALTER TABLE public.'||_t||' ADD COLUMN created_at TIMESTAMPTZ DEFAULT now()';
    END IF;

    -- check_in (rename start_at -> check_in)
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

    -- check_out (rename end_at -> check_out)
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

    -- rooms (rename room_type -> rooms)
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

    -- qolganlari
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

    -- index
    IF NOT EXISTS (
      SELECT 1 FROM pg_indexes
      WHERE schemaname='public' AND indexname='khamsachekin_time_idx'
    ) THEN
      EXECUTE 'CREATE INDEX khamsachekin_time_idx ON public.'||_t||'(rooms, check_in, check_out)';
    END IF;
  END $$;`);
}

/* ================== Small helpers ================== */
const isISO = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ""));
const addDaysISO = (ymd, n) => {
  const d = new Date(ymd);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

/* ================== Health ================== */
app.get("/healthz", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// DB health (frontend/test uchun qulay)
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
            check_in, check_out, duration, price,
            first_name, last_name, phone, email,
            check_in_time, created_at
      FROM public.khamsachekin
      ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
      ORDER BY check_in ASC
      LIMIT $${params.length};`;
    const r = await pool.query(sql, params);
    res.json({ ok: true, items: r.rows });
  } catch (e) {
    console.error("LIST ERR:", e.stack || e.message);
    res.status(500).json({ ok: false, error: e.message });
  }
});

/** Kun bandmi? */
app.get("/api/checkins/day", async (req, res) => {
  const { start = "", date = "", roomType = "" } = req.query;
  const d = start || date;
  if (!roomType || !isISO(d))
    return res.status(400).json({ ok: false, error: "roomType,start YYYY-MM-DD" });
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

/** Bir kun insert [d, d+1) */
app.post("/api/checkins/day", async (req, res) => {
  const { date, roomType, note } = req.body || {};
  if (!isISO(date) || !roomType)
    return res.status(400).json({ ok: false, error: "date YYYY-MM-DD, roomType required" });

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
    if (conflict.rowCount) return res.status(409).json({ ok: false, error: "BUSY" });

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

/** Interval overlap tekshiruv */
app.get("/api/checkins/range/check", async (req, res) => {
  const { roomType = "", start = "", end = "" } = req.query;
  if (!roomType || !isISO(start) || !isISO(end))
    return res.status(400).json({ ok: false, error: "roomType,start,end YYYY-MM-DD" });
  try {
    const r = await pool.query(
      `
      SELECT id, rooms, check_in AS start_date, check_out AS end_date
      FROM public.khamsachekin
      WHERE rooms = $1
        AND check_in < $3::date
        AND check_out > $2::date
      ORDER BY check_in ASC
      LIMIT 1;`,
      [roomType, start, end]
    );
    const block = r.rows[0] || null;
    res.json({ ok: true, conflict: !!block, block });
  } catch (e) {
    console.error("RANGE CHECK ERR:", e.stack || e.message);
    res.status(500).json({ ok: false, error: e.message });
  }
});

/** Interval insert [start, end) */
app.post("/api/checkins/range", async (req, res) => {
  const { roomType, start, end, note } = req.body || {};
  if (!roomType || !isISO(start) || !isISO(end))
    return res.status(400).json({ ok: false, error: "roomType,start,end YYYY-MM-DD" });

  try {
    const q = await pool.query(
      `
      SELECT 1 FROM public.khamsachekin
      WHERE rooms=$1 AND check_in < $3::date AND check_out > $2::date
      LIMIT 1;`,
      [roomType, start, end]
    );
    if (q.rowCount) return res.status(409).json({ ok: false, error: "BUSY" });

    const r = await pool.query(
      `
      INSERT INTO public.khamsachekin (check_in, check_out, rooms, duration, check_in_time)
      VALUES ($1::date, $2::date, $3, GREATEST(1, ($2::date - $1::date)), $4)
      RETURNING id, check_in, check_out, rooms, duration;`,
      [start, end, roomType, note || null]
    );
    res.status(201).json({ ok: true, item: r.rows[0] });
  } catch (e) {
    console.error("RANGE INSERT ERR:", e.stack || e.message);
    res.status(500).json({ ok: false, error: e.message });
  }
});

/** Header.jsx uchun: berilgan kundan boshlab mos eng yaqin blok */
app.get("/api/checkins/next-block", async (req, res) => {
  const { roomType = "", start = "" } = req.query;
  if (!roomType || !isISO(start))
    return res.status(400).json({ ok: false, error: "roomType,start YYYY-MM-DD" });
  try {
    const r = await pool.query(
      `
      SELECT id, rooms,
            check_in  AS start_date,
            check_out AS end_date
      FROM public.khamsachekin
      WHERE rooms = $1
        AND check_in <= $2::date
        AND check_out >  $2::date
      ORDER BY check_in DESC
      LIMIT 1;`,
      [roomType, start]
    );
    res.json({ ok: true, block: r.rows[0] || null });
  } catch (e) {
    console.error("NEXT-BLOCK ERR:", e.stack || e.message);
    res.status(500).json({ ok: false, error: e.message });
  }
});

/* 404 */
app.use((_req, res) => res.status(404).json({ ok: false, error: "Not Found" }));

/* ================== Start ================== */
(async () => {
  try {
    await ensureDatabase(); // remote bo‘lsa, DB’ni panelda yarating!
    await ensureSchema();
    await pool.query("SELECT 1");

    // bog‘langanda vaqti
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
