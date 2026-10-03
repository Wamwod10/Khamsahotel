import assert from "node:assert/strict";
import test from "node:test";

import {
  BnovoUnavailableError,
  createBnovoClient,
  isInventoryBlockingBooking,
  mapBookingRoomType,
  overlapsDateRange,
  bookingOverlapsRequest,
} from "../bnovo.js";

function jsonResponse(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => "application/json" },
    async json() { return body; },
    async text() { return JSON.stringify(body); },
  };
}

const baseEnv = {
  BNOVO_ID: "109828",
  BNOVO_API_KEY: "top-secret",
  BNOVO_API_BASE_URL: "https://api.example.test/api/v1",
  BNOVO_AUTH_URL: "https://api.example.test/api/v1/auth",
  BNOVO_ROOM_IDENTIFIER_FIELD: "room_name",
  BNOVO_STANDARD_ROOM_IDS: "2,3",
  BNOVO_FAMILY_ROOM_IDS: "1",
  BNOVO_MIN_REQUEST_INTERVAL_MS: "0",
};

test("same-day checkout and check-in do not overlap", () => {
  assert.equal(
    overlapsDateRange("2026-10-05", "2026-10-07", "2026-10-01", "2026-10-05"),
    false,
  );
});

test("overlapping hotel nights conflict", () => {
  assert.equal(
    overlapsDateRange("2026-10-04", "2026-10-07", "2026-10-01", "2026-10-05"),
    true,
  );
});

test("offsetless Bnovo timestamps use the hotel timezone", () => {
  assert.equal(bookingOverlapsRequest({
    dates: {
      arrival: "2026-10-10 10:00:00",
      departure: "2026-10-10 13:00:00",
    },
  }, {
    checkIn: "2026-10-10",
    checkOut: "2026-10-11",
    startAt: "2026-10-10T12:00:00+05:00",
    endAt: "2026-10-10T15:00:00+05:00",
  }, { hotelOffsetMinutes: 300 }), true);
});

test("date-only request treats a same-day hourly booking as part of that hotel day", () => {
  assert.equal(bookingOverlapsRequest({
    dates: {
      arrival: "2026-10-10 10:00:00+05:00",
      departure: "2026-10-10 13:00:00+05:00",
    },
  }, {
    checkIn: "2026-10-10",
    checkOut: "2026-10-11",
  }, { hotelOffsetMinutes: 300 }), true);
});

test("maps room types only by configured exact identifiers", () => {
  const mapping = {
    identifierField: "room_name",
    STANDARD: new Set(["2", "3"]),
    FAMILY: new Set(["1"]),
  };
  assert.equal(mapBookingRoomType({ room_name: "1", plan_name: "Standard" }, mapping), "FAMILY");
  assert.equal(mapBookingRoomType({ room_name: "2", plan_name: "Family special" }, mapping), "STANDARD");
  assert.equal(mapBookingRoomType({ room_name: "99", plan_name: "FAMILY" }, mapping), null);
});

test("cancelled Bnovo bookings do not consume inventory while unknown statuses do", () => {
  assert.equal(isInventoryBlockingBooking({ status: { name: "Cancelled" } }), false);
  assert.equal(isInventoryBlockingBooking({ status: { id: 2, name: "отменен" } }), false);
  assert.equal(isInventoryBlockingBooking({ status: { name: "Unexpected PMS state" } }), true);
});

test("a 401 clears auth and retries the Bnovo request exactly once", async () => {
  const calls = [];
  const responses = [
    jsonResponse(200, { access_token: "token-one", expires_in: 86400 }),
    jsonResponse(401, { message: "expired" }),
    jsonResponse(200, { access_token: "token-two", expires_in: 86400 }),
    jsonResponse(200, { data: { bookings: [], meta: { total: 0, limit: 20, offset: 0 } } }),
  ];
  const client = createBnovoClient({
    env: baseEnv,
    fetchImpl: async (url, init) => {
      calls.push({ url, init });
      return responses.shift();
    },
  });

  await client.getBookings({ dateFrom: "2026-10-01", dateTo: "2026-10-02" });

  assert.equal(calls.filter((call) => call.url.endsWith("/auth")).length, 2);
  assert.equal(calls.filter((call) => call.url.includes("/bookings?")).length, 2);
  assert.deepEqual(JSON.parse(calls[0].init.body), { id: 109828, password: "top-secret" });
  assert.equal(calls[3].init.headers.Authorization, "Bearer token-two");
});

