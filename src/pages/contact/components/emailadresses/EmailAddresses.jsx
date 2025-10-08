import "./emailaddresses.scss";
import { HiOutlineMail } from "react-icons/hi";
import { BsCalendar3, BsHeadphones } from "react-icons/bs";
import { IoCopyOutline } from "react-icons/io5";
import { FaCheck } from "react-icons/fa6";
import { useState } from "react";
import { useTranslation } from "react-i18next";

const EmailAddresses = () => {
  const { t } = useTranslation();

  const emails = [
    {
      title: t("emailaddr_general_title"),
      email: "qonoqhotel@mail.ru",
      buttonText: t("emailaddr_button"),
      icon: <HiOutlineMail className="email__call-icon" />,
    },
    {
      title: t("emailaddr_reservations_title"),
      email: "booking@khamsahotel.uz",
      buttonText: t("emailaddr_button"),
      icon: <BsCalendar3 className="email__call-icon" />,
    },
    {
      title: t("emailaddr_support_title"),
      email: "support@khamsahotel.uz",
      buttonText: t("emailaddr_button"),
      icon: <BsHeadphones className="email__call-icon" />,
    },
  ];

  const [copiedStates, setCopiedStates] = useState(Array(emails.length).fill(false));

  const handleCopy = (email, index) => {
    navigator.clipboard.writeText(email)
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
    <div className="email">
      <div className="container">
        <div className="email__phone-box">
          <h2 className="email__phone-title">{t("emailaddr_title")}</h2>
          <div className="email__box-phone">
            {emails.map((item, index) => (
              <div className="email__phone-div" key={index}>
                <div className="emergency__extra-div">
                  <a className="email__link" href={`mailto:${item.email}`}>
                    {item.icon}
                  </a>

                  <div className="email__numb-div">
                    <h2 className="email__numb-title">{item.title}</h2>
                    <p className="email__numb-text">{item.email}</p>
                  </div>
                </div>

                <div className="emergency__extra-div">
                  <button
                    onClick={() => handleCopy(item.email, index)}
                    className="email__copy-btn"
                  >
                    {copiedStates[index] ? (
                      <FaCheck className="email__check-icon" />
                    ) : (
                      <IoCopyOutline className="email__copy-icon" />
                    )}
                  </button>

                  <a href={`mailto:${item.email}`} className="email__phone-link">
                    <HiOutlineMail className="email__link-icon" />
                    {item.buttonText}
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

export default EmailAddresses;
