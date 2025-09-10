import React, { useState, useEffect } from "react";
import "./mybooking.scss";
import BookingCard from "./components/BookingCard/BookingCard";
import EditBookingModal from "./components/Edit/EditBookingModal";

// 🔹 Backend API bilan ishlash helper funksiyalar
const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5002";

async function fetchBookings() {
  try {
    const res = await fetch(`${API_BASE}/bookings`);
    if (!res.ok) throw new Error("❌ Bookinglarni olishda xatolik");
    return await res.json();
  } catch (err) {
    console.error("❌ fetchBookings error:", err.message);
    return [];
  }
}

async function addBookingToServer(newBooking) {
  try {
    const res = await fetch(`${API_BASE}/bookings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newBooking),
    });
    if (!res.ok) throw new Error("❌ Yangi booking yaratilmadi");
    return await res.json();
  } catch (err) {
    console.error("❌ addBookingToServer error:", err.message);
    return null;
  }
}

async function updateBookingOnServer(id, updatedBooking) {
  try {
    const res = await fetch(`${API_BASE}/bookings/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatedBooking),
    });
    if (!res.ok) throw new Error("❌ Booking yangilanmadi");
    return await res.json();
  } catch (err) {
    console.error("❌ updateBookingOnServer error:", err.message);
    return null;
  }
}

async function deleteBookingFromServer(id) {
  try {
    const res = await fetch(`${API_BASE}/bookings/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("❌ Booking o‘chirilmadi");
    return await res.json();
  } catch (err) {
    console.error("❌ deleteBookingFromServer error:", err.message);
    return null;
  }
}

const MyBooking = () => {
  const [bookings, setBookings] = useState([]);
  const [editingBooking, setEditingBooking] = useState(null);
  const [isEditOpen, setIsEditOpen] = useState(false);

  // 🔹 Session va LocalStorage bilan ishlash + backenddan olish
  useEffect(() => {
    const initData = async () => {
      const savedBookings =
        JSON.parse(sessionStorage.getItem("allBookings")) || [];
      const roomModalData = JSON.parse(localStorage.getItem("bookingInfo"));
      let updatedBookings = [];

      if (roomModalData && roomModalData.firstName) {
        if (!roomModalData.id) roomModalData.id = Date.now();
        if (roomModalData.checkOutTime && !roomModalData.checkOut) {
          roomModalData.checkOut = roomModalData.checkOutTime;
        }
        const filteredBookings = savedBookings.filter(
          (b) => b.id !== roomModalData.id
        );
        updatedBookings = [roomModalData, ...filteredBookings];
        localStorage.removeItem("bookingInfo");
        sessionStorage.setItem("allBookings", JSON.stringify(updatedBookings));

        // 🔹 Backendga ham saqlash
        await addBookingToServer(roomModalData);
      } else {
        updatedBookings = savedBookings;
      }

      // 🔹 Backenddan bookinglarni olish
      const serverBookings = await fetchBookings();
      if (serverBookings.length > 0) {
        setBookings(serverBookings);
        sessionStorage.setItem("allBookings", JSON.stringify(serverBookings));
      } else {
        setBookings(updatedBookings);
      }
    };

    initData();
  }, []);

  const saveBookingsToStorage = (arr) => {
    sessionStorage.setItem("allBookings", JSON.stringify(arr));
  };

  const addNewBooking = () => {
    window.location.href = "/";
  };

  const handleEditBooking = (booking) => {
    setEditingBooking(booking);
    setIsEditOpen(true);
  };

  const handleSaveBooking = async (updatedBooking) => {
    const updatedList = bookings.map((b) =>
      b.id === editingBooking.id ? { ...updatedBooking, id: b.id } : b
    );
    setBookings(updatedList);
    saveBookingsToStorage(updatedList);
    setIsEditOpen(false);

    // 🔹 Backendda yangilash
    await updateBookingOnServer(editingBooking.id, updatedBooking);
  };

  const handleDeleteBooking = async (id) => {
    const filtered = bookings.filter((b) => b.id !== id);
    setBookings(filtered);
    saveBookingsToStorage(filtered);

    // 🔹 Backenddan o‘chirish
    await deleteBookingFromServer(id);
  };

  const totalAmount = bookings.reduce((sum, b) => sum + (b.price || 0), 0);

  const handlePayment = async () => {
    if (totalAmount === 0) {
      alert("To‘lov uchun summa mavjud emas");
      return;
    }

    const email = bookings[0]?.email;
    if (!email) {
      alert("Iltimos, email manzilingizni kiriting");
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/create-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: totalAmount,
          description: "Hotel to'lovi",
          email,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server xatosi: ${response.status}`);
      }

      const data = await response.json();

      if (data.paymentUrl) {
        window.location.href = data.paymentUrl;
      } else {
        alert("To‘lov yaratilmadi: " + (data.error || "Noma’lum xato"));
      }
    } catch (error) {
      alert("Xatolik: " + error.message);
    }
  };

  return (
    <div className="my-booking-container">
      <div className="booking-header">
        <h1>My Bookings</h1>
        <button className="btn btn-add" onClick={addNewBooking}>
          + New Booking
        </button>
      </div>

      {bookings.length === 0 ? (
        <div className="my-booking-empty">
          <p>No Bookings yet</p>
        </div>
      ) : (
        <>
          {bookings.map((booking) => (
            <BookingCard
              key={booking.id}
              booking={booking}
              onEdit={() => handleEditBooking(booking)}
              onDelete={() => handleDeleteBooking(booking.id)}
            />
          ))}
          <div className="my-booking-buttons">
            <button
              className="btn btn-pay"
              onClick={handlePayment}
              disabled={totalAmount === 0}
            >
              Pay Now (
              {totalAmount > 0
                ? totalAmount.toLocaleString() + "€"
                : "No amount"}
              )
            </button>
          </div>
        </>
      )}

      <EditBookingModal
        isOpen={isEditOpen}
        booking={editingBooking}
        onClose={() => setIsEditOpen(false)}
        onSave={handleSaveBooking}
      />
    </div>
  );
};

export default MyBooking;
