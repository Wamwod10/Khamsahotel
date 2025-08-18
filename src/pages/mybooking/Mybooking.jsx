import React, { useEffect, useState, useRef } from "react";
import {
  FaBed,
  FaCalendarAlt,
  FaUserAlt,
  FaHotel,
  FaEnvelope,
  FaPhoneAlt,
  FaEdit,
  FaTrash,
  FaTimes,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import "./mybooking.scss";

const MyBooking = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [bookingData, setBookingData] = useState(null);
  const [userData, setUserData] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formUser, setFormUser] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
  });
  const modalRef = useRef(null);

  useEffect(() => {
    try {
      const booking = sessionStorage.getItem("bookingInfo");
      const user = sessionStorage.getItem("userInfo");
      if (booking) setBookingData(JSON.parse(booking));
      if (user) {
        const parsedUser = JSON.parse(user);
        setUserData(parsedUser);
        setFormUser(parsedUser);
      }
    } catch (err) {
      console.error("Error reading session storage:", err);
    }
  }, []);

  // Fokus modalga o‘tishi uchun
  useEffect(() => {
    if (isEditing && modalRef.current) {
      modalRef.current.focus();
    }
  }, [isEditing]);

  // Bosh sahifaga qaytish
  const goHome = () => navigate("/");

  // Bookingni o‘chirish
  const handleDelete = () => {
    if (window.confirm(t("deleteBookingConfirm") || "Bronni o'chirishni tasdiqlaysizmi?")) {
      sessionStorage.removeItem("bookingInfo");
      sessionStorage.removeItem("userInfo");
      setBookingData(null);
      setUserData(null);
    }
  };

  // Edit modalni yopish
  const closeModal = () => {
    setIsEditing(false);
    // Formni eski ma’lumotga tiklash
    setFormUser(userData);
  };

  // Form inputlarini boshqarish
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormUser((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Formni tasdiqlash - ma'lumotlarni yangilash
  const handleFormSubmit = (e) => {
    e.preventDefault();

    // Oddiy validatsiya
    if (!formUser.firstName.trim() || !formUser.lastName.trim() || !formUser.phone.trim() || !formUser.email.trim()) {
      alert(t("pleaseFillAllFields") || "Iltimos, barcha maydonlarni to'ldiring");
      return;
    }

    // Email formatini tekshirish oddiy regex bilan
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formUser.email)) {
      alert(t("invalidEmail") || "Noto‘g‘ri email manzil");
      return;
    }

    // Yangilash
    setUserData(formUser);
    sessionStorage.setItem("userInfo", JSON.stringify(formUser));
    setIsEditing(false);
  };

  // Bo‘sh holat ko‘rsatish
  if (!bookingData || !userData) {
    return (
      <main className="mybooking mybooking__empty" role="main">
        <div className="container" tabIndex={-1}>
          <h2>{t("noBookingInfoAvailable") || "Booking maʼlumotlari mavjud emas"}</h2>
          <button onClick={goHome} aria-label={t("backToHome") || "Bosh sahifaga qaytish"}>
            {t("backToHome") || "Bosh sahifaga qaytish"}
          </button>
        </div>
      </main>
    );
  }

  const { checkIn, checkOut, guests, rooms, hotel } = bookingData;
  const { firstName, lastName, phone, email } = userData;

  return (
    <>
      <main className="mybooking" role="main" aria-label={t("bookingDetails") || "Bron tafsilotlari"}>
        <div className="container" tabIndex={-1}>
          <h1 className="title">{t("bookingDetails") || "Bron tafsilotlari"}</h1>

          <section className="card" aria-labelledby="booking-summary-label">
            <h2 id="booking-summary-label" className="visually-hidden">
              {t("bookingSummary") || "Booking Summary"}
            </h2>

            {/* Mehmon ma'lumotlari */}
            <article
              className="field"
              aria-labelledby="guest-info-label"
              role="region"
            >
              <div className="icon"><FaUserAlt aria-hidden="true" /></div>
              <div className="info">
                <p id="guest-info-label">
                  <strong>{firstName} {lastName}</strong>
                </p>
                <p><FaPhoneAlt aria-hidden="true" /> {phone}</p>
                <p><FaEnvelope aria-hidden="true" /> {email}</p>
              </div>
            </article>

            {/* Xona va mehmonlar */}
            <article
              className="field"
              aria-labelledby="room-info-label"
              role="region"
            >
              <div className="icon"><FaBed aria-hidden="true" /></div>
              <div className="info">
                <p id="room-info-label"><strong>{t("room") || "Xona"}:</strong> {rooms}</p>
                <p><strong>{t("guests") || "Mehmonlar"}:</strong> {guests}</p>
              </div>
            </article>

            {/* Kirish va chiqish sanalari */}
            <article
              className="field"
              aria-labelledby="dates-info-label"
              role="region"
            >
              <div className="icon"><FaCalendarAlt aria-hidden="true" /></div>
              <div className="info">
                <p id="dates-info-label"><strong>{t("checkIn") || "Kirish"}:</strong> {checkIn}</p>
                <p><strong>{t("checkOut") || "Chiqish"}:</strong> {checkOut}</p>
              </div>
            </article>

            {/* Mehmonxona haqida */}
            <article
              className="field"
              aria-labelledby="hotel-info-label"
              role="region"
            >
              <div className="icon"><FaHotel aria-hidden="true" /></div>
              <div className="info">
                <p id="hotel-info-label"><strong>{t("hotel") || "Mehmonxona"}:</strong></p>
                <p>{hotel}</p>
              </div>
            </article>
          </section>

          <div className="actions">
            <button
              className="btn edit-btn"
              onClick={() => setIsEditing(true)}
              aria-label={t("editBooking") || "Bron ma'lumotlarini tahrirlash"}
            >
              <FaEdit aria-hidden="true" /> {t("edit") || "Tahrirlash"}
            </button>

            <button
              className="btn delete-btn"
              onClick={handleDelete}
              aria-label={t("deleteBooking") || "Bronni o'chirish"}
            >
              <FaTrash aria-hidden="true" /> {t("delete") || "O'chirish"}
            </button>

            <button
              className="btn"
              onClick={goHome}
              aria-label={t("makeNewBooking") || "Yangi bron qilish"}
            >
              {t("makeNewBooking") || "Yangi bron qilish"}
            </button>
          </div>
        </div>
      </main>

      {/* Edit modal */}
      {isEditing && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          tabIndex={-1}
          onClick={closeModal}
        >
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
            ref={modalRef}
            tabIndex={0}
          >
            <header className="modal-header">
              <h2 id="modal-title">{t("editBookingInfo") || "Bron ma'lumotlarini tahrirlash"}</h2>
              <button
                className="modal-close-btn"
                onClick={closeModal}
                aria-label={t("close") || "Yopish"}
              >
                <FaTimes />
              </button>
            </header>

            <form onSubmit={handleFormSubmit} className="modal-form" noValidate>
              <label htmlFor="firstName">{t("firstName") || "Ism"}</label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                value={formUser.firstName}
                onChange={handleInputChange}
                required
                autoComplete="given-name"
              />

              <label htmlFor="lastName">{t("lastName") || "Familiya"}</label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                value={formUser.lastName}
                onChange={handleInputChange}
                required
                autoComplete="family-name"
              />

              <label htmlFor="phone">{t("phone") || "Telefon"}</label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formUser.phone}
                onChange={handleInputChange}
                required
                autoComplete="tel"
                pattern="^[+0-9\s\-()]*$"
                title={t("phoneFormat") || "Telefon raqam faqat raqamlar, +, - va bo‘sh joylardan iborat bo‘lishi kerak"}
              />

              <label htmlFor="email">{t("email") || "Email"}</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formUser.email}
                onChange={handleInputChange}
                required
                autoComplete="email"
              />

              <div className="modal-actions">
                <button type="submit" className="btn save-btn">
                  {t("save") || "Saqlash"}
                </button>
                <button type="button" className="btn cancel-btn" onClick={closeModal}>
                  {t("cancel") || "Bekor qilish"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default MyBooking;
