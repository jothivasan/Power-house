import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "../services/supabase";
import { Trade } from "../types";

const TradeDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [trade, setTrade] = useState<Trade | null>(null);
  const [loading, setLoading] = useState(true);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    const fetchTrade = async () => {
      const { data, error } = await supabase
        .from("trades")
        .select("*")
        .eq("id", id)
        .single();

      if (error || !data) {
        navigate("/trades");
        return;
      }

      setTrade(data);
      if (data.screenshot_url) {
        // Use signed URL for private bucket
        const { data: imgData } = await supabase.storage
          .from("trade-entries")
          .createSignedUrl(data.screenshot_url, 3600); // 1 hour expiry
        if (imgData) {
          setImageUrl(imgData.signedUrl);
        }
      }
      setLoading(false);
    };

    fetchTrade();
  }, [id, navigate]);

  const deleteTrade = async () => {
    if (!window.confirm("IRREVERSIBLE ACTION: CONFIRM DELETE?")) return;

    // Delete screenshot from storage if exists
    if (trade?.screenshot_url) {
      await supabase.storage
        .from("trade-entries")
        .remove([trade.screenshot_url]);
    }

    // Delete trade record
    const { error } = await supabase.from("trades").delete().eq("id", id);
    if (!error) navigate("/trades");
  };

  if (loading)
    return (
      <div className="text-white font-black animate-pulse">
        EXTRACTING LOG DATA...
      </div>
    );
  if (!trade) return null;

  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-24">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <Link
            to="/trades"
            className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 hover:text-white flex items-center gap-2 mb-4"
          >
            ← BACK_TO_LEDGER
          </Link>
          <h1 className="text-4xl font-black italic tracking-tighter uppercase">
            Inspection
          </h1>
          <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em] mt-2">
            UUID: {trade.id}
          </p>
        </div>
        <button
          onClick={deleteTrade}
          className="px-6 py-3 border border-white text-[10px] font-black uppercase tracking-widest hover:bg-white hover:text-black"
        >
          DELETE_LOG
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-12">
          <div className="grid grid-cols-1 md:grid-cols-3 border border-white">
            <div className="p-8 border-b md:border-b-0 md:border-r border-white">
              <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">
                Ticker
              </p>
              <p className="text-4xl font-black mt-2 italic">{trade.symbol}</p>
            </div>
            <div className="p-8 border-b md:border-b-0 md:border-r border-white bg-white text-black">
              <p className="text-[9px] font-black uppercase tracking-widest opacity-60">
                P&L Result
              </p>
              <p className="text-4xl font-black mt-2">
                {trade.pnl > 0 ? "+" : ""}
                {trade.pnl.toFixed(2)}
              </p>
            </div>
            <div className="p-8 bg-black">
              <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">
                Risk/Reward
              </p>
              <p className="text-4xl font-black mt-2">
                {trade.risk_reward?.toFixed(2) || "0.00"}
              </p>
            </div>
          </div>

          {imageUrl ? (
            <div className="border border-white p-2 bg-white/5">
              <img src={imageUrl} alt="Trade Chart" className="w-full" />
            </div>
          ) : (
            <div className="border border-white p-24 text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.5em] text-zinc-700 italic">
                No Visual Evidence Attached
              </p>
            </div>
          )}

          <div className="border border-white p-10 bg-black">
            <h3 className="text-xs font-black uppercase tracking-[0.4em] mb-8">
              Post-Mortem Analysis
            </h3>
            <p className="text-zinc-400 text-sm leading-relaxed uppercase font-medium italic border-l-2 border-white pl-8">
              "{trade.notes || "No analysis provided."}"
            </p>
          </div>
        </div>

        <div className="space-y-8">
          <div className="border border-white p-8">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] mb-10">
              Execution Specs
            </h3>
            <div className="space-y-6">
              {[
                { label: "Date", value: trade.trade_date },
                { label: "Direction", value: trade.direction.toUpperCase() },
                { label: "Market", value: trade.market.toUpperCase() },
                { label: "Timeframe", value: trade.timeframe },
                { label: "Entry", value: trade.entry_price },
                { label: "Exit", value: trade.exit_price },
                { label: "Volume", value: trade.position_size },
              ].map((row, i) => (
                <div
                  key={i}
                  className="flex justify-between items-end border-b border-zinc-900 pb-2"
                >
                  <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">
                    {row.label}
                  </span>
                  <span className="text-[11px] font-black">{row.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="border border-white p-8 space-y-8">
            <div>
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] mb-4">
                Setup
              </h3>
              <div className="flex flex-wrap gap-2">
                {trade.strategy?.map((s) => (
                  <span
                    key={s}
                    className="px-3 py-1 bg-white text-black text-[9px] font-black uppercase"
                  >
                    {s}
                  </span>
                ))}
                {(!trade.strategy || trade.strategy.length === 0) && (
                  <span className="text-[9px] text-zinc-700 uppercase italic font-black">
                    Null Setup
                  </span>
                )}
              </div>
            </div>
            <div>
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] mb-4">
                Confirmations
              </h3>
              <div className="flex flex-wrap gap-2">
                {trade.confirmations?.map((c) => (
                  <span
                    key={c}
                    className="px-3 py-1 bg-white/10 text-white text-[9px] font-black uppercase border border-white/20"
                  >
                    {c}
                  </span>
                ))}
                {(!trade.confirmations || trade.confirmations.length === 0) && (
                  <span className="text-[9px] text-zinc-700 uppercase italic font-black">
                    No Confirmations
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TradeDetail;
