import React from "react";

import "./contact.scss";
import ContactHeader from "./components/contactheader/ContactHeader";
import EmergencyContacts from "./components/emergencycontacts/EmergencyContacts";
import EmailAddresses from "./components/emailadresses/EmailAddresses";
import HotelAddress from "./components/hotelladresses/HotelAddress";
import OperatingHours from "./components/operatinghours/OperatingHours";
import SocialMediaLinks from "./components/socialmedialinks/SocialMediaLinks";
import ContactForm from "./components/contactform/ContactForm";
import FaqAccordion from "./components/faqaccordion/FaqAccordion";
import AlternativeContacts from "./components/alternativecontacts/AlternativeContacts";

const Contact = () => {
  return (
    <div className="contact-page container">
      <ContactHeader />
      <div className="contact-main">
        <div className="left-side">
          <EmergencyContacts />
          <EmailAddresses />
          <HotelAddress />
          <OperatingHours />
          <SocialMediaLinks />
        </div>
        <div className="right-side">
          <ContactForm />
        </div>
      </div>
      <FaqAccordion />
      <AlternativeContacts />
    </div>
  );
};

export default Contact;
