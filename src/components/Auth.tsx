import React, { useState } from 'react';
import { ShieldCheck, ArrowLeft } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useAuth } from '../AuthContext';

function cn(...inputs: Parameters<typeof clsx>) {
  return twMerge(clsx(inputs));
}

type AuthView = 'login' | 'register' | 'forgot' | 'reset';

export default function Auth() {
  const [view, setView] = useState<AuthView>('login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [facility, setFacility] = useState('');
  const [location, setLocation] = useState('');
  const [bio, setBio] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    
    try {
      if (view === 'login') {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Authentication failed');
        login(data.token, data.user);
      } 
      else if (view === 'register') {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, email, password, facility, location, bio })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Registration failed');
        login(data.token, data.user);
      }
      else if (view === 'forgot') {
        const res = await fetch('/api/auth/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to process request');
        setSuccessMsg(data.message + (data._devToken ? ` (Dev Token: ${data._devToken})` : ''));
        // Optionally switch to reset view immediately for dev convenience
        if (data._devToken) {
          setResetToken(data._devToken);
          setView('reset');
        }
      }
      else if (view === 'reset') {
        const res = await fetch('/api/auth/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: resetToken, newPassword: password })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to reset password');
        setSuccessMsg('Password reset successfully. You can now log in.');
        setView('login');
        setPassword('');
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#E4E3E0] text-[#141414] font-sans flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Hero brand strip */}
        <div className="bg-[#141414] text-[#E4E3E0] px-8 pt-10 pb-8 flex flex-col items-center">
          <div className="border border-[#E4E3E0]/30 p-4 mb-5">
            <ShieldCheck size={44} />
          </div>
          <h1 className="text-4xl font-serif italic uppercase tracking-tighter">The Yard</h1>
          <p className="text-[10px] opacity-50 mt-2 uppercase tracking-[0.25em]">Second Chance Network</p>
        </div>

        {/* Form card */}
        <div className="auth-card bg-white border border-t-0 border-[#141414] px-8 pb-8 pt-6 shadow-2xl">
          {/* Tab switcher for login/register */}
          {(view === 'login' || view === 'register') && (
            <div className="flex mb-6 border-b border-[#141414]/10">
              <button
                type="button"
                onClick={() => { setView('login'); setError(''); setSuccessMsg(''); }}
                className={cn(
                  "flex-1 pb-3 text-xs uppercase tracking-widest font-bold transition-all",
                  view === 'login' ? "border-b-2 border-[#141414] opacity-100" : "opacity-30 hover:opacity-60"
                )}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setView('register'); setError(''); setSuccessMsg(''); }}
                className={cn(
                  "flex-1 pb-3 text-xs uppercase tracking-widest font-bold transition-all",
                  view === 'register' ? "border-b-2 border-[#141414] opacity-100" : "opacity-30 hover:opacity-60"
                )}
              >
                Create Account
              </button>
            </div>
          )}

          {/* Heading for non-login/register views */}
          {view === 'forgot' && (
            <h2 className="text-lg font-serif italic mb-5">Reset Your Password</h2>
          )}
          {view === 'reset' && (
            <h2 className="text-lg font-serif italic mb-5">Enter New Password</h2>
          )}

        {error && (
          <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-3 mb-4 text-sm">
            {error}
          </div>
        )}

        {successMsg && (
          <div className="bg-green-50 border border-green-300 text-green-700 px-4 py-3 mb-4 text-sm break-all">
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {(view === 'login' || view === 'register') && (
            <div>
              <label className="block text-xs uppercase tracking-widest font-bold mb-1">Username</label>
              <input 
                type="text" 
                required
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full border border-[#141414] p-3 focus:outline-none focus:ring-2 focus:ring-[#141414]/10"
              />
            </div>
          )}

          {(view === 'register' || view === 'forgot') && (
            <div>
              <label className="block text-xs uppercase tracking-widest font-bold mb-1">Email</label>
              <input 
                type="email" 
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full border border-[#141414] p-3 focus:outline-none focus:ring-2 focus:ring-[#141414]/10"
              />
            </div>
          )}

          {view === 'reset' && (
            <div>
              <label className="block text-xs uppercase tracking-widest font-bold mb-1">Reset Token</label>
              <input 
                type="text" 
                required
                value={resetToken}
                onChange={e => setResetToken(e.target.value)}
                className="w-full border border-[#141414] p-3 focus:outline-none focus:ring-2 focus:ring-[#141414]/10"
              />
            </div>
          )}

          {(view === 'login' || view === 'register' || view === 'reset') && (
            <div>
              <label className="block text-xs uppercase tracking-widest font-bold mb-1">
                {view === 'reset' ? 'New Password' : 'Password'}
              </label>
              <input 
                type="password" 
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full border border-[#141414] p-3 focus:outline-none focus:ring-2 focus:ring-[#141414]/10"
              />
            </div>
          )}

          {view === 'register' && (
            <>
              <div>
                <label className="block text-xs uppercase tracking-widest font-bold mb-1">Facility / History</label>
                <input 
                  type="text" 
                  placeholder="e.g. San Quentin (2015-2022)"
                  value={facility}
                  onChange={e => setFacility(e.target.value)}
                  className="w-full border border-[#141414] p-3 focus:outline-none focus:ring-2 focus:ring-[#141414]/10"
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-widest font-bold mb-1">Location</label>
                <input 
                  type="text" 
                  placeholder="e.g. Denver, CO"
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  className="w-full border border-[#141414] p-3 focus:outline-none focus:ring-2 focus:ring-[#141414]/10"
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-widest font-bold mb-1">Bio</label>
                <textarea 
                  placeholder="Tell your story..."
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  className="w-full border border-[#141414] p-3 focus:outline-none focus:ring-2 focus:ring-[#141414]/10 h-24"
                />
              </div>
            </>
          )}

          <button
            type="submit"
            className="w-full bg-[#141414] text-[#E4E3E0] p-4 uppercase tracking-widest font-bold hover:opacity-80 active:scale-[0.98] transition-all mt-6"
          >
            {view === 'login' && 'Enter The Yard'}
            {view === 'register' && 'Create Account'}
            {view === 'forgot' && 'Send Reset Link'}
            {view === 'reset' && 'Reset Password'}
          </button>
        </form>

        <div className="mt-6 flex flex-col items-center gap-3">
          {view === 'login' && (
            <button
              onClick={() => { setView('forgot'); setError(''); setSuccessMsg(''); }}
              className="text-[10px] uppercase tracking-widest opacity-40 hover:opacity-80 hover:underline"
            >
              Forgot Password?
            </button>
          )}

          {(view === 'forgot' || view === 'reset') && (
            <button
              onClick={() => { setView('login'); setError(''); setSuccessMsg(''); }}
              className="text-xs uppercase tracking-widest opacity-60 hover:opacity-100 hover:underline flex items-center gap-1"
            >
              <ArrowLeft size={12} /> Back to Sign In
            </button>
          )}
        </div>
        </div>

        <p className="text-center text-[10px] uppercase tracking-widest opacity-30 mt-6">
          Built for Redemption — © {new Date().getFullYear()} The Yard
        </p>
      </div>
    </div>
  );
}
