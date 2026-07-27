const prisma = require('../config/db');
const { sendNotification } = require('../utils/notificationEngine');

/**
 * Runs birthday check for a single tenant (strictly tenant-scoped).
 * Used by admin manual triggers and called per-tenant inside the daily cron loop.
 * @param {string} tenantId
 */
const runBirthdayCheckForTenant = async (tenantId) => {
  try {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    // 1. Tenant-Scoped Idempotency Check: prevent duplicate posts on cron reruns
    const existing = await prisma.announcement.findFirst({
      where: {
        tenantId,
        category: 'Birthday',
        createdAt: { gte: startOfDay }
      }
    });

    if (existing) {
      console.log(`[BirthdayJob] Birthday announcement already created today for tenant ${tenantId}. Skipping.`);
      return { status: 'skipped', reason: 'already_run_today', announcement: existing };
    }

    // 2. Query active users in tenant with matching dateOfBirth (MM-DD)
    const activeUsers = await prisma.user.findMany({
      where: {
        tenantId,
        status: 'Active',
        dateOfBirth: { not: null }
      },
      select: {
        id: true,
        displayName: true,
        avatar: true,
        dateOfBirth: true,
        userPreference: {
          select: { announceBirthday: true }
        }
      }
    });

    const targetMonth = today.getMonth(); // 0-11
    const targetDay = today.getDate();   // 1-31

    // 3. Filter users whose birthday is today AND who have NOT opted out
    const eligibleUsers = activeUsers.filter(user => {
      if (!user.dateOfBirth) return false;
      const dob = new Date(user.dateOfBirth);
      const isToday = dob.getMonth() === targetMonth && dob.getDate() === targetDay;
      const allowsAnnouncement = user.userPreference?.announceBirthday !== false;
      return isToday && allowsAnnouncement;
    });

    // 4. Empty-Batch Guard: return early if no eligible birthday users today
    if (eligibleUsers.length === 0) {
      console.log(`[BirthdayJob] No eligible birthday celebrations today for tenant ${tenantId}.`);
      return { status: 'completed', count: 0 };
    }

    // 5. Birth Year Masking & Batched Announcement Message
    const names = eligibleUsers.map(u => u.displayName || 'Team Member').join(', ');
    const title = eligibleUsers.length === 1 ? `🎉 Happy Birthday ${eligibleUsers[0].displayName}!` : `🎉 Birthdays Today!`;
    const message = eligibleUsers.length === 1
      ? `Wishing a very Happy Birthday to ${eligibleUsers[0].displayName}! Join us in celebrating their special day! 🎂`
      : `Wishing a very Happy Birthday to ${names}! Join us in celebrating our team members today! 🎂`;

    // 6. Create System Announcement (adminId: null)
    const announcement = await prisma.announcement.create({
      data: {
        tenantId,
        adminId: null,
        title,
        category: 'Birthday',
        message
      }
    });

    // 7. Dispatch single morning birthday email to each birthday recipient
    eligibleUsers.forEach(user => {
      sendNotification({
        userId: user.id,
        tenantId,
        type: 'BIRTHDAY_WISH',
        data: {
          displayName: user.displayName
        }
      });
    });

    return { status: 'success', count: eligibleUsers.length, announcement };
  } catch (error) {
    console.error(`[BirthdayJob] Error for tenant ${tenantId}:`, error);
    throw error;
  }
};

/**
 * Daily cron runner (unscoped loop over all active tenants).
 * Scheduled at 8:00 AM daily in cronJobs.js.
 */
const runAllTenantsBirthdayCheck = async () => {
  console.log('[CRON] Running Daily Birthday Check for all tenants...');
  try {
    const tenants = await prisma.basePrisma.tenant.findMany({
      select: { id: true }
    });

    for (const tenant of tenants) {
      await runBirthdayCheckForTenant(tenant.id).catch(err => {
        console.error(`[CRON] Birthday check failed for tenant ${tenant.id}:`, err.message);
      });
    }
    console.log('[CRON] Daily Birthday Check finished.');
  } catch (error) {
    console.error('[CRON] Error in runAllTenantsBirthdayCheck:', error);
  }
};

module.exports = {
  runBirthdayCheckForTenant,
  runAllTenantsBirthdayCheck
};
