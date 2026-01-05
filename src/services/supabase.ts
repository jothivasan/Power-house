import { createClient } from "@supabase/supabase-js";

// Read Supabase configuration from environment variables
// These should be defined in .env or .env.local file
const SUPABASE_URL: string = import.meta.env.VITE_SUPABASE_URL || "";
const SUPABASE_ANON_KEY: string = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

// Check if Supabase is properly configured
export const isConfigured =
  SUPABASE_URL !== "" &&
  SUPABASE_URL !== "https://your-project-url.supabase.co" &&
  SUPABASE_ANON_KEY !== "" &&
  SUPABASE_ANON_KEY !== "your-anon-key-here";

// Create and export Supabase client
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  db: {
    schema: "journal",
  },
});

/**
-- ======================================================
-- FINAL PRODUCTION DATABASE SETUP (SUPABASE SQL EDITOR)
-- ======================================================

-- 1. Schema Initialization
CREATE SCHEMA IF NOT EXISTS journal;

-- 2. Permission Matrix
GRANT USAGE ON SCHEMA journal TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA journal GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA journal GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;

-- 3. Identity Protocol (Profiles)
CREATE TABLE IF NOT EXISTS journal.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  preferences JSONB DEFAULT '{"theme": "dark", "currency": "USD"}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Financial Nodes (Accounts)
CREATE TABLE IF NOT EXISTS journal.accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('Personal', 'CFD', 'Futures')),
  broker_firm TEXT NOT NULL,
  account_number TEXT,
  account_size NUMERIC NOT NULL CHECK (account_size > 0),
  challenge_type TEXT CHECK (challenge_type IN ('Instant', 'Single Phase', 'Two Phase', 'Three Phase')),
  status TEXT NOT NULL DEFAULT 'Phase 1' CHECK (status IN ('Phase 1', 'Phase 2', 'Phase 3', 'Live', 'Breached')),
  current_balance NUMERIC NOT NULL,
  phase_configs JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Execution Ledger (Trades)
CREATE TABLE IF NOT EXISTS journal.trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  account_id UUID REFERENCES journal.accounts(id) ON DELETE CASCADE,
  trade_date DATE NOT NULL DEFAULT CURRENT_DATE,
  symbol TEXT NOT NULL,
  market TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('Buy', 'Sell')),
  timeframe TEXT NOT NULL,
  entry_price NUMERIC NOT NULL,
  exit_price NUMERIC NOT NULL,
  stop_loss NUMERIC NOT NULL,
  take_profit NUMERIC NOT NULL,
  position_size NUMERIC,
  result TEXT NOT NULL CHECK (result IN ('Win', 'Loss', 'Breakeven')),
  pnl NUMERIC NOT NULL,
  risk_reward NUMERIC,
  strategy TEXT[] DEFAULT '{}',
  confirmations TEXT[] DEFAULT '{}',
  mistakes TEXT[] DEFAULT '{}',
  notes TEXT,
  screenshot_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Strategy Audits (Reviews)
CREATE TABLE IF NOT EXISTS journal.weekly_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  week DATE NOT NULL,
  what_worked TEXT,
  what_failed TEXT,
  mistakes TEXT,
  improvements TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS journal.monthly_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  month TEXT NOT NULL, -- Format: YYYY-MM
  total_trades INTEGER DEFAULT 0,
  win_rate NUMERIC DEFAULT 0,
  total_pnl NUMERIC DEFAULT 0,
  key_learnings TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Automated Financial Synchronization (Triggers)
-- Function to update account balance when trades are modified
CREATE OR REPLACE FUNCTION journal.sync_account_balance()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE journal.accounts 
    SET current_balance = current_balance + NEW.pnl,
        updated_at = NOW()
    WHERE id = NEW.account_id;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE journal.accounts 
    SET current_balance = current_balance - OLD.pnl,
        updated_at = NOW()
    WHERE id = OLD.account_id;
  ELSIF (TG_OP = 'UPDATE') THEN
    UPDATE journal.accounts 
    SET current_balance = current_balance - OLD.pnl + NEW.pnl,
        updated_at = NOW()
    WHERE id = NEW.account_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_balance
AFTER INSERT OR UPDATE OR DELETE ON journal.trades
FOR EACH ROW EXECUTE FUNCTION journal.sync_account_balance();

-- 8. Analytics View (Dashboard Intelligence)
CREATE OR REPLACE VIEW journal.user_analytics AS
SELECT 
  user_id,
  COUNT(*) as total_trades,
  COUNT(*) FILTER (WHERE result = 'Win') as wins,
  SUM(pnl) as total_net_pnl,
  AVG(risk_reward) as avg_rr,
  (COUNT(*) FILTER (WHERE result = 'Win')::NUMERIC / NULLIF(COUNT(*), 0) * 100) as win_rate
FROM journal.trades
GROUP BY user_id;

-- 9. Row Level Security Matrix
ALTER TABLE journal.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own profile" ON journal.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON journal.profiles FOR UPDATE USING (auth.uid() = id);

ALTER TABLE journal.accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Manage own accounts" ON journal.accounts FOR ALL USING (auth.uid() = user_id);

ALTER TABLE journal.trades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Manage own trades" ON journal.trades FOR ALL USING (auth.uid() = user_id);

ALTER TABLE journal.weekly_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Manage own weekly reviews" ON journal.weekly_reviews FOR ALL USING (auth.uid() = user_id);

ALTER TABLE journal.monthly_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Manage own monthly reviews" ON journal.monthly_reviews FOR ALL USING (auth.uid() = user_id);

-- 10. Performance Indexes
CREATE INDEX idx_trades_user_date ON journal.trades(user_id, trade_date);
CREATE INDEX idx_trades_account ON journal.trades(account_id);
CREATE INDEX idx_accounts_user ON journal.accounts(user_id);
*/
