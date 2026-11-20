import React, { useState, useEffect } from 'react';
import {
  Compass,
  MapPin,
  Calendar,
  Bell,
  CreditCard,
  Flame,
  Sparkles,
  Check,
  Users,
  ShieldCheck,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../AuthContext';

const HEAT_LEVELS = [
  { id: 'mild', label: 'Mild trail', description: 'Approachable regional classics & foundational steps' },
  { id: 'steady', label: 'Steady climb', description: 'Balanced spice, new techniques & weekly milestones' },
  { id: 'switchbacks', label: 'Switchbacks', description: 'Bold aromatics, complex preparations & deep dives' },
  { id: 'summit', label: 'Summit burn', description: 'Uncompromising heat & rare expedition originals' }
];

const CUISINE_ROUTES = [
  'Oaxacan',
  'Levantine',
  'Sichuan',
  'Basque',
  'Keralan',
  'Anatolian',
  'Hokkaido',
  'Andean'
];

interface ExpeditionPreferencesProps {
  onNavigateTab?: (tab: string) => void;
}

export default function ExpeditionPreferences({ onNavigateTab }: ExpeditionPreferencesProps) {
  const { user } = useAuth();
  const [subSection, setSubSection] = useState<'expedition' | 'delivery' | 'holiday' | 'signals' | 'billing'>('expedition');
  const [heatLevel, setHeatLevel] = useState<string>('switchbacks');
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>(['Oaxacan', 'Levantine', 'Sichuan']);
  const [allowBoldSubstitutions, setAllowBoldSubstitutions] = useState<boolean>(true);
  const [weekDec23Delivering, setWeekDec23Delivering] = useState<boolean>(true);
  const [weekDec30Delivering, setWeekDec30Delivering] = useState<boolean>(false);
  const [solsticeFeastBox, setSolsticeFeastBox] = useState<boolean>(true);
  const [deliveryWindow, setDeliveryWindow] = useState<string>('Tuesday · 08:00 – 12:00');
  const [smsSignals, setSmsSignals] = useState<boolean>(true);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(`wayfare_prefs_${user?.id || 'guest'}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.heatLevel) setHeatLevel(parsed.heatLevel);
        if (Array.isArray(parsed.selectedCuisines)) setSelectedCuisines(parsed.selectedCuisines);
        if (typeof parsed.allowBoldSubstitutions === 'boolean') setAllowBoldSubstitutions(parsed.allowBoldSubstitutions);
        if (typeof parsed.weekDec23Delivering === 'boolean') setWeekDec23Delivering(parsed.weekDec23Delivering);
        if (typeof parsed.weekDec30Delivering === 'boolean') setWeekDec30Delivering(parsed.weekDec30Delivering);
        if (typeof parsed.solsticeFeastBox === 'boolean') setSolsticeFeastBox(parsed.solsticeFeastBox);
      } catch (e) {
        console.error(e);
      }
    }
  }, [user?.id]);

  const persistState = (next: Partial<{
    heatLevel: string;
    selectedCuisines: string[];
    allowBoldSubstitutions: boolean;
    weekDec23Delivering: boolean;
    weekDec30Delivering: boolean;
    solsticeFeastBox: boolean;
  }>) => {
    const merged = {
      heatLevel,
      selectedCuisines,
      allowBoldSubstitutions,
      weekDec23Delivering,
      weekDec30Delivering,
      solsticeFeastBox,
      ...next
    };
    localStorage.setItem(`wayfare_prefs_${user?.id || 'guest'}`, JSON.stringify(merged));
    setSavedNotice('Preferences synced to your expedition profile');
    setTimeout(() => setSavedNotice(null), 2400);
  };

  const toggleCuisine = (cuisine: string) => {
    const exists = selectedCuisines.includes(cuisine);
    if (exists && selectedCuisines.length <= 1) return;
    const updated = exists
      ? selectedCuisines.filter(c => c !== cuisine)
      : [...selectedCuisines, cuisine];
    setSelectedCuisines(updated);
    persistState({ selectedCuisines: updated });
  };

  const totalWeeklyCost = (71.40 + (solsticeFeastBox ? 39.00 : 0)).toFixed(2);

  return (
    <div className="space-y-6">
      {/* Sub-navigation pills for Expedition Profile sections */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: 'expedition', label: 'Expedition profile', icon: Compass },
            { id: 'delivery', label: 'Delivery & route', icon: MapPin },
            { id: 'holiday', label: 'Holiday schedule', icon: Calendar },
            { id: 'signals', label: 'Signals', icon: Bell },
            { id: 'billing', label: 'Provisions & billing', icon: CreditCard }
          ].map(item => {
            const Icon = item.icon;
            const active = subSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSubSection(item.id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                  active
                    ? 'bg-[#F6F2EB] text-[#261F1A] border border-[#D8CFC2] shadow-xs font-semibold'
                    : 'text-[#6E6359] hover:text-[#261F1A] hover:bg-[#F6F2EB]/50'
                }`}
              >
                <Icon size={14} className={active ? 'text-[#261F1A]' : 'text-[#8C7F73]'} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {savedNotice && (
          <span className="text-xs text-[#984B27] font-medium flex items-center gap-1.5">
            <Check size={14} /> {savedNotice}
          </span>
        )}
      </div>

      {/* Main 2-Column Asymmetric Grid (Center Taste Profile + Right December Route & Limited Descent) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Center Column: Taste Profile Card (7 cols) */}
        <div className="xl:col-span-7 space-y-6">
          <div className="bg-[#F6F2EB] border border-[#DDD4C7] rounded-2xl p-7 md:p-8 space-y-7 shadow-xs">
            <div>
              <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.18em] text-[#7D7166] font-medium mb-2">
                <Flame size={13} className="text-[#984B27]" />
                <span>TASTE PROFILE</span>
              </div>
              <h2 className="text-2xl md:text-[28px] font-serif text-[#261F1A] tracking-tight">
                How far off the map?
              </h2>
              <p className="text-sm text-[#74695E] mt-1">
                Sets heat level and how unfamiliar your weekly recipes and community challenges get.
              </p>
            </div>

            {/* 4-Button Segmented Selector: Mild trail | Steady climb | Switchbacks | Summit burn */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {HEAT_LEVELS.map(level => {
                const active = heatLevel === level.id;
                return (
                  <button
                    key={level.id}
                    type="button"
                    onClick={() => {
                      setHeatLevel(level.id);
                      persistState({ heatLevel: level.id });
                    }}
                    className={`py-3.5 px-4 rounded-xl text-sm font-medium border transition-all cursor-pointer ${
                      active
                        ? 'bg-[#261F1A] text-[#F6F2EB] border-[#261F1A] shadow-xs'
                        : 'bg-transparent text-[#4A4037] border-[#D5CBC0] hover:border-[#261F1A]/50'
                    }`}
                  >
                    {level.label}
                  </button>
                );
              })}
            </div>

            {/* Cuisines on your route — pick at least three */}
            <div className="space-y-3.5">
              <div className="text-sm">
                <span className="font-semibold text-[#261F1A]">Cuisines on your route</span>{' '}
                <span className="text-[#84786C]">— pick at least three</span>
              </div>

              <div className="flex flex-wrap gap-2.5">
                {CUISINE_ROUTES.map(cuisine => {
                  const selected = selectedCuisines.includes(cuisine);
                  return (
                    <button
                      key={cuisine}
                      type="button"
                      onClick={() => toggleCuisine(cuisine)}
                      className={`px-4 py-2 rounded-full text-xs font-medium border transition-all flex items-center gap-1.5 cursor-pointer ${
                        selected
                          ? 'bg-[#984B27] text-[#F7F3EC] border-[#984B27]'
                          : 'bg-transparent text-[#4A4037] border-[#D5CBC0] hover:border-[#984B27]/60'
                      }`}
                    >
                      {selected && <Check size={13} strokeWidth={2.5} />}
                      <span>{cuisine}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Allow bold substitutions toggle row */}
            <div className="pt-6 border-t border-[#E2D9CC] flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-[#261F1A]">Allow bold substitutions</div>
                <div className="text-xs text-[#786D62] mt-0.5">
                  We may swap a familiar protein for the regional original.
                </div>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={allowBoldSubstitutions}
                onClick={() => {
                  const next = !allowBoldSubstitutions;
                  setAllowBoldSubstitutions(next);
                  persistState({ allowBoldSubstitutions: next });
                }}
                className={`w-12 h-7 rounded-full p-1 transition-colors cursor-pointer shrink-0 flex items-center ${
                  allowBoldSubstitutions ? 'bg-[#984B27] justify-end' : 'bg-[#D3C8BC] justify-start'
                }`}
              >
                <span className="w-5 h-5 rounded-full bg-[#F7F3EC] shadow-xs block" />
              </button>
            </div>
          </div>

          {/* Contextual Sub-panel based on subSection */}
          {subSection !== 'expedition' && (
            <div className="bg-[#F6F2EB] border border-[#DDD4C7] rounded-2xl p-6 space-y-4">
              {subSection === 'delivery' && (
                <div className="space-y-3">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-[#7D7166]">DELIVERY & ROUTE</div>
                  <h3 className="text-xl font-serif text-[#261F1A]">Courier Drop Window</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    {['Tuesday · 08:00 – 12:00', 'Thursday · 14:00 – 18:00'].map(win => (
                      <button
                        key={win}
                        type="button"
                        onClick={() => setDeliveryWindow(win)}
                        className={`p-3.5 rounded-xl border text-left text-xs font-medium cursor-pointer ${
                          deliveryWindow === win
                            ? 'bg-[#261F1A] text-[#F6F2EB] border-[#261F1A]'
                            : 'border-[#D5CBC0] text-[#4A4037]'
                        }`}
                      >
                        {win}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {subSection === 'holiday' && (
                <div className="space-y-2">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-[#7D7166]">WINTER SOLSTICE CALENDAR</div>
                  <h3 className="text-xl font-serif text-[#261F1A]">Seasonal Pause & Resumption</h3>
                  <p className="text-xs text-[#74695E]">
                    Adjust your December 23 and December 30 dispatches in the Holiday Deliveries card on the right before December 19.
                  </p>
                </div>
              )}

              {subSection === 'signals' && (
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.18em] text-[#7D7166]">DISPATCH SIGNALS</div>
                    <h3 className="text-xl font-serif text-[#261F1A]">SMS Trailhead Alerts</h3>
                    <p className="text-xs text-[#74695E] mt-0.5">
                      Receive recipe prep notes, mentorship kites, and courier tracking 24 hours before arrival.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSmsSignals(!smsSignals)}
                    className={`w-12 h-7 rounded-full p-1 transition-colors cursor-pointer shrink-0 flex items-center ${
                      smsSignals ? 'bg-[#984B27] justify-end' : 'bg-[#D3C8BC] justify-start'
                    }`}
                  >
                    <span className="w-5 h-5 rounded-full bg-[#F7F3EC] shadow-xs block" />
                  </button>
                </div>
              )}

              {subSection === 'billing' && (
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.18em] text-[#7D7166]">PROVISIONS & BILLING</div>
                    <h3 className="text-xl font-serif text-[#261F1A]">Pathfinder · Duo Subscription</h3>
                    <p className="text-xs text-[#74695E] mt-0.5 tabular-nums">
                      3 expeditions / week ($71.40) {solsticeFeastBox ? '+ Solstice Feast Box ($39.00)' : ''} · Next charge: ${totalWeeklyCost}
                    </p>
                  </div>
                  <span className="text-xs font-mono font-semibold text-[#984B27] tabular-nums">
                    ${totalWeeklyCost}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Quick Bridge to Community Mentorship & Re-Entry Programs */}
          {onNavigateTab && (
            <div className="bg-[#F6F2EB] border border-[#DDD4C7] rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="text-[11px] uppercase tracking-[0.18em] text-[#984B27] font-semibold">
                  COMMUNITY & VOCATIONAL PATHWAYS
                </div>
                <h3 className="text-lg font-serif text-[#261F1A]">
                  Culinary & Vocational Mentorship Matching
                </h3>
                <p className="text-xs text-[#74695E]">
                  Connect with verified mentors in culinary arts, logistics, technology, and transitional leadership.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => onNavigateTab('mentorship')}
                  className="px-4 py-2.5 rounded-xl bg-[#261F1A] text-[#F6F2EB] text-xs font-medium flex items-center gap-1.5 hover:bg-[#3A3028] cursor-pointer"
                >
                  <ShieldCheck size={14} /> Mentorship Match <ArrowRight size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => onNavigateTab('yard')}
                  className="px-4 py-2.5 rounded-xl border border-[#D5CBC0] text-[#261F1A] text-xs font-medium flex items-center gap-1.5 hover:border-[#261F1A] cursor-pointer"
                >
                  <Users size={14} /> The Yard
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: December Route & The Solstice Feast Box (5 cols) */}
        <div className="xl:col-span-5 space-y-6">
          {/* Card 1: December Route · Holiday deliveries */}
          <div className="bg-[#F6F2EB] border border-[#DDD4C7] rounded-2xl p-7 space-y-6 shadow-xs">
            <div>
              <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.18em] text-[#7D7166] font-medium mb-1.5">
                <Calendar size={13} className="text-[#7D7166]" />
                <span>DECEMBER ROUTE</span>
              </div>
              <h3 className="text-xl md:text-2xl font-serif text-[#261F1A]">
                Holiday deliveries
              </h3>
            </div>

            <div className="space-y-5">
              {/* Week of Dec 23 */}
              <div className="flex items-center justify-between gap-4 pb-5 border-b border-[#E2D9CC]">
                <div>
                  <div className="text-sm font-semibold text-[#261F1A]">Week of Dec 23</div>
                  <div className={`text-xs mt-0.5 ${weekDec23Delivering ? 'text-[#786D62]' : 'text-[#984B27]'}`}>
                    {weekDec23Delivering ? 'Delivering as planned' : 'Skipped — resting'}
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={weekDec23Delivering}
                  onClick={() => {
                    const next = !weekDec23Delivering;
                    setWeekDec23Delivering(next);
                    persistState({ weekDec23Delivering: next });
                  }}
                  className={`w-12 h-7 rounded-full p-1 transition-colors cursor-pointer shrink-0 flex items-center ${
                    weekDec23Delivering ? 'bg-[#984B27] justify-end' : 'bg-[#D3C8BC] justify-start'
                  }`}
                >
                  <span className="w-5 h-5 rounded-full bg-[#F7F3EC] shadow-xs block" />
                </button>
              </div>

              {/* Week of Dec 30 */}
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-[#261F1A]">Week of Dec 30</div>
                  <div className={`text-xs mt-0.5 ${weekDec30Delivering ? 'text-[#786D62]' : 'text-[#984B27]'}`}>
                    {weekDec30Delivering ? 'Delivering as planned' : 'Skipped — resting'}
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={weekDec30Delivering}
                  onClick={() => {
                    const next = !weekDec30Delivering;
                    setWeekDec30Delivering(next);
                    persistState({ weekDec30Delivering: next });
                  }}
                  className={`w-12 h-7 rounded-full p-1 transition-colors cursor-pointer shrink-0 flex items-center ${
                    weekDec30Delivering ? 'bg-[#984B27] justify-end' : 'bg-[#D3C8BC] justify-start'
                  }`}
                >
                  <span className="w-5 h-5 rounded-full bg-[#F7F3EC] shadow-xs block" />
                </button>
              </div>
            </div>
          </div>

          {/* Card 2: Limited Descent · The Solstice Feast Box */}
          <div className="bg-[#EFE5D8] border border-[#D4C2AE] rounded-2xl p-7 space-y-4 shadow-xs">
            <div>
              <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.18em] text-[#984B27] font-semibold mb-1.5">
                <Sparkles size={13} className="text-[#984B27]" />
                <span>LIMITED DESCENT</span>
              </div>
              <h3 className="text-xl md:text-2xl font-serif text-[#261F1A]">
                The Solstice Feast Box
              </h3>
            </div>

            <p className="text-xs md:text-sm text-[#61554B] leading-relaxed">
              A one-night, six-course Georgian supra — khachapuri, slow lamb, spiced wine. Ships Dec 21 only.
            </p>

            <div className="pt-2 flex items-center justify-between gap-4">
              <span className="text-sm font-bold text-[#261F1A] tabular-nums">
                + $39.00
              </span>

              <button
                type="button"
                role="switch"
                aria-checked={solsticeFeastBox}
                onClick={() => {
                  const next = !solsticeFeastBox;
                  setSolsticeFeastBox(next);
                  persistState({ solsticeFeastBox: next });
                }}
                className={`w-12 h-7 rounded-full p-1 transition-colors cursor-pointer shrink-0 flex items-center ${
                  solsticeFeastBox ? 'bg-[#984B27] justify-end' : 'bg-[#D3C8BC] justify-start'
                }`}
              >
                <span className="w-5 h-5 rounded-full bg-[#F7F3EC] shadow-xs block" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
