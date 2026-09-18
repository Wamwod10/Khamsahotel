import React, { useEffect, useState } from "react";
import "./login.scss";
import { RxEyeOpen } from "react-icons/rx";
import { LuEyeClosed } from "react-icons/lu";
import Checkin from "../checkin/Checkin";
import { adminLogin, getAdminToken } from "../../staff/staffApi";

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(Boolean(getAdminToken()));
  const [loading, setLoading] = useState(false);

  useEffect(() => setIsLoggedIn(Boolean(getAdminToken())), []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError("Iltimos, barcha maydonlarni to‘ldiring.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await adminLogin(username, password);
      setIsLoggedIn(true);
    } catch {
      setError("Username yoki parol noto‘g‘ri!");
    } finally {
      setLoading(false);
    }
  };

  if (isLoggedIn) return <Checkin />;

  return (
    <div className="login">
      <form className="form" onSubmit={handleSubmit}>
        <p className="form-title">Sign in to your account</p>
        {error && <p style={{ color: "red", textAlign: "center" }}>{error}</p>}
        <div className="input-container">
          <input placeholder="Enter username" type="text" value={username} autoComplete="username" onChange={(e) => { setError(""); setUsername(e.target.value); }} />
        </div>
        <div className="input-container">
          <input placeholder="Enter password" type={showPassword ? "text" : "password"} value={password} autoComplete="current-password" onChange={(e) => { setError(""); setPassword(e.target.value); }} />
          <span onClick={() => setShowPassword(!showPassword)} style={{ cursor: "pointer" }}>{showPassword ? <LuEyeClosed /> : <RxEyeOpen />}</span>
        </div>
        <button className="submit" type="submit" disabled={loading}>{loading ? "Signing in..." : "Sign in"}</button>
      </form>
    </div>
  );
};

export default Login;
