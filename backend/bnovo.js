// bnovo.js
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const { BNOVO_API_KEY } = process.env;

if (!BNOVO_API_KEY) {
  console.error("❌ BNOVO_API_KEY .env faylida yo‘q!");
  process.exit(1);
}

const VITE_API_BASE_URL = "https://api.bnovo.com/v1";

// 🔹 Bnovo bilan so‘rov yuborish helper funksiyasi
async function bnovoRequest(endpoint, method = "GET", body = null) {
  const url = `${VITE_API_BASE_URL}${endpoint}`;
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${BNOVO_API_KEY}`,
  };

  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);

  try {
    const res = await fetch(url, options);
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(`Bnovo noto‘g‘ri javob: ${text}`);
    }
    if (!res.ok) {
      throw new Error(`Bnovo xatolik: ${data.message || text}`);
    }
    return data;
  } catch (err) {
    console.error("❌ Bnovo API so‘rovida xatolik:", err.message || err);
    throw err;
  }
}

// 🔹 Xonalar ro‘yxatini olish
export async function getRooms() {
  return await bnovoRequest("/rooms", "GET");
}

// 🔹 Xona narxini olish
export async function getRoomPrice(roomId, checkIn, duration) {
  return await bnovoRequest(
    `/rooms/${roomId}/price?checkIn=${checkIn}&duration=${duration}`,
    "GET"
  );
}

// 🔹 Bron yaratish
export async function createBooking(bookingData) {
  return await bnovoRequest("/bookings", "POST", bookingData);
}
