import React from "react";
import { FaLocationArrow } from "react-icons/fa6";
import { GiShoppingBag } from "react-icons/gi";
import { LuExternalLink } from "react-icons/lu";
import { FaUtensils, FaTaxi } from "react-icons/fa6";
import { MdMarkEmailRead } from "react-icons/md";
import "./contactform.scss";

const ContactForm = () => {
  return (
    <div className="contactform">
      <div className="container">
        <div className="contactform__box">
          <div className="contactform__title-box">
            <h2 className="contactform__title">Hotel Location</h2>
            <a href="#" className="contactform__link">
              <FaLocationArrow /> Get Directions
            </a>
          </div>
          <div className="contactform__map-box">
            <iframe
              className="contactform__map"
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3690.3675170215124!2d69.26492267653826!3d41.26194300376614!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x38ae61007cb3de3b%3A0x62705b2323c597e!2sKhamsa%20hotel%20taschkent%20airoport!5e1!3m2!1sru!2s!4v1755263956865!5m2!1sru!2s"
              allowfullscreen=""
              loading="lazy"
              referrerpolicy="no-referrer-when-downgrade"
            ></iframe>
            <div className="contactform__map-div">
              <h3 className="contactform__map-title">Khamsa Hotel</h3>
              <p className="contactform__map-text">
                Tashkent International Airport, Departure Area, 2nd Floor
              </p>
            </div>
          </div>
          <div className="contactform__nears">
            <h3 className="contactform__nears-title">
              Places Near the Airport
            </h3>
            <div className="contactform__nears-box">
              <div className="contactform__nears-div">
                <div className="contactform__titles-div">
                  <div className="contactform__nears-icon">
                    <GiShoppingBag className="icon icon-rotate"/>
                  </div>
                  <div>
                    <h3 className="contactform__div-title">Duty-Free Shops</h3>
                    <p className="contactform__div-text">200-300 m</p>
                  </div>
                </div>
                <a href="https://www.google.com/maps/place/Duty+Free+Uzbekistan/@41.2615049,69.2640989,847m/data=!3m2!1e3!4b1!4m6!3m5!1s0x38ae6106a39f7119:0x61ee61e06f62dfd1!8m2!3d41.2615009!4d69.2666738!16s%2Fg%2F11vbjcn400?hl=ru&entry=ttu&g_ep=EgoyMDI1MDgxMy4wIKXMDSoASAFQAw%3D%3D" className="contactform__nears-icon">
                  <LuExternalLink className="icon"/>
                </a>
              </div>
              <div className="contactform__nears-div">
                <div className="contactform__titles-div">
                  <div className="contactform__nears-icon">
                    <FaUtensils className="icon icon-rotate"/>
                  </div>
                  <div>
                    <h3 className="contactform__div-title">Dining Areas (Cafes & Restaurants)</h3>
                    <p className="contactform__div-text">150-250 m</p>
                  </div>
                </div>
                <a href="https://www.google.com/maps/place/The+Border+Gastromarket/@41.2620178,69.2664831,212m/data=!3m2!1e3!4b1!4m6!3m5!1s0x38ae6100059a613b:0xcb768c01076e6baf!8m2!3d41.2620168!4d69.2677008!16s%2Fg%2F11x9568t7w?hl=ru&entry=ttu&g_ep=EgoyMDI1MDgxMy4wIKXMDSoASAFQAw%3D%3D" className="contactform__nears-icon">
                  <LuExternalLink className="icon"/>
                </a>
              </div>
              <div className="contactform__nears-div">
                <div className="contactform__titles-div">
                  <div className="contactform__nears-icon">
                    <MdMarkEmailRead className="icon icon-rotate"/>
                  </div>
                  <div>
                    <h3 className="contactform__div-title">Post Office</h3>
                    <p className="contactform__div-text">300-350 m</p>
                  </div>
                </div>
                <a href="https://www.google.com/maps/place/%D0%9F%D1%80%D0%B8%D0%B3%D1%80%D0%B0%D0%BD%D0%B8%D1%87%D0%BD%D1%8B%D0%B9+%D1%82%D0%B0%D0%BC%D0%BE%D0%B6%D0%B5%D0%BD%D0%BD%D1%8B%D0%B9+%D0%BF%D0%BE%D1%81%D1%82+%22%D0%9C%D0%B5%D0%B6%D0%B4%D1%83%D0%BD%D0%B0%D1%80%D0%BE%D0%B4%D0%BD%D1%8B%D0%B9+%D0%B0%D1%8D%D1%80%D0%BE%D0%BF%D0%BE%D1%80%D1%82+%22+%D0%A2%D0%B0%D1%88%D0%BA%D0%B5%D0%BD%D1%82%22+%D0%B8%D0%BC%D0%B5%D0%BD%D0%B8+%D0%98%D1%81%D0%BB%D0%B0%D0%BC%D0%B0+%D0%9A%D0%B0%D1%80%D0%B8%D0%BC%D0%BE%D0%B2%D0%B0%22/@41.2623787,69.2657898,212m/data=!3m2!1e3!4b1!4m6!3m5!1s0x38ae617ffae37419:0x5240289413dc0d39!8m2!3d41.2623777!4d69.2664335!16s%2Fg%2F11qgg8j97w?hl=ru&entry=ttu&g_ep=EgoyMDI1MDgxMy4wIKXMDSoASAFQAw%3D%3D" className="contactform__nears-icon">
                  <LuExternalLink className="icon"/>
                </a>
              </div>
              <div className="contactform__nears-div">
                <div className="contactform__titles-div">
                  <div className="contactform__nears-icon">
                    <FaTaxi className="icon icon-rotate"/>
                  </div>
                  <div>
                    <h3 className="contactform__div-title">Taxi Service</h3>
                    <p className="contactform__div-text">50-100 m</p>
                  </div>
                </div>
                <a href="https://www.google.com/maps/search/%D0%9C%D0%B5%D0%B6%D0%B4%D1%83%D0%BD%D0%B0%D1%80%D0%BE%D0%B4%D0%BD%D1%8B%D0%B9+%D0%90%D1%8D%D1%80%D0%BE%D0%BF%D0%BE%D1%80%D1%82+%D0%B8%D0%BC%D0%B5%D0%BD%D0%B8+%D0%98%D1%81%D0%BB%D0%B0%D0%BC%D0%B0+%D0%9A%D0%B0%D1%80%D0%B8%D0%BC%D0%BE%D0%B2%D0%B0+(TAS),+Kumaryk+Street+13,+Tashkent,+%D0%A3%D0%B7%D0%B1%D0%B5%D0%BA%D0%B8%D1%81%D1%82%D0%B0%D0%BD/@41.2632925,69.2654086,424m/data=!3m1!1e3!4m6!2m5!3m4!2s41.263115,+69.265922!4m2!1d69.2659216!2d41.2631153?hl=ru&entry=ttu&g_ep=EgoyMDI1MDgxMy4wIKXMDSoASAFQAw%3D%3D" className="contactform__nears-icon">
                  <LuExternalLink className="icon"/>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactForm;
