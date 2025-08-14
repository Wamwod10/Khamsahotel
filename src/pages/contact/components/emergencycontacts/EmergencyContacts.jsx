import "./emergencycontacts.scss";
import { BiError } from "react-icons/bi";
import {
  IoCall,
  IoCallOutline,
  IoCopyOutline
} from "react-icons/io5";
import { FaCheck, FaWhatsapp } from "react-icons/fa6";
import { useState } from "react";

const EmergencyContacts = () => {
  const phoneNumbers = [
    {
      title: "Reception",
      number: "+998 71 123 4567",
      buttonText: "Call Now",
      icon: <IoCall className="emergency__call-icon" />,
    },
    {
      title: "Reservations",
      number: "+998 71 765 4321",
      buttonText: "Call Now",
      icon: <IoCallOutline className="emergency__call-icon" />,
    },
    {
      title: "WhatsApp",
      number: "+998 71 111 2233",
      buttonText: "WhatsApp",
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
            <h2 className="emergency__title">Emergency Contact</h2>
            <p className="emergency__text-number">
              24/7 Emergency: +998 71 123 4567
            </p>
          </div>
        </div>

        <div className="emergency__phone-box">
          <h2 className="emergency__phone-title">Phone Numbers</h2>
          <div className="emergency__box-phone">
            {phoneNumbers.map((phone, index) => (
              <div className="emergency__phone-div" key={index}>
                <a className="emergency__link" href="#">
                  {phone.icon}
                </a>

                <div className="emergency__numb-div">
                  <h2 className="emergency__numb-title">{phone.title}</h2>
                  <p className="emergency__numb-text">{phone.number}</p>
                </div>

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
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmergencyContacts;
