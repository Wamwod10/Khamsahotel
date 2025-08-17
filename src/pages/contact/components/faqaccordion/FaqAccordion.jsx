import React, { useState } from "react";
import { FiChevronDown, FiChevronUp, FiHelpCircle } from "react-icons/fi";
import "./faqaccordion.scss";

const faqData = [
  {
    question: "Where is Khamsa Hotel located within Tashkent Airport?",
    answer:
      "Khamsa Hotel is located in Terminal 2 of Tashkent International Airport, designed especially for transit passengers. Its close proximity to the airport helps travelers save time during layovers.",
  },
  {
    question: "How many rooms does the hotel have and what types are available?",
    answer: "The hotel offers a total of 24 rooms, including 23 standard rooms and 1 luxury suite. Each room is equipped with modern amenities to ensure guest comfort.",
  },
  {
    question: "What are the room rates and is it possible to make a reservation?",
    answer: "Room rates range from $30 to $150 depending on the room type and length of stay. Advance booking is available to guarantee your accommodation.",
  },
  {
    question: "What amenities are provided in the hotel rooms?",
    answer: "Each room features a full-size bed, Wi-Fi, air conditioning, shower, toiletries, wardrobe space, and daily housekeeping. Additionally, 24-hour room service is available for guest convenience.",
  },
  {
    question: "What are the hotel’s operating hours?",
    answer: "Khamsa Hotel operates 24/7 and accepts guests at any time, making it especially convenient for late-night and early-morning flights.",
  },
  {
    question: "Who is the hotel primarily designed for?",
    answer: "The hotel is mainly intended for transit passengers and business travelers with short stays at the airport. Fast and convenient services are offered to meet their needs.",
  },
  {
    question: "How can guests contact the hotel?",
    answer: "Guests can contact the hotel by calling +998 95 877 24 24 or emailing info@khamsahotel. Additionally, reservations and information are available through the hotel’s official website.",
  },
  {
    question: "How are safety and hygiene maintained at Khamsa Hotel?",
    answer: "The hotel follows strict hygiene protocols with regular room cleaning and enhanced safety measures. Staff undergo continuous training to provide high-quality service.",
  },
];

const FaqAccordion = () => {
  const [openIndex, setOpenIndex] = useState(null);

  const toggle = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="faq" aria-label="Frequently Asked Questions">
      <h2 className="faq__title">Frequently Asked Questions</h2>
      <p className="faq__subtitle">
        Find answers to common questions about our hotel and services
      </p>

      <div className="faq__wrapper container">
        {/* FAQ list */}
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

        {/* Support help box */}
        <div
          className="faq__help-box"
          role="region"
          aria-label="Support Assistance"
        >
          <FiHelpCircle className="faq__help-icon" aria-hidden="true" />
          <div className="faq__help-text">
            <strong>Can't find what you're looking for?</strong>
            <p>Contact our support team for personalized assistance.</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FaqAccordion;
