import "dotenv/config";
import fetch from "node-fetch";

const DEFAULT_BASE_URL = "https://api.pms.bnovo.ru/api/v1";
const DEFAULT_AUTH_URL = "https://api.pms.bnovo.ru/api/v1/auth";
const DEFAULT_TOKEN_TTL_SECONDS = 24 * 60 * 60;
const DEFAULT_CACHE_TTL_MS = 45 * 1000;
const DEFAULT_TIMEOUT_MS = 10 * 1000;
const PAGE_SIZE = 20;
const MAX_PAGES_PER_WINDOW = 20;
const DATE_CHUNK_DAYS = 7;
const DEFAULT_MIN_REQUEST_INTERVAL_MS = 1100;
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

const CANCELLED_STATUS_NAMES = new Set([
  "cancelled", "canceled", "cancelled booking", "canceled booking",
  "отменено", "отменена", "отменен", "аннулировано",
]);

export class BnovoUnavailableError extends Error {
  constructor(message = "Bnovo availability is unavailable", options = {}) {
    super(message, options);
    this.name = "BnovoUnavailableError";
    this.code = options.code || "BNOVO_UNAVAILABLE";
    if (options.diagnostics) this.diagnostics = options.diagnostics;
  }
}

export class BnovoMappingError extends Error {
  constructor(message = "Bnovo room mapping is incomplete") {
    super(message);
    this.name = "BnovoMappingError";
    this.code = "BNOVO_MAPPING_INCOMPLETE";
  }
}

function envFlag(value) {
  return /^(1|true|yes)$/i.test(String(value || "").trim());
}

function splitIds(value) {
  return new Set(String(value || "").split(",").map((item) => item.trim()).filter(Boolean));
}

function valueAtPath(object, path) {
  return String(path || "").split(".").filter(Boolean).reduce((value, key) => value?.[key], object);
}

function addCalendarDays(dateOnly, days) {
  const [year, month, day] = String(dateOnly).split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
}

function calendarDaysBetween(dateFrom, dateTo) {
  return Math.round(
    (Date.parse(`${dateTo}T00:00:00Z`) - Date.parse(`${dateFrom}T00:00:00Z`)) /
      86_400_000,
  );
}

function splitDateWindow(dateFrom, dateTo, chunkDays = DATE_CHUNK_DAYS) {
  const chunks = [];
  let cursor = dateFrom;
  while (cursor < dateTo) {
    const candidate = addCalendarDays(cursor, chunkDays);
    const end = candidate < dateTo ? candidate : dateTo;
    chunks.push({ dateFrom: cursor, dateTo: end });
    cursor = end;
  }
  return chunks;
}

function stableBookingIdentifier(booking) {
  for (const field of ["id", "booking_id", "bookingId", "number", "booking_number"]) {
    const value = booking?.[field];
    if (value != null && String(value).trim()) {
      return { field, value: String(value).trim(), key: `${field}:${String(value).trim()}` };
    }
  }
  return null;
}

function objectKeys(value) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? Object.keys(value)
    : [];
}

function safeResponseMetadata(data, payload, items, pagination) {
  return {
    topLevelKeys: objectKeys(data),
    dataKeys: objectKeys(payload),
    pagination: {
      total: pagination.total,
      limit: pagination.limit,
      offset: pagination.offset,
    },
    bookingCount: items.length,
    stableBookingIdentifierExamples: items
      .slice(0, 5)
      .map(stableBookingIdentifier)
      .filter(Boolean)
      .map((identifier) => identifier.value),
  };
}

function timezoneSuffix(offsetMinutes) {
  const minutes = Number.isFinite(Number(offsetMinutes)) ? Number(offsetMinutes) : 300;
  const sign = minutes < 0 ? "-" : "+";
  const absolute = Math.abs(minutes);
  return `${sign}${String(Math.floor(absolute / 60)).padStart(2, "0")}:${String(absolute % 60).padStart(2, "0")}`;
}

