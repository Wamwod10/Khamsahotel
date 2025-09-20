import React, { useEffect, useState } from 'react';
import './admin.scss';

const Admin = () => {
  const [latestBooking, setLatestBooking] = useState(null);

  useEffect(() => {
    const allBookings = JSON.parse(localStorage.getItem("allBookings")) || [];
    const latest = allBookings[0]; // eng oxirgi bookingni olamiz
    setLatestBooking(latest);
  }, []);

  if (!latestBooking) {
    return <p>Ma'lumotlar yuklanmoqda...</p>;
  }

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
  } = latestBooking;

  return (
    <div className="admin">
      <h2 className="admin__title">Salom, Admin!</h2>
      <div className="admin__booking-info">
        <h3>Oxirgi bron haqida ma’lumot:</h3>
        <ul>
          <li><strong>Ism:</strong> {firstName} {lastName}</li>
          <li><strong>Telefon:</strong> {phone}</li>
          <li><strong>Email:</strong> {email}</li>
          <li><strong>Kirish sanasi:</strong> {checkIn}</li>
          <li><strong>Chiqish vaqti:</strong> {checkOutTime}</li>
          <li><strong>Xona:</strong> {rooms}</li>
          <li><strong>Davomiyligi:</strong> {duration}</li>
          <li><strong>Narxi:</strong> {price ? `${price}€` : "-"}</li>
          <li><strong>Yaratilgan vaqt:</strong> {createdAt ? new Date(createdAt).toLocaleString() : "-"}</li>
          <li><strong>Manba:</strong> {source || "Noma'lum"}</li>
        </ul>
      </div>
    </div>
  );
};

export default Admin;
