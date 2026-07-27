const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const { format } = require('date-fns');

const COMPENSATION_PLACEHOLDERS = [
  '{{baseSalary}}',
  '{{ctc}}',
  '{{salary}}',
  '{{compensation}}',
  '{{bonus}}',
  '{{allowances}}',
  '{{payRate}}'
];

/**
 * Helper: Interpolates placeholders and validates all referenced keys resolve to valid non-empty data
 */
const interpolateTemplate = (templateText, user, tenant, customVars = {}) => {
  if (!templateText) return { text: '', metadata: {} };

  const formattedJoiningDate = user.createdAt ? format(new Date(user.createdAt), 'MMMM d, yyyy') : '';
  const formattedCurrentDate = format(new Date(), 'MMMM d, yyyy');
  const formattedSalary = user.baseSalary ? `₹${Number(user.baseSalary).toLocaleString()}` : '';

  const resolverMap = {
    employeeName: user.displayName || '',
    employeeId: user.employeeId || user.id?.substring(0, 8)?.toUpperCase() || '',
    jobPosition: user.jobPosition || 'Employee',
    department: user.department || 'General',
    baseSalary: formattedSalary,
    ctc: formattedSalary,
    salary: formattedSalary,
    compensation: formattedSalary,
    bonus: customVars.bonus || '',
    allowances: customVars.allowances || '',
    payRate: formattedSalary,
    joiningDate: formattedJoiningDate,
    companyName: tenant?.name || 'Organization',
    companyAddress: tenant?.address || 'Corporate Headquarters',
    currentDate: formattedCurrentDate,
    currency: 'INR',
    ...customVars
  };

  // Extract all {{key}} placeholders in template
  const placeholderRegex = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;
  let match;
  const missingKeys = [];

  while ((match = placeholderRegex.exec(templateText)) !== null) {
    const key = match[1];
    const val = resolverMap[key];
    if (val === undefined || val === null || String(val).trim() === '') {
      if (!missingKeys.includes(key)) missingKeys.push(key);
    }
  }

  if (missingKeys.length > 0) {
    throw new Error(`Cannot generate document. Missing required employee data for placeholder(s): {{${missingKeys.join('}}, {{')}}}}. Please update employee profile first.`);
  }

  // Replace placeholders
  let interpolated = templateText;
  Object.entries(resolverMap).forEach(([k, v]) => {
    const reg = new RegExp(`\\{\\{\\s*${k}\\s*\\}\\}`, 'g');
    interpolated = interpolated.replace(reg, String(v));
  });

  // Snapshot metadata object for audit storage
  const metadataSnapshot = {
    resolvedAt: new Date().toISOString(),
    employeeId: user.id,
    employeeName: user.displayName,
    jobPosition: user.jobPosition,
    department: user.department,
    baseSalary: user.baseSalary ? Number(user.baseSalary) : null,
    interpolatedValues: resolverMap
  };

  return { text: interpolated, metadata: metadataSnapshot };
};

/**
 * Server-side PDF Renderer using pdf-lib
 * Produces clean, professional A4 PDF document buffers
 */
const renderPdfDocument = async ({ title, bodyText, headerText, footerText, metadata }) => {
  const pdfDoc = await PDFDocument.create();
  let page = pdfDoc.addPage([595.28, 841.89]); // Standard A4 (points)
  const { width, height } = page.getSize();

  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  const margin = 50;
  let cursorY = height - margin;

  // Header Banner
  if (headerText) {
    page.drawText(headerText.toUpperCase(), {
      x: margin,
      y: cursorY,
      size: 9,
      font: fontBold,
      color: rgb(0.38, 0.4, 0.94) // Indigo accent
    });
    cursorY -= 20;

    page.drawLine({
      start: { x: margin, y: cursorY },
      end: { x: width - margin, y: cursorY },
      thickness: 1,
      color: rgb(0.85, 0.88, 0.95)
    });
    cursorY -= 30;
  }

  // Document Title
  if (title) {
    page.drawText(title, {
      x: margin,
      y: cursorY,
      size: 18,
      font: fontBold,
      color: rgb(0.07, 0.09, 0.15) // Slate-900
    });
    cursorY -= 35;
  }

  // Word wrapping helper for pdf-lib text drawing
  const fontSize = 11;
  const lineHeight = 16;
  const maxWidth = width - margin * 2;

  const paragraphs = bodyText.split('\n');

  for (const para of paragraphs) {
    if (para.trim() === '') {
      cursorY -= 12;
      continue;
    }

    const words = para.split(' ');
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const lineWidth = fontRegular.widthOfTextAtSize(testLine, fontSize);

      if (lineWidth < maxWidth) {
        currentLine = testLine;
      } else {
        if (cursorY < margin + 60) {
          // Add new page if cursor reaches bottom
          page = pdfDoc.addPage([595.28, 841.89]);
          cursorY = height - margin - 30;
        }
        page.drawText(currentLine, {
          x: margin,
          y: cursorY,
          size: fontSize,
          font: fontRegular,
          color: rgb(0.2, 0.25, 0.33)
        });
        cursorY -= lineHeight;
        currentLine = word;
      }
    }

    if (currentLine) {
      if (cursorY < margin + 60) {
        page = pdfDoc.addPage([595.28, 841.89]);
        cursorY = height - margin - 30;
      }
      page.drawText(currentLine, {
        x: margin,
        y: cursorY,
        size: fontSize,
        font: fontRegular,
        color: rgb(0.2, 0.25, 0.33)
      });
      cursorY -= lineHeight;
    }
  }

  // Footer Line & Timestamp
  const footerY = margin + 15;
  page.drawLine({
    start: { x: margin, y: footerY + 15 },
    end: { x: width - margin, y: footerY + 15 },
    thickness: 1,
    color: rgb(0.9, 0.92, 0.95)
  });

  const footerStr = footerText || 'Official Document — Verified via Crew HRMS';
  page.drawText(footerStr, {
    x: margin,
    y: footerY,
    size: 8,
    font: fontOblique,
    color: rgb(0.6, 0.65, 0.72)
  });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
};

module.exports = {
  COMPENSATION_PLACEHOLDERS,
  interpolateTemplate,
  renderPdfDocument
};
