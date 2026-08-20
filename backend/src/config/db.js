const { PrismaClient } = require('@prisma/client');
const tenantStorage = require('../middleware/tenantContext');
const { generateAuditHash } = require('../utils/auditHashing');

// Build a DATABASE_URL with connection pool params that prevent idle connection kills
// from serverless/managed Postgres providers (Neon, Supabase, etc.)
const buildDatabaseUrl = () => {
  const base = process.env.DATABASE_URL || '';
  if (!base) return base;
  try {
    const url = new URL(base);
    // Reduce pool size & add keepalive to prevent idle connection resets (OS error 10054 / P1017)
    if (!url.searchParams.has('connection_limit'))  url.searchParams.set('connection_limit', '5');
    if (!url.searchParams.has('pool_timeout'))       url.searchParams.set('pool_timeout', '30');
    if (!url.searchParams.has('connect_timeout'))    url.searchParams.set('connect_timeout', '30');
    return url.toString();
  } catch {
    return base;
  }
};

const basePrisma = new PrismaClient({
  log: ['error'],
  datasourceUrl: buildDatabaseUrl(),
});

const prisma = basePrisma.$extends({
  query: {
    auditLog: {
      async create({ args, query }) {
        const tenantId = args.data.tenantId || tenantStorage.getStore();
        if (!tenantId || tenantId === 'SUPER_ADMIN_BYPASS') {
          // If no tenantId, we can't lock or hash properly per-tenant.
          // This should ideally not happen for auditLog.
        }

        return basePrisma.$transaction(async (tx) => {
          if (tenantId && tenantId !== 'SUPER_ADMIN_BYPASS') {
            await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${tenantId}))`;
          }

          const lastLog = await tx.auditLog.findFirst({
            where: { 
              tenantId: tenantId || null,
              hash: { not: null }
            },
            orderBy: { createdAt: 'desc' },
            select: { hash: true },
          });

          const prevHash = lastLog?.hash || 'GENESIS_HASH';
          args.data.prevHash = prevHash;

          const payloadToHash = {
            actorId: args.data.actorId,
            action: args.data.action,
            targetId: args.data.targetId,
            details: args.data.details,
          };
          args.data.hash = generateAuditHash(prevHash, payloadToHash);

          // If tenantId wasn't in args but we fetched it from store, add it
          if (!args.data.tenantId && tenantId && tenantId !== 'SUPER_ADMIN_BYPASS') {
            args.data.tenantId = tenantId;
          }

          return tx.auditLog.create({ data: args.data });
        }, {
          maxWait: 10000,
          timeout: 15000
        });
      },
    },
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
