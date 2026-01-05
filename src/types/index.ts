// ============================================================================
// TYPE DEFINITIONS - Aligned with Database Schema
// ============================================================================

export type Market = "Forex" | "Crypto" | "Stocks" | "Commodities" | "Indices";
export type Direction = "Buy" | "Sell";
export type Result = "Win" | "Loss" | "Breakeven";
export type AccountType = "Personal" | "CFD" | "Futures";
export type ChallengeType =
  | "Instant"
  | "Single Phase"
  | "Two Phase"
  | "Three Phase";
export type AccountStatus =
  | "Phase 1"
  | "Phase 2"
  | "Phase 3"
  | "Live"
  | "Breached"
  | "Passed";
export type RuleCategory =
  | "Risk Management"
  | "Entry Rules"
  | "Exit Rules"
  | "Psychology"
  | "Time Management";

// ============================================================================
// USER & PROFILE
// ============================================================================

export interface AuthUser {
  id: string;
  email: string;
}

export interface UserProfile {
  id: string;
  full_name?: string;
  avatar_url?: string;
  preferences: {
    theme: "dark" | "light";
    currency: string;
    risk_percentage: number;
    max_daily_loss: number;
    timezone: string;
  };
  created_at: string;
  updated_at: string;
}

// ============================================================================
// ACCOUNTS
// ============================================================================

export interface PhaseConfig {
  target: number;
  max_loss: number;
  daily_loss: number;
  consistency_rule: number;
}

export interface Account {
  id: string;
  user_id: string;
  type: AccountType;
  broker_firm: string;
  account_number?: string;
  account_size: number;
  challenge_type?: ChallengeType;
  status: AccountStatus;
  current_balance: number;
  initial_balance: number; // NEW: Track starting balance
  phase_configs: Record<string, PhaseConfig>;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// TRADES
// ============================================================================

export interface Trade {
  id: string;
  user_id: string;
  account_id?: string;
  trade_date: string;
  symbol: string;
  market: Market;
  direction: Direction;
  timeframe: string;
  entry_price: number;
  exit_price: number;
  stop_loss: number;
  take_profit: number;
  position_size: number;
  result: Result;
  pnl: number;
  risk_reward: number;
  commission: number; // NEW: Track commission fees
  swap: number; // NEW: Track swap/overnight fees
  strategy: string[];
  confirmations: string[];
  mistakes: string[];
  notes: string;
  screenshot_url?: string;
  tags: string[]; // NEW: Custom tags for categorization
  created_at: string;
  updated_at: string;
}

// ============================================================================
// REVIEWS
// ============================================================================

export interface WeeklyReview {
  id: string;
  user_id: string;
  week_start: string; // Date format
  week_end: string; // Date format
  what_worked: string;
  what_failed: string;
  mistakes: string;
  improvements: string;
  goals_next_week: string; // NEW: Goals for upcoming week
  emotional_state: string; // NEW: Track emotional/psychological state
  created_at: string;
  updated_at: string;
}

export interface MonthlyReview {
  id: string;
  user_id: string;
  month: string; // Format: YYYY-MM
  total_trades: number;
  win_rate: number;
  total_pnl: number;
  best_day: number; // NEW: Best single day P&L
  worst_day: number; // NEW: Worst single day P&L
  key_learnings: string;
  goals_next_month: string; // NEW: Goals for next month
  created_at: string;
  updated_at: string;
}

// ============================================================================
// TRADING RULES (NEW)
// ============================================================================

export interface TradingRule {
  id: string;
  user_id: string;
  title: string;
  description: string;
  category: RuleCategory;
  is_active: boolean;
  priority: number;
  violated_count: number;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// ANALYTICS & DASHBOARD
// ============================================================================

export interface DashboardStats {
  totalTrades: number;
  winRate: number;
  totalPnl: number;
  avgRR: number;
  equityCurve: { date: string; equity: number }[];
  pnlByMonth: { month: string; pnl: number }[];
  winLossRatio: { name: string; value: number }[];
}

export interface UserAnalytics {
  user_id: string;
  total_trades: number;
  wins: number;
  losses: number;
  breakevens: number;
  total_net_pnl: number;
  avg_pnl: number;
  avg_rr: number;
  best_trade: number;
  worst_trade: number;
  win_rate: number;
  total_fees: number;
}

export interface DailyPerformance {
  user_id: string;
  trade_date: string;
  trades_count: number;
  daily_pnl: number;
  winning_pnl: number;
  losing_pnl: number;
  wins: number;
  losses: number;
  avg_rr: number;
}

export interface AccountPerformance {
  account_id: string;
  user_id: string;
  broker_firm: string;
  type: AccountType;
  status: AccountStatus;
  account_size: number;
  current_balance: number;
  initial_balance: number;
  total_profit: number;
  roi_percentage: number;
  total_trades: number;
  total_pnl: number;
  avg_rr: number;
  wins: number;
  losses: number;
}

export interface StrategyPerformance {
  user_id: string;
  strategy_name: string;
  times_used: number;
  wins: number;
  losses: number;
  total_pnl: number;
  avg_pnl: number;
  win_rate: number;
}
