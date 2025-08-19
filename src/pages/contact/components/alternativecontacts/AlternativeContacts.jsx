import React from 'react'
import "./alternativecontacts.scss"
import { LuMessageCircle } from "react-icons/lu";
import { LiaTelegramPlane } from "react-icons/lia";
import { HiOutlineMail } from "react-icons/hi";

const AlternativeContacts = () => {
  return (
    <div className='alternative'>
      <div className="container">
        <div className="alternative__box">
          <h2 className="alternative__title">{t("altc_alternative_title")}</h2>
          <div className="alternative__box-div">
            <a href="https://wa.me/998958772424" className="alternative__messages">
              <div><LuMessageCircle className='alternative__icon' /></div>
              <div>
                <h2 className="alternative__message-title">{t("altc_whatsapp_title")}</h2>
                <p className="alternative__message-text">{t("altc_whatsapp_text")}</p>
              </div>
            </a>
            <a href='https://t.me/khamsahotel' className="alternative__messages">
              <div><LiaTelegramPlane className='alternative__icon icon-telegram' /></div>
              <div>
                <h2 className="alternative__message-title">{t("altc_telegram_title")}</h2>
                <p className="alternative__message-text">{t("altc_telegram_text")}</p>
              </div>
            </a>
            <a href='mailto:example@gmail.com' className="alternative__messages">
              <div><HiOutlineMail className='alternative__icon icon-email' /></div>
              <div>
                <h2 className="alternative__message-title">{t("altc_email_title")}</h2>
                <p className="alternative__message-text">{t("altc_email_text")}</p>
              </div>
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AlternativeContacts
