/**
 * chatOrchestrator.js — Context-First Orchestrator
 *
 * Architecture:
 *   1. Deterministic local routing (0 API calls)
 *   2. Server-side authorization check (REFUSE before Gemini)
 *   3. Pre-fetch: RAG (embedding + pgvector) and/or DB data in parallel
 *   4. Single Gemini synthesis call with only relevant tools injected
 *   5. Structured JSON telemetry logged per request
 */

const prisma = require('../config/db');
const geminiClient = require('./geminiClient');
const { classifyQuery } = require('./queryRouter');
const { executeTool, TOOL_HANDLERS, SENSITIVE_TOOLS } = require('./chatbotToolHandlers');
const { getToolsByDomain, ALL_TOOLS, getToolsByOperation } = require('./chatbotTools');
const SYSTEM_PROMPT = require('./chatbotSystemPrompt');
const { estimateTokens } = require('./embeddings');
const { searchHRDocuments, buildRetrievedContext } = require('./vectorSearch');
const { runInvestigation } = require('./investigationService');

const MAX_HISTORY_TOKENS = parseInt(process.env.AI_MAX_HISTORY_TOKENS) || 3000;
const MAX_TOOL_CALLS     = parseInt(process.env.AI_MAX_TOOL_CALLS)     || 3;  // reduced — pre-fetch eliminates most

// ─────────────────────────────────────────────
// DOMAIN → SERVER-SIDE EXECUTOR MAP
// Maps a high-confidence operation directly to a handler without Gemini tool call
// ─────────────────────────────────────────────
const getISTDateString = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

