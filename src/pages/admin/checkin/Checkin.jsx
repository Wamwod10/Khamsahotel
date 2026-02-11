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
  if (isLocal) return "http://127.0.0.1:5004"; // DEV: pgAdmin.cjs yoki index.js
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
  const data = ct.includes("application/json")
    ? await res.json()
    : await res.text();
  if (!res.ok) {
    const msg =
      (data && (data.error || data.message)) ||
      (typeof data === "string" ? data : res.statusText);
    throw new Error(msg);
  }
  return data;
}

/* ===== Helpers ===== */
function pad(n) {
  return String(n).padStart(2, "0");
}
function fmtHumanDate(ymd) {
  if (!ymd) return "-";
  const [y, m, d] = String(ymd).split("-");
  return `${d}.${m}.${y}`;
}
function fmtHumanDT(dt) {
  if (!dt) return "-";
  const [d, t = "00:00"] = String(dt).split("T");
  const [hh = "00", mm = "00"] = t.split(":");
  return `${fmtHumanDate(d)} ${hh}:${mm}`;
}
function isIso(s) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(s || ""));
}
function isIsoDT(s) {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(String(s || ""));
}
// "hozir"ni datetime-local input formatida qaytarish (yaqin 5 daqiqaga yaxlitlab)
function nowLocalInput(stepMin = 5) {
  const d = new Date();
  const m = Math.ceil(d.getMinutes() / stepMin) * stepMin;
  d.setMinutes(m, 0, 0);
  const y = d.getFullYear();
  const mo = pad(d.getMonth() + 1);
  const da = pad(d.getDate());
  const hh = pad(d.getHours());
  const mm = pad(d.getMinutes());
  return `${y}-${mo}-${da}T${hh}:${mm}`;
}

