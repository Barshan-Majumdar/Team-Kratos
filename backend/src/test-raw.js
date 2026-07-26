// Test POOLER endpoint with extended timeout
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

// Use the pooler URL (the main DATABASE_URL)
const url = process.env.DATABASE_URL + '&connection_limit=2&pool_timeout=60';
console.log('Using POOLER URL host:', url.split('@')[1]?.split('/')[0]);

const prisma = new PrismaClient({
  datasources: { db: { url } }
});

async function test() {
  try {
    console.log('Connecting via pooler (60s timeout)...');
    const start = Date.now();
    const result = await prisma.$queryRaw`SELECT 1 as alive`;
    console.log(`Connected in ${Date.now() - start}ms:`, result);
    
    const users = await prisma.$queryRaw`SELECT COUNT(*) as cnt FROM "User"`;
    console.log('User count:', users);
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

test();
