/**
 * queryRouter.js — Deterministic Local Classifier (Zero API Calls)
 *
 * Router Output Contract:
 * {
 *   route: 'POLICY' | 'LIVE_DATA' | 'HYBRID' | 'CONVERSATIONAL' | 'CLARIFICATION',
 *   domain: string | null,      // e.g. 'ATTENDANCE', 'PAYROLL', 'LEAVE', 'EMPLOYEE', 'POLICY'
 *   operation: string | null,   // e.g. 'ABSENTEES_TODAY', 'POLICY_SEARCH', 'PAYROLL_SUMMARY'
 *   confidence: number,         // 0.0 – 1.0
 *   requiresRAG: boolean,
 *   requiresDatabase: boolean
 * }
 *
 * Confidence Thresholds:
 *   >= 0.85  → execute optimized server-side route
 *   0.60–0.85 → minimum required tool to Gemini (if domain known) OR clarification (if domain unclear)
 *   < 0.60   → clarification by default
 *
 * REFUSE is NOT produced here. Authorization is the backend's responsibility.
 * Follow-up questions inherit context from prior conversation and are re-classified.
 */

// ─────────────────────────────────────────────
// 1. KEYWORD DICTIONARIES
// ─────────────────────────────────────────────
const DOMAIN_SIGNALS = {
  ATTENDANCE: [
    'absent', 'absentee', 'attendance', 'present', 'checked in', 'late', 'punctual',
    'on time', 'arrival', 'departure', 'check-in', 'check in', 'mark attendance',
    'who came', 'who came in', 'who worked', 'not present', 'missed'
  ],
  LEAVE: [
    'leave', 'day off', 'time off', 'vacation', 'sick', 'sick leave', 'casual leave',
    'annual leave', 'maternity', 'paternity', 'holiday', 'approved leave', 'pending leave',
    'leave request', 'leave balance', 'leave taken', 'on leave', 'absent on leave'
  ],
  PAYROLL: [
    'payroll', 'salary', 'pay', 'payout', 'net pay', 'gross pay', 'deduction',
    'compensation', 'remuneration', 'ctc', 'cost to company', 'payslip', 'pay slip',
    'paid', 'total pay', 'wage', 'increment'
  ],
  EMPLOYEE: [
    'employee', 'staff', 'member', 'team member', 'headcount', 'total employees',
    'how many employees', 'who is', 'who are', 'profile of', 'details of',
    'list of employees', 'departments', 'designation', 'active employees', 'inactive',
    'employee id', 'my id', 'staff id', 'emp id', 'worker id', 'my profile',
    'my details', 'my department', 'my designation', 'my role', 'my position'
  ],
  POLICY: [
    'policy', 'policies', 'handbook', 'rule', 'rules', 'procedure', 'guideline',
    'benefit', 'benefits', 'wfh', 'work from home', 'remote work', 'maternity policy',
    'paternity policy', 'code of conduct', 'dress code', 'working hours', 'overtime policy',
    'resignation', 'termination', 'probation', 'notice period', 'nda', 'compliance'
  ],
  ANALYTICS: [
    'trend', 'pattern', 'why', 'reason', 'compare', 'comparison', 'increase', 'decrease',
    'most', 'least', 'top', 'bottom', 'analyse', 'analyze', 'analysis', 'insight',
    'anomaly', 'suspicious', 'flag', 'risk', 'attrition'
  ],
  APPROVALS: [
    'pending', 'approval', 'approvals', 'pending approval', 'waiting for approval',
    'pending leaves', 'pending expense', 'pending advance'
  ]
};

