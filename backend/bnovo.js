import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config();

const BNOVO_API_KEY = process.env.BNOVO_API_KEY;
const BNOVO_API_BASE = process.env.BNOVO_API_BASE;

if (!BNOVO_API_KEY || !BNOVO_API_BASE) {
  console.error("❌ Bnovo API uchun .env faylida ma'lumotlar yo'q, kelmayapti");
  process.exit(1);
}

export async function createBookingInBnovo(bookingPayload) {
  try {
    const response = await fetch(`${BNOVO_API_BASE}/v1/reservations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": BNOVO_API_KEY,
      },
      body: JSON.stringify(bookingPayload),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("❌ Bnovo API xatosi:", data);
      throw new Error("Bnovo API xatosi");
    }

    console.log("✅ Bnovo javobi:", data);
    return data;
  } catch (error) {
    console.error("❌ createBookingInBnovo xatolik:", error.message || error);
    throw error;
  }
}
