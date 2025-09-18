import React from "react";
import "./paymentmodal.scss";

const StatusModal = ({ status, onClose }) => {
  return (
    <div className="status-modal-overlay" onClick={onClose}>
      <div
        className={`status-modal ${status}`}
        onClick={(e) => e.stopPropagation()}
      >
        {status === "success" ? (
          <>
            <h3>✅ To‘lov muvaffaqiyatli amalga oshirildi!</h3>
          </>
        ) : (
          <>
            <h3>❌ Xatolik yuz berdi. Qaytadan urinib ko‘ring.</h3>
          </>
        )}
      </div>
    </div>
  );
};

export default StatusModal;
