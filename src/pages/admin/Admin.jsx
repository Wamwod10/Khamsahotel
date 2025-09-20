import React, { useEffect, useState } from 'react';
import './admin.scss';

const Admin = () => {
  const [bookings, setBookings] = useState([]);

  useEffect(() => {
    const storedBookings = JSON.parse(localStorage.getItem("allBookings")) || [];
    setBookings(storedBookings);
  }, []);

  if (bookings.length === 0) {
    return <p>Ma'lumotlar mavjud emas...</p>;
  }

  return (
    <div className="admin">
      <h2 className="admin__title">Salom, Admin!</h2>
      <div className="admin__booking-list">
        <h3>Barcha bronlar ro'yxati:</h3>
        {bookings.map((booking, index) => {
          const {
            firstName,
            lastName,
            phone,
            email,
            checkIn,
            checkOutTime,
            rooms,
            duration,
            price,
            createdAt,
            source,
          } = booking;

          return (
            <div key={index} className="admin__booking-info">
              <h4>Bron #{index + 1}</h4>
              <ul>
                <li><strong>Ism:</strong> {firstName} {lastName}</li>
                <li><strong>Telefon:</strong> {phone}</li>
                <li><strong>Email:</strong> {email}</li>
                <li><strong>Kirish sanasi:</strong> {checkIn}</li>
                <li><strong>Kirish vaqti:</strong> {checkOutTime}</li>
                <li><strong>Xona:</strong> {rooms}</li>
                <li><strong>Davomiyligi:</strong> {duration}</li>
                <li><strong>Narxi:</strong> {price ? `${price}€` : "-"}</li>
                <li><strong>Yaratilgan vaqt:</strong> {createdAt ? new Date(createdAt).toLocaleString() : "-"}</li>
                <li><strong>Manba:</strong> {source || "Noma'lum"}</li>
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Admin;
