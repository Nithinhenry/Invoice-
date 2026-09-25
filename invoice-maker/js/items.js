// ============================================
// LINE ITEMS TABLE MANAGEMENT
// ============================================

let itemCounter = 0;

function addItemRow(item = null) {
  itemCounter++;
  const tbody = document.getElementById('items-tbody');
  const rowNum = tbody.children.length + 1;
  const tr = document.createElement('tr');
  tr.dataset.itemId = itemCounter;

  tr.innerHTML = `
    <td class="col-sno" style="text-align:center;color:var(--text-muted);font-size:0.85rem;">${rowNum}</td>
    <td class="col-desc"><input type="text" class="form-input item-desc" value="${escapeHtml(item?.description || '')}" placeholder="Item description" required></td>
    <td class="col-hsn"><input type="text" class="form-input item-hsn" value="${escapeHtml(item?.hsn_code || '')}" placeholder="HSN"></td>
    <td class="col-qty"><input type="number" class="form-input item-qty" value="${item?.quantity || 1}" min="0" step="any" oninput="recalculateTotals()"></td>
    <td class="col-unit"><input type="text" class="form-input item-unit" value="${escapeHtml(item?.unit || 'pcs')}" placeholder="pcs"></td>
    <td class="col-rate"><input type="number" class="form-input item-rate" value="${item?.unit_price || 0}" min="0" step="any" oninput="recalculateTotals()"></td>
    <td class="col-amt"><span class="item-amount">${getCurrency()}${(item?.amount || 0).toFixed(2)}</span></td>
    <td class="col-action">
      <button type="button" class="remove-item-btn" onclick="removeItemRow(this)" title="Remove item">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </td>
  `;

  tbody.appendChild(tr);
}

function removeItemRow(btn) {
  const tbody = document.getElementById('items-tbody');
  if (tbody.children.length <= 1) {
    showToast('At least one item is required', 'info');
    return;
  }
  btn.closest('tr').remove();
  reindexItems();
  recalculateTotals();
}

function reindexItems() {
  const rows = document.getElementById('items-tbody').querySelectorAll('tr');
  rows.forEach((row, idx) => {
    row.querySelector('.col-sno').textContent = idx + 1;
  });
}

function getItemsFromForm() {
  const rows = document.getElementById('items-tbody').querySelectorAll('tr');
  const items = [];
  rows.forEach(row => {
    const qty = parseFloat(row.querySelector('.item-qty').value) || 0;
    const rate = parseFloat(row.querySelector('.item-rate').value) || 0;
    items.push({
      description: row.querySelector('.item-desc').value,
      hsn_code: row.querySelector('.item-hsn').value,
      quantity: qty,
      unit: row.querySelector('.item-unit').value,
      unit_price: rate,
      amount: parseFloat((qty * rate).toFixed(2))
    });
  });
  return items;
}

// ============================================
// GST CALCULATION
// ============================================
function recalculateTotals() {
  const items = getItemsFromForm();
  const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
  const discount = parseFloat(document.getElementById('inv-discount').value) || 0;
  const taxableAmount = subtotal - discount;

  const gstType = document.querySelector('input[name="gst-type"]:checked').value;
  const gstRate = parseFloat(document.getElementById('inv-gst-rate').value);
  const currency = getCurrency();

  // Update item amounts
  const rows = document.getElementById('items-tbody').querySelectorAll('tr');
  rows.forEach((row, idx) => {
    row.querySelector('.item-amount').textContent = currency + items[idx].amount.toFixed(2);
  });

  document.getElementById('disp-subtotal').textContent = currency + subtotal.toFixed(2);

  // Discount row
  const discountRow = document.getElementById('row-discount');
  if (discount > 0) {
    discountRow.style.display = 'flex';
    document.getElementById('disp-discount').textContent = '-' + currency + discount.toFixed(2);
  } else {
    discountRow.style.display = 'none';
  }

  // GST rate group visibility
  const gstRateGroup = document.getElementById('gst-rate-group');
  if (gstType === 'none') {
    gstRateGroup.style.display = 'none';
    document.getElementById('row-cgst').style.display = 'none';
    document.getElementById('row-sgst').style.display = 'none';
    document.getElementById('row-igst').style.display = 'none';
    document.getElementById('disp-total').textContent = currency + taxableAmount.toFixed(2);
  } else if (gstType === 'cgst_sgst') {
    gstRateGroup.style.display = 'block';
    const halfRate = gstRate / 2;
    const cgst = taxableAmount * halfRate / 100;
    const sgst = taxableAmount * halfRate / 100;
    const total = taxableAmount + cgst + sgst;

    document.getElementById('row-cgst').style.display = 'flex';
    document.getElementById('row-sgst').style.display = 'flex';
    document.getElementById('row-igst').style.display = 'none';

    document.getElementById('label-cgst').textContent = `CGST (${halfRate}%)`;
    document.getElementById('label-sgst').textContent = `SGST (${halfRate}%)`;
    document.getElementById('disp-cgst').textContent = currency + cgst.toFixed(2);
    document.getElementById('disp-sgst').textContent = currency + sgst.toFixed(2);
    document.getElementById('disp-total').textContent = currency + total.toFixed(2);
  } else {
    gstRateGroup.style.display = 'block';
    const igst = taxableAmount * gstRate / 100;
    const total = taxableAmount + igst;

    document.getElementById('row-cgst').style.display = 'none';
    document.getElementById('row-sgst').style.display = 'none';
    document.getElementById('row-igst').style.display = 'flex';

    document.getElementById('label-igst').textContent = `IGST (${gstRate}%)`;
    document.getElementById('disp-igst').textContent = currency + igst.toFixed(2);
    document.getElementById('disp-total').textContent = currency + total.toFixed(2);
  }
}
