import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

async function testTelegram() {
  if (!TOKEN || !CHAT_ID) {
    console.error("❌ TOKEN yoki CHAT_ID yo'q (.env ni tekshir)");
    return;
  }

  try {
    console.log("🚀 Telegram test boshlanyapti...");

    const res = await fetch(
      `https://api.telegram.org/bot${TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chat_id: CHAT_ID,
          text: "✅ Khamsa Bot is Running",
          parse_mode: "HTML",
        }),
      },
    );

    const data = await res.json();

    if (data.ok) {
      console.log("✅ Telegram ishlayapti!");
      console.log("Message ID:", data.result.message_id);
    } else {
      console.error("❌ Telegram API error:");
      console.error(data);
    }
  } catch (error) {
    console.error("❌ Fetch error:", error.message);
  }
}

testTelegram();