// ─────────────────────────────────────────────
// 2. OPERATION PATTERNS (exact/near-exact phrases → operation name)
// ─────────────────────────────────────────────
const OPERATION_PATTERNS = [
  // Attendance operations
  { pattern: /\b(absent|absentee).*(today|now)\b/, domain: 'ATTENDANCE', operation: 'ABSENTEES_TODAY', route: 'LIVE_DATA', boost: 0.30 },
  { pattern: /\b(absent|absentee).*(yesterday)\b/, domain: 'ATTENDANCE', operation: 'ATTENDANCE_SUMMARY', route: 'LIVE_DATA', boost: 0.30 },
  { pattern: /\b(was|were|is).*(absent|present|attend).*(yesterday|last|\d{4}-\d{2}-\d{2})\b/, domain: 'ATTENDANCE', operation: 'ATTENDANCE_SUMMARY', route: 'LIVE_DATA', boost: 0.30 },
  { pattern: /\b(present|attendance).*(today|now)\b/, domain: 'ATTENDANCE', operation: 'PRESENT_TODAY', route: 'LIVE_DATA', boost: 0.30 },
  { pattern: /\b(attend(ance)?).*(summary|overview|report)\b/, domain: 'ATTENDANCE', operation: 'ATTENDANCE_SUMMARY', route: 'LIVE_DATA', boost: 0.20 },
  { pattern: /\b(violat|breach|break|miss).*(attend|policy)\b/, domain: 'ATTENDANCE', operation: 'POLICY_VIOLATIONS', route: 'HYBRID', boost: 0.25 },

  // Leave operations
  { pattern: /\b(on leave|on vacation).*(today|now|currently)\b/, domain: 'LEAVE', operation: 'ON_LEAVE_TODAY', route: 'LIVE_DATA', boost: 0.30 },
  { pattern: /\b(pending|waiting|unapproved).*(leave|day off)\b/, domain: 'LEAVE', operation: 'PENDING_LEAVE_REQUESTS', route: 'LIVE_DATA', boost: 0.25 },
  { pattern: /\b(leave).*(balance|remaining|left)\b/, domain: 'LEAVE', operation: 'LEAVE_BALANCE', route: 'LIVE_DATA', boost: 0.20 },
  { pattern: /\b(leave|holiday).*(policy|rule|entitlement|quota|days|allowance)\b/, domain: 'LEAVE', operation: 'LEAVE_POLICY', route: 'LIVE_DATA', boost: 0.35 },
  { pattern: /\b(what|how many|tell me).*(leave|vacation|day off).*(get|have|entitled|quota|allowed|days)\b/, domain: 'LEAVE', operation: 'LEAVE_POLICY', route: 'LIVE_DATA', boost: 0.35 },
  { pattern: /\b(our|the|company).*(leave policy|leave rules|leave types)\b/, domain: 'LEAVE', operation: 'LEAVE_POLICY', route: 'LIVE_DATA', boost: 0.40 },

  // Payroll operations
  { pattern: /\b(payroll|salary|pay).*(summary|overview|month)\b/, domain: 'PAYROLL', operation: 'PAYROLL_SUMMARY', route: 'LIVE_DATA', boost: 0.25 },
  { pattern: /\b(total|net).*(pay(out)?|salary|wage)\b/, domain: 'PAYROLL', operation: 'PAYROLL_SUMMARY', route: 'LIVE_DATA', boost: 0.20 },

  // Employee operations
  { pattern: /\b(how many|total|count).*(employee|staff|member)\b/, domain: 'EMPLOYEE', operation: 'EMPLOYEE_COUNT', route: 'LIVE_DATA', boost: 0.30 },
  { pattern: /\b(list|show|find|search).*(employee|staff).*(department|team)?\b/, domain: 'EMPLOYEE', operation: 'EMPLOYEE_SEARCH', route: 'LIVE_DATA', boost: 0.20 },
  { pattern: /\b(profile|details|info(rmation)?).*(of|for|about)\b/, domain: 'EMPLOYEE', operation: 'EMPLOYEE_PROFILE', route: 'LIVE_DATA', boost: 0.20 },
  { pattern: /\b(my|mine).*(id|emp(loyee)?[-\s]?id|staff[-\s]?id|profile|details|department|role|designation)\b/, domain: 'EMPLOYEE', operation: 'EMPLOYEE_PROFILE', route: 'LIVE_DATA', boost: 0.35 },
  { pattern: /\b(employee|emp|staff).*(id|number|code)\b/, domain: 'EMPLOYEE', operation: 'EMPLOYEE_PROFILE', route: 'LIVE_DATA', boost: 0.30 },
  { pattern: /\b(what|tell|give|show).*(my).*(id|profile|details|department|role|position)\b/, domain: 'EMPLOYEE', operation: 'EMPLOYEE_PROFILE', route: 'LIVE_DATA', boost: 0.35 },

  // Policy-only operations
  { pattern: /\b(what|explain|tell me).*(policy|rule|procedure|guideline)\b/, domain: 'POLICY', operation: 'POLICY_SEARCH', route: 'POLICY', boost: 0.30 },
  { pattern: /\b(wfh|work from home|remote work)\b/, domain: 'POLICY', operation: 'POLICY_SEARCH', route: 'POLICY', boost: 0.30 },
  { pattern: /\b(maternity|paternity|parental).*(leave|policy|benefit)\b/, domain: 'POLICY', operation: 'POLICY_SEARCH', route: 'HYBRID', boost: 0.25 },

  // Analytics / Hybrid
  { pattern: /\b(trend|compare|why|reason|pattern|analy[sz]e)\b/, domain: 'ANALYTICS', operation: 'ANALYTICS', route: 'HYBRID', boost: 0.20 },
  { pattern: /\b(attrition|risk|flagged|suspicious)\b/, domain: 'ANALYTICS', operation: 'ATTRITION_RISK', route: 'LIVE_DATA', boost: 0.20 },

  // Approvals
  { pattern: /\b(pending|approval(s)?)\b/, domain: 'APPROVALS', operation: 'PENDING_APPROVALS', route: 'LIVE_DATA', boost: 0.20 }
];

