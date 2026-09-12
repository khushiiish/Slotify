# Slotify: Multi-Tenant B2B Appointment Booking Platform

Slotify is a production-grade multi-tenant B2B appointment scheduling SaaS platform designed for appointment-based service businesses (spas, salons, repair centers, clinics, consultancies).

Built with an **Express 5 + Mongoose 9** backend and a modern **React 19 + Vite** frontend in full JavaScript ES modules.

---

## Current Status: Phase 11 Completed

### Architecture Overview Across Phases

| Phase | Scope | Status | Test Coverage |
|---|---|---|---|
| **Phase 0** | Production Foundation, Express 5, Error Handling, Health Check, CORS, Logging | Completed | 6 tests |
| **Phase 1** | Database Architecture, Mongoose 9 Models, Tenant Indexes, Seed Script | Completed | 29 tests |
| **Phase 2** | JWT Cookie Authentication, Bcrypt Password Hashing, Session Validation | Completed | 18 tests |
| **Phase 3** | RBAC, Multi-Tenant Authorization, Anti-IDOR & Tenant Isolation | Completed | 18 tests |
| **Phase 4** | System Owner Business Onboarding & Management, Lifecycle Control | Completed | 16 tests |
| **Phase 5** | Business Admin Service & Staff Management, Safe Deletion & Reference Integrity | Completed | 31 tests |
| **Phase 6** | Availability Management, Blocked Dates & Timezone-Aware 15-Min Slot Generation | Completed | 22 tests |
| **Phase 7** | Booking Engine, Double-Booking Concurrency Protection & Overlap Prevention | Completed | 30 tests |
| **Phase 8** | Customer Experience & Public Scheduling, Anti-IDOR Token Security, Self-Cancellation | Completed | 20 tests |
| **Phase 9** | Appointment Management, Centralized State Machine, Filters, Calendar & Timezones | Completed | 28 tests |
| **Phase 10** | Business Admin Analytics, Recharts Visualizations, Platform Metrics, UI/UX Polish | Completed | 16 tests |
| **Phase 11** | Security Hardening, IDOR/ReDoS/NoSQL Audit, Concurrency Race Tests, Browser E2E | **Completed** | **26 tests (260 total)** |

---

## Phase 3: RBAC + Multi-Tenant Authorization + Tenant Isolation

### 1. Authentication vs. Authorization

* **Authentication (`authenticate` middleware)**:
  * Answers: *"Who are you?"*
  * Extracts and verifies the HTTP-only JWT session cookie (`slotify_token`).
  * Validates user and business active status against the database.
  * Attaches minimal, safe user context to `req.user` (`{ id, role, businessId }`).
  * Never attaches password hashes, tokens, or raw database documents.

* **Role-Based Authorization (`requireRole` middleware)**:
  * Answers: *"What role permissions do you possess?"*
  * Evaluates `req.user.role` against allowed roles (`SYSTEM_OWNER`, `BUSINESS_ADMIN`).
  * Returns `401 Unauthorized` if unauthenticated.
  * Returns `403 Forbidden` if role is insufficient.

* **Tenant Authorization (`requireBusinessAccess` middleware)**:
  * Answers: *"Which tenant data are you permitted to touch?"*
  * For `BUSINESS_ADMIN`, establishes `req.user.businessId` as the uncompromisable tenant boundary.
  * Prevents cross-tenant parameter tampering and IDOR.

---

### 2. Role Definitions

1. **`SYSTEM_OWNER`**:
   * Platform-wide super administrator.
   * `businessId` is strictly `null`.
   * Authorized for platform-level management endpoints (e.g. `GET /api/businesses`).
   * Authorized for cross-tenant operations only where explicitly exposed by platform-level routes.

2. **`BUSINESS_ADMIN`**:
   * Single-tenant administrative user.
   * Associated strictly with one business (`req.user.businessId`).
   * Can operate **only** within their own business boundary.
   * Denied from platform-wide administrative routes (`403 Forbidden`).
   * Denied from any route or resource belonging to another business (`403 Forbidden`).

---

### 3. Tenant Isolation Strategy & Zero-Trust Rule

