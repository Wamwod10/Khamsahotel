import React from "react";
import { MdArrowDropDown } from "react-icons/md";
import "./RoomCard.scss"; 

const RoomModal = ({ isOpen, onClose, room }) => {
  if (!isOpen || !room) return null;

  const { type, guests, hotel, checkIn, checkOut } = room;

  return (
    <div className="modal-main">
      <div className="modal-overlay">
        <div className="modal">
          <h2 className="modal__title">Book Your Stay</h2>
          <div className="modal__section">
            <label>Check-In:</label>
            <p>{checkIn}</p>
          </div>

          <div className="modal__section">
            <label>Check-Out:</label>
            <p>{checkOut}</p>
          </div>

          <div className="modal__section">
            <label>Room Type:</label>
            <p>{type}</p>
          </div>

          <div className="modal__section">
            <label>Guests:</label>
            <p>{guests}</p>
          </div>

          <div className="modal__section">
            <label>Hotel:</label>
            <p>{hotel}</p>
          </div>

          {/* Form */}
          <form className="modal__form">
            <div className="modal__field">
              <label>First Name</label>
              <input type="text" placeholder="Enter your first name" required />
            </div>
            <div className="modal__field">
              <label>Last Name</label>
              <input type="text" placeholder="Enter your last name" required />
            </div>
            <div className="modal__field">
              <label>Phone</label>
              <input type="tel" placeholder="+998..." required />
            </div>
            <div className="modal__field">
              <label>Email</label>
              <input type="email" placeholder="your@email.com" required />
            </div>
            <div className="modal__field custom-select">
              <label htmlFor="payment-method">Payment Method</label>
              <div className="input-wrapper">
                <input
                  list="payment-methods"
                  id="payment-method"
                  name="payment-method"
                  placeholder="Select a method"
                  required
                />
                <MdArrowDropDown className="dropdown-icon" />
              </div>
              <datalist id="payment-methods">
                <option value="Click" />
                <option value="Payme" />
                <option value="Paypal" />
                <option value="Stripe" />
              </datalist>
            </div>

            {/* Buttons */}
            <div className="modal__buttons">
              <button type="submit" className="modal__confirm">
                Confirm
              </button>
              <button type="button" className="modal__cancel" onClick={onClose}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RoomModal;
