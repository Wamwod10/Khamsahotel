import React from "react";
import { useTranslation } from "react-i18next";
import "./directions.scss";

const directionImages = Array.from(
  { length: 9 },
  (_, index) => `/${index + 48}.JPG`,
);

const Directions = () => {
  const { t } = useTranslation();

  return (
    <main className="directions-page">
      <section className="directions-hero container">
        <h1 className="directions-hero__title">{t("directionsTitle")}</h1>
        <p className="directions-hero__subtitle">{t("directionsSubtitle")}</p>
      </section>

      <section
        className="directions-steps container"
        aria-label={t("directionsTitle")}
      >
        <ol className="directions-steps__list">
          {directionImages.map((src, index) => (
            <li className="directions-step" key={src}>
              <figure className="directions-step__card">
                <figcaption className="directions-step__label">
                  <span className="directions-step__badge" aria-hidden="true">
                    {index + 1}
                  </span>
                  {t("directionsStep", { number: index + 1 })}
                </figcaption>
                <img
                  className="directions-step__image"
                  src={src}
                  alt={t("directionsStep", { number: index + 1 })}
                  loading={index === 0 ? "eager" : "lazy"}
                />
              </figure>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
};

export default Directions;