test("paginates bookings and caches an identical date range", async () => {
  let authCalls = 0;
  let bookingCalls = 0;
  const client = createBnovoClient({
    env: baseEnv,
    fetchImpl: async (url) => {
      if (url.endsWith("/auth")) {
        authCalls += 1;
        return jsonResponse(200, { access_token: "token", expires_in: 86400 });
      }
      bookingCalls += 1;
      const offset = Number(new URL(url).searchParams.get("offset"));
      return offset === 0
        ? jsonResponse(200, {
          data: {
            bookings: Array.from({ length: 20 }, (_, index) => ({ id: index + 1 })),
            meta: { total: 21, limit: 20, offset },
          },
        })
        : jsonResponse(200, { data: { bookings: [{ id: 21 }], meta: { total: 21, limit: 20, offset } } });
    },
  });

  const first = await client.getBookings({ dateFrom: "2026-10-01", dateTo: "2026-10-02" });
  const second = await client.getBookings({ dateFrom: "2026-10-01", dateTo: "2026-10-02" });

  assert.equal(first.length, 21);
  assert.deepEqual(first.map((booking) => booking.id), second.map((booking) => booking.id));
  assert.equal(first[0].id, 1);
  assert.equal(first.at(-1).id, 21);
  assert.equal(authCalls, 1);
  assert.equal(bookingCalls, 2);
});

test("coalesces concurrent requests for the same date range", async () => {
  let bookingCalls = 0;
  const client = createBnovoClient({
    env: baseEnv,
    fetchImpl: async (url) => {
      if (url.endsWith("/auth")) return jsonResponse(200, { access_token: "token" });
      bookingCalls += 1;
      await new Promise((resolve) => setTimeout(resolve, 5));
      return jsonResponse(200, { data: { bookings: [], meta: { total: 0, limit: 20, offset: 0 } } });
    },
  });

  await Promise.all([
    client.getBookings({ dateFrom: "2026-10-01", dateTo: "2026-10-02" }),
    client.getBookings({ dateFrom: "2026-10-01", dateTo: "2026-10-02" }),
  ]);

  assert.equal(bookingCalls, 1);
});

test("rate limiter serializes concurrent requests for different date windows", async () => {
  let clock = 1000;
  const requestStarts = [];
  const sleeps = [];
  const client = createBnovoClient({
    env: { ...baseEnv, BNOVO_MIN_REQUEST_INTERVAL_MS: "100" },
    now: () => clock,
    sleep: async (milliseconds) => {
      sleeps.push(milliseconds);
      await new Promise((resolve) => setImmediate(resolve));
      clock += milliseconds;
    },
    fetchImpl: async (url) => {
      if (url.endsWith("/auth")) return jsonResponse(200, { access_token: "token" });
      requestStarts.push(clock);
      return jsonResponse(200, {
        data: { bookings: [], meta: { total: 0, limit: 20, offset: 0 } },
      });
    },
  });

  await Promise.all([
    client.getBookings({ dateFrom: "2026-10-01", dateTo: "2026-10-02" }),
    client.getBookings({ dateFrom: "2026-10-02", dateTo: "2026-10-03" }),
  ]);

  assert.deepEqual(requestStarts, [1000, 1100]);
  assert.deepEqual(sleeps, [100]);
});

test("fails closed instead of caching an incomplete paginated result", async () => {
  let bookingCalls = 0;
  const client = createBnovoClient({
    env: baseEnv,
    fetchImpl: async (url) => {
      if (url.endsWith("/auth")) return jsonResponse(200, { access_token: "token" });
      bookingCalls += 1;
      return bookingCalls === 1
        ? jsonResponse(200, { data: { bookings: [{ id: 1 }], meta: { total: 2, limit: 20, offset: 0 } } })
        : jsonResponse(200, { data: { bookings: [], meta: { total: 2, limit: 20, offset: 20 } } });
    },
  });

  await assert.rejects(
    client.getBookings({ dateFrom: "2026-10-01", dateTo: "2026-10-02" }),
    (error) => error instanceof BnovoUnavailableError,
  );
});

