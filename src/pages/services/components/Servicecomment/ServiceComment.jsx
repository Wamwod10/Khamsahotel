import React from "react";
import { useTranslation } from "react-i18next";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination, Autoplay } from "swiper/modules";
import {
  FaStar,
  FaStarHalfAlt,
  FaCheckCircle,
  FaRegCalendarAlt,
} from "react-icons/fa";

import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import "./servicecomment.scss";

const ServiceComment = () => {
  const { t } = useTranslation();

  const reviews = [
    {
      name: "Mustafa",
      country: t("review_country_1"),
      rating: 5.0,
      comment: t("review_comment_1"),
      date: t("review_date_1"),
      avatar: "./30.png",
    },
    {
      name: "Natallia",
      country: t("review_country_2"),
      rating: 4.5,
      comment: t("review_comment_2"),
      date: t("review_date_2"),
      avatar: "./31.png",
    },
    {
      name: "Liubov",
      country: t("review_country_3"),
      rating: 4.9,
      comment: t("review_comment_3"),
      date: t("review_date_3"),
      avatar: "./32.png",
    },
    {
      name: "Mikalai",
      country: t("review_country_4"),
      rating: 5.0,
      comment: t("review_comment_4"),
      date: t("review_date_4"),
      avatar: "./33.png",
    },
    {
      name: "Timur",
      country: t("review_country_5"),
      rating: 4.8,
      comment: t("review_comment_5"),
      date: t("review_date_5"),
      avatar: "./34.png",
    },
  ];

  const renderStars = (rating) => {
    const fullStars = Math.floor(rating);
    const halfStar = rating - fullStars >= 0.5;
    return (
      <>
        {[...Array(fullStars)].map((_, i) => (
          <FaStar key={i} color="#f7b500" />
        ))}
        {halfStar && <FaStarHalfAlt color="#f7b500" />}
      </>
    );
  };

  return (
    <div className="servicecomment container">
      <h2 className="servicecard__title">{t("comment_title")}</h2>
      <p className="servicecard__text">{t("comment_subtitle")}</p>
      <div className="service-comment">
        <div className="service-comment__container">
          <Swiper
            modules={[Navigation, Pagination, Autoplay]}
            slidesPerView={2}
            spaceBetween={40}
            autoplay={{ delay: 5000, disableOnInteraction: false }}
            navigation={{
              nextEl: ".swiper-button-next",
              prevEl: ".swiper-button-prev",
            }}
            pagination={{ clickable: true }}
            loop={true}
            className="service-comment__slider"
            breakpoints={{
              0: { slidesPerView: 1 },
              768: { slidesPerView: 2 },
            }}
          >
            {reviews.map((review, index) => (
              <SwiperSlide key={index}>
                <div className="service-comment__card">
                  <div className="service-comment__top-row">
                    <div className="service-comment__user-info">
                      <img
                        src={review.avatar}
                        alt={`${review.name} avatar`}
                        className="service-comment__avatar"
                      />
                      <div>
                        <h4 className="service-comment__name">{review.name}</h4>
                        <p className="service-comment__country">
                          {review.country}
                        </p>
                        <span className="service-comment__verified">
                          <FaCheckCircle /> {t("verified_guest")}
                        </span>
                      </div>
                    </div>
                    <div className="service-comment__rating">
                      {renderStars(review.rating)}
                      <span className="service-comment__rating-number">
                        {review.rating.toFixed(1)}
                      </span>
                    </div>
                  </div>
                  <p className="service-comment__comment">"{review.comment}"</p>
                  <div className="service-comment__bottom-row">
                    <span className="service-comment__verified-icon">
                      <FaCheckCircle />
                      {t("verified_guest")}
                    </span>
                    <span className="service-comment__date">
                      <FaRegCalendarAlt />
                      {t("stayed_on")} {review.date}
                    </span>
                  </div>
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      </div>
    </div>
  );
};

export default ServiceComment;
