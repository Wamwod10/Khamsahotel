import React, { useState, useEffect, useCallback } from "react";
import "./header.scss";
import "./headerMedia.scss";
import { FaWifi, FaChevronDown } from "react-icons/fa";
import { IoTimeOutline } from "react-icons/io5";
import { useTranslation } from "react-i18next";
import { AiOutlineSafety } from "react-icons/ai";
import { FaCircleCheck } from "react-icons/fa6";
import { MdOutlineCancel } from "react-icons/md";
import { useNavigate, useLocation } from "react-router-dom";
import { TbAirConditioning } from "react-icons/tb";
import { RiDrinks2Fill } from "react-icons/ri";

/* ===== Helpers ===== */
function getApiBase() {
  const env =
    (import.meta?.env && import.meta.env.VITE_API_BASE_URL) ||
    (process.env && process.env.REACT_APP_API_BASE_URL) ||
    "";
  const cleaned = (env || "").replace(/\/+$/, "");
  return cleaned || window.location.origin;
}

async function checkFamilyAvailability({ checkIn, nights = 1 }) {
  const base = getApiBase();
  const url = `${base}/api/bnovo/availability?checkIn=${encodeURIComponent(
    checkIn
  )}&nights=${encodeURIComponent(nights)}&roomType=FAMILY`;

  try {
    const res = await fetch(url, { credentials: "omit" });
    const ct = (res.headers.get("content-type") || "").toLowerCase();
    const data = ct.includes("application/json")
      ? await res.json()
      : { _raw: await res.text() };

    if (!res.ok) {
      console.warn("availability http error:", res.status, data);
      // API xatoligida UXni buzmaslik uchun available=true deb olamiz
      return { ok: false, available: true, reason: `HTTP ${res.status}` };
    }
    if (typeof data?.available === "boolean") {
      return { ok: true, available: data.available, reason: data.source || "bnovo" };
    }
    return { ok: false, available: true, reason: "unknown-shape" };
  } catch (e) {
    console.warn("availability fetch exception:", e);
    return { ok: false, available: true, reason: "exception" };
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ===== Component ===== */
const Header = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const [checkIn, setCheckIn] = useState("");
  const [checkOutTime, setCheckOutTime] = useState("");
  const [duration, setDuration] = useState("Up to 3 hours");
  const [rooms, setRooms] = useState("STANDARD"); // STANDARD | FAMILY

  // Loading va modal
  const [checking, setChecking] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMsg, setModalMsg] = useState("");

  const today = new Date().toISOString().split("T")[0];

  // Clear flow
  useEffect(() => {
    if (location.state?.clearSearch) {
      localStorage.removeItem("bookingInfo");
      setCheckIn("");
      setCheckOutTime("");
      setDuration("Up to 3 hours");
      setRooms("STANDARD");
    }
  }, [location.state]);

  // ESC bilan modal yopish
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && setIsModalOpen(false);
    if (isModalOpen) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isModalOpen]);

  // Modal helpers
  const openModal = useCallback(
    (message) => {
      setModalMsg(message || t("familyNotAvailable") || "Bu xona band qilingan");
      setIsModalOpen(true);
      document.body.style.overflow = "hidden";
    },
    [t]
  );
  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setModalMsg("");
    document.body.style.overflow = "";
  }, []);

  // 3 soat / 10 soat / 1 kun — availability uchun 1 kecha deb olamiz
  const getNightsFromDuration = useCallback((d) => {
    if (!d) return 1;
    const s = String(d).toLowerCase();
    if (s.includes("one day")) return 1;
    if (s.includes("10")) return 1;
    if (s.includes("3")) return 1;
    return 1;
  }, []);

  // Submit
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (rooms === "FAMILY") {
      setChecking(true);
      try {
        await sleep(3000);
    
        // ⬇️ TEST: URL’da ?forceFamilyBusy=1 bo'lsa modalni majburan ochamiz
        if (isForceFamilyBusy()) {
          openModal(t("familyNotAvailable") || "Bu xona band qilingan");
          return; 
        }
    
        const nights = getNightsFromDuration(duration);
        const avail = await checkFamilyAvailability({ checkIn, nights });
        if (!avail.available) {
          openModal(t("familyNotAvailable") || "Bu xona band qilingan");
          return;
        }
      } finally {
        setChecking(false);
      }
    }
    

    if (!checkIn || !checkOutTime || !duration || !rooms) {
      alert(t("fillAllFields") || "Please fill in all fields!");
      return;
    }

    if (rooms === "FAMILY") {
      setChecking(true);
      try {
        // Sun'iy 3s kutish (vizual feedback)
        await sleep(3000);

        const nights = getNightsFromDuration(duration);
        const avail = await checkFamilyAvailability({ checkIn, nights });
        if (!avail.available) {
          openModal(t("familyNotAvailable") || "Bu xona band qilingan");
          return; // modal ochildi — oqim to‘xtaydi
        }
      } finally {
        setChecking(false);
      }
    }

    // STANDARD yoki FAMILY available:true bo‘lsa — davom
    const formattedCheckOut = `${checkIn}T${checkOutTime}`;
    const bookingInfo = {
      checkIn,
      checkOut: formattedCheckOut,
      checkOutTime,
      duration,
      rooms,
      hotel: t("TashkentAirportHotel"),
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem("bookingInfo", JSON.stringify(bookingInfo));
    navigate("/rooms");
  };

  const isForceFamilyBusy = () => {
    try {
      const sp = new URLSearchParams(window.location.search);
      return sp.get("forceFamilyBusy") === "1";
    } catch { return false; }
  };

  return (
    <>
      {/* Modal */}
      {isModalOpen && (
        <div className="kh-modal__overlay" role="dialog" aria-modal="true" onClick={closeModal}>
          <div className="kh-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="kh-modal__title">{t("attention") || "Diqqat!"}</h3>
            <p className="kh-modal__text">
              {modalMsg || t("familyNotAvailable") || "Bu xona band qilingan"}
            </p>
            <div className="kh-modal__actions">
              <button
                type="button"
                onClick={closeModal}
                className="kh-modal__btn kh-modal__btn--primary"
              >
                {t("understand") || "OK"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="header">
        <div className="container">
          <div className="header__big-box">
            <div className="header__box">
              <h1 className="header__title">
                {t("headertitle")} <span>{t("khamsahotel")}</span>
              </h1>
              <p className="header__text">{t("headertext")}</p>
              <div className="header__conditions-box">
                <p className="header__conditions-text"><FaWifi /> {t("freewifi")}</p>
                <p className="header__conditions-text"><TbAirConditioning /> {t("freeparking")}</p>
                <p className="header__conditions-text"><RiDrinks2Fill /> {t("cafe")}</p>
                <p className="header__conditions-text"><IoTimeOutline /> {t("service24/7")}</p>
              </div>
            </div>

            <form className="header__form" onSubmit={handleSubmit}>
              <h2 className="header__form-title">{t("bookyourstay")}</h2>
              <p className="header__form-text">{t("booktext")}</p>

              <div className="header__form-row">
                <div className="header__form-group">
                  <label htmlFor="checkin">{t("check-in")}</label>
                  <input
                    id="checkin"
                    type="date"
                    value={checkIn}
                    min={today}
                    onChange={(e) => setCheckIn(e.target.value)}
                    required
                  />
                </div>

                <div className="header__form-group">
                  <label htmlFor="checkout">{t("check-in-hours")}</label>
                  <input
                    id="checkout"
                    type="time"
                    value={checkOutTime}
                    onChange={(e) => setCheckOutTime(e.target.value)}
                    required
                    disabled={!checkIn}
                  />
                </div>
              </div>

              <div className="header__form-row">
                <div className="header__form-group">
                  <label htmlFor="duration">{t("duration")}</label>
                  <div className="custom-select">
                    <select
                      id="duration"
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                    >
                      <option>{t("upTo3Hours")}</option>
                      <option>{t("upTo10Hours")}</option>
                      <option>{t("oneDay")}</option>
                    </select>
                    <FaChevronDown className="select-icon" />
                  </div>
                </div>

                <div className="header__form-group">
                  <label htmlFor="rooms">{t("rooms")}</label>
                  <div className="custom-select">
                    <select
                      id="rooms"
                      value={rooms}
                      onChange={(e) => setRooms(e.target.value)}
                    >
                      <option value="STANDARD">{t("standard")}</option>
                      <option value="FAMILY">{t("family")}</option>
                    </select>
                    <FaChevronDown className="select-icon" />
                  </div>
                </div>
              </div>

              <div className="header__form-group full-width">
                <label htmlFor="hotel">{t("hotel")}</label>
                <input id="hotel" value={t("TashkentAirportHotel")} disabled />
              </div>

              <button
                type="submit"
                className="header__form-button"
                disabled={checking || !checkIn || !checkOutTime}
              >
                {checking ? (t("searchrooms")) : (t("checkavailable") || "Check availability")}
              </button>

              <div className="header__info-row">
                <span className="header__color1"><AiOutlineSafety /> {t("secure")}</span>
                <span className="header__color2"><FaCircleCheck /> {t("instantconfirm")}</span>
                <span className="header__color3"><MdOutlineCancel /> {t("freecancel")}</span>
              </div>
            </form>
          </div>
        </div>
      </header>
    </>
  );
};

export default Header;
