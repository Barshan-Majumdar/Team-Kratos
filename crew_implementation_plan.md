# CREW HRMS: Comprehensive Master Implementation & Architecture Plan

## 1. Product Vision & Architecture Overview
Crew is designed as a scalable, production-ready, multi-tenant HRMS. It goes beyond standard core HR (Zoho/Keka parity) by introducing real-time presence fraud detection, edge AI liveness checks, and a RAG-based intelligence chatbot.

### 1.1 Complete Technology Stack
**Frontend:**
- **Core:** React 19, Vite 5 + SWC, TypeScript 5.x
- **Styling:** Tailwind CSS v4 (JIT, design tokens, no runtime overhead)
- **State Management:** React Query v5 (TanStack for server state, optimistic updates), Zustand v4 (client state for session/inbox)
- **Real-Time & Edge AI:** Socket.io-client v4, onnxruntime-web v1.18, face-api.js v0.22 (TinyFaceDetector)
- **UI Components:** React Hook Form + Zod, Recharts v2, React Force Graph v1, React DnD/dnd-kit v6, React PDF, Signature Canvas.

**Backend:**
- **Runtime:** Node.js v22 LTS (ESM), Express 5 (async error handling), TypeScript 5.x
- **ORM & DB:** Prisma ORM v5, PostgreSQL 16 (Neon.tech serverless via pgBouncer for connection pooling).
- **Events & Background Jobs:** Socket.io v4 (cluster adapter), BullMQ v5 + Redis (Upstash), node-cron v3.
- **Validation:** Zod v3 (shared schema with frontend).
- **Security & Utils:** jsonwebtoken v9, bcrypt (cost factor 12), express-rate-limit v7, Helmet, strict CORS, multer + sharp (ImageKit integration), pdf-lib v1 (PDF generation), Papaparse v5 (CSV).

**Infrastructure & Data Layer:**
- **Hosting:** Vercel (Frontend edge network), Render (Backend web service + BullMQ auto-deploy).
- **Storage/DB Extras:** pgvector v0.7 (HNSW indexes for Embeddings), ImageKit CDN.
- **CI/CD:** GitHub Actions (Zod checks, Prisma dry-runs), Neon DB branching (dev/staging/prod).
- **AI Models:** Claude API (claude-sonnet-4-6 with tool use), text-embedding-3-small (Embeddings).
- **Third Party:** Razorpay (Subscriptions/GST), Gupshup/Twilio (WhatsApp Business API).

### 1.2 Access Management Matrix (RBAC) & Tenancy Model
- **Row-Level Tenancy:** Implemented using `tenantId` on every Prisma model. A Prisma middleware automatically injects `WHERE tenantId = $currentTenant` on all queries. JWT embeds `tenantId` as a claim.
- **Hierarchical Hybrid Roles:** The system utilizes a Level-based Hybrid Role structure supporting custom and dynamic roles:
  - **Level 0 (CEO / Chairman):** Full platform access, owner of the tenant. Can manage all roles.
  - **Level 1 (Admin / SuperAdmin):** Full HR operations. Can manage all roles below Level 1.
  - **Level 2 (Manager / HR):** Team-scoped approvals and visibility. Can view team data and invite Level 3 roles.
  - **Level 3 (Employee):** Self-service, own data only. No access to role management.
- **Strict Span of Control (The "Below-Only" Rule):** To prevent privilege escalation, any user (except Level 0 and Level 1) can **only invite or assign roles that are strictly numerically below their own authority level**. For example, a Level 2 Manager cannot invite another Level 2 Manager or a Level 1 Admin. They can only invite Level 3 Employees. This is mathematically enforced via backend middleware (`ROLE_LEVELS`) during both manual `/api/users` creation and CSV bulk-invites.
- **CEO Override & Custom Roles:** The CEO has the ability to build dynamic `CustomRoles` for the tenant during registration (or later via settings). These custom roles are mapped to the overarching Level 0-3 framework to ensure backward compatibility with hardcoded endpoints.
- **System Locked Features:** Security, fraud detection (spatial trust, liveness, proxy detection), audit trail, and RBAC itself are locked. The CEO cannot alter permissions for these features to guarantee architectural integrity.

---

## 2. Detailed Feature-by-Feature Implementation Plan

### Phase 0: Foundation (Existing Platform Capabilities)
These five features represent the existing backbone that all other features build upon.

