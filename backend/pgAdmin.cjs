// Run: node backend/pgAdmin.cjs
// npm i express cors dotenv pg
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { Pool, types } = require("pg");

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors({ origin: process.env.CLIENT_ORIGIN || "*", credentials: false }));

// PG: DATE (OID 1082) => 'YYYY-MM-DD' string qaytsin
types.setTypeParser(1082, (val) => val);

const pool = new Pool({
  host: process.env.PGHOST || "localhost",
  port: +(process.env.PGPORT || 5432),
  database: process.env.PGDATABASE || "khamsaHotel",
  user: process.env.PGUSER || "postgres",
  password: process.env.PGPASSWORD || "root",
});

/* -------- MIGRATSIYA (ustunlarni tekshirish) -------- */
async function ensureSchema() {
  await pool.query(`CREATE TABLE IF NOT EXISTS public.khamsachekin (id SERIAL PRIMARY KEY);`);
  await pool.query(`
  DO $$ DECLARE _t text := 'khamsachekin'; BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=_t AND column_name='created_at') THEN
      EXECUTE 'ALTER TABLE public.'||_t||' ADD COLUMN created_at TIMESTAMPTZ DEFAULT now()';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=_t AND column_name='check_in') THEN
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=_t AND column_name='checkin') THEN
        EXECUTE 'ALTER TABLE public.'||_t||' RENAME COLUMN checkin TO check_in';
      ELSE
        EXECUTE 'ALTER TABLE public.'||_t||' ADD COLUMN check_in DATE';
      END IF;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=_t AND column_name='check_out') THEN
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=_t AND column_name='checkout') THEN
        EXECUTE 'ALTER TABLE public.'||_t||' RENAME COLUMN checkout TO check_out';
      ELSE
        EXECUTE 'ALTER TABLE public.'||_t||' ADD COLUMN check_out DATE';
      END IF;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=_t AND column_name='rooms') THEN
      EXECUTE 'ALTER TABLE public.'||_t||' ADD COLUMN rooms TEXT';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=_t AND column_name='check_in_time') THEN
      EXECUTE 'ALTER TABLE public.'||_t||' ADD COLUMN check_in_time TEXT';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=_t AND column_name='duration') THEN
      EXECUTE 'ALTER TABLE public.'||_t||' ADD COLUMN duration INTEGER';
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
  END $$;
  `);
}
ensureSchema().catch(console.error);

/* -------- helpers -------- */
const isISO = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ""));
const addDaysISO = (iso, n) => {
  const d = new Date(iso);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

/* -------- routes -------- */
app.get("/healthz", async (_req, res) => {
  try { await pool.query("SELECT 1"); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// Ro‘yxat
app.get("/api/checkins", async (req, res) => {
  const { roomType = "", limit = "300" } = req.query;
  try {
    const params = [];
    const where = [];
    if (roomType) { params.push(roomType); where.push(`rooms = $${params.length}`); }
    const sql = `
      SELECT id, rooms, check_in, check_out, duration, price,
             first_name, last_name, phone, email, check_in_time, created_at
      FROM public.khamsachekin
      ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
      ORDER BY check_in ASC
      LIMIT $${params.length + 1};
    `;
    const r = await pool.query(sql, [...params, +limit]);
    res.json({ ok: true, items: r.rows });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Sana mavjud blokni topish (eski endpoint saqlanadi)
app.get("/api/checkins/next-block", async (req, res) => {
  const { roomType = "", start = "" } = req.query;
  if (!roomType || !isISO(start)) return res.status(400).json({ ok: false, error: "roomType,start required YYYY-MM-DD" });
  try {
    const sql = `
      WITH s AS (SELECT $1::date AS d)
      SELECT k.id,
             k.check_in AS start_date,
             COALESCE(k.check_out,(k.check_in + (COALESCE(k.duration,0) * INTERVAL '1 day')))::date AS end_date
      FROM public.khamsachekin k, s
      WHERE k.rooms = $2
        AND k.check_in <= s.d
        AND COALESCE(k.check_out,(k.check_in + (COALESCE(k.duration,0) * INTERVAL '1 day')))::date > s.d
      ORDER BY k.check_in DESC
      LIMIT 1;
    `;
    const r = await pool.query(sql, [start, roomType]);
    res.json({ ok: true, block: r.rows[0] || null });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

/**
 * 🔧 YANGI: Frontend mosligi uchun
 * GET /api/checkins/day?start=YYYY-MM-DD&roomType=FAMILY
 * => { ok, free: boolean, block: {...} | null }
 */
app.get("/api/checkins/day", async (req, res) => {
  const { start = "", date = "", roomType = "" } = req.query;
  const d = start || date; // har ikkala nomni qollab-quvvatlash
  if (!roomType || !isISO(d)) return res.status(400).json({ ok: false, error: "roomType,start (YYYY-MM-DD) required" });

  try {
    const sql = `
      WITH s AS (SELECT $1::date AS d)
      SELECT k.id,
             k.rooms,
             k.check_in AS start_date,
             COALESCE(k.check_out,(k.check_in + (COALESCE(k.duration,0) * INTERVAL '1 day')))::date AS end_date
      FROM public.khamsachekin k, s
      WHERE k.rooms = $2
        AND k.check_in <= s.d
        AND COALESCE(k.check_out,(k.check_in + (COALESCE(k.duration,0) * INTERVAL '1 day')))::date > s.d
      ORDER BY k.check_in DESC
      LIMIT 1;
    `;
    const r = await pool.query(sql, [d, roomType]);
    const block = r.rows[0] || null;
    res.json({ ok: true, free: !block, block });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Bir kunlik insert [date, date+1)
app.post("/api/checkins/day", async (req, res) => {
  const { date, roomType, note } = req.body || {};
  if (!isISO(date) || !roomType) return res.status(400).json({ ok: false, error: "date (YYYY-MM-DD), roomType required" });

  // bandmi?
  const band = await pool.query(
    `
    WITH s AS (SELECT $1::date AS d)
    SELECT 1
    FROM public.khamsachekin k, s
    WHERE k.rooms = $2
      AND k.check_in <= s.d
      AND COALESCE(k.check_out,(k.check_in + (COALESCE(k.duration,0) * INTERVAL '1 day')))::date > s.d
    LIMIT 1;
    `,
    [date, roomType]
  );
  if (band.rowCount) return res.status(409).json({ ok: false, error: "BUSY" });

  // insert
  const end = addDaysISO(date, 1);
  const r = await pool.query(
    `
    INSERT INTO public.khamsachekin (check_in, check_out, rooms, duration, check_in_time)
    VALUES ($1::date, $2::date, $3, 1, $4)
    RETURNING id, check_in, check_out, rooms, duration;
    `,
    [date, end, roomType, note || null]
  );
  res.status(201).json({ ok: true, item: r.rows[0] });
});

// 404
app.use((_req, res) => res.status(404).json({ ok: false, error: "Not Found" }));

const PORT = +(process.env.PORT || 5002);
app.listen(PORT, () => console.log(`pgAdmin server on :${PORT}`));
