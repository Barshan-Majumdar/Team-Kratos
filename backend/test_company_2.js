const jwt = require('jsonwebtoken');
const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function test() {
  const user = await prisma.user.findFirst({ where: { roleDefinition: { level: 0 } } });
  
  const token = jwt.sign(
    { _id: user.id },
    process.env.JWT_SECRET || 'supersecretkey123',
    { expiresIn: '7d' }
  );
  
  try {
    const res = await axios.get('http://localhost:5000/api/console/company', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log(res.data);
  } catch (err) {
    console.error(err.response?.status, err.response?.data);
  }
}

test().finally(() => prisma.$disconnect());
