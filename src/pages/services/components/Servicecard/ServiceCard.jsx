import React, { useState } from "react";
import { FaStar } from "react-icons/fa";
import "./servicecard.scss";
import {
  FaWifi,
  FaClock,
  FaBroom,
  FaCoffee,
  FaBan,
  FaSnowflake,
  FaCommentDots,
  FaChevronDown,
  FaChevronUp,
} from "react-icons/fa";

const services = [
  {
    id: 1,
    icon: <FaWifi />,
    title: "Free Wi-Fi",
    time: "24/7 Available",
    rating: "4.8",
    description:
      "Enjoy complimentary high-speed internet throughout the hotel.",
    details: [
      "Unlimited devices",
      "Secure connection",
      "High-speed downloads",
      "Coverage in all areas",
    ],
  },
  {
    id: 2,
    icon: <FaClock />,
    title: "24/7 Reception",
    time: "Always Open",
    rating: "4.9",
    description: "Front desk service available around the clock.",
    details: [
      "Multilingual staff",
      "Check-in/out anytime",
      "Concierge help",
      "Tourist info",
    ],
  },
  {
    id: 3,
    icon: <FaBroom />,
    title: "Daily Housekeeping",
    time: "08:00 - 20:00",
    rating: "4.9",
    description: "Rooms cleaned and maintained daily for your comfort.",
    details: [
      "Fresh linens",
      "Bathroom cleaning",
      "Towel replacement",
      "Dusting & vacuuming",
    ],
  },
  {
    id: 4,
    icon: <FaSnowflake />,
    title: "Air Conditioner",
    time: "Room Controlled",
    rating: "4.7",
    description: "Individual A/C in each room for optimal comfort.",
    details: [
      "Cooling & Heating",
      "Remote control",
      "Silent mode",
      "Fast cooling",
    ],
  },
  {
    id: 5,
    icon: <FaBan />,
    title: "Non-Smoking Rooms",
    time: "All Floors",
    rating: "5.0",
    description: "Healthy environment with smoke-free zones throughout.",
    details: [
      "All rooms non-smoking",
      "Fresh air system",
      "Smoke detectors",
      "Air purification",
    ],
  },
  {
    id: 6,
    icon: <FaCoffee />,
    title: "Hot Tea / Coffee",
    time: "06:00 - 23:00",
    rating: "4.6",
    description: "Unlimited tea and coffee available at lounge.",
    details: ["Freshly brewed", "Wide selection", "Free refills", "Served hot"],
  },
  {
    id: 7,
    icon: <FaCommentDots />,
    title: "Ironing Service",
    time: "On Request",
    rating: "4.7",
    description: "Quick and clean ironing service at your convenience.",
    details: [
      "Same-day delivery",
      "Shirts & pants",
      "Steam & press",
      "Delicate fabrics",
    ],
  },
];

const ServiceCard = () => {
  const [expandedId, setExpandedId] = useState(null);

  const toggleExpand = (id) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="servicecard">
      <div className="container">
        <h2 className="servicecard__title">Available Services</h2>
        <p className="servicecard__text">
          Discover our range of reliable and efficient services designed to support your business and personal needs.
        </p>
        <div className="servicecard-wrapper">
          {services.map((service) => {
            const isExpanded = expandedId === service.id;
            return (
              <div className="card" key={service.id}>
                <div className="icon__box">
                  <div className={`icon icon-${service.id}`}>
                    {service.icon}
                  </div>
                </div>
                <div className="title-row">
                  <h3>{service.title}</h3>
                  <span className="rating">
                    <FaStar className="card__icon" /> {service.rating}
                  </span>
                </div>
                <p className="time">{service.time}</p>
                <p className="desc">{service.description}</p>

                <div
                  className={`details-container ${
                    isExpanded ? "expanded" : ""
                  }`}
                >
                  {isExpanded && (
                    <ul className="details">
                      {service.details.map((item, i) => (
                        <li key={i}> {item}</li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="card-footer">
                  <button
                    className="learn-more"
                    onClick={() => toggleExpand(service.id)}
                    aria-expanded={isExpanded}
                    aria-controls={`details-${service.id}`}
                  >
                    {isExpanded ? (
                      <>
                        Show Less <FaChevronUp />
                      </>
                    ) : (
                      <>
                        Learn More <FaChevronDown />
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ServiceCard;