function parseBnovoTimestamp(value, hotelOffsetMinutes = 300) {
  let normalized = String(value || "").trim().replace(" ", "T");
  if (!/[T ]\d{2}:\d{2}/.test(String(value || ""))) return NaN;
  if (/[+-]\d{2}$/.test(normalized)) normalized += ":00";
  if (!/(?:Z|[+-]\d{2}:?\d{2})$/i.test(normalized)) normalized += timezoneSuffix(hotelOffsetMinutes);
  return Date.parse(normalized);
}

function formatTimestampAtOffset(value, hotelOffsetMinutes = 300) {
  const timestamp = parseBnovoTimestamp(value, hotelOffsetMinutes);
  if (!Number.isFinite(timestamp)) return null;
  const shifted = new Date(timestamp + hotelOffsetMinutes * 60_000);
  const pad = (part) => String(part).padStart(2, "0");
  return `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}` +
    `T${pad(shifted.getUTCHours())}:${pad(shifted.getUTCMinutes())}:${pad(shifted.getUTCSeconds())}` +
    timezoneSuffix(hotelOffsetMinutes);
}

export function buildRoomMapping(env = process.env) {
  return {
    identifierField: String(env.BNOVO_ROOM_IDENTIFIER_FIELD || "room_name").trim(),
    STANDARD: splitIds(env.BNOVO_STANDARD_ROOM_IDS),
    FAMILY: splitIds(env.BNOVO_FAMILY_ROOM_IDS),
  };
}

export function getBookingRoomIdentifier(booking, mapping) {
  const value = valueAtPath(booking, mapping?.identifierField);
  return value == null ? "" : String(value).trim();
}

export function mapBookingRoomType(booking, mapping) {
  const identifier = getBookingRoomIdentifier(booking, mapping);
  if (!identifier) return null;
  if (mapping?.STANDARD?.has(identifier)) return "STANDARD";
  if (mapping?.FAMILY?.has(identifier)) return "FAMILY";
  return null;
}

function normalizedStatus(booking) {
  const raw = booking?.status;
  const name = typeof raw === "string"
    ? raw
    : raw?.name ?? raw?.title ?? booking?.status_name ?? booking?.statusName ?? "";
  const id = typeof raw === "object"
    ? raw?.id ?? raw?.status_id ?? booking?.status_id
    : booking?.status_id;
  return {
    id: id == null ? "" : String(id).trim(),
    name: String(name || "").trim().toLowerCase(),
  };
}

export function isInventoryBlockingBooking(booking, options = {}) {
  if (
    booking?.cancelled === true || booking?.canceled === true ||
    booking?.is_cancelled === true || booking?.is_canceled === true ||
    booking?.status?.is_cancelled === true || booking?.status?.is_canceled === true ||
    Boolean(booking?.dates?.cancellation)
  ) return false;

  const status = normalizedStatus(booking);
  const nonBlockingStatusIds = options.nonBlockingStatusIds || new Set();
  const nonBlockingStatusNames = options.nonBlockingStatusNames || CANCELLED_STATUS_NAMES;
  if (status.id && nonBlockingStatusIds.has(status.id)) return false;
  if (status.name && nonBlockingStatusNames.has(status.name)) return false;
  if (options.debug && status.name && !options.knownStatusNames?.has(status.name)) {
    options.logger?.warn?.("[BNOVO] unknown status treated as blocking", {
      statusId: status.id || null,
      statusName: status.name,
    });
  }
  return true;
}

export function extractBookingDates(booking) {
  const dates = booking?.dates || {};
  const arrival = dates.arrival || dates.original_arrival || booking?.arrival || booking?.check_in;
  const departure = dates.departure || dates.original_departure || booking?.departure || booking?.check_out;
  return {
    checkIn: String(arrival || "").slice(0, 10),
    checkOut: String(departure || "").slice(0, 10),
  };
}

function bookingTimestampValues(booking) {
  const dates = booking?.dates || {};
  return {
    arrival: dates.arrival || dates.original_arrival || booking?.arrival || booking?.check_in,
    departure: dates.departure || dates.original_departure || booking?.departure || booking?.check_out,
  };
}

