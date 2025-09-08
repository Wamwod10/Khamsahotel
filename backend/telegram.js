// telegram.js
import TelegramBot from "node-telegram-bot-api";
import dotenv from "dotenv";

dotenv.config();

const { TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID } = process.env;

// Token va Chat ID mavjudligini tekshirish
if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
  console.error("❌ Telegram token yoki chat ID .env faylda yo‘q!");
  process.exit(1); // Botni ishga tushmasdan to‘xtatish
}

// Botni yaratish, polling o‘chirilgan, faqat yuborish uchun
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: false });

/**
 * Telegramga xabar yuborish funksiyasi
 * @param {Object} data - buyurtma haqida ma'lumot
 * @returns {Promise<boolean>} - muvaffaqiyat holati
 */
export async function sendTelegramMessage(data) {
  if (!bot || !TELEGRAM_CHAT_ID) return false;

  const {
    firstName = "-",
    lastName = "-",
    email = "-",
    phone = "-",
    amount = "-",
    checkIn = "-",
    checkInTime = "-",
    duration = "-",
    rooms = "-"
  } = data;

  // Telegram xabar matni (Markdown formatda)
  const message = `
📢 *Yangi Buyurtma (Khamsa Hotel)*

👤 *Ism:* ${firstName}
👤 *Familiya:* ${lastName}
📧 *Email:* ${email}
📞 *Telefon:* ${phone}
💶 *To'lov:* ${amount} EUR

🛏 *Xona turi:* ${rooms}
📅 *Check-in sana:* ${checkIn}
⏰ *Check-in vaqti:* ${checkInTime}
📆 *Qolish muddati:* ${duration}
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
