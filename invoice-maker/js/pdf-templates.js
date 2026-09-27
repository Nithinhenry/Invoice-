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
    primary: [124, 58, 237],      // #7c3aed Purple
    secondary: [109, 40, 217],
    headerBg: [243, 240, 255],
    altRowBg: [250, 248, 255],
    amountBg: [243, 240, 255],
    darkText: [17, 24, 39],
    grayText: [75, 85, 99],
    lightBg: [255, 255, 255]
  },
  'blue-modern': {
    primary: [30, 64, 175],       // #1e40af Blue
    secondary: [29, 78, 216],
    headerBg: [239, 246, 255],
    altRowBg: [248, 250, 252],
    amountBg: [239, 246, 255],
    darkText: [17, 24, 39],
    grayText: [75, 85, 99],
    lightBg: [255, 255, 255]
  },
  'minimal-dark': {
    primary: [17, 24, 39],        // #111827 Dark
    secondary: [31, 41, 55],
    headerBg: [243, 244, 246],
    altRowBg: [249, 250, 251],
    amountBg: [243, 244, 246],
    darkText: [17, 24, 39],
    grayText: [75, 85, 99],
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
  const pdfCurrency = cleanPdfText(getCurrency());
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let y = 15;

  const selectedKey = state.selectedTemplate || 'classic';
  const t = TEMPLATES[selectedKey] || TEMPLATES['classic'];
  const isDark = selectedKey === 'minimal-dark';

  function checkPageOverflow(neededHeight = 20) {
    if (y + neededHeight > pageHeight - margin) {
      doc.addPage();
      if (isDark) {
        doc.setFillColor(...t.lightBg);
        doc.rect(0, 0, pageWidth, pageHeight, 'F');
      }
      y = margin;
    }
  }

  // Dark template background
  if (isDark) {
    doc.setFillColor(...t.lightBg);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');
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

  doc.setFontSize(15);
  doc.setTextColor(...t.primary);
  doc.setFont('helvetica', 'bold');
  doc.text(cleanPdfText(s.company_name || 'Your Company'), companyX, y + 6);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...t.secondary);
  let cy = y + 11;
  if (s.tagline) { doc.text(cleanPdfText(s.tagline.toUpperCase()), companyX, cy); cy += 4; }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...t.grayText);
  if (s.company_address) { doc.text(cleanPdfText(s.company_address), companyX, cy); cy += 4.5; }
  if (s.gstin) { doc.text('GSTIN: ' + cleanPdfText(s.gstin), companyX, cy); cy += 4.5; }
  if (s.phone) { doc.text('Phone: ' + cleanPdfText(s.phone), companyX, cy); cy += 4.5; }
  if (s.email) { doc.text('Email: ' + cleanPdfText(s.email), companyX, cy); cy += 4.5; }

  // Invoice title — right
  doc.setFontSize(22);
  doc.setTextColor(...t.primary);
  doc.setFont('helvetica', 'bold');
  doc.text(cleanPdfText(invoice.document_type || 'INVOICE').toUpperCase(), pageWidth - margin, y + 7, { align: 'right' });

  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...t.darkText);
  doc.text(cleanPdfText(invoice.invoice_number), pageWidth - margin, y + 14, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...t.grayText);
  let iy = y + 19;
  if (invoice.invoice_name) { doc.text(cleanPdfText(invoice.invoice_name), pageWidth - margin, iy, { align: 'right' }); iy += 4.5; }
  doc.text('Date: ' + formatDate(invoice.invoice_date), pageWidth - margin, iy, { align: 'right' }); iy += 4.5;
  if (invoice.due_date) { doc.text('Due: ' + formatDate(invoice.due_date), pageWidth - margin, iy, { align: 'right' }); iy += 4.5; }

  y = Math.max(cy, iy) + 4;

  // Header line
  doc.setDrawColor(...t.primary);
  doc.setLineWidth(0.8);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  // ---- BILL TO / SHIP TO ----
  const halfWidth = (pageWidth - 2 * margin) / 2;

  doc.setFontSize(8);
  doc.setTextColor(...t.primary);
  doc.setFont('helvetica', 'bold');
  doc.text('BILL TO', margin, y);

  if (invoice.ship_address) {
    doc.text('SHIP TO', margin + halfWidth + 10, y);
  }
  y += 5;

  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...t.darkText);
  doc.text(cleanPdfText(invoice.client_name), margin, y);
  y += 5;

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...t.grayText);
  const billStartY = y;
  if (invoice.client_address) { doc.text(cleanPdfText(invoice.client_address), margin, y); y += 4.5; }
  if (invoice.client_gstin) { doc.text('GSTIN: ' + cleanPdfText(invoice.client_gstin), margin, y); y += 4.5; }
  if (invoice.client_phone) { doc.text('Phone: ' + cleanPdfText(invoice.client_phone), margin, y); y += 4.5; }
  if (invoice.client_email) { doc.text('Email: ' + cleanPdfText(invoice.client_email), margin, y); y += 4.5; }

  if (invoice.ship_address) {
    let shipY = billStartY;
    doc.text(cleanPdfText(invoice.ship_address), margin + halfWidth + 10, shipY, { maxWidth: halfWidth - 10 });
  }

  y += 6;

  // ---- SUBJECT LINE (If Present) ----
  if (invoice.subject) {
    checkPageOverflow(12);
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...t.primary);
    const subjLines = doc.splitTextToSize(cleanPdfText(invoice.subject), pageWidth - 2 * margin);
    doc.text(subjLines, margin, y);
    y += (subjLines.length * 4.5) + 3;
  }

  // ---- OPENER / GREETING (If Present) ----
  if (invoice.opener) {
    checkPageOverflow(12);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...t.darkText);
    const openerLines = doc.splitTextToSize(cleanPdfText(invoice.opener), pageWidth - 2 * margin);
    doc.text(openerLines, margin, y);
    y += (openerLines.length * 4) + 4;
  }

  // ---- ITEMS TABLE ----
  const tableRows = (invoice.items || []).map((item, idx) => [
    (idx + 1).toString(),
    cleanPdfText(item.description || ''),
    cleanPdfText(item.hsn_code || ''),
    (item.quantity != null ? item.quantity : 1).toString(),
    cleanPdfText(item.unit || ''),
    pdfCurrency + formatNumber(item.unit_price || 0),
    pdfCurrency + formatNumber(item.amount || 0)
  ]);

  doc.autoTable({
    startY: y,
    margin: { left: margin, right: margin },
    head: [['#', 'Description', 'HSN/SAC', 'Qty', 'Unit', 'Rate', 'Amount']],
    body: tableRows,
    headStyles: {
      fillColor: t.headerBg,
      textColor: t.primary,
      fontStyle: 'bold',
      fontSize: 8,
      cellPadding: 3.5
    },
    bodyStyles: {
      fontSize: 8.5,
      textColor: t.darkText,
      cellPadding: 3.5,
      fillColor: isDark ? t.lightBg : false
    },
    alternateRowStyles: { fillColor: t.altRowBg },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },  // #
      1: { cellWidth: 'auto', halign: 'left' }, // Description
      2: { cellWidth: 22, halign: 'center' }, // HSN/SAC
      3: { cellWidth: 14, halign: 'center' }, // Qty
      4: { cellWidth: 16, halign: 'center' }, // Unit
      5: { cellWidth: 28, halign: 'right' },  // Rate
      6: { cellWidth: 32, halign: 'right', fontStyle: 'bold' } // Amount
    },
    didParseCell: function(data) {
      if (data.section === 'head') {
        if ([0, 2, 3, 4].includes(data.column.index)) {
          data.cell.styles.halign = 'center';
        } else if ([5, 6].includes(data.column.index)) {
          data.cell.styles.halign = 'right';
        } else {
          data.cell.styles.halign = 'left';
        }
      }
    },
    theme: 'grid',
    styles: {
      lineColor: isDark ? [55, 65, 81] : [220, 220, 230],
      lineWidth: 0.3,
      overflow: 'linebreak'
    }
  });

  y = doc.lastAutoTable.finalY + 8;

  // ---- TOTALS ----
  const totalsWidth = 85;
  const totalsX = pageWidth - margin - totalsWidth;

  function addTotalLine(label, value, isBold = false, isRed = false) {
    checkPageOverflow(8);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', isBold ? 'bold' : 'normal');
    if (isRed) {
      doc.setTextColor(239, 68, 68);
    } else {
      doc.setTextColor(...(isBold ? t.primary : t.grayText));
    }
    doc.text(label, totalsX, y);
    doc.text(value, pageWidth - margin, y, { align: 'right' });
    y += 5.5;
  }

  addTotalLine('Subtotal', pdfCurrency + formatNumber(invoice.subtotal));

  if (invoice.discount && invoice.discount > 0) {
    addTotalLine('Discount', '-' + pdfCurrency + formatNumber(invoice.discount), false, true);
  }

  if (invoice.gst_type === 'cgst_sgst') {
    const halfRate = invoice.gst_rate / 2;
    const halfAmt = invoice.gst_amount / 2;
    addTotalLine(`CGST (${halfRate}%)`, pdfCurrency + formatNumber(halfAmt));
    addTotalLine(`SGST (${halfRate}%)`, pdfCurrency + formatNumber(halfAmt));
  } else if (invoice.gst_type === 'igst') {
    addTotalLine(`IGST (${invoice.gst_rate}%)`, pdfCurrency + formatNumber(invoice.gst_amount));
  }

  // Grand total line
  checkPageOverflow(12);
  doc.setDrawColor(...t.primary);
  doc.setLineWidth(0.5);
  doc.line(totalsX, y - 2, pageWidth - margin, y - 2);
  y += 3;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...t.primary);
  doc.text('Total', totalsX, y);
  doc.text(pdfCurrency + formatNumber(invoice.total), pageWidth - margin, y, { align: 'right' });
  y += 9;

  // Amount in words
  checkPageOverflow(14);
  doc.setFillColor(...t.amountBg);
  doc.roundedRect(margin, y, pageWidth - 2 * margin, 9, 2, 2, 'F');
  doc.setFontSize(8);
  doc.setTextColor(...t.grayText);
  doc.setFont('helvetica', 'normal');
  doc.text('Amount in Words: ' + cleanPdfText(numberToWords(invoice.total)) + ' Only', margin + 4, y + 6);
  y += 14;

  // CLOSER / SIGN-OFF (If Present)
  if (invoice.closer) {
    checkPageOverflow(12);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...t.darkText);
    const closerLines = doc.splitTextToSize(cleanPdfText(invoice.closer), pageWidth - 2 * margin);
    doc.text(closerLines, margin, y);
    y += (closerLines.length * 4) + 5;
  }

  // Bank Details
  if (s.bank_name || s.account_no) {
    checkPageOverflow(25);
    doc.setFontSize(8);
    doc.setTextColor(...t.primary);
    doc.setFont('helvetica', 'bold');
    doc.text('BANK DETAILS', margin, y);
    y += 4.5;

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...t.grayText);
    doc.setFontSize(8.5);
    if (s.bank_name) { doc.text('Bank: ' + cleanPdfText(s.bank_name), margin, y); y += 4; }
    if (s.account_no) { doc.text('Account: ' + cleanPdfText(s.account_no), margin, y); y += 4; }
    if (s.ifsc_code) { doc.text('IFSC: ' + cleanPdfText(s.ifsc_code), margin, y); y += 4; }
    if (s.upi_id) { doc.text('UPI: ' + cleanPdfText(s.upi_id), margin, y); y += 4; }
    y += 4;
  }

  // Specifications
  if (invoice.specifications) {
    checkPageOverflow(12);
    doc.setFontSize(8);
    doc.setTextColor(...t.grayText);
    doc.setFont('helvetica', 'normal');
    const specsLines = doc.splitTextToSize('Specifications: ' + cleanPdfText(invoice.specifications), pageWidth - 2 * margin);
    doc.text(specsLines, margin, y);
    y += (specsLines.length * 3.8) + 4;
  }

  // Notes
  if (invoice.notes) {
    checkPageOverflow(12);
    doc.setFontSize(8);
    doc.setTextColor(...t.grayText);
    doc.setFont('helvetica', 'italic');
    const noteLines = doc.splitTextToSize('Notes: ' + cleanPdfText(invoice.notes), pageWidth - 2 * margin);
    doc.text(noteLines, margin, y);
    y += (noteLines.length * 3.8) + 4;
  }

  // Terms
  if (invoice.terms) {
    checkPageOverflow(12);
    doc.setFontSize(8);
    doc.setTextColor(...t.grayText);
    doc.setFont('helvetica', 'normal');
    const termLines = doc.splitTextToSize('Terms & Conditions: ' + cleanPdfText(invoice.terms), pageWidth - 2 * margin);
    doc.text(termLines, margin, y);
    y += (termLines.length * 3.8) + 5;
  }

  // Signature
  checkPageOverflow(25);
  doc.setDrawColor(...t.grayText);
  doc.setLineWidth(0.3);
  const sigX = pageWidth - margin - 60;
  doc.line(sigX, y + 12, pageWidth - margin, y + 12);
  doc.setFontSize(8);
  doc.setTextColor(...t.grayText);
  doc.text('Authorized Signature', sigX, y + 17);

  // Save
  const safeClient = cleanPdfText(invoice.client_name).replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `${cleanPdfText(invoice.invoice_number)}_${safeClient}.pdf`;
  doc.save(filename);
  showToast('PDF downloaded successfully!', 'success');
}
