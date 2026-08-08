-- CreateEnum
CREATE TYPE "Status" AS ENUM ('Active', 'Inactive', 'OnLeave');

-- CreateEnum
CREATE TYPE "LeaveLedgerReason" AS ENUM ('ANNUAL_GRANT', 'ACCRUAL', 'CARRY_FORWARD', 'YEAR_END_LAPSE', 'LEAVE_TAKEN', 'PENDING_HOLD', 'REVERSAL', 'ADJUSTMENT', 'ENCASHMENT');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('Present', 'Absent', 'HalfDay', 'OnLeave');

-- CreateEnum
CREATE TYPE "DurationType" AS ENUM ('FullDay', 'HalfDay', 'Hourly');

-- CreateEnum
CREATE TYPE "LeaveStatus" AS ENUM ('Pending', 'Approved', 'Rejected');

-- CreateEnum
CREATE TYPE "AdvanceStatus" AS ENUM ('Pending', 'Approved', 'Rejected', 'Deducted');

-- CreateEnum
CREATE TYPE "ExpenseCategory" AS ENUM ('Travel', 'Meals', 'Supplies', 'Software', 'Utilities', 'Training', 'Other');

-- CreateEnum
CREATE TYPE "ExpenseStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'SETTLED');

-- CreateEnum
CREATE TYPE "AnnouncementCategory" AS ENUM ('General', 'Policy', 'Event', 'Birthday', 'Urgent');

-- CreateEnum
CREATE TYPE "GoalCategory" AS ENUM ('Individual', 'Team', 'Company');

-- CreateEnum
CREATE TYPE "GoalMetricType" AS ENUM ('Percentage', 'Boolean', 'Number', 'Currency');

-- CreateEnum
CREATE TYPE "GoalStatus" AS ENUM ('NotStarted', 'InProgress', 'Achieved', 'Abandoned');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('Draft', 'Published', 'Acknowledged');

-- CreateEnum
CREATE TYPE "Feedback360Status" AS ENUM ('Visible', 'Hidden');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('Open', 'InProgress', 'Resolved');

-- CreateEnum
CREATE TYPE "TicketCategory" AS ENUM ('HR', 'IT', 'Payroll');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('OFFER_LETTER', 'EXPERIENCE_CERTIFICATE', 'RELIEVING_LETTER', 'PROMOTION_LETTER', 'SALARY_CERTIFICATE', 'CUSTOM');

-- CreateEnum
CREATE TYPE "BenefitCategory" AS ENUM ('HEALTH_INSURANCE', 'DENTAL', 'VISION', 'RETIREMENT', 'WELLNESS', 'COMMUTER', 'LIFE_INSURANCE', 'OTHER');

