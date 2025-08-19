import React, { useState } from "react";
import { FiChevronDown, FiChevronUp, FiHelpCircle } from "react-icons/fi";
import { useTranslation } from "react-i18next";
import "./faqaccordion.scss";

const FaqAccordion = () => {
  const { t } = useTranslation();
  const [openIndex, setOpenIndex] = useState(null);

  const toggle = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  const faqData = [
    {
      question: t("faqAccordion.q1"),
      answer: t("faqAccordion.a1"),
    },
    {
      question: t("faqAccordion.q2"),
      answer: t("faqAccordion.a2"),
    },
    {
      question: t("faqAccordion.q3"),
      answer: t("faqAccordion.a3"),
    },
    {
      question: t("faqAccordion.q4"),
      answer: t("faqAccordion.a4"),
    },
    {
      question: t("faqAccordion.q5"),
      answer: t("faqAccordion.a5"),
    },
    {
      question: t("faqAccordion.q6"),
      answer: t("faqAccordion.a6"),
    },
    {
      question: t("faqAccordion.q7"),
      answer: t("faqAccordion.a7"),
    },
    {
      question: t("faqAccordion.q8"),
      answer: t("faqAccordion.a8"),
    },
  ];

  return (
    <section className="faq" aria-label={t("faqAccordion.title")}>
      <h2 className="faq__title">{t("faqAccordion.title")}</h2>
      <p className="faq__subtitle">{t("faqAccordion.subtitle")}</p>

      <div className="faq__wrapper container">
        <div className="faq__list">
          {faqData.map((item, index) => {
            const isOpen = openIndex === index;
            return (
              <div
                key={index}
                className={`faq__item ${isOpen ? "faq__item--open" : ""}`}
              >
                <button
                  className="faq__question"
                  onClick={() => toggle(index)}
                  aria-expanded={isOpen}
                  aria-controls={`faq-answer-${index}`}
                  id={`faq-question-${index}`}
                >
                  <span>{item.question}</span>
                  <span className="faq__icon" aria-hidden="true">
                    {isOpen ? <FiChevronUp /> : <FiChevronDown />}
                  </span>
                </button>

                {isOpen && (
                  <div
                    id={`faq-answer-${index}`}
                    role="region"
                    aria-labelledby={`faq-question-${index}`}
                    className="faq__answer"
                  >
                    {item.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div
          className="faq__help-box"
          role="region"
          aria-label={t("faqAccordion.helpTitle")}
        >
          <FiHelpCircle className="faq__help-icon" aria-hidden="true" />
          <div className="faq__help-text">
            <strong>{t("faqAccordion.helpTitle")}</strong>
            <p>{t("faqAccordion.helpText")}</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FaqAccordion;
