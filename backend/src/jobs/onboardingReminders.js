const prisma = require('../config/db');

const sendOnboardingReminders = async () => {
  try {
    const tenants = await prisma.basePrisma.tenant.findMany({
      select: { id: true, onboardingReminderDays: true }
    });

    for (const tenant of tenants) {
      const days = tenant.onboardingReminderDays || 3;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      // Find users who joined before cutoff date and haven't completed onboarding
      const stalledUsers = await prisma.basePrisma.user.findMany({
        where: {
          tenantId: tenant.id,
          onboardingCompleted: false,
          dateOfJoining: {
            lte: cutoffDate
          }
        },
        select: {
          id: true,
          email: true,
          displayName: true,
          onboardingStep: true,
          dateOfJoining: true
        }
      });

      if (stalledUsers.length > 0) {
        // Here we would integrate with notificationEngine.js to send emails/in-app notifications
        // Deferred implementation as per plan
        console.log(`Found ${stalledUsers.length} stalled onboarding users in tenant ${tenant.id}. Notifications deferred.`);
      }
    }
  } catch (error) {
    console.error('Error in sendOnboardingReminders cron job:', error);
  }
};

module.exports = {
  sendOnboardingReminders
};
