const prisma = require('../config/db');
const { encryptEmbeddings } = require('../utils/embeddingCrypto');
const axios = require('axios');

const PYTHON_ENGINE_URL = () => process.env.PYTHON_ENGINE_URL || 'http://localhost:8000';

// 5MB payload limit per frame (Base64 of a 640x480 JPEG is ~100–200KB, so 5MB is very generous)
const MAX_FRAME_BYTES = 5 * 1024 * 1024;

/**
 * Strips the data:image/...;base64, prefix and returns a clean base64 string.
 * Also validates that the payload is within the size limit.
 */
function sanitizeBase64Frame(raw) {
  if (!raw || typeof raw !== 'string') return null;
  let clean = raw.includes(',') ? raw.split(',')[1] : raw;
  // Reject anything larger than 5MB to prevent payload exhaustion
  if (Buffer.byteLength(clean, 'base64') > MAX_FRAME_BYTES) return null;
  return clean;
}

exports.registerFace = async (req, res) => {
  try {
    const userId = req.user.id;
    const tenantId = req.user.tenantId;

    // --- Backend Strict Eligibility Validation ---
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { createdAt: true, biometricUnlocked: true, biometricUnlockExpiry: true }
    });

    if (!user) return res.status(404).json({ error: 'User not found.' });

    const now = new Date();
    const hoursSinceCreation = (now - new Date(user.createdAt)) / (1000 * 60 * 60);
    const isNew = hoursSinceCreation <= 72;
    const isUnlocked = user.biometricUnlocked && user.biometricUnlockExpiry && now < new Date(user.biometricUnlockExpiry);

    if (!isNew && !isUnlocked) {
      return res.status(403).json({ error: 'Access Denied. Your 72-hour registration window has closed, and no active admin unlock was found.' });
    }

    // Accept an array of 4 Base64 image frames
    const { frames } = req.body;

    if (!Array.isArray(frames) || frames.length !== 4) {
      return res.status(400).json({ error: 'Exactly 4 pose frames are required for registration.' });
    }

    const engineUrl = PYTHON_ENGINE_URL();
    const embeddings = [];

    // Process each frame — proxy to Python YOLO engine, extract 128D embedding
    for (let i = 0; i < frames.length; i++) {
      const cleanFrame = sanitizeBase64Frame(frames[i]);
      if (!cleanFrame) {
        return res.status(400).json({
          error: `Frame ${i + 1} is invalid or exceeds the 5MB size limit.`
        });
      }

      let engineData;
      try {
        const response = await axios.post(`${engineUrl}/register`, {
          image_base64: cleanFrame
        }, { timeout: 60000 }); // 60s timeout per frame for slow cloud CPUs
        engineData = response.data;
      } catch (axiosErr) {
        console.error(`[FaceReg] Python engine error on frame ${i + 1}:`, axiosErr.message);
        return res.status(503).json({ error: 'Face Engine is processing too slowly or unavailable. Please try again.' });
      }

      if (!engineData.success || !Array.isArray(engineData.encoding) || engineData.encoding.length !== 128) {
        const reason = engineData.error || 'NO_FACE_DETECTED';
        return res.status(400).json({
          error: `Pose ${i + 1} failed: ${reason}. Please ensure your face is clearly visible.`
        });
      }

      embeddings.push(engineData.encoding);
      // Immediately drop the raw frame from scope — images must NOT persist in memory
      frames[i] = null;
    }

    // All 4 embeddings collected — encrypt and store
    const encryptedBlob = encryptEmbeddings(embeddings);

    await prisma.faceRegistration.upsert({
      where: { userId },
      update: { encryptedEmbeddings: encryptedBlob, status: 'active', tenantId },
      create: { tenantId, userId, encryptedEmbeddings: encryptedBlob, status: 'active' }
    });

    // Mark face as registered AND consume the biometric unlock token (if active)
    await prisma.user.update({
      where: { id: userId },
      data: {
        faceRegistered: true,
        biometricUnlocked: false,       // consume the one-time unlock token
        biometricUnlockExpiry: null     // clear the expiry
      }
    });

    await prisma.auditLog.create({
      data: {
        tenantId,
        actorId: userId,
        action: 'FACE_REGISTRATION_COMPLETED',
        targetId: userId,
        details: {
          userId,
          captureCount: embeddings.length,
          status: 'active',
          engineUrl
        }
      }
    });

    // Audit the token consumption separately so admins can track it
    await prisma.auditLog.create({
      data: {
        tenantId,
        actorId: userId,
        action: 'BIOMETRIC_UNLOCK_CONSUMED',
        targetId: userId,
        details: { userId, note: 'Biometric unlock token consumed after successful re-registration.' }
      }
    }).catch(() => {}); // non-blocking — don't fail registration if this fails

    return res.status(200).json({
      success: true,
      message: 'Facial biometric profile successfully registered.'
    });

  } catch (error) {
    console.error('Register Face Error:', error);
    return res.status(500).json({ error: 'Failed to complete face registration. Please try again.' });
  }
};