const DETERMINISTIC_EXECUTORS = {
  ABSENTEES_TODAY:       (ctx) => TOOL_HANDLERS.getAttendanceSummary({ startDate: getISTDateString(), endDate: getISTDateString() }, ctx),
  ON_LEAVE_TODAY:        (ctx) => TOOL_HANDLERS.getEmployeesOnLeaveToday({}, ctx),
  PENDING_APPROVALS:     (ctx) => TOOL_HANDLERS.getPendingApprovals({}, ctx),
  EMPLOYEE_COUNT:        (ctx) => TOOL_HANDLERS.searchEmployees({ status: 'Active' }, ctx),
  LEAVE_POLICY:          (ctx) => TOOL_HANDLERS.getLeavePolicies({}, ctx),
};

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
async function loadBoundedHistory(sessionId) {
  const messages = await prisma.basePrisma.chatMessage.findMany({
    where: { sessionId },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  let budget = MAX_HISTORY_TOKENS;
  const included = [];
  for (const msg of messages) {
    const cost = msg.tokenCount ?? estimateTokens(msg.content || '');
    if (budget - cost < 0) break;
    budget -= cost;
    included.unshift(msg);
  }

  const expandedHistory = [];
  
  for (const m of included) {
    if (m.role === 'model' && m.toolCalls && m.toolResults) {
      // 1. The function call
      const tcs = typeof m.toolCalls === 'string' ? JSON.parse(m.toolCalls) : m.toolCalls;
      expandedHistory.push({
        role: 'model',
        parts: tcs.map(tc => ({ functionCall: { name: tc.name, args: tc.args } }))
      });
      // 2. The function response
      const trs = typeof m.toolResults === 'string' ? JSON.parse(m.toolResults) : m.toolResults;
      expandedHistory.push({
        role: 'user',
        parts: trs.map(tr => ({ functionResponse: { name: tr.name, response: tr.response } }))
      });
      // 3. The final text response
      if (m.content) {
        expandedHistory.push({
          role: 'model',
          parts: [{ text: m.content }]
        });
      }
    } else {
      expandedHistory.push({
        role: m.role === 'model' ? 'model' : 'user',
        parts: [{ text: m.content || '' }]
      });
    }
  }

  return expandedHistory;
}

function isAuthorized(classification, ctx) {
  // Payroll/sensitive data requires roleLevel 0 or 1
  if (classification.domain === 'PAYROLL' && ctx.roleLevel > 1) {
    return { ok: false, reason: 'You do not have permission to access payroll data.' };
  }
  if (classification.operation === 'ATTRITION_RISK' && ctx.roleLevel > 1) {
    return { ok: false, reason: 'You do not have permission to access attrition risk data.' };
  }
  return { ok: true };
}

// ─────────────────────────────────────────────
// MAIN ORCHESTRATOR
// ─────────────────────────────────────────────
async function runChat(ctx, sessionId, prompt, io, socket, context = null) {
  const telemetry = {
    route: null,
    embeddingCalls: 0,
    llmCalls: 0,
    toolCalls: 0,
    totalExternalAICalls: 0,
    retrievalChunks: 0,
    confidence: 0,
    latencyMs: 0,
  };
  const t0 = Date.now();

  // --- 1. INVESTIGATION PIPELINE INTERCEPT (Phase 4) ---
  if (context && context.alertId) {
    telemetry.route = 'INVESTIGATION';
    const forceRegenerate = prompt.toLowerCase().includes('regenerate');
    if (io && socket) socket.emit('chatbot:chunk', { text: "Starting deep investigation pipeline...\n" });
    
    try {
      const report = await runInvestigation(context.alertId, ctx.tenantId, forceRegenerate);
      
      if (!report) {
        throw new Error('Investigation failed to generate or lock the report record.');
      }
      
      const json = report.resultJSON;
      let md = `### 🚨 Investigation Report: ${context.alertType}\n\n`;
      md += `**Status:** ${report.generationStatus}\n\n`;
      
      if (json) {
        md += `#### What Happened\n${json.whatHappened}\n\n`;
        
        md += `#### Evidence\n`;
        json.evidence?.forEach(e => {
          const source = e.sourceType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
          md += `- **${source}:** ${e.statement} (${new Date(e.timestamp).toLocaleString()})\n`;
        });
        md += `\n`;
        
        md += `#### Policy Findings\n`;
        json.policyFindings?.forEach(p => {
          md += `- **${p.policy} (Sec ${p.section}):** ${p.finding} _(Confidence: ${p.confidence})_\n`;
        });
        md += `\n`;
        
        md += `#### Assessment (Confidence: ${json.assessmentConfidence})\n${json.assessment}\n\n`;
        
        md += `#### Limitations\n`;
        json.limitations?.forEach(l => md += `- ${l}\n`);
        md += `\n`;
        
        md += `#### Recommendation\n**${json.recommendedNextStep}**\n\n`;
        if (json.humanReviewRequired) {
          md += `_⚠️ Human Review Required_\n`;
        }
      }
      
      telemetry.latencyMs = Date.now() - t0;
      console.info('[Chatbot Telemetry]', JSON.stringify(telemetry));
      if (io && socket) socket.emit('chatbot:chunk', { text: "\n" + md });
      return { role: 'model', content: md };
    } catch (e) {
      console.error(e);
      return { role: 'model', content: "Investigation failed. Please check the logs." };
    }
  }

  // ── 2. Get recent context for follow-up classification ─────────────
  const recentMsgs = await prisma.basePrisma.chatMessage.findMany({
    where: { sessionId, role: 'user' },
    orderBy: { createdAt: 'desc' },
    take: 3,
  });
  const recentContext = recentMsgs.map(m => m.content).reverse().join('\n');

  // ── 2. Deterministic classification (0 API calls) ──────────────────
  const classification = classifyQuery(prompt, recentContext);
  telemetry.route      = classification.route;
  telemetry.confidence = classification.confidence;

  // ── 3. Authorization check (REFUSE before touching Gemini) ─────────
  const authCheck = isAuthorized(classification, ctx);
  if (!authCheck.ok) {
    await prisma.basePrisma.auditLog.create({
      data: {
        tenantId: ctx.tenantId,
        actorId:  ctx.userId,
        action:   'AI_QUERY_REFUSED',
        targetId:  sessionId,
        details:  { prompt, reason: authCheck.reason, domain: classification.domain }
      }
    }).catch(() => {}); // non-blocking
    io.to(`tenant:${ctx.tenantId}:user:${ctx.userId}`).emit('chatbot:response', { text: authCheck.reason, sessionId });
    return { role: 'model', content: authCheck.reason };
  }

  // ── 4a. CLARIFICATION — only for truly empty/meaningless input ────
  // Do NOT clarify for low classifier confidence — just send to Gemini.
  // The classifier is an optimization layer, not a gatekeeper.
  const isMeaningless = prompt.trim().length < 3 || /^[?!.]+$/.test(prompt.trim());
  if (classification.route === 'CLARIFICATION' && isMeaningless) {
    const clarText = "Could you share a bit more detail about what you're looking for? For example: attendance, leave, payroll, or HR policies.";
    io.to(`tenant:${ctx.tenantId}:user:${ctx.userId}`).emit('chatbot:response', { text: clarText, sessionId });
    return { role: 'model', content: clarText };
  }

  // ── 4b. CONVERSATIONAL — single Gemini call, no tools ──────────────
  if (classification.route === 'CONVERSATIONAL') {
    const nowIST = new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
    const history = await loadBoundedHistory(sessionId);
    const chat = geminiClient.getAI().chats.create({
      model: process.env.GEMINI_MODEL,
      config: { systemInstruction: SYSTEM_PROMPT },
      history,
    });
    telemetry.llmCalls++;
    const response = await chat.sendMessage({ message: `[Current IST Date/Time: ${nowIST}]\n\n${prompt}` });
    const text = response.text || '';
    io.to(`tenant:${ctx.tenantId}:user:${ctx.userId}`).emit('chatbot:response', { text, sessionId });
    telemetry.totalExternalAICalls = telemetry.llmCalls;
    telemetry.latencyMs = Date.now() - t0;
    console.info('[Chatbot Telemetry]', JSON.stringify(telemetry));
    return { role: 'model', content: text };
  }

  // ── 5. Pre-fetching phase (parallel where possible) ────────────────
  let ragContext   = null;
  let dbPreFetch   = null;  // server-side executed result (no Gemini tool call)
  let narrowTools  = [];    // tools to expose to Gemini only if needed

  const prefetchWork = [];

  // RAG pre-fetch
  if (classification.requiresRAG) {
    prefetchWork.push(
      (async () => {
        telemetry.embeddingCalls++;
        const chunks = await searchHRDocuments(prompt, ctx.tenantId, null, ctx.roleLevel);
        telemetry.retrievalChunks = chunks.length;
        if (chunks.length > 0) ragContext = buildRetrievedContext(chunks);
      })()
    );
  }

  // Server-side DB pre-fetch for deterministic operations
  if (classification.requiresDatabase && classification.operation && DETERMINISTIC_EXECUTORS[classification.operation]) {
    prefetchWork.push(
      (async () => {
        try {
          dbPreFetch = await DETERMINISTIC_EXECUTORS[classification.operation](ctx);
        } catch (e) {
          console.warn('[Chatbot] Server-side pre-fetch failed, will use Gemini tools:', e.message);
        }
      })()
    );
  }

  await Promise.all(prefetchWork);

  // Tool selection:
  // High confidence + known domain → narrow to minimum required tools (saves tokens)
  // Low confidence OR unknown domain → give Gemini ALL tools so it can reason freely
  if (classification.requiresDatabase && !dbPreFetch) {
    const domainTools = getToolsByDomain(classification.domain);
    narrowTools = (domainTools.length > 0 && classification.confidence >= 0.70)
      ? domainTools        // confident about domain — use narrow set
      : ALL_TOOLS;         // unsure — let Gemini decide with full tool access
  }

  // ── 6. Build Mega-Prompt ───────────────────────────────────────────
  const nowIST = new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
  const [tenant, currentUser] = await Promise.all([
    prisma.basePrisma.tenant.findUnique({
      where:  { id: ctx.tenantId },
      select: { name: true },
    }),
    prisma.basePrisma.user.findUnique({
      where:  { id: ctx.userId },
      select: { employeeId: true, displayName: true, department: true, jobPosition: true, status: true, roleDefinition: { select: { name: true } } },
    })
  ]);
  const companyName = tenant?.name || 'your company';

  let megaPrompt = `[Current IST Date/Time: ${nowIST}]\n[Company: ${companyName}]\n`;

  if (currentUser) {
    // Only expose non-sensitive profile fields — never internal UUIDs, email, or credentials
    megaPrompt += `[Logged-in User: ${currentUser.displayName} | Employee ID: ${currentUser.employeeId || 'Not assigned'} | Department: ${currentUser.department || 'N/A'} | Role: ${currentUser.roleDefinition?.name || 'N/A'} | Position: ${currentUser.jobPosition || 'N/A'}]\n`;
  }

  megaPrompt += '\n';


  if (dbPreFetch) {
    megaPrompt += `[Pre-fetched Data]\n${JSON.stringify(dbPreFetch, null, 2)}\n\n`;
  }

  if (ragContext) {
    megaPrompt += `[Retrieved Policy Context]\n${ragContext}\n\n`;
  }

  if (context) {
    megaPrompt += `[SYSTEM: INVISIBLE INVESTIGATION CONTEXT INJECTED]\n${JSON.stringify(context, null, 2)}\n\n`;
  }

  megaPrompt += `User question: ${prompt}`;

  // ── 7. Single Gemini synthesis call ───────────────────────────────
  const history = await loadBoundedHistory(sessionId);
  const chatConfig = {
    model: process.env.GEMINI_MODEL,
    config: { systemInstruction: SYSTEM_PROMPT },
    history,
  };
  if (narrowTools.length > 0) {
    chatConfig.config.tools = [{ functionDeclarations: narrowTools }];
  }

  const chat  = geminiClient.getAI().chats.create(chatConfig);
  // ── 8. Tool loop (capped, only if narrow tools were provided) ──────
  let finalToolCalls   = [];
  let finalToolResults = [];
  let rounds = 0;
  let responseText = "";

  const processResponse = async (messagePayload) => {
    let resultText = "";
    let functionCalls = null;
    const stream = await chat.sendMessageStream({ message: messagePayload });
    for await (const chunk of stream) {
      // Safely extract text to avoid the SDK warning about non-text parts
      let chunkText = "";
      if (chunk.candidates && chunk.candidates[0]?.content?.parts) {
        chunkText = chunk.candidates[0].content.parts
          .filter(p => typeof p.text === 'string')
          .map(p => p.text)
          .join('');
      }

      if (chunkText) {
        resultText += chunkText;
        if (socket) socket.emit('chatbot:chunk', { text: chunkText });
      }
      if (chunk.functionCalls) {
        if (!functionCalls) functionCalls = [];
        functionCalls.push(...chunk.functionCalls);
      }
    }
    return { text: resultText, functionCalls };
  };

  telemetry.llmCalls++;
  let response = await processResponse(megaPrompt);

  while (response.functionCalls && rounds < MAX_TOOL_CALLS) {
    const fCalls    = response.functionCalls;
    const fResponses = [];

    for (const call of fCalls) {
      finalToolCalls.push({ name: call.name, args: call.args });
      telemetry.toolCalls++;

      if (SENSITIVE_TOOLS.has(call.name) && ctx.roleLevel > 1) {
        fResponses.push({ functionResponse: { id: call.id, name: call.name, response: { error: 'Unauthorized' } } });
        continue;
      }
      const res = await executeTool(call, ctx);
      finalToolResults.push(res);
      fResponses.push({ functionResponse: { id: call.id, name: call.name, response: res.response } });
    }

    rounds++;
    telemetry.llmCalls++;
    response = await processResponse(fResponses);
  }

  if (rounds >= MAX_TOOL_CALLS) {
    console.warn(`[Chatbot] Max tool calls reached for session ${sessionId}`);
  }

  responseText = response.text || '';

  // ── 9. Emit + Telemetry ────────────────────────────────────────────
  if (io && !socket) {
    io.to(`tenant:${ctx.tenantId}:user:${ctx.userId}`).emit('chatbot:response', { text: responseText, sessionId });
  }

  telemetry.totalExternalAICalls = telemetry.embeddingCalls + telemetry.llmCalls;
  telemetry.latencyMs = Date.now() - t0;
  console.info('[Chatbot Telemetry]', JSON.stringify(telemetry));

  return {
    role:        'model',
    content:     responseText,
    toolCalls:   finalToolCalls.length   ? finalToolCalls   : null,
    toolResults: finalToolResults.length ? finalToolResults : null,
  };
}

module.exports = { runChat, loadBoundedHistory };
