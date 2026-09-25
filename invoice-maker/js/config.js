// ============================================
// CONFIG & APP STATE
// ============================================

// Supabase credentials (persisted in localStorage or configured)
let SUPABASE_URL = localStorage.getItem('supabase_url') || '';
let SUPABASE_ANON_KEY = localStorage.getItem('supabase_anon_key') || '';

let supabaseClient = null;
function initSupabase(url, key) {
  const targetUrl = (url || SUPABASE_URL || '').trim();
  const targetKey = (key || SUPABASE_ANON_KEY || '').trim();
  if (targetUrl && targetKey && typeof window.supabase !== 'undefined' && window.supabase.createClient) {
    try {
      supabaseClient = window.supabase.createClient(targetUrl, targetKey);
      SUPABASE_URL = targetUrl;
      SUPABASE_ANON_KEY = targetKey;
      return true;
    } catch (err) {
      console.warn('Supabase client init failed:', err);
      return false;
    }
  }
  return false;
}
initSupabase();

const state = {
  user: null,
  settings: null,
  invoices: [],
  currentInvoiceId: null,
  currentView: 'dashboard',
  filter: 'all',
  selectedTemplate: 'classic',
  nextInvoiceNum: 1,
  isSignUp: false
};

