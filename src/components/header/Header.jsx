// Header.jsx
import React, { useEffect, useState, useCallback, useMemo } from "react";
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
  const isLocal =
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1");
  if (isLocal) return "http://127.0.0.1:5004";

  const env =
    (import.meta?.env && import.meta.env.VITE_API_BASE_URL) ||
    (typeof process !== "undefined" && process.env?.REACT_APP_API_BASE_URL) ||
    "";
  const cleaned = String(env || "").replace(/\/+$/, "");
  return (
    cleaned || (typeof window !== "undefined" ? window.location.origin : "")
  );
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const isForceFamilyBusy = () => {
  try {
    const sp = new URLSearchParams(window.location.search);
    return sp.get("forceFamilyBusy") === "1";
  } catch {
    return false;
  }
};

/* === Date input language map (for <input type="date">) === */
const langMap = { en: "en-US", ru: "ru-RU", uz: "uz-Latn-UZ" };

/* === Local i18n qo‘shimcha === */
const localI18n = {
  en: { dateFormatShort: "DD.MM.YYYY" },
  ru: { dateFormatShort: "ДД.ММ.ГГГГ" },
  uz: { dateFormatShort: "KK.OO.YYYY" },
};

/* ===== Bnovo FAMILY availability (fallback) ===== */
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
    if (!res.ok)
      return { ok: false, available: true, reason: `HTTP ${res.status}` };
    if (typeof data?.available === "boolean")
      return {
        ok: true,
        available: data.available,
        reason: data.source || "bnovo",
      };
    return { ok: false, available: true, reason: "unknown-shape" };
  } catch {
    return { ok: false, available: true, reason: "exception" };
  }
}

/* FAMILY blackout (Postgres) — startAt ichida bo‘lsa band */
async function postgresFamilyBusyDT(startAt) {
  const base = getApiBase();
  const url = `${base}/api/checkins/next-block?roomType=FAMILY&startAt=${encodeURIComponent(
    startAt
  )}`;
  try {
    const res = await fetch(url);
    const ct = (res.headers.get("content-type") || "").toLowerCase();
    const data = ct.includes("application/json")
      ? await res.json()
      : { _raw: await res.text() };
    if (!res.ok) return { busy: false, block: null };
    return { busy: !!data?.block, block: data?.block || null };
  } catch {
    return { busy: false, block: null };
  }
}

/* ===== Duration ↔ code mapping =====
   Backend: ["3h","10h","24h"]  Frontend: i18n labels
*/
const DURATIONS = [
  { code: "3h", key: "upTo3Hours" },
  { code: "10h", key: "upTo10Hours" },
  { code: "24h", key: "oneDay" },
];
const ALL_CODES = DURATIONS.map((d) => d.code);

function labelFromCode(code, t) {
  const item = DURATIONS.find((d) => d.code === code);
  return item ? t(item.key) : code;
}
function codeFromLabel(label = "") {
  const s = String(label).toLowerCase();
  if (s.includes("one day") || s.includes("24")) return "24h";
  if (s.includes("10")) return "10h";
  if (s.includes("3")) return "3h";
  // Agar i18n label bo‘lsa ham raqamlar bor — yuqorisi yetarli
  return null;
}

