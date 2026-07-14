const jwt = require('jsonwebtoken');
const prisma = require('../config/db');
const tenantStorage = require('./tenantContext');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization').replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecret');
    
    // We use basePrisma here because we are authenticating and do not have a tenant context yet
    const user = await prisma.basePrisma.user.findUnique({ where: { id: decoded._id } });

    if (!user) {
      throw new Error();
    }

    req.token = token;
    req.user = user;

    // Inject the multi-tenant context for the remainder of the request lifecycle
    if (user.role === 'SuperAdmin') {
      tenantStorage.run('SUPER_ADMIN_BYPASS', () => {
        next();
      });
    } else if (user.tenantId) {
      tenantStorage.run(user.tenantId, () => {
        next();
      });
    } else {
      // User has no tenant (this shouldn't happen unless they are SuperAdmin, but fallback safely)
      next();
    }
    
  } catch (error) {
    res.status(401).send({ error: 'Please authenticate.' });
  }
};

module.exports = auth;
