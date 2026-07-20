const prisma = require('../config/db');

/**
 * Checks if the acting user can assign the target role.
 * Rule: A user may only create or invite a target role where target.level > actor.level,
 * unless the actor is the Owner (level 0), who can assign any level including another level 0.
 *
 * @param {Object} actingUser The user performing the action (must have roleDefinition populated).
 * @param {String} targetRoleId The ID of the role to be assigned.
 * @returns {Promise<Boolean>}
 */
const canAssignRole = async (actingUser, targetRoleId) => {
  if (!actingUser || !actingUser.roleDefinition) {
    return false;
  }

  const targetRole = await prisma.roleDefinition.findUnique({
    where: { id: targetRoleId }
  });

  if (!targetRole) {
    return false;
  }

  const actorLevel = actingUser.roleDefinition.level;

  // Level 0 (Owner) can assign any role, including another Level 0
  if (actorLevel === 0) {
    return true;
  }

  // All others can only assign roles with strictly greater level (lower authority)
  return targetRole.level > actorLevel;
};

module.exports = canAssignRole;
