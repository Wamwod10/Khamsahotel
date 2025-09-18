// bnovo.js
import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

// Bnovo API instance
const bnovoApi = axios.create({
  baseURL: process.env.VITE_API_BASE_URL, // .env ichida yozilgan Bnovo bazaviy URL
  headers: {
    Authorization: `Bearer ${process.env.BNOVO_API_KEY}`, // API key kerak bo‘ladi
    "Content-Type": "application/json",
  },
});

// Booking yaratish funksiyasi
export async function createBooking(bookingData) {
  try {
    const response = await bnovoApi.post("/public-api/v1/reservations", bookingData);
    return response.data;
  } catch (error) {
    console.error("❌ Bnovo booking error:", error.response?.data || error.message);
    throw error;
  }
}

export default bnovoApi;
