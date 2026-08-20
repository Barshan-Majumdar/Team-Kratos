<div align="center">

# 🌌 CREW

### **AI-Native Workforce Intelligence Platform**

**HRMS • Payroll • Recruitment • Fraud Intelligence • Workforce Analytics • AI Investigation**

> **Crew doesn't just manage HR. Crew understands the workforce.**

### 🏆 Why Choose Crew?

> **Calculate deterministically. Retrieve securely. Explain with AI. Decide with humans.**

Crew is not simply an HRMS with a chatbot added on top. It connects **HR operations, deterministic intelligence, evidence-backed investigation, workforce cost intelligence, recruitment intelligence, and executive decision support** in one multi-tenant architecture.

| Leadership need | Crew's approach |
|---|---|
| Know what happened | Authoritative HR records |
| Detect what changed | Personal-baseline pattern analysis |
| Know what deserves attention | Risk Engine + Intelligence Signals + proactive broadcasting |
| Understand why a signal exists | Evidence-backed Investigation Engine |
| Connect HR domains | Attendance + Fraud + Payroll + Recruitment + Pulse + Cost Intelligence |
| Trust financial insights | FACT / ESTIMATE / PROJECTION / ASSUMPTION separation |
| Trust AI output | Deterministic engines remain the source of truth |
| Model decisions | Auditable Scenario / Projection Engine |
| Protect sensitive data | Multi-tenant isolation + RBAC |
| Keep humans in control | AI explains; HR decides |

**The result:** Crew is designed as a **workforce intelligence layer on top of the HR system of record**.

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

# 🔐 6. Strict Hierarchical RBAC

Crew completely eliminates privilege escalation vulnerabilities through a mathematically enforced Role-Based Access Control (RBAC) hierarchy.

- **Foundational Override (Level 0):** The Founder/CEO can edit their own salary and assign any role across the entire organization.
- **Strict Subordinate Controls (Level > 0):** HR Admins and Managers cannot edit their own salaries, nor can they edit the salary or role of any employee at their same level or above. An admin can only manage the compensation and permissions of strictly lower-level subordinates.

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

# 🧠 The Crew Intelligence Stack

Crew's intelligence capabilities connect into one operational loop:

```text
AUTHORITATIVE HR DATA
        │
        ├── Attendance ──┐
        ├── Payroll ─────┤
        ├── Recruitment ─┤
        ├── Leave ───────┤
        └── Pulse ───────┘
                │
                ▼
      DETERMINISTIC ENGINES
   Fraud • Pattern • Risk • ATS
   Ranking • Cost Intelligence
                │
                ▼
          RISK BROADCAST
                │
                ▼
            RISK RADAR
                │
                ▼
       INVESTIGATION ENGINE
                │
                ▼
             IRIS AI
                │
        ┌───────┴────────┐
        ▼                ▼
 EXECUTIVE BRIEF     SCENARIO ENGINE
        │                │
        └───────┬────────┘
                ▼
           HUMAN HR
```

### Already implemented intelligence capabilities

- **Candidate Ranking Engine** — deterministic scoring, eligibility, evidence coverage, tie-breaking and fingerprinted recalculation.
- **Pattern Analysis Engine** — isolated personal baselines, data-sufficiency gates, deterministic confidence and signal lifecycle management.
- **Risk Engine + Risk Broadcasting** — authoritative risk scoring and proactive HR alerts.
- **Risk Radar** — visual workforce intelligence with drill-down investigation.
- **Workforce Cost Intelligence** — factual payroll costs separated from estimated operational costs.
- **Cost Anomaly Investigation** — persisted reports, source snapshots, fingerprints and stale-data detection.
- **Evidence-backed Iris Investigation** — facts, correlations, hypotheses, evidence limitations and HR review.
- **Executive Workforce Brief** — leadership-ready synthesis of current workforce intelligence.
- **Scenario / Projection Engine** — deterministic what-if calculations with explicit assumptions.
- **Workforce Metric Layer** — standardized metrics, sources, timestamps, confidence and classifications.

### The key distinction

**Crew calculates first. AI interprets second.**

# 🧩 Complete Feature Set

## 🏢 Organization & HR

- Multi-Tenant Architecture
- Multi-Entity / Group Company Support
- Multi-Office Management
- Employee Profiles
- RBAC
- Manager Hierarchy
- Onboarding Workflows
- Leave Management (Double-Entry Ledger System)
- Shift Scheduling (Deterministic Rostering Engine)
- Employee Engagement (Engagement Hub)
- Automated Company Culture (Birthdays & Announcements)
- Benefits Administration
- HR Helpdesk
- Document Generation
- Digital Document Signing
- Bulk Data Import / Migration

---

## ⏱️ Attendance & Workforce Operations

- Geospatial Attendance
- Spatial Trust Engine
- Facial Liveness & Face Engine Integration
- Proxy / Buddy-Punching Detection
- Shift-Aware Attendance
- Shift Reconciliation Engine (Auto Clock-out & Absence Detection)
- Attendance Integrity Detection
- Overtime Intelligence
- Partial-Day / Short Leave Support
- Real-Time Organizational Pulse
- Immutable Attendance Audit Trail

---

## 💰 Payroll & Finance

### Workforce Cost Intelligence

Crew does not collapse financial facts and estimates into one opaque number.

- **FACT:** Directly observed payroll, overtime, bonus and benefits.
- **ESTIMATE:** Mathematical operational/productivity cost estimates.
- **PROJECTION:** Future outcome calculated by the Scenario Engine.
- **ASSUMPTION:** Explicit model parameter used by a scenario.