export function hasValidBookingWindow(booking, { hotelOffsetMinutes = 300 } = {}) {
  const dates = booking?.dates || {};
  const arrival = dates.arrival || dates.original_arrival || booking?.arrival || booking?.check_in;
  const departure = dates.departure || dates.original_departure || booking?.departure || booking?.check_out;
  const hasBookingTimes = /[ T]\d{2}:\d{2}/.test(String(arrival || "")) && /[ T]\d{2}:\d{2}/.test(String(departure || ""));
  if (hasBookingTimes) {
    const existingStart = parseBnovoTimestamp(arrival, hotelOffsetMinutes);
    const existingEnd = parseBnovoTimestamp(departure, hotelOffsetMinutes);
    return Number.isFinite(existingStart) && Number.isFinite(existingEnd) && existingEnd > existingStart;
  }
  const normalized = extractBookingDates(booking);
  return DATE_ONLY.test(normalized.checkIn) && DATE_ONLY.test(normalized.checkOut) && normalized.checkOut > normalized.checkIn;
}

export function bookingOverlapsRequest(booking, request, { hotelOffsetMinutes = 300 } = {}) {
  if (!hasValidBookingWindow(booking, { hotelOffsetMinutes })) return false;
  const dates = booking?.dates || {};
  const arrival = dates.arrival || dates.original_arrival || booking?.arrival || booking?.check_in;
  const departure = dates.departure || dates.original_departure || booking?.departure || booking?.check_out;
  const hasBookingTimes = /[ T]\d{2}:\d{2}/.test(String(arrival || "")) && /[ T]\d{2}:\d{2}/.test(String(departure || ""));
  if (hasBookingTimes) {
    const requestedStart = request?.startAt
      ? Date.parse(request.startAt)
      : Date.parse(`${request.checkIn}T00:00:00${timezoneSuffix(hotelOffsetMinutes)}`);
    const requestedEnd = request?.endAt
      ? Date.parse(request.endAt)
      : Date.parse(`${request.checkOut}T00:00:00${timezoneSuffix(hotelOffsetMinutes)}`);
    const existingStart = parseBnovoTimestamp(arrival, hotelOffsetMinutes);
    const existingEnd = parseBnovoTimestamp(departure, hotelOffsetMinutes);
    return existingStart < requestedEnd && existingEnd > requestedStart;
  }
  const normalized = extractBookingDates(booking);
  return overlapsDateRange(request.checkIn, request.checkOut, normalized.checkIn, normalized.checkOut);
}

export function overlapsDateRange(requestedCheckIn, requestedCheckOut, existingCheckIn, existingCheckOut) {
  if (![requestedCheckIn, requestedCheckOut, existingCheckIn, existingCheckOut]
    .every((value) => DATE_ONLY.test(String(value)))) return false;
  return existingCheckIn < requestedCheckOut && existingCheckOut > requestedCheckIn;
}

async function parseJsonResponse(response) {
  try {
    const data = await response.json();
    if (data == null || typeof data !== "object") throw new Error("invalid JSON shape");
    return data;
  } catch (error) {
    throw new BnovoUnavailableError("Bnovo returned invalid JSON", { cause: error });
  }
}

function bookingItemsAndPagination(data) {
  const payload = data?.data ?? data;
  const items = Array.isArray(payload?.bookings) ? payload.bookings
    : Array.isArray(payload?.items) ? payload.items
      : Array.isArray(payload) ? payload : null;
  if (!items) throw new BnovoUnavailableError("Bnovo returned an unexpected response shape");
  const meta = payload?.meta ?? data?.meta ?? {};
  const numeric = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };
  return {
    items,
    payload,
    pagination: {
      total: numeric(meta?.total),
      limit: numeric(meta?.limit),
      offset: numeric(meta?.offset),
    },
  };
}

