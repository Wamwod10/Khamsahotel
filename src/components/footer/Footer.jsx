import React from "react";
import "./footer.scss";
import { NavLink } from "react-router-dom";
import { FaTelegramPlane } from "react-icons/fa";
import { FiInstagram } from "react-icons/fi";
import { BsGoogle } from "react-icons/bs";
import { useTranslation } from "react-i18next";

const Footer = () => {
  const { t } = useTranslation();

  return (
    <footer className="footer">
      <div className="footer__container container">
        {/* Left side: Logo + Description */}
        <div className="footer__left">
          <h2 className="footer__logo">{t("logo")}</h2>
          <p className="footer__description">
            {t("description")}
          </p>
          <div className="footer__socials">
            <a
              href="https://twitte.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Twitter"
              className="footer__social-link"
            >
              <FaTelegramPlane />
            </a>
            <a
              href="https://www.instagram.com/qonoqairport_hotel?igsh=MWIzbzJ4d2ZqYmZpZg=="
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              className="footer__social-link"
            >
              <FiInstagram />
            </a>
            <a
              href="https://pinterest.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Pinterest"
              className="footer__social-link"
            >
              <BsGoogle />
            </a>
          </div>
        </div>

        {/* Middle side: Quick Links */}
        <div className="footer__links">
          <h3 className="footer__title">{t("quickLinks")}</h3>
          <ul className="footer__list">
            <li>
              <NavLink to="/rooms" className="footer__link">
                {t("footerrooms")}
              </NavLink>
            </li>
            <li>
              <NavLink to="/services" className="footer__link">
                {t("footerservices")}
              </NavLink>
            </li>
            <li>
              <NavLink to="/review" className="footer__link">
                {t("footerreviews")}
              </NavLink>
            </li>
            <li>
              <NavLink to="/contact" className="footer__link">
                {t("footercontact")}
              </NavLink>
            </li>
            <li>
              <NavLink to="/mybooking" className="footer__link">
                {t("footermyBooking")}
              </NavLink>
            </li>
          </ul>
        </div>

        <div className="footer__contact">
          <h3 className="footer__title">{t("footercontactInfo")}</h3>
          <address className="footer__address">
            {t("address")}
          </address>
          <p className="footer__phone">
            {t("phone")}:{" "}
            <a href="tel:+998958772424" className="footer__link">
              +998 95 877-24-24
            </a>
          </p>
          <p className="footer__email">
            {t("email")}:{" "}
            <a href="mailto:info@khamsahotel.com" className="footer__link">
              info@khamsahotel.com
            </a>
          </p>
          <div className="footer__payments">
            <a href="">
              <img src="/public/19.png" alt="" className="footer__payment" />
            </a>
            <a href="">
              <img src="/public/20.svg" alt="" className="footer__payment" />
            </a>
            <a href="">
              <img src="/public/21.png" alt="" className="footer__payment" />
            </a>
            <a href="">
              <img src="/public/22.svg" alt="" className="footer__payment" />
            </a>
          </div>
        </div>
      </div>

      <div className="footer__bottom">
        © 2025 KhamsaHotel. {t("rights")}
      </div>
    </footer>
  );
};

export default Footer;