import React, { useEffect, useState } from "react";
import {
  FaBed,
  FaCalendarAlt,
  FaUserAlt,
  FaHotel,
  FaEnvelope,
  FaPhoneAlt,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import "./mybooking.scss";

const MyBooking = () => {
  const navigate = useNavigate();
  const [bookingData, setBookingData] = useState(null);
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    const b = sessionStorage.getItem("bookingInfo");
    const u = sessionStorage.getItem("userInfo");
    if (b) setBookingData(JSON.parse(b));
    if (u) setUserData(JSON.parse(u));
  }, []);

  const goHome = () => navigate("/");

  if (!bookingData || !userData) {
    return (
      <div className="mybooking__empty">
        <h2>Booking maʼlumotlari mavjud emas</h2>
        <button onClick={goHome}>Bosh sahifaga qaytish</button>
      </div>
    );
  }

  const { checkIn, checkOut, guests, rooms, hotel } = bookingData;
  const { firstName, lastName, phone, email } = userData;

  return (
    <main className="mybooking">
      <div className="container">
        <h1 className="title">Bron tafsilotlari</h1>

        <section className="card">
          {/* Left: mehmon ma'lumotlari */}
          <div className="field">
            <div className="icon"><FaUserAlt /></div>
            <div className="info">
              <p><strong>{firstName} {lastName}</strong></p>
              <p><FaPhoneAlt /> {phone}</p>
              <p><FaEnvelope /> {email}</p>
            </div>
          </div>

          {/* Right: bron va xona ma'lumotlari */}
          <div className="field">
            <div className="icon"><FaBed /></div>
            <div className="info">
              <p><strong>Xona:</strong> {rooms}</p>
              <p><strong>Mehmonlar:</strong> {guests}</p>
            </div>
          </div>

          <div className="field">
            <div className="icon"><FaCalendarAlt /></div>
            <div className="info">
              <p><strong>Kirish:</strong> {checkIn}</p>
              <p><strong>Chiqish:</strong> {checkOut}</p>
            </div>
          </div>

          <div className="field">
            <div className="icon"><FaHotel /></div>
            <div className="info">
              <p><strong>Mehmonxona:</strong></p>
              <p>{hotel}</p>
            </div>
          </div>
        </section>

        <div className="actions">
          <button className="btn" onClick={goHome}>Yangi bron qilish</button>
        </div>
      </div>
    </main>
  );
};

export default MyBooking;
