import React, { useState } from "react";
import "./sendmessage.scss";
import { LuSend } from "react-icons/lu";
import { FaChevronDown } from "react-icons/fa";
import { useTranslation } from "react-i18next";

const SendMessage = () => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    method: "",
    message: "",
  });

  const BOT_TOKEN = "8266378942:AAGYLpPRnn9g_n6QB6acyPNYTUIOa-QGIfM";
  const CHAT_ID = "-100294443729"; // O'zingning Telegram ID

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const text = `
📩 Yangi xabar:
👤 Ism: ${formData.fullName}
📧 Email: ${formData.email}
📞 Telefon: ${formData.phone}
💬 Aloqa usuli: ${formData.method}
📝 Xabar: ${formData.message}
    `;

    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: -100294443729,
        text,
      }),
    });

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
  };

  // 🔹 Barcha inputlar to‘ldirilganini tekshirish
  const isFormValid =
    formData.fullName.trim() !== "" &&
    formData.email.trim() !== "" &&
    formData.phone.trim() !== "" &&
    formData.method.trim() !== "" &&
    formData.message.trim() !== "";

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
                <button type="submit" disabled={!isFormValid}>
                  {t("sendMessage.sendButton")} <LuSend />
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SendMessage;
