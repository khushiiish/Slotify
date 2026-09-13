# Slotify — B2B Multi-Tenant Appointment Booking Platform

Slotify is a full-stack B2B SaaS appointment booking platform that allows a platform owner to onboard independent businesses, business administrators to manage their services, staff and availability, and customers to discover businesses and book appointments through public booking pages.

The application is designed around **multi-tenancy, secure role-based access control, timezone-aware scheduling, and conflict-free appointment booking**.

---

## Live Demo

**Production URL:** https://slotify-2mip.onrender.com/

> If the production URL changes, update this section before submission.

### Demo Access

For evaluation, use the dedicated evaluator accounts configured in the deployed environment.

Do **not** commit passwords, JWT secrets, MongoDB credentials, or other secrets to the repository.

| Role | Purpose |
|---|---|
| System Owner / Super Admin | Platform-wide business onboarding and management |
| Business Admin — Business 1 | Manage one business tenant |
| Business Admin — Business 2 | Verify tenant isolation between businesses |
| Customer | No account required; uses the public booking flow |

---

# 1. Problem Statement

Businesses need a simple way to publish appointment availability without sharing data with other businesses on the same platform.

Slotify solves this by providing:

- Platform-level business onboarding
- Business-specific admin accounts
- Service and staff management
- Availability and blocked-date management
- Timezone-aware slot generation
- Public business discovery
- Public booking pages
- Appointment management
- Calendar views
- Analytics
- Secure customer appointment access
- Multi-tenant authorization
- Double-booking prevention

Each business operates as an isolated tenant.

---

# 2. Main User Roles

## System Owner / Super Admin

The System Owner manages the platform itself.

Capabilities:

- Sign in securely
- Create/onboard businesses
- Create the initial Business Admin for a business
- View all businesses
- Search businesses
- View business details
- Enable or disable businesses
- Access platform-level metrics
- Manage businesses across tenants

The System Owner does not need to manage day-to-day services, staff and appointments for each business. Those responsibilities belong to the Business Admin.

---

## Business Admin

A Business Admin belongs to exactly one business.

Capabilities:

- Sign in securely
- View their business dashboard
- Manage business information
- Create/update services
- Manage service duration and status
- Create/manage staff
- Assign staff to services
- Configure weekly availability
- Configure staff-specific availability where supported
- Manage blocked dates
- Preview available slots
- View appointments
- Search and filter appointments
- Update appointment status
- Cancel appointments
- View appointments on a calendar
- View business analytics

Business Admin access is strictly restricted to their own `businessId`.

---

## End Customer

Customers do not need to create a platform account.

Customer flow:

```text
Landing Page
    ↓
Discover an ACTIVE Business
    ↓
Select Business
    ↓
Public Booking Page
    ↓
Select Service
    ↓
Select Date
    ↓
Select Available Slot
    ↓
Enter Customer Details
    ↓
Confirm Appointment
    ↓
Appointment Confirmation
    ↓
Secure Customer Appointment Access
```

Customers receive a signed appointment access token that allows them to view/cancel their own appointment without requiring a traditional customer account.

---

# 3. Core Features

## Multi-Tenant Architecture

Every business represents an independent tenant.

Business-specific resources contain a `businessId`, including:

- Services
- Staff
- Availability
- Blocked Dates
- Appointments
- Business Admin users

The backend never trusts a client-supplied `businessId` for authorization.

For Business Admin requests, tenant identity is derived from the authenticated user's JWT:

```text
JWT
 ↓
userId
role
businessId
 ↓
tenant authorization
 ↓
resource access
```

This prevents cross-tenant access and IDOR-style attacks.

---

# 4. Public Business Discovery

ACTIVE businesses can be discovered from the public customer-facing frontend.

The flow is:

```text
Business created by System Owner
        ↓
Business stored in MongoDB
        ↓
Business status = ACTIVE
        ↓
Public business discovery
        ↓
/book/:businessSlug
        ↓
Existing public booking flow
```

Disabled businesses are not publicly discoverable.