test("repeated native pages stop immediately with the pagination error code", async () => {
  let bookingCalls = 0;
  const repeatedPage = Array.from({ length: 20 }, (_, index) => ({ id: index + 1 }));
  const client = createBnovoClient({
    env: baseEnv,
    fetchImpl: async (url) => {
      if (url.endsWith("/auth")) return jsonResponse(200, { access_token: "token" });
      bookingCalls += 1;
      const offset = Number(new URL(url).searchParams.get("offset"));
      return jsonResponse(200, {
        data: { bookings: repeatedPage, meta: { total: 40, limit: 20, offset } },
      });
    },
  });

  await assert.rejects(
    client.getBookings({ dateFrom: "2026-10-01", dateTo: "2026-10-02" }),
    (error) => error?.code === "BNOVO_PAGINATION_REPEATED_PAGE",
  );
  assert.equal(bookingCalls, 2);
});

test("large date ranges switch to weekly chunks and deduplicate boundary bookings", async () => {
  let bookingCalls = 0;
  const client = createBnovoClient({
    env: baseEnv,
    fetchImpl: async (url) => {
      if (url.endsWith("/auth")) return jsonResponse(200, { access_token: "token" });
      bookingCalls += 1;
      const parsed = new URL(url);
      const from = parsed.searchParams.get("date_from");
      const to = parsed.searchParams.get("date_to");
      const offset = Number(parsed.searchParams.get("offset"));
      if (from === "2026-10-01" && to === "2026-11-01") {
        return jsonResponse(200, {
          data: {
            bookings: Array.from({ length: 20 }, (_, index) => ({ id: `probe-${index}` })),
            meta: { total: 401, limit: 20, offset },
          },
        });
      }
      const chunkNumber = {
        "2026-10-01": 1,
        "2026-10-08": 2,
        "2026-10-15": 3,
        "2026-10-22": 4,
        "2026-10-29": 5,
      }[from];
      return jsonResponse(200, {
        data: {
          bookings: [{ id: `chunk-${chunkNumber}` }, { id: "shared-boundary" }],
          meta: { total: 2, limit: 20, offset },
        },
      });
    },
  });

  const result = await client.getBookingsDetailed({
    dateFrom: "2026-10-01",
    dateTo: "2026-11-01",
  });

  assert.equal(result.diagnostics.strategy, "date-chunking");
  assert.equal(result.diagnostics.requestCount, 6);
  assert.equal(result.diagnostics.uniqueBookingCount, 6);
  assert.equal(result.diagnostics.duplicateCount, 4);
  assert.equal(result.diagnostics.repeatedPageProtectionTriggered, false);
  assert.deepEqual(result.bookings.map((booking) => booking.id), [
    "chunk-1", "shared-boundary", "chunk-2", "chunk-3", "chunk-4", "chunk-5",
  ]);
  assert.equal(bookingCalls, 6);
});

test("a single date window requiring more than 20 pages fails closed", async () => {
  const client = createBnovoClient({
    env: baseEnv,
    fetchImpl: async (url) => url.endsWith("/auth")
      ? jsonResponse(200, { access_token: "token" })
      : jsonResponse(200, {
        data: {
          bookings: Array.from({ length: 20 }, (_, index) => ({ id: index + 1 })),
          meta: { total: 401, limit: 20, offset: 0 },
        },
      }),
  });

  await assert.rejects(
    client.getBookings({ dateFrom: "2026-10-01", dateTo: "2026-10-02" }),
    (error) => error?.code === "BNOVO_PAGINATION_LIMIT_EXCEEDED",
  );
});

test("a full page without reliable pagination metadata fails closed", async () => {
  const client = createBnovoClient({
    env: baseEnv,
    fetchImpl: async (url) => url.endsWith("/auth")
      ? jsonResponse(200, { access_token: "token" })
      : jsonResponse(200, {
        data: { bookings: Array.from({ length: 20 }, (_, index) => ({ id: index + 1 })) },
      }),
  });

  await assert.rejects(
    client.getBookings({ dateFrom: "2026-10-01", dateTo: "2026-10-02" }),
    (error) => error?.code === "BNOVO_PAGINATION_UNRELIABLE",
  );
});

