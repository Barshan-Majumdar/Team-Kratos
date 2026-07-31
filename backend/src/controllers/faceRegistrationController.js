const prisma = require('../config/db');
const { encryptEmbeddings } = require('../utils/embeddingCrypto');

exports.registerFace = async (req, res) => {
  try {
    const { embeddings } = req.body;

    // Strict contract: embeddings array required, no image data permitted
    if (!Array.isArray(embeddings) || embeddings.length < 1) {
      return res.status(400).json({ error: 'Four facial embedding vectors are required for registration.' });
    }

    // Check for any image payloads (Section 3 rule)
    const bodyStr = JSON.stringify(req.body);
    if (bodyStr.includes('data:image') || bodyStr.includes('base64') || req.body.image || req.body.photo) {
      return res.status(400).json({ error: 'Security violation: Raw image uploads are strictly forbidden. Only numeric embeddings are accepted.' });
    }

    // Validate that each embedding is a 128-element array of numbers
    for (const vec of embeddings) {
      if (!Array.isArray(vec) || vec.length !== 128 || !vec.every(n => typeof n === 'number')) {
        return res.status(400).json({ error: 'Invalid vector format: Each embedding must be a 128-dimensional numeric array.' });
      }
    }

    const encryptedBlob = encryptEmbeddings(embeddings);
    const tenantId = req.user.tenantId;
    const userId = req.user.id;

    // Upsert registration record
    await prisma.faceRegistration.upsert({
      where: { userId },
      update: {
        encryptedEmbeddings: encryptedBlob,
        status: 'active',
        tenantId
      },
      create: {
        tenantId,
        userId,
        encryptedEmbeddings: encryptedBlob,
        status: 'active'
      }
    });

    // Update User record faceRegistered boolean flag
    await prisma.user.update({
      where: { id: userId },
      data: { faceRegistered: true }
    });

    // Write audit log via hash-chaining extension (never logging embeddings)
    await prisma.auditLog.create({
      data: {
        tenantId,
        actorId: userId,
        action: 'FACE_REGISTRATION_COMPLETED',
        targetId: userId,
        details: {
          userId,
          captureCount: embeddings.length,
          status: 'active'
        }
      }
    });

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
    const registration = await prisma.faceRegistration.findUnique({
      where: { userId },
      select: { status: true, updatedAt: true } // NEVER select encryptedEmbeddings
    });

    const isRegistered = !!(registration && registration.status === 'active');
    return res.status(200).json({
      isRegistered,
      status: registration ? registration.status : 'unregistered',
      updatedAt: registration ? registration.updatedAt : null
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