#### Why Client-Supplied `businessId` Is Never Trusted
A common multi-tenant security flaw is trusting `businessId` sent in the request body, route parameter, or query string. In Slotify:
* **The authenticated user's JWT context (`req.user.businessId`) is the sole authority for tenant scoping.**
* If a `BUSINESS_ADMIN` attempts to supply a conflicting `businessId`:
  * Route parameter tampering: `/api/businesses/:otherBusinessId` → **`403 Forbidden`**
  * Query parameter tampering: `?businessId=otherBusinessId` → **`403 Forbidden`**
  * Body payload tampering: `{ "businessId": "otherBusinessId" }` → **`403 Forbidden`**
* For mutations (POST/PUT/PATCH), any missing `businessId` is automatically bound to `req.user.businessId` via `enforceTenantContext`.

---

### 4. Middleware Execution Flow

Every protected request passes through a sequential security pipeline:

```
Incoming Request
      ↓
[1. authenticate]
      ├── Missing/invalid/expired token → 401 Unauthorized
      ├── Disabled user status → 403 Forbidden
      ├── Disabled business status → 403 Forbidden
      └── Attaches req.user = { id, role, businessId }
      ↓
[2. requireRole(...allowedRoles)]
      ├── Role not in allowedRoles → 403 Forbidden
      └── Role permitted → next()
      ↓
[3. requireBusinessAccess('businessId')]
      ├── SYSTEM_OWNER → next() (Platform-level pass-through)
      ├── BUSINESS_ADMIN:
      │     ├── Missing req.user.businessId → 403 Forbidden
      │     ├── req.params.businessId !== req.user.businessId → 403 Forbidden
      │     ├── req.query.businessId !== req.user.businessId → 403 Forbidden
      │     ├── req.body.businessId !== req.user.businessId → 403 Forbidden
      │     └── Authoritative req.user.businessId bound
      ↓
[4. Controller / Service Handler]
      └── Enforces tenant-scoped database filter:
            Service.find(getTenantFilter(req.user, { businessId }))
            assertTenantOwnership(resource, req.user)
```

---

### 5. Resource Ownership & Anti-IDOR Pattern

To prevent Insecure Direct Object References (IDOR), resource identifiers alone are never sufficient to access tenant data.

1. **Scoped Query Filtering (`getTenantFilter`)**:
   ```javascript
   // Automatically injects tenant boundary for Business Admins
   const filter = getTenantFilter(req.user, { businessId });
   // Result for Business Admin: { businessId: req.user.businessId }
   const services = await Service.find(filter);
   ```

2. **Tenant Ownership Assertion (`assertTenantOwnership`)**:
   ```javascript
   const service = await Service.findById(serviceId);
   if (!service) {
     return res.status(404).json({ success: false, message: 'Service not found.' });
   }
   // Throws 403 Forbidden if service.businessId does not match req.user.businessId
   assertTenantOwnership(service, req.user);
   ```

---

### 6. Standardized Error Handling: 401 vs. 403

Slotify strictly follows RFC 7235 / RFC 7231 status conventions:

* **`401 Unauthorized`**: Request lacks valid authentication credentials.
  ```json
  {
    "success": false,
    "message": "Authentication required. No token provided."
  }
  ```
* **`403 Forbidden`**: Request is authenticated, but the user is denied permission or attempting cross-tenant access.
  ```json
  {
    "success": false,
    "message": "You do not have permission to access resources belonging to another business."
  }
  ```

Internal database errors, stack traces, and details that reveal other tenants' private IDs or data existence are never exposed.

---

### 7. Seed Data & Test Accounts

Seed data is initialized via `npm run seed --prefix backend`:

| Role | Email | Password | Business Context |
|---|---|---|---|
| **System Owner** | `owner@slotify.dev` | `DevPassword123!` | Platform Owner (`businessId: null`) |
| **Business Admin (Tenant A)** | `admin@urbanwellness.slotify.dev` | `DevPassword123!` | Urban Wellness Studio (`urban-wellness-studio`) |
| **Business Admin (Tenant B)** | `admin@techfix.slotify.dev` | `DevPassword123!` | TechFix Services (`techfix-services`) |

---

### 8. Phase 4: System Owner Business Onboarding & Management

Phase 4 introduces platform-level tenant governance exclusively for the `SYSTEM_OWNER`.

#### Platform Endpoints
* **`POST /api/businesses`**: Onboards a new business tenant and its initial Business Admin in an atomic workflow.
  * Inputs: Business details (name, optional custom slug, timezone, email, phone, address) + Admin credentials (name, email, password).
  * Auto-generates clean, URL-safe deterministic slugs with collision resolution (`-2`, `-3`).
  * Hashes admin password with bcrypt (work factor 12).
  * Never exposes `passwordHash` in responses.
