require('dotenv').config();
const jwt = require('jsonwebtoken');
const prisma = require('./src/config/db');
const axios = require('axios');

async function run() {
  try {
    const user = await prisma.basePrisma.user.findFirst({
      include: { roleDefinition: true }
    });
    const token = jwt.sign({ _id: user.id }, process.env.JWT_SECRET);
    const res = await axios.post('http://localhost:5000/api/performance/goals', 
      { title: 'Test Goal', category: 'Individual', metricType: 'Percentage', targetValue: 100 },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log('Goal created', res.data);
  } catch (err) {
    console.error('Error:', err.response?.data || err.message);
  } finally {
    process.exit(0);
  }
}
run();
