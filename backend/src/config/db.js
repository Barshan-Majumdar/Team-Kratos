const { PrismaClient } = require('@prisma/client');
const tenantStorage = require('../middleware/tenantContext');

const basePrisma = new PrismaClient();

const prisma = basePrisma.$extends({
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        const tenantId = tenantStorage.getStore();
        
        // Models that are inherently global and not scoped to a specific tenant
        const globalModels = ['Tenant']; 
        
        if (globalModels.includes(model)) {
          return query(args);
        }

        if (!tenantId) {
          // Strict enforcement: prevent accidental cross-tenant queries when context is missing.
          // For system-level operations (like login or signup), use prisma.basePrisma directly.
          throw new Error(`[Security] Attempted to query ${model} without a tenant context. Use prisma.basePrisma or provide a context via tenantStorage.`);
        }

        if (tenantId === 'SUPER_ADMIN_BYPASS') {
          // SuperAdmin requests bypass row-level security for cross-tenant management
          return query(args);
        }

        // Intercept and inject tenantId automatically
        const readWriteOperations = [
          'findUnique', 'findFirst', 'findMany', 'update', 'updateMany', 
          'delete', 'deleteMany', 'count', 'aggregate', 'groupBy'
        ];
        
        if (readWriteOperations.includes(operation)) {
          args.where = { ...args.where, tenantId };
        } else if (['create', 'createMany'].includes(operation)) {
          if (args.data) {
            if (Array.isArray(args.data)) {
              args.data = args.data.map(d => ({ ...d, tenantId }));
            } else {
              args.data.tenantId = tenantId;
            }
          }
        } else if (operation === 'upsert') {
          if (args.where) args.where = { ...args.where, tenantId };
          if (args.create) args.create.tenantId = tenantId;
        }

        return query(args);
      }
    }
  }
});

// Export the secured client as default, and attach basePrisma for internal auth routes
prisma.basePrisma = basePrisma;

module.exports = prisma;
