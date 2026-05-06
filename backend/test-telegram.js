import axios from "axios";
import dotenv from "dotenv";
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STORE_PATH = path.join(__dirname, "telegram-message-ids.json");

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

async function readStoredMessageIds() {
  try {
    const raw = await fs.readFile(STORE_PATH, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}

async function writeStoredMessageIds(items) {
  await fs.writeFile(STORE_PATH, JSON.stringify(items, null, 2), "utf8");
}

async function storeMessageId(messageId) {
  const existing = await readStoredMessageIds();
  const entry = {
    message_id: messageId,
    chat_id: CHAT_ID,
    saved_at: new Date().toISOString(),
  };
  existing.push(entry);
  await writeStoredMessageIds(existing);
  return entry;
}

async function sendTelegramMessage(message) {
  if (!BOT_TOKEN || !CHAT_ID) {
    throw new Error("TELEGRAM_BOT_TOKEN yoki TELEGRAM_CHAT_ID topilmadi");
  }

  const response = await axios.post(`${TELEGRAM_API}/sendMessage`, {
    chat_id: CHAT_ID,
    text: message,
    parse_mode: "HTML",
  });

  const payload = response.data;
  if (!payload?.ok || !payload?.result?.message_id) {
    throw new Error(
      `Telegram sendMessage xatosi: ${JSON.stringify(payload)}`,
    );
  }

  const messageId = payload.result.message_id;
  console.log("Telegram response:", payload);
  console.log("Yuborilgan message_id:", messageId);

  const stored = await storeMessageId(messageId);
  console.log("Saqlangan entry:", stored);

  return { payload, messageId, stored };
}

async function deleteTelegramMessage(messageId) {
  if (!BOT_TOKEN || !CHAT_ID) {
    throw new Error("TELEGRAM_BOT_TOKEN yoki TELEGRAM_CHAT_ID topilmadi");
  }

  const response = await axios.post(`${TELEGRAM_API}/deleteMessage`, {
    chat_id: CHAT_ID,
    message_id: messageId,
  });

  const payload = response.data;
  if (!payload?.ok) {
    throw new Error(
      `Telegram deleteMessage xatosi: ${JSON.stringify(payload)}`,
    );
  }

  console.log(`Ochirildi: message_id=${messageId}`);
  return payload;
}

async function deleteLastStoredMessages(limit = 3) {
  const existing = await readStoredMessageIds();
  if (!existing.length) {
    console.log("O'chirish uchun saqlangan message_id yo'q.");
    return [];
  }

  const targets = existing.slice(-limit);
  const remaining = existing.slice(0, Math.max(0, existing.length - targets.length));

  for (const item of targets.reverse()) {
    await deleteTelegramMessage(item.message_id);
  }

  await writeStoredMessageIds(remaining);
  console.log(`Saqlovdan olib tashlandi: ${targets.length} ta xabar`);
  return targets;
}

async function main() {
  const mode = process.argv[2] || "send";

  try {
    if (mode === "delete-last-3") {
      await deleteLastStoredMessages(3);
      return;
    }

    const testMessage =
      process.argv.slice(2).join(" ") || "✅ Khamsa Bot is Running";
    await sendTelegramMessage(testMessage);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error("Axios error:", error.response?.data || error.message);
      return;
    }
    console.error("Telegram script error:", error.message || error);
  }
}

main();
