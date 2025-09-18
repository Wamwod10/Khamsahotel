import "./emergencycontacts.scss";
import { BiError } from "react-icons/bi";
import { IoCall, IoCallOutline, IoCopyOutline } from "react-icons/io5";
import { FaCheck, FaWhatsapp } from "react-icons/fa6";
import { useState } from "react";
import { useTranslation } from "react-i18next";

const EmergencyContacts = () => {
  const { t } = useTranslation();

  const phoneNumbers = [
    {
      title: t("emergency_reception_title"),
      number: t("emergency_reception_number"),
      buttonText: t("emergency_reception_button"),
      icon: <IoCall className="emergency__call-icon" />,
    },
    {
      title: t("emergency_reservations_title"),
      number: t("emergency_reservations_number"),
      buttonText: t("emergency_reservations_button"),
      icon: <IoCallOutline className="emergency__call-icon" />,
    },
    {
      title: t("emergency_whatsapp_title"),
      number: t("emergency_whatsapp_number"),
      buttonText: t("emergency_whatsapp_button"),
      icon: <FaWhatsapp className="emergency__call-icon" />,
    },
  ];

  const [copiedStates, setCopiedStates] = useState(
    Array(phoneNumbers.length).fill(false)
  );

  const handleCopy = (number, index) => {
    navigator.clipboard
      .writeText(number)
      .then(() => {
        setCopiedStates((prev) => {
          const updated = [...prev];
          updated[index] = true;
          return updated;
        });

        setTimeout(() => {
          setCopiedStates((prev) => {
            const updated = [...prev];
            updated[index] = false;
            return updated;
          });
        }, 2000);
      })
      .catch((err) => {
        console.error("Copy failed:", err);
      });
  };

  return (
    <div className="emergency">
      <div className="container">
        <div className="emergency__box">
          <div>
            <BiError className="emergency__icon" />
          </div>
          <div className="emergency__text-box">
            <h2 className="emergency__title">{t("emergency_title")}</h2>
            <p className="emergency__text-number">
              {t("emergency_text_number")}
            </p>
          </div>
        </div>

        <div className="emergency__phone-box">
          <h2 className="emergency__phone-title">{t("emergency_phone_title")}</h2>
          <div className="emergency__box-phone">
            {phoneNumbers.map((phone, index) => (
              <div className="emergency__phone-div" key={index}>
                <div className="emergency__extra-div">
                  <a className="emergency__link" href="#">
                    {phone.icon}
                  </a>

                  <div className="emergency__numb-div">
                    <h2 className="emergency__numb-title">{phone.title}</h2>
                    <p className="emergency__numb-text">{phone.number}</p>
                  </div>
                </div>

                <div className="emergency__extra-div">
                  <button
                    onClick={() => handleCopy(phone.number, index)}
                    className="emergency__copy-btn"
                  >
                    {copiedStates[index] ? (
                      <FaCheck className="emergency__check-icon" />
                    ) : (
                      <IoCopyOutline className="emergency__copy-icon" />
                    )}
                  </button>

                  <a
                    href={`tel:${phone.number.replace(/\s/g, "")}`}
                    className="emergency__phone-link"
                  >
                    <IoCallOutline className="emergency__link-icon" />
                    {phone.buttonText}
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmergencyContacts;