export default function Checkin() {
  const API = useMemo(() => getApiBase(), []);

  // UI
  const [open, setOpen] = useState(false);
  // YANGI: datetime bilan ishlaymiz
  const [startAt, setStartAt] = useState(""); // YYYY-MM-DDTHH:mm
  const [endAt, setEndAt] = useState(""); // YYYY-MM-DDTHH:mm
  const [roomType, setRoomType] = useState("FAMILY"); // FAMILY | STANDARD

  // Data
  const [items, setItems] = useState([]);

  // Status
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [conflict, setConflict] = useState(null); // {id,start_date,end_date} | null
  const [showConflict, setShowConflict] = useState(false);

  // YANGI: Admin preview uchun ruxsat etilgan tariflar (startAt + roomType bo‘yicha)
  const [allowedTariffs, setAllowedTariffs] = useState([]); // ["3h","10h","24h"]
  const [tariffLoading, setTariffLoading] = useState(false);

  /* ---- List (/api/checkins) ---- */
  async function loadList() {
    try {
      setLoading(true);
      const qs = new URLSearchParams({ limit: "300", roomType }).toString();
      const d = await fetchJson(`${API}/api/checkins?${qs}`);
      const rows = (d.items || []).map((r) => {
        const start =
          r.start_at || (r.check_in ? `${r.check_in}T00:00` : "") || "";
        const end =
          r.end_at || (r.check_out ? `${r.check_out}T00:00` : "") || "";
        return { id: r.id, roomType: r.rooms, start, end };
      });
      setItems(rows);
    } catch (e) {
      console.error("list load error:", e);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    loadList(); /* roomType ga bog'liq */
  }, [roomType]); // eslint-disable-line

  /* ---- Overlap check (/api/checkins/range/check) ---- */
  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      setConflict(null);
      if (!isIsoDT(startAt) || !isIsoDT(endAt)) return;
      if (endAt <= startAt) return;
      try {
        setChecking(true);
        const qs = new URLSearchParams({ roomType, startAt, endAt }).toString();
        const d = await fetchJson(`${API}/api/checkins/range/check?${qs}`, {
          signal: ac.signal,
        });
        setConflict(d.block || null);
      } catch (e) {
        if (e.name !== "AbortError") {
          console.warn("check error:", e.message);
          setConflict(null);
        }
      } finally {
        setChecking(false);
      }
    })();
    return () => ac.abort();
  }, [startAt, endAt, roomType, API]);

  /* ---- YANGI: Allowed tariffs preview (admin uchun) ---- */
  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      setAllowedTariffs([]);
      if (!isIsoDT(startAt)) return;
      try {
        setTariffLoading(true);
        const qs = new URLSearchParams({ roomType, start: startAt }).toString();
        const d = await fetchJson(
          `${API}/api/availability/allowed-tariffs?${qs}`,
          { signal: ac.signal }
        );
        setAllowedTariffs(Array.isArray(d.allowed) ? d.allowed : []);
      } catch (e) {
        if (e.name !== "AbortError") console.warn("tariffs error:", e.message);
        setAllowedTariffs([]);
      } finally {
        setTariffLoading(false);
      }
    })();
    return () => ac.abort();
  }, [startAt, roomType, API]);

  /* ---- Save (/api/checkins/range) ---- */
  async function saveRange() {
    if (!isIsoDT(startAt) || !isIsoDT(endAt) || endAt <= startAt) return;
    if (conflict) {
      setShowConflict(true);
      return;
    }
    try {
      await fetchJson(`${API}/api/checkins/range`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomType, startAt, endAt }),
      });
      setStartAt("");
      setEndAt("");
      setRoomType("FAMILY");
      setOpen(false);
      await loadList();
    } catch (e) {
      if (
        String(e.message || "")
          .toUpperCase()
          .includes("BUSY")
      )
        setShowConflict(true);
      else alert(e.message || "Xatolik");
    }
  }

  /* ---- Delete (/api/checkins/:id) ---- */
  async function deleteItem(it) {
    if (!it?.id) return;
    const ok = window.confirm(
      `Delete ${fmtHumanDT(it.start)} — ${fmtHumanDT(it.end)} (${it.roomType})?`
    );
    if (!ok) return;
    try {
      await fetchJson(`${API}/api/checkins/${encodeURIComponent(it.id)}`, {
        method: "DELETE",
      });
      setItems((prev) => prev.filter((x) => x.id !== it.id)); // optimistic
    } catch (e) {
      alert(e.message || "O‘chirishda xatolik");
    }
  }

  /* ---- Modal ochilganda default qiymatlar ---- */
  useEffect(() => {
    if (!open) return;
    // Boshlang‘ich qiymatlar: hozir va +3 soat (misol)
    const a = nowLocalInput(5);
    const d = new Date(a);
    d.setHours(d.getHours() + 3);
    const b = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
      d.getDate()
    )}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    setStartAt(a);
    setEndAt(b);
  }, [open]);

  return (
    <div className="ci-page">
      <div className="container">
        <div className="ci-head">
          <h1 className="ci-title">Check-in Blackout (Date/Time)</h1>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setOpen(true)}
          >
            + Add new interval
          </button>
        </div>

        <div className="ci-card">
          {loading ? (
            <div className="ci-empty">Loading...</div>
          ) : items.length === 0 ? (
            <div className="ci-empty">
              No dates added yet. Click <b>Add new interval</b>.
            </div>
          ) : (
            <ul className="ci-list">
              {items.map((it) => (
                <li key={it.id} className="ci-row">
                  <span className="ci-date">
                    {fmtHumanDT(it.start)} — {fmtHumanDT(it.end)}
                  </span>

                  <span
                    className={`ci-badge ${it.roomType === "FAMILY" ? "fam" : "std"
                      }`}
                  >
                    {/* FAMILY bo‘lsa, "Family" oldida delete tugma */}
                    {it.roomType === "FAMILY" && (
                      <button
                        type="button"
                        className="ci-del"
                        title="Delete this interval"
                        aria-label="Delete"
                        onClick={() => deleteItem(it)}
                        style={{
                          border: "none",
                          background: "transparent",
                          cursor: "pointer",
                          fontSize: "14px",
                          marginRight: "8px",
                          lineHeight: 1,
                        }}
                      >
                        🗑
                      </button>
                    )}
                    {it.roomType === "FAMILY" ? "Family" : "Standard"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {open &&
          createPortal(
            <div className="ci-overlay" onClick={() => setOpen(false)}>
              <div className="ci-modal" onClick={(e) => e.stopPropagation()}>
                <div className="ci-modal__head">
                  <h2>Add interval (with time)</h2>
                  <button
                    type="button"
                    className="ci-close"
                    onClick={() => setOpen(false)}
                  >
                    ×
                  </button>
                </div>

                <div className="ci-modal__body">
                  <label className="ci-label" htmlFor="ci-in">
                    Start (check-in)
                  </label>
                  <input
                    id="ci-in"
                    type="datetime-local"
                    className="ci-input"
                    value={startAt}
                    onChange={(e) => setStartAt(e.target.value)}
                  />

                  <label className="ci-label" htmlFor="ci-out">
                    End (check-out)
                  </label>
                  <input
                    id="ci-out"
                    type="datetime-local"
                    className="ci-input"
                    value={endAt}
                    onChange={(e) => setEndAt(e.target.value)}
                  />

                  <label className="ci-label">Room type</label>
                  <div className="ci-seg">
                    <button
                      type="button"
                      className={`ci-seg__btn ${roomType === "FAMILY" ? "active" : ""
                        }`}
                      onClick={() => setRoomType("FAMILY")}
                    >
                      Family
                    </button>
                    <button
                      type="button"
                      className={`ci-seg__btn ${roomType === "STANDARD" ? "active" : ""
                        }`}
                      onClick={() => setRoomType("STANDARD")}
                    >
                      Standard
                    </button>
                  </div>

                  {/* YANGI: Admin preview — ushbu Start vaqtida qaysi tariflar sig‘adi */}
                  {isIsoDT(startAt) && (
                    <div className="ci-hint" style={{ marginTop: 6 }}>
                      {tariffLoading ? (
                        "Tariffs: checking..."
                      ) : allowedTariffs.length > 0 ? (
                        <span className="ci-ok">
                          Tariffs allowed: {allowedTariffs.join(", ")} ✓
                        </span>
                      ) : (
                        <span className="ci-warn">Tariffs allowed: none</span>
                      )}
                    </div>
                  )}

                  {isIsoDT(startAt) && isIsoDT(endAt) && (
                    <div className="ci-hint" style={{ marginTop: 6 }}>
                      {checking ? (
                        "Checking..."
                      ) : conflict ? (
                        <span className="ci-warn">
                          Busy: {fmtHumanDT(conflict.start_date)} —{" "}
                          {fmtHumanDT(conflict.end_date)}
                        </span>
                      ) : (
                        <span className="ci-ok">Selected interval is free ✓</span>
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
                    onClick={saveRange}
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )}

        {showConflict &&
          conflict &&
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
                    Xona <b>{roomType}</b> {fmtHumanDT(conflict.start_date)} —{" "}
                    {fmtHumanDT(conflict.end_date)} oralig‘ida band.
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
    </div>
  );
}
