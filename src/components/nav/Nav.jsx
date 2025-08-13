import React, { useState, useEffect, useRef } from 'react';
import './nav.scss';
import './MediaNav.scss'
import { IoHome, IoMenu } from "react-icons/io5";
import { RiHotelBedFill } from "react-icons/ri";
import { PiCoffeeFill } from "react-icons/pi";
import { FaStar } from "react-icons/fa";
import { FaLocationDot } from "react-icons/fa6";
import { PiNotepadFill } from "react-icons/pi";
import { HiChevronDown } from "react-icons/hi";
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const Nav = () => {
    const { t, i18n } = useTranslation();
    const [isLangOpen, setIsLangOpen] = useState(false);

    const savedLang = sessionStorage.getItem('appLanguage') || 'en';
    const [currentLangCode, setCurrentLangCode] = useState(savedLang);

    const languages = [
        { label: 'Eng', code: 'en' },
        { label: 'Rus', code: 'ru' },
        { label: 'Uzb', code: 'uz' }
    ];

    const currentLangLabel = languages.find(lang => lang.code === currentLangCode)?.label || 'Eng';

    useEffect(() => {
        i18n.changeLanguage(currentLangCode);
    }, [currentLangCode, i18n]);

    const toggleLangMenu = () => setIsLangOpen(!isLangOpen);

    const selectLang = (lang) => {
        setCurrentLangCode(lang.code);
        localStorage.setItem('appLanguage', lang.code);
        setIsLangOpen(false);
        i18n.changeLanguage(lang.code);
    };

    // ====== MENU (burger) ======
    const [isActive, setIsActive] = useState(false);
    const menuRef = useRef(null);
    const btnRef = useRef(null);
    const navRef = useRef(null);

    const handleClick = () => setIsActive(p => !p);

    // nav balandligini css var sifatida berib qo'yamiz (list nav ostida chiqishi uchun)
    useEffect(() => {
        if (!navRef.current) return;
        const h = navRef.current.offsetHeight;
        document.documentElement.style.setProperty('--nav-h', `${h}px`);
        const onResize = () => {
            const nh = navRef.current?.offsetHeight || h;
            document.documentElement.style.setProperty('--nav-h', `${nh}px`);
        };
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    // tashqariga bosilganda yopish
    useEffect(() => {
        const onClickOutside = (e) => {
            if (!isActive) return;
            const inMenu = menuRef.current && menuRef.current.contains(e.target);
            const inBtn = btnRef.current && btnRef.current.contains(e.target);
            if (!inMenu && !inBtn) setIsActive(false);
        };
        document.addEventListener('mousedown', onClickOutside);
        return () => document.removeEventListener('mousedown', onClickOutside);
    }, [isActive]);

    return (
        <nav ref={navRef} className={`nav ${isActive ? "no-shadow" : ""}`}>
            <div className="container">
                <div className={`nav__box ${isActive ? "active" : ""}`}>
                    <h2 className="nav__logo">
                        <img className='nav__logo-img' src="/logo.png" alt="Logo" />
                        <a>Khamsa Hotel</a>
                    </h2>


                    <div
                        className={`nav__overlay ${isActive ? "show" : ""}`}
                        onClick={() => setIsActive(false)}
                    />

                    <ul
                        ref={menuRef}
                        className={`nav__list ${isActive ? "show" : ""}`}
                        onClick={(e) => {
                            e.stopPropagation(); // menyudan tashqariga chiqmasin
                            // link bosilganda menyuni yopamiz
                            if (e.target.closest('.nav__link')) {
                                setIsActive(false);
                            }
                        }}
                    >
                        {/* <button className="nav__close-btn" onClick={() => setIsActive(false)}>×</button> */}
                        <li className="nav__item"><NavLink to="/" className="nav__link"><IoHome />{t('home')}</NavLink></li>
                        <li className="nav__item"><NavLink to="/rooms" className="nav__link"><RiHotelBedFill />{t('rooms')}</NavLink></li>
                        <li className="nav__item"><NavLink to="/services" className="nav__link"><PiCoffeeFill />{t('services')}</NavLink></li>
                        <li className="nav__item"><NavLink to="/offer" className="nav__link"><FaStar />{t('review')}</NavLink></li>
                        <li className="nav__item"><NavLink to="/contact" className="nav__link"><FaLocationDot />{t('contact')}</NavLink></li>

                        <li className="nav__item"><NavLink to="/mybooking" className="nav__link"><PiNotepadFill />{t('mybooking')}</NavLink></li>
                        {window.innerWidth <= 375 && (
                            <li className="nav__item-mobile-lang">
                                <div className="nav__lang">
                                    <button className={`nav__lang-btn ${isLangOpen ? 'open' : ''}`} onClick={toggleLangMenu}>
                                        {currentLangLabel}
                                        <span className="arrow"><HiChevronDown /></span>
                                    </button>

                                    {isLangOpen && (
                                        <div className="nav__lang-dropdown show">
                                            {languages.map((lang) => (
                                                <button
                                                    key={lang.code}
                                                    className={`nav__lang-option ${currentLangCode === lang.code ? 'selected' : ''}`}
                                                    onClick={() => selectLang(lang)}
                                                >
                                                    {lang.label}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </li>
                        )}
                    </ul>

                    <div className="nav__main-box">
                        <div className="nav__lang">
                            <button className={`nav__lang-btn ${isLangOpen ? 'open' : ''}`} onClick={toggleLangMenu}>
                                {currentLangLabel}
                                <span className="arrow"><HiChevronDown /></span>
                            </button>

                            {isLangOpen && (
                                <div className="nav__lang-dropdown show">
                                    {languages.map((lang) => (
                                        <button
                                            key={lang.code}
                                            className={`nav__lang-option ${currentLangCode === lang.code ? 'selected' : ''}`}
                                            onClick={() => selectLang(lang)}
                                        >
                                            {lang.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="nav__booking">
                            <NavLink to="/rooms" className="nav__booking-link">{t("booknow")}</NavLink>
                        </div>


                        {!isActive && (
                            <button
                                ref={btnRef}
                                className={`nav_btn-svg ${isActive ? "active" : ""}`}
                                onClick={handleClick}
                            >
                                <IoMenu className="btn_icon" />
                            </button>
                        )}
                        {isActive && (
                            <button
                                className="nav__close-btn nav__close-btn--outside"
                                onClick={() => setIsActive(false)}
                            >
                                ×
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Nav;
