# Crew Dual-Frontend Implementation Plan

## 1. Architecture Overview
This plan implements a **Dual-Frontend Architecture** on top of the existing repository structure.
- **App (`frontend` folder):** The operational HRMS used day-to-day by all users (Employees, Managers, etc.).
- **Console (`marketing-site` folder):** Public marketing pages PLUS an authenticated dashboard restricted exclusively to Owners and HR Admins.
- **API (`backend` folder):** A single Express backend and single Postgres database serving both frontends.

### Key Tenets
1. **One Backend & Session:** Both frontends hit the exact same `/auth/login` endpoint and share the same JWT and refresh token.
2. **Server-Side Gating:** Security is enforced on the backend. Any route meant for the Console lives under `/api/console/*` and uses a `requireConsoleAccess` middleware. Client-side redirects are for UX only.
3. **Chairman-Defined Roles:** Roles are dynamic rows in a `RoleDefinition` table with numeric `level`s, rather than hardcoded enums.

---

## 2. Implementation Phases

### Phase 1: Backend Foundation (Schema & Core Security)
*This phase builds the data models and access controls required before any UI work.*
- [x] **Schema Update:** Create the `RoleDefinition` model in Prisma.
- [x] **Role Migration:** Change `User.role` from an Enum to `roleDefinitionId` (a foreign key to `RoleDefinition`). Seed default roles (Owner, HR Admin, Manager, Employee).
- [x] **Role Assignment Logic:** Implement `canAssignRole(actingUser, targetRoleId)` ensuring a user can only create/invite a role with strictly less authority (`target.level > actor.level`).
- [x] **Console Middleware:** Create `requireConsoleAccess` middleware to enforce `role.level <= 1` on the server side.
- [x] **Test Endpoint:** Add a placeholder route `GET /console/verify-access` using the new middleware.

### Phase 2: Shared Logic Strategy
*Since the current repo structure uses standalone folders (`frontend`, `marketing-site`) instead of a strict monorepo layout, we need a strategy to share auth logic.*
- [x] **Extract Auth Flow:** Abstract login, OTP request/verify, and password reset logic into a shared module/workspace (`@crew/auth-client`) to guarantee both frontends use the exact same auth flow.
- [x] **Extract Socket Setup:** Standardize Socket.io connection logic for both clients (`@crew/socket-client`).

### Phase 3: Console Skeleton (`marketing-site`)
*Setting up the authenticated shell in the marketing site.*
- [x] **Auth Wiring:** Integrate the shared auth logic into the `marketing-site` login screen.
- [x] **Client-Side Guard:** Add routing logic in `marketing-site` that intercepts logins. If `role.level > 1` (Manager/Employee), display: *"This dashboard is for company administrators"* and redirect them to the `frontend` app.
- [x] **Dashboard Shell:** Create the protected `/dashboard` layout for the Console.

### Phase 4: Migrate Company Registration
*Moving onboarding to the correct frontend.*
- [x] **Registration UI:** Move the multi-step registration flow into `marketing-site` (`/register`).
- [x] **Registration API:** Update the backend `POST /console/register` (currently `/api/auth/register-company`) to handle tenant creation, role seeding, founder creation, and automatic login.

### Phase 5: Build Console Modules
*Implement the Admin-only features inside the `marketing-site` dashboard.*
- [ ] **Company Profile:** Forms to edit legal name, identifiers, address, and logo.
- [ ] **Role Hierarchy Manager:** Interface to add/rename custom roles and adjust their levels.
- [ ] **Office & Entity Management:** Configure physical locations (geofences) and legal entities.
- [ ] **Payroll Configuration:** Manage PF, ESI, PT, and tax structures.
- [ ] **Access Permissions (CEO Override):** Integrate the Access Matrix to modify permissions for dynamically created roles.
- [ ] **Team & Invites:** Admin-level team roster with full invite capabilities.

### Phase 6: Real-Time Sync (Socket.io)
*Ensuring the App instantly reflects changes made in the Console.*
- [ ] **Backend Emissions:** Emit events (e.g., `role:permissions_updated`, `role:level_changed`) from `/console/*` routes to the `tenant:${tenantId}` room when changes occur.
- [ ] **Frontend Invalidation:** Add Socket.io listeners in the `frontend` App to invalidate React Query caches upon receiving these events (so permissions/roles update without page reloads).

### Phase 7: Security & Deployment Polish
- [ ] **E2E Security Test:** Explicitly attempt to call `/console/*` backend endpoints using a Manager/Employee token to verify the `403 Forbidden` response.
- [ ] **Domain & Cookie Setup:** Configure environments so both apps are hosted on subdomains of the same root (e.g., `app.crewhr.io` and `console.crewhr.io`). Set the refresh token cookie with `Domain=.crewhr.io` for seamless SSO.
- [ ] **Email Links:** Ensure OTP and Password Reset emails contain links pointing to the specific frontend (`origin`) the user initiated the request from.
