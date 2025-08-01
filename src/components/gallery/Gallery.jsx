import React, { useState } from "react";
import { FaSearchPlus } from "react-icons/fa";
import "./gallery.scss";
import './galleryMedia.scss';
import { FaChevronRight, FaChevronLeft } from "react-icons/fa6";
import { IoClose } from "react-icons/io5";
import { useTranslation } from "react-i18next";

export default function Gallery() {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const { t } = useTranslation();

  const images = [
    { id: 1, src: "/12.jpg", altKey: "hotelview", category: "Outside" },
    { id: 2, src: "/8.jpg", altKey: "corridor", category: "Cafe" },
    { id: 3, src: "/13.jpg", altKey: "standardtr", category: "Outside" },
    { id: 4, src: "/4.jpg", altKey: "familyroom", category: "Room" },
    { id: 5, src: "/7.jpg", altKey: "reception", category: "Lobby" },
    { id: 6, src: "/10.jpg", altKey: "cafest", category: "Cafe" },
    { id: 7, src: "/3.jpg", altKey: "standardair", category: "Room" },
    { id: 8, src: "/6.jpg", altKey: "restroom", category: "Bath" },
    { id: 9, src: "/9.jpg", altKey: "hallway", category: "Room" },
    { id: 10, src: "/11.jpg", altKey: "bf", category: "Outside" },
    { id: 11, src: "/5.jpg", altKey: "standardtr", category: "Room" },
    { id: 12, src: "/14.jpg", altKey: "bath", category: "Outside" },
  ];

  const categories = [
    "All",
    ...Array.from(new Set(images.map((img) => img.category))),
  ];

  const filteredImages =
    selectedCategory === "All"
      ? images
      : images.filter((img) => img.category === selectedCategory);

  const openLightbox = (index) => setLightboxIndex(index);
  const closeLightbox = () => setLightboxIndex(null);

  const prevImage = () => {
    setLightboxIndex((prev) =>
      prev === 0 ? filteredImages.length - 1 : prev - 1
    );
  };

  const nextImage = () => {
    setLightboxIndex((prev) =>
      prev === filteredImages.length - 1 ? 0 : prev + 1
    );
  };

  return (
    <section className="gallery container" aria-label={t("khamsagallery")}>
      <h2 className="gallery__title">{t("khamsagallery")}</h2>

      <div
        className="gallery__filters"
        role="tablist"
        aria-label="Filter gallery images by category"
      >
        {categories.map((cat) => (
          <button
            key={cat}
            className={`gallery__filter-btn ${
              selectedCategory === cat ? "active" : ""
            }`}
            onClick={() => setSelectedCategory(cat)}
            role="tab"
            aria-selected={selectedCategory === cat}
            tabIndex={selectedCategory === cat ? 0 : -1}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="gallery__box-g">
        <div className="gallery__grid" role="list">
        {filteredImages.map(({ id, src, altKey }, idx) => (
          <div
            key={id}
            className="gallery__item"
            role="listitem"
            tabIndex={0}
            aria-label={`View image: ${t(altKey)}`}
            onClick={() => openLightbox(idx)}
            onKeyDown={(e) => {
              if (e.key === "Enter") openLightbox(idx);
            }}
          >
            <img src={src} alt={t(altKey)} loading="lazy" />
            <div className="gallery__overlay">
              <FaSearchPlus className="gallery__icon" />
              <p>{t(altKey)}</p>
            </div>
          </div>
        ))}
      </div>
      </div>

      {lightboxIndex !== null && (
        <div
          className="lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={`Image preview: ${t(
            filteredImages[lightboxIndex].altKey
          )}`}
          tabIndex={-1}
          onClick={closeLightbox}
          onKeyDown={(e) => {
            if (e.key === "Escape") closeLightbox();
            if (e.key === "ArrowLeft") prevImage();
            if (e.key === "ArrowRight") nextImage();
          }}
        >
          <button
            className="lightbox__close"
            aria-label="Close image preview"
            onClick={closeLightbox}
          >
            <IoClose />
          </button>
          <button
            className="lightbox__prev"
            aria-label="Previous image"
            onClick={(e) => {
              e.stopPropagation();
              prevImage();
            }}
          >
            <FaChevronLeft />
          </button>
          <img
            className="lightbox__img"
            src={filteredImages[lightboxIndex].src}
            alt={t(filteredImages[lightboxIndex].altKey)}
          />
          <button
            className="lightbox__next"
            aria-label="Next image"
            onClick={(e) => {
              e.stopPropagation();
              nextImage();
            }}
          >
            <FaChevronRight />
          </button>
        </div>
      )}
    </section>
  );
}
