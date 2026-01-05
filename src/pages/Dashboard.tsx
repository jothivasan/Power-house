import React, { useEffect, useState, useMemo } from "react";
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ComposedChart,
  Area,
  Line,
  PieChart,
  Pie,
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from "recharts";
import { supabase } from "../services/supabase";
import { Trade, Account, AccountType } from "../types";
import { useAuth } from "../App";

type Section = "OVERVIEW" | "WEEKLY" | "MONTHLY" | "ACCOUNTS";
type Period = "Year" | "Month" | "Week" | "Day";

interface DashboardData {
  trades: Trade[];
  accounts: Account[];
  totalTrades: number;
  winRate: number;
  performanceProfit: number;
  netProfit: number;
  avgRR: number;
  equityHigh: number;
  dailyPnl: {
    date: string;
    pnl: number;
    cumulative: number;
    isHigh: boolean;
    drawdown: number;
  }[];
  pnlByMonth: { month: string; pnl: number }[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-black border border-white p-4 font-mono text-[10px] uppercase shadow-[0_0_20px_rgba(255,255,255,0.05)]">
        <p className="text-zinc-400 mb-3 border-b border-zinc-800 pb-2 tracking-widest">
          {label}
        </p>
        {payload.map((p: any, i: number) => {
          const isPercent =
            p.name.toLowerCase().includes("rate") ||
            p.name.toLowerCase().includes("ratio") ||
            p.unit === "%";
          return (
            <div
              key={i}
              className="flex justify-between items-center gap-6 mb-1"
            >
              <span className="text-zinc-400">{p.name}</span>
              <span style={{ color: p.color || p.fill }} className="font-black">
                {p.value < 0 ? "-" : "+"}
                {!isPercent ? "$" : ""}
                {Math.abs(p.value).toLocaleString()}
                {isPercent ? "%" : ""}
              </span>
            </div>
          );
        })}
      </div>
    );
  }
  return null;
};

const SetupWinRateRadarCard = ({ trades }: { trades: Trade[] }) => {
  const radarData = useMemo(() => {
    const setups = [
      "Breakout",
      "Pullback",
      "Support",
      "Reversal",
      "Trend Follow",
      "Trade",
      "Gap Fill",
    ];

    return setups.map((s) => {
      const filtered = trades.filter((t) =>
        (t.strategy || []).some((strat) =>
          strat.toLowerCase().includes(s.toLowerCase().replace(" ", ""))
        )
      );
      const wins = filtered.filter((t) => t.result === "Win").length;
      const total = filtered.length;
      const rate = total > 0 ? (wins / total) * 100 : 0;

      return {
        subject: s.toUpperCase(),
        rate: Math.round(rate),
        fullMark: 100,
      };
    });
  }, [trades]);

  return (
    <div className="bg-pure-black border border-white p-10 flex flex-col h-full animate-in fade-in slide-in-from-bottom-2 duration-1000">
      <div className="mb-8">
        <h3 className="text-xl font-bold tracking-tight text-white uppercase italic">
          Setup Win Rate Comparison
        </h3>
        <p className="text-zinc-400 text-[9px] font-black uppercase tracking-[0.3em] mt-1">
          Efficiency Distribution across core archetypes
        </p>
      </div>

      <div className="flex-1 w-full min-h-[350px]">
        {trades.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
              <PolarGrid stroke="#222" />
              <PolarAngleAxis
                dataKey="subject"
                tick={{
                  fill: "#666",
                  fontSize: 8,
                  fontWeight: 900,
                  letterSpacing: "0.1em",
                }}
              />
              <PolarRadiusAxis
                angle={30}
                domain={[0, 100]}
                tick={false}
                axisLine={false}
              />
              <Radar
                name="Win Rate"
                dataKey="rate"
                stroke="#22c55e"
                fill="#22c55e"
                fillOpacity={0.2}
                unit="%"
              />
              <Tooltip content={<CustomTooltip />} />
            </RadarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-[10px] font-black text-zinc-800 uppercase tracking-[0.5em] italic text-center">
            Insufficient Strategy Data
            <br />
            Initialize Execution Logs
          </div>
        )}
      </div>

      <div className="mt-8 pt-6 border-t border-zinc-900">
        <div className="flex justify-between items-center">
          <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">
            Target Edge
          </span>
          <span className="text-[10px] font-black text-green-500 uppercase">
            System Optimized
          </span>
        </div>
      </div>
    </div>
  );
};

