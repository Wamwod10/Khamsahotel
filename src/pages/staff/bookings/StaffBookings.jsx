import React, { useState, useEffect, useMemo } from "react";
import "./staffbooking.scss";
import StaffAddModal from "../components/StaffAddModal";
import StaffBookingModal from "../components/StaffBookingModal";
import { FaCheckCircle } from "react-icons/fa";

const API_URL = "https://khamsa-backend.onrender.com";

const StaffBookings = () => {
  const [openAdd, setOpenAdd] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  /* ================= LOAD ================= */
  const fetchBookings = async () => {
    try {
      setLoading(true);

      const res = await fetch(`${API_URL}/api/checkins`);
      const data = await res.json();

      if (data.ok) {
        const mapped = data.items.map((b) => ({
          id: b.id,
          firstName: b.first_name || "",
          lastName: b.last_name || "",
          phone: b.phone || "",
          email: b.email || "",
          date: b.check_in ? b.check_in.split("T")[0] : "",
          time:
            b.check_in_time ||
            (b.check_in_at
              ? new Date(b.check_in_at).toTimeString().slice(0, 5)
              : ""),
          room: b.rooms,
          duration: b.duration ? `${b.duration} soat` : "-",
          price: b.price || 0,
          createdAt: b.created_at,
        }));

        setBookings(mapped);
      }
    } catch (e) {
      console.error("Fetch error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  /* ================= ADD ================= */
  const handleAdd = async (newBooking) => {
    try {
      const startAt = `${newBooking.date}T${newBooking.time || "00:00"}`;

      // 🔥 duration ni to‘g‘ri parse qilish
      let hours = 24;
      if (newBooking.duration.includes("3")) hours = 3;
      else if (newBooking.duration.includes("10")) hours = 10;
      else if (newBooking.duration.includes("kun")) hours = 24;

      const endDate = new Date(startAt);
      endDate.setHours(endDate.getHours() + hours);

      const endAt = endDate.toISOString();

      await fetch(`${API_URL}/api/checkins/full`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          roomType: newBooking.room,
          startAt,
          endAt,

          firstName: newBooking.firstName,
          lastName: newBooking.lastName,
          phone: newBooking.phone,
          email: newBooking.email,
          price: newBooking.price,
          duration: hours,
        }),
      });

      fetchBookings();
    } catch (e) {
      console.error("Add error:", e);
    }
  };

  /* ================= DELETE ================= */
  const handleDelete = async (id) => {
    try {
      await fetch(`${API_URL}/api/checkins/${id}`, {
        method: "DELETE",
      });

      setSelectedBooking(null);
      fetchBookings();
    } catch (e) {
      console.error("Delete error:", e);
    }
  };

  /* ================= SORT ================= */
  const sortedBookings = useMemo(() => {
    return [...bookings].sort((a, b) => {
      const A = new Date(`${a.date}T${a.time || "00:00"}`);
      const B = new Date(`${b.date}T${b.time || "00:00"}`);
      return B - A;
    });
  }, [bookings]);

  /* ================= FORMAT ================= */
  const formatDate = (date, time) => {
    if (!date) return "-";
    return `${date}${time ? ` (${time})` : ""}`;
  };

  return (
    <div className="sb">
      <div className="container">
        {/* HEADER */}
        <div className="sb-top">
          <div>
            <h1>Bookings</h1>
            <p>Khamsa Hotel bronlar ro‘yxati</p>
          </div>

          <button onClick={() => setOpenAdd(true)}>+ Yangi bron</button>
        </div>

        {/* CONTENT */}
        {loading ? (
          <div className="sb-empty">Yuklanmoqda...</div>
        ) : sortedBookings.length === 0 ? (
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

                {/* INFO */}
                <div className="sb-card__chips">
                  <div className="chip">🛏 {b.room}</div>
                  <div className="chip">⏱ {b.duration}</div>
                </div>

                {/* STATUS */}
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

        {/* MODALS */}
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
