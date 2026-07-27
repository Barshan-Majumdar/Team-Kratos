const authorize = (...roles) => {
  return (req, res, next) => {
    const roleDef = req.user?.roleDefinition;

    if (!roleDef) {
      return res.status(401).json({ error: 'Unauthorized: No role attached to session.' });
    }

    // SuperAdmin is the platform-level operator (tenantId is NULL) — always bypass.
    // This is safe because tenantId being null cannot be faked by a tenant user.
    if (roleDef.name === 'SuperAdmin' && req.user.tenantId === null) {
      return next();
    }

    // Strict Level-Based RBAC only.
    // authorize(N) means: allow users whose roleDefinition.level is <= N
    // e.g. authorize(0) → Owner only
    //      authorize(1) → Owner + HR Admin
    //      authorize(2) → Owner + HR Admin + Manager
    // NOTE: Legacy string-name bypass has been intentionally removed to prevent
    //       a tenant role named 'Admin' from bypassing level checks.
    const maxLevel = roles.find(r => typeof r === 'number');
    if (maxLevel !== undefined && roleDef.level <= maxLevel) {
       return next();
    }

    return res.status(403).json({ error: 'Forbidden: Insufficient privileges.' });
  };
};

module.exports = authorize;
