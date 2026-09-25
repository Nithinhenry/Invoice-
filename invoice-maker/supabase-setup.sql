-- ============================================================
-- Invoice Maker — Supabase Database Setup
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- 1. Company Settings Table
CREATE TABLE IF NOT EXISTS company_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  company_name TEXT NOT NULL DEFAULT '',
  company_address TEXT DEFAULT '',
  tagline TEXT DEFAULT '',
  gstin TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  logo_base64 TEXT DEFAULT '',
  bank_name TEXT DEFAULT '',
  account_no TEXT DEFAULT '',
  ifsc_code TEXT DEFAULT '',
  upi_id TEXT DEFAULT '',
  default_gst_rate NUMERIC DEFAULT 18,
  invoice_prefix TEXT DEFAULT 'INV',
  currency_symbol TEXT DEFAULT '₹',
  default_terms TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- 2. Invoice Counter Table
CREATE TABLE IF NOT EXISTS invoice_counter (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  year INTEGER NOT NULL,
  last_number INTEGER DEFAULT 0,
  UNIQUE(user_id, year)
);

-- 3. Invoices Table
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  invoice_number TEXT NOT NULL,
  invoice_name TEXT DEFAULT '',
  client_name TEXT NOT NULL DEFAULT '',
  client_address TEXT DEFAULT '',
  client_gstin TEXT DEFAULT '',
  client_phone TEXT DEFAULT '',
  client_email TEXT DEFAULT '',
  ship_address TEXT DEFAULT '',
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  gst_type TEXT NOT NULL DEFAULT 'cgst_sgst' CHECK (gst_type IN ('cgst_sgst', 'igst', 'none')),
  gst_rate NUMERIC NOT NULL DEFAULT 18,
  discount NUMERIC NOT NULL DEFAULT 0,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  gst_amount NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  notes TEXT DEFAULT '',
  terms TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Invoice Items Table
CREATE TABLE IF NOT EXISTS invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE NOT NULL,
  item_order INTEGER DEFAULT 0,
  description TEXT NOT NULL DEFAULT '',
  hsn_code TEXT DEFAULT '',
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit TEXT DEFAULT 'pcs',
  unit_price NUMERIC NOT NULL DEFAULT 0,
  amount NUMERIC NOT NULL DEFAULT 0
);

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================

ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_counter ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;

-- Company Settings
CREATE POLICY "Users can view own settings" ON company_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own settings" ON company_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own settings" ON company_settings FOR UPDATE USING (auth.uid() = user_id);

-- Invoice Counter
CREATE POLICY "Users can view own counter" ON invoice_counter FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own counter" ON invoice_counter FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own counter" ON invoice_counter FOR UPDATE USING (auth.uid() = user_id);

-- Invoices
CREATE POLICY "Users can view own invoices" ON invoices FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own invoices" ON invoices FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own invoices" ON invoices FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own invoices" ON invoices FOR DELETE USING (auth.uid() = user_id);

-- Invoice Items (via parent invoice ownership)
CREATE POLICY "Users can view own invoice items" ON invoice_items FOR SELECT
  USING (EXISTS (SELECT 1 FROM invoices WHERE invoices.id = invoice_items.invoice_id AND invoices.user_id = auth.uid()));
CREATE POLICY "Users can insert own invoice items" ON invoice_items FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM invoices WHERE invoices.id = invoice_items.invoice_id AND invoices.user_id = auth.uid()));
CREATE POLICY "Users can update own invoice items" ON invoice_items FOR UPDATE
  USING (EXISTS (SELECT 1 FROM invoices WHERE invoices.id = invoice_items.invoice_id AND invoices.user_id = auth.uid()));
CREATE POLICY "Users can delete own invoice items" ON invoice_items FOR DELETE
  USING (EXISTS (SELECT 1 FROM invoices WHERE invoices.id = invoice_items.invoice_id AND invoices.user_id = auth.uid()));

-- ============================================================
-- Function: Get next invoice number (atomic, no duplicates)
-- ============================================================
CREATE OR REPLACE FUNCTION get_next_invoice_number(p_user_id UUID, p_year INTEGER, p_prefix TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_next_number INTEGER;
  v_invoice_number TEXT;
BEGIN
  INSERT INTO invoice_counter (user_id, year, last_number)
  VALUES (p_user_id, p_year, 1)
  ON CONFLICT (user_id, year)
  DO UPDATE SET last_number = invoice_counter.last_number + 1
  RETURNING last_number INTO v_next_number;

  v_invoice_number := p_prefix || '-' || p_year::TEXT || '-' || LPAD(v_next_number::TEXT, 4, '0');
  RETURN v_invoice_number;
END;
$$;
