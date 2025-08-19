import React from 'react'
import './BookingModal.scss'
import { IoMdCall } from 'react-icons/io'
import { FaRegComment } from 'react-icons/fa'
import { useTranslation } from 'react-i18next'
const BookingModal = () => {
    const { t } = useTranslation()

    return (
        <div>
            <div className="booking">
                <div className="container">
                    <div className="booking__all-box">
                        <div className="booking__text-box">
                            <h3>{t("booking_title")}</h3>
                            <p>{t("booking_subtitle")}</p>
                        </div>
                        <div className="booking__link-box">
                            <a href='tel:+998123456789' className="booking__link-p1">
                                <IoMdCall className='booking__link-svg1' /> {t("booking_contact_phone")}
                            </a>
                            <a href="https://t.me/khamsaHotel" target="_blank" rel="noopener noreferrer" className="booking__link-p2">
                                <FaRegComment className="booking__link-svg2" /> {t("booking_contact_chat")}
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default BookingModal
