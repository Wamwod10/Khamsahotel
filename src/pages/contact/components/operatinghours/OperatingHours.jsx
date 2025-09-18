import "./operatinghours.scss";
import {
  MdOutlineAirportShuttle,
  MdOutlineLuggage,
  MdOutlineAttachMoney,
  MdOutlineLogin,
} from "react-icons/md";
import { useTranslation } from "react-i18next";

const OperatingHours = () => {
  const { t } = useTranslation();

  const services = [
    {
      title: t("operatingHours.shuttle"),
      time: t("operatingHours.shuttleTime"),
      icon: <MdOutlineAirportShuttle className="hours__icon" />,
      className: "shuttle",
    },
    {
      title: t("operatingHours.checkin"),
      time: t("operatingHours.checkinTime"),
      icon: <MdOutlineLogin className="hours__icon" />,
      className: "checkin",
    },
    {
      title: (
        <a
          href="https://baggageroom.uz"
          target="_blank"
          rel="noopener noreferrer"
          className="hours__link"
        >
          {t("operatingHours.luggage")}
        </a>
      ),
      time: t("operatingHours.luggageTime"),
      icon: <MdOutlineLuggage className="hours__icon" />,
      className: "luggage",
    },
    {
      title: t("operatingHours.currency"),
      time: t("operatingHours.currencyTime"),
      icon: <MdOutlineAttachMoney className="hours__icon" />,
      className: "currency",
    },
  ];

  return (
    <div className="hours">
      <div className="container">
        <div className="hours__box">
          <h2 className="hours__title">{t("operatingHours.title")}</h2>
          <div className="hours__list">
            {services.map((service, index) => (
              <div className={`hours__item ${service.className}`} key={index}>
                <div className="hours__icon-box">{service.icon}</div>
                <div className="hours__info">
                  <h3 className="hours__info-title">{service.title}</h3>
                  <p className="hours__info-time">{service.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OperatingHours;
