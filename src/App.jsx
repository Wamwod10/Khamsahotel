import React from "react";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import Nav from "./components/nav/Nav";
import Header from "./components/header/Header";
import Roomcard from "./components/roomcard/Roomcard";
import Room from "./pages/rooms/Room";
import Services from "./pages/services/Services";
import MyBooking from "./pages/mybooking/Mybooking";
import Bookingform from "./components/bookingform/Bookingform";
import Gallery from "./components/gallery/Gallery";
import Near from "./components/nearby/Near";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Offer from "./pages/offers/Offer";
import Login from "./pages/admin/Login/Login";
import Footer from "./components/footer/Footer";
import Contact from "./pages/contact/Contact";
// import Contact from "./pages/contact/Contact";

function AppWrapper() {
  // useNavigate ni shu yerda ishlatamiz
  const navigate = useNavigate();

  const navigateToAddBooking = () => {
    navigate("/");
  };

  return <App navigateToAddBooking={navigateToAddBooking} />;
}

function App({ navigateToAddBooking }) {
  return (
    <>
      <Nav />
      <Routes>
        <Route
          path="/"
          element={
            <>
              <Header /> <Roomcard /> <Bookingform /> <Gallery /> <Near />
            </>
          }
        />
        <Route path="/rooms" element={<Room />} />
        <Route path="/services" element={<Services />} />
        <Route path="/offer" element={<Offer />} />
        <Route path="/contact" element={<Contact />} />
        <Route
          path="/mybooking"
          element={<MyBooking navigateToAddBooking={navigateToAddBooking} />}
        />
        <Route path="/admin" element={<Login />} />
      </Routes>
      <Footer/>
      <ToastContainer
        position="top-center"
        autoClose={2500}
        hideProgressBar={false}
        newestOnTop={true}
        closeOnClick
        pauseOnHover={false}
        draggable={false}
        style={{ zIndex: 99999 }}
      />
    </>
  );
}

export default function Root() {
  // Bosh komponent sifatida BrowserRouter va AppWrapper ni tashlaymiz
  return (
    <BrowserRouter>
      <AppWrapper />
    </BrowserRouter>
  );
}
