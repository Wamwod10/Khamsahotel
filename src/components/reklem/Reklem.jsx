import React from "react";
import "./reklem.scss";
import { FaPlane } from "react-icons/fa6";
import { t } from "i18next";

const Reklem = () => {
  return (
    <div className="reklem" role="region" aria-label="Khamsa banner">
      <div className="reklem__track">
        <div className="reklem__fly">
          <FaPlane className="reklem__plane" aria-hidden="true" />
          <span className="reklem__msg">{t("khamsaa")}</span>
        </div>
      </div>
    </div>
  );
};

export default Reklem;
