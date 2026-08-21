const prisma = require('../config/db');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const ImageKit = require('imagekit');
const axios = require('axios');
const { seedTenantDocumentTemplates } = require('../utils/documentSeeder');
const { COMPENSATION_PLACEHOLDERS, interpolateTemplate, renderPdfDocument } = require('../utils/documentRenderer');
const { getSubordinateIds } = require('../utils/managerHierarchy');
const { sendNotification } = require('../utils/notificationEngine');

const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT
});

const UPLOADS_DIR = path.join(__dirname, '../../uploads/documents');

// Ensure uploads/documents directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

/**
 * GET /api/documents/templates — List all templates for tenant
 * Ensures default system templates are seeded idempotently
 */
const getTemplates = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;

    // Idempotent seeding check
    await seedTenantDocumentTemplates(tenantId);

    const templates = await prisma.documentTemplate.findMany({
      where: { tenantId },
      orderBy: [
        { isSystemDefault: 'desc' },
        { title: 'asc' }
      ]
    });

    res.json(templates);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * POST /api/documents/templates — Create custom template (Admin Level <= 1)
 */
const createTemplate = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const { title, type, bodyTemplate, headerText, footerText } = req.body;

    if (!title || !bodyTemplate) {
      return res.status(400).json({ error: 'Title and bodyTemplate are required.' });
    }

    // Write guard: isSystemDefault is stripped and strictly false for user-created templates
    const template = await prisma.documentTemplate.create({
      data: {
        tenantId,
        title,
        type: type || 'CUSTOM',
        bodyTemplate,
        headerText: headerText || null,
        footerText: footerText || null,
        isSystemDefault: false
      }
    });

    await prisma.auditLog.create({
      data: {
        tenantId,
        actorId: req.user.id,
        action: 'DOCUMENT_TEMPLATE_CREATED',
        details: { templateId: template.id, title: template.title, type: template.type }
      }
    });

    res.status(201).json(template);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * PUT /api/documents/templates/:id — Update template (Admin Level <= 1)
 */