Estimates expose their assumptions, so leadership can distinguish **actual money** from **modeled operational impact**.

### Cost → Investigation

```text
Cost anomaly
     ↓
Deterministic metric snapshot
     ↓
Data fingerprint
     ↓
Investigation Report
     ↓
Attendance + Risk + Workforce context
     ↓
Iris AI explanation
     ↓
Human review
```

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

### Executive Workforce Brief

Leadership can generate a concise workforce brief from the existing intelligence stack instead of manually opening multiple dashboards.

The brief can synthesize:
- High-severity anomalies
- Workforce risk distribution
- Attendance / workforce trends
- Recruitment signals
- Cost intelligence
- Areas needing attention
- Positive workforce indicators
- Scenario context where available

### Scenario Interface

For a request such as:

> *"What if we hire 3 engineers?"*

Iris extracts validated parameters. The **Scenario Engine**, not Gemini, performs the mathematical calculation.

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

### Decision Intelligence Orchestrator (Iris's "Brain")
Iris doesn't just answer questions—she can formulate plans. The Orchestrator allows HR to submit high-level goals (e.g., "Fix my shift overlaps without increasing overtime"). Iris runs deterministic mathematical simulations in the background and returns a `StrategicActionPlan` containing the exact actions and projected metrics. The database strictly prevents execution until a human admin clicks "Approve".

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

# 🆚 Why Crew Over a Conventional HRMS?

The goal is not to claim that other vendors have no individual features. Mature HR platforms can be excellent at core HR operations.

Crew's differentiation is **how capabilities are connected, governed and turned into actionable intelligence**.

| Capability | Conventional HRMS | Crew |
|---|:---:|:---:|
| Core HR / Employee Management | ✅ | ✅ |
| Attendance & Leave | ✅ | ✅ |
| Payroll | ✅ | ✅ |
| Recruitment | ✅ | ✅ |
| Multi-Tenant Architecture | Varies | **Native** |
| Multi-Entity / Group Companies | Varies | **Native architecture** |
| Multi-Office Management | Varies | **Native** |
| Spatial Attendance Trust | Limited / varies | **Integrated** |
| Facial Liveness | Limited / varies | **Integrated** |
| Proxy Attendance Intelligence | Limited / varies | **Integrated** |
| Personal-Baseline Pattern Detection | Limited | **Core intelligence** |
| Deterministic Risk Engine | Limited | **Core engine** |
| Proactive Risk Broadcasting | Limited | **Integrated** |
| Risk Radar | Limited | **Integrated** |
| Evidence-Backed Investigation | Limited | **Core workflow** |
| Policy-Grounded RAG | Varies | **Integrated** |
| Deterministic ATS | Varies | **Core recruitment intelligence** |
| Explainable Candidate Ranking | Limited / varies | **Deterministic + evidence-backed** |
| Workforce Cost Intelligence | Limited / varies | **Integrated** |
| FACT / ESTIMATE separation | Rarely explicit | **First-class concept** |
| Cost → Investigation workflow | Limited | **Integrated** |
| Executive Workforce Brief | Limited | **Iris-powered** |
| Scenario / Projection Engine | Limited / varies | **Deterministic + auditable** |
| Cross-Signal Workforce Intelligence | Limited | **Core architecture** |
| Explicit AI Decision Boundary | Varies | **AI explains; HR decides** |

> **Important:** Vendor capabilities vary by edition, geography, configuration and implementation. This table describes Crew's architectural differentiation rather than claiming every competitor lacks every individual capability.

## 🥇 The Golden Reason to Choose Crew

> # **CREW CONNECTS THE DOTS.**
>
> A conventional HRMS can tell you **attendance**, **payroll**, **recruitment**, or **employee data**.
>
> Crew is designed to connect those signals:
>
> **Attendance → Pattern → Risk → Cost → Investigation → Policy → Scenario → Executive Decision**
>
> That connected intelligence loop is the central Crew advantage.

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

# 🎬 The 3-Minute Crew Story

For a hackathon demo, Crew can tell one coherent story rather than presenting disconnected features:

```text
1. Workforce anomaly appears
          ↓
2. Proactive alert reaches HR
          ↓
3. Risk Radar reveals the affected workforce
          ↓
4. HR opens the evidence
          ↓
5. Investigation Engine creates a reproducible snapshot
          ↓
6. Iris explains facts, correlations, limitations and next steps
          ↓
7. Cost Intelligence shows financial impact
          ↓
8. Scenario Engine models a possible intervention
          ↓
9. Executive Workforce Brief summarizes the situation
          ↓
10. HR makes the final decision
```

### What the judge should remember

> **Crew is not an HR chatbot.**
>
> **Crew is an evidence-driven workforce intelligence system with AI on top.**

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

# 💎 The Crew Moat

Crew's strongest differentiator is not one isolated feature. It is the **architecture connecting the features**.

- **Deterministic engines** produce measurable facts and scores.
- **Evidence structures** preserve why a result exists.
- **Fingerprints and snapshots** make investigations reproducible.
- **RAG** grounds AI in company policy and authorized information.
- **Strict AI boundaries** prevent Gemini from becoming an uncontrolled decision-maker.
- **Multi-tenant isolation and RBAC** protect enterprise data.
- **Human review** remains the final decision boundary.
- **FACT / ESTIMATE / PROJECTION / ASSUMPTION** labels make executive analytics auditable.
- **Cross-engine investigation** turns isolated anomalies into contextual intelligence.

The product advantage is therefore not simply **"more AI."**

It is **more trustworthy intelligence, connected across the workforce lifecycle.**

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

**Built by Team Kratos**

</div>
