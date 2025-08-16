import React from "react";
import "./sendmessage.scss";
import { LuSend } from "react-icons/lu";
import { FaChevronDown } from "react-icons/fa";
const SendMessage = () => {
  return (
    <div>
      <div className="sendmessage">
        <div className="container">
          <div className="sendmessage__box">
            <h2 className="sendmessage__title">Get in Touch</h2>
            <p className="sendmessage__text">
              Send us a message and we'll respond as soon as possible.
            </p>
            <div className="sendmessage-form">
              <div className="sendmessage__form-group">
                <label>Full Name </label>
                <input type="text" placeholder="John Doe" />
              </div>

              <div className="sendmessage__form-group">
                <label>Email Address </label>
                <input type="email" placeholder="john@example.com" />
              </div>

              <div className="sendmessage__form-group">
                <label>Phone Number </label>
                <input type="tel" placeholder="Phone Number" />
              </div>

              <div className="sendmessage__form-group">
                <label>Preferred Contact Method </label>
                <select defaultValue="">
                  <option className="option" value="" disabled>
                    Select a contact method
                  </option>
                  <option value="telegram">Telegram</option>
                  <option value="email">Email</option>
                  <option value="whatsapp">WhatsApp</option>
                 
                </select>
                 <FaChevronDown className="select-icon" />
              </div>

            </div>
            <div className="sendmessage__form">
              <label>Message</label>
              <textarea type="text" placeholder="Please describe your inquiry in detail..." />
              <div className="sendmessage__form-but">
                <button>
                  Send Message <LuSend />
                </button>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SendMessage;