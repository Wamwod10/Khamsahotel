import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./stafflogin.scss";

const StaffLogin = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    username: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // 🔐 STATIC LOGIN DATA
  const ADMIN_USERNAME = "Khamsa2026";
  const ADMIN_PASSWORD = "Khamsa@Secure2026!"; 

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
    setError("");
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);

    setTimeout(() => {
      if (
        form.username === ADMIN_USERNAME &&
        form.password === ADMIN_PASSWORD
      ) {
        localStorage.setItem("admin_auth", "true");
        navigate("/admin/bookings");
      } else {
        setError("Username yoki parol noto‘g‘ri");
      }

      setLoading(false);
    }, 800);
  };

  return (
    <div className="staff-login">
      <div className="staff-login__container">
        <div className="staff-login__card">
          <h2 className="staff-login__title">Admin Panel</h2>
          <p className="staff-login__subtitle">
            Khamsa Hotel Management System
          </p>

          <form onSubmit={handleSubmit} className="staff-login__form">
            <div className="staff-login__group">
              <label>Username</label>
              <input
                type="text"
                name="username"
                placeholder="Enter username"
                value={form.username}
                onChange={handleChange}
                required
              />
            </div>

            <div className="staff-login__group">
              <label>Password</label>
              <input
                type="password"
                name="password"
                placeholder="Enter password"
                value={form.password}
                onChange={handleChange}
                required
              />
            </div>

            {error && <div className="staff-login__error">{error}</div>}

            <button
              type="submit"
              className="staff-login__btn"
              disabled={loading}
            >
              {loading ? "Login..." : "Login"}
            </button>
          </form>

          <div className="staff-login__footer">
            © 2026 Khamsa Hotel
          </div>
        </div>
      </div>
    </div>
  );
};

export default StaffLogin;