const WinRatioWidget = ({ trades }: { trades: Trade[] }) => {
  const [period, setPeriod] = useState<Period>("Month");

  const stats = useMemo(() => {
    const now = new Date();

    const getRange = (p: Period, offset = 0) => {
      const start = new Date(now);
      const end = new Date(now);

      if (p === "Day") {
        start.setDate(now.getDate() - offset);
        start.setHours(0, 0, 0, 0);
        end.setDate(now.getDate() - offset);
        end.setHours(23, 59, 59, 999);
      } else if (p === "Week") {
        const day = now.getDay() || 7;
        start.setDate(now.getDate() - day + 1 - offset * 7);
        start.setHours(0, 0, 0, 0);
        end.setDate(start.getDate() + 6);
        end.setHours(23, 59, 59, 999);
      } else if (p === "Month") {
        start.setMonth(now.getMonth() - offset, 1);
        start.setHours(0, 0, 0, 0);
        end.setMonth(start.getMonth() + 1, 0);
        end.setHours(23, 59, 59, 999);
      } else {
        start.setFullYear(now.getFullYear() - offset, 0, 1);
        start.setHours(0, 0, 0, 0);
        end.setFullYear(start.getFullYear(), 11, 31);
        end.setHours(23, 59, 59, 999);
      }
      return { start, end };
    };

    const currentRange = getRange(period, 0);
    const prevRange = getRange(period, 1);

    const filterTrades = (range: { start: Date; end: Date }) => {
      return trades.filter((t) => {
        const d = new Date(t.trade_date);
        return d >= range.start && d <= range.end;
      });
    };

    const currentTrades = filterTrades(currentRange);
    const prevTrades = filterTrades(prevRange);

    const calc = (ts: Trade[]) => {
      const w = ts.filter((t) => t.result === "Win").length;
      const l = ts.filter((t) => t.result === "Loss").length;
      const total = w + l;
      const rate = total > 0 ? (w / total) * 100 : 0;
      return { w, l, rate, total };
    };

    const current = calc(currentTrades);
    const prev = calc(prevTrades);
    const diff = current.rate - prev.rate;

    return { current, prev, diff };
  }, [trades, period]);

  const pieData = [
    { name: "Wins", value: stats.current.w, color: "#22c55e" },
    { name: "Losses", value: stats.current.l, color: "#ef4444" },
  ];

  // If no trades, show white circle at 0%
  if (stats.current.total === 0) {
    pieData[0].value = 1;
    pieData[0].color = "#FFFFFF"; // White circle
    pieData[1].value = 0;
  }

  return (
    <div className="bg-pure-black border border-white p-8 md:p-10 flex flex-col h-full animate-in fade-in slide-in-from-bottom-2 duration-700">
      <div className="mb-8">
        <h3 className="text-xl font-bold tracking-tight text-white uppercase italic">
          Win ratio
        </h3>
      </div>

      <div className="flex flex-col items-center justify-center mb-8 gap-8">
        <div className="relative w-48 h-48">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                innerRadius={70}
                outerRadius={85}
                paddingAngle={0}
                dataKey="value"
                startAngle={90}
                endAngle={-270}
                stroke="none"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-5xl font-black tracking-tighter">
              {Math.round(stats.current.rate)}%
            </span>
          </div>
        </div>

        <div className="flex gap-16 items-center w-full justify-center">
          <div className="text-center">
            <p className="text-xs font-medium text-zinc-400 mb-1">
              Winning trades
            </p>
            <p className="text-4xl font-black">{stats.current.w}</p>
          </div>
          <div className="text-center">
            <p className="text-xs font-medium text-zinc-400 mb-1">
              Losing trades
            </p>
            <p className="text-4xl font-black text-red-500">
              {stats.current.l}
            </p>
          </div>
        </div>
      </div>

      <div className="flex bg-zinc-950 p-1 border border-zinc-900 mt-auto">
        {(["Year", "Month", "Week", "Day"] as Period[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${
              period === p
                ? "bg-zinc-800 text-white shadow-lg"
                : "text-zinc-600 hover:text-zinc-400"
            }`}
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  );
};

const AccountsSection = ({
  accounts,
  trades,
}: {
  accounts: Account[];
  trades: Trade[];
}) => {
  const [selectedType, setSelectedType] = useState<AccountType>("Personal");
  const today = new Date().toISOString().split("T")[0];

  const getStatsForType = (type: AccountType) => {
    const typeAccounts = accounts.filter((acc) => acc.type === type);
    const liveAccounts = typeAccounts.filter((acc) => acc.status === "Live");
    const p1Count = typeAccounts.filter(
      (acc) => acc.status === "Phase 1"
    ).length;
    const p2Count = typeAccounts.filter(
      (acc) => acc.status === "Phase 2"
    ).length;
    const liveCount = liveAccounts.length;

    const overallProfit = typeAccounts.reduce(
      (sum, acc) => sum + (acc.current_balance - acc.account_size),
      0
    );
    const liveAllocation = liveAccounts.reduce(
      (sum, acc) => sum + acc.account_size,
      0
    );

    return { p1Count, p2Count, liveCount, overallProfit, liveAllocation };
  };

  const filteredAccounts = accounts.filter((acc) => acc.type === selectedType);

  return (
    <div className="space-y-12 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border border-white">
        {(["Personal", "CFD", "Futures"] as AccountType[]).map((type) => {
          const stats = getStatsForType(type);
          return (
            <div
              key={type}
              className="p-10 bg-pure-black border-white md:even:border-x group hover:bg-white transition-all duration-300"
            >
              <div className="flex justify-between items-start mb-6">
                <p className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.3em] group-hover:text-black italic">
                  {type} Nodes
                </p>
                {type === "Personal" ? (
                  <span className="text-[9px] font-black border border-zinc-800 px-2 py-0.5 group-hover:border-black/20 group-hover:text-black">
                    {stats.liveCount} LIVE
                  </span>
                ) : (
                  <div className="flex gap-2">
                    <span className="text-[8px] font-black text-zinc-500 group-hover:text-black/60 uppercase">
                      P1: {stats.p1Count}
                    </span>
                    <span className="text-[8px] font-black text-zinc-500 group-hover:text-black/60 uppercase">
                      P2: {stats.p2Count}
                    </span>
                    <span className="text-[8px] font-black text-zinc-500 group-hover:text-black/60 uppercase">
                      LIVE: {stats.liveCount}
                    </span>
                  </div>
                )}
              </div>

              <p
                className={`text-4xl font-black tracking-tighter group-hover:text-black ${
                  stats.overallProfit >= 0 ? "text-white" : "text-red-500"
                }`}
              >
                {stats.overallProfit >= 0 ? "+" : ""}$
                {stats.overallProfit.toLocaleString()}
              </p>
              <p className="text-zinc-400 text-[9px] font-black uppercase mt-2 group-hover:text-black/60 tracking-widest italic border-b border-zinc-900 group-hover:border-black/10 pb-4 mb-4">
                Cumulative Alpha Yield
              </p>

              <div className="flex justify-between items-center">
                <span className="text-[9px] font-black text-zinc-500 group-hover:text-black uppercase">
                  Live Allocation
                </span>
                <span className="text-xs font-black group-hover:text-black italic">
                  ${stats.liveAllocation.toLocaleString()}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex border border-white p-1 gap-1 bg-pure-black max-w-2xl">
        {(["Personal", "CFD", "Futures"] as AccountType[]).map((type) => (
          <button
            key={type}
            onClick={() => setSelectedType(type)}
            className={`flex-1 py-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all ${
              selectedType === type
                ? "bg-white text-black"
                : "text-zinc-600 hover:text-white hover:bg-zinc-900"
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      <div className="border border-white overflow-x-auto bg-pure-black">
        <table className="w-full border-collapse min-w-[900px]">
          <thead>
            <tr className="border-b border-white bg-white/5 text-left text-[9px] font-black uppercase tracking-widest text-zinc-400">
              <th className="px-8 py-6">Account ID</th>
              <th className="px-8 py-6">Account Firm</th>
              <th className="px-8 py-6">Account Size</th>
              <th className="px-8 py-6">Current P&L</th>
              <th className="px-8 py-6">Overall Profit</th>
              <th className="px-8 py-6">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-900 font-mono text-xs">
            {filteredAccounts.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="py-24 text-center text-[10px] font-black uppercase tracking-[0.5em] text-zinc-500 italic"
                >
                  No active {selectedType} nodes detected.
                </td>
              </tr>
            ) : (
              filteredAccounts.map((acc) => {
                const overallProfit = acc.current_balance - acc.account_size;
                const currentPnL = trades
                  .filter(
                    (t) => t.account_id === acc.id && t.trade_date === today
                  )
                  .reduce((sum, t) => sum + Number(t.pnl), 0);

                return (
                  <tr
                    key={acc.id}
                    className="hover:bg-white/5 transition-colors"
                  >
                    <td className="px-8 py-6 font-black text-zinc-400">
                      {acc.account_number ||
                        acc.id.substring(0, 8).toUpperCase()}
                    </td>
                    <td className="px-8 py-6 font-black italic uppercase text-white">
                      {acc.broker_firm}
                    </td>
                    <td className="px-8 py-6 font-black">
                      ${acc.account_size.toLocaleString()}
                    </td>
                    <td
                      className={`px-8 py-6 font-black ${
                        currentPnL >= 0 ? "text-green-500" : "text-red-500"
                      }`}
                    >
                      {currentPnL >= 0 ? "+" : ""}${currentPnL.toLocaleString()}
                    </td>
                    <td
                      className={`px-8 py-6 font-black ${
                        overallProfit >= 0 ? "text-white" : "text-red-500"
                      }`}
                    >
                      {overallProfit >= 0 ? "+" : ""}$
                      {overallProfit.toLocaleString()}
                    </td>
                    <td className="px-8 py-6">
                      <span
                        className={`text-[8px] px-3 py-1 font-black uppercase border italic ${
                          acc.status === "Breached"
                            ? "bg-red-500 text-white border-red-500"
                            : acc.status === "Live"
                            ? "bg-white text-black border-white"
                            : "border-zinc-700 text-zinc-600"
                        }`}
                      >
                        {acc.status}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const { user } = useAuth();
  const [activeSection, setActiveSection] = useState<Section>("OVERVIEW");
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Weekly Navigation State
  const [weeklyOffset, setWeeklyOffset] = useState(0);

  // Monthly/Yearly Navigation State
  const [yearOffset, setYearOffset] = useState(0);

  const processDashboardData = (
    tradeList: Trade[],
    accountList: Account[]
  ): DashboardData | null => {
    const totalTrades = tradeList.length;
    const wins = tradeList.filter((t) => t.result === "Win").length;
    const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
    const performanceProfit = tradeList.reduce(
      (acc, t) => acc + Number(t.pnl),
      0
    );
    const avgRR =
      totalTrades > 0
        ? tradeList.reduce((acc, t) => acc + (t.risk_reward || 0), 0) /
          totalTrades
        : 0;

    const liveAccountIds = new Set(
      accountList.filter((acc) => acc.status === "Live").map((acc) => acc.id)
    );
    const netProfit = tradeList
      .filter((t) => t.account_id && liveAccountIds.has(t.account_id))
      .reduce((acc, t) => acc + Number(t.pnl), 0);

    const dailyMap: Record<string, number> = {};
    tradeList.forEach((t) => {
      dailyMap[t.trade_date] = (dailyMap[t.trade_date] || 0) + Number(t.pnl);
    });

    const sortedDates = Object.keys(dailyMap).sort(
      (a, b) => new Date(a).getTime() - new Date(b).getTime()
    );

    let currentEquity = 0;
    let equityHigh = 0;

    const dailyPnl = sortedDates.map((date) => {
      const pnl = dailyMap[date];
      currentEquity += pnl;
      const isHigh = currentEquity > equityHigh;
      if (isHigh) equityHigh = currentEquity;

      return {
        date,
        pnl,
        cumulative: currentEquity,
        isHigh,
        drawdown: -(equityHigh - currentEquity),
      };
    });

    const monthMap: Record<string, number> = {};
    tradeList.forEach((t) => {
      const month = t.trade_date.substring(0, 7);
      monthMap[month] = (monthMap[month] || 0) + Number(t.pnl);
    });

    // Generate last 12 months (even if no data)
    const now = new Date();
    const pnlByMonth = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
        2,
        "0"
      )}`;
      return {
        month: monthKey,
        pnl: monthMap[monthKey] || 0,
      };
    });

    return {
      trades: tradeList,
      accounts: accountList,
      totalTrades,
      winRate,
      performanceProfit,
      netProfit,
      avgRR,
      equityHigh,
      dailyPnl,
      pnlByMonth,
    };
  };

  const fetchDashboardData = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const [tradesResponse, accountsResponse] = await Promise.all([
        supabase
          .from("trades")
          .select("*")
          .eq("user_id", user.id)
          .order("trade_date", { ascending: true }),
        supabase.from("accounts").select("*").eq("user_id", user.id),
      ]);

      if (tradesResponse.error) throw tradesResponse.error;
      if (accountsResponse.error) throw accountsResponse.error;

      setData(
        processDashboardData(
          tradesResponse.data as Trade[],
          accountsResponse.data as Account[]
        )
      );
    } catch (e: any) {
      setError(e.message?.toUpperCase() || "DATABASE CONNECTION FAILURE");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  const renderSection = () => {
    if (!data) return null;
    switch (activeSection) {
      case "OVERVIEW":
        return (
          <div className="space-y-12 animate-in fade-in duration-500">
            {/* Top Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border border-white">
              {[
                {
                  label: "Performance Profit",
                  value: `${
                    data.performanceProfit >= 0 ? "+" : ""
                  }$${data.performanceProfit.toLocaleString()}`,
                  sub: "All Nodes Yield",
                  color:
                    data.performanceProfit >= 0 ? "text-white" : "text-red-500",
                },
                {
                  label: "Net Profit",
                  value: `${
                    data.netProfit >= 0 ? "+" : ""
                  }$${data.netProfit.toLocaleString()}`,
                  sub: "Live Account Delta",
                  color: data.netProfit >= 0 ? "text-white" : "text-red-500",
                },
                {
                  label: "Avg R:R",
                  value: data.avgRR.toFixed(2),
                  sub: "Risk vs Reward",
                },
                {
                  label: "Win Ratio",
                  value: `${data.winRate.toFixed(1)}%`,
                  sub: "Execution Edge",
                  color: "text-green-500",
                },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className={`p-10 border-white bg-pure-black border-b sm:border-b-0 ${
                    idx !== 3 ? "sm:border-r" : ""
                  }`}
                >
                  <p className="text-zinc-400 text-[9px] font-black uppercase tracking-[0.3em]">
                    {item.label}
                  </p>
                  <p
                    className={`text-4xl font-black mt-4 tracking-tighter ${
                      item.color || "text-white"
                    }`}
                  >
                    {item.value}
                  </p>
                  <p className="text-zinc-400 text-[9px] font-bold uppercase mt-2 italic">
                    {item.sub}
                  </p>
                </div>
              ))}
            </div>

            {/* Performance Modules Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-stretch">
              <WinRatioWidget trades={data.trades} />
              <SetupWinRateRadarCard trades={data.trades} />
            </div>
          </div>
        );
      case "ACCOUNTS":
        return (
          <AccountsSection accounts={data.accounts} trades={data.trades} />
        );
      case "MONTHLY":
        // Calculate monthly data based on year offset
        const monthMap: Record<string, number> = {};
        data.trades.forEach((t) => {
          const month = t.trade_date.substring(0, 7);
          monthMap[month] = (monthMap[month] || 0) + Number(t.pnl);
        });

        // Generate 12 months for the selected year
        const targetYear = new Date().getFullYear() + yearOffset;
        const monthlyData = Array.from({ length: 12 }, (_, i) => {
          const monthKey = `${targetYear}-${String(i + 1).padStart(2, "0")}`;
          return {
            month: monthKey,
            pnl: monthMap[monthKey] || 0,
          };
        });

        const maxMonthly =
          monthlyData.length > 0
            ? Math.max(...monthlyData.map((d) => Math.abs(d.pnl)))
            : 0;
        return (
          <div className="min-h-[75vh] w-full bg-pure-black border border-white p-6 md:p-12 animate-in slide-in-from-top-4 duration-700 overflow-hidden flex flex-col">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12 border-b border-zinc-900 pb-12">
              <div className="space-y-2">
                <h3 className="text-xl font-black uppercase tracking-[0.4em] italic text-white flex items-center gap-3">
                  <span className="w-2 h-2 bg-[#22c55e] inline-block"></span>
                  Monthly Alpha
                </h3>
                <p className="text-zinc-400 text-[9px] font-black uppercase tracking-widest pl-5">
                  Year: {new Date().getFullYear() + yearOffset}
                </p>
              </div>

              <div className="flex gap-4 items-center">
                <div className="text-right hidden sm:block">
                  <p className="text-zinc-500 text-[9px] font-black uppercase tracking-[0.2em] mb-1">
                    Peak Monthly Alpha
                  </p>
                  <p className="text-3xl font-black text-[#22c55e] tracking-tighter">
                    ${maxMonthly.toLocaleString()}
                  </p>
                </div>
                <div className="flex border border-white bg-black p-1 gap-1">
                  <button
                    onClick={() => setYearOffset((prev) => prev - 1)}
                    className="px-4 py-2 text-[10px] font-black uppercase tracking-widest hover:bg-white hover:text-black transition-all"
                  >
                    PREV_YEAR
                  </button>
                  <button
                    onClick={() => setYearOffset(0)}
                    className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${
                      yearOffset === 0
                        ? "bg-zinc-800 text-white"
                        : "hover:bg-white hover:text-black"
                    }`}
                  >
                    CURRENT
                  </button>
                  <button
                    onClick={() => setYearOffset((prev) => prev + 1)}
                    className="px-4 py-2 text-[10px] font-black uppercase tracking-widest hover:bg-white hover:text-black transition-all"
                  >
                    NEXT_YEAR
                  </button>
                </div>
              </div>
            </div>

            <div className="w-full h-[500px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={monthlyData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                >
                  <CartesianGrid
                    strokeDasharray="1 1"
                    stroke="#1a1a1a"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="month"
                    stroke="#444"
                    fontSize={9}
                    tickLine={false}
                    axisLine={false}
                    dy={10}
                    fontWeight={900}
                    letterSpacing="0.1em"
                    tickFormatter={(val) => {
                      const [year, month] = val.split("-");
                      const d = new Date(parseInt(year), parseInt(month) - 1);
                      return d
                        .toLocaleString("default", { month: "short" })
                        .toUpperCase();
                    }}
                  />
                  <YAxis
                    stroke="#444"
                    fontSize={8}
                    tickLine={false}
                    axisLine={false}
                    dx={-10}
                    fontWeight={900}
                    tickFormatter={(val) => `$${Math.abs(val / 1000)}K`}
                  />
                  <Tooltip
                    cursor={{ fill: "#ffffff05" }}
                    content={<CustomTooltip />}
                    animationDuration={200}
                  />
                  <ReferenceLine y={0} stroke="#333" strokeWidth={1} />
                  <Bar
                    dataKey="pnl"
                    fill="#22c55e"
                    radius={[4, 4, 4, 4]}
                    name="Monthly P&L"
                    animationBegin={200}
                    animationDuration={1200}
                    animationEasing="ease-out"
                    barSize={40}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-12 flex justify-between items-center border-t border-zinc-900 pt-8 opacity-40 group hover:opacity-100 transition-opacity">
              <div className="text-[8px] font-black text-zinc-700 uppercase tracking-[0.4em] italic">
                Aggregated Periodic Yields / System Integrity Confirmed
              </div>
              <div className="flex gap-4">
                <span className="text-[8px] font-black uppercase tracking-widest text-zinc-400 italic">
                  Temporal Series:{" "}
                  {monthlyData.filter((m) => m.pnl !== 0).length} / 12 MONTHS
                  ACTIVE
                </span>
              </div>
            </div>
          </div>
        );
      case "WEEKLY":
        // Calculation Logic for Weekly Section
        const today = new Date();
        const mondayOfTargetWeek = new Date(today);
        // Find Monday of current week, then add offset
        const dayOfWeek = today.getDay() || 7;
        mondayOfTargetWeek.setDate(
          today.getDate() - dayOfWeek + 1 + weeklyOffset * 7
        );

        const weekDays = Array.from({ length: 5 }, (_, i) => {
          const d = new Date(mondayOfTargetWeek);
          d.setDate(mondayOfTargetWeek.getDate() + i);
          const dateStr = d.toISOString().split("T")[0];
          const match = data.dailyPnl.find((p) => p.date === dateStr);
          return {
            date: dateStr,
            dayName: d
              .toLocaleString("default", { weekday: "short" })
              .toUpperCase(),
            pnl: match ? match.pnl : 0,
          };
        });

        const weekStart = weekDays[0].date;
        const weekEnd = weekDays[4].date;
        const maxWeeklyDay = Math.max(...weekDays.map((d) => Math.abs(d.pnl)));

        return (
          <div className="min-h-[75vh] w-full bg-pure-black border border-white p-6 md:p-12 animate-in slide-in-from-right-4 duration-700 overflow-hidden flex flex-col">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12 border-b border-zinc-900 pb-12">
              <div className="space-y-2">
                <h3 className="text-xl font-black uppercase tracking-[0.4em] italic text-white flex items-center gap-3">
                  <span className="w-2 h-2 bg-[#22c55e] inline-block"></span>
                  Weekly Yield
                </h3>
                <p className="text-zinc-400 text-[9px] font-black uppercase tracking-widest pl-5 italic">
                  Cycle: {weekStart} // {weekEnd}
                </p>
              </div>

              <div className="flex gap-4 items-center">
                <div className="text-right hidden sm:block">
                  <p className="text-zinc-500 text-[9px] font-black uppercase tracking-[0.2em] mb-1">
                    Peak Intraday Alpha
                  </p>
                  <p className="text-2xl font-black text-[#22c55e] tracking-tighter">
                    ${maxWeeklyDay.toLocaleString()}
                  </p>
                </div>
                <div className="flex border border-white bg-black p-1 gap-1">
                  <button
                    onClick={() => setWeeklyOffset((prev) => prev - 1)}
                    className="px-4 py-2 text-[10px] font-black uppercase tracking-widest hover:bg-white hover:text-black transition-all"
                  >
                    PREV_WEEK
                  </button>
                  <button
                    onClick={() => setWeeklyOffset(0)}
                    className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${
                      weeklyOffset === 0
                        ? "bg-zinc-800 text-white"
                        : "hover:bg-white hover:text-black"
                    }`}
                  >
                    CURRENT
                  </button>
                  <button
                    onClick={() => setWeeklyOffset((prev) => prev + 1)}
                    className="px-4 py-2 text-[10px] font-black uppercase tracking-widest hover:bg-white hover:text-black transition-all"
                  >
                    NEXT_WEEK
                  </button>
                </div>
              </div>
            </div>

            <div className="w-full h-[500px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={weekDays}
                  margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                >
                  <CartesianGrid
                    strokeDasharray="1 1"
                    stroke="#1a1a1a"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="dayName"
                    stroke="#444"
                    fontSize={9}
                    tickLine={false}
                    axisLine={false}
                    dy={10}
                    fontWeight={900}
                    letterSpacing="0.1em"
                  />
                  <YAxis
                    stroke="#444"
                    fontSize={8}
                    tickLine={false}
                    axisLine={false}
                    dx={-10}
                    fontWeight={900}
                    tickFormatter={(val) => {
                      const absVal = Math.abs(val);
                      if (absVal >= 1000)
                        return `$${(absVal / 1000).toFixed(1)}K`;
                      return `$${absVal}`;
                    }}
                  />
                  <Tooltip
                    cursor={{ fill: "#ffffff05" }}
                    content={<CustomTooltip />}
                    animationDuration={200}
                  />
                  <ReferenceLine y={0} stroke="#333" strokeWidth={1} />
                  <Bar
                    dataKey="pnl"
                    radius={[4, 4, 4, 4]}
                    name="Daily P&L"
                    animationBegin={200}
                    animationDuration={1000}
                    animationEasing="ease-out"
                    barSize={40}
                  >
                    {weekDays.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.pnl >= 0 ? "#22c55e" : "#ef4444"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-12 flex justify-between items-center border-t border-zinc-900 pt-8 opacity-40 group hover:opacity-100 transition-opacity">
              <div className="text-[8px] font-black text-zinc-700 uppercase tracking-[0.4em] italic">
                Rolling Weekly Alpha / Snapshot{" "}
                {weeklyOffset === 0 ? "LIVE" : `OFFSET_${weeklyOffset}`}
              </div>
              <div className="text-[8px] font-black uppercase tracking-widest text-zinc-500 italic">
                Temporal Focus: Day {new Date().getDay()} of Current Execution
                Cycle
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <div className="text-white font-black animate-pulse tracking-[0.5em] uppercase text-xs italic">
          Syncing Terminal Core...
        </div>
      </div>
    );

  if (error)
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <div className="border border-red-500 bg-black p-10 text-center max-w-lg">
          <h2 className="text-red-500 font-black uppercase mb-4 tracking-widest">
            System Error
          </h2>
          <p className="text-zinc-400 text-[10px] mb-8 font-mono">{error}</p>
          <button
            onClick={fetchDashboardData}
            className="bg-white text-black px-8 py-3 text-[10px] font-black uppercase tracking-widest"
          >
            Reconnect
          </button>
        </div>
      </div>
    );

  if (!data)
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] text-center space-y-8">
        <div className="text-9xl font-black opacity-10">NULL</div>
        <h2 className="text-2xl font-black uppercase tracking-tighter">
          Initialize Terminal Nodes
        </h2>
        <a
          href="#/accounts"
          className="bg-white text-black px-12 py-4 uppercase text-[10px] font-black tracking-widest hover:bg-zinc-200"
        >
          Manage Accounts
        </a>
      </div>
    );

  return (
    <div className="space-y-12">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-10">
        <div>
          <h1 className="text-6xl font-black italic tracking-tighter leading-none uppercase">
            Analysis
          </h1>
          <p className="text-zinc-400 text-[10px] font-black uppercase tracking-[0.3em] mt-4 flex items-center gap-4">
            <span className="w-10 h-0.5 bg-white"></span> Prop-Firm Tier
            Intelligence Dashboard
          </p>
        </div>
        <div className="flex flex-wrap gap-1 bg-pure-black border border-white p-1">
          {(["OVERVIEW", "WEEKLY", "MONTHLY", "ACCOUNTS"] as Section[]).map(
            (s) => (
              <button
                key={s}
                onClick={() => setActiveSection(s)}
                className={`px-4 py-2 text-[9px] font-black uppercase tracking-widest transition-all ${
                  activeSection === s
                    ? "bg-white text-black"
                    : "text-zinc-500 hover:text-white"
                }`}
              >
                {s}
              </button>
            )
          )}
        </div>
      </header>

      <main className="min-h-[40vh]">{renderSection()}</main>
    </div>
  );
};

export default Dashboard;
