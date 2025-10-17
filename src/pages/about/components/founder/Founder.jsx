import React from "react";
import "./founder.scss";
import { useTranslation, Trans } from "react-i18next";

const Founder = () => {
  const { t } = useTranslation();

  return (
    <section className="founder" aria-labelledby="founder-title">
      <div className="container">
        <div className="founder__box">
          <figure className="founder__photoWrap">
            <img
              className="founder__photo"
              src="/public/46.jpg"
              alt={t("founder_photo_alt")}
              loading="eager"
            />
          </figure>

          <article className="founder__content">
            <span className="founder__eyebrow">{t("founder_eyebrow")}</span>
            <h2 id="founder-title" className="founder__title">
              {t("founder_name")}
            </h2>

            <p className="founder__lead">{t("founder_lead")}</p>

            <p className="founder__text">{t("founder_p1")}</p>

            <p className="founder__text founder__motto">
              <Trans i18nKey="founder_motto" components={{ b: <b /> }} />
            </p>
          </article>
        </div>
      </div>
    </section>
  );
};

export default Founder;