export function createBnovoClient({
  env = process.env,
  fetchImpl = fetch,
  now = () => Date.now(),
  sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)),
  logger = console,
} = {}) {
  const baseUrl = String(env.BNOVO_API_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, "");
  const authUrl = String(env.BNOVO_AUTH_URL || DEFAULT_AUTH_URL);
  const accountId = String(env.BNOVO_ID || "").trim();
  const apiKey = String(env.BNOVO_API_KEY || "");
  const debug = envFlag(env.BNOVO_DEBUG);
  const cacheTtlMs = Math.min(60_000, Math.max(30_000, Number(env.BNOVO_AVAILABILITY_CACHE_TTL_MS || DEFAULT_CACHE_TTL_MS)));
  const timeoutMs = Math.max(1_000, Number(env.BNOVO_TIMEOUT_MS || DEFAULT_TIMEOUT_MS));
  const nonBlockingStatusIds = splitIds(env.BNOVO_NON_BLOCKING_STATUS_IDS);
  const configuredNonBlockingNames = splitIds(env.BNOVO_NON_BLOCKING_STATUS_NAMES);
  const nonBlockingStatusNames = configuredNonBlockingNames.size
    ? new Set([...configuredNonBlockingNames].map((value) => value.toLowerCase()))
    : CANCELLED_STATUS_NAMES;
  const mapping = buildRoomMapping(env);
  const hotelOffsetMinutes = Number(env.HOTEL_TZ_OFFSET || 5) * 60;
  const minRequestIntervalMs = Math.max(
    0,
    Number(env.BNOVO_MIN_REQUEST_INTERVAL_MS ?? DEFAULT_MIN_REQUEST_INTERVAL_MS),
  );
  let token = null;
  let tokenExpiresAt = 0;
  let authInFlight = null;
  const rangeCache = new Map();
  const rangeInFlight = new Map();
  let lastBookingsRequestAt = null;
  let requestThrottle = Promise.resolve();

  function debugLog(message, details = {}) {
    if (debug) logger.log?.(`[BNOVO] ${message}`, details);
  }

  async function fetchWithTimeout(url, init) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    timeout.unref?.();
    try {
      return await fetchImpl(url, { ...init, signal: controller.signal });
    } catch (error) {
      throw new BnovoUnavailableError("Bnovo request failed", { cause: error });
    } finally {
      clearTimeout(timeout);
    }
  }

  async function authenticate(force = false) {
    if (!accountId || !apiKey) throw new BnovoUnavailableError("Bnovo credentials are not configured");
    if (!force && token && tokenExpiresAt > now() + 30_000) return token;
    if (!force && authInFlight) return authInFlight;
    const request = (async () => {
      const response = await fetchWithTimeout(authUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ id: Number(accountId), password: apiKey }),
      });
      debugLog("auth response", { endpoint: "/auth", status: response.status });
      if (!response.ok) throw new BnovoUnavailableError(`Bnovo authentication failed (${response.status})`);
      const body = await parseJsonResponse(response);
      const payload = body?.data ?? body;
      if (!payload?.access_token) throw new BnovoUnavailableError("Bnovo authentication returned no access token");
      const reportedTtl = Number(payload.expires_in);
      const ttlSeconds = Number.isFinite(reportedTtl) && reportedTtl > 0
        ? Math.min(reportedTtl, DEFAULT_TOKEN_TTL_SECONDS) : DEFAULT_TOKEN_TTL_SECONDS;
      token = String(payload.access_token);
      tokenExpiresAt = now() + ttlSeconds * 1000;
      return token;
    })();
    authInFlight = request;
    try { return await request; }
    finally { if (authInFlight === request) authInFlight = null; }
  }

  async function authenticatedFetch(path, { beforeSend } = {}) {
    const send = async (accessToken) => fetchWithTimeout(`${baseUrl}${path}`, {
      method: "GET",
      headers: { Accept: "application/json", Authorization: `Bearer ${accessToken}` },
    });
    const guardedSend = async (accessToken) => {
      await beforeSend?.();
      return send(accessToken);
    };
    let response = await guardedSend(await authenticate());
    debugLog("request response", { endpoint: path.split("?")[0], status: response.status });
    if (response.status === 401) {
      token = null;
      tokenExpiresAt = 0;
      response = await guardedSend(await authenticate(true));
      debugLog("request retry response", { endpoint: path.split("?")[0], status: response.status });
    }
    return response;
  }

  async function throttleBookingsRequest() {
    const previous = requestThrottle;
    let release;
    requestThrottle = new Promise((resolve) => { release = resolve; });
    await previous;
    try {
      if (lastBookingsRequestAt != null) {
        const remaining = lastBookingsRequestAt + minRequestIntervalMs - now();
        if (remaining > 0) await sleep(remaining);
      }
      lastBookingsRequestAt = now();
    } finally {
      release();
    }
  }

  function diagnosticsFromTracker(tracker) {
    return {
      strategy: tracker.strategy,
      requestCount: tracker.requestCount,
      uniqueBookingCount: tracker.uniqueBookingCount,
      duplicateCount: tracker.duplicateCount,
      repeatedPageProtectionTriggered: tracker.repeatedPageProtectionTriggered,
      lastHttpStatus: tracker.lastHttpStatus,
      responseMetadata: tracker.responseMetadata,
    };
  }

  function paginationError(code, message, tracker) {
    return new BnovoUnavailableError(message, {
      code,
      diagnostics: diagnosticsFromTracker(tracker),
    });
  }

  async function fetchBookingsPage(dateFrom, dateTo, offset, tracker) {
    const query = new URLSearchParams({
      date_from: dateFrom,
      date_to: dateTo,
      data_type: "checkmate",
      limit: String(PAGE_SIZE),
      offset: String(offset),
    });
    let response;
    let lastError;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        response = await authenticatedFetch(`/bookings?${query}`, {
          beforeSend: async () => {
            await throttleBookingsRequest();
            tracker.requestCount += 1;
          },
        });
        tracker.lastHttpStatus = response.status;
        if ((response.status === 429 || response.status >= 500) && attempt === 0) {
          debugLog("retrying transient bookings response", { status: response.status });
          continue;
        }
        lastError = null;
        break;
      } catch (error) {
        lastError = error;
        if (attempt === 0) {
          debugLog("retrying transient bookings transport failure");
          continue;
        }
      }
    }
    if (lastError) {
      if (lastError instanceof BnovoUnavailableError && !lastError.diagnostics) {
        lastError.diagnostics = diagnosticsFromTracker(tracker);
      }
      throw lastError;
    }
    if (!response.ok) {
      throw new BnovoUnavailableError(`Bnovo bookings request failed (${response.status})`, {
        diagnostics: diagnosticsFromTracker(tracker),
      });
    }
    const data = await parseJsonResponse(response);
    const parsed = bookingItemsAndPagination(data);
    if (!tracker.responseMetadata) {
      tracker.responseMetadata = safeResponseMetadata(
        data,
        parsed.payload,
        parsed.items,
        parsed.pagination,
      );
      debugLog("bookings response metadata", tracker.responseMetadata);
    }
    debugLog("bookings page", {
      dateFrom,
      dateTo,
      status: response.status,
      count: parsed.items.length,
      offset,
      pagination: parsed.pagination,
    });
    return parsed;
  }

  function requireStableIdentifiers(items, tracker) {
    const identifiers = items.map(stableBookingIdentifier);
    if (identifiers.some((identifier) => !identifier)) {
      throw paginationError(
        "BNOVO_BOOKING_IDENTIFIER_MISSING",
        "Bnovo booking has no stable identifier",
        tracker,
      );
    }
    return identifiers;
  }

  async function loadNativeWindow(dateFrom, dateTo, tracker, firstPage = null) {
    const first = firstPage || await fetchBookingsPage(dateFrom, dateTo, 0, tracker);
    const { total, limit, offset } = first.pagination;
    if (
      total == null || limit !== PAGE_SIZE || offset !== 0 ||
      total < 0 || first.items.length > PAGE_SIZE
    ) {
      throw paginationError(
        "BNOVO_PAGINATION_UNRELIABLE",
        "Bnovo pagination metadata is missing or inconsistent",
        tracker,
      );
    }
    const requiredPages = Math.ceil(total / PAGE_SIZE);
    if (requiredPages > MAX_PAGES_PER_WINDOW) {
      return { needsDateChunking: true };
    }

    const all = [];
    const fingerprints = new Set();
    for (let pageIndex = 0; pageIndex < Math.max(1, requiredPages); pageIndex += 1) {
      if (pageIndex >= MAX_PAGES_PER_WINDOW) {
        throw paginationError(
          "BNOVO_PAGINATION_LIMIT_EXCEEDED",
          "Bnovo pagination exceeded the per-window safety limit",
          tracker,
        );
      }
      const expectedOffset = pageIndex * PAGE_SIZE;
      const page = pageIndex === 0
        ? first
        : await fetchBookingsPage(dateFrom, dateTo, expectedOffset, tracker);
      if (
        page.pagination.total !== total ||
        page.pagination.limit !== PAGE_SIZE ||
        page.pagination.offset !== expectedOffset
      ) {
        throw paginationError(
          "BNOVO_PAGINATION_UNRELIABLE",
          "Bnovo pagination metadata changed between pages",
          tracker,
        );
      }
      const identifiers = requireStableIdentifiers(page.items, tracker);
      const fingerprint = identifiers.map((identifier) => identifier.key).sort().join("|");
      if (fingerprint && fingerprints.has(fingerprint)) {
        tracker.repeatedPageProtectionTriggered = true;
        throw paginationError(
          "BNOVO_PAGINATION_REPEATED_PAGE",
          "Bnovo pagination repeated a previously returned page",
          tracker,
        );
      }
      if (fingerprint) fingerprints.add(fingerprint);
      all.push(...page.items);
    }
    if (all.length !== total) {
      throw paginationError(
        "BNOVO_PAGINATION_INCOMPLETE",
        "Bnovo pagination did not return the advertised booking count",
        tracker,
      );
    }
    return { items: all, needsDateChunking: false };
  }

  function mergeUniqueBookings(target, items, tracker) {
    for (const booking of items) {
      const identifier = stableBookingIdentifier(booking);
      if (!identifier) {
        throw paginationError(
          "BNOVO_BOOKING_IDENTIFIER_MISSING",
          "Bnovo booking has no stable identifier",
          tracker,
        );
      }
      if (target.has(identifier.key)) tracker.duplicateCount += 1;
      else target.set(identifier.key, booking);
    }
    tracker.uniqueBookingCount = target.size;
  }

  async function loadChunkedWindow(dateFrom, dateTo, tracker, chunkDays = DATE_CHUNK_DAYS) {
    const unique = new Map();
    for (const chunk of splitDateWindow(dateFrom, dateTo, chunkDays)) {
      const first = await fetchBookingsPage(chunk.dateFrom, chunk.dateTo, 0, tracker);
      const loaded = await loadNativeWindow(chunk.dateFrom, chunk.dateTo, tracker, first);
      if (loaded.needsDateChunking) {
        const days = calendarDaysBetween(chunk.dateFrom, chunk.dateTo);
        if (days <= 1) {
          throw paginationError(
            "BNOVO_PAGINATION_LIMIT_EXCEEDED",
            "A one-day Bnovo window exceeds the pagination safety limit",
            tracker,
          );
        }
        const nested = await loadChunkedWindow(
          chunk.dateFrom,
          chunk.dateTo,
          tracker,
          Math.max(1, Math.floor(days / 2)),
        );
        mergeUniqueBookings(unique, nested, tracker);
      } else {
        mergeUniqueBookings(unique, loaded.items, tracker);
      }
    }
    return [...unique.values()];
  }

  async function getBookingsDetailed({ dateFrom, dateTo }) {
    const key = `${dateFrom}|${dateTo}`;
    const cached = rangeCache.get(key);
    if (cached && cached.expiresAt > now()) return cached.result;
    if (rangeInFlight.has(key)) return rangeInFlight.get(key);
    const request = (async () => {
      const tracker = {
        strategy: "native-pagination",
        requestCount: 0,
        uniqueBookingCount: 0,
        duplicateCount: 0,
        repeatedPageProtectionTriggered: false,
        lastHttpStatus: null,
        responseMetadata: null,
      };
      const first = await fetchBookingsPage(dateFrom, dateTo, 0, tracker);
      const native = await loadNativeWindow(dateFrom, dateTo, tracker, first);
      let bookings;
      if (native.needsDateChunking) {
        if (calendarDaysBetween(dateFrom, dateTo) <= 1) {
          throw paginationError(
            "BNOVO_PAGINATION_LIMIT_EXCEEDED",
            "A one-day Bnovo window exceeds the pagination safety limit",
            tracker,
          );
        }
        tracker.strategy = "date-chunking";
        bookings = await loadChunkedWindow(dateFrom, dateTo, tracker);
      } else {
        const unique = new Map();
        mergeUniqueBookings(unique, native.items, tracker);
        bookings = [...unique.values()];
      }
      const result = { bookings, diagnostics: diagnosticsFromTracker(tracker) };
      rangeCache.set(key, { result, expiresAt: now() + cacheTtlMs });
      return result;
    })();
    rangeInFlight.set(key, request);
    try { return await request; }
    finally { if (rangeInFlight.get(key) === request) rangeInFlight.delete(key); }
  }

  async function getBookings(input) {
    return (await getBookingsDetailed(input)).bookings;
  }

  function assertRoomMapping(roomType) {
    const ids = mapping[String(roomType || "").toUpperCase()];
    if (!(ids instanceof Set) || ids.size === 0) {
      throw new BnovoMappingError(`Bnovo mapping is missing for ${String(roomType || "UNKNOWN").toUpperCase()}`);
    }
    for (const identifier of mapping.STANDARD) {
      if (mapping.FAMILY.has(identifier)) throw new BnovoMappingError(`Bnovo identifier ${identifier} is assigned to multiple room types`);
    }
  }

  function bookingBlocksInventory(booking) {
    return isInventoryBlockingBooking(booking, { debug, logger, nonBlockingStatusIds, nonBlockingStatusNames });
  }

  function debugAvailabilityDecision(booking, request, decision = {}) {
    if (!debug) return null;
    const trace = buildSafeAvailabilityTrace(
      booking,
      request,
      mapping,
      { hotelOffsetMinutes },
    );
    if (Object.hasOwn(decision, "mappedRoomType")) trace.mappedRoomType = decision.mappedRoomType;
    if (Object.hasOwn(decision, "overlap")) trace.overlap = decision.overlap;
    if (Object.hasOwn(decision, "skipReason")) trace.skipReason = decision.skipReason;
    debugLog("availability decision", trace);
    return trace;
  }

  return {
    mapping,
    assertRoomMapping,
    bookingBlocksInventory,
    debugAvailabilityDecision,
    bookingOverlapsRequest: (booking, request) => bookingOverlapsRequest(booking, request, { hotelOffsetMinutes }),
    hasValidBookingWindow: (booking) => hasValidBookingWindow(booking, { hotelOffsetMinutes }),
    getBookings,
    getBookingsDetailed,
    clearCache() { rangeCache.clear(); },
  };
}