exports.getRegistrationStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Fetch both registration status and user eligibility data
    const [registration, user] = await Promise.all([
      prisma.faceRegistration.findUnique({
        where: { userId },
        select: { status: true, updatedAt: true } // NEVER select encryptedEmbeddings
      }),
      prisma.user.findUnique({
        where: { id: userId },
        select: { 
          id: true,
          employeeId: true,
          displayName: true,
          email: true,
          department: true,
          avatar: true,
          createdAt: true, 
          biometricUnlocked: true, 
          biometricUnlockExpiry: true 
        }
      })
    ]);

    if (!user) return res.status(404).json({ error: 'User not found.' });

    // --- Eligibility Logic ---
    const now = new Date();
    const createdDate = new Date(user.createdAt);
    const hoursSinceCreation = (now - createdDate) / (1000 * 60 * 60);
    
    let isEligible = false;
    let eligibilityReason = '';

    if (hoursSinceCreation <= 72) {
      isEligible = true;
      eligibilityReason = 'New Employee Registration Window (72h)';
    } else if (user.biometricUnlocked && user.biometricUnlockExpiry && now < new Date(user.biometricUnlockExpiry)) {
      isEligible = true;
      eligibilityReason = 'Admin Granted Biometric Update Unlock';
    } else {
      isEligible = false;
      eligibilityReason = 'Access Expired. Contact your administrator to request a biometric update unlock.';
    }

    const isRegistered = !!(registration && registration.status === 'active');
    return res.status(200).json({
      isRegistered,
      status: registration ? registration.status : 'unregistered',
      updatedAt: registration ? registration.updatedAt : null,
      eligibility: {
        isEligible,
        reason: eligibilityReason,
        userContext: {
          id: user.id,
          employeeId: user.employeeId,
          displayName: user.displayName,
          email: user.email,
          department: user.department,
          avatar: user.avatar
        }
      }
    });
  } catch (error) {
    console.error('Get Registration Status Error:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.resetRegistration = async (req, res) => {
  try {
    const roleName = req.user?.roleDefinition?.name || req.user?.role;
    const userLevel = req.user?.roleDefinition?.level;
    const isAuthorized = ['SuperAdmin', 'CEO', 'Admin'].includes(roleName) || (userLevel !== undefined && userLevel <= 2);

    if (!isAuthorized) {
      return res.status(403).json({ error: 'Access denied: Require Admin or CEO permissions to reset face registration.' });
    }

    const { targetUserId } = req.params;

    const registration = await prisma.faceRegistration.findUnique({
      where: { userId: targetUserId }
    });

    if (!registration) {
      return res.status(404).json({ error: 'No face registration found for specified user.' });
    }

    await prisma.faceRegistration.update({
      where: { userId: targetUserId },
      data: { status: 'reset_required' }
    });

    await prisma.user.update({
      where: { id: targetUserId },
      data: { faceRegistered: false }
    });

    await prisma.auditLog.create({
      data: {
        tenantId: req.user.tenantId,
        actorId: req.user.id,
        action: 'FACE_REGISTRATION_RESET',
        targetId: targetUserId,
        details: {
          targetUserId,
          resetBy: req.user.id,
          newStatus: 'reset_required'
        }
      }
    });

    return res.status(200).json({
      success: true,
      message: 'Face registration status updated to reset_required.'
    });
  } catch (error) {
    console.error('Reset Registration Error:', error);
    return res.status(500).json({ error: 'Failed to reset face registration.' });
  }
};

/**
 * POST /api/face-registration/unlock/:targetUserId
 * Level 0/1 only — grants a one-time 48-hour biometric re-registration token to an employee.
 */
exports.grantBiometricUnlock = async (req, res) => {
  try {
    const callerLevel = req.user?.roleDefinition?.level;
    const callerRole  = req.user?.roleDefinition?.name || req.user?.role;
    const isAuthorized =
      ['SuperAdmin', 'CEO', 'Admin'].includes(callerRole) ||
      (callerLevel !== undefined && callerLevel <= 1);

    if (!isAuthorized) {
      return res.status(403).json({
        error: 'Access denied: Only SuperAdmin, CEO, or Admin can grant biometric unlocks.'
      });
    }

    const { targetUserId } = req.params;

    // Ensure target user exists and belongs to same tenant
    const targetUser = await prisma.user.findFirst({
      where: { id: targetUserId, tenantId: req.user.tenantId },
      select: { id: true, displayName: true, biometricUnlocked: true, biometricUnlockExpiry: true }
    });

    if (!targetUser) {
      return res.status(404).json({ error: 'Employee not found.' });
    }

    // Check if an active (non-expired) unlock already exists
    const now = new Date();
    if (targetUser.biometricUnlocked && targetUser.biometricUnlockExpiry && targetUser.biometricUnlockExpiry > now) {
      return res.status(409).json({
        error: 'This employee already has an active biometric unlock. Wait for it to expire or be used before issuing a new one.',
        expiresAt: targetUser.biometricUnlockExpiry
      });
    }

    const expiresAt = new Date(now.getTime() + 48 * 60 * 60 * 1000); // 48 hours from now

    await prisma.user.update({
      where: { id: targetUserId },
      data: {
        biometricUnlocked: true,
        biometricUnlockExpiry: expiresAt
      }
    });

    await prisma.auditLog.create({
      data: {
        tenantId: req.user.tenantId,
        actorId: req.user.id,
        action: 'BIOMETRIC_UNLOCK_GRANTED',
        targetId: targetUserId,
        details: {
          grantedBy: req.user.id,
          targetUserId,
          expiresAt,
          note: 'Admin granted one-time biometric re-registration token.'
        }
      }
    });

    return res.status(200).json({
      success: true,
      message: `Biometric update unlocked for ${targetUser.displayName || targetUserId}. Token expires in 48 hours.`,
      expiresAt
    });

  } catch (error) {
    console.error('Grant Biometric Unlock Error:', error);
    return res.status(500).json({ error: 'Failed to grant biometric unlock.' });
  }
};

/**
 * GET /api/face-registration/unlock-status
 * Employee calls this on their own dashboard to check if they have an active unlock token.
 * Auto-expires tokens on the server if they're past the expiry time.
 */
exports.getBiometricUnlockStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { biometricUnlocked: true, biometricUnlockExpiry: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const now = new Date();

    // Auto-expire on the server if the token has passed its TTL
    if (user.biometricUnlocked && user.biometricUnlockExpiry && user.biometricUnlockExpiry <= now) {
      await prisma.user.update({
        where: { id: userId },
        data: { biometricUnlocked: false, biometricUnlockExpiry: null }
      });
      return res.status(200).json({ unlocked: false, expiresAt: null });
    }

    return res.status(200).json({
      unlocked: user.biometricUnlocked,
      expiresAt: user.biometricUnlockExpiry || null
    });

  } catch (error) {
    console.error('Get Biometric Unlock Status Error:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};
