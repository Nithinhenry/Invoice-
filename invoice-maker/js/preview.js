// ============================================
// INVOICE PREVIEW (HTML — in-app view)
// ============================================

async function showInvoicePreview(invoiceId) {
  state.currentInvoiceId = invoiceId;
  const invoice = state.invoices.find(i => i.id === invoiceId);
  if (!invoice) return;

  const items = invoice.items || [];

  const s = state.settings || {};
  const currency = getCurrency();
  const templateClass = 'template-' + state.selectedTemplate;

  let logoHTML = '';
  if (s.logo_base64) {
    logoHTML = `<div class="company-logo-preview"><img src="${s.logo_base64}" alt="Logo"></div>`;
  }

  let bankHTML = '';
  if (s.bank_name || s.account_no) {
    bankHTML = `
      <div class="bank-details">
        <h4>Bank Details</h4>
        ${s.bank_name ? `<p><strong>Bank:</strong> ${escapeHtml(s.bank_name)}</p>` : ''}
        ${s.account_no ? `<p><strong>Account:</strong> ${escapeHtml(s.account_no)}</p>` : ''}
        ${s.ifsc_code ? `<p><strong>IFSC:</strong> ${escapeHtml(s.ifsc_code)}</p>` : ''}
        ${s.upi_id ? `<p><strong>UPI:</strong> ${escapeHtml(s.upi_id)}</p>` : ''}
      </div>
    `;
  }

  let gstRows = '';
  if (invoice.gst_type === 'cgst_sgst') {
    const halfRate = invoice.gst_rate / 2;
    const halfAmt = invoice.gst_amount / 2;
    gstRows = `
      <div class="total-line"><span>CGST (${halfRate}%)</span><span>${currency}${formatNumber(halfAmt)}</span></div>
      <div class="total-line"><span>SGST (${halfRate}%)</span><span>${currency}${formatNumber(halfAmt)}</span></div>
    `;
  } else if (invoice.gst_type === 'igst') {
    gstRows = `
      <div class="total-line"><span>IGST (${invoice.gst_rate}%)</span><span>${currency}${formatNumber(invoice.gst_amount)}</span></div>
    `;
  }

  const discountRow = (invoice.discount && invoice.discount > 0) ?
    `<div class="total-line"><span>Discount</span><span style="color:#ef4444;">-${currency}${formatNumber(invoice.discount)}</span></div>` : '';

  const itemRows = (items || []).map((item, idx) => `
    <tr>
      <td>${idx + 1}</td>
      <td>${escapeHtml(item.description)}</td>
      <td>${escapeHtml(item.hsn_code || '')}</td>
      <td>${item.quantity}</td>
      <td>${escapeHtml(item.unit || '')}</td>
      <td>${currency}${formatNumber(item.unit_price)}</td>
      <td>${currency}${formatNumber(item.amount)}</td>
    </tr>
  `).join('');

  const container = document.getElementById('invoice-preview-content');
  container.className = `invoice-preview-container ${templateClass}`;

  container.innerHTML = `
    <div class="preview-header">
      <div>
        ${logoHTML}
        <div class="company-info">
          <h2>${escapeHtml(s.company_name || 'Your Company')}</h2>
          ${s.tagline ? `<p class="tagline">${escapeHtml(s.tagline)}</p>` : ''}
          ${s.company_address ? `<p>${escapeHtml(s.company_address)}</p>` : ''}
          ${s.gstin ? `<p><strong>GSTIN:</strong> ${escapeHtml(s.gstin)}</p>` : ''}
          ${s.phone ? `<p>📞 ${escapeHtml(s.phone)}</p>` : ''}
          ${s.email ? `<p>✉ ${escapeHtml(s.email)}</p>` : ''}
        </div>
      </div>
      <div class="invoice-meta">
        <h1>${escapeHtml(invoice.document_type || 'INVOICE')}</h1>
        <p><strong>${escapeHtml(invoice.invoice_number)}</strong></p>
        ${invoice.invoice_name ? `<p>${escapeHtml(invoice.invoice_name)}</p>` : ''}
        <p>Date: ${formatDate(invoice.invoice_date)}</p>
        ${invoice.due_date ? `<p>Due: ${formatDate(invoice.due_date)}</p>` : ''}
      </div>
    </div>

    <div class="addresses-row">
      <div class="address-block">
        <h3>Bill To</h3>
        <p><strong>${escapeHtml(invoice.client_name)}</strong></p>
        ${invoice.client_address ? `<p>${escapeHtml(invoice.client_address)}</p>` : ''}
        ${invoice.client_gstin ? `<p>GSTIN: ${escapeHtml(invoice.client_gstin)}</p>` : ''}
        ${invoice.client_phone ? `<p>📞 ${escapeHtml(invoice.client_phone)}</p>` : ''}
        ${invoice.client_email ? `<p>✉ ${escapeHtml(invoice.client_email)}</p>` : ''}
      </div>
      ${invoice.ship_address ? `
        <div class="address-block">
          <h3>Ship To</h3>
          <p>${escapeHtml(invoice.ship_address)}</p>
        </div>
      ` : ''}
    </div>

    ${invoice.subject ? `<div style="margin: 16px 0 12px 0; font-weight: 700; font-size: 1rem; color: #111827; text-decoration: underline;">${escapeHtml(invoice.subject)}</div>` : ''}

    ${invoice.opener ? `<div style="margin-bottom: 16px; font-size: 0.92rem; color: #374151; white-space: pre-line; line-height: 1.5;">${escapeHtml(invoice.opener)}</div>` : ''}

    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Description</th>
          <th>HSN/SAC</th>
          <th>Qty</th>
          <th>Unit</th>
          <th>Rate</th>
          <th>Amount</th>
        </tr>
      </thead>
      <tbody>
        ${itemRows}
      </tbody>
    </table>

    <div class="totals-section">
      <div class="totals-inner">
        <div class="total-line"><span>Subtotal</span><span>${currency}${formatNumber(invoice.subtotal)}</span></div>
        ${discountRow}
        ${gstRows}
        <div class="total-line grand"><span>Total</span><span>${currency}${formatNumber(invoice.total)}</span></div>
      </div>
    </div>

    <div class="amount-words">
      <strong>Amount in Words:</strong> ${numberToWords(invoice.total)} Only
    </div>

    ${invoice.closer ? `<div style="margin: 16px 0 20px 0; font-size: 0.92rem; color: #374151; white-space: pre-line; line-height: 1.5; font-style: italic;">${escapeHtml(invoice.closer)}</div>` : ''}

    ${bankHTML}
    
    ${invoice.specifications ? `<div class="notes-section"><strong>Specifications:</strong><br>${escapeHtml(invoice.specifications).replace(/\n/g, '<br>')}</div>` : ''}

    ${invoice.notes ? `<div class="notes-section"><strong>Notes:</strong><br>${escapeHtml(invoice.notes).replace(/\n/g, '<br>')}</div>` : ''}
    ${invoice.terms ? `<div class="terms-section"><strong>Terms & Conditions:</strong><br>${escapeHtml(invoice.terms)}</div>` : ''}

    <div class="signature-line">
      <p>Authorized Signature</p>
      <br>
      <p>_________________________</p>
    </div>
  `;

  navigateTo('invoice-preview');
}

function editCurrentInvoice() {
  if (state.currentInvoiceId) editInvoice(state.currentInvoiceId);
}
