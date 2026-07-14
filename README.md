<div align="center">
  <h1>🌌 CREW</h1>
  <p><strong>Next-Generation HR, Payroll & Workforce Management System</strong></p>
  <p>An enterprise-grade, full-stack platform designed to bridge the gap between employee management, real-time tracking, and automated financial processing.</p>
</div>

---

## 🚀 Core Platform Architecture

**Crew** is engineered using a robust modern tech stack to ensure high performance, security, and real-time capabilities.

<table align="center">
  <tr>
    <td align="center"><strong>Frontend Client</strong><br/>⚛️ React + Vite<br/>🎨 Tailwind CSS<br/>📡 Socket.io-Client</td>
    <td align="center"><strong>Backend API</strong><br/>🟢 Node.js + Express<br/>🔄 WebSockets (Socket.io)<br/>🔐 JWT Authentication</td>
    <td align="center"><strong>Database & Storage</strong><br/>🐘 PostgreSQL (Neon)<br/>📐 Prisma ORM<br/>🖼 ImageKit (CDN)</td>
  </tr>
</table>

---

## 💎 Comprehensive Feature Breakdown

### 📍 1. Geospatial Attendance Engine
A strict, location-aware attendance system designed to prevent time-theft and ensure employees are physically present.
- **Geofencing Algorithm:** Utilizes the Haversine formula backend-side to calculate the exact distance between the employee's browser GPS coordinates and the central office coordinates.
- **Live Restrictions:** Employees physically cannot clock in or out if they are outside the strict `OFFICE_RADIUS_METERS`.
- **Real-Time Pulse (WebSockets):** The moment an employee clicks "Check-In", a WebSocket event instantly beams the update to the Admin Dashboard without requiring a page refresh.

### 💰 2. Automated Payroll & Compensation
A fully integrated financial module that replaces manual spreadsheet calculations.
- **Dynamic Calculation:** The Admin Payroll Engine cross-references an employee's `Base Salary` with their `Total Days Present` in a given month.
- **Advance Deductions:** Automatically scans the database for any "Approved" Salary Advances for the month and deducts them from the Gross Pay before finalizing Net Pay.
- **Immutable Payslips:** Once generated, payslip records are permanently written to the database to ensure financial audit accuracy.

### 💳 3. Salary Advance Workflow
Empowers employees with financial flexibility while maintaining strict managerial oversight.
- **Employee Portal:** Staff can request specific advance amounts with written justifications directly from their dashboard.
- **Admin Adjudication:** Administrators see a live queue of `Pending` requests and can surgically `Approve` or `Reject` them.
- **Automated Settlement:** Approved advances are automatically flagged and settled during the next month's Payroll Generation cycle.

### 👤 4. Dynamic Identity & Profile Management
A rich, personalized experience for every user.
- **High-Fidelity Avatars:** Seamless integration with ImageKit allows employees to upload and crop Base64-encoded profile pictures directly to a global CDN.
- **Initial Fallbacks:** Intelligent UI components dynamically render beautiful, gradient-based Initials (e.g., "JD") if a user hasn't uploaded a photo yet.
- **Profile Completion Tracking:** Ensures critical data like Phone Numbers and Dates of Birth are securely collected and sanitized via the Prisma ORM.

### 🛡️ 5. Enterprise Security & Role-Based Access Control (RBAC)
Security is implemented at the routing, middleware, and database layers.
- **JWT Bearer Tokens:** Stateless, highly secure authentication tokens with explicit expiration windows.
- **Middleware Gates:** Strict `authorize('Admin')` middleware actively blocks unauthorized endpoints, ensuring standard employees cannot access payroll endpoints or invite systems.
- **CORS Policies:** Configured with strict `origin: true` reflection and `credentials: true` to prevent unauthorized cross-origin tampering.

---

## 🗄️ Database Schema & Entity Relationships

The PostgreSQL database is strictly modeled using **Prisma** to ensure referential integrity.

| Entity | Description | Core Relationships |
|---|---|---|
| **User** | The central identity containing passwords, roles, and base salary. | `1:N` with Attendance, Advances, Payrolls |
| **Attendance** | Daily records tracking exact `checkIn` and `checkOut` timestamps. | Belongs to `User` |
| **SalaryAdvance**| Requests containing requested amount, status, and justification. | Belongs to `User` |
| **Payroll** | Finalized monthly financial statements calculating Net Pay. | Belongs to `User` |

---

## 🌐 Cloud Infrastructure & Deployment

The application is architected for modern serverless and PaaS deployment environments.
- **Edge Delivery:** The frontend is optimized and deployed globally via **Vercel's Edge Network**.
- **Containerized API:** The backend operates as an isolated Web Service on **Render**, utilizing dynamic Environment Variable injection for secure database connections.
- **Pooled Database:** The PostgreSQL instance utilizes **Neon.tech's Connection Pooling** to handle massive spikes in simultaneous employee check-ins without database connection exhaustion.