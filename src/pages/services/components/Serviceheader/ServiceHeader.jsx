import "./serviceheader.scss";

const ServiceHeader = () => {
  return (
    <section className="service-header">
      <div className="container">
        <h1 className="service-header__title">Services & Amenities</h1>
        <p className="service-header__subtitle">
          Discover our comprehensive range of services designed to make your stay comfortable and memorable
        </p>
        <p className="service-header__description">
          At KhamsaHotel, we pride ourselves on providing exceptional services that cater to every aspect of your stay. From round-the-clock assistance to premium amenities, we ensure your comfort is our priority.
        </p>
        <div className="service-header__buttons">
          <button className="btn btn-primary">Book a Room</button>
          <button className="btn btn-secondary">Contact Us</button>
        </div>
      </div>
    </section>
  );
};

export default ServiceHeader;
