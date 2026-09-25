// ============================================
// CONFIG & APP STATE
// ============================================

// Optional Supabase credentials
const SUPABASE_URL = '';         // e.g., https://xxxx.supabase.co
const SUPABASE_ANON_KEY = '';   // e.g., eyJhbGciOi...

let supabaseClient = null;
if (SUPABASE_URL && SUPABASE_ANON_KEY && typeof window.supabase !== 'undefined' && window.supabase.createClient) {
  try {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  } catch (err) {
    console.warn('Supabase client init failed, using local auth mode:', err);
  }
}

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

