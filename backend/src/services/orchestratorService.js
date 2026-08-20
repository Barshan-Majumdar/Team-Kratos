const prisma = require('../config/db');
const shiftEngineService = require('./shiftEngineService');
// Optional: If you plug in OpenAI here later, require it.

/**
 * The Decision Intelligence Orchestrator
 * This is Iris's "Brain". It bridges the gap between high-level human goals
 * and deterministic mathematical engines.
 */
class OrchestratorService {
  /**
   * Translates a human HR Goal into a deterministic plan.
   * Currently maps to our deterministic roster simulation.
   */
  async formulatePlan(tenantId, adminId, goalString) {
    console.log(`[Orchestrator] Received Goal from Admin ${adminId}: "${goalString}"`);

    // In a real-world scenario with an LLM, Iris would parse the goalString
    // to figure out which engine to call. For now, we simulate this routing.
    
    // Iris determines this is a rostering optimization task:
    const startDate = new Date().toISOString().split('T')[0];
    const endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Delegate to the deterministic mathematical engine
    console.log(`[Orchestrator] Delegating to ShiftEngineService for simulation...`);
    const simulationResult = await shiftEngineService.simulateRoster(tenantId, startDate, endDate);

    // Save the orchestrated plan to the Data Layer for Human Approval
    const plan = await prisma.strategicActionPlan.create({
      data: {
        tenantId,
        goal: goalString,
        status: 'PROPOSED',
        plan: simulationResult.plan,
        metrics: simulationResult.metrics,
        createdBy: adminId
      }
    });

    console.log(`[Orchestrator] Plan ${plan.id} created and awaiting approval.`);
    return plan;
  }

  /**
   * Executes a proposed plan after human approval.
   */
  async executePlan(tenantId, adminId, planId) {
    const plan = await prisma.strategicActionPlan.findUnique({
      where: { id: planId }
    });

    if (!plan || plan.tenantId !== tenantId) {
      throw new Error('Plan not found');
    }

    if (plan.status !== 'PROPOSED') {
      throw new Error(`Cannot execute plan in status ${plan.status}`);
    }

    console.log(`[Orchestrator] Executing Action Plan: ${planId}`);
    
    // 1. Mark as executing to prevent double-execution
    await prisma.strategicActionPlan.update({
      where: { id: planId },
      data: { status: 'EXECUTING', approvedBy: adminId }
    });

    try {
      // 2. Delegate execution back to the specific engine
      // Here, we adapt the plan payload so applyRoster can use it
      const tempSimulationId = await prisma.rosterSimulation.create({
        data: {
          tenantId,
          plan: plan.plan,
          metrics: plan.metrics,
          currentFingerprint: await shiftEngineService.generateFingerprint(), // Fast override for orchestrator
          expiresAt: new Date(Date.now() + 5 * 60000),
          createdBy: adminId
        }
      });

      const executeResult = await shiftEngineService.applyRoster(tenantId, adminId, tempSimulationId.id);

      // 3. Mark success
      await prisma.strategicActionPlan.update({
        where: { id: planId },
        data: { 
          status: 'EXECUTED', 
          executedAt: new Date() 
        }
      });

      return executeResult;
    } catch (err) {
      // 4. Mark failed
      await prisma.strategicActionPlan.update({
        where: { id: planId },
        data: { status: 'FAILED' }
      });
      throw err;
    }
  }

  /**
   * Get all active proposed plans for the dashboard
   */
  async getProposedPlans(tenantId) {
    return await prisma.strategicActionPlan.findMany({
      where: { tenantId, status: 'PROPOSED' },
      orderBy: { createdAt: 'desc' }
    });
  }
}

module.exports = new OrchestratorService();
