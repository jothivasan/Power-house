
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../App';
import { Trade } from '../types';

const CalendarPage = () => {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);

  const monthNames = [
    "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
    "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"
  ];

  const daysOfWeek = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

  const fetchTradesForMonth = async () => {
    if (!user) return;
    setLoading(true);

    const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

    const { data, error } = await supabase
      .from('trades')
      .select('trade_date, pnl')
      .eq('user_id', user.id)
      .gte('trade_date', firstDay.toISOString().split('T')[0])
      .lte('trade_date', lastDay.toISOString().split('T')[0]);

    if (!error) {
      setTrades(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTradesForMonth();
  }, [user, currentDate]);

  const dailyPnL = useMemo(() => {
    const map: Record<string, number> = {};
    trades.forEach(t => {
      map[t.trade_date] = (map[t.trade_date] || 0) + Number(t.pnl);
    });
    return map;
  }, [trades]);

  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    
    // Padding for start of month
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push({ day: null, dateStr: null });
    }
    
    // Actual days
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(year, month, i);
      const dateStr = d.toISOString().split('T')[0];
      days.push({ day: i, dateStr });
    }
    
    return days;
  }, [currentDate]);

  const changeMonth = (offset: number) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1));
  };

  const stats = useMemo(() => {
    const totalProfit = trades.reduce((sum, t) => sum + Number(t.pnl), 0);
    const totalTrades = trades.length;
    const winningTrades = trades.filter(t => Number(t.pnl) > 0).length;
    const losingTrades = trades.filter(t => Number(t.pnl) < 0).length;
    return { totalProfit, totalTrades, winningTrades, losingTrades };
  }, [trades]);

  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-5xl font-black italic tracking-tighter uppercase">Chronicle</h1>
          <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em] mt-3">Monthly Execution Cycle / Alpha Distribution</p>
        </div>
        <div className="flex border border-white divide-x divide-white">
          <button 
            onClick={() => changeMonth(-1)}
            className="px-6 py-4 text-[10px] font-black hover:bg-white hover:text-black transition-colors"
          >
            PREV_EPOCH
          </button>
          <div className="px-8 py-4 bg-white text-black text-[11px] font-black tracking-widest min-w-[180px] text-center">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </div>
          <button 
            onClick={() => changeMonth(1)}
            className="px-6 py-4 text-[10px] font-black hover:bg-white hover:text-black transition-colors"
          >
            NEXT_EPOCH
          </button>
        </div>
      </header>

      {/* Summary Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border border-white bg-black">
        <div className="p-8 border-b sm:border-b-0 sm:border-r border-white">
           <p className="text-zinc-500 text-[9px] font-black uppercase tracking-[0.3em]">Total Profit</p>
           <p className={`text-4xl font-black mt-3 tracking-tighter ${stats.totalProfit >= 0 ? 'text-white' : 'text-red-600'}`}>
             {stats.totalProfit >= 0 ? '+' : ''}${stats.totalProfit.toLocaleString()}
           </p>
        </div>
        <div className="p-8 border-b sm:border-b-0 lg:border-r border-white">
           <p className="text-zinc-500 text-[9px] font-black uppercase tracking-[0.3em]">Total Trades</p>
           <p className="text-4xl font-black mt-3 tracking-tighter">{stats.totalTrades}</p>
        </div>
        <div className="p-8 border-b sm:border-b-0 sm:border-r border-white">
           <p className="text-zinc-500 text-[9px] font-black uppercase tracking-[0.3em]">Winning Trades</p>
           <p className="text-4xl font-black mt-3 tracking-tighter text-white">{stats.winningTrades}</p>
        </div>
        <div className="p-8">
           <p className="text-zinc-500 text-[9px] font-black uppercase tracking-[0.3em]">Losing Trades</p>
           <p className="text-4xl font-black mt-3 tracking-tighter text-red-600">{stats.losingTrades}</p>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="border border-white bg-black">
        <div className="grid grid-cols-7 border-b border-white bg-white/5">
          {daysOfWeek.map(day => (
            <div key={day} className="py-4 text-center text-[9px] font-black tracking-[0.3em] text-zinc-500">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {loading ? (
            <div className="col-span-7 py-48 text-center text-[10px] font-black uppercase tracking-[0.5em] animate-pulse">
              Recalibrating Time Series...
            </div>
          ) : (
            calendarDays.map((d, i) => {
              const pnl = d.dateStr ? dailyPnL[d.dateStr] : null;
              const hasPnL = pnl !== undefined && pnl !== null;
              
              return (
                <div 
                  key={i} 
                  className={`min-h-[140px] border-r border-b border-zinc-900 p-4 transition-colors relative flex flex-col justify-between ${
                    d.day ? 'hover:bg-white/5' : ''
                  } ${i % 7 === 6 ? 'border-r-0' : ''}`}
                >
                  <span className={`text-[11px] font-black ${d.day ? 'text-zinc-500' : 'opacity-0'}`}>
                    {d.day && String(d.day).padStart(2, '0')}
                  </span>
                  
                  {d.day && hasPnL && (
                    <div className="flex flex-col items-center justify-center flex-1">
                      <p className={`text-[13px] font-black italic tracking-tighter ${pnl >= 0 ? 'text-[#22c55e]' : 'text-red-500'}`}>
                        {pnl >= 0 ? '+' : ''}${Math.abs(pnl).toLocaleString()}
                      </p>
                      <div className={`w-1 h-1 mt-2 ${pnl >= 0 ? 'bg-[#22c55e]' : 'bg-red-500 animate-pulse'}`}></div>
                    </div>
                  )}
                  
                  {d.day && !hasPnL && (
                    <div className="flex-1"></div>
                  )}

                  {d.dateStr === new Date().toISOString().split('T')[0] && (
                    <span className="absolute top-4 right-4 text-[8px] font-black bg-white text-black px-1 py-0.5 uppercase italic">TODAY</span>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default CalendarPage;
