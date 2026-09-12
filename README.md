# Slotify — Multi-Tenant B2B Appointment Booking Platform

> **Production Deployment (Render Unified Service)**: [https://slotify.onrender.com](https://slotify.onrender.com)  
> **API Health Check**: [https://slotify.onrender.com/api/health](https://slotify.onrender.com/api/health)

Slotify is an enterprise-grade multi-tenant B2B appointment scheduling SaaS platform designed for service-oriented businesses (wellness centers, healthcare clinics, technical repair shops, consultancies). The platform delivers strict multi-tenant isolation, atomic concurrency protection against double-booking, deterministic timezone-aware slot generation, client self-service scheduling with cryptographically signed tokens, role-based dashboards, and platform-wide analytics.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Problem Statement](#2-problem-statement)
3. [Key Features](#3-key-features)
4. [User Roles](#4-user-roles)
5. [Complete User Flow](#5-complete-user-flow)
6. [Tech Stack](#6-tech-stack)
7. [Architecture](#7-architecture)
8. [Folder Structure](#8-folder-structure)
9. [Database & Data Models](#9-database--data-models)
10. [Authentication & Session Security](#10-authentication--session-security)
11. [Role-Based Access Control (RBAC)](#11-role-based-access-control-rbac)
12. [Multi-Tenant Isolation & Zero-Trust](#12-multi-tenant-isolation--zero-trust)
13. [Booking Engine & Atomic Concurrency](#13-booking-engine--atomic-concurrency)
14. [Availability & Slot Generation Engine](#14-availability--slot-generation-engine)
15. [Timezone Handling](#15-timezone-handling)
16. [Appointment Lifecycle & State Machine](#16-appointment-lifecycle--state-machine)
17. [Customer Appointment Token Security](#17-customer-appointment-token-security)
18. [Analytics & Reporting Engine](#18-analytics--reporting-engine)
19. [Security Hardening & Protection Defenses](#19-security-hardening--protection-defenses)
20. [API Route Overview](#20-api-route-overview)
21. [Environment Variables Reference](#21-environment-variables-reference)
22. [Local Setup Guide](#22-local-setup-guide)
23. [Automated Test Suite & Results](#23-automated-test-suite--results)
24. [Deployment Architecture](#24-deployment-architecture)
25. [Render Single-Service Deployment](#25-render-single-service-deployment)
26. [Dedicated Evaluator Credentials](#26-dedicated-evaluator-credentials)
27. [Final Verification Audit](#27-final-verification-audit)
28. [Known Limitations](#28-known-limitations)
29. [Future Improvements](#29-future-improvements)

---

## 1. Project Overview

Slotify bridges service businesses and their clients by delivering an integrated, high-performance scheduling platform. It addresses the operational friction found in traditional scheduling software: double-booking race conditions, cross-tenant data leaks, confusing timezone discrepancies, and bloated infrastructure.

The platform is deployed as a **single unified production service on Render**, where an Express 5 backend provides secure RESTful APIs while simultaneously serving the optimized React 19 single-page application (SPA) with full client-side routing fallback.

---

## 2. Problem Statement

Service-based businesses operate in high-concurrency environments where multiple customers simultaneously contend for limited staff and time windows. Typical booking software suffers from critical flaws:
* **Concurrency Vulnerabilities**: Overlapping requests create double bookings when queries and insertions are not atomically guarded.
* **Insecure Multi-Tenancy**: Relying on client-supplied `businessId` parameters allows malicious actors to access or tamper with other tenants' appointments, staff, and financial analytics.
* **Timezone Shifts**: Booking across different geographical timezones corrupts schedules unless UTC normalization is enforced end-to-end.
* **Token Misuse & IDOR**: Simple appointment ID URLs expose customer PII to enumeration attacks unless cryptographically signed access tokens are required.

Slotify eliminates these failure modes with zero-trust tenant enforcement, MongoDB atomic locking transactions, HMAC-SHA256 customer access tokens, and strict UTC-normalized availability calculations.

---

## 3. Key Features

* **Unified Single-Origin Architecture**: One public URL on Render serves both frontend UI and backend API with zero cross-origin cookie issues.
* **Strict Tenant Isolation**: All administrative queries are scoped automatically from the verified JWT session context. Client tampering via query, body, or route parameters is immediately rejected with HTTP 403.
* **Atomic Double-Booking Prevention**: Two-phase concurrency protection using staff availability locks and atomic database transactions. Conflicting concurrent bookings return HTTP 409 Conflict with zero race-condition double-bookings.
* **15-Minute Slot Generation Engine**: Dynamic, deterministic slot computation taking into account business hours, staff availability, service durations, blocked dates, and pre-existing appointments.
* **Self-Service Customer Booking & Cancellation**: Public booking portal allows customers to select services, choose available slots, enter details, receive instant confirmation, and cancel appointments securely.
* **Customer Token Access Control**: HMAC-SHA256 customer access tokens restrict viewing and cancelling appointments strictly to the appointment owner, preventing horizontal privilege escalation.
* **Administrative Full Calendar**: Interactive monthly and weekly calendar views displaying real-time appointments color-coded by status and staff member.
* **Interactive Analytics Engine**: Tenant-isolated metric calculations featuring appointment counts, revenue estimation, completion rates, cancellation rates, daily trends, and staff performance charts.
* **Enterprise Security Hardening**: Helmet security headers, rate limiters on public and authenticated endpoints, NoSQL injection sanitization, and ReDoS-safe input handling.

---

## 4. User Roles

1. **System Owner (`SYSTEM_OWNER`)**:
   * Platform-wide super administrator (`businessId: null`).
   * Onboards new businesses, monitors platform-wide tenant health, toggles business operational status (enable/disable), and inspects platform analytics across all tenants.
2. **Business Admin (`BUSINESS_ADMIN`)**:
   * Single-tenant administrative user strictly bound to one business (`req.user.businessId`).
   * Manages services, staff members, staff-service associations, weekly availability schedules, blocked dates, appointment calendar, and tenant-level business analytics.
   * Completely isolated from other businesses; cannot read or write data belonging to any other tenant.
3. **End Customer (Public / Unauthenticated)**:
   * Accesses public booking portals via `/book/:businessSlug`.
   * Views active services, generates real-time available slots, and books appointments.
   * Receives an encrypted customer appointment token to view or self-cancel their appointment via `/customer/appointments/:id?token=...`.

---

## 5. Complete User Flow

```
1. PLATFORM ONBOARDING (System Owner)
   System Owner Logs In → Creates Tenant (e.g. Urban Wellness Studio) → Sets Timezone & Initial Admin
   ↓
2. TENANT SETUP (Business Admin)
   Business Admin Logs In → Configures Services (Duration, Status) → Adds Staff → Sets Weekly Availability
   ↓
3. PUBLIC CUSTOMER BOOKING (Customer)
   Customer visits /book/:slug → Selects Service & Date → Slot Engine Generates Open Timeslots
   Customer Selects Slot → Submits Name & Email → Atomic Transaction Secures Slot
   ↓
4. CONFIRMATION & TOKEN MANAGEMENT
   System Returns 201 Created + HMAC Customer Token → Customer Receives Confirmation Screen
   Customer Views /customer/appointments/:id?token=... → Option to Cancel Appointment
   ↓
5. ADMIN MANAGEMENT & REPORTING
   Business Admin Views Appointments in List & FullCalendar → Updates Status (Completed, No-Show)
   Admin Reviews Analytics (Revenue, Completion Rate, Staff Workload)
```

---

## 6. Tech Stack

| Layer | Technology | Details |
|---|---|---|
| **Runtime** | Node.js (v20+ / v22+) | Full ES Modules (`"type": "module"`) |
| **Backend Framework** | Express.js 5.2.1 | Modern routing, error-handling middleware, single-service SPA static serving |
| **Database & ODM** | MongoDB Atlas / Mongoose 9.10 | ACID Transactions, Compound Unique Indexes, Strict Schema Validation |
| **Security & Auth** | JSON Web Tokens & Bcryptjs | HTTP-only Cookies, Work Factor 10, HMAC-SHA256 Customer Tokens |
| **Frontend Framework** | React 19.2.8 | Functional components, Hooks, Vite 8.3 build system |
| **Styling & Icons** | Tailwind CSS v4 & Lucide Icons | Responsive UI, modern glassmorphic theme, desktop & mobile optimized |
| **Data Visualization** | Recharts 3.10 | Responsive Bar charts, Line charts, Area charts |
| **Calendar Engine** | FullCalendar 6.1 / 7.1 | DayGrid, TimeGrid, interactive appointment modals |
| **Testing Suite** | Vitest 5.0 & Supertest 7.2 | 260 Unit, Integration, Concurrency, and Security Regression Tests |
| **Deployment** | Render Web Service | Unified single-origin hosting with `/api` routing and SPA fallback |

---

## 7. Architecture

```
                                      [ Browser Client ]
                                              │
                         HTTPS Request (Desktop / Mobile 375px-1440px)
                                              ▼
                    ┌──────────────────────────────────────────────────┐
                    │               RENDER WEB SERVICE                 │
                    │         https://slotify.onrender.com             │
                    │                                                  │
                    │   Express 5 Application Listener (Port 5000)     │
                    │                                                  │
                    │   ├── Helmet Headers (HSTS, NoSniff, XFrame)     │
                    │   ├── CORS Handler (Same-origin native support)  │
                    │   ├── Rate Limiting (API & Public Booking tiers) │
                    │   │                                              │
                    │   ├── [ /api/* Routes ] ─────────────────────┐   │
                    │   │   ├── Auth & JWT Cookie Middleware       │   │
                    │   │   ├── Tenant Isolation Guards            │   │
                    │   │   ├── Controllers & Services             │   │
                    │   │   └── JSON API Responses                 │   │
                    │   │                                          │   │
                    │   └── [ Static Assets & SPA Fallback ]       │   │
                    │       ├── express.static('frontend/dist')    │   │
                    │       └── GET * (Non-API) -> index.html      │   │
                    └──────────────────────────────────────────────┼───┘
                                                                   │
                                                      Mongoose 9 ODM Queries
                                                      & ACID Transactions
                                                                   ▼
                                                    ┌───────────────────────────┐
                                                    │       MONGODB ATLAS       │
                                                    │   Cluster0 Replica Set    │
                                                    │                           │
                                                    │   - Users                 │
                                                    │   - Businesses            │
                                                    │   - Services              │
                                                    │   - Staff                 │
                                                    │   - Availabilities        │
                                                    │   - BlockedDates          │
                                                    │   - Appointments          │
                                                    └───────────────────────────┘
```

---

## 8. Folder Structure

```
Slotify/
├── package.json                 # Root deployment package scripts (build, start, test)
├── render.yaml                  # Render Blueprint definition (web service, env vars)
├── README.md                    # Comprehensive documentation
├── .gitignore                   # Ignores .env, node_modules, dist, logs
├── backend/
│   ├── package.json             # Backend dependencies (express, mongoose, bcryptjs, etc.)
│   ├── src/
│   │   ├── server.js            # Server startup, DB connection, idempotent bootstrapping
│   │   ├── app.js               # Express app, security middleware, API router, SPA fallback
│   │   ├── config/
│   │   │   ├── db.js            # MongoDB connection & disconnection handlers
│   │   │   ├── env.js           # Zod-validated environment configuration
│   │   │   └── seed.js          # Idempotent database & evaluator credential seeding
│   │   ├── controllers/         # Request handling & HTTP response mapping
│   │   ├── middleware/          # authenticate, requireRole, requireBusinessAccess, rateLimit
│   │   ├── models/              # Mongoose schemas (Business, User, Service, Staff, Appointment)
│   │   ├── routes/              # Express routers (/auth, /businesses, /services, /public, etc.)
│   │   ├── services/            # Core business logic, slot generation, atomic booking
│   │   ├── utils/               # cookie helpers, jwt token signing, timezone helpers
│   │   └── validators/          # Zod validation schemas for request bodies and queries
│   ├── scratch/                 # hash_credentials.mjs, verify_phase11_security_live.mjs
│   └── tests/                   # 12 Vitest suites covering all 260 unit and integration tests
└── frontend/
    ├── package.json             # Frontend dependencies (react, lucide-react, recharts, fullcalendar)
    ├── vite.config.js           # Vite build configuration with React plugin
    ├── index.html               # SPA entrypoint with responsive meta and titles
    ├── dist/                    # Compiled production assets served by Express
    └── src/
        ├── App.jsx              # Client-side router, session checker, top navigation
        ├── App.css              # Global tokens, color palettes, responsive rules
        ├── components/          # Modals, calendar views, analytics charts, forms
        ├── pages/               # SystemOwnerDashboard, BusinessAdminDashboard, PublicBookingPage
        ├── services/            # Axios API layer with relative /api baseURL in production
        └── store/               # Zustand auth state store
```

---

## 9. Database & Data Models

1. **`Business`**: `name`, `slug` (unique index), `contactEmail`, `contactPhone`, `timezone`, `status` (`ACTIVE`/`DISABLED`), `isBookingDisabled`.
2. **`User`**: `email` (unique index), `passwordHash`, `name`, `role` (`SYSTEM_OWNER`/`BUSINESS_ADMIN`), `businessId` (null for System Owner), `status` (`ACTIVE`/`DISABLED`).
3. **`Service`**: `businessId` (tenant index), `name`, `description`, `durationMinutes`, `price`, `status` (`ACTIVE`/`INACTIVE`).
4. **`Staff`**: `businessId` (tenant index), `name`, `email`, `phone`, `serviceIds` (array of Service ObjectIds validated to belong to same tenant), `status` (`ACTIVE`/`INACTIVE`).
5. **`Availability`**: `businessId`, `staffId` (nullable for business-level), `dayOfWeek` (0–6), `startTime` ("HH:mm"), `endTime` ("HH:mm"), `isActive`. Compound index on `{ businessId: 1, staffId: 1, dayOfWeek: 1 }`.
6. **`BlockedDate`**: `businessId`, `staffId` (nullable for studio-wide holidays), `date` (UTC start of day), `reason`. Compound index on `{ businessId: 1, staffId: 1, date: 1 }`.
7. **`Appointment`**: `businessId`, `serviceId`, `staffId`, `customerName`, `customerEmail`, `customerPhone`, `startTime` (Date), `endTime` (Date), `status` (`CONFIRMED`, `COMPLETED`, `CANCELLED`, `NO_SHOW`), `notes`. Compound index on `{ businessId: 1, staffId: 1, startTime: 1, status: 1 }`.

---

## 10. Authentication & Session Security

* **Bcrypt Password Hashing**: All user passwords are encrypted using `bcryptjs` with a work factor of 10. Plaintext passwords are never stored in databases, logs, or frontend code.
* **HTTP-Only Cookies**: Authentication session tokens are transmitted strictly via HTTP-only cookies (`slotify_token`), blocking XSS token theft.
* **Same-Origin & Secure Flags**: In production on Render, cookies are set with `SameSite=Lax` (or `None` if cross-origin) and `Secure=true` over HTTPS.
* **Payload Isolation**: The signed JWT contains strictly `{ id, role, businessId }`. Password hashes and internal document references are never included.
* **Lifecycle Validation**: Even with a valid cryptographic signature, the `authenticate` middleware queries the database to verify the user account is active and that their associated business is enabled.

---

## 11. Role-Based Access Control (RBAC)

Slotify enforces strict role boundaries:
* **System Owner Routes**: Protected by `authenticate` and `requireRole('SYSTEM_OWNER')`. Business Admins attempting to access these routes receive HTTP 403 Forbidden.
* **Business Admin Routes**: Protected by `authenticate` and `requireRole('BUSINESS_ADMIN')`. System Owners cannot access tenant-scoped mutations that require a valid `businessId`.
* **Public Routes**: Open to unauthenticated clients for business discovery and slot generation, protected by rate limiting and schema validation.

---

## 12. Multi-Tenant Isolation & Zero-Trust

Slotify implements a zero-trust tenant architecture:
* **JWT as Single Source of Truth**: The authenticated user's `req.user.businessId` is the sole authority for tenant isolation.
* **Anti-IDOR Parameter Protection**:
  * If a request query string contains `?businessId=...` that does not match `req.user.businessId`, the middleware immediately aborts with **HTTP 403 Forbidden**.
  * If a request body contains `{ businessId: "..." }` attempting to spoof another tenant, the middleware immediately aborts with **HTTP 403 Forbidden**.
  * Route parameter mutations (`/api/services/:id`) verify that the target document's `businessId` matches `req.user.businessId`. Cross-tenant manipulation returns HTTP 403 or 404.

---

## 13. Booking Engine & Atomic Concurrency

To eliminate double-booking race conditions during high-volume customer scheduling:
1. **Two-Phase Concurrency Control**:
   * **Phase 1 (Availability Validation)**: Slot is verified against working hours, staff working schedules, blocked holiday dates, and existing confirmed appointments.
   * **Phase 2 (Atomic Execution)**: Booking execution is wrapped inside a staff-level lock and MongoDB atomic transaction with a compound query ensuring no overlapping appointment exists for that staff member:
     ```javascript
     const conflict = await Appointment.findOne({
       businessId,
       staffId,
       status: { $ne: 'CANCELLED' },
       $or: [
         { startTime: { $lt: requestedEnd, $gte: requestedStart } },
         { endTime: { $gt: requestedStart, $lte: requestedEnd } },
         { startTime: { $lte: requestedStart }, endTime: { $gte: requestedEnd } }
       ]
     }).session(session);
     ```
2. **Conflict Response**: If two clients submit for the exact same slot concurrently, exactly one succeeds (HTTP 201 Created) while the competing request is immediately rejected with **HTTP 409 Conflict** and the message *"Selected time slot is no longer available."*

---

## 14. Availability & Slot Generation Engine

* **Deterministic 15-Minute Grid**: Time is partitioned into discrete 15-minute intervals.
* **Staff Assignment Modes**:
  * Specific Staff: Evaluates availability, blocked dates, and conflicts for the requested staff member.
  * Any Staff: Scans all active staff members assigned to the service and pools open slots, selecting available staff dynamically.
* **Buffer & Boundary Rules**: Touch-boundary appointments are permitted (e.g. 10:00–10:30 followed by 10:30–11:00 for the same staff member).
* **Instant Re-availability**: When an appointment is cancelled, its timeslot immediately becomes available for re-booking.

---

## 15. Timezone Handling

* **Database UTC Normalization**: All appointment start and end times are stored in MongoDB as UTC ISO 8601 timestamps (`startTime: ISODate`).
* **Tenant Business Timezone**: Each business defines its operational timezone (e.g. `Asia/Kolkata`, `America/Los_Angeles`).
* **Conversion Pipeline**: Working hours (e.g. "09:00" to "17:00") and customer date queries (e.g. "2026-11-23") are translated to UTC boundaries using deterministic date-time calculations, ensuring consistent slot generation regardless of server physical location.

---

## 16. Appointment Lifecycle & State Machine

```
                  ┌───────────────┐
                  │   CONFIRMED   │ ◄─── (Created via Booking Engine)
                  └───────┬───────┘
                          │
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
   ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
   │  COMPLETED  │ │  CANCELLED  │ │   NO_SHOW   │
   └─────────────┘ └─────────────┘ └─────────────┘
```

* **Transition Rules**:
  * Only `CONFIRMED` appointments can transition to `COMPLETED`, `CANCELLED`, or `NO_SHOW`.
  * `CANCELLED` and `COMPLETED` appointments are terminal and cannot be retroactively modified.
  * When an appointment is cancelled, its staff slot is immediately released.

---

## 17. Customer Appointment Token Security

* **Token Signature**: Each appointment generates a signed customer access token using HMAC-SHA256:
  ```json
  {
    "appointmentId": "6aa401be...",
    "customerEmail": "customer@example.com",
    "businessId": "6aa401be...",
    "type": "CUSTOMER_APPOINTMENT_ACCESS",
    "exp": 1791839069
  }
  ```
* **Security Enforcement**:
  * Accessing `GET /api/public/appointments/:id` without a token returns **HTTP 401 Unauthorized**.
  * Supplying a malformed or tampered token returns **HTTP 403 Forbidden**.
  * Supplying a token belonging to Appointment A to inspect Appointment B returns **HTTP 403 Forbidden**.

---

## 18. Analytics & Reporting Engine

* **Tenant Isolation**: Business Admins can query only their own business's metrics. System Owners can query platform-wide metrics.
* **Metrics Calculated**:
  * Total bookings & Revenue estimation
  * Completion rate & Cancellation rate
  * Daily appointment volume trends
  * Staff performance breakdown (utilization and appointment count)
* **Date Range Safeguards**: Inverted dates (`startDate > endDate`) return HTTP 400. Ranges exceeding 92 days return HTTP 400.

---

## 19. Security Hardening & Protection Defenses

* **Helmet HTTP Headers**: Strict-Transport-Security, X-Frame-Options, X-Content-Type-Options, X-DNS-Prefetch-Control.
* **Rate Limiting**:
  * Public booking endpoints: 10 requests per 15 minutes per IP.
  * Authentication endpoints: 20 requests per 15 minutes per IP.
  * API endpoints: 300 requests per 15 minutes.
* **NoSQL Injection Prevention**: Zod schema validation strips and rejects operators (`$ne`, `$gt`, etc.) in request bodies.
* **ReDoS Protection**: Search queries are escaped against dangerous regex meta-characters.

---

## 20. API Route Overview

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/health` | Public | System and database connectivity check |
| `POST` | `/api/auth/login` | Public | Authenticate user, set HTTP-only cookie |
| `POST` | `/api/auth/logout` | Authenticated | Clear authentication cookie |
| `GET` | `/api/auth/me` | Authenticated | Return authenticated user profile |
| `GET` | `/api/businesses` | System Owner | List all platform businesses |
| `POST` | `/api/businesses` | System Owner | Onboard new business & initial admin |
| `PATCH` | `/api/businesses/:id/status` | System Owner | Toggle business ACTIVE/DISABLED |
| `GET` | `/api/services` | Business Admin | List services for admin's tenant |
| `POST` | `/api/services` | Business Admin | Create new service |
| `GET` | `/api/staff` | Business Admin | List staff members for admin's tenant |
| `POST` | `/api/staff` | Business Admin | Create staff member |
| `GET` | `/api/availability` | Business Admin | List recurring weekly availability |
| `POST` | `/api/availability` | Business Admin | Configure availability slots |
| `GET` | `/api/appointments` | Business Admin | Filter and list appointments |
| `PATCH` | `/api/appointments/:id/status` | Business Admin | Transition appointment status |
| `GET` | `/api/analytics/overview` | Business Admin | Retrieve tenant analytics |
| `GET` | `/api/analytics/platform` | System Owner | Retrieve platform-wide metrics |
| `GET` | `/api/public/businesses/:slug` | Public | Public business info & active services |
| `GET` | `/api/public/businesses/:slug/slots` | Public | Compute available timeslots |
| `POST` | `/api/public/businesses/:slug/appointments` | Public | Atomically book appointment |
| `GET` | `/api/public/appointments/:id` | Customer Token | Retrieve appointment confirmation |
| `PATCH` | `/api/public/appointments/:id/cancel` | Customer Token | Self-service cancellation |

---

## 21. Environment Variables Reference

| Variable | Required | Default | Description |
|---|---|---|---|
| `NODE_ENV` | Yes | `development` | Environment mode (`development`, `test`, `production`) |
| `PORT` | No | `5000` | Port for Express listener (Render assigns automatically) |
| `MONGO_URI` | Yes | — | MongoDB Atlas connection string with credentials |
| `JWT_SECRET` | Yes | — | Strong secret key for signing session & customer JWTs |
| `JWT_EXPIRES_IN`| No | `1d` | Token lifetime (`1d`, `7d`) |
| `COOKIE_NAME` | No | `slotify_token` | HTTP-only cookie name |
| `CLIENT_URL` | No | `http://localhost:5173` | Allowed origin(s) for CORS |

---

## 22. Local Setup Guide

1. **Clone repository**:
   ```bash
   git clone https://github.com/khushiiish/Slotify.git
   cd Slotify
   ```
2. **Install dependencies**:
   ```bash
   npm install --prefix backend
   npm install --prefix frontend
   ```
3. **Configure environment**:
   Create `backend/.env` (use `backend/.env.example` as reference) and set your `MONGO_URI` and `JWT_SECRET`.
4. **Compile production build & start**:
   ```bash
   npm run build
   npm start
   ```
   Open `http://localhost:5000` in your browser.

---

## 23. Automated Test Suite & Results

The automated test suite runs via **Vitest 5.0** across 12 test suites covering every layer of the architecture:

```bash
npm test
```

### Verified Test Results:
* **Test Suites**: 12 passed / 12 total
* **Total Tests**: **260 passed / 260 total (0 failures)**
* **Execution Time**: ~9.6 seconds

```
 ✓ tests/availability-slots.test.js (21 tests)
 ✓ tests/appointment-management.test.js (28 tests)
 ✓ tests/service-staff-management.test.js (31 tests)
 ✓ tests/appointment-booking.test.js (30 tests)
 ✓ tests/security-hardening.test.js (26 tests)
 ✓ tests/business-management.test.js (16 tests)
 ✓ tests/models.test.js (30 tests)
 ✓ tests/health.test.js (6 tests)
 ✓ tests/customer-public-experience.test.js (20 tests)
 ✓ tests/authorization.test.js (18 tests)
 ✓ tests/analytics.test.js (16 tests)
 ✓ tests/auth.test.js (18 tests)

 Test Files  12 passed (12)
      Tests  260 passed (260)
```

---

## 24. Deployment Architecture

```
Browser Request (https://slotify.onrender.com)
      │
      ▼
Render Single Web Service
      ├── /api/*               ──► Express API Router (Returns JSON)
      ├── /assets/*            ──► Express Static (Compiled React JS/CSS)
      └── /* (All other paths) ──► Express SPA Fallback (Sends index.html)
```

* **No Separate Vercel Deployment**: Eliminates third-party cookie blocking in Safari and Chrome.
* **Refresh Support**: Direct navigation to `/login`, `/owner`, `/admin`, `/book/:slug`, and `/customer/appointments/:id` resolves seamlessly without Express 404s.

---

## 25. Render Single-Service Deployment

Render is configured using `render.yaml`:
```yaml
services:
  - type: web
    name: slotify
    runtime: node
    buildCommand: npm run build
    startCommand: npm start
    plan: free
    healthCheckPath: /api/health
    envVars:
      - key: NODE_ENV
        value: production
      - key: MONGO_URI
        sync: false
      - key: JWT_SECRET
        generateValue: true
      - key: JWT_EXPIRES_IN
        value: 1d
      - key: CLIENT_URL
        sync: false
      - key: VITE_API_URL
        value: /api
```

---

## 26. Dedicated Evaluator Credentials

The application includes dedicated evaluator accounts initialized idempotently upon server startup:

| Role | Evaluator Email | Assigned Tenant | Status |
|---|---|---|---|
| **System Owner / Super Admin** | `superadmin@gmail.com` | Platform-wide (`businessId: null`) | Active |
| **Business Admin 1** | `admin1@gmail.com` | Urban Wellness Studio | Active |
| **Business Admin 2** | `admin2@gmail.com` | TechFix Services | Active |

> [!NOTE]
> All evaluator passwords are encrypted with `bcryptjs` (work factor 10) in the database. In strict compliance with security standards, plaintext passwords are never committed to Git, logs, or public source code. Passwords are provided securely out-of-band to the evaluator. The credential hashing utility (`backend/scratch/hash_credentials.mjs`) is provided for testing credential generation locally.

---

## 27. Final Verification Audit

* **Live Health Check**: `GET /api/health` returns HTTP 200 with `{ success: true, message: "Slotify API is running" }`.
* **Live Concurrency Test**: 2 concurrent booking requests for the same slot resulted in exactly 1 booking (201 Created) and 1 rejection (409 Conflict).
* **Live Security Audit**: All 20 live security tests passed (IDOR guards, NoSQL injection, ReDoS safety, customer token verification).
* **Desktop Chrome Verification (1440x900)**: All tabs (Dashboard, Services, Staff, Availability, Appointments, Calendar, Analytics) verified with 0 console errors.
* **Mobile Chrome Verification (375x667)**: Fully responsive layouts with zero horizontal scroll and zero layout breaking.

---

## 28. Known Limitations

* **Email Delivery**: Appointment confirmations and cancellations currently use on-screen customer tokens and direct portal links; automated SMTP/SMS delivery requires third-party API keys (e.g. SendGrid, Twilio).
* **Payment Processing**: Bookings record service prices for analytics estimations, but direct in-app payment gateway processing (e.g. Stripe) is intentionally omitted per project specification.

---

## 29. Future Improvements

* **Custom Working Shift Intervals**: Support split-shift availability schedules (e.g. 09:00–13:00 and 15:00–19:00).
* **Automated Webhook Notifications**: Webhook dispatch to business endpoints upon appointment creation and cancellation.
* **Multi-Language Localization**: Full i18n support for customer-facing scheduling pages in multiple languages.

---

## License

This project is licensed under the ISC License.
