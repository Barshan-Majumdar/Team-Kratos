const { PrismaClient, Prisma } = require('@prisma/client');
const prisma = new PrismaClient();

async function syncAllModels() {
  console.log("Fetching all database tables and columns...");
  const dbColsResult = await prisma.$queryRaw`
    SELECT table_name, column_name 
    FROM information_schema.columns 
    WHERE table_schema = 'public'
  `;

  // Map: tableName -> Set of columnNames
  const dbTablesMap = new Map();
  for (const row of dbColsResult) {
    if (!dbTablesMap.has(row.table_name)) {
      dbTablesMap.set(row.table_name, new Set());
    }
    dbTablesMap.get(row.table_name).add(row.column_name);
  }

  console.log("Found DB tables in public schema:", Array.from(dbTablesMap.keys()));

  const models = Prisma.dmmf.datamodel.models;
  console.log(`Checking ${models.length} Prisma models against database...`);

  for (const model of models) {
    const tableName = model.dbName || model.name;
    let dbCols = dbTablesMap.get(tableName);

    // If table doesn't exist at all, create it
    if (!dbCols) {
      console.log(`Table "${tableName}" does not exist in DB. Creating table...`);
      const fields = model.fields.filter(f => f.kind === 'scalar' || f.kind === 'enum');
      const colDefs = [];
      const primaryKeys = [];

      for (const field of fields) {
        let sqlType = 'TEXT';
        let defaultClause = '';

        if (field.isId) {
          primaryKeys.push(`"${field.name}"`);
        }

        if (field.type === 'Boolean') {
          sqlType = 'BOOLEAN';
          if (field.hasDefaultValue && typeof field.default === 'boolean') {
            defaultClause = ` DEFAULT ${field.default ? 'TRUE' : 'FALSE'}`;
          } else if (field.isRequired && !field.isId) {
            defaultClause = ` DEFAULT FALSE`;
          }
        } else if (field.type === 'Int') {
          sqlType = 'INTEGER';
          if (field.hasDefaultValue && typeof field.default === 'number') {
            defaultClause = ` DEFAULT ${field.default}`;
          } else if (field.isRequired && !field.isId) {
            defaultClause = ` DEFAULT 0`;
          }
        } else if (field.type === 'Float' || field.type === 'Decimal') {
          sqlType = 'DOUBLE PRECISION';
          if (field.hasDefaultValue && typeof field.default === 'number') {
            defaultClause = ` DEFAULT ${field.default}`;
          } else if (field.isRequired && !field.isId) {
            defaultClause = ` DEFAULT 0`;
          }
        } else if (field.type === 'DateTime') {
          sqlType = 'TIMESTAMP(3)';
          if (field.hasDefaultValue && field.default?.name === 'now') {
            defaultClause = ` DEFAULT CURRENT_TIMESTAMP`;
          }
        } else if (field.type === 'String' || field.kind === 'enum') {
          sqlType = 'TEXT';
          if (field.hasDefaultValue && typeof field.default === 'string') {
            defaultClause = ` DEFAULT '${field.default}'`;
          }
        } else if (field.type === 'Json') {
          sqlType = 'JSONB';
        }

        colDefs.push(`"${field.name}" ${sqlType}${defaultClause}`);
      }

      if (primaryKeys.length > 0) {
        colDefs.push(`PRIMARY KEY (${primaryKeys.join(', ')})`);
      }

      const createSql = `CREATE TABLE IF NOT EXISTS "${tableName}" (\n  ${colDefs.join(',\n  ')}\n);`;
      console.log(`Executing SQL:\n${createSql}`);
      await prisma.$executeRawUnsafe(createSql);
      
      // Re-fetch columns for this newly created table
      dbCols = new Set(fields.map(f => f.name));
      dbTablesMap.set(tableName, dbCols);
    }

    // Now check for any missing columns on scalar or enum fields
    const physicalFields = model.fields.filter(f => f.kind === 'scalar' || f.kind === 'enum');
    const missingFields = physicalFields.filter(f => !dbCols.has(f.name));

    if (missingFields.length > 0) {
      console.log(`\nTable "${tableName}" has ${missingFields.length} missing columns: ${missingFields.map(f => f.name).join(', ')}`);
      for (const field of missingFields) {
        let sqlType = 'TEXT';
        let defaultClause = '';

        if (field.type === 'Boolean') {
          sqlType = 'BOOLEAN';
          if (field.hasDefaultValue && typeof field.default === 'boolean') {
            defaultClause = ` DEFAULT ${field.default ? 'TRUE' : 'FALSE'}`;
          } else if (field.isRequired) {
            defaultClause = ` DEFAULT FALSE`;
          }
        } else if (field.type === 'Int') {
          sqlType = 'INTEGER';
          if (field.hasDefaultValue && typeof field.default === 'number') {
            defaultClause = ` DEFAULT ${field.default}`;
          } else if (field.isRequired) {
            defaultClause = ` DEFAULT 0`;
          }
        } else if (field.type === 'Float' || field.type === 'Decimal') {
          sqlType = 'DOUBLE PRECISION';
          if (field.hasDefaultValue && typeof field.default === 'number') {
            defaultClause = ` DEFAULT ${field.default}`;
          } else if (field.isRequired) {
            defaultClause = ` DEFAULT 0`;
          }
        } else if (field.type === 'DateTime') {
          sqlType = 'TIMESTAMP(3)';
          if (field.hasDefaultValue && field.default?.name === 'now') {
            defaultClause = ` DEFAULT CURRENT_TIMESTAMP`;
          }
        } else if (field.type === 'String' || field.kind === 'enum') {
          sqlType = 'TEXT';
          if (field.hasDefaultValue && typeof field.default === 'string') {
            defaultClause = ` DEFAULT '${field.default}'`;
          }
        } else if (field.type === 'Json') {
          sqlType = 'JSONB';
        }

        const sql = `ALTER TABLE "${tableName}" ADD COLUMN IF NOT EXISTS "${field.name}" ${sqlType}${defaultClause};`;
        console.log(`  Executing: ${sql}`);
        await prisma.$executeRawUnsafe(sql);
      }
    }
  }
  console.log("\nDatabase schema check completed successfully!");
}

syncAllModels()
  .catch(err => {
    console.error("Error syncing schema:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