// ─────────────────────────────────────────────
// 3. TEMPORAL / ENTITY DETECTORS
// ─────────────────────────────────────────────
function detectTimeRef(text) {
  if (/\btoday\b|\bright now\b|\bcurrently\b|\bnow\b/.test(text)) return 'TODAY';
  if (/\byesterday\b/.test(text)) return 'YESTERDAY';
  if (/\bthis week\b|\bcurrent week\b/.test(text)) return 'THIS_WEEK';
  if (/\blast week\b/.test(text)) return 'LAST_WEEK';
  if (/\bthis month\b|\bcurrent month\b/.test(text)) return 'THIS_MONTH';
  if (/\blast month\b/.test(text)) return 'LAST_MONTH';
  if (/\bthis year\b|\bcurrent year\b/.test(text)) return 'THIS_YEAR';
  if (/\b\d{4}-\d{2}-\d{2}\b|\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/.test(text)) return 'SPECIFIC_DATE';
  if (/\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/i.test(text)) return 'SPECIFIC_MONTH';
  return null;
}

function detectDepartment(text) {
  const dept = text.match(/\b(engineering|hr|human resources?|finance|sales|marketing|operations|design|product|support|legal|it|tech)\b/i);
  return dept ? dept[1] : null;
}

// ─────────────────────────────────────────────
// 4. CONVERSATIONAL FAST-PATH
// ─────────────────────────────────────────────
const CONVERSATIONAL_EXACT = new Set([
  'hi', 'hello', 'hey', 'hiya', 'howdy', 'thanks', 'thank you', 'thank you so much',
  'ok', 'okay', 'got it', 'alright', 'sure', 'great', 'good morning', 'good afternoon',
  'good evening', 'bye', 'goodbye', 'see you', 'nice', 'cool', 'awesome', 'perfect',
  'that helps', 'makes sense', 'understood', 'noted'
]);

const CONVERSATIONAL_PATTERNS = [
  /^(hi|hey|hello|thanks?|ok|okay|alright|sure|great|bye)[.!?]?\s*$/i,
  /^(good (morning|afternoon|evening))[.!?]?\s*$/i,
  /^(thank you|thanks a lot|thank you so much)[.!?]?\s*$/i,
];

const FOLLOWUP_PATTERNS = [
  // Short vague continuations only — NOT full questions like "can you tell me who was absent?"
  /^(what about|how about|and (what|last)|also|tell me more|elaborate on that|same for)\s.{0,30}$/i,
  /^(last (month|week|year)|previous (month|week|year)|compare|versus|vs\.?|difference between)\b/i,
];

// ─────────────────────────────────────────────
// 5. DOMAIN KEYWORD SCORING
// ─────────────────────────────────────────────
function scoreDomains(text) {
  const scores = {};
  for (const [domain, keywords] of Object.entries(DOMAIN_SIGNALS)) {
    scores[domain] = 0;
    for (const kw of keywords) {
      if (text.includes(kw)) {
        scores[domain] += 1;
      }
    }
  }
  return scores;
}