The frontend does not contain hardcoded businesses. Business data is loaded from the backend.

---

# 5. Appointment Booking

Slotify generates appointment slots from:

- Business timezone
- Weekly availability
- Staff availability
- Service duration
- Existing appointments
- Blocked dates
- Staff/service assignment

Slots are generated using 15-minute intervals.

Example:

If a service lasts 30 minutes and a staff member is available from:

```text
09:00 → 12:00
```

valid slots can include:

```text
09:00
09:15
09:30
...
11:30
```

provided the full service duration fits inside the available period.

---

# 6. Double-Booking Prevention

Slot preview is not treated as a reservation.

When an appointment is actually created, the server revalidates the slot.

The booking process checks:

1. Business is ACTIVE
2. Service exists and is ACTIVE
3. Service belongs to the same business
4. Staff exists and belongs to the business
5. Staff is assigned to the service
6. Date/time is valid
7. Slot aligns with the scheduling interval
8. Appointment is not in the past
9. Availability exists
10. Staff is not blocked
11. Business is not blocked
12. No conflicting active appointment exists

The booking layer also uses concurrency protection.

The implementation uses:

- staff-level in-process serialization
- MongoDB transaction/atomic conflict checking
- overlap revalidation at booking time

Therefore, two simultaneous requests for the same constrained staff/slot cannot both successfully create the appointment.

Expected behavior:

```text
Request A → 201 Created
Request B → 409 Conflict
```

Cancelled appointments no longer block the corresponding slot.

Back-to-back appointments are allowed when their boundaries touch.

---

# 7. Timezone Handling

Business timezone is authoritative.

Availability is stored as local business time:

```text
09:00
10:30
14:00
```

Appointments are persisted as UTC `Date` values.

The system converts between:

```text
Business Local Time
        ↕
UTC
```

using the business's configured timezone.

This prevents incorrect slot generation when the server timezone differs from the business timezone.

---

# 8. Appointment Lifecycle

Appointments use a controlled status lifecycle:

```text
CONFIRMED
    ├── COMPLETED
    ├── CANCELLED
    └── NO_SHOW
```

Terminal statuses cannot be changed into another lifecycle state.

Repeated cancellation/status requests are handled safely according to the application's lifecycle rules.

---

# 9. Authentication

Authentication is provided for:

- System Owner
- Business Admin

Authentication uses:

- JWT
- HTTP-only cookies
- bcrypt password hashing
- server-side authorization
- account/business status checks

JWT payload contains the authenticated identity context, including:

```text
userId
role
businessId
```

Passwords are never stored as plaintext.

The User model stores:

```text
passwordHash
```

and the password is verified using bcrypt during login.

If `passwordHash` is configured with Mongoose `select: false`, authentication explicitly includes it when performing password verification.

---

# 10. Customer Authentication / Identification

Customers do not have traditional platform accounts.

Instead, after a successful public booking, Slotify provides a signed appointment access token.

The token is bound to:

- appointment ID
- customer email
- business ID
- customer appointment token type

The backend verifies the token before allowing access to the appointment.

This provides customer-specific appointment access without requiring a registration/login system.

---

# 11. Security

Security is enforced on the server.

Implemented protections include:

- JWT authentication
- HTTP-only authentication cookies
- bcrypt password hashing
- RBAC
- tenant isolation
- IDOR protection
- business status checks
- user status checks
- request validation with Zod
- NoSQL injection protection
- regex input sanitization
- pagination limits
- Helmet security headers
- strict CORS
- authentication rate limiting
- public booking rate limiting
- production error masking
- malformed ObjectId handling
- customer token validation
- cross-tenant resource protection

Client-provided `businessId` values are not trusted for Business Admin authorization.

---

# 12. Technology Stack

## Frontend

- React
- Vite
- JavaScript / ES6+
- Tailwind CSS
- React Router
- Axios
- Zustand
- TanStack Query where applicable
- React Hook Form
- Zod
- Lucide icons
- Recharts
- FullCalendar

## Backend

