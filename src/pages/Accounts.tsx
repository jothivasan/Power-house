import React, { useState, useEffect } from "react";
import { supabase } from "../services/supabase";
import { useAuth } from "../App";
import {
  Account,
  AccountType,
  ChallengeType,
  PhaseConfig,
  AccountStatus,
  Trade,
} from "../types";
import {
  LineChart,
  Line,
  ResponsiveContainer,
  YAxis,
  XAxis,
  Tooltip,
} from "recharts";
import ConfirmModal from "../components/ConfirmModal";

const AccountsPage = () => {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [accountStats, setAccountStats] = useState<
    Record<
      string,
      { trades: Trade[]; winRate: number; maxProfit: number; maxLoss: number }
    >
  >({});
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
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

  // Withdraw State
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAccount, setWithdrawAccount] = useState<Account | null>(null);
  const [withdrawAmount, setWithdrawAmount] = useState("");

  // Withdraw History State
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);

  const handleAdvancePhase = async (acc: Account) => {
    let nextStatus: AccountStatus | null = null;

    // Determine logical next phase
    if (acc.challenge_type === "Single Phase") {
      nextStatus = "Live";
    } else if (acc.challenge_type === "Two Phase") {
      // Check if Phase 2 already exists for this account number
      const hasPhase2 = accounts.some(
        (a) => a.account_number === acc.account_number && a.status === "Phase 2"
      );
      // If we already have Phase 2 (or passed it), go Live
      if (hasPhase2) nextStatus = "Live";
      else nextStatus = "Phase 2";
    } else if (acc.challenge_type === "Three Phase") {
      nextStatus = "Phase 2";
    }

    if (!nextStatus) return;

    // Open Custom Confirmation Modal
    setConfirmState({
      isOpen: true,
      title: "INITIATE PROTOCOL PROGRESSION",
      message: `ADVANCING ACCOUNT: ${acc.broker_firm}\nTARGET PHASE: ${nextStatus}\n\nConfirm protocol initialization?`,
      type: "success",
      onConfirm: async () => {
        try {
          // DATABASE PRE-CHECK Logic
          // Check if destination status already exists for this account number
          if (acc.account_number) {
            const { data: existing } = await supabase
              .from("accounts")
              .select("id")
              .eq("account_number", acc.account_number)
              .eq("status", nextStatus)
              .maybeSingle();

            if (existing) {
              setConfirmState({
                isOpen: true,
                title: "PROTOCOL ERROR",
                message: "Next phase account already initialized.",
                type: "danger",
                onConfirm: () =>
                  setConfirmState((p) => ({ ...p, isOpen: false })),
              });
              fetchAccounts();
              return;
            }
          }

          const { error } = await supabase.from("accounts").insert({
            user_id: user.id,
            // Remove name column, use dynamic display
            broker_firm: acc.broker_firm || "Unknown Broker",
            type: acc.type,
            challenge_type: acc.challenge_type,
            account_size: acc.account_size,
            current_balance: acc.account_size,
            initial_balance: acc.account_size,
            status: nextStatus,
            phase_configs: acc.phase_configs,
            account_number: acc.account_number, // KEEP SAME NUMBER
          });

          if (error) throw error;

          setConfirmState({
            isOpen: true,
            title: "PROTOCOL EXECUTED",
            message: `${nextStatus} Account Initialized Successfully.`,
            type: "success",
            onConfirm: () => {
              setConfirmState((p) => ({ ...p, isOpen: false }));
              fetchAccounts();
            },
          });
        } catch (err: any) {
          setConfirmState({
            isOpen: true,
            title: "SYSTEM FAILURE",
            message: err.message,
            type: "danger",
            onConfirm: () => setConfirmState((p) => ({ ...p, isOpen: false })),
          });
        }
      },
    });
  };

  const checkNextPhaseExists = (acc: Account) => {
    let nextStatus = "";
    if (acc.challenge_type === "Single Phase") nextStatus = "Live";
    else if (acc.challenge_type === "Two Phase") nextStatus = "Phase 2";
    else if (acc.challenge_type === "Three Phase") nextStatus = "Phase 2";

    if (nextStatus === "Phase 2") {
      // If P2 exists or Live exists (implied P2 passed)
      return accounts.some(
        (a) =>
          a.account_number === acc.account_number &&
          (a.status === "Phase 2" || a.status === "Live")
      );
    }
    return accounts.some(
      (a) => a.account_number === acc.account_number && a.status === nextStatus
    );
  };

  // Form State
  const [formData, setFormData] = useState({
    type: "CFD" as AccountType,
    broker_firm: "",
    account_number: "",
    account_size: "",
    challenge_type: "Two Phase" as ChallengeType,
    phases: {
      p1: { target: "", max_loss: "", daily_loss: "", consistency_rule: "" },
      p2: { target: "", max_loss: "", daily_loss: "", consistency_rule: "" },
      p3: { target: "", max_loss: "", daily_loss: "", consistency_rule: "" },
      live: { target: "0", max_loss: "", daily_loss: "", consistency_rule: "" },
    },
  });

  // Withdraw Logic
  const handleOpenWithdraw = (acc: Account) => {
    setWithdrawAccount(acc);
    setWithdrawAmount("");
    setShowWithdrawModal(true);
  };

  const submitWithdraw = async () => {
    if (!withdrawAccount || !withdrawAmount) return;
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) {
      alert("Invalid Amount");
      return;
    }

    try {
      // 1. Insert Withdrawal Record
      const { error: wError } = await supabase.from("withdrawals").insert({
        user_id: user?.id,
        account_id: withdrawAccount.id,
        amount: amount,
      });
      if (wError) throw wError;

      // 2. Update Account Balance
      const newBalance = withdrawAccount.current_balance - amount;
      const { error: aError } = await supabase
        .from("accounts")
        .update({ current_balance: newBalance })
        .eq("id", withdrawAccount.id);

      if (aError) throw aError;

      setShowWithdrawModal(false);
      setWithdrawAccount(null);
      fetchAccounts();

      setConfirmState({
        isOpen: true,
        title: "WITHDRAWAL PROCESSED",
        message: `Successfully withdrew $${amount.toLocaleString()}.`,
        type: "success",
        onConfirm: () => setConfirmState((p) => ({ ...p, isOpen: false })),
      });
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const handleOpenHistory = async (acc: Account) => {
    setWithdrawAccount(acc);
    const { data } = await supabase
      .from("withdrawals")
      .select("*")
      .eq("account_id", acc.id)
      .order("withdrawal_date", { ascending: false });

    if (data) setWithdrawals(data);
    setShowHistoryModal(true);
  };

  const fetchAccounts = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("accounts")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (!error) setAccounts(data || []);
    setLoading(false);
  };

  const fetchTradeStats = async (accountId: string) => {
    const { data, error } = await supabase
      .from("trades")
      .select("*")
      .eq("account_id", accountId)
      .order("trade_date", { ascending: true });

    if (!error && data) {
      const trades = data as Trade[];
      const wins = trades.filter((t) => t.result === "Win").length;
      const winRate = trades.length > 0 ? (wins / trades.length) * 100 : 0;
      const pnlList = trades.map((t) => t.pnl);
      const positivePnls = pnlList.filter((p) => p > 0);
      const negativePnls = pnlList.filter((p) => p < 0);

      const maxProfit = positivePnls.length > 0 ? Math.max(...positivePnls) : 0;
      const maxLoss = negativePnls.length > 0 ? Math.min(...negativePnls) : 0;

      setAccountStats((prev) => ({
        ...prev,
        [accountId]: { trades, winRate, maxProfit, maxLoss },
      }));
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, [user]);

  const handleCreateOrUpdateAccount = async () => {
    if (!user) return;
    setSaving(true);

    try {
      const size = parseFloat(formData.account_size);
      let initialStatus: AccountStatus = "Phase 1";

      if (
        formData.type === "Personal" ||
        formData.challenge_type === "Instant"
      ) {
        initialStatus = "Live";
      }

      const phaseConfigs: Record<string, PhaseConfig> = {};
      const phaseKeys = ["p1", "p2", "p3", "live"];

      phaseKeys.forEach((k) => {
        const p = (formData.phases as any)[k];
        phaseConfigs[k] = {
          target: parseFloat(p.target) || 0,
          max_loss: parseFloat(p.max_loss) || 0,
          daily_loss: parseFloat(p.daily_loss) || 0,
          consistency_rule: parseFloat(p.consistency_rule) || 0,
        };
      });

      const accountData = {
        user_id: user.id,
        type: formData.type,
        broker_firm: formData.broker_firm,
        account_number: formData.account_number,
        account_size: size,
        challenge_type:
          formData.type === "Personal" ? null : formData.challenge_type,
        phase_configs: phaseConfigs,
      };

      if (editingAccount) {
        const { error } = await supabase
          .from("accounts")
          .update(accountData)
          .eq("id", editingAccount.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("accounts").insert({
          ...accountData,
          status: initialStatus,
          current_balance: size,
          initial_balance: size, // Fix: Set initial_balance to account_size
        });
        if (error) throw error;
      }

      setShowModal(false);
      setEditingAccount(null);
      setStep(1);
      fetchAccounts();
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const openProtocolConfig = (acc: Account) => {
    setEditingAccount(acc);
    setFormData({
      type: acc.type,
      broker_firm: acc.broker_firm,
      account_number: acc.account_number || "",
      account_size: acc.account_size.toString(),
      challenge_type: acc.challenge_type || "Two Phase",
      phases: {
        p1: {
          target: acc.phase_configs.p1?.target.toString() || "",
          max_loss: acc.phase_configs.p1?.max_loss.toString() || "",
          daily_loss: acc.phase_configs.p1?.daily_loss.toString() || "",
          consistency_rule:
            acc.phase_configs.p1?.consistency_rule.toString() || "",
        },
        p2: {
          target: acc.phase_configs.p2?.target.toString() || "",
          max_loss: acc.phase_configs.p2?.max_loss.toString() || "",
          daily_loss: acc.phase_configs.p2?.daily_loss.toString() || "",
          consistency_rule:
            acc.phase_configs.p2?.consistency_rule.toString() || "",
        },
        p3: {
          target: acc.phase_configs.p3?.target.toString() || "",
          max_loss: acc.phase_configs.p3?.max_loss.toString() || "",
          daily_loss: acc.phase_configs.p3?.daily_loss.toString() || "",
          consistency_rule:
            acc.phase_configs.p3?.consistency_rule.toString() || "",
        },
        live: {
          target: acc.phase_configs.live?.target.toString() || "0",
          max_loss: acc.phase_configs.live?.max_loss.toString() || "",
          daily_loss: acc.phase_configs.live?.daily_loss.toString() || "",
          consistency_rule:
            acc.phase_configs.live?.consistency_rule.toString() || "",
        },
      },
    });
    setStep(2);
    setShowModal(true);
  };

  const toggleLedger = (accId: string) => {
    if (expandedId === accId) {
      setExpandedId(null);
    } else {
      setExpandedId(accId);
      if (!accountStats[accId]) {
        fetchTradeStats(accId);
      }
    }
  };

  // Logic to handle phase progression automatically
  const checkPhaseProgression = async (
    acc: Account,
    highLevelStatus: string
  ) => {
    if (highLevelStatus === "Passed") {
      let nextStatus: AccountStatus = acc.status;
      if (acc.status === "Phase 1") {
        nextStatus = acc.challenge_type === "Single Phase" ? "Live" : "Phase 2";
      } else if (acc.status === "Phase 2") {
        nextStatus = acc.challenge_type === "Two Phase" ? "Live" : "Phase 3";
      } else if (acc.status === "Phase 3") {
        nextStatus = "Live";
      }

      if (nextStatus !== acc.status) {
        await supabase
          .from("accounts")
          .update({ status: nextStatus })
          .eq("id", acc.id);
        fetchAccounts();
      }
    }
  };

  const inputClass =
    "w-full bg-black border border-white p-4 text-[11px] font-bold uppercase tracking-widest focus:bg-white focus:text-black transition-all text-white placeholder-zinc-800";
  const labelClass =
    "block text-[9px] font-black text-zinc-500 mb-2 uppercase tracking-[0.2em]";

  const renderFormStep = () => {
    if (step === 1) {
      return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
          <h2 className="text-2xl font-black italic uppercase">
            Select Account Type
          </h2>
          <div className="grid grid-cols-1 gap-4">
            {(["Personal", "CFD", "Futures"] as AccountType[]).map((t) => (
              <button
                key={t}
                onClick={() => {
                  setFormData({ ...formData, type: t });
                  setStep(2);
                }}
                className="p-8 border border-white hover:bg-white hover:text-black text-left transition-all"
              >
                <div className="text-xl font-black uppercase tracking-tighter italic">
                  {t}
                </div>
                <div className="text-[10px] opacity-60 uppercase tracking-widest mt-1">
                  Initiate {t} Protocol
                </div>
              </button>
            ))}
          </div>
        </div>
      );
    }

    if (step === 2) {
      return (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
          <h2 className="text-2xl font-black italic uppercase">
            {editingAccount ? "Modify" : "Basic"} Parameters: {formData.type}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className={labelClass}>
                {formData.type === "Personal" ? "Broker Name" : "Account Firm"}
              </label>
              <input
                className={inputClass}
                value={formData.broker_firm}
                onChange={(e) =>
                  setFormData({ ...formData, broker_firm: e.target.value })
                }
                placeholder="e.g., Pepperstone, Apex, FTMO"
              />
            </div>
            <div>
              <label className={labelClass}>Account Size (USD)</label>
              <input
                type="number"
                className={inputClass}
                value={formData.account_size}
                onChange={(e) =>
                  setFormData({ ...formData, account_size: e.target.value })
                }
                placeholder="50000"
              />
            </div>
            <div>
              <label className={labelClass}>Account ID / Login</label>
              <input
                className={inputClass}
                value={formData.account_number}
                onChange={(e) =>
                  setFormData({ ...formData, account_number: e.target.value })
                }
                placeholder="Unique ID (e.g. 1001)"
              />
            </div>
            {formData.type !== "Personal" && (
              <div className="md:col-span-2">
                <label className={labelClass}>Challenge Protocol</label>
                <select
                  className={inputClass}
                  value={formData.challenge_type}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      challenge_type: e.target.value as ChallengeType,
                    })
                  }
                >
                  <option value="Instant">INSTANT (FUNDED)</option>
                  <option value="Single Phase">SINGLE PHASE</option>
                  <option value="Two Phase">TWO PHASE</option>
                  <option value="Three Phase">THREE PHASE</option>
                </select>
              </div>
            )}
          </div>
          <div className="flex justify-between pt-8">
            <button
              onClick={() => setStep(1)}
              className="text-[10px] font-black uppercase tracking-widest text-zinc-500"
            >
              Back
            </button>
            <button
              onClick={() => {
                if (
                  formData.type === "Personal" ||
                  formData.challenge_type === "Instant"
                ) {
                  setStep(4);
                } else {
                  setStep(3);
                }
              }}
              className="bg-white text-black px-12 py-4 text-[10px] font-black uppercase tracking-widest"
            >
              Continue
            </button>
          </div>
        </div>
      );
    }

    if (step === 3) {
      const activePhases =
        formData.challenge_type === "Single Phase"
          ? ["p1", "live"]
          : formData.challenge_type === "Two Phase"
          ? ["p1", "p2", "live"]
          : ["p1", "p2", "p3", "live"];

      return (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 max-h-[70vh] overflow-y-auto pr-4">
          <h2 className="text-2xl font-black italic uppercase">
            Phase Configuration
          </h2>
          {activePhases.map((pk) => (
            <div
              key={pk}
              className="p-8 border border-zinc-800 bg-zinc-950 space-y-6"
            >
              <h3 className="text-xs font-black uppercase tracking-[0.4em] italic text-white border-b border-zinc-900 pb-4">
                {pk === "live" ? "LIVE STAGE" : `PHASE ${pk.substring(1)}`}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pk !== "live" && (
                  <div>
                    <label className={labelClass}>Profit Target ($)</label>
                    <input
                      type="number"
                      className={inputClass}
                      value={(formData.phases as any)[pk].target}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          phases: {
                            ...formData.phases,
                            [pk]: {
                              ...(formData.phases as any)[pk],
                              target: e.target.value,
                            },
                          },
                        })
                      }
                    />
                  </div>
                )}
                <div>
                  <label className={labelClass}>Max Loss ($)</label>
                  <input
                    type="number"
                    className={inputClass}
                    value={(formData.phases as any)[pk].max_loss}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        phases: {
                          ...formData.phases,
                          [pk]: {
                            ...(formData.phases as any)[pk],
                            max_loss: e.target.value,
                          },
                        },
                      })
                    }
                  />
                </div>
                <div>
                  <label className={labelClass}>Daily Loss ($)</label>
                  <input
                    type="number"
                    className={inputClass}
                    value={(formData.phases as any)[pk].daily_loss}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        phases: {
                          ...formData.phases,
                          [pk]: {
                            ...(formData.phases as any)[pk],
                            daily_loss: e.target.value,
                          },
                        },
                      })
                    }
                  />
                </div>
                <div>
                  <label className={labelClass}>Consistency Rule (%)</label>
                  <input
                    type="number"
                    className={inputClass}
                    value={(formData.phases as any)[pk].consistency_rule}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        phases: {
                          ...formData.phases,
                          [pk]: {
                            ...(formData.phases as any)[pk],
                            consistency_rule: e.target.value,
                          },
                        },
                      })
                    }
                  />
                </div>
              </div>
            </div>
          ))}
          <div className="flex justify-between pt-8 pb-4">
            <button
              onClick={() => setStep(2)}
              className="text-[10px] font-black uppercase tracking-widest text-zinc-500"
            >
              Back
            </button>
            <button
              onClick={() => setStep(4)}
              className="bg-white text-black px-12 py-4 text-[10px] font-black uppercase tracking-widest"
            >
              Review Protocol
            </button>
          </div>
        </div>
      );
    }

    if (step === 4) {
      return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
          <h2 className="text-2xl font-black italic uppercase">Verify Entry</h2>
          <div className="p-8 border border-white space-y-4 font-mono text-xs">
            <div className="flex justify-between">
              <span className="text-zinc-500 uppercase">Type:</span>{" "}
              <span>{formData.type}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500 uppercase">Entity:</span>{" "}
              <span>{formData.broker_firm}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500 uppercase">Size:</span>{" "}
              <span>${parseFloat(formData.account_size).toLocaleString()}</span>
            </div>
            {formData.challenge_type && (
              <div className="flex justify-between">
                <span className="text-zinc-500 uppercase">Protocol:</span>{" "}
                <span>{formData.challenge_type}</span>
              </div>
            )}
          </div>
          <div className="flex justify-between pt-8">
            <button
              onClick={() =>
                setStep(
                  formData.type === "Personal" ||
                    formData.challenge_type === "Instant"
                    ? 2
                    : 3
                )
              }
              className="text-[10px] font-black uppercase tracking-widest text-zinc-500"
            >
              Adjust
            </button>
            <button
              disabled={saving}
              onClick={handleCreateOrUpdateAccount}
              className="bg-white text-black px-12 py-4 text-[10px] font-black uppercase tracking-widest"
            >
              {saving
                ? "COMMITTING..."
                : editingAccount
                ? "UPDATE_PROTOCOL"
                : "AUTHORIZE_ACCOUNT"}
            </button>
          </div>
        </div>
      );
    }
  };

  return (
    <div className="space-y-12">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black italic tracking-tighter uppercase">
            Portfolio Control
          </h1>
          <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em] mt-2">
            Asset Nodes / Capital Management
          </p>
        </div>
        <button
          onClick={() => {
            setEditingAccount(null);
            setStep(1);
            setShowModal(true);
          }}
          className="btn-primary px-8 py-3 rounded-none text-[10px] tracking-widest"
        >
          ADD_ACCOUNT
        </button>
      </header>

      {/* Accounts List */}
      <div className="space-y-6">
        {loading ? (
          <div className="py-20 text-center text-[10px] font-black uppercase tracking-[0.5em] animate-pulse">
            Syncing Assets...
          </div>
        ) : accounts.length === 0 ? (
          <div className="py-20 text-center border border-dashed border-zinc-800">
            <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">
              No nodes detected in terminal.
            </p>
          </div>
        ) : (
          accounts.map((acc) => {
            const phaseKey =
              acc.status === "Phase 1"
                ? "p1"
                : acc.status === "Phase 2"
                ? "p2"
                : acc.status === "Phase 3"
                ? "p3"
                : "live";
            const currentConfig = acc.phase_configs[phaseKey] || {
              target: 0,
              max_loss: 0,
              daily_loss: 0,
            };
            const pnl = acc.current_balance - acc.account_size;
            const targetProgress =
              currentConfig.target > 0
                ? (Math.max(0, pnl) / currentConfig.target) * 100
                : 0;
            const lossValue = Math.max(
              0,
              acc.account_size - acc.current_balance
            );

            let highLevelStatus: "Passed" | "Ongoing" | "Breached" = "Ongoing";
            if (acc.status === "Breached") {
              highLevelStatus = "Breached";
            } else if (acc.status === "Passed") {
              highLevelStatus = "Passed";
            } else if (
              currentConfig.target > 0 &&
              pnl >= currentConfig.target
            ) {
              highLevelStatus = "Passed";
            }

            const stats = accountStats[acc.id];
            const isExpanded = expandedId === acc.id;

            return (
              <div
                key={acc.id}
                className="group bg-black border border-zinc-800 hover:border-white transition-all flex flex-col overflow-hidden"
              >
                <div className="flex flex-col xl:flex-row items-stretch">
                  {/* Identity Section */}
                  <div className="p-8 xl:w-1/5 border-b xl:border-b-0 xl:border-r border-zinc-900 group-hover:border-black/10 group-hover:bg-white group-hover:text-black transition-colors">
                    <div className="text-[9px] font-black text-zinc-500 uppercase tracking-widest group-hover:text-black/60 mb-1">
                      Entity / Node
                    </div>
                    <h3 className="text-xl font-black italic uppercase tracking-tighter truncate">
                      {acc.broker_firm}
                    </h3>
                    <p className="text-[10px] font-black uppercase opacity-60 tracking-widest mt-1">
                      {acc.type}{" "}
                      {acc.account_number ? `#${acc.account_number}` : ""}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {/* ALWAYS VISIBLE PHASE LABELS */}
                      <span
                        className={`text-[8px] px-2 py-0.5 font-black uppercase border border-black group-hover:border-black/20 ${
                          acc.status === "Breached"
                            ? "bg-red-500 text-white border-red-500"
                            : "bg-black text-white"
                        }`}
                      >
                        {acc.status}
                      </span>
                      {acc.challenge_type && (
                        <span className="text-[8px] font-black uppercase tracking-widest text-zinc-500 bg-zinc-900/50 px-2 py-0.5 group-hover:text-black/60">
                          {acc.challenge_type}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Segment 2: Financials - Allocation Top, Equity Bottom */}
                  <div className="p-8 xl:w-1/4 flex flex-col justify-between border-b xl:border-b-0 xl:border-r border-zinc-900 transition-colors">
                    <div>
                      <div className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1 italic">
                        Allocation
                      </div>
                      <div className="text-xl font-black">
                        ${acc.account_size.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1 italic">
                        Equity
                      </div>
                      <div
                        className={`text-xl font-black ${
                          acc.current_balance >= acc.account_size
                            ? "text-white"
                            : "text-red-500"
                        }`}
                      >
                        ${acc.current_balance.toLocaleString()}
                      </div>
                      <div
                        className={`text-[10px] font-black ${
                          pnl >= 0 ? "text-green-500" : "text-red-500"
                        } mt-1`}
                      >
                        {pnl >= 0 ? "+" : ""}
                        {pnl.toLocaleString()} (
                        {((pnl / acc.account_size) * 100).toFixed(2)}%)
                      </div>
                    </div>
                  </div>

                  {/* Segment 3: Risk Protocol - Profit Target Top, Others Bottom Grid */}
                  <div className="p-8 xl:w-1/3 flex flex-col justify-between border-b xl:border-b-0 xl:border-r border-zinc-900 transition-colors">
                    {/* PROFIT TARGET TOP */}
                    <div className="w-full">
                      {acc.status === "Live" ||
                      acc.status === "Passed" ||
                      acc.status === "Breached" ? (
                        <div className="flex flex-col items-end">
                          <div className="text-[9px] font-black text-zinc-500 uppercase tracking-widest italic mb-1">
                            {acc.status === "Passed" ||
                            acc.status === "Breached"
                              ? "Target Status"
                              : "Current Profit"}
                          </div>
                          <div
                            className={`text-xl font-black ${
                              pnl >= 0 ? "text-[#22c55e]" : "text-red-500"
                            }`}
                          >
                            {acc.status === "Passed" ? (
                              <span className="text-[#22c55e]">ACHIEVED</span>
                            ) : acc.status === "Breached" ? (
                              <span className="text-red-600">BREACHED</span>
                            ) : (
                              `${pnl >= 0 ? "+" : ""}$${pnl.toLocaleString()}`
                            )}
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex justify-between items-center mb-1">
                            <div className="text-[9px] font-black text-zinc-500 uppercase tracking-widest italic">
                              Profit Target
                            </div>
                            <div className="text-[10px] font-black">
                              {currentConfig.target > 0
                                ? `$${currentConfig.target.toLocaleString()}`
                                : "N/A"}
                            </div>
                          </div>
                          <div className="h-2 w-full bg-zinc-900 border border-zinc-800 mb-1">
                            <div
                              className={`h-full transition-all duration-1000 ${
                                highLevelStatus === "Passed"
                                  ? "bg-green-500"
                                  : "bg-white"
                              }`}
                              style={{
                                width: `${Math.min(100, targetProgress)}%`,
                              }}
                            ></div>
                          </div>
                          <div className="flex justify-end">
                            <div
                              className={`text-[10px] font-black ${
                                pnl >= 0 ? "text-[#22c55e]" : "text-red-500"
                              }`}
                            >
                              {pnl >= 0 ? "+" : ""}${pnl.toLocaleString()}
                            </div>
                          </div>
                        </>
                      )}
                    </div>

                    {/* THREE VALUES BOTTOM (GRID) */}
                    <div className="grid grid-cols-3 gap-6 pt-4">
                      <div>
                        <div className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1 italic">
                          Max Loss
                        </div>
                        <div className="text-[11px] font-black text-red-500/80 tracking-tighter">
                          {currentConfig.max_loss > 0
                            ? `$${currentConfig.max_loss.toLocaleString()}`
                            : "---"}
                        </div>
                      </div>
                      <div>
                        <div className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1 italic">
                          Daily Limit
                        </div>
                        <div className="text-[11px] font-black text-red-500/80 tracking-tighter">
                          {currentConfig.daily_loss > 0
                            ? `$${currentConfig.daily_loss.toLocaleString()}`
                            : "---"}
                        </div>
                      </div>
                      <div>
                        <div className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1 italic">
                          Loss
                        </div>
                        <div
                          className={`text-[11px] font-black tracking-tighter ${
                            lossValue > 0 ? "text-red-500" : "text-zinc-600"
                          }`}
                        >
                          ${lossValue.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Segment 4: Actions & Meta */}
                  <div className="p-8 flex-1 flex flex-row xl:flex-col justify-between items-center xl:items-end bg-black/40">
                    <div className="flex items-center gap-4 text-right">
                      {acc.status === "Live" && (
                        <button
                          onClick={() => handleOpenWithdraw(acc)}
                          className="text-[9px] font-black uppercase text-[#22c55e] hover:text-white transition-colors"
                        >
                          [ WITHDRAW ]
                        </button>
                      )}
                      {/* STATUS Pill Left of Created Epoch */}
                      <span
                        className={`text-[9px] px-3 py-1 font-black uppercase italic ${
                          highLevelStatus === "Passed"
                            ? "bg-green-500 text-black"
                            : highLevelStatus === "Breached"
                            ? "bg-red-500 text-white"
                            : "bg-white text-black"
                        }`}
                      >
                        {highLevelStatus}
                      </span>
                      <div className="hidden xl:block">
                        <p className="text-[8px] font-black text-zinc-600 uppercase tracking-widest mb-1">
                          Created Epoch
                        </p>
                        <p className="text-[10px] font-black uppercase italic text-zinc-400">
                          {new Date(acc.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-6 items-center">
                      <button
                        onClick={() => openProtocolConfig(acc)}
                        className="text-[9px] font-black uppercase tracking-widest text-zinc-500 hover:text-white transition-colors"
                      >
                        Protocol_Config
                      </button>

                      <button
                        onClick={() => toggleLedger(acc.id)}
                        className={`px-6 py-2 text-[9px] font-black uppercase tracking-widest transition-colors ${
                          isExpanded
                            ? "bg-white text-black"
                            : "bg-transparent text-white border border-white hover:bg-white hover:text-black"
                        }`}
                      >
                        {isExpanded ? "CLOSE_LEDGER" : "VIEW_LEDGER"}
                      </button>
                    </div>
                  </div>
                </div>

                {/* EXPANDABLE LEDGER VIEW */}
                {isExpanded && (
                  <div className="border-t border-zinc-900 bg-zinc-950 p-10 animate-in slide-in-from-top-4 duration-300">
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
                      {/* Chart Area */}
                      <div className="lg:col-span-3 h-64 bg-black border border-zinc-900 p-4 relative">
                        <h4 className="absolute top-4 left-4 text-[10px] font-black uppercase text-zinc-600 tracking-widest z-10">
                          Alpha Curve (Performance History)
                        </h4>
                        {stats?.trades && stats.trades.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart
                              data={stats.trades.map((t, idx) => ({
                                idx,
                                balance: stats.trades
                                  .slice(0, idx + 1)
                                  .reduce(
                                    (sum, curr) => sum + curr.pnl,
                                    acc.account_size
                                  ),
                              }))}
                            >
                              <Line
                                type="monotone"
                                dataKey="balance"
                                stroke="#fff"
                                strokeWidth={2}
                                dot={false}
                              />
                              <XAxis hide />
                              <YAxis hide domain={["auto", "auto"]} />
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: "#000",
                                  border: "1px solid #fff",
                                  borderRadius: "0",
                                }}
                                itemStyle={{
                                  color: "#fff",
                                  fontSize: "10px",
                                  textTransform: "uppercase",
                                }}
                                labelStyle={{ display: "none" }}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="h-full flex items-center justify-center text-[10px] font-black text-zinc-800 uppercase tracking-widest italic">
                            Insufficient data for visual render.
                          </div>
                        )}
                      </div>

                      {/* Stats Area */}
                      <div className="space-y-6">
                        <div className="border-b border-zinc-900 pb-4">
                          <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-2 italic">
                            Phase Clear Intelligence
                          </p>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-[8px] font-black text-zinc-600 uppercase">
                                Phase Status
                              </p>
                              <p
                                className={`text-xs font-black uppercase ${
                                  highLevelStatus === "Passed"
                                    ? "text-green-500"
                                    : highLevelStatus === "Breached"
                                    ? "text-red-500"
                                    : "text-white"
                                }`}
                              >
                                {highLevelStatus === "Passed"
                                  ? "CLEARED"
                                  : highLevelStatus === "Breached"
                                  ? "TERMINATED"
                                  : "ONGOING"}
                              </p>
                            </div>
                            <div>
                              <p className="text-[8px] font-black text-zinc-600 uppercase">
                                Profit Objective
                              </p>
                              <p className="text-xs font-black text-white">
                                ${currentConfig.target.toLocaleString()}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div className="flex justify-between items-end border-b border-zinc-900 pb-1">
                            <span className="text-[9px] font-black text-zinc-600 uppercase">
                              Execution Count
                            </span>
                            <span className="text-xs font-black">
                              {stats?.trades?.length || 0}
                            </span>
                          </div>
                          <div className="flex justify-between items-end border-b border-zinc-900 pb-1">
                            <span className="text-[9px] font-black text-zinc-600 uppercase">
                              Win Ratio
                            </span>
                            <span className="text-xs font-black">
                              {stats?.winRate?.toFixed(1) || 0}%
                            </span>
                          </div>
                          <div className="flex justify-between items-end border-b border-zinc-900 pb-1">
                            <span className="text-[9px] font-black text-zinc-600 uppercase">
                              Best Execution
                            </span>
                            <span
                              className={`text-xs font-black ${
                                (stats?.maxProfit || 0) >= 0
                                  ? "text-green-500"
                                  : "text-red-500"
                              }`}
                            >
                              {(stats?.maxProfit || 0) >= 0 ? "+" : ""}$
                              {stats?.maxProfit?.toLocaleString() || 0}
                            </span>
                          </div>
                          <div className="flex justify-between items-end border-b border-zinc-900 pb-1">
                            <span className="text-[9px] font-black text-zinc-600 uppercase">
                              Worst Execution
                            </span>
                            <span
                              className={`text-xs font-black ${
                                (stats?.maxLoss || 0) >= 0
                                  ? "text-green-500"
                                  : "text-red-500"
                              }`}
                            >
                              {(stats?.maxLoss || 0) >= 0 ? "+" : ""}$
                              {stats?.maxLoss?.toLocaleString() || 0}
                            </span>
                          </div>
                        </div>

                        {acc.status === "Live" && (
                          <button
                            onClick={() => handleOpenHistory(acc)}
                            className="w-full bg-zinc-900 border border-zinc-800 text-zinc-400 py-3 text-[9px] font-black uppercase tracking-widest hover:text-white hover:border-white transition-colors mt-2"
                          >
                            VIEW WITHDRAWAL HISTORY
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        onConfirm={confirmState.onConfirm}
        onCancel={() => setConfirmState((p) => ({ ...p, isOpen: false }))}
        type={confirmState.type}
      />

      {/* Account Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl border border-white bg-black p-12 relative animate-in zoom-in-95 duration-300">
            <button
              onClick={() => {
                setShowModal(false);
                setEditingAccount(null);
              }}
              className="absolute top-8 right-8 text-zinc-500 hover:text-white text-xl font-black"
            >
              ✕
            </button>
            {renderFormStep()}
          </div>
        </div>
      )}

      {/* Withdraw Modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
          <div className="w-full max-w-md border border-white bg-black p-8 relative">
            <h3 className="text-xl font-black italic uppercase mb-2">
              REQUEST WITHDRAWAL
            </h3>
            <p className="text-xs text-zinc-400 mb-6 font-mono uppercase">
              Balance will be reduced by this amount.
            </p>
            <input
              type="number"
              placeholder="Amount (USD)"
              className="w-full bg-black border border-zinc-800 p-4 text-white font-mono text-sm focus:border-white focus:outline-none mb-6"
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
            />
            <div className="flex justify-end gap-4">
              <button
                onClick={() => setShowWithdrawModal(false)}
                className="text-xs font-black uppercase text-zinc-500 hover:text-white"
              >
                CANCEL
              </button>
              <button
                onClick={submitWithdraw}
                className="bg-white text-black px-6 py-2 text-xs font-black uppercase hover:bg-zinc-200"
              >
                CONFIRM
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
          <div className="w-full max-w-md border border-white bg-black p-8 relative max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black italic uppercase">
                WITHDRAWAL HISTORY
              </h3>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="text-zinc-500 hover:text-white pb-2 text-[10px] font-black uppercase tracking-widest"
              >
                CLOSE
              </button>
            </div>

            <div className="space-y-4">
              {withdrawals.length === 0 ? (
                <p className="text-xs text-zinc-500 font-mono italic">
                  NO RECORDS FOUND.
                </p>
              ) : (
                withdrawals.map((w) => (
                  <div
                    key={w.id}
                    className="flex justify-between border-b border-zinc-900 pb-2"
                  >
                    <span className="text-xs text-zinc-400 font-mono">
                      {new Date(w.withdrawal_date).toLocaleDateString()}
                    </span>
                    <span className="text-xs text-white font-black font-mono">
                      -${w.amount.toLocaleString()}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountsPage;
