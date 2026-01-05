import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../services/supabase';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    // Fix: Property 'signInWithPassword' does not exist on type 'SupabaseAuthClient'. Casting to any for compatibility.
    const { error } = await (supabase.auth as any).signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black px-4">
      <div className="w-full max-w-md p-12 border border-white bg-black">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-black italic tracking-tighter uppercase mb-2">Identify</h1>
          <p className="text-zinc-600 text-[10px] font-black uppercase tracking-[0.3em]">Access Private Terminal</p>
        </div>

        {error && (
          <div className="mb-10 p-4 border border-red-500 text-red-500 text-[10px] font-black uppercase tracking-widest text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-10">
          <div>
            <label className="block text-[9px] font-black text-zinc-500 mb-3 uppercase tracking-[0.3em]">Credentials: Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-black border border-white p-4 text-[11px] font-bold uppercase tracking-widest focus:bg-white focus:text-black transition-all text-white placeholder-zinc-800"
              placeholder="name@terminal.com"
              required
            />
          </div>
          <div>
            <label className="block text-[9px] font-black text-zinc-500 mb-3 uppercase tracking-[0.3em]">Security: Passphrase</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-black border border-white p-4 text-[11px] font-bold uppercase tracking-widest focus:bg-white focus:text-black transition-all text-white placeholder-zinc-800"
              placeholder="••••••••"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white text-black font-black py-5 text-[11px] uppercase tracking-[0.4em] hover:bg-zinc-200 transition-all disabled:opacity-20"
          >
            {loading ? 'AUTHENTICATING...' : 'ESTABLISH_SESSION'}
          </button>
        </form>

        <div className="mt-12 text-center">
          <Link to="/register" className="text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-white transition-colors">
            Register New Account
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;