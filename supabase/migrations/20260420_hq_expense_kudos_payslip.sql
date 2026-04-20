-- ── 경비 청구 테이블 ──
CREATE TABLE IF NOT EXISTS hq_expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date TEXT NOT NULL,
  category TEXT NOT NULL,
  amount INTEGER NOT NULL,
  description TEXT NOT NULL,
  receipt_url TEXT,
  status TEXT DEFAULT '대기',
  author TEXT NOT NULL,
  approver TEXT,
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE hq_expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hq_expenses_auth" ON hq_expenses FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- ── 칭찬 테이블 ──
CREATE TABLE IF NOT EXISTS hq_kudos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  from_name TEXT NOT NULL,
  to_name TEXT NOT NULL,
  message TEXT NOT NULL,
  emoji TEXT DEFAULT '👏',
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE hq_kudos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hq_kudos_auth" ON hq_kudos FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- ── 급여 명세서 테이블 ──
CREATE TABLE IF NOT EXISTS hq_payslips (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  month TEXT NOT NULL,
  name TEXT NOT NULL,
  base_pay INTEGER DEFAULT 0,
  overtime_pay INTEGER DEFAULT 0,
  bonus INTEGER DEFAULT 0,
  national_pension INTEGER DEFAULT 0,
  health_insurance INTEGER DEFAULT 0,
  employment_insurance INTEGER DEFAULT 0,
  income_tax INTEGER DEFAULT 0,
  total_pay INTEGER DEFAULT 0,
  total_deductions INTEGER DEFAULT 0,
  net_pay INTEGER DEFAULT 0,
  memo TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(month, name)
);
ALTER TABLE hq_payslips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hq_payslips_auth" ON hq_payslips FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