-- CreateEnum
CREATE TYPE "BenefitStatus" AS ENUM ('ACTIVE', 'WAIVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CoverageTier" AS ENUM ('INDIVIDUAL', 'SPOUSE', 'FAMILY');

-- CreateEnum
CREATE TYPE "ApplicationStage" AS ENUM ('Applied', 'Screening', 'Interview', 'Offer', 'Hired', 'Rejected');

-- CreateEnum
CREATE TYPE "AssetStatus" AS ENUM ('Available', 'Assigned', 'Maintenance');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('Draft', 'Open', 'Closed', 'OnHold');

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "domain" TEXT,
    "planTier" TEXT NOT NULL DEFAULT 'Free',
    "notificationPreferences" JSONB,
    "pan" TEXT,
    "gstin" TEXT,
    "cin" TEXT,
    "industry" TEXT,
    "size" TEXT,
    "founded" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "pincode" TEXT,
    "country" TEXT,
    "departments" TEXT[],
    "customRoles" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "onboardingReminderDays" INTEGER NOT NULL DEFAULT 3,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoleDefinition" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "name" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "isOwnerRole" BOOLEAN NOT NULL DEFAULT false,
    "isSystemDefault" BOOLEAN NOT NULL DEFAULT false,
    "canAccessConsole" BOOLEAN NOT NULL DEFAULT false,
    "permissions" JSONB,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoleDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Office" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "radiusMeters" DOUBLE PRECISION NOT NULL DEFAULT 500,
    "address" TEXT,
    "state" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Office_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShiftPolicy" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "gracePeriodMinutes" INTEGER NOT NULL DEFAULT 15,
    "graceMinutes" INTEGER NOT NULL DEFAULT 15,
    "breakDurationMinutes" INTEGER NOT NULL DEFAULT 60,
    "overtimeRateMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 1.5,
    "lateDeductionPerMinute" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "minOvertimeMinutes" INTEGER NOT NULL DEFAULT 30,
    "assignmentDays" INTEGER,
    "color" TEXT NOT NULL DEFAULT '#6366f1',
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShiftPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShiftRoster" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "shiftPolicyId" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShiftRoster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShiftSlot" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "shiftType" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,

    CONSTRAINT "ShiftSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShiftAssignment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "slotId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "assignedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShiftAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeavePolicy" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "policyGroupId" TEXT,
    "annualQuota" DECIMAL(65,30) NOT NULL,
    "carryForward" BOOLEAN NOT NULL DEFAULT false,
    "maxCarryForward" DECIMAL(65,30),
    "isPaid" BOOLEAN NOT NULL DEFAULT true,
    "allowNegativeBalance" BOOLEAN NOT NULL DEFAULT false,
    "requiresAttachment" BOOLEAN NOT NULL DEFAULT false,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leaveYearStartMonth" INTEGER NOT NULL DEFAULT 1,
    "leaveYearStartDay" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeavePolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaveLedgerEntry" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "policyGroupId" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "reason" "LeaveLedgerReason" NOT NULL,
    "leaveRequestId" TEXT,
    "reversedEntryId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeaveLedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "entityId" TEXT,
    "officeId" TEXT,
    "shiftPolicyId" TEXT,
    "employeeId" TEXT,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "roleDefinitionId" TEXT,
    "customRole" TEXT,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT true,
    "status" "Status" NOT NULL DEFAULT 'Active',
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "otpCode" TEXT,
    "otpExpiry" TIMESTAMP(3),
    "resetPasswordOtp" TEXT,
    "resetPasswordOtpExpiry" TIMESTAMP(3),
    "inviteToken" TEXT,
    "inviteTokenExpiry" TIMESTAMP(3),
    "faceRegistered" BOOLEAN NOT NULL DEFAULT false,
    "biometricUnlocked" BOOLEAN NOT NULL DEFAULT false,
    "biometricUnlockExpiry" TIMESTAMP(3),
    "displayName" TEXT,
    "avatar" TEXT,
    "department" TEXT,
    "jobPosition" TEXT,
    "managerId" TEXT,
    "about" TEXT,
    "skills" TEXT[],
    "certifications" TEXT[],
    "phone" TEXT,
    "residingAddress" TEXT,
    "personalEmail" TEXT,
    "gender" TEXT,
    "nationality" TEXT,
    "maritalStatus" TEXT,
    "location" TEXT,
    "companyName" TEXT,
    "companyLogo" TEXT,
    "bankName" TEXT,
    "bankBranch" TEXT,
    "accountNumber" TEXT,
    "ifscCode" TEXT,
    "panNo" TEXT,
    "aadharNo" TEXT,
    "aadharLast4" TEXT,
    "voterIdNo" TEXT,
    "aadharDoc" TEXT,
    "panDoc" TEXT,
    "voterDoc" TEXT,
    "addressProofDoc" TEXT,
    "uanNo" TEXT,
    "empCode" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "dateOfJoining" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "workingDaysPerWeek" INTEGER NOT NULL DEFAULT 5,
    "breakTimeHrs" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "baseSalary" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "attritionRiskScore" DOUBLE PRECISION,
    "attritionRiskLabel" TEXT,
    "riskUpdatedAt" TIMESTAMP(3),
    "onboardingStep" TEXT NOT NULL DEFAULT 'personal_details',
    "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attendance" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "officeId" TEXT,
    "date" DATE NOT NULL,
    "checkIn" TIMESTAMP(3) NOT NULL,
    "checkOut" TIMESTAMP(3),
    "workHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "extraHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "breakHours" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "status" "AttendanceStatus" NOT NULL DEFAULT 'Present',
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "accuracy" DOUBLE PRECISION,
    "trustScore" INTEGER,
    "verificationMethod" TEXT,
    "isLivenessVerified" BOOLEAN NOT NULL DEFAULT false,
    "livenessEmbeddingHash" TEXT,
    "isFlagged" BOOLEAN NOT NULL DEFAULT false,
    "flagReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Leave" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "leavePolicyId" TEXT NOT NULL,
    "durationType" "DurationType" NOT NULL DEFAULT 'FullDay',
    "hoursRequested" DOUBLE PRECISION,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL,
    "attachment" TEXT,
    "status" "LeaveStatus" NOT NULL DEFAULT 'Pending',
    "adminRemarks" TEXT,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "managerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Leave_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payroll" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "entityId" TEXT,
    "userId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "monthWage" DOUBLE PRECISION NOT NULL,
    "payableDays" INTEGER NOT NULL,
    "basicSalary" DOUBLE PRECISION NOT NULL,
    "hra" DOUBLE PRECISION NOT NULL,
    "standardAllowance" DOUBLE PRECISION NOT NULL DEFAULT 4167.00,
    "performanceBonus" DOUBLE PRECISION NOT NULL,
    "lta" DOUBLE PRECISION NOT NULL,
    "pfEmployee" DOUBLE PRECISION NOT NULL,
    "pfEmployer" DOUBLE PRECISION NOT NULL,
    "professionalTax" DOUBLE PRECISION NOT NULL DEFAULT 200.00,
    "fixedAllowance" DOUBLE PRECISION NOT NULL,
    "overtimeHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "overtimeBonus" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lateDeductions" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "advanceDeduction" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "expenseReimburse" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "deductionBreakdown" JSONB,
    "bonusBreakdown" JSONB,
    "benefitsDeduction" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "benefitsBreakdown" JSONB,
    "grossSalary" DOUBLE PRECISION NOT NULL,
    "netSalary" DOUBLE PRECISION NOT NULL,
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payroll_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollConfig" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "pfEmployeePercent" DOUBLE PRECISION NOT NULL DEFAULT 12.0,
    "pfEmployerPercent" DOUBLE PRECISION NOT NULL DEFAULT 12.0,
    "professionalTax" DOUBLE PRECISION NOT NULL DEFAULT 200.0,
    "standardAllowance" DOUBLE PRECISION NOT NULL DEFAULT 4167.0,
    "basicPercentOfWage" DOUBLE PRECISION NOT NULL DEFAULT 50.0,
    "hraPercentOfBasic" DOUBLE PRECISION NOT NULL DEFAULT 50.0,
    "bonusPercentOfBasic" DOUBLE PRECISION NOT NULL DEFAULT 8.33,
    "ltaPercentOfBasic" DOUBLE PRECISION NOT NULL DEFAULT 8.33,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayrollConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetId" TEXT,
    "details" JSONB,
    "prevHash" TEXT,
    "hash" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminEmail" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminEmail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvitedEmployee" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvitedEmployee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalaryAdvance" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "reason" TEXT NOT NULL,
    "monthDeduction" TEXT NOT NULL,
    "status" "AdvanceStatus" NOT NULL DEFAULT 'Pending',
    "riskScore" INTEGER,
    "riskLabel" TEXT,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedBy" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "deducted" BOOLEAN NOT NULL DEFAULT false,
    "deductedAt" TIMESTAMP(3),
    "settledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalaryAdvance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Announcement" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "adminId" TEXT,
    "title" TEXT NOT NULL DEFAULT 'Announcement',
    "category" "AnnouncementCategory" NOT NULL DEFAULT 'General',
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BirthdayWish" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "announcementId" TEXT NOT NULL,
    "wisherId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BirthdayWish_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPreference" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "announceBirthday" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LegalEntity" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "pfCode" TEXT,
    "ptRegNo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LegalEntity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "razorpayPlanId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsageRecord" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "activeEmployees" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UsageRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplianceRule" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "ruleType" TEXT NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "rateTable" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComplianceRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportJob" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "sourceFile" TEXT NOT NULL,
    "mappingConfig" JSONB,
    "errorLog" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImportJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookSubscription" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "targetUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebhookSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiKey" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "keyPrefix" TEXT NOT NULL,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OnboardingChecklist" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OnboardingChecklist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OnboardingTask" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT,
    "checklistId" TEXT,
    "title" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3),
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "completedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OnboardingTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OnboardingChecklistTemplate" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "department" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OnboardingChecklistTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OnboardingChecklistTemplateTask" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "dueOffsetDays" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OnboardingChecklistTemplateTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OnboardingDocument" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OnboardingDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Goal" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "parentGoalId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" "GoalCategory" NOT NULL DEFAULT 'Individual',
    "metricType" "GoalMetricType" NOT NULL DEFAULT 'Percentage',
    "targetValue" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "currentValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "status" "GoalStatus" NOT NULL DEFAULT 'InProgress',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Goal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "revieweeId" TEXT NOT NULL,
    "cycleName" TEXT NOT NULL,
    "status" "ReviewStatus" NOT NULL DEFAULT 'Draft',
    "ratings" JSONB,
    "comments" TEXT,
    "overallScore" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Feedback360" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "providerId" TEXT,
    "receiverId" TEXT,
    "content" TEXT NOT NULL,
    "competencies" JSONB,
    "isAnonymous" BOOLEAN NOT NULL DEFAULT true,
    "status" "Feedback360Status" NOT NULL DEFAULT 'Visible',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Feedback360_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ticket" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subject" TEXT NOT NULL DEFAULT 'Support Request',
    "description" TEXT,
    "status" "TicketStatus" NOT NULL DEFAULT 'Open',
    "category" "TicketCategory" NOT NULL DEFAULT 'HR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpenseClaim" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "approverId" TEXT,
    "title" TEXT NOT NULL,
    "category" "ExpenseCategory" NOT NULL DEFAULT 'Other',
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "date" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "receiptFileId" TEXT,
    "receiptFileName" TEXT,
    "receiptMimeType" TEXT,
    "status" "ExpenseStatus" NOT NULL DEFAULT 'PENDING',
    "adminRemarks" TEXT,
    "settledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "managerId" TEXT,

    CONSTRAINT "ExpenseClaim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentTemplate" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL DEFAULT 'CUSTOM',
    "bodyTemplate" TEXT NOT NULL,
    "headerText" TEXT,
    "footerText" TEXT,
    "isSystemDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "DocumentTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeneratedDocument" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "templateId" TEXT,
    "userId" TEXT NOT NULL,
    "generatedById" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL DEFAULT 'application/pdf',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "url" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "GeneratedDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SignatureRequest" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SignatureRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProxyAlert" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "targetUserId" TEXT,
    "alertType" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "metadata" JSONB,
    "attendanceDate" DATE NOT NULL,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedBy" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolution" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProxyAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobRequisition" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "department" TEXT,
    "location" TEXT,
    "employmentType" TEXT DEFAULT 'Full-time',
    "status" "JobStatus" NOT NULL DEFAULT 'Open',
    "description" TEXT,
    "requirements" TEXT,
    "salaryMin" DOUBLE PRECISION,
    "salaryMax" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "createdById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobRequisition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BenefitPlan" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "BenefitCategory" NOT NULL DEFAULT 'HEALTH_INSURANCE',
    "description" TEXT,
    "tierRates" JSONB NOT NULL,
    "providerName" TEXT,
    "policyNumber" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BenefitPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeBenefit" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "coverageTier" "CoverageTier" NOT NULL DEFAULT 'INDIVIDUAL',
    "customDeduction" DECIMAL(10,2),
    "status" "BenefitStatus" NOT NULL DEFAULT 'ACTIVE',
    "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveEndDate" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeBenefit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Candidate" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "resumeUrl" TEXT,
    "parsedData" JSONB,
    "source" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Candidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Application" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "stage" "ApplicationStage" NOT NULL DEFAULT 'Applied',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "candidateId" TEXT NOT NULL,
    "jobRequisitionId" TEXT NOT NULL,
    "rating" INTEGER,
    "notes" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Asset" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "AssetStatus" NOT NULL DEFAULT 'Available',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "category" TEXT DEFAULT 'Equipment',
    "serialNumber" TEXT,
    "condition" TEXT DEFAULT 'New',
    "purchaseDate" TIMESTAMP(3),
    "price" DOUBLE PRECISION,
    "assignedToId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetAssignment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assetId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "returnedAt" TIMESTAMP(3),
    "condition" TEXT,

    CONSTRAINT "AssetAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Active',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "budget" DOUBLE PRECISION,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimesheetEntry" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "hours" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "projectId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "isBillable" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'Submitted',
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TimesheetEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OneOnOne" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "notes" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "employeeId" TEXT NOT NULL,
    "managerId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "talkingPoints" JSONB,
    "actionItems" JSONB,
    "status" TEXT NOT NULL DEFAULT 'Scheduled',
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OneOnOne_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PulseSurvey" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "questions" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "PulseSurvey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PulseResponse" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "surveyId" TEXT NOT NULL,
    "respondentHash" TEXT NOT NULL,
    "answers" JSONB NOT NULL,

    CONSTRAINT "PulseResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HRDocument" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HRDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PendingRegistration" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "otpCode" TEXT NOT NULL,
    "otpExpiry" TIMESTAMP(3) NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PendingRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ColocationGraphCache" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "nodes" JSONB NOT NULL,
    "links" JSONB NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ColocationGraphCache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FaceRegistration" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "encryptedEmbeddings" BYTEA NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FaceRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_domain_key" ON "Tenant"("domain");