export const bnovoClient = createBnovoClient();

export async function getBookings(input) {
  return bnovoClient.getBookings(input);
}

export async function checkAvailability({ checkIn, checkOut, roomType }) {
  const normalizedRoomType = String(roomType || "").toUpperCase();
  try {
    bnovoClient.assertRoomMapping(normalizedRoomType);
    const bookings = await bnovoClient.getBookings({ dateFrom: checkIn, dateTo: checkOut });
    const blocking = bookings.filter((booking) => {
      if (mapBookingRoomType(booking, bnovoClient.mapping) !== normalizedRoomType) return false;
      if (!bnovoClient.bookingBlocksInventory(booking)) return false;
      const dates = extractBookingDates(booking);
      return overlapsDateRange(checkIn, checkOut, dates.checkIn, dates.checkOut);
    });
    return { ok: true, roomType: normalizedRoomType, available: blocking.length === 0, occupiedCount: blocking.length, source: ["bnovo"] };
  } catch (error) {
    return { ok: false, availabilityKnown: false, roomType: normalizedRoomType, available: false, code: error?.code || "BNOVO_UNAVAILABLE" };
  }
}

export function getSafeDiagnosticRows(bookings, mapping = buildRoomMapping()) {
  const unique = new Map();
  for (const booking of Array.isArray(bookings) ? bookings : []) {
    const identifier = getBookingRoomIdentifier(booking, mapping);
    const status = normalizedStatus(booking);
    const key = `${identifier}|${status.id}|${status.name}`;
    unique.set(key, {
      identifierField: mapping.identifierField,
      identifier: identifier || null,
      mappedRoomType: mapBookingRoomType(booking, mapping),
      statusId: status.id || null,
      statusName: status.name || null,
    });
  }
  return [...unique.values()];
}

