# Implementation Plan: Employee Onboarding Workflow Engine (v2)

This plan covers the implementation of **Feature 7: Employee Onboarding Workflow Engine**. 

> [!NOTE]
> **Clarification:** This feature strictly handles *Employee* Onboarding (the new hire experience and HR checklist), entirely separate from the *Company* Onboarding flow (tenant setup, payroll config) handled in the marketing-site registration.

The engine is divided into two distinct pillars:
1. **The Core Data Wizard:** A mandatory data collection flow that blocks dashboard access until the employee provides personal, emergency, financial, and statutory details.
2. **The Checklist Engine:** Persistent HR tasks (e.g., "Sign NDA", "Setup Laptop") that live on the dashboard as a to-do widget and do not block core platform access.

## Proposed Changes

### 1. Database Schema Updates (`schema.prisma`)

#### [MODIFY] `e:\Team-Kratos\backend\prisma\schema.prisma`
- **`User` model additions**:
  - `onboardingStep String @default("personal_details")` — Uses a string key instead of an `Int` to allow future customization without breaking.
  - `onboardingCompleted Boolean @default(false)` — True *only* when the core data wizard is finished.
  - Remove `aadharNo` from plain text persistence. Add `aadharLast4 String?`. Full numbers are stored in the uploaded document image; if text persistence is absolutely needed later, we will use column-level encryption.
- **Relational Checklist Models** (replacing the JSON stub):
  - `OnboardingChecklistTemplate`: `(id, tenantId, name, department?)`
  - `OnboardingChecklistTemplateTask`: `(id, templateId, title, dueOffsetDays)`
  - `OnboardingTask`: `(id, tenantId, userId, checklistId?, title, dueDate, isCompleted, completedAt, completedBy)`
  - `OnboardingDocument`: Track private document uploads `(id, userId, type, fileId, privateUrl, uploadedAt)`

### 2. Backend Implementation (`backend/src/`)

#### [NEW] `e:\Team-Kratos\backend\src\routes\onboarding.js`
#### [NEW] `e:\Team-Kratos\backend\src\controllers\onboardingController.js`
- **`PUT /api/onboarding/wizard-step`**:
  - Receives step data and updates the `User` model.
  - **Server-Side Enforcement:** Strictly validates that the incoming step matches the user's current `onboardingStep` to prevent skipping steps.
  - Uses Zod validation from `packages/shared/validations`.
- **`POST /api/onboarding/upload`**:
  - Rejects oversized or non-image files.
  - Uploads files using ImageKit's **private/authenticated mode** (not a public CDN URL).
- **`GET /api/onboarding/documents/:id`**:
  - Serves private documents via short-lived signed URLs.
  - Checks requester authorization (must be the document owner or an authorized Admin).
  - **Auditing:** Writes an entry to the `AuditLog` every time a PAN/Aadhar document is viewed.
- **`GET /api/onboarding/pipeline`**:
  - HR-facing endpoint. Returns all users with `onboardingCompleted: false`, their current step, and days-since-joining for monitoring.
- **Checklist Endpoints**: `GET/POST /api/onboarding/tasks` to instantiate `OnboardingTask` rows from templates and mark them complete.

#### [NEW] `e:\Team-Kratos\backend\src\jobs\onboardingReminders.js`
- A cron job integrating with `notificationEngine.js` to nudge users (and their managers/HR) if they are stuck on a wizard step for more than N days.

### 3. Frontend Implementation (`frontend/src/`)

#### [NEW] `e:\Team-Kratos\frontend\src\pages\onboarding\OnboardingWizard.jsx`
A full-page mandatory wizard utilizing `react-hook-form` and shared Zod schemas.
- **Step 1:** Personal Details (DOB, Gender, Marital Status, Address)
- **Step 2:** Emergency Contact
- **Step 3:** Financial (Bank details)
- **Step 4:** Statutory Uploads (PAN, Aadhar masks + private ImageKit uploads)

#### [NEW] `e:\Team-Kratos\frontend\src\pages\admin\OnboardingPipeline.jsx`
- Replaces `OnboardingSettings`. An HR dashboard to monitor stalled users and manually assign Checklist Templates (V1 will not auto-assign by department).

#### [MODIFY] `e:\Team-Kratos\frontend\src\components\layout\DashboardLayout.jsx`
- Routing guard: Redirects to `/onboarding` if `onboardingCompleted === false`. (Note: this only gates based on the data wizard, checklist tasks live in a persistent to-do widget and do not block platform access.)

### 4. Shared Validations (`packages/shared/`)
#### [MODIFY] `e:\Team-Kratos\packages\shared\validations\onboarding.js`
- Centralized Zod schemas for PAN format, Aadhar checksums, phone formats, etc.

## Open Questions

> [!IMPORTANT]
> **Production vs. Demo Scope:** Is this heading toward the demo/portfolio version or something people will actually use? If it's a demo, are we okay implementing the full security specifications for document uploads and audits as defined in the plan (which takes more time), or should we document them as "known limitations" for the demo and skip the implementation?

## Verification Plan

1. **Wizard Flow & Enforcement:** Submit Step 4 data via direct API call while the user is on Step 1. Verify the backend rejects it.
2. **Upload Security & Auditing:**
   - Attempt to upload an oversized PDF/exe. Verify rejection.
   - Verify uploaded Aadhar/PAN images are inaccessible via public CDN links.
   - Log in as Admin, view a document, and verify an `AuditLog` row is created.
3. **Data Security:** Verify `aadharNo` plaintext does not exist in the DB (only `aadharLast4`).
4. **Completion Separation:** Complete the wizard and verify the user is let into the dashboard, even if HR Checklist tasks remain pending.
5. **HR Pipeline:** Verify the Pipeline endpoint accurately lists stuck users and their current step.
