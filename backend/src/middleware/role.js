const authorize = (...roles) => {
  return (req, res, next) => {
    const roleDef = req.user?.roleDefinition;

    if (!roleDef) {
      return res.status(401).json({ error: 'Unauthorized: No role attached to session.' });
    }

    // SuperAdmin is the one legitimate universal case — platform operator, tenantId IS NULL
    if (roleDef.name === 'SuperAdmin' && req.user.tenantId === null) {
      return next();
    }

    // Support legacy string names temporarily during migration
    if (roles.includes(roleDef.name)) {
      return next();
    }

    // Strict Level-Based RBAC
    const maxLevel = roles.find(r => typeof r === 'number');
    if (maxLevel !== undefined && roleDef.level <= maxLevel) {
       return next();
    }

    return res.status(403).json({ error: 'Forbidden: Insufficient privileges.' });
  };
};

module.exports = authorize;
