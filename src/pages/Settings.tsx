
import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../App';

const SettingsPage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Profile State
  const [profile, setProfile] = useState({
    name: '',
    email: user?.email || '',
  });

  // Password State
  const [passwords, setPasswords] = useState({
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      const { data: { user: authUser } } = await (supabase.auth as any).getUser();
      if (authUser) {
        setProfile({
          name: authUser.user_metadata?.full_name || '',
          email: authUser.email || '',
        });
      }
    };
    fetchProfile();
  }, [user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const { error } = await (supabase.auth as any).updateUser({
        email: profile.email,
        data: { full_name: profile.name }
      });

      if (error) throw error;
      setMessage({ text: 'IDENTITY_SYNCHRONIZED_SUCCESSFULLY', type: 'success' });
    } catch (err: any) {
      setMessage({ text: err.message.toUpperCase(), type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwords.newPassword !== passwords.confirmPassword) {
      setMessage({ text: 'PASSWORD_MISMATCH_ERROR', type: 'error' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const { error } = await (supabase.auth as any).updateUser({
        password: passwords.newPassword
      });

      if (error) throw error;
      setMessage({ text: 'SECURITY_PROTOCOL_UPDATED', type: 'success' });
      setPasswords({ newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      setMessage({ text: err.message.toUpperCase(), type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full bg-black border border-white p-4 text-[11px] font-bold uppercase tracking-widest focus:bg-white focus:text-black transition-all text-white placeholder-zinc-800";
  const labelClass = "block text-[9px] font-black text-zinc-500 mb-2 uppercase tracking-[0.2em]";
  const sectionHeaderClass = "text-xs font-black uppercase tracking-[0.4em] italic text-white border-b border-zinc-900 pb-4 mb-8";

  return (
    <div className="max-w-4xl mx-auto space-y-12 animate-in fade-in duration-700">
      <header>
        <h1 className="text-4xl font-black italic tracking-tighter uppercase">Protocol Control</h1>
        <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em] mt-2">Terminal Configuration / Security Override</p>
      </header>

      {message && (
        <div className={`p-4 border ${message.type === 'success' ? 'border-green-500 text-green-500' : 'border-red-500 text-red-500'} text-[10px] font-black uppercase tracking-widest animate-in slide-in-from-top-2`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        {/* Profile Section */}
        <section className="p-10 border border-white bg-pure-black space-y-8">
          <h3 className={sectionHeaderClass}>I. Identity Metadata</h3>
          <form onSubmit={handleUpdateProfile} className="space-y-6">
            <div>
              <label className={labelClass}>Display Name</label>
              <input 
                type="text" 
                className={inputClass}
                value={profile.name}
                onChange={e => setProfile({ ...profile, name: e.target.value })}
                placeholder="OPERATOR_01"
              />
            </div>
            <div>
              <label className={labelClass}>Email Address</label>
              <input 
                type="email" 
                className={inputClass}
                value={profile.email}
                onChange={e => setProfile({ ...profile, email: e.target.value })}
                placeholder="NAME@TERMINAL.COM"
              />
            </div>
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-white text-black py-4 text-[10px] font-black uppercase tracking-[0.3em] hover:bg-zinc-200 transition-all disabled:opacity-20"
            >
              COMMIT_IDENTITY
            </button>
          </form>
        </section>

        {/* Security Section */}
        <section className="p-10 border border-white bg-pure-black space-y-8">
          <h3 className={sectionHeaderClass}>II. Security Matrix</h3>
          <form onSubmit={handleChangePassword} className="space-y-6">
            <div>
              <label className={labelClass}>New Passphrase</label>
              <input 
                type="password" 
                className={inputClass}
                value={passwords.newPassword}
                onChange={e => setPasswords({ ...passwords, newPassword: e.target.value })}
                placeholder="••••••••"
                required
              />
            </div>
            <div>
              <label className={labelClass}>Confirm Passphrase</label>
              <input 
                type="password" 
                className={inputClass}
                value={passwords.confirmPassword}
                onChange={e => setPasswords({ ...passwords, confirmPassword: e.target.value })}
                placeholder="••••••••"
                required
              />
            </div>
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-transparent border border-white text-white py-4 text-[10px] font-black uppercase tracking-[0.3em] hover:bg-white hover:text-black transition-all disabled:opacity-20"
            >
              OVERRIDE_SECURITY
            </button>
          </form>
        </section>
      </div>

      <footer className="p-8 border border-zinc-900 opacity-40 hover:opacity-100 transition-opacity flex justify-between items-center">
        <div className="text-[9px] font-black uppercase tracking-widest text-zinc-500 italic">
          Encryption Level: AES-256 Verified
        </div>
        <div className="text-[9px] font-black uppercase tracking-widest text-zinc-500 italic">
          Connection Status: Secure_Tunnel
        </div>
      </footer>
    </div>
  );
};

export default SettingsPage;
