import React, { useState } from "react";
import "./staff.scss";

const StaffAddModal = ({ isOpen, onClose, onAdd }) => {
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

  if (!isOpen) return null;

  const handleChange = (e) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!form.firstName || !form.phone || !form.date) {
      alert("Majburiy maydonlarni to‘ldiring");
      return;
    }

    const newBooking = {
      id: Date.now(),
      ...form,
      price: Number(form.price) || 0,
      createdAt: new Date().toISOString(),
    };

    onAdd(newBooking);
    onClose();

    // reset
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
  };

  return (
    <div className="staff-modal">
      <div className="staff-modal__overlay" onClick={onClose}></div>

      <div className="staff-modal__content">
        <h2>Yangi bron qo‘shish</h2>

        <form onSubmit={handleSubmit} className="staff-modal__form">
          <div className="grid">
            <div className="field">
              <label>Ism *</label>
              <input
                name="firstName"
                value={form.firstName}
                onChange={handleChange}
                placeholder="Ism"
              />
            </div>

            <div className="field">
              <label>Familiya</label>
              <input
                name="lastName"
                value={form.lastName}
                onChange={handleChange}
                placeholder="Familiya"
              />
            </div>
          </div>

          <div className="field">
            <label>Email</label>
            <input
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="Email"
            />
          </div>

          <div className="field">
            <label>Telefon *</label>
            <input
              name="phone"
              value={form.phone}
              onChange={handleChange}
              placeholder="+998..."
            />
          </div>

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

          <div className="field">
            <label>Narx (€)</label>

            <div className="price-options">
              {[45, 70, 80, 115, 175].map((p) => (
                <button
                  type="button"
                  key={p}
                  className={form.price == p ? "active" : ""}
                  onClick={() =>
                    setForm((prev) => ({
                      ...prev,
                      price: p,
                    }))
                  }
                >
                  {p}€
                </button>
              ))}
            </div>
          </div>

          <div className="staff-modal__actions">
            <button type="submit" className="primary">
              Saqlash
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
