// ============================================
// UTILITY FUNCTIONS
// ============================================

function getCurrency() {
  let sym = state.settings?.currency_symbol || 'Rs. ';
  if (sym === '₹') sym = 'Rs. ';
  return sym;
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function formatNumber(num) {
  // Indian numbering system
  if (num == null) return '0';
  const parts = parseFloat(num).toFixed(2).split('.');
  let intPart = parts[0];
  const decPart = parts[1];
  const lastThree = intPart.slice(-3);
  const rest = intPart.slice(0, -3);
  if (rest !== '') {
    intPart = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + lastThree;
  } else {
    intPart = lastThree;
  }
  return intPart + '.' + decPart;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ============================================
// NUMBER TO WORDS (Indian — Lakhs, Crores)
// ============================================
function numberToWords(num) {
  if (num === 0) return 'Zero Rupees';

  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function twoDigitWords(n) {
    if (n < 20) return ones[n];
    return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
  }

  function threeDigitWords(n) {
    if (n >= 100) {
      return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' and ' + twoDigitWords(n % 100) : '');
    }
    return twoDigitWords(n);
  }

  const intPart = Math.floor(Math.abs(num));
  const decPart = Math.round((Math.abs(num) - intPart) * 100);

  let words = '';
  if (intPart === 0) {
    words = 'Zero';
  } else {
    const crores = Math.floor(intPart / 10000000);
    const lakhs = Math.floor((intPart % 10000000) / 100000);
    const thousands = Math.floor((intPart % 100000) / 1000);
    const hundreds = intPart % 1000;

    if (crores) words += threeDigitWords(crores) + ' Crore ';
    if (lakhs) words += twoDigitWords(lakhs) + ' Lakh ';
    if (thousands) words += twoDigitWords(thousands) + ' Thousand ';
    if (hundreds) words += threeDigitWords(hundreds);
  }

  words = words.trim() + ' Rupees';
  if (decPart > 0) {
    words += ' and ' + twoDigitWords(decPart) + ' Paise';
  }
  return words;
}

// ============================================
// TOAST NOTIFICATIONS
// ============================================
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  const icons = {
    success: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>',
    error: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
    info: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
  };

  toast.innerHTML = (icons[type] || icons.info) + `<span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('hiding');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// ============================================
// NAVIGATION
// ============================================
function navigateTo(viewName) {
  state.currentView = viewName;
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  const targetView = document.getElementById('view-' + viewName);
  if (targetView) targetView.classList.add('active');

  document.querySelectorAll('.nav-item[data-view]').forEach(item => {
    item.classList.toggle('active', item.dataset.view === viewName);
  });

  document.getElementById('sidebar').classList.remove('open');

  if (viewName === 'dashboard') renderDashboard();
  else if (viewName === 'settings') populateSettingsForm();
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

// ============================================
// AUTOMATIC IMAGE CROPPING (TRIM WHITESPACE & MARGINS)
// ============================================
function cropWhitespaceFromImage(base64DataUrl) {
  return new Promise((resolve) => {
    if (!base64DataUrl || !base64DataUrl.startsWith('data:image')) {
      resolve(base64DataUrl);
      return;
    }

    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, img.width, img.height);
        const data = imageData.data;
        let minX = img.width, minY = img.height, maxX = 0, maxY = 0;
        let foundContent = false;

        for (let y = 0; y < img.height; y++) {
          for (let x = 0; x < img.width; x++) {
            const index = (y * img.width + x) * 4;
            const r = data[index];
            const g = data[index + 1];
            const b = data[index + 2];
            const alpha = data[index + 3];

            // Consider a pixel non-empty if it is not transparent AND not pure white / light gray background
            const isWhite = r > 240 && g > 240 && b > 240;
            const isTransparent = alpha < 20;

            if (!isTransparent && !isWhite) {
              foundContent = true;
              if (x < minX) minX = x;
              if (x > maxX) maxX = x;
              if (y < minY) minY = y;
              if (y > maxY) maxY = y;
            }
          }
        }

        if (!foundContent || maxX <= minX || maxY <= minY) {
          resolve(base64DataUrl);
          return;
        }

        // Add 6px padding around detected logo bounding box
        const padding = 6;
        minX = Math.max(0, minX - padding);
        minY = Math.max(0, minY - padding);
        maxX = Math.min(img.width - 1, maxX + padding);
        maxY = Math.min(img.height - 1, maxY + padding);

        const cropW = maxX - minX + 1;
        const cropH = maxY - minY + 1;

        const cropCanvas = document.createElement('canvas');
        cropCanvas.width = cropW;
        cropCanvas.height = cropH;
        const cropCtx = cropCanvas.getContext('2d');

        cropCtx.drawImage(
          img,
          minX, minY, cropW, cropH,
          0, 0, cropW, cropH
        );

        resolve(cropCanvas.toDataURL('image/png'));
      } catch (e) {
        console.warn('Canvas crop error, using original:', e);
        resolve(base64DataUrl);
      }
    };
    img.onerror = () => resolve(base64DataUrl);
    img.src = base64DataUrl;
  });
}

