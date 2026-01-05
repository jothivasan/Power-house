import React, { useEffect, useState } from "react";
import { supabase } from "../services/supabase";
import { useAuth } from "../App";
import { WeeklyReview } from "../types";

const WeeklyReviewPage = () => {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<WeeklyReview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReviews = async () => {
      if (!user) return;
      setLoading(true);
      const { data, error } = await supabase
        .from("weekly_reviews")
        .select("*")
        .eq("user_id", user.id)
        .order("week", { ascending: false });

      if (!error) setReviews(data || []);
      setLoading(false);
    };
    fetchReviews();
  }, [user]);

  return (
    <div className="max-w-4xl mx-auto space-y-12">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black italic tracking-tighter uppercase">
            Weekly Audits
          </h1>
          <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em] mt-2">
            7-Day Performance Recalibration
          </p>
        </div>
        <button className="btn-primary px-8 py-3 rounded-none text-[10px] tracking-widest">
          NEW_AUDIT
        </button>
      </header>

      {loading ? (
        <div className="text-center py-20 text-[10px] font-black uppercase animate-pulse">
          Scanning Archives...
        </div>
      ) : reviews.length === 0 ? (
        <div className="border border-white p-20 text-center">
          <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">
            No audits logged in current epoch.
          </p>
        </div>
      ) : (
        <div className="space-y-0 border border-white">
          {reviews.map((rev, i) => (
            <div
              key={rev.id}
              className={`p-10 bg-black group hover:bg-white hover:text-black transition-all ${
                i !== reviews.length - 1 ? "border-b border-white" : ""
              }`}
            >
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                  <h3 className="text-2xl font-black italic tracking-tighter mb-1 uppercase">
                    {rev.week}
                  </h3>
                  <span className="text-[9px] border border-zinc-800 px-2 py-0.5 font-black uppercase group-hover:border-black">
                    STATUS: VERIFIED
                  </span>
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-10">
                <div>
                  <p className="text-[9px] text-zinc-500 font-black uppercase tracking-widest group-hover:text-black mb-4 italic">
                    Positive Flow
                  </p>
                  <p className="text-xs text-zinc-400 font-bold uppercase group-hover:text-black">
                    {rev.what_worked}
                  </p>
                </div>
                <div>
                  <p className="text-[9px] text-zinc-500 font-black uppercase tracking-widest group-hover:text-black mb-4 italic">
                    Friction Point
                  </p>
                  <p className="text-xs text-zinc-400 font-bold uppercase group-hover:text-black">
                    {rev.what_failed}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default WeeklyReviewPage;
