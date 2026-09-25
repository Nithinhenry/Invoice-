// ============================================
// PDF GENERATION — 3 TEMPLATES
// Classic Purple, Blue Modern, Minimal Dark
// ============================================

// Template picker
function openTemplateModal() {
  document.getElementById('template-modal').classList.add('active');
}

function closeTemplateModal() {
  document.getElementById('template-modal').classList.remove('active');
}

function selectTemplate(template) {
  state.selectedTemplate = template;
  document.querySelectorAll('.template-card').forEach(card => {
    card.classList.toggle('active', card.dataset.template === template);
  });
}

function confirmTemplateAndDownload() {
  closeTemplateModal();
  downloadPDF();
}

async function downloadInvoicePDF(invoiceId) {
  state.currentInvoiceId = invoiceId;
  await showInvoicePreview(invoiceId);
  openTemplateModal();
}

// ============================================
// TEMPLATE COLOR SCHEMES
// ============================================
const TEMPLATES = {
  'classic': {
    primary: [0, 0, 0],
    secondary: [50, 50, 50],
    headerBg: [245, 245, 245],
    altRowBg: [250, 250, 250],
    amountBg: [245, 245, 245],
    darkText: [0, 0, 0],
    grayText: [80, 80, 80],
    lightBg: [255, 255, 255]
  },
  'blue-modern': {
    primary: [0, 0, 0],
    secondary: [50, 50, 50],
    headerBg: [245, 245, 245],
    altRowBg: [250, 250, 250],
    amountBg: [245, 245, 245],
    darkText: [0, 0, 0],
    grayText: [80, 80, 80],
    lightBg: [255, 255, 255]
  },
  'minimal-dark': {
    primary: [0, 0, 0],
    secondary: [50, 50, 50],
    headerBg: [245, 245, 245],
    altRowBg: [250, 250, 250],
    amountBg: [245, 245, 245],
    darkText: [0, 0, 0],
    grayText: [80, 80, 80],
    lightBg: [255, 255, 255]
  }
};

