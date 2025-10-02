import React, { useState } from "react";
import { createPortal } from "react-dom";
import "./checkin.scss";

export default function Checkin() {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState("");
  const [roomType, setRoomType] = useState("FAMILY");
  const [items, setItems] = useState([]);

  const addDate = () => {
    if (!date) return;
    setItems((p) => [...p, { id: Date.now(), date, roomType }]);
    setDate("");
    setRoomType("FAMILY");
    setOpen(false);
  };

  return (
    <div className="ci-page">
      <div className="ci-head">
        <h1 className="ci-title">Check-in Blackout Dates</h1>
        <button type="button" className="btn btn-primary" onClick={() => setOpen(true)}>
          + Add new date
        </button>
      </div>

      <div className="ci-card">
        {items.length === 0 ? (
          <div className="ci-empty">No dates added yet. Click <b>Add new date</b>.</div>
        ) : (
          <ul className="ci-list">
            {items.map((it) => (
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
                <label className="ci-label" htmlFor="ci-date">Date</label>
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
                    className={`ci-seg__btn ${roomType === "FAMILY" ? "active" : ""}`}
                    onClick={() => setRoomType("FAMILY")}
                  >
                    Family
                  </button>
                  <button
                    type="button"
                    className={`ci-seg__btn ${roomType === "STANDARD" ? "active" : ""}`}
                    onClick={() => setRoomType("STANDARD")}
                  >
                    Standard
                  </button>
                </div>
              </div>

              <div className="ci-modal__foot">
                <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>
                  Cancel
                </button>
                <button type="button" className="btn btn-primary" onClick={addDate}>
                  Add date
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

function fmtHuman(ymd) {
  const [y, m, d] = String(ymd).split("-");
  return `${d}.${m}.${y}`;
}