* **`GET /api/businesses`**: Retrieves all registered businesses with populated administrative account summaries and live status counts.
* **`GET /api/businesses/:businessId`**: Retrieves comprehensive business details, contact metadata, and assigned administrative account.
* **`PATCH /api/businesses/:businessId/status`**: Toggles tenant lifecycle state (`ACTIVE` ↔ `DISABLED`).
  * When `DISABLED`, Business Admins attempting to authenticate or access tenant endpoints receive `403 Forbidden: "Your business account has been suspended or deactivated."`.
  * When restored to `ACTIVE`, legitimate operations resume seamlessly.

#### Architecture & Security Highlights
1. **Server-Side Validation**: Robust Zod schemas (`createBusinessSchema`, `updateBusinessStatusSchema`) with strict typing, slug regex constraints (`^[a-z0-9]+(?:-[a-z0-9]+)*$`), and email sanitization.
2. **Transaction Consistency & Fallback Cleanup**: Uses MongoDB replica-set transactions when available. In standalone developer environments without replica sets, automatic compensating cleanup removes orphaned business records if admin creation fails.
3. **Strict Data Exclusion**: All platform queries explicitly project `{ passwordHash: 0 }`.
4. **Gateway Lifecycle Check**: Auth middleware verifies `business.status === 'ACTIVE'` on every request, blocking disabled tenants before any controller code executes.

---

### 9. Automated Testing & Verification

The project includes **140 passing automated tests** across 7 suites:

1. `backend/tests/health.test.js` (6 tests) — Health, rate limiting, 404, CORS.
2. `backend/tests/models.test.js` (30 tests) — Mongoose schemas, tenant indexes, validations, staffId-null support.
3. `backend/tests/auth.test.js` (18 tests) — JWT cookies, login, /me, password hashing, disabled states.
4. `backend/tests/authorization.test.js` (18 tests) — RBAC, tenant authorization, IDOR, spoofing defenses.
5. `backend/tests/business-management.test.js` (16 tests) — Phase 4 onboarding, unique slug collisions, status toggle lifecycle, transaction atomicity, 403 blocks.
6. `backend/tests/service-staff-management.test.js` (31 tests) — Phase 5 Service and Staff CRUD, zero-trust tenant isolation, reference integrity protection, cross-tenant service assignment blocking, body spoofing defenses.
7. `backend/tests/availability-slots.test.js` (21 tests) — Phase 6 Availability window CRUD & overlaps, blocked date management, 15-min slot interval calculation, staff overrides vs business fallback, appointment collision avoidance, boundary touch testing, zero-trust tenant isolation.
8. `backend/tests/appointment-booking.test.js` (30 tests) — Phase 7 Booking engine validation (A-AJ), race-condition & concurrency prevention, 15-min slot interval alignment, any-staff assignment, non-UTC / Asia/Kolkata timezone handling, conflict 409 rejections, cancellation & slot release, and tenant isolation.

Run tests:
```bash
npm test --prefix backend
# Total: 170 tests passing across 8 suites
```

---

### 10. Phase 7 — Booking Engine & Appointment Architecture

- **Core Booking Engine**:
  * **Server Authoritative**: Server validates business status, service duration, staff assignment, working hour windows, blocked dates, and calculates `endTime = startTime + durationMinutes`.
  * **15-Minute Booking Intervals**: All booking start times enforce strict alignment to `:00`, `:15`, `:30`, or `:45`.
  * **Authoritative Timezone Handling**: Client sends local date and time in the business's authoritative timezone. The server converts them into absolute UTC `Date` objects before saving to MongoDB, preventing timezone skew across regions.
  * **Any-Staff Booking**: When `staffId` is omitted, the engine identifies all active staff members assigned to the service, checks each for availability windows, blocked dates, and active appointments, and assigns an eligible staff member.
  * **Overlap & Conflict Rules**:
    `newStart < existingEnd && newEnd > existingStart && status != 'CANCELLED'`.
    Back-to-back appointments (e.g., 10:00–11:00 and 11:00–12:00) are permitted. Overlapping requests are rejected with `409 Conflict`.
  * **Cancellation Lifecycle**: Cancelling an appointment marks its status as `CANCELLED`, which immediately frees the slot for subsequent bookings.
  * **Race Condition & Concurrency Defense**:
    - **In-Process FIFO Promise Queue**: Simultaneous booking requests targeting the same staff member are serialized through an atomic promise chain mutex (`acquireStaffLock`).
    - **MongoDB Transaction Session**: When connected to a replica set (e.g. MongoDB Atlas), transactions ensure document-level write locks on the staff record and atomic overlap query and appointment insertion, with graceful fallback in standalone environments.

