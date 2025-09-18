import "./serviceheader.scss";
import { useTranslation } from "react-i18next";

const ServiceHeader = () => {
    const { t } = useTranslation();
  return (
    <section className="service-header">
      <div className="container">
        <h1 className="service-header__title">{t("servicetitle")}</h1>
        <p className="service-header__subtitle">
          {t("servicesubtitle")}   
        </p>
        <p className="service-header__description">
          {t("servicedescription")}
        </p>
        <div className="service-header__buttons">
          <button className="btn btn-primary">{t("serviceprimary")}</button>
          <button className="btn btn-secondary">{t("servicesecondary")}</button>
        </div>
      </div>
    </section>
  );
};   

export default ServiceHeader;
