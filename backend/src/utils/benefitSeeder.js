const prisma = require('../config/db');

/**
 * Idempotently seed standard default benefit plans for a tenant.
 * Uses createMany with skipDuplicates: true backed by @@unique([tenantId, name]).
 */
const seedTenantBenefitPlans = async (tenantId) => {
  if (!tenantId) return 0;

  const defaultPlans = [
    {
      tenantId,
      name: 'Gold Health Insurance Plan',
      category: 'HEALTH_INSURANCE',
      description: 'Comprehensive medical, hospital, and prescription coverage with zero-deductible preferred network.',
      providerName: 'Care Health Insurance',
      policyNumber: 'POL-HLTH-GOLD-2026',
      isActive: true,
      tierRates: {
        INDIVIDUAL: { employeeDeduction: 1500, employerContribution: 3000 },
        SPOUSE: { employeeDeduction: 2500, employerContribution: 4500 },
        FAMILY: { employeeDeduction: 4000, employerContribution: 6000 }
      }
    },
    {
      tenantId,
      name: 'Dental & Vision Care Package',
      category: 'DENTAL',
      description: 'Annual dental checkups, cleaning, orthodontics, and prescription eyewear allowance.',
      providerName: 'Cigna Global',
      policyNumber: 'POL-DENT-VIS-2026',
      isActive: true,
      tierRates: {
        INDIVIDUAL: { employeeDeduction: 500, employerContribution: 1000 },
        SPOUSE: { employeeDeduction: 900, employerContribution: 1500 },
        FAMILY: { employeeDeduction: 1400, employerContribution: 2200 }
      }
    },
    {
      tenantId,
      name: 'Retirement Superannuation Match',
      category: 'RETIREMENT',
      description: '100% employer match up to 6% of basic salary towards superannuation pension fund.',
      providerName: 'ICICI Prudential Pension',
      policyNumber: 'POL-RET-SUPER-2026',
      isActive: true,
      tierRates: {
        INDIVIDUAL: { employeeDeduction: 2000, employerContribution: 2000 },
        SPOUSE: { employeeDeduction: 2500, employerContribution: 2500 },
        FAMILY: { employeeDeduction: 3500, employerContribution: 3500 }
      }
    },
    {
      tenantId,
      name: 'Executive Wellness & Therapy Pass',
      category: 'WELLNESS',
      description: 'Monthly gym pass reimbursement, therapy sessions, and premium wellness app subscriptions.',
      providerName: 'Cult.fit & Headspace',
      policyNumber: 'POL-WELL-PASS-2026',
      isActive: true,
      tierRates: {
        INDIVIDUAL: { employeeDeduction: 300, employerContribution: 1200 },
        SPOUSE: { employeeDeduction: 500, employerContribution: 1800 },
        FAMILY: { employeeDeduction: 800, employerContribution: 2500 }
      }
    },
    {
      tenantId,
      name: 'Metropolitan Commuter Benefit Pass',
      category: 'COMMUTER',
      description: 'Tax-free transit pass reimbursement for metro, bus, and rideshare daily commuting.',
      providerName: 'TransitCard India',
      policyNumber: 'POL-COMM-TRANS-2026',
      isActive: true,
      tierRates: {
        INDIVIDUAL: { employeeDeduction: 800, employerContribution: 800 },
        SPOUSE: { employeeDeduction: 1200, employerContribution: 1200 },
        FAMILY: { employeeDeduction: 1800, employerContribution: 1800 }
      }
    },
    {
      tenantId,
      name: 'Group Term Life Insurance Cover',
      category: 'LIFE_INSURANCE',
      description: '5x annual CTC life insurance policy with full accidental death and disability cover.',
      providerName: 'HDFC Life',
      policyNumber: 'POL-LIFE-GTL-2026',
      isActive: true,
      tierRates: {
        INDIVIDUAL: { employeeDeduction: 400, employerContribution: 1600 },
        SPOUSE: { employeeDeduction: 700, employerContribution: 2200 },
        FAMILY: { employeeDeduction: 1100, employerContribution: 3000 }
      }
    }
  ];

  const result = await prisma.benefitPlan.createMany({
    data: defaultPlans,
    skipDuplicates: true
  });

  return result.count;
};

module.exports = { seedTenantBenefitPlans };
