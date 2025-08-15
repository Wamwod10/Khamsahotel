import React from "react";
import { FaLocationArrow } from "react-icons/fa6";
import "./contactform.scss";

const ContactForm = () => {
  return (
    <div className="contactform">
      <div className="container">
        <div className="contactform__box">
          <div className="contactform__title-box">
            <h2 className="contactform__title">Hotel Location</h2>
            <a href="#" className="contactform__link">
              <FaLocationArrow /> Get Directions
            </a>
          </div>
          <div className="contactform__map-box">
            <iframe className="contactform__map" src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3690.3675170215124!2d69.26492267653826!3d41.26194300376614!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x38ae61007cb3de3b%3A0x62705b2323c597e!2sKhamsa%20hotel%20taschkent%20airoport!5e1!3m2!1sru!2s!4v1755263956865!5m2!1sru!2s"
            allowfullscreen=""
            loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>

            <div className="contactform__map-div">
              <h3 className="contactform__map-title">Khamsa Hotel</h3>
              <p className="contactform__map-text">
                Tashkent International Airport, Departure Area, 2nd Floor
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactForm;
