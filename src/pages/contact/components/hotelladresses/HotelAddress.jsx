import "./hoteladresses.scss";
import { IoLocationOutline } from "react-icons/io5";
import { FaLocationArrow } from "react-icons/fa6";
import { useTranslation } from "react-i18next";

const HotelAddress = () => {
  const { t } = useTranslation();

  return (
    <div className="hotel">
      <h2 className="hotel__title">{t("hotelAddress.title")}</h2>

      <div className="hotel__address-box">
        <div className="hotel__icon-wrapper">
          <IoLocationOutline className="hotel__icon" />
        </div>

        <div className="hotel__text-wrapper">
          <p className="hotel__address-line1">{t("hotelAddress.name")}</p>
          <p className="hotel__address-line2">{t("hotelAddress.location")}</p>
        </div>
      </div>

      <button className="hotel__btn">
        <FaLocationArrow className="hotel__btn-icon" />
        {t("hotelAddress.button")}
      </button>
    </div>
  );
};

export default HotelAddress;