- **Protected Appointment APIs**:
  * `POST /api/appointments` — Create appointment (enforces tenant context, validates all rules).
  * `GET /api/appointments` — List tenant appointments with optional filters (`date`, `status`, `staffId`, `serviceId`).
  * `GET /api/appointments/:id` — Get appointment details (protected against cross-tenant IDOR).
  * `PATCH /api/appointments/:id/cancel` — Cancel appointment and release slot.

- **Frontend Admin Experience**:
  * **Appointments Tab**: Filterable appointment table with status badges (`CONFIRMED`, `CANCELLED`).
  * **Test Booking Modal**: Allows admins to simulate customer bookings, selecting services, staff, date, 15-minute start times, and customer details.
  * **Instant Cancellation**: Admin can cancel appointments directly from the table with real-time status update.

---

### 11. Frontend Architecture: Dashboards

- **System Owner Dashboard (`/`)**:
  * Real-Time Platform Metrics: Total Registered Businesses, Active Tenants, Disabled Tenants.
  * Search & Filter: Real-time client-side search across business name, slug, email, and admin contact.
  * Accessible Onboarding Flow: Modal dialog with dual-section form (Business Metadata & Initial Admin Account) and real-time validation.
  * Details Inspection & Status Lifecycle: Modal providing full tenant profile, created timestamp, timezone, admin info, and toggle suspension controls.

- **Business Admin Dashboard (`/`)**:
  * Real-Time Tenant Metrics: Active Services, Inactive Services, Active Staff, Inactive Staff, Appointments.
  * Multi-Tab Interface:
    - **Services Tab**: Service catalog CRUD, duration in minutes, descriptions, and active status toggles.
    - **Staff Tab**: Staff roster management and multi-select assignment to active tenant services.
    - **Availability & Hours Tab**: Weekly recurring operating windows grouped by day of week (Monday–Sunday), business-wide vs staff-specific scope, overlap validation, and blocked dates calendar management.
    - **Slot Preview Tab**: Timezone-aware booking slot calculation engine showing 15-minute start interval bookable slots for any active service and date, with staff allocation badges, duration display, and empty states for blocked dates or non-working days.
    - **Appointments Tab**:
      * **Dual View Modes**: Seamless toggle between responsive **List View** and interactive **Calendar View**.
      * **Search & Multi-Criteria Filtering**: Real-time debounce search across customer name, email, and phone with regex sanitization; filter by Status (`CONFIRMED`, `COMPLETED`, `CANCELLED`, `NO_SHOW`), assigned Staff member, Service, and Date range (`startDate` to `endDate`, capped at 62 days).
      * **Centralized Status Lifecycle State Machine**: Server-enforced valid transitions (`CONFIRMED` -> `COMPLETED`, `CANCELLED`, `NO_SHOW`). Terminal state enforcement prevents mutations on `COMPLETED` or `CANCELLED` records.
      * **Appointment Details Modal / Drawer**: Full customer contact metadata, service duration & price, assigned staff, formatted start/end times in business timezone, status badge, notes, and direct lifecycle action buttons without leaking customer tokens.
      * **Interactive Calendar Component**: Full Month, Week, and Day views with today/prev/next controls, timezone badge, and color-coded status chips that open the appointment details directly from the grid.
      * **Admin Cancellation & Immediate Slot Release**: Cancels appointments with optional reason, freeing up slots immediately while maintaining audit history.
    - **Analytics Tab (Phase 10)**:
      * **Core Metrics & Rates**: Total bookings, confirmed, completed (with completion rate %), cancelled (with cancellation rate %), and no-shows, with division-by-zero protection.
      * **Date Range Presets**: 7-day, 30-day, and 90-day timeframes (bounded in business timezone; custom ranges capped at 92 days).
      * **Volume Trend Chart**: Recharts-powered area chart with smooth gradient and custom tooltip, maintaining continuous zero-filled dates without deceptive gaps.
      * **Status Distribution**: Donut chart with status-coded colors and percentage breakdowns.
      * **Service & Staff Performance**: Bookings and completion metrics grouped by service and staff member, sorted by volume descending.
      * **Strict Tenant Isolation**: All metrics are strictly derived from verified JWT tenant context; businessId parameter spoofing blocked with 403 Forbidden.
  * Safe Deletion & Status Toggles: Contextual confirmation dialogs preventing deletion when dependencies exist.
  * Zero-Trust Isolation: Strictly scoped to the authenticated admin's business ID, completely isolating tenant data from other businesses.

