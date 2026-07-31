const prisma = require('../config/db');

const getCompliancePreview = async (req, res) => {
  try {
    const { month } = req.params;
    const roleDef = req.user?.roleDefinition;
    
    if (!roleDef) return res.status(401).json({ error: 'Unauthorized: No role attached to session.' });
    
    const isManager = roleDef.level === 2;
    const isAdminOrCEO = roleDef.level <= 1 || roleDef.name === 'SuperAdmin';
    
    let userQuery = { tenantId: req.user.tenantId, status: 'Active' };
    if (isManager && !isAdminOrCEO) {
      userQuery.managerId = req.user.id;
    } else if (!isAdminOrCEO) {
      return res.status(403).json({ error: 'Forbidden: Insufficient privileges.' });
    }

    const [yearStr, monthStr] = month.split('-');
    const year = parseInt(yearStr);
    const monthIndex = parseInt(monthStr) - 1;

    const users = await prisma.user.findMany({
      where: userQuery,
      include: {
        shiftPolicy: true,
        attendances: {
          where: {
            date: {
              gte: new Date(year, monthIndex, 1),
              lt: new Date(year, monthIndex + 1, 1)
            }
          }
        },
        leaves: {
          where: {
            status: 'Approved',
            startDate: { lt: new Date(year, monthIndex + 1, 1) },
            endDate: { gte: new Date(year, monthIndex, 1) }
          },
          include: { leavePolicy: true }
        }
      }
    });

    const { computeShiftCompliance } = require('../utils/shiftComplianceEngine');
    const results = users.map(user => {
      const compliance = computeShiftCompliance(
        user.attendances,
        user.shiftPolicy,
        user.baseSalary,
        user.leaves
      );
      return {
        userId: user.id,
        displayName: user.displayName,
        employeeId: user.employeeId,
        compliance
      };
    });

    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getUserCompliancePreview = async (req, res) => {
  try {
    const { month, userId } = req.params;
    const roleDef = req.user?.roleDefinition;
    
    if (!roleDef) return res.status(401).json({ error: 'Unauthorized: No role attached to session.' });
    
    const isManager = roleDef.level === 2;
    const isAdminOrCEO = roleDef.level <= 1 || roleDef.name === 'SuperAdmin';
    const isSelf = req.user.id === userId;

    if (!isAdminOrCEO && !isSelf && !isManager) {
      return res.status(403).json({ error: 'Forbidden: Insufficient privileges.' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId, tenantId: req.user.tenantId },
      include: {
        shiftPolicy: true,
        attendances: {
          where: {
            date: {
              gte: new Date(new Date(month + '-01').getFullYear(), new Date(month + '-01').getMonth(), 1),
              lt: new Date(new Date(month + '-01').getFullYear(), new Date(month + '-01').getMonth() + 1, 1)
            }
          }
        },
        leaves: {
          where: {
            status: 'Approved',
            startDate: { lt: new Date(new Date(month + '-01').getFullYear(), new Date(month + '-01').getMonth() + 1, 1) },
            endDate: { gte: new Date(new Date(month + '-01').getFullYear(), new Date(month + '-01').getMonth(), 1) }
          },
          include: { leavePolicy: true }
        }
      }
    });

    if (!user) return res.status(404).json({ error: 'User not found' });

    if (isManager && !isAdminOrCEO && !isSelf) {
      if (user.managerId !== req.user.id) {
        return res.status(403).json({ error: 'Forbidden: Not a direct report.' });
      }
    }

    const { computeShiftCompliance } = require('../utils/shiftComplianceEngine');
    const compliance = computeShiftCompliance(
      user.attendances,
      user.shiftPolicy,
      user.baseSalary,
      user.leaves
    );

    res.json({
      userId: user.id,
      displayName: user.displayName,
      employeeId: user.employeeId,
      compliance
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getCompliancePreview,
  getUserCompliancePreview
};
