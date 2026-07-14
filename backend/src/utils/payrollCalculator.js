/**
 * Auto-Computation Formulas (Configurable via PayrollConfig):
 * Basic Salary: Configurable % of Month Wage (e.g. 50%).
 * HRA: Configurable % of Basic Salary (e.g. 50%).
 * Standard Allowance: Configurable Fixed predefined value (e.g., 4167.00).
 * Performance Bonus: Configurable % of Basic Salary (e.g. 8.33%).
 * LTA: Configurable % of Basic Salary (e.g. 8.33%).
 * PF Contribution: Configurable % of Basic Salary (e.g. 12%).
 * Professional Tax: Configurable fixed deduction (e.g. ₹200).
 * Fixed Allowance: Automatically calculated to balance.
 */

function calculatePayroll(monthWage, payableDays, totalDaysInMonth = 30, config = null) {
  // Default values if no config is provided
  const c = config || {
    basicPercentOfWage: 50.0,
    hraPercentOfBasic: 50.0,
    bonusPercentOfBasic: 8.33,
    ltaPercentOfBasic: 8.33,
    pfEmployeePercent: 12.0,
    pfEmployerPercent: 12.0,
    professionalTax: 200.0,
    standardAllowance: 4167.0
  };

  // Prorate month wage based on payable days
  const proratedWage = (monthWage / totalDaysInMonth) * payableDays;

  const basicSalary = Number((proratedWage * (c.basicPercentOfWage / 100)).toFixed(2));
  const hra = Number((basicSalary * (c.hraPercentOfBasic / 100)).toFixed(2));
  const performanceBonus = Number((basicSalary * (c.bonusPercentOfBasic / 100)).toFixed(2));
  const lta = Number((basicSalary * (c.ltaPercentOfBasic / 100)).toFixed(2));
  
  const standardAllowance = Number((c.standardAllowance * (payableDays / totalDaysInMonth)).toFixed(2));
  
  // Calculate fixed allowance to balance the prorated wage
  // Month Wage = Basic + HRA + Standard Allowance + Performance Bonus + LTA + Fixed Allowance
  // Fixed Allowance = Month Wage - (Basic + HRA + Standard Allowance + Performance Bonus + LTA)
  let fixedAllowance = proratedWage - (basicSalary + hra + standardAllowance + performanceBonus + lta);
  fixedAllowance = Number(fixedAllowance.toFixed(2));
  
  // If fixed allowance is negative, we might need to adjust (for edge cases with very low wages)
  if (fixedAllowance < 0) fixedAllowance = 0;

  // Deductions
  const pfEmployee = Number((basicSalary * (c.pfEmployeePercent / 100)).toFixed(2));
  const pfEmployer = Number((basicSalary * (c.pfEmployerPercent / 100)).toFixed(2));
  let professionalTax = c.professionalTax;
  
  // Net Salary = Gross (Basic + HRA + Standard + Perf + LTA + Fixed) - Deductions (PF Employee + Prof Tax)
  // Note: PF Employer is an expense to company, not deducted from Gross to get Net typically, 
  // but if gross includes Employer PF, it varies. We assume Net = Gross - Employee PF - PT
  const grossSalary = basicSalary + hra + standardAllowance + performanceBonus + lta + fixedAllowance;
  
  if (grossSalary < (pfEmployee + professionalTax)) {
    professionalTax = Math.max(0, grossSalary - pfEmployee);
  }

  const netSalary = Number((grossSalary - pfEmployee - professionalTax).toFixed(2));

  return {
    basicSalary,
    hra,
    standardAllowance,
    performanceBonus,
    lta,
    pfEmployee,
    pfEmployer,
    professionalTax,
    fixedAllowance,
    grossSalary,
    netSalary
  };
}

module.exports = { calculatePayroll };
