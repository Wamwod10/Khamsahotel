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
          <h2 className="alternative__title">Alternative Contact Methods</h2>
          <div className="alternative__box-div">
            <a href="https://wa.me/998958772424" className="alternative__messages">
              <div><LuMessageCircle className='alternative__icon' /></div>
              <div>
                <h2 className="alternative__message-title">WhatsApp</h2>
                <p className="alternative__message-text">+998 90 123 4567</p>
              </div>
            </a>
            <a href='https://t.me/khamsahotel' className="alternative__messages">
              <div><LiaTelegramPlane className='alternative__icon icon-telegram' /></div>
              <div>
                <h2 className="alternative__message-title">Telegram</h2>
                <p className="alternative__message-text">@khamsahotel</p>
              </div>
            </a>
            <a href='mailto:example@gmail.com' className="alternative__messages">
              <div><HiOutlineMail className='alternative__icon icon-email' /></div>
              <div>
                <h2 className="alternative__message-title">Email</h2>
                <p className="alternative__message-text">info@khamsahotel.uz</p>
              </div>
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AlternativeContacts