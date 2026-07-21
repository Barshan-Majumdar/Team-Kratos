const { initCronJobs } = require('./src/workers/cronJobs');
console.log('Testing init...');
try {
  initCronJobs();
  console.log('Success! Jobs initialized.');
} catch (e) {
  console.error(e);
}
setTimeout(() => process.exit(0), 1000);
