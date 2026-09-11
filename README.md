# Slotify: Multi-Tenant B2B Appointment Booking Platform

Slotify is a production-grade multi-tenant B2B appointment scheduling SaaS platform designed for appointment-based service businesses (spas, salons, repair centers, clinics, consultancies).

Built with an **Express 5 + Mongoose 9** backend and a modern **React 19 + Vite** frontend in full JavaScript ES modules.

---

## Current Status: Phase 3 Completed

### Architecture Overview Across Phases

| Phase | Scope | Status | Test Coverage |
|---|---|---|---|
| **Phase 0** | Production Foundation, Express 5, Error Handling, Health Check, CORS, Logging | Completed | 6 tests |
| **Phase 1** | Database Architecture, Mongoose 9 Models, Tenant Indexes, Seed Script | Completed | 29 tests |
| **Phase 2** | JWT Cookie Authentication, Bcrypt Password Hashing, Session Validation | Completed | 18 tests |
| **Phase 3** | RBAC, Multi-Tenant Authorization, Anti-IDOR & Tenant Isolation | **Completed** | **18 tests (71 total)** |

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

### 8. Automated Testing & Verification

The project includes **71 passing automated tests** across 4 suites:

1. `backend/tests/health.test.js` (6 tests) — Health, rate limiting, 404, CORS.
2. `backend/tests/models.test.js` (29 tests) — Mongoose schemas, tenant indexes, validations.
3. `backend/tests/auth.test.js` (18 tests) — JWT cookies, login, /me, password hashing, disabled states.
4. `backend/tests/authorization.test.js` (18 tests) — RBAC, tenant authorization, IDOR, spoofing defenses.

Run tests:
```bash
npm test --prefix backend
```

---

### 9. Live Security Verification (Manual Cross-Tenant Attack Test)

A live security attack script verified the running server against 12 attack vectors:
1. `GET /api/businesses` (System Owner) → **`200 OK`**
2. `GET /api/businesses` (Business Admin A) → **`403 Forbidden`**
3. `GET /api/businesses/:businessA_id` (Admin A) → **`200 OK`**
4. `GET /api/businesses/:businessB_id` (Admin A targeting Tenant B) → **`403 Forbidden`**
5. `GET /api/businesses/:businessA_id/services?businessId=:businessB_id` (Admin A query spoofing) → **`403 Forbidden`**
6. `POST /api/businesses/:businessA_id/services` with body `businessId: :businessB_id` (Admin A body spoofing) → **`403 Forbidden`**
7. `POST /api/businesses/:businessA_id/services` legitimate service creation → **`201 Created`**
8. `POST /api/businesses/:businessB_id/services` (Admin B creating service) → **`201 Created`**
9. `GET /api/businesses/:businessA_id/services/:serviceB_id` (Admin A IDOR attack on Service B) → **`403 Forbidden`**
10. `GET /api/businesses/:businessB_id/services/:serviceB_id` (Admin B legitimate access) → **`200 OK`**

---

### 10. How to Run Locally

1. **Install Dependencies**:
   ```bash
   npm install --prefix backend
   npm install --prefix frontend
   ```

2. **Environment Variables**:
   * Backend: copy `backend/.env.example` to `backend/.env`
   * Frontend: copy `frontend/.env.example` to `frontend/.env`

3. **Start Development Servers**:
   ```bash
   # Terminal 1: Backend API (port 5000)
   npm run dev --prefix backend

   # Terminal 2: Frontend Client (port 5173)
   npm run dev --prefix frontend
   ```

4. **Build Frontend**:
   ```bash
   npm run build --prefix frontend
   ```