- Node.js
- Express
- MongoDB
- Mongoose
- JWT
- bcryptjs
- Zod
- Helmet
- CORS
- express-rate-limit
- cookie-parser
- Morgan

## Testing

- Vitest
- Supertest
- Live API verification scripts
- Chrome end-to-end verification

## Deployment

- Render Web Service
- MongoDB Atlas

The production architecture uses a single Render service to serve:

```text
React frontend
+
Express API
```

---

# 13. Architecture

```text
                    ┌─────────────────────┐
                    │      Browser        │
                    │ React + Vite SPA    │
                    └──────────┬──────────┘
                               │
                         Same-Origin /api
                               │
                    ┌──────────▼──────────┐
                    │   Express Server    │
                    │                     │
                    │ Auth / RBAC         │
                    │ Tenant Validation   │
                    │ Controllers         │
                    │ Services            │
                    │ Validation          │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │       Mongoose      │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │    MongoDB Atlas    │
                    └─────────────────────┘
```

Application responsibility is separated approximately as:

```text
Route
  ↓
Middleware
  ↓
Controller
  ↓
Service
  ↓
Model
  ↓
MongoDB
```

---

# 14. Project Structure

```text
Slotify/
│
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── validators/
│   │   ├── utils/
│   │   ├── app.js
│   │   └── server.js
│   │
│   ├── tests/
│   ├── scratch/
│   ├── package.json
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── layouts/
│   │   ├── services/
│   │   ├── store/
│   │   ├── hooks/
│   │   ├── utils/
│   │   ├── routes/
│   │   ├── App.jsx
│   │   └── main.jsx
│   │
│   ├── package.json
│   └── vite.config.js
│
├── render.yaml
├── README.md
└── .gitignore
```

---

# 15. Data Model

## Business

Represents a tenant/business.

Important fields:

```text
_id
name
slug
contactEmail
contactPhone
address
timezone
status
createdAt
updatedAt
```

`slug` is unique and is used for public booking URLs.

Example:

```text
/book/urban-wellness-studio
```

---

## User

Represents System Owners and Business Admins.

Important fields:

```text
_id
name
email
passwordHash
role
businessId
status
createdAt
updatedAt
```

System Owner:

```text
role = SYSTEM_OWNER
businessId = null
```

Business Admin:

```text
role = BUSINESS_ADMIN
businessId = <Business._id>
```

---

## Service

```text
businessId
name
description
durationMinutes
status
```

A service belongs to exactly one business.

---

## Staff

```text
businessId
name
email
phone
status
serviceIds
```

Staff can be assigned to services belonging to their own business.

---

## Availability

```text
businessId
staffId
dayOfWeek
startTime
endTime
isActive
```

Availability times are interpreted in the business timezone.

---

## BlockedDate

```text
businessId
staffId
date
reason
```

A blocked date can apply to the entire business or a specific staff member.

---

## Appointment

```text
businessId
serviceId
staffId
customerName
customerEmail
customerPhone
startTime
endTime
status
notes
```

Appointment timestamps are stored as UTC dates.

---

# 16. API Overview

## Authentication

```text
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me
```

---

## System Owner / Business Management

```text
POST  /api/businesses
GET   /api/businesses
GET   /api/businesses/:businessId
PATCH /api/businesses/:businessId/status
```

---

## Services / Staff

```text
GET    /api/services
POST   /api/services
PUT    /api/services/:id
DELETE /api/services/:id

GET    /api/staff
POST   /api/staff
PUT    /api/staff/:id
DELETE /api/staff/:id
```

---

## Availability

```text
POST   /api/availability
GET    /api/availability
PUT    /api/availability/:id
DELETE /api/availability/:id
```

---

## Blocked Dates

```text
POST   /api/blocked-dates
GET    /api/blocked-dates
DELETE /api/blocked-dates/:id
```

---

## Slot Preview

```text
GET /api/availability/slots?serviceId=&date=&staffId=
```

---

## Authenticated Appointments

