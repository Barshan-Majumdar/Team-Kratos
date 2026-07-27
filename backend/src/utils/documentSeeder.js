const prisma = require('../config/db');

const SYSTEM_DEFAULT_TEMPLATES = [
  {
    title: 'Standard Offer Letter',
    type: 'OFFER_LETTER',
    headerText: 'CONFIDENTIAL — EMPLOYMENT OFFER',
    footerText: 'Crew HRMS — Official Offer Document',
    isSystemDefault: true,
    bodyTemplate: `Dear {{employeeName}},

We are pleased to offer you the position of {{jobPosition}} in the {{department}} department at {{companyName}}.

Your employment will commence on {{joiningDate}}. In this role, your annual base salary will be {{baseSalary}} ({{currency}}), payable in accordance with the company's standard payroll schedule.

Please sign and return a copy of this letter to confirm your acceptance.

Sincerely,
HR Department, {{companyName}}
Date: {{currentDate}}`
  },
  {
    title: 'Experience Certificate',
    type: 'EXPERIENCE_CERTIFICATE',
    headerText: 'TO WHOM IT MAY CONCERN',
    footerText: 'Crew HRMS — Employment Verification',
    isSystemDefault: true,
    bodyTemplate: `This is to certify that {{employeeName}} (Employee ID: {{employeeId}}) was employed with {{companyName}} as a {{jobPosition}} in the {{department}} department.

During their tenure starting from {{joiningDate}}, {{employeeName}} demonstrated high professional standards, dedication, and diligence.

We wish them all the best in their future endeavors.

Authorized Signatory,
{{companyName}}
Date: {{currentDate}}`
  },
  {
    title: 'Relieving & Exit Confirmation',
    type: 'RELIEVING_LETTER',
    headerText: 'RELIEVING LETTER',
    footerText: 'Crew HRMS — Official Relieving Document',
    isSystemDefault: true,
    bodyTemplate: `Dear {{employeeName}},

This letter confirms that your resignation from the position of {{jobPosition}} at {{companyName}} has been accepted. Your official relieving date is {{currentDate}}.

All company assets, keys, and documentation assigned to you have been duly handed over, and your final dues have been settled.

We thank you for your contributions during your tenure starting on {{joiningDate}}.

Sincerely,
Human Resources,
{{companyName}}`
  },
  {
    title: 'Promotion & Designation Upgrade',
    type: 'PROMOTION_LETTER',
    headerText: 'CAREER ADVANCEMENT ANNOUNCEMENT',
    footerText: 'Crew HRMS — Compensation & Role Update',
    isSystemDefault: true,
    bodyTemplate: `Dear {{employeeName}},

In recognition of your outstanding performance and dedication at {{companyName}}, we are delighted to inform you of your promotion to {{jobPosition}} in the {{department}} department, effective {{currentDate}}.

With this promotion, your revised base salary will be {{baseSalary}} per annum.

We congratulate you on this well-deserved milestone and look forward to your continued success.

Management,
{{companyName}}`
  },
  {
    title: 'Salary & Income Proof Certificate',
    type: 'SALARY_CERTIFICATE',
    headerText: 'SALARY CERTIFICATE',
    footerText: 'Crew HRMS — Proof of Income Document',
    isSystemDefault: true,
    bodyTemplate: `TO WHOM IT MAY CONCERN,

This certificate confirms that {{employeeName}} (Employee ID: {{employeeId}}) is a full-time employee of {{companyName}}, serving as {{jobPosition}} in the {{department}} department since {{joiningDate}}.

As per company records, their current annual base compensation is {{baseSalary}} ({{currency}}).

This document is issued upon the employee's request for official verification purposes.

Authorized Signatory,
{{companyName}}
Date: {{currentDate}}`
  }
];

/**
 * Idempotent per-tenant document template seeder
 */
const seedTenantDocumentTemplates = async (tenantId) => {
  if (!tenantId) return 0;
  try {
    const existing = await prisma.basePrisma.documentTemplate.findMany({
      where: { tenantId, isSystemDefault: true },
      select: { type: true }
    });

    const existingTypes = new Set(existing.map(t => t.type));
    const templatesToInsert = SYSTEM_DEFAULT_TEMPLATES
      .filter(t => !existingTypes.has(t.type))
      .map(t => ({
        ...t,
        tenantId
      }));

    if (templatesToInsert.length > 0) {
      await prisma.basePrisma.documentTemplate.createMany({
        data: templatesToInsert,
        skipDuplicates: true
      });
    }
  } catch (error) {
    console.error(`[Seeder Error] Failed to seed document templates for tenant ${tenantId}:`, error.message);
  }
};

module.exports = {
  seedTenantDocumentTemplates,
  SYSTEM_DEFAULT_TEMPLATES
};
