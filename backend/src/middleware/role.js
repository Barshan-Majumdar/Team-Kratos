const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user.roleDefinition || !roles.includes(req.user.roleDefinition.name)) {
      return res.status(403).json({ error: 'Forbidden: Insufficient privileges.' });
    }
    next();
  };
};

module.exports = authorize;
