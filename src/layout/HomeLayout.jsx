import React from "react";
import { useLocation, Outlet } from "react-router-dom";
import Nav from '../components/nav/Nav';
import Footer from "../Components/Footer/Footer";

const Layout = ({ cartCount }) => {
  const location = useLocation();

  const hideFooter = location.pathname === "/admin";

  return (
    <div>
      <Nav cartCount={cartCount} />
      <Outlet /> {/* This will render the child route component */}
      {!hideFooter && <Footer />}
    </div>
  );
};

export default Layout;
