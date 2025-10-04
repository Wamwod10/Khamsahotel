// src/admin/checkin/Checkin.jsx
import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import "./checkin.scss";

/* ===== API base (dev -> 127.0.0.1:5004 majburan) ===== */
function getApiBase() {
  const isLocal =
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" ||
     window.location.hostname === "127.0.0.1");
  if (isLocal) return "http://127.0.0.1:5004";       // DEV: majburan pgAdmin.cjs
  const env =
    (import.meta?.env && import.meta.env.VITE_API_BASE_URL) ||
    (typeof process !== "undefined" && process.env?.REACT_APP_API_BASE_URL) ||
    "";
  const base = String(env || "").replace(/\/+$/, "");
  return base || (typeof window !== "undefined" ? window.location.origin : "");
}
async function fetchJson(url, init) {
  const res = await fetch(url, init);
  const ct = res.headers.get("content-type") || "";
  const data = ct.includes("application/json") ? await res.json() : await res.text();
  if (!res.ok) {
    const msg = (data && (data.error || data.message)) || (typeof data === "string" ? data : res.statusText);
    throw new Error(msg);
  }
  return data;
}
function fmtHuman(ymd) {
  if (!ymd) return "-";
  const [y, m, d] = String(ymd).split("-");
  return `${d}.${m}.${y}`;
}
function isIso(s){ return /^\d{4}-\d{2}-\d{2}$/.test(String(s||"")); }

export default function Checkin() {
  const API = useMemo(() => getApiBase(), []);

  // UI
  const [open, setOpen] = useState(false);
  const [checkIn, setCheckIn] = useState("");  // YYYY-MM-DD
  const [checkOut, setCheckOut] = useState(""); // YYYY-MM-DD
  const [roomType, setRoomType] = useState("FAMILY"); // FAMILY | STANDARD

  // Data
  const [items, setItems] = useState([]);

  // Status
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [conflict, setConflict] = useState(null);     // {id,start_date,end_date} | null
  const [showConflict, setShowConflict] = useState(false);

  /* ---- List (/api/checkins) ---- */
  async function loadList() {
    try {
      setLoading(true);
      const qs = new URLSearchParams({ limit: "300", roomType }).toString();
      const d = await fetchJson(`${API}/api/checkins?${qs}`);
      const rows = (d.items || []).map(r => ({
        id: r.id,
        date: r.check_in,
        roomType: r.rooms,
        start: r.check_in,
        end: r.check_out,
      }));
      setItems(rows);
    } catch (e) {
      console.error("list load error:", e);
      setItems([]);
    } finally { setLoading(false); }
  }
  useEffect(() => { loadList(); /* roomType ga bog'liq */ }, [roomType]);

  /* ---- Overlap check (/api/checkins/range/check) ---- */
  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      setConflict(null);
      if (!isIso(checkIn) || !isIso(checkOut)) return;
      if (checkOut <= checkIn) return;
      try {
        setChecking(true);
        const qs = new URLSearchParams({ roomType, start: checkIn, end: checkOut }).toString();
        const d = await fetchJson(`${API}/api/checkins/range/check?${qs}`, { signal: ac.signal });
        setConflict(d.block || null);
      } catch (e) {
        if (e.name !== "AbortError") {
          console.warn("check error:", e.message);
          setConflict(null);
        }
      } finally { setChecking(false); }
    })();
    return () => ac.abort();
  }, [checkIn, checkOut, roomType, API]);

  /* ---- Save (/api/checkins/range) ---- */
  async function saveRange() {
    if (!isIso(checkIn) || !isIso(checkOut) || checkOut <= checkIn) return;
    if (conflict) { setShowConflict(true); return; }
    try {
      await fetchJson(`${API}/api/checkins/range`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomType, start: checkIn, end: checkOut }),
      });
      setCheckIn(""); setCheckOut(""); setRoomType("FAMILY"); setOpen(false);
      await loadList();
    } catch (e) {
      if (String(e.message||"").toUpperCase().includes("BUSY")) setShowConflict(true);
      else alert(e.message || "Xatolik");
    }
  }

  return (
    <div className="ci-page">
      <div className="ci-head">
        <h1 className="ci-title">Check-in Blackout Dates</h1>
        <button type="button" className="btn btn-primary" onClick={() => setOpen(true)}>
          + Add new date / range
        </button>
      </div>

      <div className="ci-card">
        {loading ? (
          <div className="ci-empty">Loading...</div>
        ) : items.length === 0 ? (
          <div className="ci-empty">No dates added yet. Click <b>Add new date</b>.</div>
        ) : (
          <ul className="ci-list">
            {items.map(it => (
              <li key={it.id} className="ci-row">
                <span className="ci-date">{fmtHuman(it.date)}</span>
                <span className={`ci-badge ${it.roomType === "FAMILY" ? "fam" : "std"}`}>
                  {it.roomType === "FAMILY" ? "Family" : "Standard"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {open && createPortal(
        <div className="ci-overlay" onClick={() => setOpen(false)}>
          <div className="ci-modal" onClick={(e)=>e.stopPropagation()}>
            <div className="ci-modal__head">
              <h2>Add interval</h2>
              <button type="button" className="ci-close" onClick={() => setOpen(false)}>×</button>
            </div>

            <div className="ci-modal__body">
              <label className="ci-label" htmlFor="ci-in">Check-in</label>
              <input id="ci-in" type="date" className="ci-input"
                     value={checkIn} onChange={(e)=>setCheckIn(e.target.value)} />

              <label className="ci-label" htmlFor="ci-out">Check-out</label>
              <input id="ci-out" type="date" className="ci-input"
                     value={checkOut} onChange={(e)=>setCheckOut(e.target.value)} />

              <label className="ci-label">Room type</label>
              <div className="ci-seg">
                <button type="button"
                        className={`ci-seg__btn ${roomType === "FAMILY" ? "active" : ""}`}
                        onClick={()=>setRoomType("FAMILY")}>Family</button>
                <button type="button"
                        className={`ci-seg__btn ${roomType === "STANDARD" ? "active" : ""}`}
                        onClick={()=>setRoomType("STANDARD")}>Standard</button>
              </div>

              {isIso(checkIn) && isIso(checkOut) && (
                <div className="ci-hint">
                  {checking ? "Checking..." :
                   conflict ? (
                     <span className="ci-warn">
                       Busy: {fmtHuman(conflict.start_date)} — {fmtHuman(conflict.end_date)}
                     </span>
                   ) : <span className="ci-ok">Selected interval is free ✓</span>}
                </div>
              )}
            </div>

            <div className="ci-modal__foot">
              <button type="button" className="btn btn-secondary" onClick={()=>setOpen(false)}>Cancel</button>
              <button type="button" className="btn btn-primary" onClick={saveRange}>Save</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {showConflict && conflict && createPortal(
        <div className="ci-overlay" onClick={()=>setShowConflict(false)}>
          <div className="ci-modal" onClick={(e)=>e.stopPropagation()}>
            <div className="ci-modal__head">
              <h2>Busy interval</h2>
              <button type="button" className="ci-close" onClick={()=>setShowConflict(false)}>×</button>
            </div>
            <div className="ci-modal__body">
              <p>
                Xona <b>{roomType}</b> {fmtHuman(conflict.start_date)} — {fmtHuman(conflict.end_date)} oralig‘ida band.
              </p>
            </div>
            <div className="ci-modal__foot">
              <button type="button" className="btn btn-primary" onClick={()=>setShowConflict(false)}>OK</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