/* ===== Component ===== */
const Header = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const [checkIn, setCheckIn] = useState("");
  const [checkOutTime, setCheckOutTime] = useState("");
  const [duration, setDuration] = useState("Up to 3 hours");
  const [rooms, setRooms] = useState("STANDARD");

  const [checking, setChecking] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMsg, setModalMsg] = useState("");

  // Allowed tariffs (faqat FAMILY uchun API’dan)
  const [allowed, setAllowed] = useState(ALL_CODES); // STANDARD uchun default: hammasi
  const [tariffLoading, setTariffLoading] = useState(false);
  const [tariffError, setTariffError] = useState("");

  const today = new Date().toISOString().split("T")[0];

  // Forms reset (agar /rooms -> back bo‘lsa)
  useEffect(() => {
    if (location.state?.clearSearch) {
      localStorage.removeItem("bookingInfo");
      setCheckIn("");
      setCheckOutTime("");
      setDuration("Up to 3 hours");
      setRooms("STANDARD");
    }
  }, [location.state]);

  // Modal ESC yopish
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && setIsModalOpen(false);
    if (isModalOpen) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isModalOpen]);

  const openModal = useCallback(
    (message) => {
      setModalMsg(
        message || t("familyNotAvailable") || "Bu xona band qilingan"
      );
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

  const getNightsFromDuration = useCallback((d) => {
    if (!d) return 1;
    const s = String(d).toLowerCase();
    if (s.includes("one day") || s.includes("24")) return 1;
    if (s.includes("10")) return 1;
    if (s.includes("3")) return 1;
    return 1;
  }, []);

  // startAt (YYYY-MM-DDTHH:mm)
  const startAt = useMemo(() => {
    if (!checkIn || !checkOutTime) return "";
    return `${checkIn}T${checkOutTime}`;
  }, [checkIn, checkOutTime]);

  /* ===== Allowed-tariffs fetch (FAMILY only) ===== */
  useEffect(() => {
    const ac = new AbortController();

    async function run() {
      // STANDARD: cheklov yo‘q
      if (rooms !== "FAMILY") {
        setTariffError("");
        setTariffLoading(false);
        setAllowed(ALL_CODES);
        return;
      }

      setTariffError("");
      setAllowed([]); // FAMILY: API natijasi kelguncha bo‘sh
      if (!startAt) return;

      try {
        setTariffLoading(true);
        const base = getApiBase();
        const qs = new URLSearchParams({
          roomType: rooms,
          start: startAt,
        }).toString();
        const res = await fetch(
          `${base}/api/availability/allowed-tariffs?${qs}`,
          {
            signal: ac.signal,
          }
        );
        const ct = (res.headers.get("content-type") || "").toLowerCase();
        const data = ct.includes("application/json")
          ? await res.json()
          : { _raw: await res.text() };

        if (!res.ok)
          throw new Error((data && (data.error || data._raw)) || "HTTP");

        const list = Array.isArray(data.allowed) ? data.allowed : [];
        setAllowed(list);

        // Tanlangan duration ruxsat etilmasa, birinchi ruxsat etilganga o‘tkazamiz
        const curCode = codeFromLabel(duration);
        if (curCode && !list.includes(curCode)) {
          if (list[0]) setDuration(labelFromCode(list[0], t));
        }
      } catch (e) {
        if (e.name !== "AbortError") {
          setTariffError(e.message || "Tariff check failed");
          setAllowed([]); // xatoda konservativ: hammasi blok
        }
      } finally {
        setTariffLoading(false);
      }
    }

    run();
    return () => ac.abort();
    // duration bu yerda deps emas — aks holda loop bo‘lishi mumkin
  }, [rooms, startAt, t]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!checkIn || !checkOutTime || !duration || !rooms) {
      alert(t("fillAllFields") || "Please fill in all fields!");
      return;
    }

    const startAtLocal = `${checkIn}T${checkOutTime}`;

    // FAMILY: duration ruxsatini tekshirish
    if (rooms === "FAMILY") {
      const pickedCode = codeFromLabel(duration);
      if (
        !pickedCode ||
        allowed.length === 0 ||
        !allowed.includes(pickedCode)
      ) {
        openModal(
          t("durationNotAllowed") ||
            "Tanlangan vaqt davomiyligi ushbu vaqtda ruxsat etilmagan"
        );
        return;
      }

      if (isForceFamilyBusy()) {
        openModal();
        return;
      }

      // 1) PG blackout check
      const pg = await postgresFamilyBusyDT(startAtLocal);
      if (pg.busy && pg.block) {
        openModal(t("familyNotAvailable") || "Bu xona band qilingan");
        return;
      }

      // 2) Bnovo availability (qo‘shimcha tekshiruv)
      setChecking(true);
      try {
        await sleep(1200);
        const nights = getNightsFromDuration(duration);
        const avail = await checkFamilyAvailability({ checkIn, nights });
        if (!avail.available) {
          openModal();
          return;
        }
      } finally {
        setChecking(false);
      }
    }

    // Saqlab yuborish (frontend localStorage)
    const bookingInfo = {
      checkIn,
      checkOut: startAtLocal,
      checkOutTime,
      duration,
      rooms,
      hotel: t("TashkentAirportHotel"),
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem("bookingInfo", JSON.stringify(bookingInfo));
    navigate("/rooms");
  };

  /* === i18n mos <input type="date"> === */
  const currentLangShort = (i18n.language || "en").split("-")[0];
  const dateInputLang = langMap[currentLangShort] || "en-US";
  const dateFormatText =
    localI18n[currentLangShort]?.dateFormatShort ||
    localI18n.en.dateFormatShort;

  const durationStatusText = useMemo(() => {
    if (rooms !== "FAMILY") return "";
    if (tariffLoading) return `(${t("searchrooms") || "Checking"}…)`;
    if (!startAt) return "";
    return allowed.length > 0
      ? `(${t("available") || "available"})`
      : `(${t("notavailable") || "restricted"})`;
  }, [rooms, tariffLoading, allowed.length, startAt, t]);

  return (
    <>
      {isModalOpen && (
        <div
          className="kh-modal__overlay"
          role="dialog"
          aria-modal="true"
          onClick={closeModal}
        >
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

      <header className="header">
        <div className="container">
          <div className="header__big-box">
            <div className="header__box">
              <h1 className="header__title">
                {t("headertitle")} <span>{t("khamsahotel")}</span>
              </h1>
              <p className="header__text">{t("headertext")}</p>
              <div className="header__conditions-box">
                <p className="header__conditions-text">
                  <FaWifi /> {t("freewifi")}
                </p>
                <p className="header__conditions-text">
                  <TbAirConditioning /> {t("freeparking")}
                </p>
                <p className="header__conditions-text">
                  <RiDrinks2Fill /> {t("cafe")}
                </p>
                <p className="header__conditions-text">
                  <IoTimeOutline /> {t("service24/7")}
                </p>
              </div>
            </div>

            <form className="header__form" onSubmit={handleSubmit}>
              <h2 className="header__form-title">{t("bookyourstay")}</h2>
              <p className="header__form-text">{t("booktext")}</p>

              <div className="header__form-row">
                <div className="header__form-group">
                  <label htmlFor="checkin">
                    {t("check-in")}
                    <span className="muted"> ({dateFormatText})</span>
                  </label>
                  <input
                    id="checkin"
                    type="date"
                    lang={dateInputLang}
                    value={checkIn}
                    min={today}
                    onChange={(e) => setCheckIn(e.target.value)}
                    required
                    className="kh-date"
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
                    className="kh-time"
                  />
                </div>
              </div>

              <div className="header__form-row">
                <div className="header__form-group">
                  <label htmlFor="duration">
                    {t("duration")}{" "}
                    <span className="muted" style={{ fontWeight: 400 }}>
                      {durationStatusText}
                    </span>
                  </label>
                  <div className="custom-select">
                    <select
                      id="duration"
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      disabled={!checkIn || !checkOutTime}
                    >
                      {DURATIONS.map((d) => {
                        const label = labelFromCode(d.code, t);
                        const disableForFamily =
                          rooms === "FAMILY" && startAt
                            ? !allowed.includes(d.code)
                            : false; // STANDARD yoki startAt yo'q — disable yo'q
                        return (
                          <option
                            key={d.code}
                            value={label}
                            disabled={disableForFamily}
                          >
                            {label}
                          </option>
                        );
                      })}
                    </select>
                    <FaChevronDown className="select-icon" />
                  </div>
                  {rooms === "FAMILY" && tariffError && (
                    <div
                      className="muted"
                      style={{ color: "#b33", marginTop: 6 }}
                    >
                      {tariffError}
                    </div>
                  )}
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
                {checking
                  ? t("searchrooms") || "Searching Room..."
                  : t("checkavailable") || "Check availability"}
              </button>

              <div className="header__info-row">
                <span className="header__color1">
                  <AiOutlineSafety /> {t("secure")}
                </span>
                <span className="header__color2">
                  <FaCircleCheck /> {t("instantconfirm")}
                </span>
                <span className="header__color3">
                  <MdOutlineCancel /> {t("freecancel")}
                </span>
              </div>
            </form>
          </div>
        </div>
      </header>
    </>
  );
};

export default Header;
