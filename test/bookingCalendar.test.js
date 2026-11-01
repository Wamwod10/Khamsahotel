import test from "node:test";
import assert from "node:assert/strict";
import { googleCalendarUrl, bookingIcs, calendarEvent } from "../src/utils/bookingCalendar.js";
const item={room:"STANDARD",checkInDate:"2026-11-01",checkInTime:"23:30",checkOutDate:"2026-11-02",checkOutTime:"02:30"};
test("Calendar URLs preserve hotel time even around midnight",()=>{
  const url=new URL(googleCalendarUrl(item));
  assert.equal(url.searchParams.get("dates"),"20261101T183000Z/20261101T213000Z");
  assert.equal(url.searchParams.get("ctz"),"Asia/Tashkent");
  const ics=bookingIcs([item],"f28e-ab12");
  assert.match(ics,/DTSTART:20261101T183000Z/);
  assert.match(ics,/DTEND:20261101T213000Z/);
  assert.match(ics,/UID:f28e-ab12-0@khamsahotel.uz/);
});
test("Invalid events do not create calendar reminders",()=>{
  assert.throws(()=>calendarEvent({...item,checkOutDate:"2026-11-01",checkOutTime:"22:00"}));
});