-- CreateIndex
CREATE INDEX "ShiftRoster_tenantId_date_idx" ON "ShiftRoster"("tenantId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "ShiftRoster_tenantId_userId_date_key" ON "ShiftRoster"("tenantId", "userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "ShiftAssignment_slotId_employeeId_key" ON "ShiftAssignment"("slotId", "employeeId");

-- CreateIndex
CREATE INDEX "LeaveLedgerEntry_tenantId_userId_policyGroupId_idx" ON "LeaveLedgerEntry"("tenantId", "userId", "policyGroupId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_inviteToken_key" ON "User"("inviteToken");

-- CreateIndex
CREATE UNIQUE INDEX "User_tenantId_employeeId_key" ON "User"("tenantId", "employeeId");

-- CreateIndex
CREATE INDEX "Attendance_tenantId_userId_date_idx" ON "Attendance"("tenantId", "userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Attendance_tenantId_userId_date_key" ON "Attendance"("tenantId", "userId", "date");

-- CreateIndex
CREATE INDEX "Leave_tenantId_status_idx" ON "Leave"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Payroll_tenantId_userId_month_key" ON "Payroll"("tenantId", "userId", "month");

-- CreateIndex
CREATE UNIQUE INDEX "PayrollConfig_tenantId_companyName_key" ON "PayrollConfig"("tenantId", "companyName");

-- CreateIndex
CREATE UNIQUE INDEX "AdminEmail_tenantId_email_key" ON "AdminEmail"("tenantId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "InvitedEmployee_tenantId_email_key" ON "InvitedEmployee"("tenantId", "email");

-- CreateIndex
CREATE INDEX "SalaryAdvance_tenantId_status_idx" ON "SalaryAdvance"("tenantId", "status");

-- CreateIndex
CREATE INDEX "Announcement_tenantId_createdAt_idx" ON "Announcement"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "BirthdayWish_tenantId_announcementId_idx" ON "BirthdayWish"("tenantId", "announcementId");

-- CreateIndex
CREATE UNIQUE INDEX "BirthdayWish_announcementId_wisherId_key" ON "BirthdayWish"("announcementId", "wisherId");

-- CreateIndex
CREATE UNIQUE INDEX "UserPreference_userId_key" ON "UserPreference"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "LegalEntity_tenantId_name_key" ON "LegalEntity"("tenantId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "UsageRecord_tenantId_month_key" ON "UsageRecord"("tenantId", "month");

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_keyHash_key" ON "ApiKey"("keyHash");

-- CreateIndex
CREATE INDEX "Goal_tenantId_userId_idx" ON "Goal"("tenantId", "userId");

-- CreateIndex
CREATE INDEX "Review_tenantId_revieweeId_idx" ON "Review"("tenantId", "revieweeId");

-- CreateIndex
CREATE INDEX "Feedback360_tenantId_receiverId_idx" ON "Feedback360"("tenantId", "receiverId");

-- CreateIndex
CREATE INDEX "ExpenseClaim_tenantId_status_idx" ON "ExpenseClaim"("tenantId", "status");

-- CreateIndex
CREATE INDEX "ExpenseClaim_tenantId_userId_idx" ON "ExpenseClaim"("tenantId", "userId");

-- CreateIndex
CREATE INDEX "DocumentTemplate_tenantId_type_idx" ON "DocumentTemplate"("tenantId", "type");

-- CreateIndex
CREATE INDEX "GeneratedDocument_tenantId_userId_idx" ON "GeneratedDocument"("tenantId", "userId");

-- CreateIndex
CREATE INDEX "ProxyAlert_tenantId_resolved_idx" ON "ProxyAlert"("tenantId", "resolved");

-- CreateIndex
CREATE INDEX "ProxyAlert_tenantId_attendanceDate_idx" ON "ProxyAlert"("tenantId", "attendanceDate");

-- CreateIndex
CREATE INDEX "ProxyAlert_tenantId_userId_targetUserId_alertType_idx" ON "ProxyAlert"("tenantId", "userId", "targetUserId", "alertType");

-- CreateIndex
CREATE INDEX "BenefitPlan_tenantId_category_idx" ON "BenefitPlan"("tenantId", "category");

-- CreateIndex
CREATE UNIQUE INDEX "BenefitPlan_tenantId_name_key" ON "BenefitPlan"("tenantId", "name");

-- CreateIndex
CREATE INDEX "EmployeeBenefit_tenantId_userId_idx" ON "EmployeeBenefit"("tenantId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeBenefit_userId_planId_key" ON "EmployeeBenefit"("userId", "planId");

-- CreateIndex
CREATE UNIQUE INDEX "Candidate_tenantId_email_key" ON "Candidate"("tenantId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "Application_tenantId_candidateId_jobRequisitionId_key" ON "Application"("tenantId", "candidateId", "jobRequisitionId");

-- CreateIndex
CREATE UNIQUE INDEX "PulseResponse_surveyId_respondentHash_key" ON "PulseResponse"("surveyId", "respondentHash");

-- CreateIndex
CREATE UNIQUE INDEX "PendingRegistration_email_key" ON "PendingRegistration"("email");

-- CreateIndex
CREATE UNIQUE INDEX "ColocationGraphCache_tenantId_key" ON "ColocationGraphCache"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "FaceRegistration_userId_key" ON "FaceRegistration"("userId");

-- CreateIndex
CREATE INDEX "FaceRegistration_tenantId_status_idx" ON "FaceRegistration"("tenantId", "status");

-- AddForeignKey
ALTER TABLE "RoleDefinition" ADD CONSTRAINT "RoleDefinition_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoleDefinition" ADD CONSTRAINT "RoleDefinition_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Office" ADD CONSTRAINT "Office_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftPolicy" ADD CONSTRAINT "ShiftPolicy_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftRoster" ADD CONSTRAINT "ShiftRoster_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftRoster" ADD CONSTRAINT "ShiftRoster_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftRoster" ADD CONSTRAINT "ShiftRoster_shiftPolicyId_fkey" FOREIGN KEY ("shiftPolicyId") REFERENCES "ShiftPolicy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftSlot" ADD CONSTRAINT "ShiftSlot_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftAssignment" ADD CONSTRAINT "ShiftAssignment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftAssignment" ADD CONSTRAINT "ShiftAssignment_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "ShiftSlot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftAssignment" ADD CONSTRAINT "ShiftAssignment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeavePolicy" ADD CONSTRAINT "LeavePolicy_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveLedgerEntry" ADD CONSTRAINT "LeaveLedgerEntry_reversedEntryId_fkey" FOREIGN KEY ("reversedEntryId") REFERENCES "LeaveLedgerEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "LegalEntity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "Office"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_shiftPolicyId_fkey" FOREIGN KEY ("shiftPolicyId") REFERENCES "ShiftPolicy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_roleDefinitionId_fkey" FOREIGN KEY ("roleDefinitionId") REFERENCES "RoleDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "Office"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Leave" ADD CONSTRAINT "Leave_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Leave" ADD CONSTRAINT "Leave_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Leave" ADD CONSTRAINT "Leave_leavePolicyId_fkey" FOREIGN KEY ("leavePolicyId") REFERENCES "LeavePolicy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payroll" ADD CONSTRAINT "Payroll_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payroll" ADD CONSTRAINT "Payroll_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "LegalEntity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payroll" ADD CONSTRAINT "Payroll_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollConfig" ADD CONSTRAINT "PayrollConfig_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminEmail" ADD CONSTRAINT "AdminEmail_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvitedEmployee" ADD CONSTRAINT "InvitedEmployee_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalaryAdvance" ADD CONSTRAINT "SalaryAdvance_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalaryAdvance" ADD CONSTRAINT "SalaryAdvance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BirthdayWish" ADD CONSTRAINT "BirthdayWish_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BirthdayWish" ADD CONSTRAINT "BirthdayWish_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "Announcement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BirthdayWish" ADD CONSTRAINT "BirthdayWish_wisherId_fkey" FOREIGN KEY ("wisherId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPreference" ADD CONSTRAINT "UserPreference_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPreference" ADD CONSTRAINT "UserPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalEntity" ADD CONSTRAINT "LegalEntity_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsageRecord" ADD CONSTRAINT "UsageRecord_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceRule" ADD CONSTRAINT "ComplianceRule_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportJob" ADD CONSTRAINT "ImportJob_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookSubscription" ADD CONSTRAINT "WebhookSubscription_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnboardingChecklist" ADD CONSTRAINT "OnboardingChecklist_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnboardingTask" ADD CONSTRAINT "OnboardingTask_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnboardingTask" ADD CONSTRAINT "OnboardingTask_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnboardingChecklistTemplate" ADD CONSTRAINT "OnboardingChecklistTemplate_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnboardingChecklistTemplateTask" ADD CONSTRAINT "OnboardingChecklistTemplateTask_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnboardingChecklistTemplateTask" ADD CONSTRAINT "OnboardingChecklistTemplateTask_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "OnboardingChecklistTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnboardingDocument" ADD CONSTRAINT "OnboardingDocument_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnboardingDocument" ADD CONSTRAINT "OnboardingDocument_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_parentGoalId_fkey" FOREIGN KEY ("parentGoalId") REFERENCES "Goal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_revieweeId_fkey" FOREIGN KEY ("revieweeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feedback360" ADD CONSTRAINT "Feedback360_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feedback360" ADD CONSTRAINT "Feedback360_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feedback360" ADD CONSTRAINT "Feedback360_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseClaim" ADD CONSTRAINT "ExpenseClaim_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseClaim" ADD CONSTRAINT "ExpenseClaim_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseClaim" ADD CONSTRAINT "ExpenseClaim_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentTemplate" ADD CONSTRAINT "DocumentTemplate_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedDocument" ADD CONSTRAINT "GeneratedDocument_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedDocument" ADD CONSTRAINT "GeneratedDocument_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "DocumentTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedDocument" ADD CONSTRAINT "GeneratedDocument_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedDocument" ADD CONSTRAINT "GeneratedDocument_generatedById_fkey" FOREIGN KEY ("generatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SignatureRequest" ADD CONSTRAINT "SignatureRequest_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProxyAlert" ADD CONSTRAINT "ProxyAlert_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobRequisition" ADD CONSTRAINT "JobRequisition_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobRequisition" ADD CONSTRAINT "JobRequisition_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BenefitPlan" ADD CONSTRAINT "BenefitPlan_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeBenefit" ADD CONSTRAINT "EmployeeBenefit_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeBenefit" ADD CONSTRAINT "EmployeeBenefit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeBenefit" ADD CONSTRAINT "EmployeeBenefit_planId_fkey" FOREIGN KEY ("planId") REFERENCES "BenefitPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Candidate" ADD CONSTRAINT "Candidate_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_jobRequisitionId_fkey" FOREIGN KEY ("jobRequisitionId") REFERENCES "JobRequisition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetAssignment" ADD CONSTRAINT "AssetAssignment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetAssignment" ADD CONSTRAINT "AssetAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetAssignment" ADD CONSTRAINT "AssetAssignment_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimesheetEntry" ADD CONSTRAINT "TimesheetEntry_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimesheetEntry" ADD CONSTRAINT "TimesheetEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimesheetEntry" ADD CONSTRAINT "TimesheetEntry_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OneOnOne" ADD CONSTRAINT "OneOnOne_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OneOnOne" ADD CONSTRAINT "OneOnOne_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OneOnOne" ADD CONSTRAINT "OneOnOne_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PulseSurvey" ADD CONSTRAINT "PulseSurvey_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PulseResponse" ADD CONSTRAINT "PulseResponse_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PulseResponse" ADD CONSTRAINT "PulseResponse_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "PulseSurvey"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HRDocument" ADD CONSTRAINT "HRDocument_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ColocationGraphCache" ADD CONSTRAINT "ColocationGraphCache_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FaceRegistration" ADD CONSTRAINT "FaceRegistration_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FaceRegistration" ADD CONSTRAINT "FaceRegistration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
