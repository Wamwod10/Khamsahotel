import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import "./checkin.scss";

/* === helpers === */
function getApiBase() {
  // DEV: localhost, PROD: VITE_API_BASE_URL / REACT_APP_API_BASE_URL / origin
  const isLocal =
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1");

  if (isLocal) return "http://localhost:5002";

  const env =
    (import.meta?.env && import.meta.env.VITE_API_BASE_URL) ||
    (typeof process !== "undefined" && process.env?.REACT_APP_API_BASE_URL) ||
    "";
  const base = (env || "").replace(/\/+$/, "");
  return base || window.location.origin;
}

async function fetchJson(url, init) {
  const res = await fetch(url, init);
  const ct = res.headers.get("content-type") || "";
  const data = ct.includes("application/json") ? await res.json() : await res.text();
  if (!res.ok) {
    const msg =
      (data && (data.error || data.message)) ||
      (typeof data === "string" && data) ||
      res.statusText;
    throw new Error(msg);
  }
  return data;
}

function fmtHuman(ymd) {
  if (!ymd) return "-";
  const [y, m, d] = String(ymd).split("-");
  return `${d}.${m}.${y}`;
}

export default function Checkin() {
  const API = useMemo(() => getApiBase(), []);

  // UI
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(""); // ci-input
  const [roomType, setRoomType] = useState("FAMILY");
  const [items, setItems] = useState([]); // DB’dan list

  // backend holatlar
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [conflict, setConflict] = useState(null); // {id,start_date,end_date} | null
  const [showConflict, setShowConflict] = useState(false);

  // Ro'yxatni olish
  async function loadList() {
    try {
      setLoading(true);
      const d = await fetchJson(
        `${API}/api/checkins?limit=300&roomType=${encodeURIComponent(roomType)}`
      );
      const rows =
        (d.items || []).map((r) => ({
          id: r.id,
          date: r.check_in,
          roomType: r.rooms,
          start: r.check_in,
          end: r.check_out,
        })) || [];
      setItems(rows);
    } catch (e) {
      console.error("list load error:", e);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    loadList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomType]);

  // Sana kiritilganda — shu sana bandmi? (YANGI endpoint: GET /api/checkins/day)
  useEffect(() => {
    let ignore = false;
    async function check() {
      setConflict(null);
      if (!date) return;
      try {
        setChecking(true);
        const qs = new URLSearchParams({
          roomType,
          start: date, // yoki backend date= ni ham qabul qiladi
        }).toString();
        const d = await fetchJson(`${API}/api/checkins/day?${qs}`);
        if (!ignore) {
          // d = { ok, free, block }
          setConflict(d.block || null);
        }
      } catch (e) {
        if (!ignore) setConflict(null);
      } finally {
        if (!ignore) setChecking(false);
      }
    }
    check();
    return () => {
      ignore = true;
    };
  }, [date, roomType, API]);

  // Add date: band bo‘lsa modal; bo‘sh bo‘lsa yozamiz
  async function addDate() {
    if (!date) return;
    if (conflict) {
      setShowConflict(true);
      return;
    }
    try {
      await fetchJson(`${API}/api/checkins/day`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, roomType }),
      });
      setDate("");
      setRoomType("FAMILY");
      setOpen(false);
      await loadList();
    } catch (e) {
      if (String(e.message || "").toUpperCase().includes("BUSY")) {
        setShowConflict(true);
      } else {
        alert(e.message || "Xatolik");
      }
    }
  }

  return (
    <div className="ci-page">
      <div className="ci-head">
        <h1 className="ci-title">Check-in Blackout Dates</h1>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setOpen(true)}
        >
          + Add new date
        </button>
      </div>

      <div className="ci-card">
        {loading ? (
          <div className="ci-empty">Loading...</div>
        ) : items.length === 0 ? (
          <div className="ci-empty">
            No dates added yet. Click <b>Add new date</b>.
          </div>
        ) : (
          <ul className="ci-list">
            {items.map((it) => (
              <li key={it.id} className="ci-row">
                <span className="ci-date">{fmtHuman(it.date)}</span>
                <span
                  className={`ci-badge ${
                    it.roomType === "FAMILY" ? "fam" : "std"
                  }`}
                >
                  {it.roomType === "FAMILY" ? "Family" : "Standard"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {open &&
        createPortal(
          <div className="ci-overlay">
            <div className="ci-modal">
              <div className="ci-modal__head">
                <h2>Add check-in date</h2>
                <button
                  type="button"
                  className="ci-close"
                  aria-label="Close"
                  onClick={() => setOpen(false)}
                >
                  ×
                </button>
              </div>

              <div className="ci-modal__body">
                <label className="ci-label" htmlFor="ci-date">
                  Date
                </label>
                <input
                  id="ci-date"
                  type="date"
                  className="ci-input"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />

                <label className="ci-label">Room type</label>
                <div className="ci-seg">
                  <button
                    type="button"
                    className={`ci-seg__btn ${
                      roomType === "FAMILY" ? "active" : ""
                    }`}
                    onClick={() => setRoomType("FAMILY")}
                  >
                    Family
                  </button>
                  <button
                    type="button"
                    className={`ci-seg__btn ${
                      roomType === "STANDARD" ? "active" : ""
                    }`}
                    onClick={() => setRoomType("STANDARD")}
                  >
                    Standard
                  </button>
                </div>

                {date && (
                  <div className="ci-hint">
                    {checking ? (
                      "Checking..."
                    ) : conflict ? (
                      <span className="ci-warn">
                        Busy: {fmtHuman(conflict.start_date)} —{" "}
                        {fmtHuman(conflict.end_date)}
                      </span>
                    ) : (
                      <span className="ci-ok">Selected date is free ✓</span>
                    )}
                  </div>
                )}
              </div>

              <div className="ci-modal__foot">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={addDate}
                >
                  Add date
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {showConflict && conflict &&
        createPortal(
          <div className="ci-overlay" onClick={() => setShowConflict(false)}>
            <div className="ci-modal" onClick={(e) => e.stopPropagation()}>
              <div className="ci-modal__head">
                <h2>Busy interval</h2>
                <button
                  type="button"
                  className="ci-close"
                  onClick={() => setShowConflict(false)}
                >
                  ×
                </button>
              </div>
              <div className="ci-modal__body">
                <p>
                  Xona <b>{roomType}</b> {fmtHuman(conflict.start_date)} —{" "}
                  {fmtHuman(conflict.end_date)} oralig‘ida band.
                </p>
              </div>
              <div className="ci-modal__foot">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setShowConflict(false)}
                >
                  OK
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