```text
POST  /api/appointments
GET   /api/appointments
GET   /api/appointments/:id
PATCH /api/appointments/:id/status
PATCH /api/appointments/:id/cancel
```

---

## Public Business Discovery

```text
GET /api/public/businesses
```

Returns publicly discoverable ACTIVE businesses.

---

## Public Business

```text
GET /api/public/business/:slug
```

Returns public information for an ACTIVE business.

---

## Public Slots

```text
GET /api/public/slots
```

---

## Public Booking

```text
POST /api/public/book
```

---

## Customer Appointment Access

```text
GET  /api/public/appointments/:id?token=...
POST /api/public/appointments/:id/cancel
```

---

# 17. Environment Variables

Create the required environment files locally.

Example backend environment:

```env
NODE_ENV=development
PORT=5000
MONGO_URI=mongodb://localhost:27017/slotify
JWT_SECRET=replace_with_a_secure_secret
JWT_EXPIRES_IN=1d
CLIENT_URL=http://localhost:5173
COOKIE_NAME=slotify_token
```

For production, use secure environment variables configured in Render.

Do not commit `.env` files.

For the frontend, the API configuration should use the project's production same-origin `/api` architecture.

Example:

```env
VITE_API_URL=/api
```

The exact production values should be configured through the deployment platform and must never contain committed secrets.

---

# 18. Local Development

## Backend

```bash
cd backend
npm install
npm run dev
```

Backend runs on the configured port, normally:

```text
http://localhost:5000
```

Health endpoint:

```text
GET /api/health
```

---

## Frontend

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

The frontend normally runs on:

```text
http://localhost:5173
```

---

# 19. Production Build

Build the frontend:

```bash
npm run build --prefix frontend
```

Start the backend:

```bash
npm start --prefix backend
```

The production deployment uses Express to serve the built frontend and API from the same public Render service.

---

# 20. Render Deployment

The production application is deployed as a unified Render Web Service.

Conceptually:

```text
Browser
   ↓
https://slotify.onrender.com
   ↓
Express
   ├── /api/*       → REST API
   ├── /assets/*    → React build assets
   └── other paths  → React SPA
   ↓
MongoDB Atlas
```

Important production settings include:

```text
NODE_ENV=production
MONGO_URI=<MongoDB Atlas connection string>
JWT_SECRET=<secure generated secret>
JWT_EXPIRES_IN=1d
CLIENT_URL=<Render application URL>
COOKIE_NAME=slotify_token
```

`PORT` should normally be provided by Render.

---

# 21. Testing

The project contains automated tests covering the major application areas.

Tests include:

- health checks
- model validation
- authentication
- authorization
- tenant isolation
- business onboarding
- service management
- staff management
- availability
- slot generation
- appointment booking
- booking conflicts
- public business discovery
- public booking
- customer appointment access
- appointment management
- calendar functionality
- analytics
- security hardening

Run backend tests with:

```bash
cd backend
npm test
```

The final implementation was validated with the complete backend test suite.

---

# 22. End-to-End Validation

The application was also tested using real running services rather than relying only on unit tests.

Validation included:

### System Owner

- Login
- Business creation
- Business listing
- Business details
- Enable/disable
- Logout

### Business Admin

- Login
- Tenant-specific dashboard
- Services
- Staff
- Availability
- Blocked dates
- Slot preview
- Appointments
- Calendar
- Analytics

### Customer

- Public business discovery
- Business selection
- Public booking
- Slot selection
- Appointment creation
- Appointment access
- Appointment cancellation

### Security

- Cross-tenant access attempts
- Business ID spoofing
- Role spoofing
- Invalid JWT
- Invalid customer token
- Disabled business access
- Invalid credentials
- Double-booking concurrency

The UI was checked on desktop and mobile layouts, including browser Console and Network behavior.

---

# 23. Tenant Isolation Example

Suppose there are two businesses:

```text
Business A
Business B
```

and:

```text
Admin A → businessId = A
Admin B → businessId = B
```

Admin A can access:

```text
Business A services
Business A staff
Business A availability
Business A appointments
```

