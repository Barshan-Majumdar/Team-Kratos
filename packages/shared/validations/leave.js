const { z } = require('zod');

const applyLeaveSchema = z.object({
  policyGroupId: z.string().min(1, "Policy is required"),
  startDate: z.string().or(z.date()).refine(val => !isNaN(new Date(val).getTime()), {
    message: "Invalid start date",
  }),
  endDate: z.string().or(z.date()).refine(val => !isNaN(new Date(val).getTime()), {
    message: "Invalid end date",
  }),
  reason: z.string().min(5, "Reason must be at least 5 characters long"),
  durationType: z.enum(['FullDay', 'HalfDay', 'Hourly']).optional().default('FullDay'),
  hoursRequested: z.number().min(0).optional()
}).refine(data => {
  const start = new Date(data.startDate);
  const end = new Date(data.endDate);
  return end >= start;
}, {
  message: "End date must be after or equal to start date",
  path: ["endDate"]
});

const createPolicySchema = z.object({
  name: z.string().min(2, "Policy name is required"),
  annualQuota: z.number().min(0, "Annual quota must be 0 or more"),
  carryForward: z.boolean().optional().default(false),
  maxCarryForward: z.number().min(0).optional(),
  isPaid: z.boolean().optional().default(true),
  allowNegativeBalance: z.boolean().optional().default(false),
  requiresAttachment: z.boolean().optional().default(false),
  leaveYearStartMonth: z.number().min(1).max(12).optional().default(1),
  leaveYearStartDay: z.number().min(1).max(31).optional().default(1),
});

module.exports = {
  applyLeaveSchema,
  createPolicySchema
};
