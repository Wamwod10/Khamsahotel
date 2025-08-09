import React from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination, Autoplay } from "swiper/modules";
import {
  FaStar,
  FaStarHalfAlt,
  FaCheckCircle,
  FaRegCalendarAlt,
} from "react-icons/fa";
import { FiChevronLeft } from "react-icons/fi";
import { FiChevronRight } from "react-icons/fi";

import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import "./servicecomment.scss";

const reviews = [
  {
    name: "Mustafa",
    country: "Kazakhstan",
    rating: 5.0,
    comment:
      "Reception and attention were excellent, many thanks to the officer who made me feel very good, everything was great!",
    date: "July 2024",
    avatar: "/public/10.jpg",
  },
  {
    name: "Natallia",
    country: "United Kingdom",
    rating: 4.5,
    comment:
      "Convenient but needs improvements. Room was noisy due to airport announcements. Showers were cold.",
    date: "June 2024",
    avatar: "/public/10.jpg",
  },
  {
    name: "Liubov",
    country: "USA",
    rating: 4.9,
    comment:
      "It’s OK for transit passengers. Very clean and the staff was kind. A good place for a short rest.",
    date: "May 2024",
    avatar: "/public/10.jpg",
  },
  {
    name: "Mikalai",
    country: "Belarus",
    rating: 5.0,
    comment:
      "Everything was perfect. Could use more kitchen cutlery, but overall it’s a great airport hotel.",
    date: "April 2024",
    avatar: "/public/10.jpg",
  },
  {
    name: "Timur",
    country: "Uzbekistan",
    rating: 4.8,
    comment:
      "Very clean and quiet. Staff were attentive. Price-to-quality ratio is just perfect for short stays.",
    date: "March 2024",
    avatar: "/public/10.jpg",
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

const ServiceComment = () => {
  return (
    <div className="servicecomment container">
      <h2 className="servicecard__title">What Our Guests Say</h2>
      <p className="servicecard__text">
        Real experiences from guests who have used our services
      </p>
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
                          <FaCheckCircle /> Verified guest
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
                      Verified Guest
                    </span>
                    <span className="service-comment__date">
                      <FaRegCalendarAlt />
                      Stayed on {review.date}
                    </span>
                  </div>
                </div>
              </SwiperSlide>
            ))}
            {/* <div className="swiper-button-prev">
            <FiChevronLeft />
          </div>
          <div className="swiper-button-next">
            <FiChevronRight />
          </div> */}
          </Swiper>
        </div>
      </div>
    </div>
  );
};

export default ServiceComment;
