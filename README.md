# Slotify

### Multi-Tenant B2B SaaS Appointment Booking Platform

[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-24.x-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.x-000000?style=flat-square&logo=express&logoColor=white)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=flat-square&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Render](https://img.shields.io/badge/Render-Deployed-46E3B7?style=flat-square&logo=render&logoColor=black)](https://render.com/)
[![Tests](https://img.shields.io/badge/Tests-287%20Passed-brightgreen?style=flat-square&logo=vitest&logoColor=white)](https://vitest.dev/)

Slotify is a multi-tenant B2B appointment booking platform. It enables platform owners to onboard businesses, empowers administrators to manage services, staff, and availability within isolated tenants, and allows customers to schedule real-time, conflict-free appointments.

---

### Quick Links

- 🚀 **Live Demo:** [https://slotify-2mip.onrender.com/](https://slotify-2mip.onrender.com/)
- 💻 **GitHub Repository:** [https://github.com/khushiiish/Slotify](https://github.com/khushiiish/Slotify)
- 🩺 **API Health Check:** [https://slotify-2mip.onrender.com/api/health](https://slotify-2mip.onrender.com/api/health)

---

## What is Slotify?

Slotify provides multi-tenant appointment scheduling where multiple independent businesses operate from a single deployment with complete data isolation across three core roles:

- **System Owner (Super Admin):** Manages the platform, provisions new business tenants, creates admin accounts, and toggles business status (`ACTIVE` / `DISABLED`).
- **Business Admin:** Manages services, staff assignments, weekly hours, date closures, appointments, interactive calendars, and operational analytics for their business.
- **End Customer:** Discovers businesses through the public portal, browses real-time available slots computed in the provider's timezone, and books appointments without an account.

---

## How It Works

```text
System Owner ────► Provisions Business & Initial Admin
                         │
                         ▼
Business Admin ──► Configures Services, Staff & Working Hours
                         │
                         ▼
Customer ────────► Discovers Business & Books Available Slot
                         │
                         ▼
Business Admin ──► Manages Appointments via List & Calendar
```

- **Onboard:** The platform owner provisions a business tenant and credentials for its administrator.
- **Configure:** The business admin sets up services, staff members, weekly working hours, and holiday closures.
- **Discover & Book:** Customers browse available slots computed in the provider's timezone and book without an account.
- **Manage:** Admins track appointments on live lists and calendars; cancellations immediately release slots back to the public pool.

---

## Key Features

### Platform & Tenant Administration
- **Business Onboarding & Status:** Provision businesses with admin credentials, contact details, and timezone; toggle active/disabled status.
- **Cross-Tenant Metrics:** Live platform aggregates tracking active businesses, bookings, and platform throughput.

### Business Workspace
- **Services & Staff:** Full CRUD for service catalogs (durations, pricing) and practitioner assignments.
- **Availability & Blocked Dates:** Recurring weekly schedules (Mon–Sun) with staff-specific overrides and holiday closures.
- **Slot Preview Tool:** Real-time preview calculator to verify slot availability before customer booking.
- **Appointments & Calendar:** Live status boards (`CONFIRMED`, `CANCELLED`, `COMPLETED`), cancellations, and FullCalendar views.
- **Analytics & Insights:** Operational metrics covering booking volume, completion rates, top services, and staff workload.

### Customer & Engineering
- **Public Booking Experience:** Public directory search, timezone-aware dynamic slot picker, and token-secured self-service cancellation.
- **Security & Multi-Tenancy:** Strict user-context tenant isolation, atomic double-booking prevention, Zod validation, bcrypt hashing, and HTTP-only cookies.

---

## Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, Vite, Vanilla CSS Design System, FullCalendar, Zustand, Axios, Lucide React |
| **Backend** | Node.js (v24 LTS), Express.js, MongoDB Atlas, Mongoose ODM |
| **Security & Validation** | JWT (`jsonwebtoken`), HTTP-only Cookies (`cookie-parser`), `bcryptjs`, `zod`, `helmet`, `cors` |
| **Testing** | Vitest v5.0, Supertest (14 integration test suites, 287 tests) |
| **Deployment** | Render (Node.js web service + static SPA serving), MongoDB Atlas |

---

## Architecture

```text
Browser Client (React 19 / Vite SPA)
       │
       ▼  HTTP / JSON
Express.js REST API
       │
       ├─► Helmet Security Headers & Cookie Parser
       ├─► Zod Validation Middleware
       ├─► JWT Auth & Role-Based Access Control (RBAC)
       └─► Tenant Isolation Middleware (Strict req.user.businessId scoping)
       │
       ▼
Domain Service Layer (Slot Engine, Booking Logic, Analytics)
       │
       ▼
Mongoose ODM ──► MongoDB Atlas
```

Slotify follows a layered architecture: controllers handle HTTP routing, middleware enforces auth and tenant boundaries, and domain services execute slot generation, conflict checks, and MongoDB persistence.

---

## Multi-Tenancy & Security

Tenant isolation is an architectural guarantee across the platform:

- **Resource Scoping:** Every business entity (`Service`, `Staff`, `Availability`, `BlockedDate`, `Appointment`) contains an indexed `businessId`.
- **Server Context:** For Business Admins, tenant context is derived strictly from the verified JWT payload (`req.user.businessId`). Client-supplied tenant IDs are never trusted.
- **Cross-Tenant Rejection:** Requests attempting to access or modify resources belonging to another business are blocked with `403 Forbidden`.
- **Credential Protection:** Passwords are encrypted using `bcryptjs` (10 rounds). Sessions use HTTP-only, SameSite cookies to mitigate XSS.

---

## Booking Logic & Slot Engine

Slot availability is computed dynamically in real time without storing pre-generated static slot documents:

- **Timezone Normalization:** Target dates are parsed in the business timezone (e.g., `Asia/Kolkata` or `America/Los_Angeles`) and mapped to UTC bounds.
- **Schedule & Closure Resolution:** The engine excludes whole-business or practitioner blocked dates, then resolves day-of-week working hours (staff overrides take precedence over business defaults).
- **15-Minute Grid Stepping:** Candidate start times step in 15-minute intervals, ensuring `slotStart + duration <= windowEnd` without overlapping active appointments.
- **Server-Side Revalidation:** Slot previews are not reservations. The server re-evaluates availability at the moment of booking—rejecting collisions with `409 Conflict`.
- **Slot Recovery:** Cancelling an appointment immediately frees the time window for other customers.

---

## Project Structure

```text
Slotify/
├── backend/
│   ├── src/
│   │   ├── config/          # DB connection, seed data, env config
│   │   ├── controllers/     # Route handlers (Auth, Business, Service, Staff, etc.)
│   │   ├── middleware/      # Auth, tenant isolation, error handling, Zod validator
│   │   ├── models/          # Mongoose schemas (Business, User, Service, Staff, etc.)
│   │   ├── routes/          # Express REST routes
│   │   ├── services/        # Slot generation engine & booking logic
│   │   └── validators/      # Zod validation schemas
│   └── tests/               # 14 Vitest / Supertest integration test suites
├── frontend/
│   ├── src/                 # React components, pages, services, Zustand store
│   └── vite.config.js       # Vite configuration & proxy
├── render.yaml              # Render deployment blueprint
└── README.md
```

---

## Run Locally

### Prerequisites

- Node.js 20+ (Node 24 LTS recommended)
- MongoDB instance (local or MongoDB Atlas connection string)

### 1. Clone & Install

```bash
git clone https://github.com/khushiiish/Slotify.git
cd Slotify

npm install --prefix backend
npm install --prefix frontend
```

### 2. Configure Environment

Create `backend/.env` with the following variables:

```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/slotify?retryWrites=true&w=majority
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRES_IN=1d
COOKIE_NAME=slotify_token
CLIENT_URL=http://localhost:5173
```

### 3. Start Development Servers

```bash
# Terminal 1: Backend API (port 5000, auto-seeds DB)
npm run dev --prefix backend

# Terminal 2: Frontend Client (port 5173)
npm run dev --prefix frontend
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Testing

The backend includes a comprehensive automated test suite:

```bash
cd backend
npm test
```

### Verified Test Results

- **Test Runner:** Vitest v5.0 + Supertest
- **Suites:** 14 passed (14)
- **Tests:** 287 passed (287)
- **Coverage:** Authentication, session cookies, cross-tenant 403 enforcement, staff/service assignments, timezone slot generation, blocked dates, race-condition rejection, and token-secured customer cancellations.

---

## Demo Credentials

Pre-seeded accounts for live evaluation:

| Role | Email | Password | Access Scope |
|---|---|---|---|
| **System Owner** | `superadmin@gmail.com` | `Password123!` | Platform administration, business creation, platform metrics |
| **Business Admin 1** | `admin1@gmail.com` | `Password123!` | *Urban Wellness Studio* (`Asia/Kolkata` timezone) |
| **Business Admin 2** | `admin2@gmail.com` | `Password123!` | *TechFix Services* (`America/Los_Angeles` timezone) |
| **Customer** | *No account required* | *N/A* | Public booking via landing page or direct `/book/:slug` link |

> **Note:** The sign-in page features one-click quick-fill buttons for all evaluator accounts.

---

## Scope & Design Decisions

- **Customer Accounts:** Customers book without mandatory account registration. Bookings are managed and cancelled using unique, cryptographically random tokens delivered upon confirmation.
- **Payment Processing:** Payment processing is omitted from the initial scope; services contain duration and pricing metadata for quotes and receipts.
- **Notifications:** In-app booking summaries and cancellation views are provided; external email/SMS providers (SendGrid, Twilio) can be integrated via webhooks.

---

## Future Improvements

- **Automated Reminders:** Email and SMS appointment notifications prior to scheduled slots.
- **External Calendar Sync:** Two-way synchronization with Google Calendar and Apple iCal feeds.
- **Customer Account Portal:** Optional customer profile to track booking history across businesses.
- **Self-Serve Rescheduling:** One-click appointment rescheduling to open slots without re-entering customer details.
- **Custom Domains:** Tenant-specific custom domain support for white-labeled booking portals.

---

## Submission Links

| Resource | Link |
|---|---|
| **GitHub Repository** | [https://github.com/khushiiish/Slotify](https://github.com/khushiiish/Slotify) |
| **Live Deployment (Render)** | [https://slotify-2mip.onrender.com/](https://slotify-2mip.onrender.com/) |
| **API Health Status** | [https://slotify-2mip.onrender.com/api/health](https://slotify-2mip.onrender.com/api/health) |
| **Demo Walkthrough Video** | [Add link] |
