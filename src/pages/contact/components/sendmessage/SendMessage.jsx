// src/components/SendMessage.jsx
import React, { useState, useMemo } from "react";
import "./sendmessage.scss";
import { LuSend } from "react-icons/lu";
import { FaChevronDown } from "react-icons/fa";
import { useTranslation } from "react-i18next";

/* ============== Helpers ============== */
function getApiBase() {
  const env =
    (import.meta?.env && import.meta.env.VITE_API_BASE_URL) ||
    (typeof process !== "undefined" && process.env?.REACT_APP_API_BASE_URL) ||
    "";
  const fallback = "https://khamsa-backend.onrender.com";
  return (env || fallback).replace(/\/+$/, "");
}

async function safeFetchJson(input, init) {
  const res = await fetch(input, init);
  const ct = res.headers.get("content-type") || "";
  let data;
  try {
    data = ct.includes("application/json") ? await res.json() : await res.text();
  } catch {
    data = await res.text().catch(() => "");
  }
  return { ok: res.ok, status: res.status, data };
}

function fastHash(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = (h * 33) ^ str.charCodeAt(i);
  return (h >>> 0).toString(36);
}

function stableStringify(obj) {
  if (obj === null || typeof obj !== "object") return JSON.stringify(obj);
  if (Array.isArray(obj)) return `[${obj.map(stableStringify).join(",")}]`;
  const keys = Object.keys(obj).sort();
  return `{${keys
    .map((k) => JSON.stringify(k) + ":" + stableStringify(obj[k]))
    .join(",")}}`;
}

/* ============== Optional: Telegram (env bo'lsa yuboradi) ============== */
const TG_TOKEN = import.meta?.env?.VITE_TG_BOT_TOKEN || "";
const TG_CHAT_ID = import.meta?.env?.VITE_TG_CHAT_ID || "";

async function maybeSendTelegram(text) {
  if (!TG_TOKEN || !TG_CHAT_ID) return { ok: true, skipped: true };
  try {
    const r = await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TG_CHAT_ID, // supergroup/channel bo'lsa -100... minus bilan bo'ladi
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok || data?.ok === false) {
      console.warn("Telegram send failed:", data);
      return { ok: false, status: r.status, data };
    }
    return { ok: true, data };
  } catch (e) {
    console.warn("Telegram network error:", e);
    return { ok: false };
  }
}

/* ============== Component ============== */
const SendMessage = () => {
  const { t } = useTranslation();
  const API_BASE = useMemo(getApiBase, []);

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    method: "",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);

  // Qabul qiluvchi email (admin pochta) — frontend .env orqali sozlasangiz yaxshi:
  // VITE_CONTACT_TO yo'q bo'lsa, fallback sifatida sizning ADMIN emailingiz
  const CONTACT_TO =
    import.meta?.env?.VITE_CONTACT_TO || "shamshodochilov160@gmail.com";

  const handleChange = (e) => {
    setFormData((s) => ({ ...s, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);

    try {
      // Email matni
      const emailText = `
📩 New contact message (khamsahotel.uz)

👤 Full name: ${formData.fullName}
📧 Email: ${formData.email}
📞 Phone: ${formData.phone}
🔗 Preferred method: ${formData.method}
📝 Message:
${formData.message}
      `.trim();

      // Idempotency kaliti (bir xil xabarni 2 marta bosib yuborsa ham dublikat bo'lmasin)
      const idemKey = fastHash(
        stableStringify({
          to: CONTACT_TO,
          kind: "contact-form",
          fullName: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          method: formData.method,
          message: formData.message,
        })
      );

      // 1) Gmail (backend orqali)
      const emailRes = await safeFetchJson(`${API_BASE}/send-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idemKey,
        },
        body: JSON.stringify({
          to: CONTACT_TO,
          subject: "Khamsa: New Contact Message",
          text: emailText,
          idempotencyKey: idemKey,
        }),
      });

      if (!emailRes.ok) {
        // Backend logini ko'rish uchun kichik yordam:
        console.error("send-email failed:", emailRes);
        alert(
          `Email yuborilmadi. Status: ${emailRes.status}\n` +
            (typeof emailRes.data === "string"
              ? emailRes.data
              : JSON.stringify(emailRes.data, null, 2))
        );
        setSubmitting(false);
        return;
      }

      // 2) (Ixtiyoriy) Telegramga ham nusxa
      await maybeSendTelegram(
        `<b>New contact</b>\n` +
          `👤 <b>Name:</b> ${formData.fullName}\n` +
          `📧 <b>Email:</b> ${formData.email}\n` +
          `📞 <b>Phone:</b> ${formData.phone}\n` +
          `🔗 <b>Method:</b> ${formData.method}\n` +
          `📝 <b>Message:</b>\n${formData.message}`
      );

      alert("Xabaringiz yuborildi ✅");

      // Formani tozalash
      setFormData({
        fullName: "",
        email: "",
        phone: "",
        method: "",
        message: "",
      });
      e.target.reset();
    } catch (err) {
      console.error("submit error:", err);
      alert("Xabar yuborishda xatolik. Qayta urinib ko‘ring.");
    } finally {
      setSubmitting(false);
    }
  };

  const isFormValid =
    formData.fullName.trim() &&
    formData.email.trim() &&
    formData.phone.trim() &&
    formData.method.trim() &&
    formData.message.trim();

  return (
    <div className="sendmessage">
      <div className="container">
        <div className="sendmessage__box">
          <h2 className="sendmessage__title">{t("sendMessage.title")}</h2>
          <p className="sendmessage__text">{t("sendMessage.text")}</p>

          <form className="sendmessage-form" onSubmit={handleSubmit}>
            <div className="sendmessage__form-group">
              <label>{t("sendMessage.fullName")}</label>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                placeholder={t("sendMessage.fullNamePlaceholder")}
                required
              />
            </div>

            <div className="sendmessage__form-group">
              <label>{t("sendMessage.email")}</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder={t("sendMessage.emailPlaceholder")}
                required
              />
            </div>

            <div className="sendmessage__form-group">
              <label>{t("sendMessage.phone")}</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder={t("sendMessage.phonePlaceholder")}
                required
              />
            </div>

            <div className="sendmessage__form-group">
              <label>{t("sendMessage.contactMethod")}</label>
              <select
                name="method"
                value={formData.method}
                onChange={handleChange}
                required
              >
                <option value="" disabled>
                  {t("sendMessage.selectMethod")}
                </option>
                <option value="telegram">Telegram</option>
                <option value="email">Email</option>
                <option value="whatsapp">WhatsApp</option>
              </select>
              <FaChevronDown className="select-icon" />
            </div>

            <div className="sendmessage__form">
              <label>{t("sendMessage.message")}</label>
              <textarea
                name="message"
                value={formData.message}
                onChange={handleChange}
                placeholder={t("sendMessage.messagePlaceholder")}
                required
              />
              <div className="sendmessage__form-but">
                <button type="submit" disabled={!isFormValid || submitting}>
                  {submitting ? t("sendMessage.sending") || "Yuborilmoqda..." : t("sendMessage.sendButton")}
                  <LuSend />
                </button>
              </div>
            </div>
          </form>

          {/* Ixtiyoriy: qabul qiluvchi emailni ko'rinmas holda tutib turish (debug uchun) */}
          {/* <small style={{opacity:0.5}}>to: {CONTACT_TO}</small> */}
        </div>
      </div>
    </div>
  );
};

export default SendMessage;
