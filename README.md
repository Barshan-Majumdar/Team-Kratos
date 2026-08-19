<div align="center">

# 🌌 CREW

### **AI-Native Workforce Intelligence Platform**

**HRMS • Payroll • Recruitment • Fraud Intelligence • Workforce Analytics • AI Investigation**

> **Crew doesn't just manage HR. Crew understands the workforce.**

[![React](https://img.shields.io/badge/Frontend-React%2019-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/Backend-Node.js%2022-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![AI](https://img.shields.io/badge/AI-Gemini-8E75B2)](https://ai.google.dev/)
[![Redis](https://img.shields.io/badge/Queue-Redis-DC382D?logo=redis&logoColor=white)](https://redis.io/)
[![Multi-Tenant](https://img.shields.io/badge/Architecture-Multi--Tenant-111827)]()

</div>

---

## 🧠 What Is Crew?

**Crew is an AI-native HR and Workforce Intelligence platform designed to move HR from passive record-keeping to proactive decision support.**

Traditional HRMS platforms are excellent at storing what happened:

- Who checked in?
- Who took leave?
- What is the payroll amount?
- Which candidates applied?
- Which requests are pending?

Crew goes one step further:

- **What changed?**
- **Why did it change?**
- **Is this unusual for this employee?**
- **What evidence supports the signal?**
- **Which company policy applies?**
- **Which candidates are the strongest fit?**
- **Which workforce patterns deserve HR attention?**
- **What should HR investigate next?**

Crew combines operational HR software, deterministic intelligence engines, real-time workforce signals, RAG, and grounded AI into one connected platform.

---

# ⚡ The Crew Difference

### From:

> **HR Management**

### To:

> **Workforce Intelligence**

```text
                         🌌 CREW
                           │
          ┌────────────────┼────────────────┐
          │                │                │
       HR OPS         RECRUITMENT       INTELLIGENCE
          │                │                │
     Attendance           ATS          Pattern Engine
     Payroll              Ranking       Risk Engine
     Leave                Matching      Fraud Engine
     Shifts               Skill Gaps     Pulse Signals
     Performance          Candidates     Risk Radar
          │                │                │
          └────────────────┼────────────────┘
                           │
                      ┌────▼────┐
                      │ IRIS AI │
                      └────┬────┘
                           │
                  Evidence + Policy
                           │
                      ┌────▼────┐
                      │ HUMAN HR│
                      └─────────┘
```

---

# 🔥 Why Crew Is Different

## 🛡️ 1. Workforce Trust, Not Just Attendance

Crew treats attendance as a **trust problem**, not merely a timestamp problem.

### Spatial Trust Engine
Validates physical attendance using geospatial verification and suspicious-location signals.

### On-Device Facial Liveness
Performs face/liveness verification at the edge before attendance is submitted.

### Proxy / Buddy-Punching Detection
Detects suspicious attendance relationships and anomalous check-in behavior.

### AI Investigation
When an alert occurs, Crew can investigate the incident using authorized HR evidence and company policies.

```text
Attendance Event
      ↓
Spatial Trust
      +
Liveness
      +
Behavioral Signals
      ↓
Fraud Detection
      ↓
AI Investigation
      ↓
Evidence-backed Report
      ↓
Human HR Review
```

---

# 📈 2. Personal-Baseline Workforce Intelligence

Crew does not blindly compare every employee against a generic threshold.

The Workforce Intelligence Engine can compare an employee's **current behavior against their own historical baseline**.

Example:

```text
Historical Attendance     94%
Current Attendance        79%
                         ─────
Change                   -15pp
```

Crew can analyze measurable shifts such as:

- Attendance degradation
- Punctuality changes
- Leave-pattern changes
- Sustained overtime exposure
- Cross-signal anomalies

The Pattern Engine produces structured mathematical signals.

The Risk Engine remains responsible for the authoritative risk score.

**No hidden `riskScore += 15` logic.**

---

# 🎯 3. Evidence-Backed Risk Intelligence

Crew separates:

```text
PATTERN DETECTION
        ↓
STRUCTURED SIGNALS
        ↓
RISK ENGINE
        ↓
AUTHORITATIVE RISK SCORE
        ↓
IRIS AI EXPLANATION
```

Signals can contain:

- Severity
- Confidence
- Baseline
- Comparison window
- Delta
- Data sufficiency
- Source records
- Signal lifecycle
- Deterministic identity

Example:

```json
{
  "type": "ATTENDANCE_DEGRADATION",
  "severity": "HIGH",
  "confidence": 0.94,
  "baselineWindow": "90D",
  "comparisonWindow": "30D",
  "baseline": 94,
  "current": 79,
  "delta": -15
}
```

Confidence describes the strength of the statistical pattern — **not the probability that an employee committed an offense.**

---

# 🤖 4. Iris AI — More Than a Chatbot

**Iris is Crew's natural-language intelligence layer.**

HR can ask questions such as:

> "Which employees have unresolved high-severity attendance alerts?"

> "Which engineers have declining attendance and increasing overtime?"

> "Why did this employee receive a high risk score?"

> "Show me the strongest candidates for this job."

> "Compare these candidates."

> "What company policy applies to this incident?"

But Iris is **not the source of truth**.

Crew follows a strict responsibility hierarchy:

```text
PostgreSQL
    ↓
Authoritative HR Facts

Fraud Engine
    ↓
Fraud Signals

Risk Engine
    ↓
Risk Score

ATS / Ranking Engine
    ↓
Recruitment Intelligence

RAG / pgvector
    ↓
Company Policies

Gemini / Iris
    ↓
Interpretation + Explanation

HR
    ↓
Final Decision
```

### Golden Rule

> **Calculate deterministically. Retrieve securely. Explain with AI. Decide with humans.**

---

# 🔎 5. AI Investigation Engine

A fraud alert does not have to remain a simple notification.

Crew can transform it into a structured investigation.

```text
Fraud Alert
     │
     ├── Attendance Records
     ├── Shift Records
     ├── Leave Records
     ├── Employee Context
     ├── Risk Signals
     └── Company Policy
             │
             ▼
       Investigation Engine
             │
             ▼
          Iris AI
             │
             ▼
     Evidence-backed Report
             │
             ▼
          HR Review
```

Investigation reports can contain:

- What happened
- Evidence
- Policy findings
- Assessment
- Assessment confidence
- Limitations
- Recommended next step
- Source identifiers
- Human-review requirement

AI does **not** determine fraud.

**Human HR makes the final decision.**

---

# 🎯 6. Recruitment Intelligence + ATS

Crew connects recruitment directly to the employee lifecycle.

```text
Job Description
       ↓
JD Structuring
       ↓
Candidate Applies
       ↓
Resume Structuring
       ↓
Semantic Matching
       ↓
Deterministic ATS
       ↓
Candidate Ranking
       ↓
Recruiter Decision
       ↓
Onboarding
```

Recruiters can access:

- ATS score
- Required skill coverage
- Partial matches
- Missing skills
- Match evidence
- Candidate ranking
- Ranking breakdown
- Candidate comparison
- Skill-gap analysis
- AI explanation

### Deterministic ATS

Gemini may help structure resumes and explain results.

**Gemini does not assign or override the final ATS score.**

---

# 🏆 7. Candidate Ranking With Evidence

Crew doesn't simply produce:

```text
Candidate A → 91
Candidate B → 87
Candidate C → 83
```

The ranking engine can consider:

```text
ATS Match
Required Skill Coverage
Relevant Experience
Interview Score
Eligibility
Evidence Coverage
```

It also supports deterministic tie-breaking and fingerprint-based recalculation.

Recruiters can therefore ask:

> **"Why is Candidate A ranked above Candidate B?"**

instead of blindly trusting a number.

---

# 🌍 8. Native Multi-Tenant & Multi-Entity Architecture

Crew is architected around strict tenant isolation.

Multiple companies can operate within the same Crew platform while maintaining isolated data boundaries.

Within an organization, Crew can support structures such as:

```text
Parent Organization
│
├── Company A
│   ├── Kolkata Office
│   └── Bangalore Office
│
├── Company B
│   ├── Singapore Office
│   └── US Office
│
└── Company C
    └── Regional Offices
```

The architecture separates:

- Tenant identity
- Organizations
- Companies / legal entities
- Offices
- Employees
- RBAC
- Recruitment data
- Payroll data
- AI context

This makes multi-company workforce management a first-class architectural concern.

---

# 💬 9. Employee Pulse & Workforce Sentiment

Not every workforce issue appears in attendance or payroll data.

Crew also provides pulse-check capabilities where HR can ask employees about:

- Workload
- Pressure
- Workplace experience
- Workforce concerns

Employees can provide anonymous feedback where configured.

This creates two complementary intelligence sources:

```text
OBJECTIVE SIGNALS
Attendance
Overtime
Leave
Fraud
Performance
       +
EMPLOYEE SIGNALS
Pulse
Workload
Pressure
       ↓
WORKFORCE INTELLIGENCE
```

Crew does not use pulse feedback to automatically label employees.

It provides HR with additional context.

---

# ⚡ 10. Real-Time Organizational Pulse

Crew uses WebSockets to provide live operational visibility.

HR can monitor workforce activity without repeatedly refreshing dashboards.

Live operational intelligence can include:

- Check-ins
- Workforce presence
- Attendance coverage
- Alerts
- HR actions
- Intelligence events

The goal is simple:

> **Don't wait for the end-of-month report to discover what is happening today.**

---

# 🧩 Complete Feature Set

## 🏢 Organization & HR

- Multi-Tenant Architecture
- Multi-Entity / Group Company Support
- Multi-Office Management
- Employee Profiles
- RBAC
- Manager Hierarchy
- Onboarding Workflows
- Employee Engagement
- Leave Management
- Shift Scheduling
- Benefits Administration
- HR Helpdesk
- Document Generation
- Digital Document Signing
- Bulk Data Import / Migration

---

## ⏱️ Attendance & Workforce Operations

- Geospatial Attendance
- Spatial Trust Engine
- Facial Liveness
- Proxy / Buddy-Punching Detection
- Shift-Aware Attendance
- Attendance Integrity Detection
- Overtime Intelligence
- Partial-Day / Short Leave Support
- Real-Time Organizational Pulse
- Immutable Attendance Audit Trail

---

## 💰 Payroll & Finance

- Automated Payroll
- Salary Advances
- Overtime & Labor Rules
- Payroll Cost Forecasting
- Budget Simulation
- Expense & Reimbursement
- Statutory Compliance
- Payslip Generation
- Benefits-linked Payroll Data

---

## 📊 Workforce Intelligence

- Risk Engine
- Pattern Analysis Engine
- Personal Baseline Analysis
- Intelligence Signals
- Risk Radar
- Cross-Signal Detection
- Workforce Pulse
- Workforce Analytics
- Colocation Intelligence
- Proactive HR Alerts
- Signal Lifecycle Management
- Data Sufficiency & Confidence Tracking

---

## 🎯 Recruitment Intelligence

- Job Requisitions
- Resume Upload
- JD Parsing
- Resume Structuring
- Semantic Matching
- Deterministic ATS
- Match Evidence
- Skill Gap Analysis
- Candidate Ranking
- Candidate Comparison
- Ranking Explanation
- Recruitment Copilot

---

## 🤖 Iris AI

- RAG HR Copilot
- Natural-Language HR Queries
- Fraud Investigation
- Risk Explanation
- Policy-Grounded Answers
- Evidence-Backed Investigation
- Investigation History
- AI Auditability
- Investigation Caching
- Data Fingerprinting
- Recruitment Intelligence
- Candidate Comparison
- Ranking Explanation

---

## 👥 Employee Experience

- Employee Self-Service
- Pulse Checks
- Anonymous Workforce Feedback
- Notifications
- Live Updates
- Leave Requests
- Salary Advance Requests
- Expense Requests
- HR Tickets

---

# 🏗️ System Architecture

Crew is designed as a multi-tenant, security-first, real-time platform.

## Frontend

- React 19
- Vite
- TypeScript
- Tailwind CSS
- React Query
- Zustand
- Socket.io Client
- Recharts
- React Force Graph

## Backend

- Node.js 22 LTS
- Express 5
- Prisma ORM
- PostgreSQL / Neon
- BullMQ
- Redis
- Socket.io
- Zod

## AI / ML

- Gemini API
- RAG Pipeline
- pgvector
- Embeddings
- FastAPI
- ONNX
- YOLOv8
- YuNet
- Face Detection / Liveness

## Storage & Infrastructure

- PostgreSQL
- Redis
- ImageKit
- Background Workers
- Multi-Tenant Isolation
- RBAC

---

# 🔐 Security, Privacy & AI Governance

Crew treats HR and recruitment data as sensitive enterprise information.

### Tenant Isolation

Tenant boundaries are enforced server-side.

### RBAC

Authorization is checked before sensitive HR data reaches an AI workflow.

### Recruitment Privacy

Resume data, ATS scores, embeddings, ranking evidence and recruitment intelligence are restricted to authorized recruiters.

### Protected Characteristics

Protected characteristics are not used as ATS ranking inputs, scoring features, filters or recommendation criteria.

### AI Decision Boundary

Crew's AI is a decision-support system.

It does not autonomously:

- Determine fraud
- Make final HR decisions
- Override deterministic scores
- Invent evidence
- Replace HR review

---

# 🔄 The Crew Intelligence Loop

Crew connects the employee lifecycle into one continuous intelligence loop:

```text
                     RECRUIT
                        │
                  ATS + Ranking
                        │
                        ▼
                    ONBOARD
                        │
                        ▼
                    OPERATE
                        │
       ┌────────────────┼────────────────┐
       │                │                │
   Attendance          Leave           Payroll
       │                │                │
       └────────────────┼────────────────┘
                        ▼
                 DETECT SIGNALS
                        │
          ┌─────────────┼─────────────┐
          ▼             ▼             ▼
        Fraud         Pattern        Pulse
          │             │             │
          └─────────────┼─────────────┘
                        ▼
                   RISK ENGINE
                        │
                        ▼
                  INTELLIGENCE
                        │
                        ▼
                     IRIS AI
                        │
                Evidence + Policy
                        │
                        ▼
                    HUMAN HR
                        │
                        ▼
                      ACTION
                        │
                        ▼
                  NEW WORKFORCE
                    SIGNALS
```

---

# 🆚 Crew vs Traditional HRMS

| Capability | Traditional HRMS | Crew |
|---|:---:|:---:|
| Employee Management | ✅ | ✅ |
| Attendance | ✅ | ✅ |
| Payroll | ✅ | ✅ |
| Recruitment | ✅ | ✅ |
| Multi-Tenant Architecture | Varies | ✅ |
| Multi-Entity Organization | Varies | ✅ |
| Multi-Office Management | Varies | ✅ |
| Real-Time Workforce Signals | Limited | ✅ |
| Spatial Attendance Trust | Limited | ✅ |
| Facial Liveness | Limited | ✅ |
| Proxy Attendance Intelligence | Limited | ✅ |
| Personal-Baseline Pattern Detection | Limited | ✅ |
| Workforce Risk Engine | Limited | ✅ |
| Evidence-Backed AI Investigation | Limited | ✅ |
| Policy-Grounded RAG | Varies | ✅ |
| Deterministic ATS | Varies | ✅ |
| Candidate Ranking | Varies | ✅ |
| Explainable Candidate Ranking | Limited | ✅ |
| Employee Pulse | Varies | ✅ |
| AI + Operational Data Integration | Limited | ✅ |
| Real-Time Organizational Pulse | Limited | ✅ |
| Cross-Signal Workforce Intelligence | Limited | ✅ |

> **Note:** Vendor capabilities vary by product edition, region, configuration and implementation. Crew's primary differentiation is the integration of these capabilities into one intelligence-oriented architecture.

---

# 🧬 Crew's Core Engineering Principle

Crew follows a strict separation between **facts, calculations, intelligence and decisions**.

```text
┌──────────────────────────────┐
│      AUTHORITATIVE DATA      │
│ PostgreSQL / HR Records      │
└──────────────┬───────────────┘
               ↓
┌──────────────────────────────┐
│     DETERMINISTIC ENGINES    │
│ Attendance / Fraud / Risk    │
│ ATS / Ranking / Patterns     │
└──────────────┬───────────────┘
               ↓
┌──────────────────────────────┐
│      EVIDENCE + POLICY       │
│     RAG / pgvector / DB      │
└──────────────┬───────────────┘
               ↓
┌──────────────────────────────┐
│          IRIS AI             │
│ Interpretation & Explanation │
└──────────────┬───────────────┘
               ↓
┌──────────────────────────────┐
│          HUMAN HR            │
│       Final Decision         │
└──────────────────────────────┘
```

### The rule:

> **Calculate deterministically.**
>
> **Retrieve securely.**
>
> **Explain with AI.**
>
> **Decide with humans.**

---

# 🚀 Roadmap

Crew is designed to evolve from an HRMS into a complete workforce intelligence platform.

### 🔵 Foundation

- Multi-Tenant Infrastructure
- HR Operations
- Attendance
- Leave
- Payroll
- RBAC
- Organization Management

### 🟣 Intelligence

- Fraud Detection
- Risk Engine
- Pattern Analysis
- Workforce Radar
- AI Investigations
- RAG HR Copilot

### 🟢 Talent Intelligence

- Recruitment
- ATS
- Semantic Matching
- Candidate Ranking
- Skill Intelligence
- Recruitment Copilot

### 🟠 Enterprise Expansion

- Advanced Compliance
- Native Mobile
- Offline Attendance
- Public APIs
- Webhooks
- Omnichannel Notifications
- Advanced Analytics

---

# 🌌 Vision

Most HR systems answer:

> **"What happened?"**

Crew is designed to help HR answer:

> **"What changed?"**

> **"Why does it matter?"**

> **"What evidence supports it?"**

> **"Which policy applies?"**

> **"Which candidates are the strongest fit?"**

> **"What should HR investigate?"**

And ultimately:

> **"What should we do next?"**

---

<div align="center">

# 🌌 CREW

### **From HR Management → Workforce Intelligence**

**Built with ❤️ by Team Kratos**

</div>
