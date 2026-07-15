const prisma = require('../config/db');
const { PDFDocument, rgb } = require('pdf-lib');
const crypto = require('crypto');

exports.generatePFChallan = async (req, res) => {
  try {
    const { month } = req.body; // e.g. "2026-07"
    
    if (!month) {
      return res.status(400).json({ error: 'Month is required for generating PF Challan.' });
    }

    // 1. Fetch Payrolls for the given month to calculate total PF liability
    const payrolls = await prisma.payroll.findMany({
      where: {
        tenantId: req.user.tenantId,
        month: month
      },
      include: {
        user: true,
        legalEntity: true
      }
    });

    if (payrolls.length === 0) {
      return res.status(404).json({ error: 'No payroll records found for the specified month.' });
    }

    let totalPfEmployee = 0;
    let totalPfEmployer = 0;
    
    payrolls.forEach(p => {
      totalPfEmployee += p.pfEmployee || 0;
      totalPfEmployer += p.pfEmployer || 0;
    });

    const totalRemittance = totalPfEmployee + totalPfEmployer;

    // 2. Generate PDF
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([600, 400]);
    
    page.drawText('EMPLOYEES PROVIDENT FUND ORGANIZATION', { x: 50, y: 350, size: 18, color: rgb(0, 0, 0.5) });
    page.drawText('ELECTRONIC CHALLAN CUM RETURN (ECR)', { x: 50, y: 320, size: 14 });
    page.drawText(`Month/Year: ${month}`, { x: 50, y: 280, size: 12 });
    page.drawText(`Total Employees: ${payrolls.length}`, { x: 50, y: 260, size: 12 });
    page.drawText(`Total Employee Share: Rs ${totalPfEmployee.toFixed(2)}`, { x: 50, y: 240, size: 12 });
    page.drawText(`Total Employer Share: Rs ${totalPfEmployer.toFixed(2)}`, { x: 50, y: 220, size: 12 });
    page.drawText(`Total Remittance Amount: Rs ${totalRemittance.toFixed(2)}`, { x: 50, y: 190, size: 14, color: rgb(0, 0.5, 0) });
    
    page.drawText(`Generated via Crew HRMS on ${new Date().toISOString().split('T')[0]}`, { x: 50, y: 50, size: 10, color: rgb(0.5, 0.5, 0.5) });

    const pdfBytes = await pdfDoc.save();

    // 3. Hash the PDF for immutable audit trail
    const pdfHash = crypto.createHash('sha256').update(pdfBytes).digest('hex');

    // 4. Record to Audit Log with hash
    await prisma.auditLog.create({
      data: {
        actorId: req.user.id,
        action: 'STATUTORY_FILING_GENERATED',
        tenantId: req.user.tenantId,
        details: `Generated PF ECR Challan for ${month}. Total Remittance: Rs ${totalRemittance.toFixed(2)}`,
        hash: pdfHash
      }
    });

    // 5. Send PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=PF_Challan_${month}.pdf`);
    res.send(Buffer.from(pdfBytes));
    
  } catch (error) {
    console.error('Error generating PF Challan:', error);
    res.status(500).json({ error: error.message });
  }
};