*   **F1. Geospatial Attendance Engine**
    *   **Purpose:** Prevents time-theft. Haversine distance calculated server-side vs office lat/lng.
    *   **Tech:** Express route, browser Geolocation API, Socket.io real-time push.
    *   **Access:** Superadmin (Full), CEO (View), Admin (Full), Manager (View), Employee (Own). *Locked: Superadmin.*
*   **F2. Automated Payroll & Compensation Engine**
    *   **Purpose:** Monthly statement generator netting advances and leaves.
    *   **Tech:** Prisma `Payroll` model (immutable after write), BullMQ job for async calculation on large orgs.
    *   **Access:** Superadmin (Full), CEO (View), Admin (Full), Manager (None), Employee (Own). *Locked: Superadmin.*
*   **F3. Salary Advance Workflow**
    *   **Purpose:** Cash flow flexibility.
    *   **Tech:** `SalaryAdvance` Prisma model. Generic React approval-queue component (reused globally 6+ times).
    *   **Access:** Employee (Own), Manager (View), Admin (Full).
*   **F4. Dynamic Identity & Profile Management**
    *   **Tech:** `User` model, ImageKit SDK for CDN, multer+sharp for resizing. Fallback SVG generation.
*   **F5. Enterprise Security & Role-Based Access Control**
    *   **Tech:** stateless JWT v9 Bearer tokens, bcrypt, `authorize()` Express middleware, strict CORS, express-rate-limit.
    *   **Access:** *System Locked* for all (except Superadmin/CEO/Admin).

---

### Phase 1: Tier 0 - Productization & Scale (Mandatory Structural Layer)
This phase transforms the application from a single-tenant demo into a scalable SaaS product. Must be built prior to Tiers 1-3.

*   **0.1 Multi-Tenant Architecture & Org Provisioning**
    *   **Implementation:** Add `Tenant` Prisma model. Add `tenantId` to all existing models. Prisma middleware auto-injects `tenantId`. `tenantId` embedded in JWT claims.
    *   **Access:** *System Locked* (Admin/Manager/Employee: None).
*   **0.2 State-Wise Statutory Compliance Engine (PF, ESI, PT, LWF)**
    *   **Implementation:** `ComplianceRule` model (state, ruleType, effectiveFrom, rateTable JSON). F2 engine reads rules by `Office.state`. FFS workflow via `node-cron`.
    *   **Access:** *System Locked* (Manager/Employee: None).
*   **0.3 Metered Subscription & Billing Engine**
    *   **Implementation:** `Subscription`, `UsageRecord` models. Razorpay Subscriptions API for GST-compliant invoicing. BullMQ nightly job computes active employees per tenant.
*   **0.4 SaaS Super-Admin Console**
    *   **Implementation:** Add `SuperAdmin` role where `tenantId IS NULL`. Separate Express router (`/superadmin/*`) mounted behind middleware.
    *   **Access:** Superadmin (Full), all others (None). *System Locked.*
*   **0.5 Multi-Entity / Group Company Support**
    *   **Implementation:** `LegalEntity` Prisma model under `Tenant`. `entityId` foreign key added to User, Office, Payroll. Group by `entityId` for compliance, rollup for analytics.
*   **0.6 Bulk Data Import & Migration Toolkit**
    *   **Implementation:** `ImportJob` staged model (status, mapping). Papaparse for CSV parsing. BullMQ worker handles batch inserts to avoid HTTP timeouts.
*   **0.7 Notification Engine (Email Only)**
    *   **Implementation:** `NotificationChannel` abstraction. Uses NodeMailer and Gmail SMTP alongside real-time Socket.io alerts. Per-tenant config in `Tenant.notificationPreferences`.
*   **0.8 Statutory Filing & Challan Generation**
    *   **Implementation:** `pdf-lib` template-based generation (PF ECR, PT challans) written to AuditLog with a SHA-256 hash.
*   **0.9 Public API & Webhook Platform**
    *   **Implementation:** Versioned `/api/v1/*` routes using tenant-issued API keys. `WebhookSubscription` model firing off existing Socket.io domain events.

---

### Phase 2: Tier 1 - HRMS Parity (Zoho People Feature Set)
Achieves full feature parity with mainstream platforms.

*   **6. Leave Management Engine**
    *   **Implementation:** `LeavePolicy` & `LeaveRequest` models. Reuses F3 generic React approval-queue component. Payroll engine (F2) reads approved leaves during Net Pay.
