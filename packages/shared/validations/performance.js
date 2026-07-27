const { z } = require('zod');

const createGoalSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  description: z.string().max(2000).optional(),
  category: z.enum(['Individual', 'Team', 'Company']).default('Individual'),
  metricType: z.enum(['Percentage', 'Boolean', 'Number', 'Currency']).default('Percentage'),
  targetValue: z.number().min(0, 'Target value must be positive'),
  parentGoalId: z.string().uuid().optional().nullable(),
  userId: z.string().uuid('Invalid user ID'),
  startDate: z.string().datetime().optional().nullable(),
  endDate: z.string().datetime().optional().nullable()
}).refine(data => {
  if (data.startDate && data.endDate) {
    return new Date(data.endDate) > new Date(data.startDate);
  }
  return true;
}, {
  message: 'End date must be after start date',
  path: ['endDate']
});

const updateGoalProgressSchema = z.object({
  currentValue: z.number().min(0)
});

const draftReviewSchema = z.object({
  revieweeId: z.string().uuid('Invalid reviewee ID'),
  cycleName: z.string().min(1, 'Cycle name is required'),
  ratings: z.record(z.string(), z.number().min(1).max(5)).optional().nullable(),
  comments: z.string().max(5000).optional().nullable()
});

const submitFeedbackSchema = z.object({
  receiverId: z.string().uuid('Invalid receiver ID'),
  content: z.string().min(10, 'Feedback must be at least 10 characters').max(2000, 'Feedback cannot exceed 2000 characters'),
  competencies: z.record(z.string(), z.number().min(1).max(5)).optional().nullable(),
  isAnonymous: z.boolean().default(true)
});

module.exports = {
  createGoalSchema,
  updateGoalProgressSchema,
  draftReviewSchema,
  submitFeedbackSchema
};
