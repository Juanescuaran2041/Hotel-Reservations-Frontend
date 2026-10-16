# Task Breakdown for AI Agents — Hotel Reservations Frontend

Project: React 19 + TypeScript + Vite frontend for a hotel reservation system.
Design pattern focus: **Facade** (structural pattern).

> The Facade pattern provides a unified, simplified interface to a larger set of
> complex subsystems. The UI (client) only talks to the facade and never to the
> subsystems directly. Subsystems are independent and unaware of each other.

## Global Rules (apply to every agent)

- All code, comments, identifiers, commit messages and documentation are written in **English**.
- Only the `src/` folder is versioned in the repository root (plus `task.md`).
- Components never import subsystems directly. They only use `ReservationFacade`.
- Subsystems must not import each other. Only the facade orchestrates them.
- Strict TypeScript: no `any`, explicit return types on public functions.
- No external HTTP backend: subsystems use in-memory mock data.
- Each agent works only inside the folders it owns to avoid merge conflicts.

## Target Structure

```
src/
├── types/                 # Shared domain types (Agent 1)
├── subsystems/            # Independent subsystems (Agents 2, 3, 4)
│   ├── rooms/
│   ├── pricing/
│   ├── payments/
│   └── notifications/
├── facade/                # ReservationFacade (Agent 5)
├── hooks/                 # React hooks wrapping the facade (Agent 6)
├── components/            # UI components (Agent 6, 7)
├── pages/                 # Screens (Agent 7)
├── App.tsx
└── main.tsx
```

## Execution Order

```
Agent 1 ──► Agents 2, 3, 4 (parallel) ──► Agent 5 ──► Agents 6, 7 (parallel) ──► Agent 8
```

---

## Agent 1 — Domain Types & Project Foundation

**Owns:** `src/types/`, cleanup of the Vite template in `src/`

- [ ] Remove the Vite template content from `App.tsx`, `App.css`, `assets/`.
- [ ] Create `src/types/index.ts` with: `Room`, `RoomType`, `Guest`, `Reservation`,
      `ReservationStatus`, `PriceBreakdown`, `PaymentInfo`, `PaymentResult`,
      `ReservationRequest`, `ReservationConfirmation`.
- [ ] Define the subsystem interfaces: `RoomService`, `PricingService`,
      `PaymentService`, `NotificationService`.
- [ ] Add global base styles in `src/index.css` (CSS variables, reset).

**Done when:** types compile with `tsc -b` and no template code remains.

## Agent 2 — Rooms Subsystem

**Owns:** `src/subsystems/rooms/`

- [ ] Implement `RoomService` with an in-memory catalog (at least 8 rooms, 3 types).
- [ ] `searchAvailableRooms(checkIn, checkOut, guests)`.
- [ ] `reserveRoom(roomId, checkIn, checkOut)` and `releaseRoom(...)`.
- [ ] Prevent overlapping bookings for the same room.

**Done when:** the service is usable on its own and has no dependency on other subsystems.

## Agent 3 — Pricing Subsystem

**Owns:** `src/subsystems/pricing/`

- [ ] Implement `PricingService.calculate(room, checkIn, checkOut)` returning a `PriceBreakdown`.
- [ ] Rules: nightly rate, weekend surcharge, 19% tax, 10% discount for stays of 5+ nights.
- [ ] Pure functions only, fully deterministic.

**Done when:** a breakdown is returned with subtotal, discounts, taxes and total.

## Agent 4 — Payments & Notifications Subsystems

**Owns:** `src/subsystems/payments/`, `src/subsystems/notifications/`

- [ ] `PaymentService.charge(info, amount)` with card validation (Luhn, expiry) and a simulated async delay.
- [ ] `PaymentService.refund(transactionId)`.
- [ ] `NotificationService.sendConfirmation(guest, reservation)` and `sendCancellation(...)`
      that log to an in-memory outbox readable by the UI.

**Done when:** both services work independently and expose only their interface.

## Agent 5 — Facade

**Owns:** `src/facade/`

- [ ] Create `ReservationFacade` composing the four subsystems.
- [ ] `searchRooms(criteria)` → rooms with their computed price.
- [ ] `bookRoom(request)` → validate, reserve room, charge payment, send notification,
      return `ReservationConfirmation`.
- [ ] Rollback: if payment fails, release the room; if notification fails, keep the booking.
- [ ] `cancelReservation(id)` → release room, refund, notify.
- [ ] Export a single shared instance `reservationFacade`.

**Done when:** a full booking and cancellation can be run with one call each.

## Agent 6 — Hooks & Reusable Components

**Owns:** `src/hooks/`, `src/components/`

- [ ] Hooks: `useRoomSearch`, `useBooking`, `useReservations` (loading, error, data states).
- [ ] Components: `RoomCard`, `SearchForm`, `PriceSummary`, `PaymentForm`, `ReservationList`,
      `StatusBadge`, `ErrorMessage`, `Loader`.
- [ ] Components consume data only through the hooks, never subsystems.

**Done when:** every component renders from props and hooks with typed props.

## Agent 7 — Pages & Navigation

**Owns:** `src/pages/`, `src/App.tsx`, `src/main.tsx`

- [ ] Pages: `SearchPage`, `BookingPage`, `ConfirmationPage`, `MyReservationsPage`.
- [ ] Simple state-based navigation (no router dependency required).
- [ ] Responsive layout, accessible forms (labels, keyboard navigation).

**Done when:** the full flow search → book → confirm → cancel works in the browser.

## Agent 8 — Quality, Documentation & Review

**Owns:** `README.md` (kept locally), review of all of `src/`

- [ ] Run `npm run lint` and `npm run build`; fix all errors.
- [ ] Verify no component or hook imports a subsystem directly.
- [ ] Verify subsystems do not import each other.
- [ ] Add JSDoc to the facade and the subsystem interfaces.
- [ ] Document the Facade pattern usage with a short diagram (client → facade → subsystems).
- [ ] Manually test the happy path and the payment-failure rollback.

**Done when:** lint and build pass and the architecture rules above hold.
