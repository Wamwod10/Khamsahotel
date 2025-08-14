import React from "react";
import { AiOutlineWarning, AiOutlinePhone } from "react-icons/ai";
import "./contactheader.scss";

const ContactHeader = () => {
  return (
    <section className="contact-header">
      <div className="container">
        <h2 className="contact-header__title">Contact & Location</h2>
        <p className="contact-header__subtitle">
          We're here to help you with any questions or assistance you may need
        </p>

        <div className="contact-alert">
          <div className="contact-alert__info">
            <AiOutlineWarning className="contact-alert__icon" />
            <div className="contact-alert__text">
              <p className="contact-alert__main-text">
                For urgent matters or emergencies, please call our 24/7 hotline
              </p>
              <p className="contact-alert__number">+998 95 877 24 24</p>
            </div>
          </div>
          <button className="contact-alert__button">
            <AiOutlinePhone className="contact-alert__button-icon" />
            Call Now
          </button>
        </div>
      </div>
    </section>
  );
};

export default ContactHeader;