- **System Owner Analytics & Dashboard (`/`)**:
  * Real-Time Platform Metrics: Total Registered Businesses, Active Tenants, Disabled Tenants, and Total Platform Bookings across all tenants.
  * Accessible Onboarding Flow: Modal dialog with dual-section form (Business Metadata & Initial Admin Account).
  * Status Lifecycle Control: Instant suspension and reactivation of tenants.

- **Public Customer Portal (`/book/:businessSlug`)**:
  * Clean, branded booking interface by business slug.
  * Real-time slot generation at 15-minute start intervals respecting operating hours, staff assignments, blocked dates, and existing appointments.
  * Customer intake with client-side & server-side Zod validation.
  * Direct reuse of Phase 7 booking engine with concurrency guards and MongoDB unique overlap indexing.
  * Stale slot conflict handling (HTTP 409 Conflict) with automatic slot refresh.
  * Disabled tenant blocking: Immediate HTTP 403 Forbidden with user-friendly banner if business is inactive.

- **Customer Self-Service & Anti-IDOR Security (`/appointments/:id?token=...`)**:
  * Stateless Signed JWT Customer Access Token containing `{ appointmentId, customerEmail, businessId, type: 'CUSTOMER_APPOINTMENT_ACCESS' }`.
  * Zero-auth overhead: No customer passwords or account registrations needed.
  * Strict Anti-IDOR Enforcement: Missing token returns `401 Unauthorized`; invalid or cross-appointment token returns `403 Forbidden`.
  * Customer cancellation flow with confirmation modal; immediately frees up slots for public booking.

---

### 12. How to Run Locally

1. **Install Dependencies**:
   ```bash
   npm install --prefix backend
   npm install --prefix frontend
   ```

2. **Environment Variables**:
   * Backend: copy `backend/.env.example` to `backend/.env`
   * Frontend: copy `frontend/.env.example` to `frontend/.env`

3. **Database Setup**:
   ```bash
   npm run seed --prefix backend
   ```

4. **Start Development Servers**:
   ```bash
   # Terminal 1: Backend API (port 5000)
   npm run dev --prefix backend

   # Terminal 2: Frontend Client (port 5173)
   npm run dev --prefix frontend
   ```

5. **Build Frontend**:
   ```bash
   npm run build --prefix frontend
   ```

6. **Run Verification Suites**:
   ```bash
    # Automated vitest suite (234 tests across 11 test suites)
    npm test --prefix backend

    # Live runtime verification on running server (Phase 7 Booking Engine)
    node backend/scratch/verify_phase7_live.mjs

    # Live runtime verification on running server (Phase 8 Public Customer Experience)
    node backend/scratch/verify_phase8_live.mjs

    # Live runtime verification on running server (Phase 9 Appointment Management & Calendar)
    node backend/scratch/verify_phase9_live.mjs

    # Live runtime verification on running server (Phase 10 Business Analytics & Platform Metrics)
    node backend/scratch/verify_phase10_live.mjs

    # Live runtime verification on running server (Phase 11 Security Hardening & Concurrency Race Audit)
    node backend/scratch/verify_phase11_security_live.mjs
   ```

---

## Security

Slotify implements defense-in-depth security principles across every tier of the application stack.

### 1. Authentication Approach & HTTP-Only Cookie Strategy
* **Zero-Storage Tokens**: JWTs are never returned in JSON response bodies for storage in `localStorage` or `sessionStorage`, mitigating token theft via Cross-Site Scripting (XSS).
* **Strict Cookie Flags**: Authentication tokens are issued via `Set-Cookie` with `httpOnly: true`, `path: '/'`, `maxAge: 24h`, and environment-tailored `sameSite` (`lax` in local development, `none` + `secure: true` in production).
* **Active Status Verification**: Every authenticated request evaluates user active status and business active status against MongoDB before granting route access.

