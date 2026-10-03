import test from "node:test";
import assert from "node:assert/strict";

import { loadAllStaffBookings } from "../src/pages/staff/bookings/loadAllStaffBookings.js";

test("loads every staff-booking page until the API returns a short page", async () => {
  const calls = [];
  const pages = [
    { ok: true, items: [{ id: 1 }, { id: 2 }] },
    { ok: true, items: [{ id: 3 }] },
  ];

  const adminFetch = async (url) => {
    calls.push(url);
    const page = pages.shift();
    return new Response(JSON.stringify(page), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  const result = await loadAllStaffBookings(adminFetch, { pageSize: 2 });

  assert.deepEqual(result, [{ id: 1 }, { id: 2 }, { id: 3 }]);
  assert.deepEqual(calls, [
    "/api/checkins?type=booking&limit=2&offset=0",
    "/api/checkins?type=booking&limit=2&offset=2",
  ]);
});

test("stops and surfaces an API error instead of returning a partial list", async () => {
  let call = 0;
  const adminFetch = async () => {
    call += 1;
    const body = call === 1
      ? { ok: true, items: [{ id: 1 }, { id: 2 }] }
      : { ok: false, error: "database unavailable" };
    return new Response(JSON.stringify(body), {
      status: call === 1 ? 200 : 500,
      headers: { "Content-Type": "application/json" },
    });
  };

  await assert.rejects(
    () => loadAllStaffBookings(adminFetch, { pageSize: 2 }),
    /database unavailable/,
  );
});
