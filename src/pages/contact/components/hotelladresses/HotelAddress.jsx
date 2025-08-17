import "./hoteladresses.scss"
import { IoLocationOutline } from "react-icons/io5";
import { FaLocationArrow } from "react-icons/fa6";

const HotelAddress = () => {
  return (
    <div className="hotel">
      <h2 className="hotel__title">Hotel Address</h2>

      <div className="hotel__address-box">
        <div className="hotel__icon-wrapper">
          <IoLocationOutline className="hotel__icon" />
        </div>

        <div className="hotel__text-wrapper">
          <p className="hotel__address-line1">Tashkent Airport Hotel</p>
          <p className="hotel__address-line2">Tashkent International Airport, near Terminal 2</p>
        </div>
      </div>

      <button className="hotel__btn">
        <FaLocationArrow className="hotel__btn-icon" />
        Get Directions
      </button>
    </div>
  );
};

export default HotelAddress;
