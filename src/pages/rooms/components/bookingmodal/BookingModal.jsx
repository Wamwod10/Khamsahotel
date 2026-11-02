import React from 'react'
import './BookingModal.scss'
import { IoMdCall } from 'react-icons/io'
import { FaRegComment } from 'react-icons/fa'
import { useTranslation } from 'react-i18next'
const BookingModal = () => {
    const { t } = useTranslation()

    return (
        <div>
            <div className="room-help">
                <div className="container">
                    <div className="room-help__all-box">
                        <div className="room-help__text-box">
                            <h3>{t("booking_title")}</h3>
                            <p>{t("booking_subtitle")}</p>
                        </div>
                        <div className="room-help__link-box">
                            <a href='tel:+998 95 877 24 24' className="room-help__link-p1">
                                <IoMdCall className='room-help__link-svg1' /> {t("booking_contact_phone")}
                            </a>
                            <a href="https://t.me/khamsa_hotel" target="_blank" rel="noopener noreferrer" className="room-help__link-p2">
                                <FaRegComment className="room-help__link-svg2" /> {t("booking_contact_chat")}
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default BookingModal
