require('dotenv').config();
const jwt = require('jsonwebtoken');
const prisma = require('./src/config/db');
const axios = require('axios');

async function run() {
  try {
    const user = await prisma.basePrisma.user.findFirst({
      include: { roleDefinition: true }
    });
    
    if (!user) {
      console.log('No user found');
      return;
    }

    const token = jwt.sign({ _id: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    
    const res = await axios.get('http://localhost:5000/api/performance/goals', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Goals API Success:', res.status, res.data.length, 'goals');
  } catch (err) {
    console.error('API Error:', err.response?.status, err.response?.data || err.message);
  } finally {
    process.exit(0);
  }
}
run();
