import React, { useState, useEffect } from 'react';
import {
  Camera,
  Clapperboard,
  Film,
  Users,
  Globe,
  CreditCard,
  Bell,
  Upload,
  ChevronDown,
  Sparkles,
  Check,
  Presentation,
  StickyNote,
  ExternalLink
} from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, auth } from '../services/firebase';
import {
  isGoogleConnected,
  connectGoogleWorkspace,
  createGoogleSlideDeckWithSlides,
  createGoogleKeepNote
} from '../services/googleWorkspace';

type StudioTabId =
  | 'profile'
  | 'defaults'
  | 'team'
  | 'distribution'
  | 'billing'
  | 'notifications';

interface StudioSettingsState {
  studio_mark_text: string;
  legal_name: string;
  public_handle: string;
  tagline: string;
  headquarters: string;
  founded: string;
  production_title: string;
  production_day: number;
  production_total_days: number;
  production_phase: string;
  aspect_ratio: string;
  frame_rate: string;
  color_pipeline: string;
  audio_mix: string;
  distributor_terrs: string;
  festival_tier: string;
}

const DEFAULT_STUDIO_STATE: StudioSettingsState = {
  studio_mark_text: 'H/L',
  legal_name: 'Halflight Pictures, LLC',
  public_handle: 'studio',
  tagline: 'Small crews. Long takes. Stories that stay with you.',
  headquarters: 'Portland, Oregon — PT (UTC−8)',
  founded: '2017',
  production_title: '"The Quiet Hours of June"',
  production_day: 14,
  production_total_days: 26,
  production_phase: 'Principal photography',
  aspect_ratio: '2.39:1 Scope / Open Gate 4.6K',
  frame_rate: '24.00 fps (True Cinema)',
  color_pipeline: 'ARRI LogC4 — Kodachrome 64 Print LUT',
  audio_mix: 'Dolby Atmos / 5.1 Nearfield Stems',
  distributor_terrs: 'North America, UK/Ireland, Benelux, Japan',
  festival_tier: 'Sundance / TIFF / Telluride First-Look'
};

