// ============================================
// APP INITIALIZATION
// ============================================

async function initApp() {
  if (!state.user) {
    document.getElementById('login-view').style.display = 'flex';
    document.getElementById('app-layout').style.display = 'none';
    return;
  }

  document.getElementById('login-view').style.display = 'none';
  document.getElementById('app-layout').style.display = 'flex';

  const userName = state.user.name || state.user.email.split('@')[0];
  document.getElementById('welcome-text').textContent = `Welcome back, ${userName}!`;
  
  const sidebarUserEl = document.getElementById('sidebar-user-info');
  if (sidebarUserEl) {
    sidebarUserEl.innerHTML = `<div style="font-weight:600;color:var(--text-primary);">${userName}</div><div style="font-size:0.8rem;color:var(--text-muted);">${state.user.email}</div>`;
  }

  await loadSettings();

  if (!state.settings || !state.settings.company_name) {
    showToast('Set up your company details in Settings — they\'ll be remembered for your account!', 'info');
  }

  await loadInvoices();
  navigateTo('dashboard');
}

// Check session on page load
document.addEventListener('DOMContentLoaded', () => {
  checkSession();
});

