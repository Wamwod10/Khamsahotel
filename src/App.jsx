import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Nav from "./components/nav/Nav";
import Header from "./components/header/Header";
import Roomcard from "./components/roomcard/Roomcard";
import Room from "./pages/rooms/Room";
import Services from "./pages/services/Services";
import Review from "./pages/Reviews/Review";
import Contact from "./pages/contact/Contact";
import MyBooking from "./pages/mybooking/Mybooking";
import Bookingform from "./components/bookingform/Bookingform";
import Gallery from "./components/gallery/Gallery";
import Near from "./components/nearby/Near";
import Footer from "./components/footer/Footer";

function App() {
  return (
    <BrowserRouter>
      <Nav />
      <Routes>
        <Route path="/" element={ <> <Header /> <Roomcard /> <Bookingform/> <Gallery/> <Near/> </> } />
        <Route path="/rooms" element={<Room />} />
        <Route path="/services" element={<Services />} />
        <Route path="/review" element={<Review />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/mybooking" element={<MyBooking />} />
      </Routes>
      <Footer/>
    </BrowserRouter>
  );
}

export default App;
