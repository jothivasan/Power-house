import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../services/supabase";
import { Trade, Account } from "../types";
import { useAuth } from "../App";
import { MARKETS } from "../constants";

const TradeList = () => {
  const { user } = useAuth();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    account: "",
    market: "",
    result: "",
    dateStart: "",
    dateEnd: "",
  });
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      const { data: accData } = await supabase
        .from("accounts")
        .select("*")
        .eq("user_id", user.id);

      if (accData) setAccounts(accData);

      let query = supabase
        .from("trades")
        .select("*")
        .eq("user_id", user.id)
        .order("trade_date", { ascending: false })
        .order("created_at", { ascending: false });

      if (filter.account) query = query.eq("account_id", filter.account);
      if (filter.market) query = query.eq("market", filter.market);
      if (filter.result) query = query.eq("result", filter.result);
      if (filter.dateStart) query = query.gte("trade_date", filter.dateStart);
      if (filter.dateEnd) query = query.lte("trade_date", filter.dateEnd);

      const { data: tradeData, error: fetchError } = await query;
      if (fetchError) throw fetchError;

      setTrades(tradeData || []);
    } catch (e: any) {
      console.error("Ledger Error:", e);
      setError(e.message?.toUpperCase() || "LEDGER SYNC FAILURE");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const deleteTrade = async (id: string) => {
    if (!window.confirm("IRREVERSIBLE ACTION: DISCARD LOG ENTRY?")) return;
    const { error: deleteError } = await supabase
      .from("trades")
      .delete()
      .eq("id", id);
    if (deleteError) {
      alert("Deletion error: " + deleteError.message);
    } else {
      fetchData();
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilter((prev) => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setFilter({
      account: "",
      market: "",
      result: "",
      dateStart: "",
      dateEnd: "",
    });
  };

  const filterInputClass =
    "bg-black text-white text-[9px] font-black uppercase tracking-widest p-4 border-b border-r border-white w-full md:w-auto appearance-none cursor-pointer hover:bg-white hover:text-black transition-colors focus:bg-white focus:text-black outline-none";

  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-5xl font-black italic tracking-tighter uppercase">
            Ledger
          </h1>
          <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em] mt-3">
            Execution Archives / Chronological Feed
          </p>
        </div>
        <Link
          to="/add-trade"
          className="btn-primary px-10 py-4 rounded-none text-[11px] uppercase tracking-[0.2em] shadow-lg shadow-white/5"
        >
          New_Entry
        </Link>
      </header>

      {/* Filter Matrix */}
      <div className="border border-white overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-7 bg-black">
          <select
            className={filterInputClass}
            onChange={(e) => handleFilterChange("account", e.target.value)}
            value={filter.account}
          >
            <option value="">ACCOUNT: ALL</option>
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.broker_firm.toUpperCase()}
              </option>
            ))}
          </select>

          <select
            className={filterInputClass}
            onChange={(e) => handleFilterChange("market", e.target.value)}
            value={filter.market}
          >
            <option value="">MARKET: ALL</option>
            {MARKETS.map((m) => (
              <option key={m} value={m}>
                {m.toUpperCase()}
              </option>
            ))}
          </select>

          <select
            className={filterInputClass}
            onChange={(e) => handleFilterChange("result", e.target.value)}
            value={filter.result}
          >
            <option value="">RESULT: ALL</option>
            <option value="Win">RESULT: WIN</option>
            <option value="Loss">RESULT: LOSS</option>
            <option value="Breakeven">RESULT: BE</option>
          </select>

          <input
            type="date"
            placeholder="DD-MM-YYYY"
            className="bg-black text-white text-[9px] font-black uppercase p-4 border-b border-r border-white w-full appearance-none focus:bg-white focus:text-black outline-none"
            value={filter.dateStart}
            onChange={(e) => handleFilterChange("dateStart", e.target.value)}
          />

          <input
            type="date"
            placeholder="DD-MM-YYYY"
            className="bg-black text-white text-[9px] font-black uppercase p-4 border-b border-r border-white w-full appearance-none focus:bg-white focus:text-black outline-none"
            value={filter.dateEnd}
            onChange={(e) => handleFilterChange("dateEnd", e.target.value)}
          />

          <button
            onClick={resetFilters}
            className="bg-black text-zinc-600 text-[10px] font-black uppercase p-4 border-b border-r border-white hover:text-white transition-colors"
          >
            RESET
          </button>

          <button
            onClick={fetchData}
            className="bg-white text-black text-[10px] font-black uppercase p-4 border-b border-white hover:bg-zinc-200 tracking-[0.3em]"
          >
            APPLY
          </button>
        </div>
      </div>

      {/* Table Section */}
      <div className="border border-white overflow-x-auto bg-black">
        <table className="w-full border-collapse min-w-[1000px]">
          <thead>
            <tr className="border-b border-white bg-black text-left text-white text-[10px] font-black uppercase tracking-[0.2em]">
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Ticker</th>
              <th className="px-4 py-3">Setup</th>
              <th className="px-4 py-3">Position</th>
              <th className="px-4 py-3 text-center">Status</th>
              <th className="px-4 py-3">P&L</th>
              <th className="px-4 py-3 italic">RR</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-900">
            {loading ? (
              <tr>
                <td
                  colSpan={8}
                  className="py-24 text-center text-[10px] font-black uppercase tracking-[0.5em] animate-pulse"
                >
                  Syncing Cryptographic Ledger...
                </td>
              </tr>
            ) : trades.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="py-24 text-center text-[10px] font-black uppercase tracking-[0.5em] opacity-30 italic"
                >
                  Null Data In Current Context
                </td>
              </tr>
            ) : (
              trades.map((trade) => (
                <tr
                  key={trade.id}
                  className="hover:bg-white/5 transition-colors group"
                >
                  <td className="px-4 py-3 text-[10px] font-black text-zinc-500 font-mono whitespace-nowrap">
                    {trade.trade_date}
                  </td>
                  <td className="px-4 py-3 font-black italic text-[12px] tracking-tight text-white uppercase">
                    {trade.symbol}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {trade.strategy?.slice(0, 1).map((s) => (
                        <span
                          key={s}
                          className="text-[9px] font-black uppercase text-zinc-500 tracking-tight"
                        >
                          {s}
                        </span>
                      ))}
                      {trade.strategy?.length > 1 && (
                        <span className="text-[8px] font-black text-zinc-700">
                          +{trade.strategy.length - 1}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[11px] font-black">
                    {trade.position_size || "—"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-block w-20 py-1.5 text-[10px] font-black uppercase italic ${
                        trade.exit_type === "TP"
                          ? "bg-[#22c55e] text-black"
                          : trade.exit_type === "SL"
                          ? "bg-[#220000] text-red-600 border border-red-900/40"
                          : trade.exit_type === "BE"
                          ? "bg-zinc-800 text-zinc-400"
                          : trade.exit_type === "TSL"
                          ? "bg-zinc-700 text-white"
                          : "bg-[#1a1a1a] text-zinc-500"
                      }`}
                    >
                      {trade.exit_type || "N/A"}
                    </span>
                  </td>
                  <td
                    className={`px-4 py-3 text-[11px] font-black ${
                      Number(trade.pnl) >= 0 ? "text-[#22c55e]" : "text-red-600"
                    }`}
                  >
                    {Number(trade.pnl) >= 0 ? "+" : ""}
                    {Number(trade.pnl).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-[11px] font-black text-zinc-500 italic">
                    {trade.risk_reward ? trade.risk_reward.toFixed(2) : "0.00"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end items-center gap-6">
                      <Link
                        to={`/trade/${trade.id}`}
                        className="text-[11px] font-black uppercase text-white hover:underline tracking-widest"
                      >
                        Inspect
                      </Link>
                      <button
                        onClick={() => deleteTrade(trade.id)}
                        className="text-[11px] font-black uppercase text-zinc-800 hover:text-red-500 transition-colors"
                      >
                        Discard
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TradeList;
