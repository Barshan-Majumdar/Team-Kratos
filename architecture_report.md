# 🌌 CREW Platform — Comprehensive Architecture & Engineering Report

> **Written for**: Developers, AI agents, or any reader who needs a complete, ground-truth understanding of how every part of this system works, connects, fetches data, and runs logic.

---

## Table of Contents

1. [Project Identity & Overview](#1-project-identity--overview)
2. [Top-Level Repository Structure](#2-top-level-repository-structure)
3. [Tech Stack Matrix](#3-tech-stack-matrix)
4. [The Monorepo Package System](#4-the-monorepo-package-system)
5. [Frontend Architecture (React + Vite)](#5-frontend-architecture-react--vite)
6. [Backend Architecture (Node.js + Express)](#6-backend-architecture-nodejs--express)
7. [Database Architecture (PostgreSQL + Prisma)](#7-database-architecture-postgresql--prisma)
8. [Biometric Face Engine (Python + FastAPI)](#8-biometric-face-engine-python--fastapi)
9. [Marketing Site](#9-marketing-site)
10. [Security Architecture (Multi-Layer)](#10-security-architecture-multi-layer)
11. [Real-Time Architecture (WebSockets)](#11-real-time-architecture-websockets)
12. [Background Job Architecture (Cron + BullMQ)](#12-background-job-architecture-cron--bullmq)
13. [Notification Engine (Email Pipeline)](#13-notification-engine-email-pipeline)
14. [Module-by-Module Deep Dive](#14-module-by-module-deep-dive)
    - [14.1 Authentication & OTP Flow](#141-authentication--otp-flow)
    - [14.2 Geospatial Attendance Engine](#142-geospatial-attendance-engine)
    - [14.3 Biometric Trust Score Engine](#143-biometric-trust-score-engine)
    - [14.4 Proxy Detection Engine](#144-proxy-detection-engine)
    - [14.5 Payroll Engine](#145-payroll-engine)
    - [14.6 Leave Ledger System](#146-leave-ledger-system)
    - [14.7 Shift Compliance Engine](#147-shift-compliance-engine)
    - [14.8 Attrition Risk Engine](#148-attrition-risk-engine)
    - [14.9 Colocation Network Graph Engine](#149-colocation-network-graph-engine)
    - [14.10 Performance Management Module](#1410-performance-management-module)
    - [14.11 ATS (Applicant Tracking System)](#1411-ats-applicant-tracking-system)
    - [14.12 Benefits Administration](#1412-benefits-administration)
    - [14.13 Expense Management](#1413-expense-management)
    - [14.14 Document Generator](#1414-document-generator)
    - [14.15 Pulse Surveys (Engagement)](#1415-pulse-surveys-engagement)
    - [14.16 Onboarding Wizard System](#1416-onboarding-wizard-system)
    - [14.17 Helpdesk Tickets](#1417-helpdesk-tickets)
    - [14.18 Asset Management](#1418-asset-management)
    - [14.19 Projects & Timesheets](#1419-projects--timesheets)
    - [14.20 1-on-1 Meetings (OneOnOnes)](#1420-1-on-1-meetings-oneononse)
    - [14.21 Announcements & Birthday Engine](#1421-announcements--birthday-engine)
    - [14.22 Org Chart (Colocation Network)](#1422-org-chart-colocation-network)
    - [14.23 SuperAdmin Console](#1423-superadmin-console)
    - [14.24 Billing & Subscriptions](#1424-billing--subscriptions)
    - [14.25 Audit Log System](#1425-audit-log-system)
    - [14.26 Workforce Analytics](#1426-workforce-analytics)
15. [Data Flow Diagrams (Textual)](#15-data-flow-diagrams-textual)
16. [Deployment & Infrastructure](#16-deployment--infrastructure)
17. [Frontend Route Map & Guard Logic](#17-frontend-route-map--guard-logic)
18. [Complete Database Entity Catalogue](#18-complete-database-entity-catalogue)

---

## 1. Project Identity & Overview

**Crew** is an enterprise-grade, multi-tenant HR Management System (HRMS). It's not a simple CRUD app. It's a platform that combines:

- **Real-time attendance tracking** with biometric liveness verification and GPS geofencing
- **Automated payroll generation** with Indian statutory compliance (PF, PT)
- **Fraud detection** through a multi-vector proxy detection engine
- **AI-driven attrition risk scoring** using behavioral signal analysis
- **Full performance management** (Goals, 360 Feedback, Reviews)
- **Applicant Tracking**, **Benefits Administration**, **Expense Management**, **Asset Tracking**, **Timesheets**
- **A dedicated Python ML microservice** for face recognition and anti-spoofing

The platform serves multiple companies (tenants) from a single deployment. Every piece of data, every query, every WebSocket room is scoped to a `tenantId` — making it a true **multi-tenant SaaS platform**.

---

## 2. Top-Level Repository Structure

```
Team-Kratos/
├── backend/             ← Node.js/Express API server
│   ├── src/
│   │   ├── server.js    ← Main entrypoint, mounts all routes & WebSocket
│   │   ├── config/      ← db.js (Prisma client with tenant extension)
│   │   ├── controllers/ ← 35 controller files, one per domain
│   │   ├── routes/      ← 33 route files, mounted in server.js
│   │   ├── middleware/  ← auth.js, role.js, apiKey.js, tenantContext.js
│   │   ├── utils/       ← 27 specialized engine files
│   │   ├── jobs/        ← 5 async job files (leave, birthday, clockout...)
│   │   └── workers/     ← cronJobs.js (schedules all 8 background jobs)
│   ├── prisma/
│   │   └── schema.prisma ← 1320-line database schema (PostgreSQL)
│   └── package.json
│
├── frontend/            ← React 19 + Vite 8 SPA
│   ├── src/
│   │   ├── App.jsx      ← Router + socket init + global toaster
│   │   ├── pages/       ← 26 top-level pages + admin/, performance/, superadmin/
│   │   ├── components/  ← ProtectedRoute + layout, UI, charts, shadcn
│   │   ├── hooks/       ← useEmployees.js, useLiveness.js
│   │   ├── lib/         ← api.js (axios base), permissions.js, utils.js
│   │   └── utils/       ← validators, employee helpers
│   └── package.json
│
├── face_engine/         ← Python FastAPI ML microservice
│   ├── main.py          ← FastAPI server with /register and /verify
│   ├── face_utils.py    ← YOLOv8 + SFace ONNX inference
│   ├── Dockerfile       ← Container spec for deployment
│   └── requirements.txt
│
├── packages/            ← Shared internal packages
│   ├── auth-client/     ← login, OTP, session helpers (used by frontend)
│   ├── socket-client/   ← Socket.io singleton manager (used by frontend)
│   └── shared/          ← Shared Zod validation schemas
│
├── marketing-site/      ← Separate Vite SPA for the public landing/careers page
└── package.json         ← Root package.json (monorepo workspace)
```

---

## 3. Tech Stack Matrix

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend Framework** | React 19 + Vite 8 | Component lifecycle, lightning HMR |
| **Frontend Styling** | Tailwind CSS 4 + Shadcn UI | Design system, accessible components |
| **Frontend Animation** | GSAP 3 + Framer Motion 12 | Physics-based micro-animations |
| **Frontend Charts** | Recharts 3 + D3-Force | Dashboards, org graph |
| **Frontend Calendar** | React Big Calendar | Shift scheduling UI |
| **Frontend Face Detection** | face-api.js | Client-side face detection pre-check |
| **Frontend Icons** | Lucide React | Icon system |
| **Backend Framework** | Node.js + Express 5 | REST API server |
| **Backend Real-time** | Socket.io 4 | Bi-directional WebSocket events |
| **Backend ORM** | Prisma 5 + PostgreSQL | Type-safe database access with tenant injection |
| **Backend Database** | PostgreSQL on Neon.tech | Serverless pooled PostgreSQL |
| **Backend Jobs** | node-cron + BullMQ | Scheduled tasks + queue-backed jobs |
| **Backend Queue Store** | Redis via ioredis | BullMQ queue persistence |
| **Backend Email** | Google Apps Script Bridge | Free email dispatch API |
| **Backend PDF** | PDFKit + pdf-lib | Payslip and HR document generation |
| **Backend Image CDN** | ImageKit SDK | Avatar and document file CDN |
| **Backend Payments** | Razorpay SDK | Subscription billing |
| **Backend Validation** | Zod | Schema validation |
| **Backend Auth** | JWT (jsonwebtoken) + bcrypt | Stateless tokens, password hashing |
| **Face Engine** | Python + FastAPI + Uvicorn | ML microservice HTTP server |
| **Face Engine Models** | YOLOv8 (yolov8n-face.pt), YuNet ONNX, SFace ONNX | Face detection + 128D embeddings |
| **Deployment (Frontend)** | Vercel | Edge-network SPA hosting |
| **Deployment (Backend)** | Render | Containerized web service |
| **Deployment (Face Engine)** | Docker (Dockerfile provided) | Containerized ML service |

---

## 4. The Monorepo Package System

The root `package.json` defines an npm workspace. The `packages/` directory contains three internal packages that are linked via the workspace, meaning they're consumed like npm packages but live in the same repo.

### `@crew/auth-client`
Located at `packages/auth-client/index.js`. Exports plain `fetch`-based functions:
- `login(API_BASE, identifier, password, origin, source)` → Calls `POST /api/auth/login`
- `verifyOtp(API_BASE, token, code)` → Calls `POST /api/auth/verify-otp`
- `requestPasswordReset` / `verifyResetOtp` / `confirmPasswordReset` → OTP password reset flow
- `setSession(token, user)` → Stores token + user JSON in `localStorage`
- `clearSession()` → Removes `token` and `user` from `localStorage`
- `getSession()` → Reads both from `localStorage` and returns them

This package abstracts all auth API calls so both the main app and the marketing site can share the same login logic.

### `@crew/socket-client`
Located at `packages/socket-client/index.js`. Manages a **singleton** Socket.io instance:
- `initSocket(API_BASE)` → Creates one `io()` connection if none exists, returns it
- `getSocket()` → Returns the existing socket or throws
- `disconnectSocket()` → Disconnects and nullifies the instance

### `@crew/shared`
Located at `packages/shared/`. Contains shared Zod validation schemas (e.g., `validations/leave.js`) that can be reused on both frontend and backend to ensure validation rules stay consistent.

---

## 5. Frontend Architecture (React + Vite)

### Entry Points
- `frontend/index.html` → The HTML shell. Single `<div id="root">`.
- `frontend/src/main.jsx` → Mounts `<App />` into the root div using `ReactDOM.createRoot`.
- `frontend/src/App.jsx` → The top-level component. Sets up routing, WebSocket, global toast, and global confirm dialog.

### App.jsx — What It Does on Mount
When `App.jsx` mounts (the `useEffect` with `[]`), it:
1. Reads `token` and `user` from `localStorage`.
2. If both exist, creates a `socket.io-client` connection to `VITE_API_URL` with `auth: { token }`.
3. Emits `join` event with `tenantId`, `userId`, and `roleLevel`.
4. Registers listeners for: `role:permissions_updated`, `tenant:plan_changed`, `office:created`, `entity:created`, `user:role_updated`, `inbox:updated`.
5. On `role:permissions_updated` or `user:role_updated` — if it's the current user's role, it updates `localStorage` and calls `window.location.reload()` to force a full session refresh.
6. On any event, it dispatches a `window.CustomEvent('app-realtime-update')` so any mounted component can listen and re-fetch.

### Routing (React Router v7)
All routes are **lazy-loaded** via `React.lazy()` + `<Suspense>` to keep the initial bundle small.

| Route | Component | Protection |
|---|---|---|
| `/` | `Landing` | Public |
| `/careers/*` | `Careers` | Public |
| `/signup` / `/login` | `UniversalAuth` | Public |
| `/forgot-password` | `ForgotPassword` | Public |
| `/set-password` | `SetPasswordFromInvite` | Public |
| `/change-password` | `ChangePassword` | Public |
| `/auth-receiver` | `AuthReceiver` | Public |
| `/onboarding` | `OnboardingWizard` | Protected (all roles) |
| `/face-registration` | `FaceRegistration` | Protected (all roles) |
| `/superadmin/*` | `SuperAdminDashboard` | Protected (SuperAdmin role name only) |
| `/dashboard/*` | `Dashboard` | Protected (all authenticated) |

### ProtectedRoute Guard Logic (Execution Order)
`ProtectedRoute` is a pure synchronous React component that checks `localStorage` before rendering children:
1. No token or no user → redirect to `/login`
2. User JSON parse error → clear localStorage → redirect to `/login`
3. `user.mustChangePassword === true` → redirect to `/change-password`
4. `user.faceRegistered === false` AND not SuperAdmin AND not on `/face-registration` → redirect to `/face-registration`
5. `user.onboardingCompleted === false` AND not SuperAdmin AND not on `/onboarding` or `/face-registration` → redirect to `/onboarding`
6. `user.onboardingCompleted === true` AND on `/onboarding` → redirect to `/dashboard` (prevent revisit)
7. `allowedRoles` provided and user's role name not in list → redirect to `/dashboard`
8. `maxLevel` provided and user's role level exceeds it → redirect to `/dashboard`
9. Otherwise → render `children`

### Frontend Page Inventory (26 top-level pages + subdirectories)
- **Dashboard.jsx** → Shell for the main app. Hosts the sidebar/navbar layout and renders sub-routes.
- **EmployeeDashboard.jsx** → Employee's personal home. Shows live attendance status, leave balance, payslips, and announcements.
- **Attendance.jsx** → Admin's live attendance board. Receives real-time socket events.
- **Payroll.jsx** → Admin payroll generation and viewing page.
- **SalaryAdvance.jsx** → Employee request form + Admin approval queue.
- **TimeOff.jsx** → Employee leave application + Admin approval.
- **ShiftScheduling.jsx** → Admin shift roster + drag-and-drop assignment UI using `react-big-calendar`.
- **WorkforceAnalytics.jsx** → Charts for headcount, attrition risk, and engagement.
- **OrgChart.jsx** → D3-force-graph colocation network visualization.
- **EngagementHub.jsx** → Pulse survey creation and results.
- **PulseSurveys.jsx** → Employee-facing survey response page.
- **FaceRegistration.jsx** → Multi-step biometric enrollment (webcam capture + upload).
- **MyProfile.jsx** → Employee self-service profile editor.
- **BenefitsAdministration.jsx** → Admin benefit plan CRUD + Employee enrollment.
- **ExpenseManagement.jsx** → Employee expense claims + Admin settlement.
- **DocumentGenerator.jsx** → Template-based PDF document generation.
- **Helpdesk.jsx** → IT/HR/Payroll support ticket system.
- **Timesheet.jsx** → Time logging against projects.
- **OneOnOnes.jsx** → Manager-employee 1:1 scheduling.
- **UniversalAuth.jsx** → Combined Login/Signup page.
- **admin/** → `CreateEmployee.jsx`, `EmployeeDetails.jsx`, `EmployeeList.jsx`
- **performance/** → `PerformanceDashboard.jsx`, `GoalsTab.jsx`, `ReviewsTab.jsx`, `Feedback360Tab.jsx`
- **onboarding/** → `OnboardingWizard.jsx` with multi-step form
- **superadmin/** → `SuperAdminDashboard.jsx` for platform-level management

### Component Architecture
- **`components/ProtectedRoute.jsx`** — Route guard (documented above).
- **`components/layout/`** — Sidebar, Navbar, Layout wrappers.
- **`components/ui/`** — Generic reusable UI primitives.
- **`components/shadcn/`** — Shadcn-sourced components (Button, Switch, Label, Tooltip, Slot).
- **`components/charts/`** — Custom Recharts wrappers.
- **`components/liveness/`** — Webcam liveness capture component.
- **`components/salary/`** — Payslip display component.
- **`components/shared/`** — Shared cross-page components.

### Custom Hooks
- **`useEmployees.js`** — Fetches the full employee list for the current tenant. Caches and exposes them. Used in admin dropdowns, team selectors.
- **`useLiveness.js`** — Manages the webcam stream for face detection. Uses `face-api.js` to run client-side face detection before sending to the backend. Exposes capture, status, and error state.

### `lib/api.js`
A minimal Axios instance configured with `baseURL: import.meta.env.VITE_API_URL`. All API calls in the frontend go through this, which automatically attaches `Authorization: Bearer <token>` headers from `localStorage`.

### `lib/permissions.js`
A client-side permissions helper. Maps role levels to capability flags (e.g., `canManagePayroll`, `canApproveLeaves`). Used to conditionally render admin-only UI elements.

---

## 6. Backend Architecture (Node.js + Express)

### `src/server.js` — The Heart of Everything
This is the single entrypoint for the entire backend. It does the following in order:
1. **Creates** an Express app and wraps it in a `http.Server`.
2. **Configures CORS** — reads `ALLOWED_ORIGINS` from `.env`, checks dynamically. Uses `credentials: true`.
3. **Creates Socket.io** (`new Server(server, { cors: corsOptions })`) and attaches it to `app.set('io', io)` so any controller can access it via `req.app.get('io')`.
4. **Applies Helmet** (security headers), **cookie-parser**, and **body-parser** (JSON limit: 5MB).
5. **Applies Rate Limiting** — Global: 2000 req/15min per IP. Auth endpoints: 1000 req/hour per IP.
6. **Socket.io Auth Middleware** — On every new socket connection, it verifies the JWT from `socket.handshake.auth.token`. Loads the user and their `roleDefinition` from the database. Rejects connections without a valid token.
7. **Socket.io Connection Handler** — On successful auth, auto-joins the socket to rooms: `tenant:{tenantId}` (all employees), `tenant:{tenantId}:admin` (level ≤ 1), `tenant:{tenantId}:admin:pulse` (admins + SuperAdmin), and `tenant:{tenantId}:user:{userId}` (personal room).
8. **1-Minute Pulse Ticker** — A `setInterval` every 60 seconds that ticks the `pulseEngine` and broadcasts `pulse:update` events to all admin pulse rooms.
9. **Initializes Cron Jobs** — Calls `initCronJobs()` to start 8 scheduled background jobs.
10. **Mounts all 33 route files** under `/api/` namespace.
11. **Listens on PORT** (default 5000).
12. **Graceful Shutdown** — On `SIGINT`, `SIGTERM`, `SIGUSR2`, disconnects Prisma before exiting.

### Routes → Controllers Pattern
Every route file in `src/routes/` imports Express Router, applies middleware, and delegates to a controller. Example:
```
POST /api/attendance/checkin
  → routes/attendance.js
  → middleware: auth (JWT verify), then role check if needed
  → attendanceController.checkIn()
```

The 35 controllers are:
`analyticsController`, `announcementController`, `assetController`, `atsController`, `attendanceController`, `auditController`, `authController`, `benefitController`, `billingController`, `colocationController`, `consoleController`, `cronController`, `developerSettingsController`, `documentController`, `expenseController`, `faceRegistrationController`, `importController`, `inboxController`, `leaveController`, `onboardingController`, `oneOnOneController`, `payrollController`, `performanceController`, `projectController`, `proxyAlertController`, `pulseController`, `shiftComplianceController`, `shiftController`, `shiftEngineController`, `shiftPolicyController`, `statutoryFilingController`, `superadminController`, `tenantSettingsController`, `ticketController`, `userController`

### Middleware Stack
1. **`auth.js`** — Reads JWT from `Authorization: Bearer` header OR `req.cookies.jwt` (cookie fallback). Verifies with `JWT_SECRET`. Loads user + `roleDefinition` + `shiftPolicy` from DB using `basePrisma`. Checks for pending OTP (blocks all routes except `/verify-otp` and `/resend-otp` if OTP is active). Then runs the request inside `tenantStorage.run(tenantId, next)` to inject the tenant context into the async local storage.
2. **`role.js`** — `authorize(N)` function. Allows users whose `roleDefinition.level <= N`. SuperAdmin (level -1, tenantId = null) always bypasses. Levels: 0 = Owner, 1 = HR Admin, 2 = Manager, 3+ = Employee.
3. **`apiKey.js`** — For the public API v1 routes. Reads `X-API-Key` header, hashes it, looks up in the `ApiKey` table, and injects the matching tenant's context.
4. **`requireConsoleAccess.js`** — Checks if the user's `roleDefinition.canAccessConsole` is true. Blocks access to the SuperAdmin console routes otherwise.
5. **`tenantContext.js`** — Exports a Node.js `AsyncLocalStorage` instance (`tenantStorage`). This is the core of the multi-tenancy system.

### The Utility Engines (`src/utils/`)
This is where Crew's most sophisticated logic lives — 27 utility files. They are pure functions or async helpers called by controllers:

| Engine File | What It Does |
|---|---|
| `payrollCalculator.js` | Calculates gross/net salary, PF, HRA, all components from config |
| `leaveLedger.js` | Advisory-locked ledger operations (grant, reserve, reverse leave) |
| `proxyDetectionEngine.js` | 3-vector fraud detection on attendance records |
| `spatialTrustEngine.js` | GPS-based trust scoring (geofence, velocity, accuracy) |
| `trustScoreEngine.js` | Composite trust = min(spatial trust, liveness score) |
| `shiftComplianceEngine.js` | Late deductions, early departure, overtime bonus calculation |
| `attritionRiskEngine.js` | 3-factor weighted attrition risk model |
| `attritionMetrics.js` | Gathers raw signals for attrition engine |
| `colocationEngine.js` | Computes office co-presence network graph from attendance |
| `notificationEngine.js` | Email dispatch via Google Apps Script API |
| `emailTemplates.js` | 20+ branded HTML email templates |
| `documentRenderer.js` | Template variable substitution for HR documents |
| `documentSeeder.js` | Seeds default document templates for new tenants |
| `geoUtils.js` | Haversine distance formula, travel speed calculator |
| `managerHierarchy.js` | Resolves org-chart manager chains |
| `embeddingCrypto.js` | AES-256 encryption/decryption of face embeddings |
| `faceMatchEngine.js` | Fetches and decrypts embeddings for verification |
| `pulseEngine.js` | Tracks real-time "live cost accrual" state per tenant |
| `riskScoringEngine.js` | Salary advance risk scoring |
| `canAssignRole.js` | Validates if actor can assign a given role level |
| `benefitSeeder.js` | Seeds default benefit plans |
| `webhookDispatcher.js` | Dispatches events to tenant-registered webhook URLs |
| `auditHashing.js` | SHA-256 chained hash for audit log integrity |
| `chatbotContext.js` | Gathers context for a future RAG chatbot feature |
| `shiftWindow.js` | Computes shift start/end times for a given date |

---

## 7. Database Architecture (PostgreSQL + Prisma)

### The Tenant-Injection Prisma Extension (`src/config/db.js`)
This is the most architecturally critical file in the backend. It creates a Prisma extension that **automatically injects `tenantId`** into every single database query.

**How it works:**
1. `basePrisma` is a standard `PrismaClient` — used only for system-level ops (login, signup, superadmin).
2. `prisma` is an **extended** client. For every query (`findMany`, `findUnique`, `create`, `update`, `delete`, `upsert`, `count`, etc.), the extension intercepts it.
3. It reads `tenantId` from `tenantStorage.getStore()` — the `AsyncLocalStorage` that `auth.js` middleware set before the request entered the controller.
4. If `tenantId` is missing → it **throws a hard error**: `"Attempted to query [Model] without a tenant context"`. This prevents accidental cross-tenant data leaks.
5. If `tenantId === 'SUPER_ADMIN_BYPASS'` → query runs without `tenantId` filter (for SuperAdmin cross-tenant ops).
6. Otherwise → the `tenantId` is injected into every `where` clause (reads/updates/deletes) and into `data` (creates).

**The AuditLog Special Case:** When an `auditLog.create()` is called, the extension wraps it in a `$transaction` and acquires a **PostgreSQL advisory lock** (`pg_advisory_xact_lock`) based on the tenant's hash. It then finds the last audit log entry, reads its `hash`, and generates a new chained hash (SHA-256) that links to the previous record. This creates a **tamper-evident, blockchain-like audit chain**.

### Complete Database Entity Catalogue (50+ models)

**Core Identity:**
- `Tenant` — Company/organization. Root entity. All others link to it.
- `User` — Employee identity. Links to Tenant, Office, RoleDefinition, ShiftPolicy, Manager (self-reference).
- `RoleDefinition` — Named role with a numeric `level` (0=Owner, 1=HR, 2=Manager, 3+=Employee) and `permissions` JSON.
- `LegalEntity` — Sub-entity of a company for multi-entity payroll (holds PF code, PT reg. no.)
- `Office` — Physical office location with GPS coordinates and geofence radius.

**Attendance & Time:**
- `Attendance` — Daily check-in/check-out. Stores GPS, `trustScore`, `verificationMethod`, `isLivenessVerified`, `isFlagged`, `flagReason`.
- `ShiftPolicy` — Named shift definition with start/end times, grace periods, overtime rates.
- `ShiftRoster` — Assigns a ShiftPolicy to a User on a specific date.
- `ShiftSlot` — A specific shift occurrence (MORNING/EVENING/NIGHT) on a date.
- `ShiftAssignment` — Links a User to a ShiftSlot (AUTO or MANUAL).

**Leave:**
- `LeavePolicy` — Annual quota, carry-forward rules, paid/unpaid, effective date.
- `Leave` — Individual leave request (Pending/Approved/Rejected).
- `LeaveLedgerEntry` — Immutable double-entry ledger rows: ANNUAL_GRANT, ACCRUAL, CARRY_FORWARD, LEAVE_TAKEN, PENDING_HOLD, REVERSAL, ADJUSTMENT, ENCASHMENT.

**Payroll & Compensation:**
- `Payroll` — Finalized monthly payslip with all components. Has a `locked` flag.
- `PayrollConfig` — Company-specific percentages (PF, HRA, bonus) per company name.
- `SalaryAdvance` — Advance request with risk score, approval chain, deduction month.
- `ExpenseClaim` — Employee expense with receipt file, category, approver.
- `BenefitPlan` — Company benefit plan with tier-based rates.
- `EmployeeBenefit` — Employee's enrollment in a BenefitPlan with coverage tier.

**Performance:**
- `Goal` — OKR-style goal with parent-child alignment, metric types, progress.
- `Review` — Manager-to-employee review with ratings JSON and publish lifecycle.
- `Feedback360` — Anonymous or attributed peer feedback with competency ratings.

**Onboarding:**
- `OnboardingChecklist` — Named checklist for a new hire.
- `OnboardingTask` — Individual task with due date and completion tracking.
- `OnboardingChecklistTemplate` — Reusable template by department.
- `OnboardingChecklistTemplateTask` — Task in a template with `dueOffsetDays`.
- `OnboardingDocument` — Uploaded documents during onboarding.

**Documents:**
- `DocumentTemplate` — HTML/text template for Offer Letter, Experience Certificate, etc.
- `GeneratedDocument` — A produced document with its ImageKit `fileId` and `url`.
- `SignatureRequest` — Placeholder for e-signature workflows.
- `HRDocument` — Freeform HR document content.

**Biometrics:**
- `FaceRegistration` — Stores AES-256 `encryptedEmbeddings` (Bytes). Linked 1:1 to User.

**Talent & Recruitment (ATS):**
- `JobRequisition` — Open job with requirements, salary range, status.
- `Candidate` — Applicant profile with resume URL and parsed resume JSON.
- `Application` — Candidate-to-Job link with stage (Applied → Hired) and rating.

**Assets:**
- `Asset` — Physical company asset (laptop, phone) with serial number and status.
- `AssetAssignment` — History of asset assignments with return tracking.

**Projects & Time:**
- `Project` — Project definition with budget, dates.
- `TimesheetEntry` — Hours logged by a user against a project.

**Engagement:**
- `PulseSurvey` — Survey with questions JSON, active status.
- `PulseResponse` — Anonymous (SHA-256 hash) submission with answers JSON.
- `OneOnOne` — Scheduled 1:1 meeting with talking points, action items.
- `Announcement` — Company-wide announcement with category (General/Birthday/Urgent/etc).
- `BirthdayWish` — Employee-to-Employee birthday wish linked to a Birthday announcement.
- `UserPreference` — Stores `announceBirthday` opt-in preference.

**Security & Platform:**
- `AuditLog` — SHA-256 chained audit entries. Has `prevHash` and `hash`.
- `ProxyAlert` — Fraud detection alert with type, severity, metadata.
- `ApiKey` — Hashed API keys for external integrations.
- `WebhookSubscription` — Tenant-registered webhook endpoints.
- `ImportJob` — Bulk import job tracker with status and error log.
- `ComplianceRule` — State-specific PT/PF rates with effective dates.
- `Subscription` — Razorpay subscription record.
- `UsageRecord` — Monthly active employee count for metered billing.
- `ColocationGraphCache` — Pre-computed JSON graph (nodes + links) per tenant.
- `PendingRegistration` — Temp OTP-gated company registration state.
- `AdminEmail` — Whitelisted admin email addresses per tenant.
- `InvitedEmployee` — Pre-authorized employee invite emails.

---

## 8. Biometric Face Engine (Python + FastAPI)

Located at `face_engine/`. A completely independent service that the Node.js backend calls via HTTP.

### Models Used
- `yolov8n-face.pt` — YOLOv8 nano model fine-tuned for face detection. Runs fast, lightweight.
- `face_detection_yunet.onnx` — OpenCV's YuNet detector (alternative face detector).
- `face_recognition_sface.onnx` — SFace model for extracting 128-dimensional face embeddings.

### API Endpoints

#### `POST /register`
**Input:** `{ image_base64: "data:image/jpeg;base64,..." }`
**What it does:**
1. Decodes the base64 image bytes.
2. Runs `run_liveness_check()` — currently a placeholder (returns `True`); designed for a Silent-Face-Anti-Spoofing model integration.
3. Calls `get_face_encoding(image_bytes)` from `face_utils.py` — runs face detection, then SFace ONNX inference to produce a 128D float array.
4. Returns `{ success: true, encoding: [128 floats] }` or an error code.

**Backend usage:** `faceRegistrationController.js` calls this endpoint, receives the encoding, encrypts it with AES-256-GCM via `embeddingCrypto.js`, and stores the encrypted bytes in `FaceRegistration.encryptedEmbeddings`.

#### `POST /verify`
**Input:** `{ image_base64: "...", known_faces: { "userId": [128 floats], ... } }`
**What it does:**
1. Decodes image bytes.
2. Runs liveness check.
3. Calls `match_faces(image_bytes, known_faces)` — extracts encoding from the live image, then computes cosine similarity against all known embeddings.
4. Returns `{ success: true, match_id: "userId", confidence: 0.95 }` or no-match error.

**Backend usage:** During attendance check-in, the backend decrypts all face embeddings for the tenant's employees, sends them to this endpoint, and gets back a `match_id` confirming identity.

### Deployment
The `Dockerfile` containerizes the Python service. The `ALLOWED_ORIGINS` env var controls CORS.

---

## 9. Marketing Site

Located at `marketing-site/`. A separate Vite SPA with its own `package.json`, hosted independently on Vercel. It's not part of the main `frontend/` — it's the public-facing website. It uses the same `@crew/auth-client` package for the login form, forwarding to the main app on success.

---

## 10. Security Architecture (Multi-Layer)

### Layer 1: Network Security (Helmet + CORS)
- `helmet()` sets security headers (CSP, X-Frame-Options, HSTS, etc.)
- CORS is dynamically checked against `ALLOWED_ORIGINS` env var. Returns `false` for unknown origins — no error, just a blocked response.

### Layer 2: Rate Limiting
- Global: 2000 requests/15 minutes per IP on all `/api/` routes.
- Auth: 1000 requests/hour per IP on `/api/auth/` routes.

### Layer 3: JWT Authentication
- Tokens signed with `HS256` using `JWT_SECRET`.
- Verified on every request by `auth.js` middleware.
- If user has a pending `otpCode`, ALL routes are blocked except `/verify-otp` and `/resend-otp`. This prevents bypassing 2FA.

### Layer 4: OTP-Based 2FA
- On login, if the user has 2FA enabled, an OTP is generated, stored in `user.otpCode` (hashed), and emailed.
- The JWT is issued but blocked by the `otpCode` check until verified.

### Layer 5: Role-Based Access Control (RBAC)
- Numeric level system: `authorize(N)` allows `roleDefinition.level <= N`.
- SuperAdmin (`tenantId = null`, `level = -1`) bypasses all checks.
- Prevents a tenant-level "Admin" from spoofing the platform SuperAdmin by checking `tenantId === null`.

### Layer 6: Multi-Tenant Row-Level Security (Prisma Extension)
- Every query automatically has `tenantId` injected.
- Cross-tenant queries are **hard blocked** with an exception if no tenant context is set.

### Layer 7: Face Embedding Encryption
- Face embeddings (128D float arrays from the Python engine) are never stored in plaintext.
- `embeddingCrypto.js` uses **AES-256-GCM** with a `FACE_EMBEDDING_SECRET` env key.
- Only the encrypted `Bytes` are stored in `FaceRegistration.encryptedEmbeddings`.

### Layer 8: Audit Log Integrity (Cryptographic Chaining)
- Every `auditLog.create()` is intercepted by the Prisma extension.
- A PostgreSQL advisory lock ensures serial writes per tenant.
- Each record's `hash = SHA256(prevHash + actorId + action + targetId + details)`.
- If any record is tampered with, the hash chain breaks. The system can detect this.

### Layer 9: API Key Authentication (for external integrations)
- The `apiKey.js` middleware reads `X-API-Key`, hashes it, and looks up the `ApiKey` table.
- Provides a way for third-party systems to call Crew's API on behalf of a tenant.

---

## 11. Real-Time Architecture (WebSockets)

### Connection Lifecycle
1. Client (in `App.jsx`) calls `io(API_BASE, { auth: { token } })`.
2. Server's `io.use()` middleware verifies the token and attaches the user to `socket.user`.
3. Server's `io.on('connection')` auto-joins the socket to rooms.
4. All subsequent event dispatches target rooms, not individual sockets.

### Room Structure
| Room | Who Joins | What's Broadcast There |
|---|---|---|
| `tenant:{tenantId}` | All employees | General tenant events |
| `tenant:{tenantId}:admin` | Level ≤ 1 roles | Admin-level updates |
| `tenant:{tenantId}:admin:pulse` | Level ≤ 1 + SuperAdmin | Live pulse cost updates |
| `tenant:{tenantId}:user:{userId}` | Individual user | Personal inbox, role change |

### Events Emitted by the Backend
Controllers access `io` via `req.app.get('io')` and call `io.to('room-name').emit('event', data)`.

| Event Name | Trigger | Room |
|---|---|---|
| `attendance:updated` | Employee checks in/out | `tenant:{tenantId}:admin` |
| `pulse:update` | 1-minute interval ticker | `tenant:{tenantId}:admin:pulse` |
| `role:permissions_updated` | Admin edits a role definition | `tenant:{tenantId}` |
| `user:role_updated` | Admin reassigns a user's role | `tenant:{tenantId}:user:{userId}` |
| `tenant:plan_changed` | SuperAdmin changes plan tier | `tenant:{tenantId}` |
| `office:created` | Admin adds a new office | `tenant:{tenantId}` |
| `entity:created` | Admin adds a legal entity | `tenant:{tenantId}` |
| `inbox:updated` | New inbox message | `tenant:{tenantId}:user:{userId}` |

### Frontend Reaction
In `App.jsx`, all socket events are dispatched as `window.CustomEvent('app-realtime-update')`. Any mounted component can add a `window.addEventListener('app-realtime-update', handler)` to reactively re-fetch data without prop-drilling.

---

## 12. Background Job Architecture (Cron + BullMQ)

`src/workers/cronJobs.js` initializes 8 `node-cron` scheduled jobs on server startup:

| # | Schedule | Job | What It Does |
|---|---|---|---|
| 1 | `0 2 * * *` (2 AM daily) | Statutory Compliance Engine | Applies state PT/PF `ComplianceRule` rates to unlocked payrolls |
| 2 | `0 3 1 * *` (3 AM, 1st of month) | Metered Billing Counter | Counts active employees per tenant, writes to `UsageRecord` |
| 3 | `0 1 * * *` (1 AM daily) | Leave Year Renewal | Runs annual grant, carry-forward, year-end lapse logic |
| 3.5 | `*/15 * * * *` (every 15 min) | Auto Clock-Out | Checks for employees clocked in >9h, auto-clocks them out |
| 4 | `0 9 * * *` (9 AM daily) | Onboarding Reminders | Emails employees and managers about incomplete onboarding steps |
| 5 | `0 8 * * *` (8 AM daily) | Birthday Engine | Detects today's birthdays, creates announcements, sends emails |
| 6 | `0 * * * *` (every hour) | 1:1 Cleanup | Deletes past OneOnOne meeting records |
| 7 | `0 4 * * *` (4 AM daily) | Attrition Risk Scoring | Re-scores every active employee's attrition risk |
| 8 | `30 4 * * *` (4:30 AM daily) | Colocation Graph | Pre-computes and caches the office co-presence network graph |

**Note:** BullMQ is listed as a dependency and is set up for heavier queue-backed jobs. The current implementation primarily uses `node-cron` for scheduling.

---

## 13. Notification Engine (Email Pipeline)

`src/utils/notificationEngine.js` is the central dispatcher for all outbound emails.

### Email Transport: Google Apps Script Bridge
Instead of Resend or SendGrid (which cost money), Crew uses a **Google Apps Script** web app as a free email relay. The backend sends a `POST` request with `{ to, subject, html }` to `GOOGLE_SCRIPT_URL`. The Google Script calls `GmailApp.sendEmail()`. If the env var isn't set, it falls back to console logging ("SIMULATED EMAIL").

### `sendNotification(params)` — How it works
1. Takes `{ userId, tenantId, type, data, title, message, link }`.
2. Fetches the user's email from DB using `basePrisma`.
3. Fetches the tenant's `name` to use as the company name in templates.
4. Runs a `switch` on `type` to select the right HTML email template from `emailTemplates.js`.
5. For `PAYROLL_GENERATED`: Dynamically generates a full-layout PDF payslip using `pdfkit`, encoding it as base64 to attach to the email.
6. Calls `sendEmail(to, subject, html)` → Google Apps Script.
7. Writes a `NOTIFICATION_SENT` audit log entry.

### Notification Types Supported (20+)
`NEW_ACCOUNT_CREDENTIALS`, `WELCOME_ONBOARDING_INVITE`, `OTP_VERIFICATION`, `PASSWORD_RESET`, `PASSWORD_CHANGED`, `WELCOME_VERIFIED`, `PAYROLL_GENERATED`, `LEAVE_APPROVED`, `LEAVE_REJECTED`, `LEAVE_APPLIED_CONFIRMATION`, `UNAPPROVED_ABSENCE`, `LATE_CLOCK_IN`, `COMPANY_CREATED`, `COMPANY_ANNOUNCEMENT`, `BIRTHDAY_WISH`, `SHIFT_ASSIGNED`, `EXPENSE_APPROVED/REJECTED/SETTLED`, `SALARY_ADVANCE_REQUESTED/APPROVED/REJECTED`, `PROFILE_UPDATED`, `1ON1_SCHEDULED`, `DOCUMENT_GENERATED`, `BENEFIT_ENROLLED`, `PROXY_ALERT_HIGH`, `AUDIT_TAMPER_DETECTED`, `WORK_ANNIVERSARY`, `MEETING_REMINDER`

---

## 14. Module-by-Module Deep Dive

### 14.1 Authentication & OTP Flow

**Company Registration:**
1. Admin calls `POST /api/auth/register` with company name, email, password.
2. System creates `Tenant`, creates Owner `User` with `mustChangePassword: true` and a hashed OTP.
3. Emails credentials via `sendNotification('NEW_ACCOUNT_CREDENTIALS')`.
4. Creates default leave policies, document templates, benefit plans via seeders.

**Login Flow:**
1. `POST /api/auth/login` → verifies email+password → issues JWT.
2. If `otpCode` exists on user → returns `requireOtp: true`. The frontend then shows an OTP input.
3. `POST /api/auth/verify-otp` → validates OTP, clears `otpCode`, returns the full user object.
4. Frontend stores token + user in `localStorage` via `auth-client.setSession()`.

**Password Reset:**
1. `POST /api/auth/forgot-password` → generates a 6-digit OTP, stores it in `user.resetPasswordOtp` (hashed), emails it.
2. `POST /api/auth/verify-reset-otp` → validates OTP.
3. `POST /api/auth/reset-password` → sets new password (bcrypt hash), clears OTP fields.

**Employee Invite:**
1. Admin calls invite endpoint → generates an `inviteToken` UUID → emails `SET_PASSWORD` link with token.
2. Employee clicks link → `POST /api/auth/set-password?token=...` → sets password → account activated.

### 14.2 Geospatial Attendance Engine

**Check-In Flow (Full):**
1. Frontend (`EmployeeDashboard.jsx` or `Attendance.jsx`) gets GPS from `navigator.geolocation.getCurrentPosition()`.
2. Frontend uses `useLiveness.js` + `face-api.js` for a client-side face pre-check.
3. Captures a webcam frame as base64.
4. Sends `POST /api/attendance/checkin` with `{ latitude, longitude, accuracy, faceImageBase64 }`.
5. Backend's `attendanceController.js` calls `faceMatchEngine.js`:
   - `faceMatchEngine` fetches all active face registrations for the tenant from DB.
   - Decrypts each embedding with `embeddingCrypto.js`.
   - Sends the live face image + known embeddings to the Python face engine `POST /verify`.
   - Python engine returns `{ match_id, confidence }`.
6. Backend calls `evaluateSpatialTrust()` from `spatialTrustEngine.js`:
   - Calculates Haversine distance from user's GPS to `Office.lat/lng`.
   - Checks if distance > `Office.radiusMeters` → deducts trust.
   - Checks for mock GPS accuracy signatures (0m, 1m, 5m) → deducts trust.
   - Checks teleportation velocity against last attendance → deducts trust.
   - Returns `{ trustScore, verificationMethod, isFlagged, flagReason }`.
7. Backend calls `computeCompositeTrust()` from `trustScoreEngine.js`:
   - `compositeScore = Math.min(spatialTrust, livenessTrust)` — trust is only as strong as the weakest link.
8. Creates `Attendance` record with all fields including `trustScore`, `isFlagged`, `livenessEmbeddingHash`.
9. Emits `attendance:updated` WebSocket event to the admin room.

**Check-Out Flow:** Similar but simpler — no face re-verification. Calculates `workHours` from `checkIn` to now, calculating `extraHours` beyond the standard working day.

**Auto Clock-Out (Cron):** Every 15 minutes, `autoClockOutJob.js` finds all attendance records where `checkOut` is null and `checkIn` was more than 9 hours ago. It auto-sets `checkOut`, computes `workHours`, and emits an update event.

### 14.3 Biometric Trust Score Engine

`spatialTrustEngine.js` starts all users at `trustScore = 100` and applies deductions:
- **Geofence violation** (outside office radius): `-40 points`
- **Mock GPS accuracy** (exactly 0m, 1m, or 5m — static mock provider signatures): `-40 points`
- **Low GPS accuracy** (>500m): `-30 points`
- **Impossible velocity** (>900 km/h from last check-in location — airplane speed): `-50 points`

`trustScoreEngine.js` then calls `computeCompositeTrust()`:
- `compositeScore = Math.min(spatialScore, livenessScore)`
- `isFlagged = compositeScore < 60 OR any violation triggered`
- Determines the `verificationMethod` string (e.g., `MOCK_LOCATION_DETECTED`, `GEOFENCE_VIOLATION`)

A score < 60 means the attendance record is flagged and visible to admins.

### 14.4 Proxy Detection Engine

`proxyDetectionEngine.js` runs during the daily cron job (or on-demand) and detects three fraud vectors:

1. **Coordinate Proximity Collision** — Two *different* users check in from GPS coordinates < 1 meter apart on the same day. This indicates one person clocked in for another. Severity: `HIGH`.

2. **Travel Speed Anomaly** — A user's GPS on today vs. yesterday implies travel faster than 900 km/h. This indicates a VPN/location spoofer. Severity: `MEDIUM`.

3. **Temporal Cluster** — Two users check in within 5 seconds of each other on 3+ of the last 7 days. This indicates systematic clock-in manipulation. Severity: `LOW`.

All detected anomalies are written as `ProxyAlert` records and the admin is notified via `PROXY_ALERT_HIGH` email.

### 14.5 Payroll Engine

`payrollCalculator.js` computes all salary components from a single function `calculatePayroll(monthWage, payableDays, totalDaysInMonth, config)`:

1. **Prorated Wage** = `(monthWage / totalDaysInMonth) * payableDays`
2. **Basic Salary** = `proratedWage * (basicPercentOfWage / 100)` (default: 50%)
3. **HRA** = `basicSalary * (hraPercentOfBasic / 100)` (default: 50%)
4. **Performance Bonus** = `basicSalary * (bonusPercentOfBasic / 100)` (default: 8.33%)
5. **LTA** = `basicSalary * (ltaPercentOfBasic / 100)` (default: 8.33%)
6. **Standard Allowance** = prorated fixed amount (default: ₹4167/mo)
7. **Fixed Allowance** = `proratedWage - (Basic + HRA + StandardAllowance + Bonus + LTA)` (balancing item)
8. **PF Employee** = `basicSalary * 12%`
9. **Professional Tax** = Fixed ₹200 (or state-specific from `ComplianceRule`)
10. **Gross Salary** = Basic + HRA + Standard + Bonus + LTA + Fixed
11. **Net Salary** = Gross - PF Employee - Professional Tax

The `payrollController.js` additionally queries `shiftComplianceEngine` for `overtimeBonus` and `lateDeductions`, and queries `SalaryAdvance` for any `Approved` advance to deduct (`advanceDeduction`). The final `netSalary` accounts for all of these.

### 14.6 Leave Ledger System

This is a **double-entry ledger** system — not a simple balance counter. Every leave operation creates a new row in `LeaveLedgerEntry`. The current balance is the `SUM(amount)` of all rows for a user+policyGroup.

- **Positive entries**: `ANNUAL_GRANT` (year start), `ACCRUAL`, `CARRY_FORWARD`, `REVERSAL` (when rejected)
- **Negative entries**: `PENDING_HOLD` (when applied), `LEAVE_TAKEN` (when approved), `YEAR_END_LAPSE`, `ENCASHMENT`

**PostgreSQL Advisory Locking** is used: before every ledger write, `acquireAdvisoryLock(tx, tenantId, userId, policyGroupId)` runs `SELECT pg_advisory_xact_lock(hashtext(...))`. This prevents race conditions if two leave requests are submitted simultaneously.

**Leave Renewal Job** (1 AM daily): For each tenant + policy:
1. If today is the leave year start date → `YEAR_END_LAPSE` all remaining balance, then `ANNUAL_GRANT` the new year's quota.
2. If carry-forward is enabled → compute carry amount (capped at `maxCarryForward`), create a `CARRY_FORWARD` entry.

**New Employee Enrollment**: When a new employee is created, `enrollUserInLeaves()` runs. It calculates a **pro-rated quota** based on how far into the current leave year the employee joined, and creates `ANNUAL_GRANT` entries for each policy.

### 14.7 Shift Compliance Engine

`shiftComplianceEngine.js` is called during payroll generation. It takes a user's attendance records for the month plus their `ShiftPolicy` and computes:

- **Late Arrival Deduction**: For each day, if `checkIn > (shiftStart + graceMinutes)`, deduct `lateMinutes * lateDeductionPerMinute`.
- **Early Departure Deduction**: If `checkOut < shiftEnd`, deduct `earlyMinutes * lateDeductionPerMinute`.
- **Overtime Bonus**: If `checkOut > shiftEnd` and the excess is `>= minOvertimeMinutes`, add `overtimeHours * hourlyRate * overtimeRateMultiplier`.

Days where the employee had an approved leave are **skipped** to avoid penalizing them for authorized absences.

### 14.8 Attrition Risk Engine

`attritionRiskEngine.js` scores each active employee on a 0-100 risk scale using 3 weighted factors:

| Factor | Weight | Signal |
|---|---|---|
| `overtimeTrend` | 35% | % increase in overtime hours (recent vs. baseline). High OT suggests burnout. |
| `attendanceVariance` | 35% | % increase in check-in time std deviation. Irregular attendance signals disengagement. |
| `leaveFrequency` | 30% | Count of sick/short-notice leaves in last 3 months. Frequent unplanned absences = risk. |

**Score labels**: 0-24 = Low, 25-49 = Moderate, 50-74 = High, 75-100 = Critical.

The scores are updated nightly (4 AM cron) and stored in `User.attritionRiskScore` and `User.attritionRiskLabel`. The `WorkforceAnalytics` page visualizes these. The architecture explicitly plans for a 4th factor (pulse survey sentiment) to be added without changing any other code.

### 14.9 Colocation Network Graph Engine

`colocationEngine.js` builds a **social network graph** of which employees spend physical office time together. It runs nightly (4:30 AM).

**Algorithm:**
1. Fetches 30 days of attendance records for the tenant (Present, with checkOut).
2. Groups records by `officeId + date`.
3. For every pair of users in the same office on the same day, calculates **overlapping hours** (intersection of their check-in/check-out windows).
4. Accumulates total overlap hours and distinct days across the 30-day window.
5. A pair is included in the graph only if: `totalHours >= 3` OR `overlappingDays >= 3`.
6. Produces `{ nodes: [{ id, name, department }], links: [{ source, target, value (hours), daysOverlapped }] }`.

The result is **cached** in `ColocationGraphCache` (upserted). The frontend's `OrgChart.jsx` fetches this from `GET /api/colocation` and renders it using `react-force-graph-2d` (D3-force physics simulation), showing a real-time visualization of office collaboration networks.

### 14.10 Performance Management Module

Three sub-systems, accessed under `/dashboard/performance`:

**Goals (OKRs):**
- Hierarchical: a `Goal` can have a `parentGoalId` linking to a company/team goal.
- Categories: Individual, Team, Company.
- Metric types: Percentage, Boolean, Number, Currency.
- Status: NotStarted, InProgress, Achieved, Abandoned.
- `progress` (0-100) is calculated server-side.

**Reviews:**
- Manager creates a `Review` for a `reviewee`.
- `ratings` is a JSON blob (flexible key-value rating fields).
- Lifecycle: Draft → Published → Acknowledged.

**360 Feedback:**
- `Feedback360` has `isAnonymous` (default true). When anonymous, `providerId` is set to `null` in the DB — genuinely untraceable.
- `competencies` is JSON with competency ratings.
- Status: Visible/Hidden (soft-delete equivalent).

### 14.11 ATS (Applicant Tracking System)

A lightweight built-in recruitment tracker:
- `JobRequisition` — Job postings (Open/Draft/Closed/OnHold).
- `Candidate` — Applicant profiles. `parsedData` JSON holds AI-parsed resume fields.
- `Application` — Kanban pipeline stages: Applied → Screening → Interview → Offer → Hired/Rejected.
- The public `Careers` page (`/careers/*`) fetches and renders open job listings, allowing external candidates to apply.

### 14.12 Benefits Administration

- Admin creates `BenefitPlan` with category (Health, Dental, Vision, Retirement, etc.) and `tierRates` JSON (individual/spouse/family cost breakdown).
- Employees enroll in plans → `EmployeeBenefit` records are created with a `coverageTier`.
- During payroll generation, the `benefitsController` calculates the monthly deduction from the plan's tier rate and adds it to `benefitsDeduction` in the `Payroll` record.

### 14.13 Expense Management

- Employee submits `ExpenseClaim` with title, category, amount, date, receipt file (uploaded to ImageKit).
- Admin/Manager approves or rejects with remarks.
- On SETTLED status, the `settledAt` timestamp is written.
- Approved expenses can be included in payroll as `expenseReimburse`.

### 14.14 Document Generator

- Admin creates `DocumentTemplate` with an HTML body containing variable placeholders like `{{employeeName}}`, `{{joiningDate}}`.
- Admin generates a `GeneratedDocument` for a specific employee → `documentRenderer.js` substitutes all variables.
- The rendered HTML is converted to PDF using `pdf-lib` and uploaded to ImageKit.
- The resulting `GeneratedDocument` record holds the `fileId`, `url`, and `title`.
- The employee receives a `DOCUMENT_GENERATED` notification email.

### 14.15 Pulse Surveys (Engagement)

- Admin creates a `PulseSurvey` with a JSON array of questions.
- Employees submit `PulseResponse`. Each response uses `respondentHash` (SHA-256 of `userId + surveyId`) instead of the real `userId` — ensuring anonymity while preventing duplicate submissions.
- The live `pulseEngine.js` provides a 1-minute real-time "cost accrual" ticker that tracks how much compensation is being earned company-wide per minute as employees work.

### 14.16 Onboarding Wizard System

When a new employee is invited and sets their password, `user.onboardingCompleted = false`. The `ProtectedRoute` redirects them to `/onboarding`.

The `OnboardingWizard.jsx` is a multi-step form with steps like `personal_details`, `bank_details`, `documents`, `preferences`. Each step hits a backend endpoint, which updates `user.onboardingStep`. On final completion, `user.onboardingCompleted = true` is set.

The nightly **onboarding reminders cron** (9 AM) finds users who haven't completed onboarding and sends reminder emails with their current stuck step.

Admin can also assign `OnboardingTask` lists (from `OnboardingChecklistTemplate`) to new hires, with `dueOffsetDays` from their join date.

### 14.17 Helpdesk Tickets

Simple internal support system. Employees create `Ticket` records with subject, description, and category (HR/IT/Payroll). Admins manage them through statuses: Open → InProgress → Resolved.

### 14.18 Asset Management

- IT/Admin creates `Asset` records (laptop, phone, badge, etc.) with `serialNumber`, `category`, `condition`, `purchaseDate`, `price`.
- Assigning to an employee creates an `AssetAssignment` record. The `Asset.assignedToId` is updated.
- On return, `AssetAssignment.returnedAt` is filled, and asset status returns to `Available`.

### 14.19 Projects & Timesheets

- Admin creates `Project` records with budget, dates, description.
- Employees log `TimesheetEntry` against a project with `hours`, `date`, `description`, and `isBillable`.
- The `Timesheet.jsx` page provides an interface for daily time logging.

### 14.20 1-on-1 Meetings (OneOnOnes)

- Manager schedules a `OneOnOne` with an employee, setting date, `talkingPoints` JSON, and `actionItems` JSON.
- Status: Scheduled → Completed / Cancelled.
- The hourly cron job automatically deletes past meeting records to keep the DB clean.
- Participants receive `1ON1_SCHEDULED` email notifications.

### 14.21 Announcements & Birthday Engine

**Announcements:** Admin creates `Announcement` with a category (General/Policy/Event/Birthday/Urgent). All employees in the tenant see them on their dashboard.

**Birthday Engine (8 AM cron):**
1. Finds all employees whose `dateOfBirth` matches today's date.
2. Checks `UserPreference.announceBirthday === true` for each.
3. Creates a `Birthday` category `Announcement` in their name.
4. Sends a `BIRTHDAY_WISH` email to the birthday person.
5. All other employees can react/wish from the dashboard, creating `BirthdayWish` records.

### 14.22 Org Chart (Colocation Network)

`OrgChart.jsx` renders the colocation graph from the nightly pre-computed `ColocationGraphCache`. It uses `react-force-graph-2d` which runs D3 force simulation in a 2D canvas. Nodes represent employees, edge weight (thickness) represents total co-located hours. Nodes are colored by department.

### 14.23 SuperAdmin Console

The `SuperAdminDashboard.jsx` is only accessible to the `SuperAdmin` role (which has `tenantId = null`). It allows:
- Viewing all tenants and their stats.
- Upgrading/downgrading tenant plan tiers.
- Impersonating tenants for support.
- Viewing usage records for billing.
- Managing `ComplianceRule` state-specific tax data.
- Running manual cron jobs via `GET /api/cron`.

Backend: `superadminController.js` and `consoleController.js`. Uses `SUPER_ADMIN_BYPASS` tenant context.

### 14.24 Billing & Subscriptions

- Integrates with **Razorpay** for subscription management.
- `Subscription` model stores `razorpayPlanId` and `status`.
- `UsageRecord` tracks monthly active employee counts per tenant (for metered billing).
- The `billingController.js` handles Razorpay webhook events and plan changes.
- Tenant `planTier` (Free/Pro/Enterprise) gates features.

### 14.25 Audit Log System

Every sensitive action (payroll generation, role changes, advance approval, etc.) writes to `AuditLog`. Fields: `actorId`, `action`, `targetId`, `details` (JSON), `ipAddress`, `userAgent`, `prevHash`, `hash`.

The cryptographic chaining in `db.js` means the audit trail is immutable — any post-hoc modification of a record breaks the hash chain. The `notificationEngine` is configured to send `AUDIT_TAMPER_DETECTED` alerts if this is ever triggered.

### 14.26 Workforce Analytics

`WorkforceAnalytics.jsx` fetches data from `GET /api/analytics/` and renders:
- Headcount over time.
- Department breakdown charts.
- Attrition risk distribution.
- Leave utilization trends.
- Attendance heatmaps.

The `analyticsController.js` aggregates data using Prisma's `groupBy`, `count`, and `aggregate` operations across `User`, `Attendance`, `Leave` tables.

---

## 15. Data Flow Diagrams (Textual)

### Face-Verified Attendance Check-In

```
Browser (EmployeeDashboard.jsx)
  │
  ├─ navigator.geolocation.getCurrentPosition() → { lat, lng, accuracy }
  ├─ useLiveness hook → face-api.js client detection → webcam frame (base64)
  │
  └─▶ POST /api/attendance/checkin  { lat, lng, accuracy, faceImageBase64 }
        │
        ├─▶ auth.js middleware → verify JWT → inject tenantStorage
        │
        └─▶ attendanceController.checkIn()
              │
              ├─▶ faceMatchEngine.js
              │     ├─ DB: SELECT encryptedEmbeddings FROM FaceRegistration WHERE tenantId=...
              │     ├─ embeddingCrypto.decrypt() → known_faces dict
              │     └─▶ HTTP POST face_engine:8000/verify { image, known_faces }
              │             └─ Python: YOLOv8 detect → SFace encode → cosine match
              │             └─ return { match_id, confidence }
              │
              ├─▶ spatialTrustEngine.evaluateSpatialTrust()
              │     ├─ Haversine(lat, lng, office.lat, office.lng) → distance
              │     ├─ Check geofence violation → -40 trust
              │     ├─ Check mock GPS accuracy → -40 trust
              │     └─ Check teleportation velocity → -50 trust
              │
              ├─▶ trustScoreEngine.computeCompositeTrust()
              │     └─ min(spatialTrust, livenessTrust) → compositeScore
              │
              ├─▶ prisma.attendance.create() { all fields + trustScore }
              │
              └─▶ io.to('tenant:X:admin').emit('attendance:updated', data)
                    │
                    └─▶ Attendance.jsx real-time board updates instantly
```

### Payroll Generation Flow

```
Admin (Payroll.jsx)
  │
  └─▶ POST /api/payroll/generate { month, userId }
        │
        └─▶ payrollController.generatePayroll()
              │
              ├─▶ prisma.attendance.findMany() → attendance records for month
              │     └─ Count payableDays (Present + OnLeave days)
              │
              ├─▶ shiftComplianceEngine.computeShiftCompliance()
              │     └─ Returns: overtimeHours, overtimeBonus, lateDeductions
              │
              ├─▶ payrollCalculator.calculatePayroll(monthWage, payableDays, config)
              │     └─ Returns: basicSalary, hra, pf, grossSalary, netSalary, etc.
              │
              ├─▶ prisma.salaryAdvance.findMany({ status: 'Approved', monthDeduction: month })
              │     └─ Sum up advanceDeduction
              │
              ├─▶ prisma.employeeBenefit.findMany() → benefitsDeduction
              │
              ├─▶ prisma.payroll.create() { all components, netSalary }
              │
              ├─▶ SalaryAdvance records → update status to 'Deducted'
              │
              └─▶ sendNotification('PAYROLL_GENERATED')
                    └─ PDFKit generates payslip PDF → attaches to email
```

---

## 16. Deployment & Infrastructure

| Component | Platform | Details |
|---|---|---|
| **Frontend (main app)** | Vercel | `vercel.json` with SPA rewrites. Env: `VITE_API_URL`. |
| **Marketing Site** | Vercel | Separate Vercel project. Same `vercel.json` rewrite pattern. |
| **Backend API** | Render | `render.yaml` config. Web service, starts with `node src/server.js`. |
| **Face Engine** | Docker | `Dockerfile` with Python 3.11 slim. Port 8000. |
| **Database** | Neon.tech | Serverless PostgreSQL with connection pooling. `DATABASE_URL` env var. |
| **File Storage** | ImageKit | `IMAGEKIT_PUBLIC_KEY`, `IMAGEKIT_PRIVATE_KEY`, `IMAGEKIT_URL_ENDPOINT`. |
| **Email** | Google Apps Script | `GOOGLE_SCRIPT_URL` env var. |
| **Cache/Queue** | Redis (any) | `REDIS_URL` env var for BullMQ. |
| **Payments** | Razorpay | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` env vars. |

**Backend `.env` variables needed**: `DATABASE_URL`, `JWT_SECRET`, `PORT`, `ALLOWED_ORIGINS`, `FRONTEND_URL`, `GOOGLE_SCRIPT_URL`, `IMAGEKIT_PUBLIC_KEY`, `IMAGEKIT_PRIVATE_KEY`, `IMAGEKIT_URL_ENDPOINT`, `FACE_ENGINE_URL`, `FACE_EMBEDDING_SECRET`, `REDIS_URL`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`.

---

## 17. Frontend Route Map & Guard Logic

```
/                              → Landing (public marketing page)
/login                         → UniversalAuth (login mode)
/signup                        → UniversalAuth (signup mode)
/forgot-password               → ForgotPassword (OTP email flow)
/set-password?token=xxx        → SetPasswordFromInvite
/change-password               → ChangePassword
/auth-receiver                 → AuthReceiver (OAuth callback handler)
/careers/*                     → Careers (public job board)

/face-registration             → FaceRegistration [Protected: all authenticated users]
/onboarding                    → OnboardingWizard [Protected: all authenticated users]
/superadmin/*                  → SuperAdminDashboard [Protected: SuperAdmin role only]
/dashboard/*                   → Dashboard shell [Protected: all authenticated users]
  /dashboard/                  → EmployeeDashboard (default)
  /dashboard/attendance        → Attendance (admin board)
  /dashboard/payroll           → Payroll
  /dashboard/leaves            → TimeOff
  /dashboard/salary-advance    → SalaryAdvance
  /dashboard/shifts            → ShiftScheduling
  /dashboard/performance       → PerformanceDashboard
  /dashboard/analytics         → WorkforceAnalytics
  /dashboard/org-chart         → OrgChart (Colocation Graph)
  /dashboard/engagement        → EngagementHub
  /dashboard/pulse             → PulseSurveys
  /dashboard/profile           → MyProfile
  /dashboard/benefits          → BenefitsAdministration
  /dashboard/expenses          → ExpenseManagement
  /dashboard/documents         → DocumentGenerator
  /dashboard/helpdesk          → Helpdesk
  /dashboard/timesheet         → Timesheet
  /dashboard/one-on-ones       → OneOnOnes
  /dashboard/announcements     → EngagementHub (announcements tab)
  /dashboard/employees         → EmployeeList (admin)
  /dashboard/employees/:id     → EmployeeDetails (admin)
  /dashboard/employees/create  → CreateEmployee (admin)
```

---

## 18. Complete Database Entity Catalogue

| Model | Key Fields | Notes |
|---|---|---|
| `Tenant` | id, name, domain, planTier, departments[], customRoles | Root entity. All data scoped to it. |
| `User` | id, email, password, roleDefinitionId, tenantId, officeId, shiftPolicyId, managerId, faceRegistered, onboardingCompleted, baseSalary, attritionRiskScore | Central identity. 40+ fields. |
| `RoleDefinition` | id, tenantId, name, level, permissions, canAccessConsole | Defines RBAC roles. Level system: 0=Owner, 1=HR, 2=Manager, 3+=Employee. |
| `Office` | id, tenantId, lat, lng, radiusMeters, name | GPS-anchored geofence. |
| `Attendance` | id, userId, date, checkIn, checkOut, latitude, longitude, trustScore, isFlagged, isLivenessVerified | Full biometric + spatial record. |
| `ShiftPolicy` | id, tenantId, name, startTime, endTime, gracePeriodMinutes, lateDeductionPerMinute, overtimeRateMultiplier | Defines shift rules. |
| `ShiftRoster` | id, tenantId, userId, shiftPolicyId, date | User-day-shift assignment. |
| `ShiftSlot` | id, tenantId, date, shiftType, startTime, endTime | Actual shift occurrence. |
| `ShiftAssignment` | id, tenantId, slotId, employeeId, mode | Employee in a slot (AUTO/MANUAL). |
| `LeavePolicy` | id, tenantId, name, annualQuota, isPaid, carryForward, requiresAttachment | Policy group definition. |
| `LeaveLedgerEntry` | id, tenantId, userId, policyGroupId, amount, reason | Double-entry ledger row. |
| `Leave` | id, userId, leavePolicyId, startDate, endDate, status, durationType | Leave request. |
| `Payroll` | id, userId, month, basicSalary, hra, grossSalary, netSalary, locked | Finalized payslip. |
| `PayrollConfig` | id, tenantId, companyName, pfEmployeePercent, basicPercentOfWage, ... | Company-specific payroll config. |
| `SalaryAdvance` | id, userId, amount, reason, monthDeduction, status, riskScore | Advance request + risk score. |
| `ExpenseClaim` | id, userId, title, category, amount, receiptFileId, status | Employee expense. |
| `BenefitPlan` | id, tenantId, name, category, tierRates | Company benefit plan. |
| `EmployeeBenefit` | id, userId, planId, coverageTier, customDeduction, status | Employee's enrollment. |
| `Goal` | id, userId, title, metricType, progress, parentGoalId | OKR goal with alignment. |
| `Review` | id, reviewerId, revieweeId, cycleName, ratings, status | Performance review. |
| `Feedback360` | id, providerId, receiverId, content, isAnonymous, competencies | Peer feedback (anonymous). |
| `Ticket` | id, userId, subject, category, status | Helpdesk ticket. |
| `OnboardingTask` | id, userId, title, dueDate, isCompleted | Checklist item for new hire. |
| `OnboardingChecklistTemplate` | id, tenantId, name, department | Reusable onboarding template. |
| `OnboardingDocument` | id, userId, type, fileId | Document uploaded during onboarding. |
| `DocumentTemplate` | id, tenantId, type, bodyTemplate | HR doc template (Offer Letter, etc). |
| `GeneratedDocument` | id, userId, fileId, url, title | Produced PDF document. |
| `FaceRegistration` | id, userId, encryptedEmbeddings (Bytes), status | AES-256 encrypted face embedding. |
| `ProxyAlert` | id, tenantId, userId, alertType, severity, reason, metadata | Fraud detection alert. |
| `JobRequisition` | id, tenantId, title, department, status | Job posting. |
| `Candidate` | id, tenantId, email, resumeUrl, parsedData | Applicant profile. |
| `Application` | id, candidateId, jobRequisitionId, stage | Recruitment pipeline item. |
| `Asset` | id, tenantId, name, category, serialNumber, status | Company-owned hardware. |
| `AssetAssignment` | id, userId, assetId, assignedAt, returnedAt | Assignment history. |
| `Project` | id, tenantId, name, budget, status | Project definition. |
| `TimesheetEntry` | id, userId, projectId, hours, date, isBillable | Time log entry. |
| `OneOnOne` | id, employeeId, managerId, date, talkingPoints, actionItems | 1:1 meeting. |
| `PulseSurvey` | id, tenantId, title, questions, isActive | Engagement survey. |
| `PulseResponse` | id, surveyId, respondentHash, answers, rating | Anonymous survey response. |
| `Announcement` | id, tenantId, adminId, title, category, message | Company announcement. |
| `BirthdayWish` | id, announcementId, wisherId | Birthday reaction. |
| `AuditLog` | id, tenantId, actorId, action, prevHash, hash, ipAddress | Chained audit trail. |
| `ApiKey` | id, tenantId, name, keyHash, keyPrefix | External API key. |
| `WebhookSubscription` | id, tenantId, eventType, targetUrl | Outbound webhook. |
| `ColocationGraphCache` | id, tenantId, nodes (JSON), links (JSON) | Pre-computed office network. |
| `ComplianceRule` | id, tenantId, state, ruleType, rateTable | State-specific PT/PF rules. |
| `Subscription` | id, tenantId, razorpayPlanId, status | Billing subscription. |
| `UsageRecord` | id, tenantId, month, activeEmployees | Metered billing counter. |
| `LegalEntity` | id, tenantId, name, pfCode, ptRegNo | Sub-entity for payroll grouping. |
| `ImportJob` | id, tenantId, status, sourceFile, errorLog | Bulk import tracker. |
| `PendingRegistration` | id, email, otpCode, payload | Temp pre-verified company signup. |
| `AdminEmail` | id, tenantId, email | Whitelisted admin emails. |
| `InvitedEmployee` | id, tenantId, email | Pre-authorized invite emails. |
| `UserPreference` | id, userId, announceBirthday | Per-user settings. |
| `SignatureRequest` | id, tenantId, status | E-signature placeholder. |
| `HRDocument` | id, tenantId, content | Freeform HR doc. |

---

*Report generated by deep source analysis of the Team-Kratos/Crew monorepo. All file paths, engine behaviors, and data flows are sourced directly from reading the actual source code.*