const updateTemplate = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const { id } = req.params;
    const { title, bodyTemplate, headerText, footerText } = req.body;

    const existing = await prisma.documentTemplate.findFirst({
      where: { id, tenantId }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Document template not found.' });
    }

    // Protection Guard: System default templates cannot be modified
    if (existing.isSystemDefault) {
      return res.status(400).json({ error: 'System default templates cannot be modified. Duplicate the template to make custom edits.' });
    }

    const updated = await prisma.documentTemplate.update({
      where: { id },
      data: {
        title: title !== undefined ? title : existing.title,
        bodyTemplate: bodyTemplate !== undefined ? bodyTemplate : existing.bodyTemplate,
        headerText: headerText !== undefined ? headerText : existing.headerText,
        footerText: footerText !== undefined ? footerText : existing.footerText
      }
    });

    await prisma.auditLog.create({
      data: {
        tenantId,
        actorId: req.user.id,
        action: 'DOCUMENT_TEMPLATE_UPDATED',
        details: { templateId: updated.id, title: updated.title }
      }
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * DELETE /api/documents/templates/:id — Delete custom template (Admin Level <= 1)
 */
const deleteTemplate = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const { id } = req.params;

    const existing = await prisma.documentTemplate.findFirst({
      where: { id, tenantId }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Document template not found.' });
    }

    // Protection Guard: System default templates cannot be deleted
    if (existing.isSystemDefault) {
      return res.status(400).json({ error: 'System default templates cannot be deleted.' });
    }

    await prisma.documentTemplate.delete({
      where: { id }
    });

    await prisma.auditLog.create({
      data: {
        tenantId,
        actorId: req.user.id,
        action: 'DOCUMENT_TEMPLATE_DELETED',
        details: { templateId: id, title: existing.title }
      }
    });

    res.json({ message: 'Document template deleted successfully.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * POST /api/documents/generate — Generate PDF document for employee
 */
const generateDocument = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const userLevel = req.user.roleDefinition?.level ?? 3;
    const { userId, templateId, customTitle, customVars } = req.body;

    if (!userId || !templateId) {
      return res.status(400).json({ error: 'userId and templateId are required.' });
    }

    // 1. Strict RBAC Guard: Only Level 0 (Founder) and Level 1 (Admin) can generate documents
    if (userLevel > 1 && req.user.role !== 'Admin' && req.user.role !== 'SuperAdmin') {
      return res.status(403).json({ error: 'Forbidden: Document generation requires Admin (Level 0 or Level 1) privileges.' });
    }

    // 2. Cross-Tenant Guard & Entity Validation
    const targetUser = await prisma.user.findFirst({
      where: { id: userId, tenantId }
    });

    if (!targetUser) {
      return res.status(404).json({ error: 'Target employee not found in your organization.' });
    }

    const template = await prisma.documentTemplate.findFirst({
      where: { id: templateId, tenantId }
    });

    if (!template) {
      return res.status(404).json({ error: 'Document template not found.' });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId }
    });

    // 2. Explicit Compensation Vocabulary RBAC Guard (Rule F2 Compliance)
    const isSalaryDocumentType = ['OFFER_LETTER', 'SALARY_CERTIFICATE', 'PROMOTION_LETTER'].includes(template.type);
    const containsSalaryPlaceholder = COMPENSATION_PLACEHOLDERS.some(ph => template.bodyTemplate.includes(ph));

    if (isSalaryDocumentType || containsSalaryPlaceholder) {
      if (userLevel > 1 && req.user.role !== 'Admin' && req.user.role !== 'SuperAdmin') {
        return res.status(403).json({ error: 'Forbidden: Salary and compensation documents require Admin privileges.' });
      }
    }

    // 3. Manager Scope Guard (for non-salary documents like Experience/Relieving certs)
    if (userLevel === 2) {
      const subordinateIds = await getSubordinateIds(req.user.id, tenantId);
      if (!subordinateIds.includes(userId) && userId !== req.user.id) {
        return res.status(403).json({ error: 'Forbidden: You can only generate documents for direct/indirect subordinates in your hierarchy.' });
      }
    } else if (userLevel > 2 && req.user.role !== 'Admin') {
      return res.status(403).json({ error: 'Forbidden: Regular employees cannot generate official documents.' });
    }

    // 4. Pre-Rendering Placeholder Resolution & Validation
    const docTitle = customTitle || template.title;
    const { text: interpolatedBody, metadata } = interpolateTemplate(template.bodyTemplate, targetUser, tenant, customVars);

    // 5. Render PDF Buffer using pdf-lib
    const pdfBuffer = await renderPdfDocument({
      title: docTitle,
      bodyText: interpolatedBody,
      headerText: template.headerText,
      footerText: template.footerText,
      metadata
    });

    // 6. Secure ImageKit Cloud Storage
    const fileId = `doc-${uuidv4()}`;
    const fileName = `${docTitle.replace(/[^a-zA-Z0-9]/g, '_')}_${targetUser.displayName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
    
    let docUrl = '';
    let imagekitFileId = fileId;

    try {
      const uploadRes = await imagekit.upload({
        file: pdfBuffer.toString('base64'),
        fileName: fileName,
        folder: '/generated_documents'
      });
      docUrl = uploadRes.url;
      imagekitFileId = uploadRes.fileId || fileId;
    } catch (ikError) {
      console.error('[ImageKit Document Upload Error, using fallback]:', ikError.message);
      const filePath = path.join(UPLOADS_DIR, `${fileId}.pdf`);
      await fs.promises.writeFile(filePath, pdfBuffer);
    }

    // 7. Save GeneratedDocument Record
    const generatedDoc = await prisma.generatedDocument.create({
      data: {
        tenantId,
        templateId: template.id,
        userId: targetUser.id,
        generatedById: req.user.id,
        title: docTitle,
        fileId: imagekitFileId,
        fileName,
        mimeType: 'application/pdf',
        url: docUrl,
        metadata
      },
      include: {
        user: { select: { id: true, displayName: true, department: true } },
        generatedBy: { select: { id: true, displayName: true } }
      }
    });

    // 8. Audit Log & Notifications
    await prisma.auditLog.create({
      data: {
        tenantId,
        actorId: req.user.id,
        action: 'DOCUMENT_GENERATED',
        details: {
          documentId: generatedDoc.id,
          userId: targetUser.id,
          templateId: template.id,
          title: docTitle,
          fileId
        }
      }
    });

    await sendNotification({
      tenantId,
      recipientId: targetUser.id,
      type: 'DOCUMENT_GENERATED',
      title: `📄 Official HR Document Issued: ${docTitle}`,
      message: `Dear ${targetUser.displayName},\n\nAn official HR document "${docTitle}" has been issued for your record by ${req.user.displayName || 'HR Management'}.\n\nPlease find your official document attached to this email. You can also view and download it anytime from your Employee Portal.`,
      link: '/dashboard/documents',
      attachmentBase64: pdfBuffer.toString('base64'),
      attachmentName: fileName
    });

    res.status(201).json(generatedDoc);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

/**
 * GET /api/documents/my — List employee's own generated documents
 */
const getMyDocuments = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const userId = req.user.id;

    const docs = await prisma.generatedDocument.findMany({
      where: { tenantId, userId },
      include: {
        generatedBy: { select: { id: true, displayName: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(docs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * GET /api/documents/all — List generated documents for company / team
 */
const getAllDocuments = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const userLevel = req.user.roleDefinition?.level ?? 3;

    let whereClause = { tenantId };

    if (userLevel === 2) {
      const subordinateIds = await getSubordinateIds(req.user.id, tenantId);
      whereClause.userId = { in: subordinateIds };
    }

    const docs = await prisma.generatedDocument.findMany({
      where: whereClause,
      include: {
        user: { select: { id: true, displayName: true, department: true, jobPosition: true } },
        generatedBy: { select: { id: true, displayName: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(docs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * GET /api/documents/generated/:id/download — Protected PDF File Stream
 */
const downloadDocument = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const userLevel = req.user.roleDefinition?.level ?? 3;
    const { id } = req.params;

    const doc = await prisma.generatedDocument.findFirst({
      where: { id, tenantId }
    });

    if (!doc) {
      return res.status(404).json({ error: 'Document not found.' });
    }

    // Access control check: Recipient, authorized manager, or Admin
    const isRecipient = doc.userId === req.user.id;
    const isAdmin = userLevel <= 1 || req.user.role === 'Admin' || req.user.role === 'SuperAdmin';
    
    let isAuthorizedManager = false;
    if (userLevel === 2) {
      const subordinateIds = await getSubordinateIds(req.user.id, tenantId);
      isAuthorizedManager = subordinateIds.includes(doc.userId);
    }

    if (!isRecipient && !isAdmin && !isAuthorizedManager) {
      return res.status(403).json({ error: 'Forbidden: You do not have permission to view this document.' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${doc.fileName}"`);

    if (doc.url && doc.url.length > 0) {
      const cloudStream = await axios.get(doc.url, { responseType: 'stream' });
      return cloudStream.data.pipe(res);
    }

    const filePath = path.join(UPLOADS_DIR, `${doc.fileId}.pdf`);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Document file not found.' });
    }

    const readStream = fs.createReadStream(filePath);
    readStream.pipe(res);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  generateDocument,
  getMyDocuments,
  getAllDocuments,
  downloadDocument
};