test("safe pagination diagnostics expose structure but never guest PII", async () => {
  const client = createBnovoClient({
    env: baseEnv,
    fetchImpl: async (url) => url.endsWith("/auth")
      ? jsonResponse(200, { access_token: "token" })
      : jsonResponse(200, {
        data: {
          bookings: [{
            id: 42,
            room_name: "1",
            status: { id: 7, name: "Confirmed" },
            guest_name: "Do not print",
            phone: "+998000000000",
            email: "private@example.test",
          }],
          meta: { total: 1, limit: 20, offset: 0 },
        },
      }),
  });

  const result = await client.getBookingsDetailed({
    dateFrom: "2026-10-01",
    dateTo: "2026-10-02",
  });
  const serialized = JSON.stringify(result.diagnostics);
  assert.deepEqual(result.diagnostics.responseMetadata, {
    topLevelKeys: ["data"],
    dataKeys: ["bookings", "meta"],
    pagination: { total: 1, limit: 20, offset: 0 },
    bookingCount: 1,
    stableBookingIdentifierExamples: ["42"],
  });
  assert.equal(serialized.includes("Do not print"), false);
  assert.equal(serialized.includes("+998000000000"), false);
  assert.equal(serialized.includes("private@example.test"), false);
});

test("transport failure during date chunking preserves safe request diagnostics", async () => {
  let bookingCalls = 0;
  const client = createBnovoClient({
    env: baseEnv,
    fetchImpl: async (url) => {
      if (url.endsWith("/auth")) return jsonResponse(200, { access_token: "token" });
      bookingCalls += 1;
      if (bookingCalls === 1) {
        return jsonResponse(200, {
          data: {
            bookings: Array.from({ length: 20 }, (_, index) => ({ id: index + 1 })),
            meta: { total: 401, limit: 20, offset: 0 },
          },
        });
      }
      throw new Error("socket closed");
    },
  });

  await assert.rejects(
    client.getBookingsDetailed({ dateFrom: "2026-10-01", dateTo: "2026-11-01" }),
    (error) => {
      assert.equal(error.code, "BNOVO_UNAVAILABLE");
      assert.equal(error.diagnostics.strategy, "date-chunking");
      assert.equal(error.diagnostics.requestCount, 3);
      assert.equal(error.diagnostics.lastHttpStatus, 200);
      assert.equal(error.diagnostics.repeatedPageProtectionTriggered, false);
      return true;
    },
  );
});

test("one transient bookings transport failure is retried once", async () => {
  let bookingCalls = 0;
  const client = createBnovoClient({
    env: baseEnv,
    fetchImpl: async (url) => {
      if (url.endsWith("/auth")) return jsonResponse(200, { access_token: "token" });
      bookingCalls += 1;
      if (bookingCalls === 1) throw new Error("temporary socket reset");
      return jsonResponse(200, {
        data: { bookings: [{ id: 7 }], meta: { total: 1, limit: 20, offset: 0 } },
      });
    },
  });

  const result = await client.getBookingsDetailed({
    dateFrom: "2026-10-01",
    dateTo: "2026-10-02",
  });
  assert.equal(bookingCalls, 2);
  assert.equal(result.diagnostics.requestCount, 2);
  assert.deepEqual(result.bookings.map((booking) => booking.id), [7]);
});

test("persistent bookings transport failure still fails closed after one retry", async () => {
  let bookingCalls = 0;
  const client = createBnovoClient({
    env: baseEnv,
    fetchImpl: async (url) => {
      if (url.endsWith("/auth")) return jsonResponse(200, { access_token: "token" });
      bookingCalls += 1;
      throw new Error("persistent socket reset");
    },
  });

  await assert.rejects(
    client.getBookingsDetailed({ dateFrom: "2026-10-01", dateTo: "2026-10-02" }),
    (error) => {
      assert.equal(error.code, "BNOVO_UNAVAILABLE");
      assert.equal(error.diagnostics.requestCount, 2);
      return true;
    },
  );
  assert.equal(bookingCalls, 2);
});

test("Bnovo failures are sanitized and never return a false-positive availability", async () => {
  const client = createBnovoClient({
    env: baseEnv,
    fetchImpl: async (url) => url.endsWith("/auth")
      ? jsonResponse(200, { access_token: "token" })
      : jsonResponse(500, { error: "top-secret leaked upstream" }),
  });

  await assert.rejects(
    client.getBookings({ dateFrom: "2026-10-01", dateTo: "2026-10-02" }),
    (error) => {
      assert.equal(error instanceof BnovoUnavailableError, true);
      assert.equal(error.code, "BNOVO_UNAVAILABLE");
      assert.equal(error.message.includes("top-secret"), false);
      return true;
    },
  );
});
