import React from 'react'
import "./cancel.scss"
import { GiCancel } from "react-icons/gi";

const Cancel = () => {
  return (
     <div className="payment-success-container">
      <div className="success-icon" role="img" aria-label="Success checkmark">
       <div className='icon-div'><GiCancel className='icon-cancel' /></div>
      </div>
      <h1 className='red'>To‘lov Bekor Qilindi</h1>
      <p className="message">
        Afsuski Buyurtmangiz qabul qilinmadi. To'lov amalga oshirilmadi.
      </p>
      <a className="back-home" href="/">
        Bosh sahifaga qaytish
      </a>
    </div>
  )
}

export default Cancel