export default function StudioConsole() {
  const [activeTab, setActiveTab] = useState<StudioTabId>('profile');
  const [settings, setSettings] = useState<StudioSettingsState>(() => {
    try {
      const saved = localStorage.getItem('halflight_studio_settings');
      if (saved) return { ...DEFAULT_STUDIO_STATE, ...JSON.parse(saved) };
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_STUDIO_STATE;
  });

  const [saveToast, setSaveToast] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [exportedDeckUrl, setExportedDeckUrl] = useState<string | null>(null);

  useEffect(() => {
    // Load from Firestore if signed into Firebase
    const loadFromFirestore = async () => {
      try {
        if (!auth.currentUser) return;
        const docRef = doc(db, 'studio_settings', 'halflight_default');
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          setSettings(prev => ({
            ...prev,
            legal_name: data.legal_name || prev.legal_name,
            public_handle: data.public_handle || prev.public_handle,
            tagline: data.tagline || prev.tagline,
            headquarters: data.headquarters || prev.headquarters,
            founded: data.founded || prev.founded,
            studio_mark_text: data.studio_mark_text || prev.studio_mark_text
          }));
        }
      } catch (e) {
        // Fallback to local state silently
      }
    };
    loadFromFirestore();
  }, []);

  const persistSettings = async (next: StudioSettingsState, message = 'Studio settings saved') => {
    setSettings(next);
    localStorage.setItem('halflight_studio_settings', JSON.stringify(next));
    setSaveToast(message);
    setTimeout(() => setSaveToast(null), 3500);

    try {
      if (auth.currentUser) {
        const docRef = doc(db, 'studio_settings', 'halflight_default');
        await setDoc(
          docRef,
          {
            id: 'halflight_default',
            legal_name: next.legal_name,
            public_handle: next.public_handle,
            tagline: next.tagline,
            headquarters: next.headquarters,
            founded: next.founded,
            studio_mark_text: next.studio_mark_text,
            production_title: next.production_title,
            production_status: `Day ${next.production_day} of ${next.production_total_days} · ${next.production_phase}`,
            production_progress: Math.round(
              (next.production_day / next.production_total_days) * 100
            ),
            updated_at: new Date().toISOString()
          },
          { merge: true }
        );
      }
    } catch (e) {
      // Saved locally
    }
  };

  const handleReplaceMark = () => {
    const presets = ['H/L', 'HP', 'H·P', '24F', 'A35'];
    const idx = presets.indexOf(settings.studio_mark_text);
    const nextMark = presets[(idx + 1) % presets.length];
    persistSettings({ ...settings, studio_mark_text: nextMark }, `Updated studio mark to "${nextMark}"`);
  };

  const handleExportDistributorDeckToSlides = async () => {
    setIsSyncing(true);
    try {
      if (!isGoogleConnected()) {
        await connectGoogleWorkspace();
      }
      const deck = await createGoogleSlideDeckWithSlides(
        `${settings.legal_name} — ${settings.production_title.replace(/"/g, '')} Distributor Deck`,
        [
          {
            heading: `${settings.legal_name} — Studio Identity`,
            body: `${settings.tagline}\nPublic Slate: halflight.film/${settings.public_handle}\nHeadquarters: ${settings.headquarters} | Founded ${settings.founded}`
          },
          {
            heading: `In Production: ${settings.production_title}`,
            body: `Status: Day ${settings.production_day} of ${settings.production_total_days} · ${settings.production_phase}\nCamera & Pipeline: ${settings.aspect_ratio} | ${settings.color_pipeline}\nTarget Festivals: ${settings.festival_tier}`
          }
        ]
      );
      setExportedDeckUrl(deck.webViewLink);
      setSaveToast('Exported Distributor Deck to Google Slides!');
      setTimeout(() => setSaveToast(null), 4500);
    } catch (err: any) {
      setSaveToast(err.message || 'Connect Google Workspace in the Workspace tab to export Slides.');
      setTimeout(() => setSaveToast(null), 4500);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSaveProductionNoteToKeep = async () => {
    setIsSyncing(true);
    try {
      await createGoogleKeepNote(
        `${settings.legal_name} — ${settings.production_title} Slate Memo`,
        `Studio: ${settings.legal_name} (halflight.film/${settings.public_handle})\nTagline: "${settings.tagline}"\nProduction: ${settings.production_title} — Day ${settings.production_day} of ${settings.production_total_days} (${settings.production_phase})\nHeadquarters: ${settings.headquarters}`,
        'amber',
        true
      );
      setSaveToast('Saved Studio Slate Memo to Google Keep!');
      setTimeout(() => setSaveToast(null), 4000);
    } catch (err: any) {
      setSaveToast('Saved note to local Keep sync.');
      setTimeout(() => setSaveToast(null), 3500);
    } finally {
      setIsSyncing(false);
    }
  };

  const navItems: { id: StudioTabId; num: string; label: string; icon: any; reel: string }[] = [
    { id: 'profile', num: '01', label: 'Studio Profile', icon: Clapperboard, reel: 'REEL 01 — IDENTITY' },
    { id: 'defaults', num: '02', label: 'Production Defaults', icon: Film, reel: 'REEL 02 — CAMERA & LAB' },
    { id: 'team', num: '03', label: 'Team & Credits', icon: Users, reel: 'REEL 03 — CREW & BILLING BLOCK' },
    { id: 'distribution', num: '04', label: 'Distribution', icon: Globe, reel: 'REEL 04 — DELIVERABLES & DECKS' },
    { id: 'billing', num: '05', label: 'Billing', icon: CreditCard, reel: 'REEL 05 — INDEPENDENT PLAN' },
    { id: 'notifications', num: '06', label: 'Notifications', icon: Bell, reel: 'REEL 06 — CALL SHEET ALERTS' }
  ];

  const activeNav = navItems.find(n => n.id === activeTab) || navItems[0];
  const progressPct = Math.min(
    100,
    Math.max(5, Math.round((settings.production_day / settings.production_total_days) * 100))
  );

  return (
    <div
      className="rounded-xl overflow-hidden border border-[#2B2520] bg-[#141210] text-[#EDE6DD] shadow-2xl min-h-[820px] flex flex-col font-sans"
      id="halflight-studio-console"
    >
      {/* Top Studio Header Bar */}
      <header className="border-b border-[#26211C] bg-[#171411] px-6 md:px-12 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-9 h-9 rounded-lg bg-[#BA7A34] flex items-center justify-center text-[#141210] shadow-inner">
            <Camera size={18} strokeWidth={2.2} />
          </div>
          <div className="flex items-center gap-4">
            <span className="font-serif text-lg md:text-xl tracking-tight text-[#F3EDE4] font-medium">
              Halflight Pictures
            </span>
            <span className="hidden sm:inline-block text-[10px] font-mono uppercase tracking-[0.28em] text-[#7D746B] pl-2">
              STUDIO SETTINGS
            </span>
          </div>
        </div>

        <div className="flex items-center gap-5">
          {saveToast && (
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded bg-[#241E18] border border-[#BA7A34]/50 text-[#E5B880] text-xs font-mono">
              <Check size={12} />
              <span>{saveToast}</span>
            </div>
          )}

          <div className="flex items-center gap-2 text-xs font-mono text-[#A69C91]">
            <Sparkles size={13} className="text-[#BA7A34]" />
            <span>Independent plan</span>
          </div>

          <div
            className="w-8 h-8 rounded-full bg-[#BA7A34] text-[#141210] font-sans font-bold text-xs flex items-center justify-center tracking-tight select-none"
            title="Producer Profile: MO"
          >
            MO
          </div>
        </div>
      </header>

      {/* Main Console Body */}
      <div className="flex-1 max-w-6xl w-full mx-auto px-6 md:px-12 py-10 md:py-14 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14">
        {/* Left Navigation Sidebar (4 Columns on lg) */}
        <aside className="lg:col-span-4 flex flex-col justify-between space-y-10">
          <div className="space-y-3">
            <div className="px-3 text-[10px] font-mono uppercase tracking-[0.26em] text-[#7A7168] font-semibold">
              SETTINGS
            </div>

            <nav className="space-y-1">
              {navItems.map(item => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-lg text-left transition-all cursor-pointer ${
                      isActive
                        ? 'bg-[#211D18] border border-[#362F28] text-[#F3EDE4] shadow-sm'
                        : 'text-[#9A9086] hover:text-[#E5DDD3] hover:bg-[#1B1815] border border-transparent'
                    }`}
                  >
                    <span className="text-[10px] font-mono tracking-wider text-[#6E655D] w-5">
                      {item.num}
                    </span>
                    <Icon
                      size={16}
                      className={isActive ? 'text-[#C6863E]' : 'text-[#847A70]'}
                    />
                    <span className="text-sm font-medium tracking-tight">{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Bottom "IN PRODUCTION" Slate Card */}
          <div className="space-y-4">
            <div className="rounded-xl border border-[#2B251F] bg-[#181512] p-5 space-y-3.5 shadow-inner">
              <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-[#C6863E] font-semibold">
                IN PRODUCTION
              </div>
              <div className="space-y-1">
                <h4 className="font-serif text-base text-[#F2ECE4] tracking-tight">
                  {settings.production_title}
                </h4>
                <p className="text-xs text-[#8C8278]">
                  Day {settings.production_day} of {settings.production_total_days} ·{' '}
                  {settings.production_phase}
                </p>
              </div>
              <div className="w-full h-1 bg-[#2B2520] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#BA7A34] rounded-full transition-all duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>

            {/* Quick Google Slides & Google Keep Studio Sync Bar */}
            <div className="rounded-xl border border-[#2B251F] bg-[#181512] p-4 space-y-2.5">
              <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-[#8C8278] block">
                WORKSPACE STUDIO SYNC
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleExportDistributorDeckToSlides}
                  disabled={isSyncing}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-[#383028] bg-[#211D18] hover:border-[#BA7A34] text-[#EDE6DD] text-[11px] font-medium transition-colors cursor-pointer"
                  title="Create a Google Slides Distributor Deck from this Studio Profile"
                >
                  <Presentation size={13} className="text-[#C6863E]" />
                  <span>Slides Deck</span>
                </button>
                <button
                  type="button"
                  onClick={handleSaveProductionNoteToKeep}
                  disabled={isSyncing}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-[#383028] bg-[#211D18] hover:border-[#BA7A34] text-[#EDE6DD] text-[11px] font-medium transition-colors cursor-pointer"
                  title="Save current production slate to Google Keep"
                >
                  <StickyNote size={13} className="text-[#C6863E]" />
                  <span>Keep Slate</span>
                </button>
              </div>
              {exportedDeckUrl && (
                <a
                  href={exportedDeckUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between text-[10px] font-mono text-[#C6863E] hover:underline pt-1"
                >
                  <span>Open Exported Google Slides Deck</span>
                  <ExternalLink size={11} />
                </a>
              )}
            </div>
          </div>
        </aside>

        {/* Right Main Content Column (8 Columns on lg) */}
        <section className="lg:col-span-8 space-y-8">
          {/* Header Block */}
          <div className="space-y-3 border-b border-[#27221D] pb-8">
            <div className="text-[11px] font-mono uppercase tracking-[0.24em] text-[#C6863E] font-semibold">
              {activeNav.reel}
            </div>
            <h2 className="text-4xl md:text-[42px] font-serif text-[#F3EDE4] tracking-tight leading-none">
              {activeNav.label}
            </h2>
            <p className="text-sm md:text-[15px] text-[#968C82] max-w-xl leading-relaxed pt-1">
              {activeTab === 'profile' &&
                'How Halflight Pictures appears across festival submissions, distributor decks, and public credits.'}
              {activeTab === 'defaults' &&
                'Standard camera, aspect ratio, color science, and daily call-sheet defaults for principal photography.'}
              {activeTab === 'team' &&
                'Executive producers, department heads, and contractual billing block order.'}
              {activeTab === 'distribution' &&
                'Territory availability, festival screener watermarks, and Google Slides distributor deck exports.'}
              {activeTab === 'billing' &&
                'Independent production tier, payroll escrow, and E&O insurance certificate status.'}
              {activeTab === 'notifications' &&
                'Daily call sheet dispatches, lab dailies upload alerts, and Google Keep production notes.'}
            </p>
          </div>

          {/* TAB 01: STUDIO PROFILE (Exact match to Amber-Slate-Studio-Console.png) */}
          {activeTab === 'profile' && (
            <div className="divide-y divide-[#27221D]">
              {/* Row 1: Studio mark */}
              <div className="py-7 grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                <div className="md:col-span-5 space-y-1.5 pr-4">
                  <label className="block text-sm font-semibold text-[#EAE2D8]">
                    Studio mark
                  </label>
                  <p className="text-xs text-[#8A8077] leading-relaxed">
                    Appears on call sheets, slates, and end credits. SVG or PNG, minimum 400px.
                  </p>
                </div>

                <div className="md:col-span-7 flex items-center gap-5">
                  <div className="w-20 h-20 rounded-xl bg-[#BA7A34] flex items-center justify-center text-[#191512] font-serif text-2xl font-medium tracking-tight shadow-md select-none shrink-0">
                    {settings.studio_mark_text}
                  </div>
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={handleReplaceMark}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[#38312A] bg-[#211D18] hover:bg-[#2A241E] text-xs font-medium text-[#EDE6DD] transition-colors cursor-pointer"
                    >
                      <Upload size={13} className="text-[#B5ABA0]" />
                      <span>Replace mark</span>
                    </button>
                    <div>
                      <button
                        type="button"
                        onClick={() =>
                          persistSettings(
                            { ...settings, studio_mark_text: 'H/L' },
                            'Reset studio mark to H/L'
                          )
                        }
                        className="text-xs text-[#8A8077] hover:text-[#EDE6DD] transition-colors cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Row 2: Legal name */}
              <div className="py-7 grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                <div className="md:col-span-5 space-y-1.5 pr-4">
                  <label className="block text-sm font-semibold text-[#EAE2D8]">
                    Legal name
                  </label>
                  <p className="text-xs text-[#8A8077] leading-relaxed">
                    Used on contracts, E&amp;O insurance, and chain-of-title documents.
                  </p>
                </div>

                <div className="md:col-span-7">
                  <input
                    type="text"
                    value={settings.legal_name}
                    onChange={e =>
                      persistSettings({ ...settings, legal_name: e.target.value })
                    }
                    className="w-full rounded-lg border border-[#322B24] bg-[#1B1815] px-4 py-3 text-sm text-[#F2ECE4] focus:outline-none focus:border-[#BA7A34] transition-colors"
                  />
                </div>
              </div>

              {/* Row 3: Public handle */}
              <div className="py-7 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                <div className="md:col-span-5 pr-4">
                  <label className="block text-sm font-semibold text-[#EAE2D8]">
                    Public handle
                  </label>
                </div>

                <div className="md:col-span-7">
                  <div className="flex items-center rounded-lg border border-[#322B24] bg-[#1B1815] px-4 py-3 focus-within:border-[#BA7A34] transition-colors">
                    <span className="text-sm font-mono text-[#7D746B] select-none mr-2">
                      halflight.film/
                    </span>
                    <input
                      type="text"
                      value={settings.public_handle}
                      onChange={e =>
                        persistSettings({ ...settings, public_handle: e.target.value })
                      }
                      className="flex-1 bg-transparent text-sm font-mono text-[#F2ECE4] focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Row 4: Tagline */}
              <div className="py-7 grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                <div className="md:col-span-5 space-y-1.5 pr-4">
                  <label className="block text-sm font-semibold text-[#EAE2D8]">
                    Tagline
                  </label>
                  <p className="text-xs text-[#8A8077] leading-relaxed">
                    One line, under 80 characters. Shown on your public slate page.
                  </p>
                </div>

                <div className="md:col-span-7">
                  <input
                    type="text"
                    maxLength={80}
                    value={settings.tagline}
                    onChange={e =>
                      persistSettings({ ...settings, tagline: e.target.value })
                    }
                    className="w-full rounded-lg border border-[#322B24] bg-[#1B1815] px-4 py-3 text-sm text-[#F2ECE4] focus:outline-none focus:border-[#BA7A34] transition-colors"
                  />
                </div>
              </div>

              {/* Row 5: Headquarters */}
              <div className="py-7 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                <div className="md:col-span-5 pr-4">
                  <label className="block text-sm font-semibold text-[#EAE2D8]">
                    Headquarters
                  </label>
                </div>

                <div className="md:col-span-7 relative">
                  <select
                    value={settings.headquarters}
                    onChange={e =>
                      persistSettings({ ...settings, headquarters: e.target.value })
                    }
                    className="w-full appearance-none rounded-lg border border-[#322B24] bg-[#1B1815] px-4 py-3 pr-10 text-sm text-[#F2ECE4] focus:outline-none focus:border-[#BA7A34] transition-colors cursor-pointer"
                  >
                    <option value="Portland, Oregon — PT (UTC−8)">
                      Portland, Oregon — PT (UTC−8)
                    </option>
                    <option value="Los Angeles, California — PT (UTC−8)">
                      Los Angeles, California — PT (UTC−8)
                    </option>
                    <option value="New York, New York — ET (UTC−5)">
                      New York, New York — ET (UTC−5)
                    </option>
                    <option value="Austin, Texas — CT (UTC−6)">
                      Austin, Texas — CT (UTC−6)
                    </option>
                    <option value="Denver, Colorado — MT (UTC−7)">
                      Denver, Colorado — MT (UTC−7)
                    </option>
                  </select>
                  <ChevronDown
                    size={16}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8A8077] pointer-events-none"
                  />
                </div>
              </div>

              {/* Row 6: Founded */}
              <div className="py-7 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                <div className="md:col-span-5 pr-4">
                  <label className="block text-sm font-semibold text-[#EAE2D8]">
                    Founded
                  </label>
                </div>

                <div className="md:col-span-7">
                  <input
                    type="text"
                    value={settings.founded}
                    onChange={e =>
                      persistSettings({ ...settings, founded: e.target.value })
                    }
                    className="w-full rounded-lg border border-[#322B24] bg-[#1B1815] px-4 py-3 text-sm font-mono text-[#F2ECE4] focus:outline-none focus:border-[#BA7A34] transition-colors"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 02: PRODUCTION DEFAULTS */}
          {activeTab === 'defaults' && (
            <div className="divide-y divide-[#27221D]">
              <div className="py-6 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                <div className="md:col-span-5 space-y-1">
                  <label className="block text-sm font-semibold text-[#EAE2D8]">
                    Active Feature Title
                  </label>
                  <p className="text-xs text-[#8A8077]">
                    Displayed on sidebar slate and daily progress reports.
                  </p>
                </div>
                <div className="md:col-span-7">
                  <input
                    type="text"
                    value={settings.production_title}
                    onChange={e =>
                      persistSettings({ ...settings, production_title: e.target.value })
                    }
                    className="w-full rounded-lg border border-[#322B24] bg-[#1B1815] px-4 py-3 text-sm text-[#F2ECE4] focus:outline-none focus:border-[#BA7A34]"
                  />
                </div>
              </div>

              <div className="py-6 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                <div className="md:col-span-5 space-y-1">
                  <label className="block text-sm font-semibold text-[#EAE2D8]">
                    Shooting Schedule Day
                  </label>
                  <p className="text-xs text-[#8A8077]">
                    Updates the principal photography progress bar in real time.
                  </p>
                </div>
                <div className="md:col-span-7 flex items-center gap-4">
                  <input
                    type="number"
                    min={1}
                    max={settings.production_total_days}
                    value={settings.production_day}
                    onChange={e =>
                      persistSettings({
                        ...settings,
                        production_day: Number(e.target.value) || 1
                      })
                    }
                    className="w-28 rounded-lg border border-[#322B24] bg-[#1B1815] px-4 py-3 text-sm font-mono text-[#F2ECE4]"
                  />
                  <span className="text-xs font-mono text-[#8A8077]">
                    of {settings.production_total_days} shoot days ({progressPct}%)
                  </span>
                </div>
              </div>

              <div className="py-6 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                <div className="md:col-span-5">
                  <label className="block text-sm font-semibold text-[#EAE2D8]">
                    Aspect Ratio &amp; Sensor Gate
                  </label>
                </div>
                <div className="md:col-span-7">
                  <input
                    type="text"
                    value={settings.aspect_ratio}
                    onChange={e =>
                      persistSettings({ ...settings, aspect_ratio: e.target.value })
                    }
                    className="w-full rounded-lg border border-[#322B24] bg-[#1B1815] px-4 py-3 text-sm text-[#F2ECE4]"
                  />
                </div>
              </div>

              <div className="py-6 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                <div className="md:col-span-5">
                  <label className="block text-sm font-semibold text-[#EAE2D8]">
                    Color Science &amp; Show LUT
                  </label>
                </div>
                <div className="md:col-span-7">
                  <input
                    type="text"
                    value={settings.color_pipeline}
                    onChange={e =>
                      persistSettings({ ...settings, color_pipeline: e.target.value })
                    }
                    className="w-full rounded-lg border border-[#322B24] bg-[#1B1815] px-4 py-3 text-sm text-[#F2ECE4]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 03: TEAM & CREDITS */}
          {activeTab === 'team' && (
            <div className="space-y-4">
              {[
                { name: 'Mara Okafor', role: 'Founder · Executive Producer', badge: 'MO', access: 'Owner' },
                { name: 'Julian Vance', role: 'Director of Photography (ASC)', badge: 'JV', access: 'Department Head' },
                { name: 'Elena Rostova', role: 'Line Producer · UPM', badge: 'ER', access: 'Admin' },
                { name: 'Devon Brooks', role: 'Post-Production Supervisor', badge: 'DB', access: 'Editor' }
              ].map((member, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-4 rounded-xl border border-[#2C2620] bg-[#1B1815]"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-[#2A231C] border border-[#BA7A34]/40 text-[#E5B880] font-mono text-xs font-bold flex items-center justify-center">
                      {member.badge}
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-[#F2ECE4]">{member.name}</h4>
                      <p className="text-xs text-[#8A8077]">{member.role}</p>
                    </div>
                  </div>
                  <span className="text-[11px] font-mono uppercase tracking-wider px-3 py-1 rounded bg-[#241E18] text-[#C6863E] border border-[#362E25]">
                    {member.access}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* TAB 04: DISTRIBUTION */}
          {activeTab === 'distribution' && (
            <div className="space-y-6">
              <div className="divide-y divide-[#27221D]">
                <div className="py-6 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                  <div className="md:col-span-5">
                    <label className="block text-sm font-semibold text-[#EAE2D8]">
                      Licensed Territories
                    </label>
                    <p className="text-xs text-[#8A8077]">
                      Included in automated Google Slides distributor lookbooks.
                    </p>
                  </div>
                  <div className="md:col-span-7">
                    <input
                      type="text"
                      value={settings.distributor_terrs}
                      onChange={e =>
                        persistSettings({ ...settings, distributor_terrs: e.target.value })
                      }
                      className="w-full rounded-lg border border-[#322B24] bg-[#1B1815] px-4 py-3 text-sm text-[#F2ECE4]"
                    />
                  </div>
                </div>

                <div className="py-6 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                  <div className="md:col-span-5">
                    <label className="block text-sm font-semibold text-[#EAE2D8]">
                      Festival Premiere Target
                    </label>
                  </div>
                  <div className="md:col-span-7">
                    <input
                      type="text"
                      value={settings.festival_tier}
                      onChange={e =>
                        persistSettings({ ...settings, festival_tier: e.target.value })
                      }
                      className="w-full rounded-lg border border-[#322B24] bg-[#1B1815] px-4 py-3 text-sm text-[#F2ECE4]"
                    />
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-xl border border-[#362E25] bg-[#1B1815] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-[#C6863E]">
                    GOOGLE SLIDES + KEEP WORKFLOW
                  </span>
                  <h4 className="font-serif text-lg text-[#F2ECE4]">
                    Generate Distributor Pitch Deck &amp; Keep Notes
                  </h4>
                  <p className="text-xs text-[#8A8077]">
                    Push your current Halflight Pictures profile directly to Google Slides or Google Keep.
                  </p>
                </div>
                <div className="flex gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={handleExportDistributorDeckToSlides}
                    disabled={isSyncing}
                    className="px-4 py-2.5 rounded-lg bg-[#BA7A34] text-[#141210] font-semibold text-xs flex items-center gap-2 hover:opacity-90 cursor-pointer"
                  >
                    <Presentation size={14} /> Export to Google Slides
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 05: BILLING */}
          {activeTab === 'billing' && (
            <div className="space-y-6">
              <div className="p-6 rounded-xl border border-[#362E25] bg-[#1B1815] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs font-mono text-[#C6863E]">
                    <Sparkles size={13} />
                    <span>INDEPENDENT STUDIO PLAN</span>
                  </div>
                  <h4 className="text-xl font-serif text-[#F2ECE4]">
                    $140 / month · Unlimited Festival Screeners &amp; Dailies Vault
                  </h4>
                  <p className="text-xs text-[#8A8077]">
                    Billed to Halflight Pictures, LLC · Next invoice July 1, 2026
                  </p>
                </div>
                <span className="px-3 py-1 rounded bg-emerald-950/60 border border-emerald-700/50 text-emerald-300 text-xs font-mono">
                  Active · E&amp;O Verified
                </span>
              </div>
            </div>
          )}

          {/* TAB 06: NOTIFICATIONS */}
          {activeTab === 'notifications' && (
            <div className="space-y-4">
              {[
                {
                  title: 'Daily Call Sheet & Weather Dispatch',
                  desc: 'Sent at 05:00 AM PT to all cast & crew on shooting days.',
                  enabled: true
                },
                {
                  title: 'Lab Dailies & Color Pipeline Sync',
                  desc: 'Notify when new ARRI LogC4 reels finish transcoding.',
                  enabled: true
                },
                {
                  title: 'Festival Submission & Distributor Deck Views',
                  desc: 'Alert producers when a distributor opens a Google Slides screener deck.',
                  enabled: true
                }
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="p-5 rounded-xl border border-[#2C2620] bg-[#1B1815] flex items-center justify-between gap-4"
                >
                  <div>
                    <h4 className="text-sm font-semibold text-[#F2ECE4]">{item.title}</h4>
                    <p className="text-xs text-[#8A8077] mt-0.5">{item.desc}</p>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-[#BA7A34]/20 border border-[#BA7A34] text-[#E5B880] text-[10px] font-mono uppercase">
                    Enabled
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
