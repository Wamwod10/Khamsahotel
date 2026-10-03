export async function loadAllStaffBookings(adminFetch, { pageSize = 500 } = {}) {
  const items = [];
  let offset = 0;

  while (true) {
    const res = await adminFetch(
      `/api/checkins?type=booking&limit=${pageSize}&offset=${offset}`,
    );
    const data = await res.json().catch(() => ({}));

    if (!res.ok || !data?.ok || !Array.isArray(data.items)) {
      const error = new Error(data?.error || "Bookings load failed");
      error.status = res.status;
      throw error;
    }

    items.push(...data.items);
    if (data.items.length < pageSize) return items;
    offset += data.items.length;
  }
}
