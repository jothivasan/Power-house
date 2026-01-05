import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../services/supabase";
import { useAuth } from "../App";
import { MARKETS, TIMEFRAMES } from "../constants";
import { Account, AccountStatus } from "../types";
import ConfirmModal from "../components/ConfirmModal";

// User-defined option types
interface TradingSetup {
  id: string;
  name: string;
  is_active: boolean;
}

interface TradingConfirmation {
  id: string;
  name: string;
  is_active: boolean;
}

interface TradingMistake {
  id: string;
  name: string;
  is_active: boolean;
}

const AddTrade = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type?: "info" | "success" | "danger";
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
    type: "info",
  });

  const [accounts, setAccounts] = useState<Account[]>([]);

  // User-defined pools (loaded from database)
  const [setupPool, setSetupPool] = useState<TradingSetup[]>([]);
  const [confirmationPool, setConfirmationPool] = useState<
    TradingConfirmation[]
  >([]);
  const [mistakePool, setMistakePool] = useState<TradingMistake[]>([]);

  const [customSetup, setCustomSetup] = useState("");
  const [customConfirmation, setCustomConfirmation] = useState("");
  const [customMistake, setCustomMistake] = useState("");

  // Long-press and delete state
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(
    null
  );
  const [deleteModal, setDeleteModal] = useState<{
    show: boolean;
    type: "setup" | "confirmation" | "mistake" | null;
    item: any;
  }>({ show: false, type: null, item: null });

  const [formData, setFormData] = useState({
    account_id: "",
    trade_date: new Date().toISOString().split("T")[0],
    symbol: "",
    market: "Forex",
    direction: "Buy",
    timeframe: "H1",
    risk: "",
    reward: "",
    exit_type: "TP" as "TP" | "SL" | "BE" | "TSL",
    position_size: "",
    strategy: [] as string[],
    confirmations: [] as string[],
    mistakes: [] as string[],
    notes: "",
  });

  const [screenshot, setScreenshot] = useState<File | null>(null);

  // Fetch user-defined options from database
  useEffect(() => {
    const fetchUserOptions = async () => {
      if (!user) return;

      // Fetch accounts
      const { data: accountsData } = await supabase
        .from("accounts")
        .select("*")
        .eq("user_id", user.id)
        .in("status", ["Phase 1", "Phase 2", "Phase 3", "Live"]);
      if (accountsData) setAccounts(accountsData);

      // Fetch trading setups
      const { data: setupsData } = await supabase
        .from("trading_setups")
        .select("id, name, is_active")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("name");
      if (setupsData) setSetupPool(setupsData);

      // Fetch trading confirmations
      const { data: confirmationsData } = await supabase
        .from("trading_confirmations")
        .select("id, name, is_active")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("name");
      if (confirmationsData) setConfirmationPool(confirmationsData);

      // Fetch trading mistakes
      const { data: mistakesData } = await supabase
        .from("trading_mistakes")
        .select("id, name, is_active")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("name");
      if (mistakesData) setMistakePool(mistakesData);
    };

    fetchUserOptions();
  }, [user]);

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleMultiSelect = (
    category: "strategy" | "confirmations" | "mistakes",
    value: string
  ) => {
    setFormData((prev) => {
      const current = prev[category];
      if (current.includes(value)) {
        return { ...prev, [category]: current.filter((i) => i !== value) };
      }
      return { ...prev, [category]: [...current, value] };
    });
  };

  const addCustomSetup = async () => {
    if (!customSetup.trim() || !user) return;
    const name = customSetup.trim().toUpperCase();

    // Check if already exists
    if (setupPool.some((s) => s.name.toUpperCase() === name)) {
      if (!formData.strategy.includes(name)) {
        handleMultiSelect("strategy", name);
      }
      setCustomSetup("");
      return;
    }

    // Add to database
    const { data, error } = await supabase
      .from("trading_setups")
      .insert({ user_id: user.id, name })
      .select()
      .single();

    if (data && !error) {
      setSetupPool((prev) => [...prev, data]);
      handleMultiSelect("strategy", name);
    }
    setCustomSetup("");
  };

  const addCustomConfirmation = async () => {
    if (!customConfirmation.trim() || !user) return;
    const name = customConfirmation.trim().toUpperCase();

    if (confirmationPool.some((c) => c.name.toUpperCase() === name)) {
      if (!formData.confirmations.includes(name)) {
        handleMultiSelect("confirmations", name);
      }
      setCustomConfirmation("");
      return;
    }

    const { data, error } = await supabase
      .from("trading_confirmations")
      .insert({ user_id: user.id, name })
      .select()
      .single();

    if (data && !error) {
      setConfirmationPool((prev) => [...prev, data]);
      handleMultiSelect("confirmations", name);
    }
    setCustomConfirmation("");
  };

  const addCustomMistake = async () => {
    if (!customMistake.trim() || !user) return;
    const name = customMistake.trim().toUpperCase();

    if (mistakePool.some((m) => m.name.toUpperCase() === name)) {
      if (!formData.mistakes.includes(name)) {
        handleMultiSelect("mistakes", name);
      }
      setCustomMistake("");
      return;
    }

    const { data, error } = await supabase
      .from("trading_mistakes")
      .insert({ user_id: user.id, name })
      .select()
      .single();

    if (data && !error) {
      setMistakePool((prev) => [...prev, data]);
      handleMultiSelect("mistakes", name);
    }
    setCustomMistake("");
  };

  // Long-press handlers
  const handleLongPressStart = (
    type: "setup" | "confirmation" | "mistake",
    item: any
  ) => {
    const timer = setTimeout(() => {
      setDeleteModal({ show: true, type, item });
    }, 800); // 800ms long press
    setLongPressTimer(timer);
  };

  const handleLongPressEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  // Delete functions
  const handleDelete = async () => {
    if (!deleteModal.type || !deleteModal.item) return;

    const { type, item } = deleteModal;
    let tableName = "";

    if (type === "setup") tableName = "trading_setups";
    else if (type === "confirmation") tableName = "trading_confirmations";
    else if (type === "mistake") tableName = "trading_mistakes";

    const { error } = await supabase.from(tableName).delete().eq("id", item.id);

    if (!error) {
      // Remove from pool
      if (type === "setup") {
        setSetupPool((prev) => prev.filter((s) => s.id !== item.id));
        // Remove from selected if present
        setFormData((prev) => ({
          ...prev,
          strategy: prev.strategy.filter((s) => s !== item.name),
        }));
      } else if (type === "confirmation") {
        setConfirmationPool((prev) => prev.filter((c) => c.id !== item.id));
        setFormData((prev) => ({
          ...prev,
          confirmations: prev.confirmations.filter((c) => c !== item.name),
        }));
      } else if (type === "mistake") {
        setMistakePool((prev) => prev.filter((m) => m.id !== item.id));
        setFormData((prev) => ({
          ...prev,
          mistakes: prev.mistakes.filter((m) => m !== item.name),
        }));
      }
    }

    setDeleteModal({ show: false, type: null, item: null });
  };

  const closeDeleteModal = () => {
    setDeleteModal({ show: false, type: null, item: null });
  };

  // Discard handler - delete screenshot if uploaded
  const handleDiscard = async () => {
    if (screenshot) {
      // If screenshot was uploaded, find and delete it
      // Since we haven't committed yet, we need to track the temp upload
      // For now, just clear the state and navigate
      setScreenshot(null);
    }
    navigate("/trades");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!formData.account_id) {
      alert("Must select an account Node.");
      return;
    }

    setLoading(true);

    try {
      const selectedAccount = accounts.find(
        (a) => a.id === formData.account_id
      );
      if (!selectedAccount) throw new Error("Account node invalid.");

      let screenshot_url = "";
      if (screenshot) {
        const fileExt = screenshot.name.split(".").pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from("trade-entries")
          .upload(fileName, screenshot);
        if (uploadError) throw uploadError;
        screenshot_url = fileName;
      }

      // Calculate P&L based on exit type
      const risk = parseFloat(formData.risk) || 0;
      const reward = parseFloat(formData.reward) || 0;
      const rr_ratio = risk > 0 ? reward / risk : 0;

      let pnl = 0;
      let result: "Win" | "Loss" | "Breakeven" = "Breakeven";

      // Calculate P&L based on exit type
      // TP, BE, TSL = Use reward as profit
      // SL = Use risk as loss
      if (
        formData.exit_type === "TP" ||
        formData.exit_type === "BE" ||
        formData.exit_type === "TSL"
      ) {
        pnl = reward;
        result = "Win";
      } else if (formData.exit_type === "SL") {
        pnl = -risk;
        result = "Loss";
      }

      // 1. Log the Trade
      const { error: tradeError } = await supabase.from("trades").insert({
        user_id: user.id,
        account_id: formData.account_id,
        trade_date: formData.trade_date,
        symbol: formData.symbol.toUpperCase(),
        market: formData.market,
        direction: formData.direction,
        timeframe: formData.timeframe,
        risk,
        reward,
        exit_type: formData.exit_type,
        result,
        pnl,
        risk_reward: rr_ratio,
        position_size: parseFloat(formData.position_size) || 0,
        strategy: formData.strategy,
        confirmations: formData.confirmations,
        mistakes: formData.mistakes,
        notes: formData.notes,
        screenshot_url,
        // Legacy fields
        entry_price: 0,
        exit_price: 0,
        stop_loss: 0,
        take_profit: 0,
      });

      if (tradeError) throw tradeError;

      // 2. Automate Status Updates
      const newBalance = Number(selectedAccount.current_balance) + pnl;
      let newStatus: AccountStatus = selectedAccount.status;
      let createNextPhase = false;
      let nextPhaseStatus: AccountStatus | null = null;

      // Breach & Pass Logic
      const configKey =
        newStatus === "Phase 1"
          ? "p1"
          : newStatus === "Phase 2"
          ? "p2"
          : newStatus === "Phase 3"
          ? "p3"
          : "live";

      const config = selectedAccount.phase_configs[configKey];
      const totalDrawdown = selectedAccount.account_size - newBalance;

      if (config) {
        // Check Daily Loss
        let dailyBreach = false;
        if (config.daily_loss > 0) {
          const { data: dayTrades } = await supabase
            .from("trades")
            .select("pnl")
            .eq("account_id", selectedAccount.id)
            .eq("trade_date", formData.trade_date);

          const dayPnl = (dayTrades || []).reduce((sum, t) => sum + t.pnl, 0);
          if (dayPnl <= -config.daily_loss) {
            dailyBreach = true;
          }
        }

        if (totalDrawdown > config.max_loss || dailyBreach) {
          newStatus = "Breached";
        } else if (
          newStatus !== "Breached" &&
          config.target > 0 &&
          newStatus !== "Live"
        ) {
          const profit = newBalance - selectedAccount.account_size;
          if (profit >= config.target) {
            // Target Met!
            newStatus = "Passed";
            createNextPhase = true;

            // Determine next phase
            if (selectedAccount.status === "Phase 1") {
              nextPhaseStatus =
                selectedAccount.challenge_type === "Single Phase"
                  ? "Live"
                  : "Phase 2";
            } else if (selectedAccount.status === "Phase 2") {
              nextPhaseStatus =
                selectedAccount.challenge_type === "Two Phase"
                  ? "Live"
                  : "Phase 3";
            } else if (selectedAccount.status === "Phase 3") {
              nextPhaseStatus = "Live";
            }
          }
        }
      }

      // Update Current Account
      const { error: accError } = await supabase
        .from("accounts")
        .update({
          current_balance: newBalance,
          status: newStatus,
        })
        .eq("id", selectedAccount.id);

      if (accError) throw accError;

      if (newStatus === "Breached") {
        setConfirmState({
          isOpen: true,
          title: "PROTOCOL TERMINATED",
          message:
            "Account Breached. Daily Limit or Maximum Drawdown exceeded.\nThis account is no longer active.",
          type: "danger",
          onConfirm: () => navigate("/accounts"),
        });
      } else if (createNextPhase && nextPhaseStatus) {
        const { error: newAccError } = await supabase.from("accounts").insert({
          user_id: user.id,
          broker_firm: selectedAccount.broker_firm || "Unknown Broker",
          type: selectedAccount.type,
          challenge_type: selectedAccount.challenge_type,
          account_size: selectedAccount.account_size,
          current_balance: selectedAccount.account_size, // Reset balance
          initial_balance: selectedAccount.account_size,
          status: nextPhaseStatus,
          phase_configs: selectedAccount.phase_configs,
          account_number: selectedAccount.account_number,
        });

        if (newAccError) {
          console.error("Failed to create next phase account", newAccError);
          setConfirmState({
            isOpen: true,
            title: "SYSTEM WARNING",
            message:
              "Account Passed! However, automatic next phase creation failed. Check system logs.",
            type: "danger",
            onConfirm: () => navigate("/trades"),
          });
        } else {
          setConfirmState({
            isOpen: true,
            title: "MISSION ACCOMPLISHED",
            message: `Objectives Met.\n\nAccount Passed.\nNew ${nextPhaseStatus} Account Initialized.`,
            type: "success",
            onConfirm: () => navigate("/accounts"),
          });
        }
      } else {
        navigate("/trades");
      }
    } catch (err: any) {
      alert("Error: " + (err.message || "Terminal Failure"));
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full bg-black border border-white rounded-none p-4 text-[11px] font-bold uppercase tracking-widest placeholder-zinc-700 focus:bg-white focus:text-black transition-all";
  const labelClass =
    "block text-[9px] font-black text-zinc-500 mb-2 uppercase tracking-[0.2em]";
  const addBtnClass =
    "px-4 bg-white text-black text-[10px] font-black uppercase tracking-widest hover:bg-zinc-200 transition-colors";

  return (
    <div className="max-w-4xl mx-auto space-y-12 pb-24">
      <header>
        <Link
          to="/trades"
          className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 hover:text-white flex items-center gap-2 mb-4"
        >
          ← BACK_TO_TRADES
        </Link>
        <h1 className="text-4xl font-black italic tracking-tighter uppercase">
          Entry Logging
        </h1>
        <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em] mt-2">
          Precision record keeping for system integrity.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-12">
        <div className="border border-white p-8 space-y-8">
          <h3 className="text-[10px] font-black uppercase tracking-[0.4em] mb-4">
            I. Account Connection
          </h3>
          <div>
            <label className={labelClass}>Target Account Node</label>
            <select
              name="account_id"
              value={formData.account_id}
              onChange={handleInputChange}
              className={inputClass}
              required
            >
              <option value="">SELECT ACTIVE NODE...</option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {`${(
                    acc.broker_firm || "UNKNOWN"
                  ).toUpperCase()} [${acc.status.toUpperCase()}]`}{" "}
                  - {acc.type} (${acc.account_size.toLocaleString()})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="border border-white p-8 space-y-8">
          <h3 className="text-[10px] font-black uppercase tracking-[0.4em] mb-4">
            II. Base Parameters
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div>
              <label className={labelClass}>Execution Date</label>
              <input
                name="trade_date"
                type="date"
                value={formData.trade_date}
                onChange={handleInputChange}
                className={inputClass}
                required
              />
            </div>
            <div>
              <label className={labelClass}>Market Symbol</label>
              <input
                name="symbol"
                type="text"
                placeholder="EURUSD"
                value={formData.symbol}
                onChange={handleInputChange}
                className={inputClass}
                required
              />
            </div>
            <div>
              <label className={labelClass}>Market Type</label>
              <select
                name="market"
                value={formData.market}
                onChange={handleInputChange}
                className={inputClass}
              >
                {MARKETS.map((m) => (
                  <option key={m} value={m}>
                    {m.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Direction</label>
              <select
                name="direction"
                value={formData.direction}
                onChange={handleInputChange}
                className={inputClass}
              >
                <option value="Buy">BUY / LONG</option>
                <option value="Sell">SELL / SHORT</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Interval</label>
              <select
                name="timeframe"
                value={formData.timeframe}
                onChange={handleInputChange}
                className={inputClass}
              >
                {TIMEFRAMES.map((t) => (
                  <option key={t} value={t}>
                    {t.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Volume / Size</label>
              <input
                name="position_size"
                type="number"
                step="any"
                placeholder="1.00"
                value={formData.position_size}
                onChange={handleInputChange}
                className={inputClass}
              />
            </div>
          </div>
        </div>

        <div className="border border-white p-8 space-y-8">
          <h3 className="text-[10px] font-black uppercase tracking-[0.4em] mb-4">
            III. Risk / Reward Matrix
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <label className={labelClass}>Risk Amount ($)</label>
              <input
                name="risk"
                type="number"
                step="any"
                value={formData.risk}
                onChange={handleInputChange}
                className={inputClass}
                placeholder="100"
                required
              />
            </div>
            <div>
              <label className={labelClass}>Reward Amount ($)</label>
              <input
                name="reward"
                type="number"
                step="any"
                value={formData.reward}
                onChange={handleInputChange}
                className={inputClass}
                placeholder="500"
                required
              />
            </div>
            <div>
              <label className={labelClass}>R:R Ratio (Calculated)</label>
              <div className="w-full bg-zinc-900 border border-white p-4 text-[11px] font-bold uppercase tracking-widest text-white/60 italic">
                {parseFloat(formData.risk) > 0 &&
                parseFloat(formData.reward) > 0
                  ? (
                      parseFloat(formData.reward) / parseFloat(formData.risk)
                    ).toFixed(2)
                  : "0.00"}
              </div>
            </div>
          </div>

          <div className="mt-8">
            <label className={labelClass}>Exit Type</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { value: "TP", label: "Take Profit", desc: "Hit target" },
                { value: "SL", label: "Stop Loss", desc: "Hit stop" },
                { value: "BE", label: "Breakeven", desc: "No profit/loss" },
                { value: "TSL", label: "Trailing SL", desc: "Trailed out" },
              ].map((exit) => (
                <button
                  key={exit.value}
                  type="button"
                  onClick={() =>
                    setFormData({
                      ...formData,
                      exit_type: exit.value as "TP" | "SL" | "BE" | "TSL",
                    })
                  }
                  className={`p-4 border transition-all ${
                    formData.exit_type === exit.value
                      ? "bg-white border-white text-black"
                      : "bg-black border-zinc-800 text-zinc-600 hover:border-white"
                  }`}
                >
                  <div className="text-[11px] font-black uppercase tracking-widest">
                    {exit.label}
                  </div>
                  <div className="text-[8px] uppercase mt-1 opacity-60">
                    {exit.desc}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-12">
          {/* SETUP SECTION */}
          <div className="border border-white p-8">
            <h3 className="text-[10px] font-black uppercase tracking-[0.4em] mb-6">
              IV. Setup
            </h3>
            <div className="flex gap-2 mb-6">
              <input
                type="text"
                placeholder="CREATE NEW SETUP..."
                value={customSetup}
                onChange={(e) => setCustomSetup(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" && (e.preventDefault(), addCustomSetup())
                }
                className={inputClass}
              />
              <button
                type="button"
                onClick={addCustomSetup}
                className={addBtnClass}
              >
                ADD
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {setupPool.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => handleMultiSelect("strategy", s.name)}
                  onMouseDown={() => handleLongPressStart("setup", s)}
                  onMouseUp={handleLongPressEnd}
                  onMouseLeave={handleLongPressEnd}
                  onTouchStart={() => handleLongPressStart("setup", s)}
                  onTouchEnd={handleLongPressEnd}
                  className={`px-4 py-2 text-[9px] font-black uppercase tracking-widest border transition-all ${
                    formData.strategy.includes(s.name)
                      ? "bg-white border-white text-black"
                      : "bg-black border-zinc-800 text-zinc-600 hover:border-white"
                  }`}
                >
                  {s.name}
                </button>
              ))}
            </div>
          </div>

          {/* CONFIRMATIONS SECTION */}
          <div className="border border-white p-8">
            <h3 className="text-[10px] font-black uppercase tracking-[0.4em] mb-6">
              V. Confirmations
            </h3>
            <div className="flex gap-2 mb-6">
              <input
                type="text"
                placeholder="CREATE NEW CONFIRMATION..."
                value={customConfirmation}
                onChange={(e) => setCustomConfirmation(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" &&
                  (e.preventDefault(), addCustomConfirmation())
                }
                className={inputClass}
              />
              <button
                type="button"
                onClick={addCustomConfirmation}
                className={addBtnClass}
              >
                ADD
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {confirmationPool.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => handleMultiSelect("confirmations", c.name)}
                  onMouseDown={() => handleLongPressStart("confirmation", c)}
                  onMouseUp={handleLongPressEnd}
                  onMouseLeave={handleLongPressEnd}
                  onTouchStart={() => handleLongPressStart("confirmation", c)}
                  onTouchEnd={handleLongPressEnd}
                  className={`px-4 py-2 text-[9px] font-black uppercase tracking-widest border transition-all ${
                    formData.confirmations.includes(c.name)
                      ? "bg-white border-white text-black"
                      : "bg-black border-zinc-800 text-zinc-600 hover:border-white"
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          {/* FRICTION TAGS */}
          <div className="border border-white p-8">
            <h3 className="text-[10px] font-black uppercase tracking-[0.4em] mb-6 text-zinc-500 italic">
              VI. Friction Tags
            </h3>
            <div className="flex gap-2 mb-6">
              <input
                type="text"
                placeholder="CREATE NEW MISTAKE TAG..."
                value={customMistake}
                onChange={(e) => setCustomMistake(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" && (e.preventDefault(), addCustomMistake())
                }
                className={inputClass}
              />
              <button
                type="button"
                onClick={addCustomMistake}
                className={addBtnClass}
              >
                ADD
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {mistakePool.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => handleMultiSelect("mistakes", m.name)}
                  onMouseDown={() => handleLongPressStart("mistake", m)}
                  onMouseUp={handleLongPressEnd}
                  onMouseLeave={handleLongPressEnd}
                  onTouchStart={() => handleLongPressStart("mistake", m)}
                  onTouchEnd={handleLongPressEnd}
                  className={`px-4 py-2 text-[9px] font-black uppercase tracking-widest border transition-all ${
                    formData.mistakes.includes(m.name)
                      ? "bg-white border-white text-black"
                      : "bg-black border-zinc-800 text-zinc-600 hover:border-white"
                  }`}
                >
                  {m.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="border border-white p-8 space-y-12">
          <div>
            <label className={labelClass}>Post-Mortem Analysis</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              rows={5}
              placeholder="DOCUMENT YOUR PSYCHOLOGY..."
              className={`${inputClass} resize-none`}
            />
          </div>
          <div>
            <label className={labelClass}>
              Visual Confirmation (Screenshot)
            </label>
            <div className="mt-2 border border-white p-12 text-center hover:bg-white/5 transition-colors cursor-pointer relative">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setScreenshot(e.target.files?.[0] || null)}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                {screenshot ? screenshot.name : "CLICK TO UPLOAD ASSET"}
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-8 pt-6">
          <button
            type="button"
            onClick={handleDiscard}
            className="text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-white transition-colors"
          >
            Discard
          </button>
          <button
            type="submit"
            disabled={loading}
            className="btn-primary px-12 py-4 rounded-none text-[11px] uppercase tracking-[0.2em]"
          >
            {loading ? "COMMITTING..." : "COMMIT ENTRY"}
          </button>
        </div>
      </form>

      {/* Delete Confirmation Modal */}
      {deleteModal.show && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-6">
          <div className="bg-black border-2 border-white p-8 max-w-md w-full">
            <h3 className="text-xl font-black uppercase tracking-tighter mb-4">
              ⚠️ DELETE OPTION
            </h3>
            <p className="text-zinc-400 text-[11px] font-black uppercase tracking-widest mb-2">
              Permanently remove this option?
            </p>
            <div className="bg-zinc-900 border border-zinc-800 p-4 my-6">
              <p className="text-white text-[13px] font-black uppercase">
                {deleteModal.item?.name}
              </p>
              <p className="text-zinc-600 text-[9px] uppercase mt-1">
                Type: {deleteModal.type}
              </p>
            </div>
            <p className="text-red-600 text-[9px] font-black uppercase tracking-wider mb-6">
              ⚠️ WARNING: This action cannot be undone
            </p>
            <div className="flex gap-4">
              <button
                onClick={closeDeleteModal}
                className="flex-1 bg-black border border-white text-white py-3 text-[10px] font-black uppercase tracking-widest hover:bg-white hover:text-black transition-colors"
              >
                CANCEL
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 bg-red-900 border border-red-600 text-red-200 py-3 text-[10px] font-black uppercase tracking-widest hover:bg-red-600 hover:text-white transition-colors"
              >
                DELETE
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        onConfirm={confirmState.onConfirm}
        onCancel={() => setConfirmState((p) => ({ ...p, isOpen: false }))}
        type={confirmState.type}
        confirmText="OK"
        cancelText={confirmState.type === "success" ? "" : "CANCEL"}
      />
    </div>
  );
};

export default AddTrade;