export function getSafeBookingFields(booking) {
  if (!booking || typeof booking !== "object") return null;
  const safe = {};
  const directFields = [
    "id", "number", "booking_number", "room_name", "room_type_id",
    "room_type_code", "room_type_name", "category_id", "category_name",
    "room_category_id", "room_category_name", "plan_name",
  ];
  for (const field of directFields) {
    if (booking[field] !== undefined) safe[field] = booking[field];
  }
  const status = booking.status;
  if (status && typeof status === "object") {
    safe.status = {};
    if (status.id !== undefined) safe.status.id = status.id;
    if (status.name !== undefined) safe.status.name = status.name;
  }
  const dates = booking.dates;
  if (dates && typeof dates === "object") {
    safe.dates = {};
    for (const field of [
      "arrival", "departure", "original_arrival", "original_departure",
      "real_arrival", "real_departure",
    ]) {
      if (dates[field] !== undefined) safe.dates[field] = dates[field];
    }
  }

  const directFieldSet = new Set(directFields);
  const extra = {};
  const visit = (value, path = "") => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return;
    for (const [key, child] of Object.entries(value)) {
      const nextPath = path ? `${path}.${key}` : key;
      const primitive = child == null || ["string", "number", "boolean"].includes(typeof child);
      const roomIdentifier = /(room|category).*(id|name|code)$/i.test(key);
      if (primitive && roomIdentifier && !(path === "" && directFieldSet.has(key))) {
        extra[nextPath] = child;
      }
      if (child && typeof child === "object" && !Array.isArray(child) &&
          !/(customer|guest|client|contact|passport|payment)/i.test(key)) {
        visit(child, nextPath);
      }
    }
  };
  visit(booking);
  if (Object.keys(extra).length) safe.otherRoomCategoryIdentifiers = extra;
  return safe;
}

