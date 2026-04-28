import React, { useState, useEffect } from "react";
import "./staff.scss";

const API_URL = "https://khamsa-backend.onrender.com";

const StaffAddModal = ({ isOpen, onClose, onAdd }) => {
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    date: "",
    time: "",
    room: "STANDARD",
    duration: "3 soat",
    price: "",
  });

  /* 🔒 BODY LOCK */
  useEffect(() => {
    if (isOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev || "auto";
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  /* ================= SUBMIT ================= */
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.firstName || !form.phone || !form.date) {
      alert("Majburiy maydonlarni to‘ldiring");
      return;
    }

    try {
      setLoading(true);

      const startAt = `${form.date}T${form.time || "00:00"}`;

      /* 🔥 duration → hours */
      let hours = 3;
      if (form.duration.includes("10")) hours = 10;
      if (form.duration.includes("1 kun")) hours = 24;

      const endDate = new Date(startAt);
      endDate.setHours(endDate.getHours() + hours);

      const endAt = endDate.toISOString();

      const payload = {
        roomType: form.room,
        startAt,
        endAt,
        firstName: form.firstName,
        lastName: form.lastName,
        phone: form.phone,
        email: form.email,
        price: Number(form.price) || 0, // ✅ FIX
        duration: hours,
      };

      /* ✅ REQUEST */
      const res = await fetch(`${API_URL}/api/checkins/full`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!data.ok) {
        alert("Xona band yoki xatolik bor");
        return;
      }

      /* 🔥 FIX: parent refresh */
      onAdd(payload); // ✅ FIX

      /* 🔥 close */
      onClose();

      /* 🔥 reset */
      setForm({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        date: "",
        time: "",
        room: "STANDARD",
        duration: "3 soat",
        price: "",
      });
    } catch (e) {
      console.error("Add booking error:", e);
      alert("Xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="staff-modal">
      <div className="staff-modal__overlay" onClick={onClose}></div>

      <div className="staff-modal__content">
        <h2>Yangi bron qo‘shish</h2>

        <form onSubmit={handleSubmit} className="staff-modal__form">
          {/* NAME */}
          <div className="grid">
            <div className="field">
              <label>Ism *</label>
              <input
                name="firstName"
                value={form.firstName}
                onChange={handleChange}
              />
            </div>

            <div className="field">
              <label>Familiya</label>
              <input
                name="lastName"
                value={form.lastName}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* CONTACT */}
          <div className="field">
            <label>Telefon *</label>
            <input name="phone" value={form.phone} onChange={handleChange} />
          </div>

          <div className="field">
            <label>Email</label>
            <input name="email" value={form.email} onChange={handleChange} />
          </div>

          {/* DATE */}
          <div className="grid">
            <div className="field">
              <label>Kirish sanasi *</label>
              <input
                type="date"
                name="date"
                value={form.date}
                onChange={handleChange}
              />
            </div>

            <div className="field">
              <label>Kirish vaqti</label>
              <input
                type="time"
                name="time"
                value={form.time}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* ROOM */}
          <div className="grid">
            <div className="field">
              <label>Xona</label>
              <select name="room" value={form.room} onChange={handleChange}>
                <option value="STANDARD">STANDARD</option>
                <option value="FAMILY">FAMILY</option>
              </select>
            </div>

            <div className="field">
              <label>Davomiylik</label>
              <select
                name="duration"
                value={form.duration}
                onChange={handleChange}
              >
                <option>3 soat</option>
                <option>10 soat</option>
                <option>1 kun</option>
              </select>
            </div>
          </div>

          {/* PRICE */}
          <div className="field">
            <label>Narx (€)</label>
            <div className="price-options">
              {[45, 70, 80, 115, 175].map((p) => (
                <button
                  key={p}
                  type="button"
                  className={form.price == p ? "active" : ""}
                  onClick={() => setForm((prev) => ({ ...prev, price: p }))}
                >
                  {p}€
                </button>
              ))}
            </div>
          </div>

          {/* ACTIONS */}
          <div className="staff-modal__actions">
            <button type="submit" className="primary" disabled={loading}>
              {loading ? "Saqlanmoqda..." : "Saqlash"}
            </button>

            <button type="button" onClick={onClose}>
              Bekor qilish
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StaffAddModal;
