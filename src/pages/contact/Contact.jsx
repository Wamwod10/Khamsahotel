import React from "react";

import "./contact.scss";
import ContactHeader from "./components/contactheader/ContactHeader";
import EmergencyContacts from "./components/emergencycontacts/EmergencyContacts";
import EmailAddresses from "./components/emailadresses/EmailAddresses";
import HotelAddress from "./components/hotelladresses/HotelAddress";
import OperatingHours from "./components/operatinghours/OperatingHours";
import ContactForm from "./components/contactform/ContactForm";
import FaqAccordion from "./components/faqaccordion/FaqAccordion";
import AlternativeContacts from "./components/alternativecontacts/AlternativeContacts";
import SendMessage from "./components/sendmessage/SendMessage";

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
        </div>
        <div className="right-side">
          <ContactForm />
          <SendMessage />
        </div>
      </div>
      <FaqAccordion />
      <AlternativeContacts />
    </div>
  );
};

export default Contact;
