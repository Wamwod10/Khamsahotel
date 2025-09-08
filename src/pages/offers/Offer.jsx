import React, { useState, useRef, useEffect } from "react";
import { HiChevronDown } from "react-icons/hi";
import { useTranslation } from "react-i18next";  // <-- i18next import
import "./offer.scss";

const AccordionItem = ({ title, children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const contentRef = useRef(null);
  const [height, setHeight] = useState("0px");

  useEffect(() => {
    if (contentRef.current) {
      if (isOpen) {
        setHeight(`${contentRef.current.scrollHeight}px`);
      } else {
        setHeight("0px");
      }
    }
  }, [isOpen]);

  return (
    <div className={`accordion-item ${isOpen ? "open" : ""}`}>
      <button
        className={`accordion-title ${isOpen ? "open" : ""}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
      >
        <span className="title-text">{title}</span>
        <HiChevronDown className="chevron-icon" />
      </button>

      <div
        ref={contentRef}
        className="accordion-content-wrapper"
        style={{ height }}
        aria-hidden={!isOpen}
      >
        <div className="accordion-content">{children}</div>
      </div>
    </div>
  );
};

const Offer = () => {
  const { t } = useTranslation();

  return (
    <div className="offer-container">
      <h1>{t("title")}</h1>

      <AccordionItem title={t("section1_title")}>
        <p>{t("section1_text")}</p>
      </AccordionItem>

      <AccordionItem title={t("section2_title")}>
        <p>{t("section2_text")}</p>
      </AccordionItem>

      <AccordionItem title={t("section3_title")}>
        <p>{t("section3_text")}</p>
      </AccordionItem>

      <AccordionItem title={t("section5_title")}>
        <p>{t("section5_text")}</p>
      </AccordionItem>

      <AccordionItem title={t("section6_title")}>
        <p>{t("section6_text")}</p>
      </AccordionItem>

      <AccordionItem title={t("section7_title")}>
        <p>{t("section7_text")}</p>
      </AccordionItem>

      <AccordionItem title={t("section8_title")}>
        <p>{t("section8_text")}</p>
        <ul>
          <li>{t("section8_phone")}</li>
          <li>
            <a href="mailto:qonoqhotel@mail.ru" target="_blank" rel="noopener noreferrer">
              {t("section8_email")}
            </a>
          </li>
        </ul>
      </AccordionItem>

      <AccordionItem title={t("section9_title")}>
        <p>{t("section9_text")}</p>
      </AccordionItem>
    </div>
  );
};

export default Offer;