Admin A cannot access:

```text
Business B services
Business B staff
Business B availability
Business B appointments
```

Even if Admin A manually modifies an API request and sends Business B's ID, the backend rejects the request.

This is enforced server-side rather than relying on frontend hiding.

---

# 24. Booking Conflict Example

Suppose Staff A has an appointment:

```text
10:00 → 10:30
```

Another customer tries to book:

```text
10:15 → 10:45
```

The request is rejected because the intervals overlap.

But:

```text
10:30 → 11:00
```

is allowed because it starts exactly when the previous appointment ends.

This prevents overlapping appointments while allowing back-to-back bookings.

---

# 25. Important Design Decisions

### Why MongoDB?

MongoDB fits the application's tenant-oriented document structure and provides flexible modeling for businesses, services, staff, availability and appointments.

### Why JWT in HTTP-only cookies?

It avoids exposing the authentication token to JavaScript storage such as `localStorage` and allows the server to control authentication state.

### Why no customer account system?

The assignment allows a reasonable customer identification/authentication approach. Slotify uses a signed appointment access token instead of forcing customers to register before booking.

### Why store appointment times as UTC?

This keeps persisted appointment timestamps consistent while allowing each business to operate using its own timezone.

### Why recheck availability during booking?

Slot preview can become stale between viewing and booking. The server therefore performs the final validation again at appointment creation time.

---

# 26. Assumptions

- A business has one configured authoritative timezone.
- Business Admin users belong to exactly one business.
- System Owners are platform-level users.
- Customers do not need accounts.
- Customers are identified using booking details and a signed appointment access token.
- Appointment times are stored in UTC.
- Availability is configured using local business time.
- Scheduling uses 15-minute intervals.
- Cancelled appointments free their slots.
- Disabled businesses cannot continue normal operations.
- Payments are outside the scope of this assignment.
- SMS/email notification delivery is outside the scope of this assignment.

---

# 27. Known Limitations

The following are intentionally outside the current scope:

- Payment processing
- SMS notifications
- Production email delivery
- Advanced subscription billing
- Complex permission matrices
- Customer registration/accounts
- Distributed locking infrastructure such as Redis

The booking system uses database-level transaction/overlap protection for persistence-level safety. The in-process staff queue is process-local, while the database conflict check remains the important persistence-level protection for concurrent booking attempts.

---

# 28. Future Improvements

Possible next improvements include:

- Email appointment confirmations
- SMS reminders
- Customer accounts
- Rescheduling
- Cancellation policies
- Recurring availability
- Staff-specific working calendars
- Buffer time between appointments
- Holiday calendars
- Google Calendar integration
- Outlook Calendar integration
- QR/shareable booking links
- Advanced analytics
- Audit logs
- Business subscription plans
- Automated reminders
- Waitlists
- Reviews and ratings
- Redis/distributed locking for high-scale multi-instance scheduling

---

# 29. Assignment Completion Summary

The implemented platform covers the core required workflow:

```text
System Owner Login
        ↓
Onboard Business
        ↓
Create Initial Business Admin
        ↓
Business Configuration
        ↓
Services + Staff + Availability
        ↓
Public Business Discovery
        ↓
Customer Booking Page
        ↓
Available Slots
        ↓
Appointment Creation
        ↓
Admin Appointment Management
        ↓
Customer View / Cancellation
```

The backend enforces role-based authorization and tenant isolation, while the booking engine performs server-side validation and concurrency-aware conflict prevention.

---

# 30. Submission Links

**GitHub Repository:**  
https://github.com/khushiiish/Slotify

**Live Demo:**  https://slotify-2mip.onrender.com/

**Demo / Walkthrough Video:**  
_Add final video link here_

**Development / AI / Debugging Recording:**  
_Add recording link here_

---

## Author

**Khushi Sharma**

B.Tech Computer Science & Engineering  
Full Stack / MERN Developer

GitHub:  
https://github.com/khushiiish

Portfolio:  
https://devkhushii.netlify.app/

