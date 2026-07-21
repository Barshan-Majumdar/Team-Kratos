const jwt = require('jsonwebtoken');
const prisma = require('../config/db');
const tenantStorage = require('./tenantContext');

const auth = async (req, res, next) => {
  try {
    let token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token && req.cookies && req.cookies.jwt) {
      token = req.cookies.jwt;
    }
    if (!token) throw new Error('No token provided');

    if (!process.env.JWT_SECRET) {
      throw new Error('FATAL: JWT_SECRET environment variable is not defined.');
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // We use basePrisma here because we are authenticating and do not have a tenant context yet
    const user = await prisma.basePrisma.user.findUnique({ 
      where: { id: decoded._id },
      include: { roleDefinition: true }
    });

    if (!user) {
      throw new Error();
    }

    req.token = token;
    req.user = user;

    // Inject the multi-tenant context for the remainder of the request lifecycle
    if (user.roleDefinition && user.roleDefinition.name === 'SuperAdmin') {
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
