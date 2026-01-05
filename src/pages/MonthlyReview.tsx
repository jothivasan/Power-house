
import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../App';
import { MonthlyReview } from '../types';

const MonthlyReviewPage = () => {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<MonthlyReview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReviews = async () => {
      if (!user) return;
      setLoading(true);
      const { data, error } = await supabase
        .from('monthly_reviews')
        .select('*')
        .eq('user_id', user.id)
        .order('month', { ascending: false });

      if (!error) setReviews(data || []);
      setLoading(false);
    };
    fetchReviews();
  }, [user]);

  return (
    <div className="max-w-5xl mx-auto space-y-12">
      <header>
        <h1 className="text-4xl font-black italic tracking-tighter uppercase">Strategy Analysis</h1>
        <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em] mt-2">Long-term Alpha Verification</p>
      </header>

      {loading ? (
        <div className="text-center py-20 text-[10px] font-black uppercase animate-pulse">Fetching Statistics...</div>
      ) : reviews.length === 0 ? (
        <div className="border border-white p-20 text-center">
           <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Monthly records not yet initialized.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border border-white">
          {reviews.map((m, i) => (
            <div key={m.id} className={`p-10 bg-black group hover:bg-white hover:text-black transition-all ${i % 2 === 0 ? 'md:border-r' : ''} border-white`}>
              <div className="flex justify-between items-start mb-12">
                 <h3 className="text-2xl font-black italic tracking-tighter uppercase">{m.month}</h3>
                 <span className="text-[9px] font-black uppercase tracking-widest px-2 py-1 border border-zinc-800 group-hover:border-black">REPORTED</span>
              </div>
              
              <div className="grid grid-cols-2 gap-12 mb-12">
                 <div>
                    <p className="text-[9px] text-zinc-500 font-black uppercase tracking-widest group-hover:text-black">Yield Delta</p>
                    <p className="text-3xl font-black mt-2 tracking-tighter">${m.total_pnl.toLocaleString()}</p>
                 </div>
                 <div>
                    <p className="text-[9px] text-zinc-500 font-black uppercase tracking-widest group-hover:text-black">Efficiency</p>
                    <p className="text-3xl font-black mt-2 tracking-tighter">{m.win_rate}%</p>
                 </div>
              </div>

              <div className="pt-8 border-t border-zinc-900 group-hover:border-black">
                 <p className="text-[9px] text-zinc-500 uppercase font-black tracking-widest mb-4 group-hover:text-black italic">Key Intelligence</p>
                 <p className="text-xs text-zinc-400 font-bold uppercase leading-relaxed group-hover:text-black">
                   "{m.key_learnings || 'No learnings recorded.'}"
                 </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MonthlyReviewPage;
