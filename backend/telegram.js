// telegram.js
import TelegramBot from "node-telegram-bot-api";
import dotenv from "dotenv";

dotenv.config();

const { TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID } = process.env;

if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
  console.error("❌ Telegram token yoki chat ID .env faylda yo‘q!");
  process.exit(1);
}

const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: false });

/**
 * Telegramga booking haqidagi ma'lumotlarni yuborish
 * @param {Object} data - booking ma'lumotlari
 * @returns {Promise<boolean>} - muvaffaqiyat holati
 */
export async function sendTelegramMessage(data) {
  if (!bot || !TELEGRAM_CHAT_ID) return false;

  const {
    firstName = "-",
    lastName = "-",
    email = "-",
    phone = "-",
    price = "-",
    rooms = "-",
    checkIn = "-",
    checkOut = "-",
    createdAt = "-",
    _id = "-"
  } = data;

  // Telegram xabar matni Markdown formatida
  const message = `
📢 *Yangi Buyurtma (Khamsa Hotel)*

👤 *Ism:* ${firstName}
👤 *Familiya:* ${lastName}
📧 *Email:* ${email}
📞 *Telefon:* ${phone}
💶 *Narxi:* ${price} UZS

🛏 *Xona turi:* ${rooms}
📅 *Check-in:* ${checkIn}
📅 *Check-out:* ${checkOut}
🆔 *Booking ID:* ${_id}
🕒 *Buyurtma vaqti:* ${new Date(createdAt).toLocaleString()}
  `.trim();

  try {
    await bot.sendMessage(TELEGRAM_CHAT_ID, message, { parse_mode: "Markdown" });
    console.log("✅ Telegramga xabar yuborildi");
    return true;
  } catch (error) {
    console.error("❌ Telegramga xabar yuborishda xatolik:", error);
    return false;
  }
}
