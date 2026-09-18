import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./stafflogin.scss";
import { adminLogin, clearAdminToken, getAdminToken, validateAdminSession } from "../staffApi";

const StaffLogin = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let alive = true;
    if (!getAdminToken()) return undefined;

    validateAdminSession()
      .then(() => {
        if (alive) navigate("/admin/bookings", { replace: true });
      })
      .catch(() => {
        clearAdminToken();
      });

    return () => {
      alive = false;
    };
  }, [navigate]);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await adminLogin(form.username, form.password);
      navigate("/admin/bookings", { replace: true });
    } catch (err) {
      setError(err?.message === "Invalid credentials" ? "Username yoki parol noto‘g‘ri" : "Kirish amalga oshmadi");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="staff-login">
      <div className="staff-login__container">
        <div className="staff-login__card">
          <h2 className="staff-login__title">Admin Panel</h2>
          <p className="staff-login__subtitle">Khamsa Hotel Management System</p>
          <form onSubmit={handleSubmit} className="staff-login__form">
            <div className="staff-login__group">
              <label>Username</label>
              <input type="text" name="username" placeholder="Enter username" value={form.username} onChange={handleChange} autoComplete="username" required />
            </div>
            <div className="staff-login__group">
              <label>Password</label>
              <input type="password" name="password" placeholder="Enter password" value={form.password} onChange={handleChange} autoComplete="current-password" required />
            </div>
            {error && <div className="staff-login__error">{error}</div>}
            <button type="submit" className="staff-login__btn" disabled={loading}>{loading ? "Login..." : "Login"}</button>
          </form>
          <div className="staff-login__footer">© 2026 Khamsa Hotel</div>
        </div>
      </div>
    </div>
  );
};

export default StaffLogin;
