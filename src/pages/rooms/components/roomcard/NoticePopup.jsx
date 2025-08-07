import { MdArrowBack, MdArrowForward } from "react-icons/md";
import "./RoomCard.scss";
import { useTranslation } from "react-i18next";

const NoticePopup = ({ message, onBack, onContinue }) => {
  const { t } = useTranslation();
  return (
    <div className="notice">
      <div className="notice-popup-overlay">
        <div className="notice-popup">
          <h1 className="notice-title">{t("attention")}</h1>
          <p className="notice-message">{message}</p>
          <p className="notice-question">{t("continue?")}</p>
          <div className="notice-buttons">
            <button className="btn btn-back" onClick={onBack} type="button">
              <MdArrowBack size={20} /> {t("mainPage")}
            </button>
            <button
              className="btn btn-continue"
              onClick={onContinue}
              type="button"
            >
              {t("continue")} <MdArrowForward size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NoticePopup;
