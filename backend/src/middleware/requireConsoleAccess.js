const requireConsoleAccess = (req, res, next) => {
  // Enforce role.level <= 1 on the server side
  if (!req.user || !req.user.roleDefinition) {
    return res.status(403).json({ error: 'Forbidden: No role assigned.' });
  }
  
  if (req.user.roleDefinition.level > 1) {
    return res.status(403).json({ error: 'Forbidden: Console access requires higher privileges.' });
  }
  
  next();
};

module.exports = requireConsoleAccess;
