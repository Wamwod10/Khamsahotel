import React from "react";
import "./company.scss";
import { useTranslation } from "react-i18next";

const Company = () => {
  const { t } = useTranslation();

  return (
    <section className="company" aria-labelledby="company-title">
      <div className="container">
        <div className="company__box">
          {/* LEFT — Text content */}
          <article className="company__content">
            <span className="company__eyebrow">
              {t("company_left_eyebrow")}
            </span>
            <h2 id="company-title" className="company__title">
              {t("company_left_title")}
            </h2>

            <p className="company__lead">{t("company_left_lead")}</p>

            <div className="company__divider" />

            <p className="company__text">{t("company_left_p1")}</p>
            <p className="company__text">{t("company_left_p2")}</p>
          </article>

          {/* RIGHT — Accent card */}
          <aside className="company__card" aria-hidden="false">
            <div className="company__badge">
              BY <img src="37.png" alt="" />
            </div>

            <h3 className="company__cardTitle">{t("company_right_title")}</h3>

            <p className="company__cardText">{t("company_right_text")}</p>

            <ul className="company__list">
              <li>{t("company_right_b1")}</li>
              <li>{t("company_right_b2")}</li>
              <li>{t("company_right_b3")}</li>
            </ul>
          </aside>
        </div>
      </div>
    </section>
  );
};

export default Company;
