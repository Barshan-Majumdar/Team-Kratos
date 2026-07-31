const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const res = await prisma.$queryRaw`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'AuditLog';
    `;
    const cols = res.map(r => r.column_name);
    console.log("Columns:", cols);

    if (!cols.includes('hash')) {
      console.log("Adding hash and prevHash columns...");
      await prisma.$executeRawUnsafe(`ALTER TABLE "AuditLog" ADD COLUMN "hash" TEXT;`);
      await prisma.$executeRawUnsafe(`ALTER TABLE "AuditLog" ADD COLUMN "prevHash" TEXT;`);
      console.log("Columns added.");
    } else {
      console.log("Columns already exist.");
    }

    // Now Step 2: add Postgres triggers
    console.log("Adding triggers...");
    await prisma.$executeRawUnsafe(`
      CREATE OR REPLACE FUNCTION prevent_audit_log_modification()
      RETURNS TRIGGER AS $$
      BEGIN
          RAISE EXCEPTION 'AuditLog is append-only. UPDATE and DELETE are strictly prohibited.';
      END;
      $$ LANGUAGE plpgsql;
    `);

    await prisma.$executeRawUnsafe(`DROP TRIGGER IF EXISTS prevent_audit_log_update ON "AuditLog";`);
    await prisma.$executeRawUnsafe(`
      CREATE TRIGGER prevent_audit_log_update
      BEFORE UPDATE ON "AuditLog"
      FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_modification();
    `);

    await prisma.$executeRawUnsafe(`DROP TRIGGER IF EXISTS prevent_audit_log_delete ON "AuditLog";`);
    await prisma.$executeRawUnsafe(`
      CREATE TRIGGER prevent_audit_log_delete
      BEFORE DELETE ON "AuditLog"
      FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_modification();
    `);
    console.log("Triggers added.");

  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}
main();