// ─────────────────────────────────────────────
// 6. MAIN CLASSIFIER
// ─────────────────────────────────────────────
function classifyQuery(prompt, conversationContext = '') {
  const raw = prompt.trim();
  const normalized = raw.toLowerCase();

  // ── Fast-path: CONVERSATIONAL ────────────────────────────────────
  if (CONVERSATIONAL_EXACT.has(normalized)) {
    return { route: 'CONVERSATIONAL', domain: null, operation: null, confidence: 1.0, requiresRAG: false, requiresDatabase: false };
  }
  for (const p of CONVERSATIONAL_PATTERNS) {
    if (p.test(raw)) {
      return { route: 'CONVERSATIONAL', domain: null, operation: null, confidence: 1.0, requiresRAG: false, requiresDatabase: false };
    }
  }

  // ── Follow-up: inherit context from prior conversation ────────────
  let inheritedDomain = null;
  if (conversationContext) {
    const ctxLower = conversationContext.toLowerCase();
    for (const domain of ['ATTENDANCE', 'LEAVE', 'PAYROLL', 'EMPLOYEE', 'POLICY', 'ANALYTICS', 'APPROVALS']) {
      const signals = DOMAIN_SIGNALS[domain] || [];
      if (signals.some(kw => ctxLower.includes(kw))) {
        inheritedDomain = domain;
        break;
      }
    }
  }

  const isFollowup = FOLLOWUP_PATTERNS.some(p => p.test(normalized));

  // ── Operation pattern matching ────────────────────────────────────
  let bestOperation = null;
  let bestDomain = null;
  let bestRoute = null;
  let patternBoost = 0;

  for (const { pattern, domain, operation, route, boost } of OPERATION_PATTERNS) {
    if (pattern.test(normalized)) {
      if (boost > patternBoost) {
        patternBoost = boost;
        bestOperation = operation;
        bestDomain = domain;
        bestRoute = route;
      }
    }
  }

  // ── Domain keyword scoring ────────────────────────────────────────
  const domainScores = scoreDomains(normalized);
  const sortedDomains = Object.entries(domainScores)
    .filter(([, v]) => v > 0)
    .sort(([, a], [, b]) => b - a);

  const topDomain = sortedDomains[0]?.[0] || null;
  const topScore = sortedDomains[0]?.[1] || 0;
  const secondScore = sortedDomains[1]?.[1] || 0;

  // Resolve final domain
  // If it's a follow-up but there's no inherited domain, fall back to current topDomain
  const resolvedDomain = bestDomain || (isFollowup && inheritedDomain ? inheritedDomain : topDomain);

  // ── Route resolution ──────────────────────────────────────────────
  let route = bestRoute;
  if (!route) {
    const domainConf = topScore > 0;
    const isPolicy = resolvedDomain === 'POLICY';
    const isAnalytics = resolvedDomain === 'ANALYTICS';
    const hasMultipleDomains = topScore > 0 && secondScore > 0 && topDomain !== resolvedDomain;

    if (isPolicy) route = 'POLICY';
    else if (isAnalytics) route = 'HYBRID';
    else if (hasMultipleDomains) route = 'HYBRID';
    else if (domainConf) route = 'LIVE_DATA';
    else route = 'CLARIFICATION';
  }

  // ── Confidence calculation ────────────────────────────────────────
  let confidence = 0.0;

  // Base score from operation pattern match
  confidence += patternBoost;

  // Domain signal strength
  if (topScore >= 3) confidence += 0.35;
  else if (topScore === 2) confidence += 0.25;
  else if (topScore === 1) confidence += 0.15;

  // Temporal reference boosts confidence for LIVE_DATA
  const timeRef = detectTimeRef(normalized);
  if (timeRef && (route === 'LIVE_DATA' || route === 'HYBRID')) confidence += 0.10;

  // Department detection boosts confidence
  if (detectDepartment(normalized)) confidence += 0.05;

  // If we matched an exact operation, clamp high
  if (bestOperation && patternBoost >= 0.25) confidence = Math.min(0.98, confidence + 0.15);

  // Followup with inherited domain still has lower confidence
  if (isFollowup && !bestOperation) confidence = Math.min(confidence, 0.72);

  // No domain signals → low confidence → clarification
  if (topScore === 0 && !bestOperation) {
    route = 'CLARIFICATION';
    confidence = 0.30;
  }

  confidence = Math.min(1.0, Math.max(0.0, confidence));

  // ── requiresRAG / requiresDatabase flags ──────────────────────────
  const requiresRAG = route === 'POLICY' || route === 'HYBRID';
  const requiresDatabase = route === 'LIVE_DATA' || route === 'HYBRID';

  const result = {
    route,
    domain: resolvedDomain,
    operation: bestOperation,
    confidence: parseFloat(confidence.toFixed(2)),
    requiresRAG,
    requiresDatabase
  };

  // ── Debug log ─────────────────────────────────────────────────────
  console.debug('[QueryRouter]', JSON.stringify(result));

  return result;
}

module.exports = { classifyQuery };
