# Bnovo v1 Availability Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Combine Bnovo v1 and local PostgreSQL inventory safely for both Khamsahotel room types.

**Architecture:** An injectable Bnovo client normalizes remote bookings; a pure availability service combines remote and local normalized bookings; Express exposes one aggregate endpoint and reuses it before payment. The existing React form consumes that endpoint without layout changes.

**Tech Stack:** Node.js 20, Express 4, node-fetch, PostgreSQL, React 19, Vite, Node test runner.

**Spec:** `docs/superpowers/specs/2026-10-03-bnovo-availability-design.md`

## Global Constraints

- Bnovo API v1 Start only; never call v2 or write to Bnovo.
- Never expose or log Bnovo credentials, JWTs, guest data, or payment data.
- Preserve the current UI design, layout, typography, spacing, responsive behavior, and user flow.
- Fail closed whenever Bnovo availability cannot be established.
- Use half-open date overlap and date-only comparisons.

## Review Focus

- Pagination metadata variants must not skip or loop pages.
- Unknown Bnovo statuses must consume inventory and emit only safe debug metadata.
- Missing room mapping must return unknown availability, never a false positive.
- A Bnovo failure during payment revalidation must stop payment creation.
- Existing pending/paid local bookings block while failed/cancelled local rows do not.

---

### Task 1: Bnovo v1 client and normalization

**Files:**
- Modify: `backend/bnovo.js`
- Create: `backend/test/bnovo.test.js`
- Create: `backend/scripts/diagnose-bnovo.js`
- Modify: `backend/package.json`

**Interfaces:**
- Produces: `createBnovoClient(options)`, `isInventoryBlockingBooking(booking)`, `mapBookingRoomType(booking, mapping)`, `overlapsDateRange(...)`, and default `getBookings(...)`.

- [ ] Write failing tests for exact identifier mapping, cancellation, half-open dates, pagination/cache, one retry after 401, and fail-closed errors.
- [ ] Run the focused test and verify each failure is caused by missing behavior.
- [ ] Implement the minimal client and diagnostic script.
- [ ] Run the focused test to green.

### Task 2: Combined availability service

**Files:**
- Create: `backend/availability.js`
- Create: `backend/test/availability.test.js`
- Modify: `backend/bookingCapacity.js`

**Interfaces:**
- Consumes: normalized Bnovo bookings and a local-booking loader.
- Produces: `validateAvailabilityQuery(input)` and `createAvailabilityService(dependencies).check(input)`.

- [ ] Write failing tests for invalid dates, same-day boundary, overlap, capacities 23/1, combined Bnovo/local counts, local cancellation, and secret-free errors.
- [ ] Run the focused test and verify expected failures.
- [ ] Implement validation and combined count calculation.
- [ ] Run the focused test to green.

### Task 3: Express routes and payment guard

**Files:**
- Modify: `backend/index.js`
- Modify: `backend/.env.example`
- Create: `backend/test/availabilityRoute.test.js`

**Interfaces:**
- Consumes: combined availability service.
- Produces: `GET /api/availability`, compatibility `GET /api/bnovo/availability`, and server-side payment revalidation.

- [ ] Write failing route-handler tests for 400 validation, 503 unknown availability, aggregate safe response, and payment blocking.
- [ ] Run focused tests and verify expected failures.
- [ ] Wire PostgreSQL active-booking loading, routes, and payment guard.
- [ ] Run backend tests to green.

### Task 4: Frontend integration

**Files:**
- Create: `src/utils/availability.js`
- Create: `test/availabilityClient.test.js`
- Modify: `src/components/header/Header.jsx`
- Modify: `src/pages/rooms/components/roomcard/RoomModal.jsx`
- Modify: `src/locales/en/translation.json`
- Modify: `src/locales/ru/translation.json`
- Modify: `src/locales/uz/translation.json`

**Interfaces:**
- Consumes: `GET /api/availability`.
- Produces: fail-closed selection and submit behavior for STANDARD and FAMILY.

- [ ] Write failing client tests for known available, sold out, malformed response, and transport failure.
- [ ] Run focused tests and verify expected failures.
- [ ] Integrate loading, unknown-state messaging, availability counts, and double-submit protection without styling changes.
- [ ] Run frontend tests and build.

### Task 5: Full verification

- [ ] Run `npm.cmd test` and confirm zero failures.
- [ ] Run `npm.cmd run build` and confirm exit code 0.
- [ ] Run `npm.cmd run lint` and report any pre-existing or introduced failures accurately.
- [ ] Review every requirement in the design and inspect the final diff/file list.
