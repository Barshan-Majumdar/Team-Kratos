const { z } = require('zod');

const personalDetailsSchema = z.object({
  dateOfBirth: z.string().or(z.date()).optional(),
  gender: z.string().optional(),
  maritalStatus: z.string().optional(),
  residingAddress: z.string().optional(),
  phone: z.string().optional(),
});

const emergencyContactSchema = z.object({
  // Included for completeness based on UI, though not strictly in DB yet
  emergencyContactName: z.string().optional(),
  emergencyContactRelation: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
});

const financialDetailsSchema = z.object({
  bankName: z.string().optional(),
  bankBranch: z.string().optional(),
  accountNumber: z.string().optional(),
  ifscCode: z.string().optional(),
});

const statutoryDetailsSchema = z.object({
  panNo: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, "Invalid PAN format").optional().or(z.literal('')),
  aadharLast4: z.string().regex(/^[0-9]{4}$/, "Must be 4 digits").optional().or(z.literal('')),
});

module.exports = {
  personalDetailsSchema,
  emergencyContactSchema,
  financialDetailsSchema,
  statutoryDetailsSchema,
};
