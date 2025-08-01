import React from "react";
import { MdArrowBack, MdArrowForward } from "react-icons/md";
import "./RoomCard.scss";
import { NavLink } from "react-router-dom";

const NoticePopup = ({ message, onBack, onContinue }) => {
  return (
    <div className="notice">
      <div className="notice-popup-overlay">
        <div className="notice-popup">
          <h1 className="notice-title">E'tibor bering!</h1>
          <p className="notice-message">{message}</p>
          <p className="notice-question">Davom ettirasizmi?</p>
          <div className="notice-buttons">
            <NavLink to="/" className="btn btn-back" onClick={onBack}>
              <MdArrowBack size={20} /> Asosiy Sahifa
            </NavLink>
            <button className="btn btn-continue" onClick={onContinue}>
              Davom etish <MdArrowForward size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NoticePopup;
