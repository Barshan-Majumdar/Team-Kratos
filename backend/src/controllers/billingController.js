const prisma = require('../config/db');
const Razorpay = require('razorpay');
const crypto = require('crypto');

// Initialize Razorpay (stub if variables are missing)
let razorpay = null;
if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
  razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
}

// ── 0.3 Metered Subscription & Billing Engine ─────────────────────

exports.createSubscription = async (req, res) => {
  try {
    const { planId, totalCount } = req.body;
    
    if (!razorpay) {
      return res.status(400).json({ error: 'Razorpay credentials not configured.' });
    }

    const subscription = await razorpay.subscriptions.create({
      plan_id: planId,
      total_count: totalCount || 12,
      customer_notify: 1
    });

    const dbSub = await prisma.basePrisma.subscription.create({
      data: {
        tenantId: req.user.tenantId,
        razorpayPlanId: planId,
        status: subscription.status
      }
    });

    res.status(201).json({ subscription: dbSub, razorpaySubId: subscription.id });
  } catch (error) {
    console.error('Razorpay Error:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.razorpayWebhook = async (req, res) => {
  try {
    // Basic verification
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET || 'secret';
    const shasum = crypto.createHmac('sha256', secret);
    shasum.update(JSON.stringify(req.body));
    const digest = shasum.digest('hex');

    if (digest === req.headers['x-razorpay-signature']) {
      const event = req.body.event;
      if (event === 'subscription.charged') {
        const payload = req.body.payload.subscription.entity;
        
        await prisma.basePrisma.subscription.updateMany({
          where: { razorpayPlanId: payload.plan_id },
          data: { status: 'active' }
        });
        
        console.log(`[BILLING] Subscription ${payload.id} successfully charged.`);
      }
      res.status(200).json({ status: 'ok' });
    } else {
      res.status(403).json({ error: 'Invalid signature' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.calculateMeteredUsage = async (req, res) => {
  try {
    // Calculates active employees for billing
    const activeCount = await prisma.basePrisma.user.count({
      where: {
        tenantId: req.user.tenantId,
        status: 'Active'
      }
    });
    
    const currentMonth = new Date().toISOString().slice(0, 7);

    const record = await prisma.basePrisma.usageRecord.upsert({
      where: { tenantId_month: { tenantId: req.user.tenantId, month: currentMonth } },
      update: { activeEmployees: activeCount, updatedAt: new Date() },
      create: {
        tenantId: req.user.tenantId,
        month: currentMonth,
        activeEmployees: activeCount
      }
    });

    res.status(200).json({ activeEmployees: activeCount, record });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