*   **7. Onboarding Workflow Engine**
    *   **Implementation:** `OnboardingTask`, `OnboardingChecklist`. Multi-step React hook form with Zod validation. State persists to backend after each step. ImageKit document uploads.
*   **8. Performance Management (OKRs, 360 Feedback)**
    *   **Implementation:** `Goal`, `Review`, `Feedback360` Prisma models. Scoped by manager hierarchy. Recharts radar chart on frontend.
*   **9. HR Helpdesk & Ticketing System**
    *   **Implementation:** `Ticket` model. Socket.io status updates. Ticket bodies are embedded into `pgvector` as a data source for the RAG Chatbot (#37).
*   **10. Dynamic Org Chart & Manager Hierarchy**
    *   **Implementation:** `User.managerId` self-relation. `req.user.role === 'Manager'` middleware scopes queues. Recursive tree React component.
*   **11. Multi-Office Geofence Registry**
    *   **Implementation:** `Office` model (name, lat, lng, radiusMeters). Update F1 to lookup assigned office runtime rather than env constants.
*   **12. Employee Engagement Hub**
    *   **Implementation:** `Announcement` model. `node-cron` daily execution for birthdays, emitting Socket.io broadcasts.
*   **13. Shift Scheduling & Rostering**
    *   **Implementation:** `ShiftPolicy` (shiftStart, shiftEnd, gracePeriodMinutes). React DnD calendar grid. Direct prerequisite for Overtime (#22).
*   **14. Expense Management & Reimbursement**
    *   **Implementation:** `ExpenseClaim` model. ImageKit for receipts. 6th reuse of the approval-queue UI. Batch settled via BullMQ.
*   **15. Document Generation Engine**
    *   **Implementation:** Server-side template strings with placeholders. `pdf-lib` injects data and renders PDF entirely in Node.js.
*   **16. Benefits Administration**
    *   **Implementation:** `BenefitPlan`, `EmployeeBenefit` models. Injects value dynamically into Payroll deductions array.
*   **17. Workforce Analytics & Reports Dashboard**
    *   **Implementation:** Prisma `groupBy` endpoints. 5-minute TTL Redis cache for performance. Recharts visual frontend.
.
---

### Phase 3: Tier 2 - Differentiator Features (Trust, Intelligence & Fraud Prevention)
Features beyond mainstream capabilities utilizing edge AI and advanced analytics.

*   **18. Spatial Trust Engine (Anti-GPS-Spoofing)**
    *   **Implementation:** `trustScore` & `verificationMethod` on Attendance. Scoring function evaluates Geolocation API accuracy variance (e.g., perfect 5.0m often signifies mock-location).
    *   **Access:** *System Locked* (Admin/Manager: View, Employee: None).
*   **19. On-Device Facial Liveness Verification**
    *   **Implementation:** `face-api.js` (TinyFaceDetector) + ONNX liveness model via `onnxruntime-web`. Runs in a Web Worker to avoid blocking UI. Zero images sent to server—only verified boolean and embedding hash sent.
    *   **Access:** *System Locked.*
*   **20. Proxy / Buddy-Punching Anomaly Detection**
    *   **Implementation:** Nightly BullMQ job checks Attendance pairwise coordinate similarity (Haversine < 1m) and travel-speed feasibility. Writes to `ProxyAlert` table.
    *   **Access:** *System Locked.*
*   **21. Predictive Salary Advance Risk Scoring**
    *   **Implementation:** Logistic-regression style weighted pure JS/SQL formula caching to `SalaryAdvance.riskScore`.
    *   **Access:** *System Locked.*
*   **22. Shift-Aware Overtime & Labor-Compliance**
    *   **Implementation:** Diff function on Attendance vs `ShiftPolicy` (#13). Produces JSON `deductions[]` and `bonuses[]` arrays on the Payroll record for itemized payslips.
*   **23. Live Org Pulse Dashboard**
    *   **Implementation:** Socket.io room `admin:pulse`. In-memory rolling state (headcount, cost burn) pushed on every checkin/out. Recharts live-updating area chart on frontend.
*   **24. Payroll Cost Forecasting & Budget Simulator**
    *   **Implementation:** Read-only `/analytics/forecast` route. Pure frontend client-side simulator applying F2 formula over slider inputs. No DB writes.
*   **25. Immutable Audit Trail (Hash-Chained)**
    *   **Implementation:** Append-only `AuditLog` Prisma model. SHA-256 hash chaining (SHA256 of prevHash + event payload). Postgres `CHECK` constraint explicitly blocks UPDATE/DELETE.
    *   **Access:** *System Locked.*
*   **26. Attrition & Burnout Risk Radar**
    *   **Implementation:** Nightly BullMQ scoring (overtime trend + attendance variance + leave frequency delta). Writes `AttritionRisk` score to User model (automatically fetched by Chatbot context).
*   **27. Colocation Network Graph**
    *   **Implementation:** Edge-weighted adjacency matrix of employees overlapping in office attendance. Rendered with `react-force-graph` using a D3-backed layout.

---

### Phase 4: Tier 3 - Keka Parity Gaps
## Phase 4: Tier 3 - Keka Parity Gaps
Features that fill specific gaps identified from a Keka HRMS analysis.

*   **29. Recruitment & Applicant Tracking System (ATS)**
    *   **Implementation:** `JobRequisition`, `Candidate`, `Application` models. Claude API extracts resume to structured JSON. React DnD Kanban board. Auto-generates Onboarding tasks (#7) on 'Offer Accepted'.
*   **30. Unified Action Inbox**
    *   **Implementation:** `/inbox` endpoint performs UNION across `LeaveRequest`, `SalaryAdvance`, `ExpenseClaim`, `AttendanceCorrection`, `OnboardingTask`. Socket.io pushes badge counts live.
*   **31. Asset & Equipment Management** [COMPLETED]
    *   **Implementation:** `Asset`, `AssetAssignment` models. `/api/assets` CRUD, `AssetDirectory.jsx`, and embedded inside `EmployeeDetails.jsx`.
*   **32. Project & Timesheet Management (PSA)** [COMPLETED]
    *   **Implementation:** `Project`, `TimesheetEntry` models. Full `/api/projects` routes. Added `ProjectsDashboard.jsx` (Admin view) and `Timesheet.jsx` (Employee logging grid).
*   **33. Continuous 1:1 Meeting Tracker** [COMPLETED]
    *   **Implementation:** `OneOnOne` model (talkingPoints as JSON arrays). Created full CRUD, Manager scoped visibility, and `OneOnOnes.jsx` frontend view.
*   **34. Automated Pulse Survey Engine** [COMPLETED]
    *   **Implementation:** `PulseSurvey`, `PulseResponse` models. Responses structurally anonymized via `SHA-256(userId + surveyId + salt)`. PulseSurveys frontend created. Dispatched surveys can be answered anonymously by employees.
*   **35. Granular Leave Types (Partial Day / Half Day)** [SKIPPED BY USER]
    *   **Implementation:** Leave balance to Decimal. `durationType` enum (FullDay/HalfDay/Hourly). Overtime engine (#22) reads this to suppress late penalties for approved short-leave.
*   **36. Digital Document Signing (E-signature)** [SKIPPED BY USER]
    *   **Implementation:** `SignatureRequest` model. HTML5 Canvas signature capture (or text attestation). Injects signature into PDFs via `pdf-lib`. Writes final doc hash to `AuditLog`.

---

### Phase 5: Headline Feature (The RAG Chatbot)
*   **37. RAG-based HR Intelligence Chatbot (Gemini 2.5 Flash)**
    *   **Routing & Tool Use:** Express `/hr-assistant/query` calls the **Gemini 2.5 Flash API** using `@google/genai`. Gemini uses Tool Calling/Function Calling to route intents (e.g., `analyzeEmployeePerformance`, `getEmployeeAttendance`, `searchHRPolicies`). Includes `ChatSession` and `ChatMessage` models to store chat history and maintain multi-turn memory.
    *   **Data Retrieval:** Prisma dynamic query execution + `pgvector` HNSW indexes for semantic search via Vector RAG. Retrieves data directly from the DB, including employee information, performance metrics, timesheets, and HR policies.
    *   **Context Assembly:** Results serialized as bounded context (employee analytics, policy excerpts, DB records) sent back to Gemini to give the HR admin rich, analytical insights.
    *   **Streaming & Audit:** Gemini streams completion token-by-token. Express emits `chatbot:token` via Socket.io to React. Entire prompt chain is hashed into the `AuditLog` (#25) for non-repudiation.
