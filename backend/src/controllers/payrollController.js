const prisma = require('../config/db');
const { dispatchWebhook } = require('../utils/webhookDispatcher');
const { sendNotification } = require('../utils/notificationEngine');

// Request a salary advance
const requestAdvance = async (req, res) => {
  try {
    const { amount, reason, monthDeduction } = req.body;
    const advance = await prisma.salaryAdvance.create({
      data: {
        userId: req.user.id,
        amount,
        reason,
        monthDeduction
      }
    });
    res.json(advance);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Admin approves/rejects advance
const updateAdvanceStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const advance = await prisma.salaryAdvance.update({
      where: { id },
      data: { status }
    });
    
    await prisma.auditLog.create({
      data: {
        actorId: req.user.id,
        action: `ADVANCE_${status.toUpperCase()}`,
        targetId: advance.userId,
        details: `Advance of ${advance.amount} for month ${advance.monthDeduction} was ${status.toLowerCase()}.`
      }
    });

    res.json(advance);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Admin gets all advances
const getAllAdvances = async (req, res) => {
  try {
    const advances = await prisma.salaryAdvance.findMany({
      include: { user: { select: { displayName: true, employeeId: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json(advances);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

      // Config endpoints and generateMonthlyPayroll updates
      const generateMonthlyPayroll = async (req, res) => {
        try {
          const { month } = req.params; // format: '2026-07'
          const { userId } = req.body || {};
          const [yearStr, monthStr] = month.split('-');
          const year = parseInt(yearStr);
          const monthIndex = parseInt(monthStr) - 1; // 0-based
      
          const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
          
          // Get config
          let config = await prisma.payrollConfig.findFirst({ where: { tenantId: req.user.tenantId } });
          if (!config) {
            return res.status(400).json({ error: 'Payroll configuration is missing. Please configure it in Org Settings first.' });
          }
          
          const userQuery = { status: 'Active', tenantId: req.user.tenantId };
          if (userId) userQuery.id = userId;

          const users = await prisma.user.findMany({
            where: userQuery,
            include: {
              advances: {
                where: { monthDeduction: month, status: 'Approved' }
              },
              attendances: {
                where: {
                  date: {
                    gte: new Date(year, monthIndex, 1),
                    lt: new Date(year, monthIndex + 1, 1)
                  }
                }
              },
              leaves: {
                where: {
                  status: 'Approved',
                  type: 'Unpaid',
                  startDate: { lt: new Date(year, monthIndex + 1, 1) },
                  endDate: { gte: new Date(year, monthIndex, 1) }
                }
              },
              payrolls: {
                where: { month }
              }
            }
          });
      
          if (users.length === 0) {
            return res.json({ message: 'No eligible employees found for payroll generation.', succeeded: [], failed: [] });
          }
          
          const succeeded = [];
          const failed = [];
          const { calculatePayroll } = require('../utils/payrollCalculator');
          
          const complianceRules = await prisma.complianceRule.findMany({ where: { tenantId: req.user.tenantId } });
      
          for (const user of users) {
            try {
              if (user.baseSalary === null || user.baseSalary === undefined) {
                failed.push({ id: user.id, name: user.displayName, reason: 'Base salary is not set' });
                continue;
              }
              
              const existingPayroll = user.payrolls[0];
              if (existingPayroll && existingPayroll.locked) {
                failed.push({ id: user.id, name: user.displayName, reason: 'Payslip is locked' });
                continue;
              }
      
              let absentDays = 0;
              for (const att of user.attendances) {
                if (att.status === 'Absent') absentDays++;
                else if (att.status === 'HalfDay') absentDays += 0.5;
              }
              
              let unpaidLeaveDays = 0;
              for (const leave of user.leaves) {
                const monthStart = new Date(year, monthIndex, 1);
                const monthEnd = new Date(year, monthIndex + 1, 0); 
                
                const start = new Date(leave.startDate) < monthStart ? monthStart : new Date(leave.startDate);
                const end = new Date(leave.endDate) > monthEnd ? monthEnd : new Date(leave.endDate);
                
                if (start <= end) {
                  const diffTime = Math.abs(end - start);
                  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                  unpaidLeaveDays += diffDays;
                }
              }
              
              const payableDays = Math.max(0, daysInMonth - absentDays - unpaidLeaveDays);
              const monthWage = user.baseSalary; // Base salary is already monthly
              
              let advanceDeduction = 0;
              user.advances.forEach(adv => advanceDeduction += adv.amount);
              
              let dynamicConfig = { ...config };
              
              // Apply compliance rules (mocking state check by simply applying them if they exist)
              complianceRules.forEach(rule => {
                if (rule.ruleType === 'PF' && rule.rateTable) {
                  dynamicConfig.pfEmployeePercent = rule.rateTable.employeeShare || dynamicConfig.pfEmployeePercent;
                  dynamicConfig.pfEmployerPercent = rule.rateTable.employerShare || dynamicConfig.pfEmployerPercent;
                }
                if (rule.ruleType === 'PT' && rule.rateTable) {
                  dynamicConfig.professionalTax = rule.rateTable.amount || dynamicConfig.professionalTax;
                }
              });

              const calc = calculatePayroll(monthWage, payableDays, daysInMonth, dynamicConfig);
              
              const netAfterAdvances = calc.netSalary - advanceDeduction;
      
              const payroll = await prisma.payroll.upsert({
                where: {
                  userId_month: { userId: user.id, month }
                },
                update: {
                  entityId: user.entityId || null,
                  monthWage,
                  payableDays,
                  basicSalary: calc.basicSalary,
                  hra: calc.hra,
                  standardAllowance: calc.standardAllowance,
                  performanceBonus: calc.performanceBonus,
                  lta: calc.lta,
                  pfEmployee: calc.pfEmployee,
                  pfEmployer: calc.pfEmployer,
                  professionalTax: calc.professionalTax,
                  fixedAllowance: calc.fixedAllowance,
                  grossSalary: calc.grossSalary,
                  netSalary: netAfterAdvances
                },
                create: {
                  tenantId: req.user.tenantId,
                  entityId: user.entityId || null,
                  userId: user.id,
                  month,
                  monthWage,
                  payableDays,
                  basicSalary: calc.basicSalary,
                  hra: calc.hra,
                  standardAllowance: calc.standardAllowance,
                  performanceBonus: calc.performanceBonus,
                  lta: calc.lta,
                  pfEmployee: calc.pfEmployee,
                  pfEmployer: calc.pfEmployer,
                  professionalTax: calc.professionalTax,
                  fixedAllowance: calc.fixedAllowance,
                  grossSalary: calc.grossSalary,
                  netSalary: netAfterAdvances
                }
              });
              succeeded.push({ id: user.id, name: user.displayName });
            } catch (err) {
              failed.push({ id: user.id, name: user.displayName, reason: err.message });
            }
          }
      
          // Audit Log
          await prisma.auditLog.create({
            data: {
              actorId: req.user.id,
              action: 'PAYROLL_GENERATED',
              details: `Generated payroll for ${month}. Success: ${succeeded.length}, Failed: ${failed.length}`
            }
          });
          
          if (succeeded.length > 0) {
            dispatchWebhook(req.user.tenantId, 'payroll.generated', {
              month,
              successCount: succeeded.length,
              failedCount: failed.length
            });

            // Dispatch Notifications to all employees who got payroll
            succeeded.forEach(pay => {
              sendNotification({
                userId: pay.userId,
                tenantId: req.user.tenantId,
                channel: 'ALL',
                type: 'PAYROLL_GENERATED',
                data: { month, netSalary: pay.netSalary }
              });
            });
          }
      
          res.json({ message: 'Payroll generation complete', succeeded, failed });
        } catch (error) {
          res.status(500).json({ error: error.message });
        }
      };
      
      const getMyPayrolls = async (req, res) => {
        try {
          const payrolls = await prisma.payroll.findMany({
            where: { userId: req.user.id },
            orderBy: { month: 'desc' }
          });
          res.json(payrolls);
        } catch (error) {
          res.status(500).json({ error: error.message });
        }
      };
      
      const getAllPayrolls = async (req, res) => {
        try {
          const { month } = req.query;
          const filter = month ? { month } : {};
          const payrolls = await prisma.payroll.findMany({
            where: filter,
            include: { user: { select: { displayName: true, employeeId: true } } },
            orderBy: { month: 'desc' }
          });
          res.json(payrolls);
        } catch (error) {
          res.status(500).json({ error: error.message });
        }
      };
      
      const getPayrollsByUser = async (req, res) => {
        try {
          const { userId } = req.params;
          const payrolls = await prisma.payroll.findMany({
            where: { userId },
            include: { user: { select: { displayName: true, employeeId: true } } },
            orderBy: { month: 'desc' }
          });
          res.json(payrolls);
        } catch (error) {
          res.status(500).json({ error: error.message });
        }
      };

      // Config methods
      const getConfig = async (req, res) => {
        try {
          let config = await prisma.payrollConfig.findFirst({ where: { tenantId: req.user.tenantId } });
          if (!config) {
             config = await prisma.payrollConfig.create({
               data: { tenantId: req.user.tenantId, companyName: 'Default Company' }
             });
          }
          res.json(config);
        } catch (error) {
          res.status(500).json({ error: error.message });
        }
      };
      
      const updateConfig = async (req, res) => {
        try {
          const { companyName, ...rest } = req.body;
          
          // Validation: Basic + HRA + Bonus + LTA + Std Allowance relative to wage shouldn't exceed wage
          // i.e., basic% + (basic% * hra%) + (basic% * bonus%) + (basic% * lta%)
          // Since it's all relative to Basic (except std allowance), we compute:
          const totalPercentageOfWage = rest.basicPercentOfWage * (1 + (rest.hraPercentOfBasic/100) + (rest.bonusPercentOfBasic/100) + (rest.ltaPercentOfBasic/100));
          
          if (totalPercentageOfWage >= 100) {
            return res.status(400).json({ error: 'Config invalid: The sum of Basic, HRA, Bonus, and LTA exceeds 100% of the Month Wage. This would result in negative Fixed Allowance.' });
          }
          
          let config = await prisma.payrollConfig.findFirst({ where: { tenantId: req.user.tenantId } });
          if (config) {
            config = await prisma.payrollConfig.update({
              where: { id: config.id },
              data: { ...rest }
            });
          } else {
            config = await prisma.payrollConfig.create({
              data: { tenantId: req.user.tenantId, companyName: companyName || 'Company', ...rest }
            });
          }
          
          await prisma.auditLog.create({
            data: {
              actorId: req.user.id,
              action: 'CONFIG_UPDATED',
              details: `Payroll configuration updated.`
            }
          });
      
          res.json(config);
        } catch (error) {
          res.status(500).json({ error: error.message });
        }
      };
      
      const lockPayroll = async (req, res) => {
        try {
          const { id } = req.params;
          const payroll = await prisma.payroll.update({
            where: { id },
            data: { locked: true }
          });
          res.json(payroll);
        } catch (error) {
          res.status(500).json({ error: error.message });
        }
      };
      
      const getPayslipPdf = async (req, res) => {
        try {
          const { id } = req.params;
          const payroll = await prisma.payroll.findUnique({
            where: { id },
            include: { user: true }
          });
      
          if (!payroll) return res.status(404).json({ error: 'Payroll not found' });
          if (req.user.role !== 'Admin' && req.user.id !== payroll.userId) {
            return res.status(403).json({ error: 'Unauthorized' });
          }
      
          const PDFDocument = require('pdfkit');
          const doc = new PDFDocument({ margin: 50 });
          
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', `attachment; filename=payslip-${payroll.month}.pdf`);
          
          doc.pipe(res);
          
          // Simple PDF layout
          doc.fontSize(20).text('Payslip', { align: 'center' });
          doc.moveDown();
          doc.fontSize(12).text(`Month: ${payroll.month}`);
          doc.text(`Employee: ${payroll.user.displayName}`);
          doc.text(`Emp ID: ${payroll.user.employeeId}`);
          doc.moveDown();
          
          doc.text(`Payable Days: ${payroll.payableDays}`);
          doc.text(`Basic Salary: Rs ${payroll.basicSalary.toFixed(2)}`);
          doc.text(`HRA: Rs ${payroll.hra.toFixed(2)}`);
          doc.text(`Standard Allowance: Rs ${payroll.standardAllowance.toFixed(2)}`);
          doc.text(`Performance Bonus: Rs ${payroll.performanceBonus.toFixed(2)}`);
          doc.text(`LTA: Rs ${payroll.lta.toFixed(2)}`);
          doc.text(`Fixed Allowance: Rs ${payroll.fixedAllowance.toFixed(2)}`);
          doc.moveDown();
          doc.text(`Gross Salary: Rs ${payroll.grossSalary.toFixed(2)}`, { stroke: true });
          doc.moveDown();
          
          doc.text(`Deductions:`);
          doc.text(`PF Employee: Rs ${payroll.pfEmployee.toFixed(2)}`);
          doc.text(`Professional Tax: Rs ${payroll.professionalTax.toFixed(2)}`);
          doc.moveDown();
          
          doc.fontSize(14).text(`Net Salary: Rs ${payroll.netSalary.toFixed(2)}`, { underline: true });
          
          doc.end();
        } catch (error) {
          res.status(500).json({ error: error.message });
        }
      };
      
      const getAuditLogs = async (req, res) => {
        try {
          const logs = await prisma.auditLog.findMany({
            orderBy: { createdAt: 'desc' }
          });
          res.json(logs);
        } catch (error) {
          res.status(500).json({ error: error.message });
        }
      };
      
      module.exports = {
        requestAdvance,
        updateAdvanceStatus,
        getAllAdvances,
        generateMonthlyPayroll,
        getMyPayrolls,
        getAllPayrolls,
        getPayrollsByUser,
        getConfig,
        updateConfig,
        lockPayroll,
        getPayslipPdf,
        getAuditLogs
      };
