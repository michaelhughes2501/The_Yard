import React, { useState } from 'react';
import { ArrowLeft, Compass, Sparkles } from 'lucide-react';
import { useAuth } from '../AuthContext';

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
  const [isDemoLoading, setIsDemoLoading] = useState(false);
  const { login } = useAuth();

  const handleQuickDemoLogin = async () => {
    setError('');
    setIsDemoLoading(true);
    try {
      const demoUsername = 'maren_voss';
      const demoPassword = 'password123';
      const loginRes = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: demoUsername, password: demoPassword })
      });
      if (loginRes.ok) {
        const data = await loginRes.json();
        login(data.token, data.user);
        return;
      }
      const regRes = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: demoUsername,
          email: 'maren.voss@wayfare.example.com',
          password: demoPassword,
          facility: 'San Quentin Rehabilitation Center',
          location: 'Portland, OR',
          bio: 'Culinary expedition lead, vocational mentor, and community advocate.'
        })
      });
      const regData = await regRes.json();
      if (!regRes.ok) throw new Error(regData.error || 'Demo login failed');
      login(regData.token, regData.user);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsDemoLoading(false);
    }
  };

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
      } else if (view === 'register') {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, email, password, facility, location, bio })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Registration failed');
        login(data.token, data.user);
      } else if (view === 'forgot') {
        const res = await fetch('/api/auth/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to process request');
        setSuccessMsg(data.message + (data._devToken ? ` (Dev Token: ${data._devToken})` : ''));
        if (data._devToken) {
          setResetToken(data._devToken);
          setView('reset');
        }
      } else if (view === 'reset') {
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
    <div className="min-h-screen wayfare-grid-bg text-[#261F1A] font-sans flex flex-col justify-center items-center p-4 md:p-8">
      <div className="w-full max-w-xl space-y-6">
        {/* Top Brand Bar matching Wayfare Kitchen */}
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-[#261F1A] text-[#F6F2EB] flex items-center justify-center shadow-xs">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 19L9 7l4 6 3-4 5 10H3z" />
              </svg>
            </div>
            <div>
              <div className="text-lg font-serif font-medium text-[#261F1A] leading-tight">
                Wayfare · The Yard
              </div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-[#7D7166]">
                MEMBER PREFERENCES & RE-ENTRY NETWORK
              </div>
            </div>
          </div>
          <span className="text-xs text-[#7D7166]">Settings › Member Portal</span>
        </div>

        {/* Espresso Hero Welcome Banner */}
        <div className="bg-[#261F1A] text-[#F7F3EC] rounded-2xl p-7 md:p-8 relative overflow-hidden shadow-sm">
          <div className="max-w-md space-y-2.5">
            <div className="text-[10px] uppercase tracking-[0.22em] text-[#C69249] font-medium">
              SOLSTICE GREETINGS · YEAR FOUR OF YOUR JOURNEY
            </div>
            <h1 className="text-2xl md:text-3xl font-serif leading-snug text-[#F7F3EC]">
              The trail rests — the table & community don’t.
            </h1>
            <p className="text-xs md:text-sm text-[#B8AFA4] leading-relaxed">
              Sign in to manage your expedition preferences, mentorship matching questionnaire, legal support tools, and private kites.
            </p>
          </div>
        </div>

        {/* Main Card */}
        <div className="bg-[#F6F2EB] border border-[#DDD4C7] rounded-2xl p-7 md:p-9 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 mb-6 border-b border-[#E2D9CC]">
            <div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-[#7D7166] flex items-center gap-1.5">
                <Compass size={13} className="text-[#984B27]" /> EXPEDITION ACCESS
              </div>
              <h2 className="text-2xl font-serif text-[#261F1A] mt-0.5">
                {view === 'login' && 'Member Sign In'}
                {view === 'register' && 'Create Member Profile'}
                {view === 'forgot' && 'Account Recovery'}
                {view === 'reset' && 'Set New Password'}
              </h2>
            </div>

            <button
              type="button"
              onClick={handleQuickDemoLogin}
              disabled={isDemoLoading}
              className="px-4 py-2.5 rounded-full bg-[#984B27] text-[#F7F3EC] text-xs font-medium hover:bg-[#843F1F] transition-colors flex items-center gap-1.5 cursor-pointer self-start sm:self-auto shrink-0"
            >
              <Sparkles size={13} />
              {isDemoLoading ? 'Opening Profile...' : 'Enter as Maren Voss (Demo)'}
            </button>
          </div>

          {error && (
            <div className="bg-[#984B27]/10 border border-[#984B27]/30 text-[#984B27] px-4 py-3 rounded-xl mb-5 text-xs font-medium">
              {error}
            </div>
          )}

          {successMsg && (
            <div className="bg-emerald-900/10 border border-emerald-800/30 text-emerald-900 px-4 py-3 rounded-xl mb-5 text-xs font-medium break-all">
              {successMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {(view === 'login' || view === 'register') && (
              <div>
                <label className="block text-xs font-semibold text-[#261F1A] mb-1.5">Username</label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="e.g. maren_voss"
                  className="w-full border border-[#D5CBC0] bg-[#FAF7F2] rounded-xl p-3 text-sm focus:outline-none focus:border-[#261F1A]"
                />
              </div>
            )}

            {(view === 'register' || view === 'forgot') && (
              <div>
                <label className="block text-xs font-semibold text-[#261F1A] mb-1.5">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="maren@wayfare.example.com"
                  className="w-full border border-[#D5CBC0] bg-[#FAF7F2] rounded-xl p-3 text-sm focus:outline-none focus:border-[#261F1A]"
                />
              </div>
            )}

            {view === 'reset' && (
              <div>
                <label className="block text-xs font-semibold text-[#261F1A] mb-1.5">Reset Token</label>
                <input
                  type="text"
                  required
                  value={resetToken}
                  onChange={e => setResetToken(e.target.value)}
                  className="w-full border border-[#D5CBC0] bg-[#FAF7F2] rounded-xl p-3 text-sm focus:outline-none focus:border-[#261F1A]"
                />
              </div>
            )}

            {(view === 'login' || view === 'register' || view === 'reset') && (
              <div>
                <label className="block text-xs font-semibold text-[#261F1A] mb-1.5">
                  {view === 'reset' ? 'New Password' : 'Password'}
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full border border-[#D5CBC0] bg-[#FAF7F2] rounded-xl p-3 text-sm focus:outline-none focus:border-[#261F1A]"
                />
              </div>
            )}

            {view === 'register' && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#261F1A] mb-1.5">Facility / History</label>
                    <input
                      type="text"
                      placeholder="e.g. San Quentin (2018-2023)"
                      value={facility}
                      onChange={e => setFacility(e.target.value)}
                      className="w-full border border-[#D5CBC0] bg-[#FAF7F2] rounded-xl p-3 text-sm focus:outline-none focus:border-[#261F1A]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#261F1A] mb-1.5">Location</label>
                    <input
                      type="text"
                      placeholder="e.g. Portland, OR"
                      value={location}
                      onChange={e => setLocation(e.target.value)}
                      className="w-full border border-[#D5CBC0] bg-[#FAF7F2] rounded-xl p-3 text-sm focus:outline-none focus:border-[#261F1A]"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#261F1A] mb-1.5">Bio & Route Goals</label>
                  <textarea
                    placeholder="Share your background, culinary or vocational goals..."
                    value={bio}
                    onChange={e => setBio(e.target.value)}
                    className="w-full border border-[#D5CBC0] bg-[#FAF7F2] rounded-xl p-3 text-sm focus:outline-none focus:border-[#261F1A] h-20"
                  />
                </div>
              </>
            )}

            <button
              type="submit"
              className="w-full bg-[#261F1A] text-[#F6F2EB] py-3.5 px-5 rounded-xl text-sm font-medium hover:bg-[#3A3028] transition-colors mt-4 cursor-pointer"
            >
              {view === 'login' && 'Enter Member Portal'}
              {view === 'register' && 'Create Expedition Account'}
              {view === 'forgot' && 'Send Recovery Link'}
              {view === 'reset' && 'Update Password'}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-[#E2D9CC] flex flex-wrap items-center justify-between gap-3 text-xs text-[#74695E]">
            {view === 'login' && (
              <>
                <button
                  type="button"
                  onClick={() => { setView('forgot'); setError(''); setSuccessMsg(''); }}
                  className="hover:text-[#261F1A] hover:underline cursor-pointer"
                >
                  Forgot password?
                </button>
                <button
                  type="button"
                  onClick={() => { setView('register'); setError(''); setSuccessMsg(''); }}
                  className="font-medium text-[#984B27] hover:underline cursor-pointer"
                >
                  New member? Create an account →
                </button>
              </>
            )}

            {view === 'register' && (
              <button
                type="button"
                onClick={() => { setView('login'); setError(''); setSuccessMsg(''); }}
                className="hover:text-[#261F1A] hover:underline cursor-pointer"
              >
                Already have an account? Sign in
              </button>
            )}

            {(view === 'forgot' || view === 'reset') && (
              <button
                type="button"
                onClick={() => { setView('login'); setError(''); setSuccessMsg(''); }}
                className="hover:text-[#261F1A] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft size={12} /> Back to Sign In
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

