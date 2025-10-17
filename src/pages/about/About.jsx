import React from "react";
import "./about.scss";
import AboutHeader from "./components/aboutheader/AboutHeader";
import Company from "./components/company/Company";
import Founder from "./components/founder/Founder";

const About = () => {
  return (
    <div>
      <AboutHeader />
      <Company />
      <Founder />
    </div>
  );
};

export default About;
