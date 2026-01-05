import React from 'react';

const RulesPage = () => {
  const rules = [
    { title: "RISK EXPOSURE", content: "Hard limit of 1.0% risk per execution. No exceptions." },
    { title: "SYSTEM PROTOCOL", content: "Entry disallowed unless 3/3 setup criteria are explicitly met." },
    { title: "LIQUIDITY PATIENCE", content: "Price must reach designated level. Chasing is strictly prohibited." },
    { title: "LEDGER INTEGRITY", content: "All trades must be logged with visual proof within T+60 minutes." },
    { title: "CIRCUIT BREAKER", content: "3% daily drawdown triggers immediate terminal shutdown." }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-16">
      <header>
        <h1 className="text-4xl font-black italic tracking-tighter uppercase">Protocol</h1>
        <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em] mt-2">The Operational Framework of a Disciplined Edge.</p>
      </header>

      <div className="grid gap-0 border border-white">
        {rules.map((rule, idx) => (
          <div key={idx} className={`p-10 bg-black ${idx !== rules.length - 1 ? 'border-b border-white' : ''} group hover:bg-white hover:text-black transition-all`}>
            <div className="flex items-start gap-12">
              <span className="text-6xl font-black italic opacity-20 tracking-tighter group-hover:opacity-100">{String(idx + 1).padStart(2, '0')}</span>
              <div className="pt-2">
                <h3 className="text-xl font-black uppercase tracking-tighter mb-2 italic">{rule.title}</h3>
                <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest leading-loose group-hover:text-black">{rule.content}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="p-12 border border-white bg-black">
        <h4 className="text-[10px] font-black uppercase tracking-[0.4em] mb-6 text-white">THE CREED</h4>
        <p className="text-2xl font-black italic tracking-tighter text-white leading-tight uppercase">
          "I AM A RISK MANAGER FIRST. THE MARKET IS NOISE. MY JOURNAL IS THE ONLY SIGNAL."
        </p>
      </div>
    </div>
  );
};

export default RulesPage;