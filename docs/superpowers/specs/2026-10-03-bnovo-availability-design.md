# Bnovo v1 Availability Integration Design

## Goal

Khamsahotel availability must fail closed and combine Bnovo API v1 Start bookings with active local PostgreSQL bookings without changing the existing visual design or booking flow.

## Current-state audit

- `backend/bnovo.js` authenticates with the obsolete `BNOVO_PASSWORD`, caches tokens for only 300 seconds by default, detects FAMILY through fragile text matching, uses inclusive UTC overlap logic, and returns STANDARD as always available.
- `backend/index.js` stores website payment attempts in `public.khamsachekin`; rows are inserted as `pending` before Octo payment and later become `paid` or `failed`. Capacity defaults are STANDARD 23 and FAMILY 1 and are mirrored into `public.room_types`.
- Existing local overlap SQL uses the correct half-open comparison, but the Bnovo route does not combine PostgreSQL rows and the payment path checks only local capacity.
- The home form sends a date, arrival time, duration, and `STANDARD`/`FAMILY`. It only calls Bnovo for FAMILY and treats Bnovo failures as available. The room page and My Booking page stage selections in browser storage; PostgreSQL persistence happens when `/create-payment` starts.
- No local-to-Bnovo linking field exists, so the two sources cannot be deduplicated reliably.

## Architecture

`backend/bnovo.js` will become a small injectable Bnovo v1 client. It will authenticate with `BNOVO_ID` and `BNOVO_API_KEY`, cache the JWT for up to one day, retry exactly once after HTTP 401, paginate `/bookings`, cache identical date ranges briefly, normalize status conservatively, and map bookings using exact identifier membership rather than name substrings.

The default identifier field is `room_name`, because the existing integration already records the real FAMILY physical-room identifier `1`. `BNOVO_FAMILY_ROOM_IDS=1` preserves that evidence. STANDARD identifiers are absent from the repository and must not be invented, so `BNOVO_STANDARD_ROOM_IDS` is required for STANDARD availability. A server-side diagnostic script will print only unique room/category identifiers and statuses, never guests or credentials.

`backend/availability.js` will validate date-only input, load both Bnovo and active local bookings, apply half-open overlap semantics (`start < requestedEnd && end > requestedStart`), and calculate `availableCount = max(0, capacity - bnovoCount - localCount)`. Local `failed`, `cancelled`, and `canceled` rows do not block; pending and paid rows do. Because there is no linking field, sources remain separate and are summed conservatively.

`GET /api/availability` will be the public endpoint. It accepts `checkIn`, `checkOut`, and optional `roomType`, returns only aggregate counts, and returns `503` with `availabilityKnown:false` when Bnovo or mapping is unavailable. The existing `/api/bnovo/availability` route remains as a compatibility wrapper without exposing secrets.

The existing form will call the unified endpoint for both room types, preserve its current modal/loading behavior, and block progression if availability is zero or unknown. `/create-payment` will recheck unified availability server-side before creating a payment.

## Error and privacy behavior

- Bnovo auth, timeout, invalid JSON, 429, or 5xx failures never become `available:true`.
- Unknown Bnovo statuses block inventory and are logged only when `BNOVO_DEBUG=true`; recognized cancellation names/flags do not block.
- Debug logs contain endpoint, dates, HTTP status, counts, room identifier, and status only. API keys, tokens, auth payloads, and guest data are never logged or returned.
- API responses contain aggregate room availability only.

## Testing

Node tests will cover half-open overlap, cancelled bookings, STANDARD and FAMILY capacities, multiple STANDARD rooms, one-time 401 retry, fail-closed behavior, combined sources, validation, pagination/cache behavior, and absence of secrets from response data. Existing tests and the Vite production build must remain green.

## API v1 limitation

API v1 is read-only. Website bookings stay in PostgreSQL and require operational synchronization into Bnovo; without a shared external ID, a booking manually copied into Bnovo can be double-counted.
