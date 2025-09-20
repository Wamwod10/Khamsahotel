import React, { useEffect, useState } from 'react';
import './admin.scss';

const Admin = () => {
  const [bookings, setBookings] = useState([]);
  const [selectedGuest, setSelectedGuest] = useState(null);

  useEffect(() => {
    const storedBookings = JSON.parse(localStorage.getItem("allBookings")) || [];
    setBookings(storedBookings);
  }, []);

  const openGuestInfo = (guest) => {
    setSelectedGuest(guest);
  };

  const closeGuestInfo = () => {
    setSelectedGuest(null);
  };

  return (
    <div className="admin">
      <h2 className="admin__title">Barcha Bronlar</h2>
      <div className="admin__cards">
        {bookings.length === 0 ? (
          <p>Ma'lumotlar mavjud emas...</p>
        ) : (
          bookings.map((booking, index) => (
            <div className="admin__card" key={index}>
              <p><strong>Check-In:</strong> {booking.checkIn}</p>
              <p><strong>Check-in Time:</strong> {booking.checkOutTime}</p>
              <p><strong>Room Type:</strong> {booking.rooms}</p>
              <p><strong>Duration:</strong> {booking.duration}</p>
              <p><strong>Price:</strong> {booking.price}€</p>

              <button className="admin__guest-btn" onClick={() => openGuestInfo(booking)}>
                Guest Info
              </button>
            </div>
          ))
        )}
      </div>

      {selectedGuest && (
        <div className="admin__modal-overlay" onClick={closeGuestInfo}>
          <div className="admin__modal" onClick={(e) => e.stopPropagation()}>
            <h3>Guest Information</h3>
            <p><strong>First Name:</strong> {selectedGuest.firstName}</p>
            <p><strong>Last Name:</strong> {selectedGuest.lastName}</p>
            <p><strong>Phone:</strong> {selectedGuest.phone}</p>
            <p><strong>Email:</strong> {selectedGuest.email}</p>
            <button className="admin__close-btn" onClick={closeGuestInfo}>Yopish</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;
