import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { FaStar } from "react-icons/fa";
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

import "./servicecard.scss";

const ServiceCard = () => {
  const { t } = useTranslation();
  const [expandedId, setExpandedId] = useState(null);

  const toggleExpand = (id) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const services = [
    {
      id: 1,
      icon: <FaWifi />,
      title: t("servicewifi"),
      time: t("serviceavailable"),
      rating: "4.8",
      description: t("servicesecdescription"),
      details: [
        t("servicedetail1"),
        t("servicedetail2"),
        t("servicedetail3"),
        t("servicedetail4"),
      ],
    },
    {
      id: 2,
      icon: <FaClock />,
      title: t("servicereception"),
      time: t("serviceopen"),
      rating: "4.9",
      description: t("servicethirddescription"),
      details: [
        t("servicedetail5"),
        t("servicedetail6"),
        t("servicedetail7"),
        t("servicedetail8"),
      ],
    },
    {
      id: 3,
      icon: <FaBroom />,
      title: t("servicehousekeeping"),
      time: t("serviceavailable"),
      rating: "4.9",
      description: t("servicedescription4"),
      details: [
        t("servicedetail9"),
        t("servicedetail10"),
        t("servicedetail11"),
        t("servicedetail12"),
      ],
    },
    {
      id: 4,
      icon: <FaSnowflake />,
      title: t("serviceac"),
      time: t("servicetime2"),
      rating: "4.7",
      description: t("servicedescription5"),
      details: [
        t("servicedetail13"),
        t("servicedetail14"),
        t("servicedetail15"),
        t("servicedetail16"),
      ],
    },
    {
      id: 5,
      icon: <FaBan />,
      title: t("servicenonsmoking"),
      time: t("servicetime3"),
      rating: "5.0",
      description: t("servicedescription6"),
      details: [
        t("servicedetail17"),
        t("servicedetail18"),
        t("servicedetail19"),
        t("servicedetail20"),
      ],
    },
    {
      id: 6,
      icon: <FaCoffee />,
      title: t("servicecoffee"),
      time: t("serviceavailable"),
      rating: "4.6",
      description: t("servicedescription7"),
      details: [
        t("servicedetail21"),
        t("servicedetail22"),
        t("servicedetail23"),
        t("servicedetail24"),
      ],
    },
    {
      id: 7,
      icon: <FaCommentDots />,
      title: t("serviceironing"),
      time: t("servicetime5"),
      rating: "4.7",
      description: t("servicedescription8"),
      details: [
        t("servicedetail25"),
        t("servicedetail26"),
        t("servicedetail27"),
        t("servicedetail28"),
      ],
    },
  ];

  return (
    <div className="servicecard">
      <div className="container">
        <h2 className="servicecard__title">{t("serviceTitle")}</h2>
        <p className="servicecard__text">{t("serviceText")}</p>
        <div className="servicecard-wrapper">
          {services.map((service) => {
            const isExpanded = expandedId === service.id;
            return (
              <div className="card" key={service.id}>
                <div className="icon__box">
                  <div className={`icon icon-${service.id}`}>{service.icon}</div>
                </div>
                <div className="title-row">
                  <h3>{service.title}</h3>
                  <span className="rating">
                    <FaStar className="card__icon" /> {service.rating}
                  </span>
                </div>
                <p className={`time time-${service.id}`}>{service.time}</p>
                <p className="desc">{service.description}</p>

                {isExpanded && (
                  <div className="details-container expanded" id={`details-${service.id}`}>
                    <ul className="details">
                      {service.details.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="card-footer">
                  <button
                    className="learn-more"
                    onClick={() => toggleExpand(service.id)}
                    aria-expanded={isExpanded}
                    aria-controls={`details-${service.id}`}
                  >
                    {isExpanded ? (
                      <>
                        {t("showless")} <FaChevronUp />
                      </>
                    ) : (
                      <>
                        {t("learnmore")} <FaChevronDown />
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
