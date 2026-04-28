import React, { useState, useMemo, useEffect } from "react";
import "./staffbooking.scss";
import StaffAddModal from "../components/StaffAddModal";
import StaffBookingModal from "../components/StaffBookingModal";
import { FaCheckCircle } from "react-icons/fa";

const StaffBookings = () => {
  const [openAdd, setOpenAdd] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);

  const [bookings, setBookings] = useState(() => {
    try {
      const saved = localStorage.getItem("staffBookings");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem("staffBookings", JSON.stringify(bookings));
  }, [bookings]);

  const handleAdd = (newBooking) => {
    setBookings((prev) => [
      {
        ...newBooking,
        id: Date.now(),
        createdAt: new Date().toISOString(),
      },
      ...prev,
    ]);
  };

  const handleDelete = (id) => {
    setBookings((prev) => prev.filter((b) => b.id !== id));
    setSelectedBooking(null);
  };

  const sortedBookings = useMemo(() => {
    return [...bookings].sort((a, b) => {
      const A = new Date(`${a.date}T${a.time || "00:00"}`);
      const B = new Date(`${b.date}T${b.time || "00:00"}`);
      return B - A;
    });
  }, [bookings]);

  const formatDate = (date, time) => {
    if (!date) return "-";
    return `${date}${time ? ` (${time})` : ""}`;
  };

  return (
    <div className="sb">
      {/* HEADER */}
      <div className="container">
        <div className="sb-top">
          <div>
            <h1>Bookings</h1>
            <p>Khamsa Hotel bronlar ro‘yxati</p>
          </div>

          <button onClick={() => setOpenAdd(true)}>+ Yangi bron</button>
        </div>

        {/* HEADER DESKTOP */}
        {/* <div className="sb-head">
        <div className="col col-user">Ism</div>
        <div className="col col-date">Kirish</div>
        <div className="col col-room">Xona</div>
        <div className="col col-duration">Davomiylik</div>
        <div className="col col-price">Narx</div>
        <div className="col col-action"></div>
      </div> */}

        {/* LIST */}
        {sortedBookings.length === 0 ? (
          <div className="sb-empty">Hozircha bronlar yo‘q</div>
        ) : (
          sortedBookings.map((b, i) => (
            <div className="sb-row" key={b.id}>
              <div className="sb-strip"></div>

              <div className="sb-card">
                {/* TOP */}
                <div className="sb-card__top">
                  <div className="user">
                    <span className="num">{i + 1}</span>

                    <div>
                      <h3>
                        {b.firstName} {b.lastName}
                      </h3>
                      <p>{b.phone}</p>
                    </div>
                  </div>

                  <button
                    className="menu"
                    onClick={() => setSelectedBooking(b)}
                  >
                    ⋮
                  </button>
                </div>

                {/* DATE */}
                <div className="sb-card__date">
                  <span>📅</span>
                  <h2>{formatDate(b.date, b.time)}</h2>
                </div>

                {/* CHIPS */}
                <div className="sb-card__chips">
                  <div className="chip">🛏 {b.room}</div>
                  <div className="chip">⏱ {b.duration}</div>
                </div>

                {/* ✅ PAYMENT STATUS */}
                <div className="sb-card__status">
                  <FaCheckCircle />
                  <span>To‘lov tasdiqlangan</span>
                </div>

                {/* PRICE */}
                <div className="sb-card__price">
                  <span>💶 Price</span>
                  <h1>{b.price}€</h1>
                </div>
              </div>
            </div>
          ))
        )}

        <StaffAddModal
          isOpen={openAdd}
          onClose={() => setOpenAdd(false)}
          onAdd={handleAdd}
        />

        <StaffBookingModal
          booking={selectedBooking}
          onClose={() => setSelectedBooking(null)}
          onDelete={handleDelete}
        />
      </div>
    </div>
  );
};

export default StaffBookings;