export function buildSafeAvailabilityTrace(
  booking,
  request,
  mapping,
  { hotelOffsetMinutes = 300 } = {},
) {
  const status = normalizedStatus(booking);
  const blocking = isInventoryBlockingBooking(booking);
  const validWindow = hasValidBookingWindow(booking, { hotelOffsetMinutes });
  const mappedRoomType = mapBookingRoomType(booking, mapping);
  const overlap = validWindow
    ? bookingOverlapsRequest(booking, request, { hotelOffsetMinutes })
    : false;
  let skipReason = null;
  if (!blocking) skipReason = "STATUS_NON_BLOCKING";
  else if (!validWindow) skipReason = "INVALID_INTERVAL";
  else if (!mappedRoomType) skipReason = "ROOM_MAPPING_MISSING";
  else if (request?.roomType && mappedRoomType !== String(request.roomType).toUpperCase()) {
    skipReason = "ROOM_TYPE_MISMATCH";
  } else if (!overlap) skipReason = "NO_OVERLAP";
  const timestamps = bookingTimestampValues(booking);
  return {
    bookingId: booking?.id ?? booking?.booking_id ?? null,
    bookingNumber: booking?.number ?? booking?.booking_number ?? null,
    status: { id: status.id || null, name: status.name || null },
    parsedStart: formatTimestampAtOffset(timestamps.arrival, hotelOffsetMinutes),
    parsedEnd: formatTimestampAtOffset(timestamps.departure, hotelOffsetMinutes),
    requestedStart: request?.startAt || null,
    requestedEnd: request?.endAt || null,
    mappedRoomType,
    overlap,
    skipReason,
  };
}
