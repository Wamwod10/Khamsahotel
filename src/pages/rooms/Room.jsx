import RoomHeader from "../rooms/components/roomheader/RoomHeader";
import BookingModal from "./components/bookingmodal/BookingModal";
import RoomCard from "./components/roomcard/RoomCard";

const Room = () => {
  return (
    <div>
      <RoomHeader />
      <RoomCard />
      <BookingModal />
    </div>
  );
};

export default Room;