### 2. Role-Based Access Control (RBAC) & Privileges
* **Roles**: Strictly defined `SYSTEM_OWNER` and `BUSINESS_ADMIN`.
* **Privilege Enforcement**: Privileged platform-wide endpoints (`/api/businesses`, `/api/analytics/platform`) require `requireRole('SYSTEM_OWNER')`. Any attempt by `BUSINESS_ADMIN` to access platform endpoints returns `403 Forbidden`.

### 3. Strict Multi-Tenant Isolation & Anti-IDOR
* **Zero-Trust for Client Tenant Identifiers**: The authenticated user's JWT context (`req.user.businessId`) is the authoritative source for tenant boundaries.
* **Aggressive IDOR Defenses**:
  - URL parameter tampering (`/api/services/:foreignServiceId`) $\rightarrow$ `403 Forbidden`.
  - Query parameter tampering (`?businessId=otherBizId`) $\rightarrow$ `403 Forbidden`.
  - Body parameter spoofing (`{ "businessId": "otherBizId" }`) $\rightarrow$ `403 Forbidden`.
* Cross-tenant data leaks are mathematically impossible in queries due to mandatory `{ businessId: req.user.businessId }` filtering.

### 4. Server-Side Validation & Input Sanitization
* **Strict Zod Schemas**: Every incoming request body and query parameter is validated against strict Zod schemas before hitting controllers.
* **Malformed ObjectId Protection**: Hexadecimal 24-character ObjectId regex guards prevent Mongoose CastErrors, returning clean `400 Bad Request` instead of 500 internal server exceptions.
* **NoSQL Injection Resistance**: Inputs are strictly validated against primitive types (string, number, boolean). Object operators such as `{ "$ne": null }` or `{ "$gt": "" }` are rejected with `400 Bad Request`.
* **ReDoS & Regex Escaping**: All text search parameters (customer name, email, phone) pass through regex escaping (`/[.*+?^${}()|[\]\\]/g`) prior to query construction.

### 5. Booking Conflict & Race Condition Protection
* **Two-Tier Concurrency Guards**:
  1. In-process staff-level serialization locks (`acquireStaffLock`) serialize simultaneous booking attempts for the same staff member.
  2. Database-level atomic overlap query inside a transactional session (`slotStart < appt.endTime AND slotEnd > appt.startTime`) prevents double-booking.
* Conflicting or stale slot requests are immediately rejected with `409 Conflict`, while exactly one request succeeds (`201 Created`).

### 6. Customer Appointment Token Security
* **Stateless Cryptographic Binding**: Customer access tokens use HMAC SHA-256 JWT signatures binding `appointmentId`, `customerEmail`, `businessId`, and `type: 'CUSTOMER_APPOINTMENT_ACCESS'`.
* **Tamper-Evident**: Any alteration to appointment ID, customer email, or signature results in immediate `401/403` rejection.
* **Cross-Tenant Guard**: Tokens issued for Business A cannot view or cancel appointments for Business B (`403 Forbidden`).
* **Terminal Status Protection**: Completed and no-show appointments cannot be cancelled by customers (`400 Bad Request`).

### 7. Rate Limiting & Abuse Prevention
* **Global API Rate Limiter**: 200 requests per 15-minute window per IP (`RateLimit-*` headers).
* **Auth Rate Limiter**: 30 login attempts per 15-minute window per IP (prevents credential stuffing).
* **Public Booking Rate Limiter**: 60 booking creation and cancellation requests per 15-minute window per IP.

### 8. Security Headers & Information Leakage Prevention
* **Helmet Middleware**: Configures modern security headers (Content Security Policy, X-Content-Type-Options, Strict-Transport-Security, X-Frame-Options).
* **CORS Restrictions**: Configured strictly to whitelist `CLIENT_URL` with credentials allowed.
* **Production Error Masking**: In production mode (`NODE_ENV=production`), all 500 error messages are masked as generic messages, and stack traces / internal filesystem paths are omitted.
* **Password Hash Redaction**: `passwordHash` is excluded from all user and business query projections.

### 9. Security Assumptions & Trade-offs
* **In-Memory Lock Scope**: The staff lock mechanism is optimized for single-instance or replica set deployments with database-level uniqueness enforcement as the ultimate source of truth.
* **Stateless Customer Tokens**: Customer access tokens are valid for 30 days and avoid database session table overhead; cancellation state is checked against the live appointment record on every request.