// ============================================
// PDF GENERATOR
// ============================================
function downloadPDF() {
  const invoice = state.invoices.find(i => i.id === state.currentInvoiceId);
  if (!invoice) return;

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF('p', 'mm', 'a4');
  const s = state.settings || {};
  const currency = getCurrency();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let y = 20;

  const t = TEMPLATES[state.selectedTemplate] || TEMPLATES['classic'];
  const isDark = state.selectedTemplate === 'minimal-dark';

  // Dark template background
  if (isDark) {
    doc.setFillColor(...t.lightBg);
    doc.rect(0, 0, pageWidth, doc.internal.pageSize.getHeight(), 'F');
  }

  // ---- HEADER ----
  let companyX = margin;
  if (s.logo_base64) {
    try {
      const imgProps = doc.getImageProperties(s.logo_base64);
      const aspect = imgProps.width / imgProps.height;
      let logoH = 16;
      let logoW = logoH * aspect;
      if (logoW > 45) {
        logoW = 45;
        logoH = logoW / aspect;
      }
      doc.addImage(s.logo_base64, 'PNG', margin, y, logoW, logoH);
      companyX = margin + logoW + 6;
    } catch (e) {
      try {
        doc.addImage(s.logo_base64, 'PNG', margin, y, 25, 20);
        companyX = margin + 30;
      } catch (err) {
        companyX = margin;
      }
    }
  }

  doc.setFontSize(16);
  doc.setTextColor(...t.primary);
  doc.setFont('helvetica', 'bold');
  doc.text(s.company_name || 'Your Company', companyX, y + 6);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...t.secondary);
  let cy = y + 12;
  if (s.tagline) { doc.text(s.tagline.toUpperCase(), companyX, cy); cy += 4; }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...t.grayText);
  if (s.company_address) { doc.text(s.company_address, companyX, cy); cy += 5; }
  if (s.gstin) { doc.text('GSTIN: ' + s.gstin, companyX, cy); cy += 5; }
  if (s.phone) { doc.text('Phone: ' + s.phone, companyX, cy); cy += 5; }
  if (s.email) { doc.text('Email: ' + s.email, companyX, cy); cy += 5; }

  // Invoice title — right
  doc.setFontSize(26);
  doc.setTextColor(...t.primary);
  doc.setFont('helvetica', 'bold');
  doc.text((invoice.document_type || 'INVOICE').toUpperCase(), pageWidth - margin, y + 8, { align: 'right' });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...t.darkText);
  doc.text(invoice.invoice_number, pageWidth - margin, y + 16, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...t.grayText);
  let iy = y + 22;
  if (invoice.invoice_name) { doc.text(invoice.invoice_name, pageWidth - margin, iy, { align: 'right' }); iy += 5; }
  doc.text('Date: ' + formatDate(invoice.invoice_date), pageWidth - margin, iy, { align: 'right' }); iy += 5;
  if (invoice.due_date) { doc.text('Due: ' + formatDate(invoice.due_date), pageWidth - margin, iy, { align: 'right' }); iy += 5; }

  y = Math.max(cy, iy) + 5;

  // Header line
  doc.setDrawColor(...t.primary);
  doc.setLineWidth(isDark ? 0.5 : 0.8);
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;

  // ---- BILL TO / SHIP TO ----
  const halfWidth = (pageWidth - 2 * margin) / 2;

  doc.setFontSize(8);
  doc.setTextColor(...t.primary);
  doc.setFont('helvetica', 'bold');
  doc.text('BILL TO', margin, y);

  if (invoice.ship_address) {
    doc.text('SHIP TO', margin + halfWidth + 10, y);
  }
  y += 6;

  doc.setFontSize(11);
  doc.setTextColor(...t.darkText);
  doc.text(invoice.client_name, margin, y);
  y += 5;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...t.grayText);
  const billStartY = y;
  if (invoice.client_address) { doc.text(invoice.client_address, margin, y); y += 5; }
  if (invoice.client_gstin) { doc.text('GSTIN: ' + invoice.client_gstin, margin, y); y += 5; }
  if (invoice.client_phone) { doc.text('Phone: ' + invoice.client_phone, margin, y); y += 5; }
  if (invoice.client_email) { doc.text('Email: ' + invoice.client_email, margin, y); y += 5; }

  if (invoice.ship_address) {
    let shipY = billStartY;
    doc.text(invoice.ship_address, margin + halfWidth + 10, shipY, { maxWidth: halfWidth - 10 });
  }

  y += 6;

  // ---- SUBJECT LINE (If Present) ----
  if (invoice.subject) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...t.primary);
    const subjLines = doc.splitTextToSize(invoice.subject, pageWidth - 2 * margin);
    doc.text(subjLines, margin, y);
    y += (subjLines.length * 5) + 3;
  }

  // ---- OPENER / GREETING (If Present) ----
  if (invoice.opener) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...t.darkText);
    const openerLines = doc.splitTextToSize(invoice.opener, pageWidth - 2 * margin);
    doc.text(openerLines, margin, y);
    y += (openerLines.length * 4.5) + 4;
  }

  // ---- ITEMS TABLE ----
  const previewTable = document.querySelector('#invoice-preview-content table');
  const tableRows = [];
  if (previewTable) {
    const trs = previewTable.querySelectorAll('tbody tr');
    trs.forEach(tr => {
      const cells = tr.querySelectorAll('td');
      tableRows.push(Array.from(cells).map(td => td.textContent.trim()));
    });
  }

  doc.autoTable({
    startY: y,
    margin: { left: margin, right: margin },
    head: [['#', 'Description', 'HSN/SAC', 'Qty', 'Unit', 'Rate', 'Amount']],
    body: tableRows,
    headStyles: {
      fillColor: t.headerBg,
      textColor: [0, 0, 0],
      fontStyle: 'bold', fontSize: 8, cellPadding: 4
    },
    bodyStyles: {
      fontSize: 9, textColor: t.darkText, cellPadding: 4,
      fillColor: isDark ? t.lightBg : false
    },
    alternateRowStyles: { fillColor: t.altRowBg },
    columnStyles: {
      0: { cellWidth: 12, halign: 'center' },
      6: { halign: 'right', fontStyle: 'bold' }
    },
    theme: 'grid',
    styles: {
      lineColor: isDark ? [55, 65, 81] : [230, 230, 240],
      lineWidth: 0.3
    }
  });

  y = doc.lastAutoTable.finalY + 10;

  // ---- TOTALS ----
  const totalsX = pageWidth - margin - 80;

  function addTotalLine(label, value, isBold = false, isRed = false) {
    doc.setFontSize(9);
    doc.setFont('helvetica', isBold ? 'bold' : 'normal');
    if (isRed) {
      doc.setTextColor(239, 68, 68);
    } else {
      doc.setTextColor(...(isBold ? t.primary : t.grayText));
    }
    doc.text(label, totalsX, y);
    doc.text(value, pageWidth - margin, y, { align: 'right' });
    y += 6;
  }

  addTotalLine('Subtotal', currency + formatNumber(invoice.subtotal));

  if (invoice.discount && invoice.discount > 0) {
    addTotalLine('Discount', '-' + currency + formatNumber(invoice.discount), false, true);
  }

  if (invoice.gst_type === 'cgst_sgst') {
    const halfRate = invoice.gst_rate / 2;
    const halfAmt = invoice.gst_amount / 2;
    addTotalLine(`CGST (${halfRate}%)`, currency + formatNumber(halfAmt));
    addTotalLine(`SGST (${halfRate}%)`, currency + formatNumber(halfAmt));
  } else if (invoice.gst_type === 'igst') {
    addTotalLine(`IGST (${invoice.gst_rate}%)`, currency + formatNumber(invoice.gst_amount));
  }

  // Grand total line
  doc.setDrawColor(...t.primary);
  doc.setLineWidth(0.5);
  doc.line(totalsX, y - 2, pageWidth - margin, y - 2);
  y += 3;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...t.primary);
  doc.text('Total', totalsX, y);
  doc.text(currency + formatNumber(invoice.total), pageWidth - margin, y, { align: 'right' });
  y += 10;

  // Amount in words
  doc.setFillColor(...t.amountBg);
  doc.roundedRect(margin, y, pageWidth - 2 * margin, 10, 2, 2, 'F');
  doc.setFontSize(8);
  doc.setTextColor(...t.grayText);
  doc.setFont('helvetica', 'normal');
  doc.text('Amount in Words: ' + numberToWords(invoice.total) + ' Only', margin + 4, y + 6.5);
  y += 16;

  // CLOSER / SIGN-OFF (If Present)
  if (invoice.closer) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...t.darkText);
    const closerLines = doc.splitTextToSize(invoice.closer, pageWidth - 2 * margin);
    doc.text(closerLines, margin, y);
    y += (closerLines.length * 4.5) + 6;
  }

  // Bank Details
  if (s.bank_name || s.account_no) {
    doc.setFontSize(8);
    doc.setTextColor(...t.primary);
    doc.setFont('helvetica', 'bold');
    doc.text('BANK DETAILS', margin, y);
    y += 5;

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...t.grayText);
    doc.setFontSize(9);
    if (s.bank_name) { doc.text('Bank: ' + s.bank_name, margin, y); y += 4.5; }
    if (s.account_no) { doc.text('Account: ' + s.account_no, margin, y); y += 4.5; }
    if (s.ifsc_code) { doc.text('IFSC: ' + s.ifsc_code, margin, y); y += 4.5; }
    if (s.upi_id) { doc.text('UPI: ' + s.upi_id, margin, y); y += 4.5; }
    y += 5;
  }

  // Specifications
  if (invoice.specifications) {
    doc.setFontSize(8);
    doc.setTextColor(...t.grayText);
    doc.setFont('helvetica', 'normal');
    const specsLines = doc.splitTextToSize('Specifications: ' + invoice.specifications, pageWidth - 2 * margin);
    doc.text(specsLines, margin, y);
    y += (specsLines.length * 4) + 4;
  }

  // Notes
  if (invoice.notes) {
    doc.setFontSize(8);
    doc.setTextColor(...t.grayText);
    doc.setFont('helvetica', 'italic');
    const noteLines = doc.splitTextToSize('Notes: ' + invoice.notes, pageWidth - 2 * margin);
    doc.text(noteLines, margin, y);
    y += (noteLines.length * 4) + 4;
  }

  // Terms
  if (invoice.terms) {
    doc.setFontSize(8);
    doc.setTextColor(...t.grayText);
    doc.setFont('helvetica', 'normal');
    const termLines = doc.splitTextToSize('Terms & Conditions: ' + invoice.terms, pageWidth - 2 * margin);
    doc.text(termLines, margin, y);
    y += (termLines.length * 4) + 6;
  }

  // Signature
  doc.setDrawColor(...t.grayText);
  doc.setLineWidth(0.3);
  const sigX = pageWidth - margin - 60;
  doc.line(sigX, y + 15, pageWidth - margin, y + 15);
  doc.setFontSize(8);
  doc.setTextColor(...t.grayText);
  doc.text('Authorized Signature', sigX, y + 20);

  // Save
  const filename = `${invoice.invoice_number}_${invoice.client_name.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
  doc.save(filename);
  showToast('PDF downloaded!', 'success');
}
