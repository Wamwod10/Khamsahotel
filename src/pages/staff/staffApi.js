export function getStaffApiBase() {
  const isLocal =
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1");

  if (isLocal) return "http://127.0.0.1:5004";

  const isKhamsaProduction =
    typeof window !== "undefined" &&
    /(^|\.)khamsahotel\.uz$/i.test(window.location.hostname);

  if (isKhamsaProduction) return "/backend-api";

  const envBase = String(import.meta.env.VITE_API_BASE_URL || "").trim();
  return String(envBase || "https://khamsa-backend.onrender.com").replace(
    /\/+$/,
    "",
  );
}

const TOKEN_KEY = "khamsa_admin_token";

export function getAdminToken() {
  try {
    return sessionStorage.getItem(TOKEN_KEY) || "";
  } catch {
    return "";
  }
}

export function setAdminToken(token) {
  try {
    sessionStorage.setItem(TOKEN_KEY, String(token || ""));
  } catch {
    // Browser storage unavailable: the following protected request will fail safely.
  }
}

export function clearAdminToken() {
  try {
    sessionStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem("admin_auth");
  } catch {
    // Ignore storage cleanup errors.
  }
}

export async function adminLogin(username, password) {
  const res = await fetch(`${getStaffApiBase()}/api/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.token) {
    const error = new Error(data?.error || "Login failed");
    error.status = res.status;
    throw error;
  }

  setAdminToken(data.token);
  return data;
}

export async function validateAdminSession() {
  return adminFetch("/api/admin/session");
}

export async function adminFetch(pathOrUrl, init = {}) {
  const token = getAdminToken();
  if (!token) {
    const error = new Error("Unauthorized");
    error.status = 401;
    throw error;
  }

  const url = /^https?:\/\//i.test(pathOrUrl)
    ? pathOrUrl
    : `${getStaffApiBase()}${pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`}`;

  const headers = new Headers(init.headers || {});
  headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(url, { ...init, headers });

  if (res.status === 401 || res.status === 403) {
    clearAdminToken();
    const error = new Error("Unauthorized");
    error.status = res.status;
    throw error;
  }

  return res;
}
