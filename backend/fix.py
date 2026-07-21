import os

filepath = r"d:\Crew\backend\src\controllers\authController.js"
with open(filepath, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Truncate up to line 380 which is inside registerCompany
# Actually, let's just find the start of `// 4. Create Default Configurations`
idx = 0
for i, line in enumerate(lines):
    if '// 4. Create Default Configurations' in line:
        idx = i
        break

header = "".join(lines[:idx])

rest_of_file = """      // 4. Create Default Configurations
      await tx.payrollConfig.create({
        data: {
          tenantId: tenant.id,
          companyName: companyName,
          pfEmployeePercent: 12.0,
          pfEmployerPercent: 12.0,
          professionalTax: 200.0,
          standardAllowance: 4167.0
        }
      });

      await tx.leavePolicy.create({
        data: {
          tenantId: tenant.id,
          name: 'Annual Leave',
          annualQuota: 20,
          isPaid: true
        }
      });

      return user;
    });

    // Fire OTP Notification
    sendNotification({
      userId: result.id,
      tenantId: result.tenantId,
      channel: 'EMAIL',
      type: 'OTP_VERIFICATION',
      data: { otp: result.otpCode }
    });

    const token = generateAuthToken(result);
    const { password: _, ...safeUser } = result;

    res.cookie('jwt', token, {
      domain: process.env.NODE_ENV === 'production' ? '.crewhr.io' : 'localhost',
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.status(201).json({ user: safeUser, token });
  } catch (error) {
    console.error('Register company error:', error);
    res.status(500).json({ error: 'Failed to register company: ' + error.message });
  }
};

// ── Forgot Password ────────────────────────────────────────

const forgotPassword = async (req, res) => {
  try {
    const { email, origin } = req.body;
    if (!email) throw new Error('Email is required');

    const user = await prisma.basePrisma.user.findUnique({ where: { email } });
    if (!user) return res.json({ message: 'If the email exists, a reset link has been sent.' });

    const token = generateAuthToken(user);
    const resetLink = `${origin || 'http://localhost:3000'}/reset-password?token=${token}`;

    sendNotification({
      userId: user.id,
      tenantId: user.tenantId,
      channel: 'EMAIL',
      type: 'PASSWORD_RESET',
      data: { resetLink }
    });

    res.json({ message: 'If the email exists, a reset link has been sent.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(400).json({ error: error.message });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) throw new Error('Token and new password required');

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.basePrisma.user.update({
      where: { id: decoded._id },
      data: { password: hashedPassword, mustChangePassword: false }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(400).json({ error: 'Invalid or expired token' });
  }
};

// ── OTP Verification ───────────────────────────────────────

const verifyOTP = async (req, res) => {
  try {
    const { otp } = req.body;
    const user = await prisma.basePrisma.user.findUnique({ where: { id: req.user.id } });

    if (!user.otpCode || user.otpCode !== otp) {
      return res.status(400).json({ error: 'Invalid OTP' });
    }

    if (new Date() > new Date(user.otpExpiry)) {
      return res.status(400).json({ error: 'OTP has expired' });
    }

    // Capture whether this is the very first verification BEFORE updating
    const isFirstVerification = !user.emailVerified;

    const updatedUser = await prisma.basePrisma.user.update({
      where: { id: req.user.id },
      data: {
        emailVerified: true,
        otpCode: null,
        otpExpiry: null
      }
    });

    // Send welcome email ONLY once — on their very first successful verification
    if (isFirstVerification) {
      sendNotification({
        userId: req.user.id,
        tenantId: req.user.tenantId,
        channel: 'EMAIL',
        type: 'WELCOME_VERIFIED',
        data: {}
      });
    }

    const { password: _, ...safeUser } = updatedUser;
    res.json({ message: 'Email verified successfully', user: safeUser });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const resendOTP = async (req, res) => {
  try {
    const user = await prisma.basePrisma.user.findUnique({ where: { id: req.user.id } });

    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    await prisma.basePrisma.user.update({
      where: { id: req.user.id },
      data: { otpCode: otp, otpExpiry }
    });

    sendNotification({
      userId: user.id,
      tenantId: user.tenantId,
      channel: 'EMAIL',
      type: 'OTP_VERIFICATION',
      data: { otp }
    });

    res.json({ message: 'A new OTP has been sent to your email.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  signup,
  login,
  changePassword,
  getMe,
  registerCompany,
  verifyOTP,
  resendOTP,
  forgotPassword,
  resetPassword
};
"""

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(header + rest_of_file)
