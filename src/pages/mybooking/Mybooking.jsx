import React, { useEffect, useState } from "react";
import "./MyBooking.scss";

const MyBooking = ({ navigateToAddBooking }) => {
  const [bookingInfo, setBookingInfo] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState(null);
  const [showPayModal, setShowPayModal] = useState(false);

  useEffect(() => {
    const savedBooking = sessionStorage.getItem("bookingInfo");
    if (savedBooking) {
      setBookingInfo(JSON.parse(savedBooking));
    }
  }, []);

  // Form input o'zgarishi
  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Editni saqlash
  const handleSaveEdit = (e) => {
    e.preventDefault();
    if (!editData) return;

    setBookingInfo(editData);
    sessionStorage.setItem("bookingInfo", JSON.stringify(editData));
    setIsEditing(false);
  };

  // Bookingni o'chirish
  const handleDelete = () => {
    if (window.confirm("Booking ma'lumotini o'chirmoqchimisiz?")) {
      sessionStorage.removeItem("bookingInfo");
      setBookingInfo(null);
    }
  };

  // Edit boshlash
  const handleEdit = () => {
    setEditData(bookingInfo);
    setIsEditing(true);
  };

  // Pay modalni yopish
  const closePayModal = () => setShowPayModal(false);

  if (!bookingInfo) {
    return (
      <div className="mybooking-empty">
        <h2>Booking ma'lumotlari topilmadi</h2>
        <p>Iltimos, avval xona bron qiling.</p>
        <button className="btn btn-add" onClick={navigateToAddBooking}>
          Add a New Booking
        </button>
      </div>
    );
  }

  return (
    <div className="mybooking-container">
      <h1>My Booking Details</h1>

      <div className="booking-card">
        {!isEditing ? (
          <>
            <h2>Hotel: {bookingInfo.hotel}</h2>

            <div className="booking-row">
              <span>Check-In:</span>
              <span>{bookingInfo.checkIn}</span>
            </div>

            <div className="booking-row">
              <span>Check-Out:</span>
              <span>{bookingInfo.checkOut}</span>
            </div>

            <div className="booking-row">
              <span>Room Type:</span>
              <span>{bookingInfo.rooms}</span>
            </div>

            <div className="booking-row">
              <span>Guests:</span>
              <span>{bookingInfo.guests}</span>
            </div>

            <h3>Guest Information</h3>

            <div className="booking-row">
              <span>First Name:</span>
              <span>{bookingInfo.firstName}</span>
            </div>
            <div className="booking-row">
              <span>Last Name:</span>
              <span>{bookingInfo.lastName}</span>
            </div>
            <div className="booking-row">
              <span>Phone:</span>
              <span>{bookingInfo.phone}</span>
            </div>
            <div className="booking-row">
              <span>Email:</span>
              <span>{bookingInfo.email}</span>
            </div>
          </>
        ) : (
          <form className="edit-form" onSubmit={handleSaveEdit}>
            <label>
              Check-In:
              <input
                type="date"
                name="checkIn"
                required
                value={editData.checkIn}
                onChange={handleEditChange}
              />
            </label>
            <label>
              Check-Out:
              <input
                type="date"
                name="checkOut"
                required
                value={editData.checkOut}
                onChange={handleEditChange}
              />
            </label>
            <label>
              Room Type:
              <input
                type="text"
                name="rooms"
                required
                value={editData.rooms}
                onChange={handleEditChange}
              />
            </label>
            <label>
              Guests:
              <input
                type="number"
                name="guests"
                min="1"
                required
                value={editData.guests}
                onChange={handleEditChange}
              />
            </label>
            <label>
              First Name:
              <input
                type="text"
                name="firstName"
                required
                value={editData.firstName}
                onChange={handleEditChange}
              />
            </label>
            <label>
              Last Name:
              <input
                type="text"
                name="lastName"
                required
                value={editData.lastName}
                onChange={handleEditChange}
              />
            </label>
            <label>
              Phone:
              <input
                type="tel"
                name="phone"
                required
                value={editData.phone}
                onChange={handleEditChange}
              />
            </label>
            <label>
              Email:
              <input
                type="email"
                name="email"
                required
                value={editData.email}
                onChange={handleEditChange}
              />
            </label>

            <div className="edit-buttons">
              <button type="submit" className="btn btn-save">
                Save
              </button>
              <button
                type="button"
                className="btn btn-cancel"
                onClick={() => setIsEditing(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Buttons */}
      {!isEditing && (
        <div className="action-buttons">
          <button className="btn btn-edit" onClick={handleEdit}>
            Edit
          </button>
          <button className="btn btn-delete" onClick={handleDelete}>
            Delete
          </button>
          <button className="btn btn-add" onClick={navigateToAddBooking}>
            Add a New Booking
          </button>
          <button
            className="btn btn-pay"
            onClick={() => setShowPayModal(true)}
          >
            Pay Now
          </button>
        </div>
      )}

      {/* Pay Now Modal */}
      {showPayModal && (
        <div className="pay-modal-overlay" onClick={closePayModal}>
          <div
            className="pay-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <h2>Pay Now</h2>
            <p>To'lov uchun tizim hali ishlab chiqilmoqda.</p>
            <button className="btn btn-close" onClick={closePayModal}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyBooking;
