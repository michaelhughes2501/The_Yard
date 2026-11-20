import React, { useState, useEffect } from 'react';
import {
  PhoneCall,
  ArrowRight,
  HeartPulse,
  UserCheck,
  Droplets,
  Sparkles,
  TestTube,
  Shield,
  Activity,
  Badge,
  Plus,
  X,
  Trash2,
  Map as MapIcon,
  Scale,
  Calculator,
  Search,
  BookOpen,
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  Building2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  UA_CHECK_INS,
  PAROLE_RESOURCES,
  MENTAL_HEALTH_RESOURCES,
  SELF_HELP_MATERIALS,
  STATE_COURT_DOCKETS,
  STATUTORY_SENTENCE_MATRIX
} from '../constants';
import { geminiService } from '../services/geminiService';
import Markdown from 'react-markdown';
import { useAuth } from '../AuthContext';
import { ParoleOfficer } from '../types';
import ConfirmationDialog from './ConfirmationDialog';
import ServiceMap from './ServiceMap';

const ResourceCard = ({ item, icon: Icon, type }: { item: any; icon: any; type: string }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    className="group flex flex-col justify-between bg-white border border-[#141414] p-6 hover:bg-[#141414] hover:text-[#E4E3E0] transition-colors duration-300"
  >
    <div>
      <div className="flex justify-between items-start mb-6">
        <div className="p-3 bg-[#E4E3E0] text-[#141414] rounded-sm group-hover:bg-white/10 group-hover:text-white transition-colors">
          <Icon size={24} />
        </div>
        <span className="text-[10px] font-mono uppercase tracking-widest opacity-40 group-hover:opacity-60">
          {type}
        </span>
      </div>
      <h4 className="text-xl font-bold mb-3">{item.title}</h4>
      <p className="text-sm opacity-60 leading-relaxed mb-8">{item.description}</p>
    </div>
    {item.phone ? (
      <a
        href={`tel:${item.phone}`}
        className="inline-flex items-center justify-between w-full pt-4 border-t border-[#141414]/10 group-hover:border-white/10 font-mono text-sm hover:text-amber-600 group-hover:hover:text-amber-300 transition-colors"
      >
        <span>{item.phone}</span>
        <PhoneCall size={16} />
      </a>
    ) : (
      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center justify-between w-full pt-4 border-t border-[#141414]/10 group-hover:border-white/10 font-mono text-sm uppercase tracking-widest hover:text-amber-600 group-hover:hover:text-amber-300 transition-colors"
      >
        <span>Visit Official Portal</span>
        <ArrowRight size={16} />
      </a>
    )}
  </motion.div>
);

const STATE_MULTIPLIERS: Record<string, { factor: number; truthInSentencingNote: string }> = {
  Colorado: {
    factor: 1.0,
    truthInSentencingNote: 'Colorado CRS § 18-1.3-401 presumptive ranges; non-violent offenses eligible for 50% earned time.'
  },
  California: {
    factor: 0.9,
    truthInSentencingNote: 'California Determinate Sentencing Law (Low / Middle / Upper Triad) + Prop 57 milestone credits.'
  },
  Texas: {
    factor: 1.15,
    truthInSentencingNote: 'Texas Penal Code Chapter 12 degree ranges; 3g/aggravated offenses require 50% flat time.'
  },
  'New York': {
    factor: 0.95,
    truthInSentencingNote: 'NY Penal Law Article 70 determinate/indeterminate tiers + Merit Time & Less Is More Act.'
  },
  Florida: {
    factor: 1.2,
    truthInSentencingNote: 'Florida Criminal Punishment Code requiring 85% minimum service across state prison sentences.'
  },
  Illinois: {
    factor: 0.95,
    truthInSentencingNote: 'Illinois Unified Code of Corrections Class 1–4 sentencing + day-for-day credit on eligible classes.'
  },
  Pennsylvania: {
    factor: 1.0,
    truthInSentencingNote: 'PA Sentencing Guidelines Matrix (Min/Max indeterminate structure; eligible for RRRI minimum).'
  },
  'Federal (U.S. Sentencing Guidelines)': {
    factor: 1.25,
    truthInSentencingNote: 'U.S.S.G. Offense Level / Criminal History Zone + First Step Act (up to 54 days/yr good conduct time).'
  }
};

export default function Resources({ initialShowAddPO = false }: { initialShowAddPO?: boolean }) {
  const { token } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<
    'all' | 'mental_health' | 'dockets' | 'estimator' | 'parole' | 'map'
  >('all');

  // Pillar 1: Mental Health & Self-Help states
  const [expandedWorkbookId, setExpandedWorkbookId] = useState<string | null>('sh-1');
  const [selfHelpTopic, setSelfHelpTopic] = useState('');
  const [selfHelpContent, setSelfHelpContent] = useState('');
  const [isLoadingSelfHelp, setIsLoadingSelfHelp] = useState(false);

  // Pillar 2: Court Dockets Database & Search states
  const [docketSearchFilter, setDocketSearchFilter] = useState('');
  const [docketSelectedState, setDocketSelectedState] = useState('Colorado');
  const [docketCaseQuery, setDocketCaseQuery] = useState('');
  const [docketInmateId, setDocketInmateId] = useState('');
  const [docketAiResult, setDocketAiResult] = useState<any>(null);
  const [isDocketAiLoading, setIsDocketAiLoading] = useState(false);

  // Pillar 3: Sentence Estimator states
  const [estState, setEstState] = useState('Colorado');
  const [estOffenseId, setEstOffenseId] = useState(STATUTORY_SENTENCE_MATRIX[0].id);
  const [estPriorHistory, setEstPriorHistory] = useState<'none' | 'one_prior' | 'habitual'>('none');
  const [estProgramCredit, setEstProgramCredit] = useState(true);
  const [estCustomNotes, setEstCustomNotes] = useState('');
  const [estAiAnalysis, setEstAiAnalysis] = useState('');
  const [isEstAiLoading, setIsEstAiLoading] = useState(false);

  // Pillar 4: Parole & RMOMS UA states
  const [officers, setOfficers] = useState<ParoleOfficer[]>([]);
  const [showAddPO, setShowAddPO] = useState(initialShowAddPO);
  const [poName, setPoName] = useState('');
  const [poAgency, setPoAgency] = useState('');
  const [poPhone, setPoPhone] = useState('');
  const [poDistrict, setPoDistrict] = useState('');
  const [rmomsColor, setRmomsColor] = useState('Amber');
  const [rmomsCheckResult, setRmomsCheckResult] = useState<string | null>(null);

  // Confirmation Dialog state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [officerToDelete, setOfficerToDelete] = useState<ParoleOfficer | null>(null);

  useEffect(() => {
    if (initialShowAddPO) {
      setShowAddPO(true);
      setSelectedCategory('all');
    }
  }, [initialShowAddPO]);

  useEffect(() => {
    fetch('/api/parole-officers', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setOfficers(data);
      })
      .catch(console.error);
  }, [token]);

  const handleDeleteOfficer = (officer: ParoleOfficer) => {
    setOfficerToDelete(officer);
    setDeleteConfirmOpen(true);
  };

  const executeDeleteOfficer = async () => {
    if (!officerToDelete) return;
    try {
      const res = await fetch(`/api/parole-officers/${officerToDelete.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setOfficers(officers.filter(o => o.id !== officerToDelete.id));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDeleteConfirmOpen(false);
      setOfficerToDelete(null);
    }
  };

  const handleAddPO = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/parole-officers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name: poName, agency: poAgency, phone: poPhone, district: poDistrict })
      });
      const data = await res.json();
      if (data.success) {
        setOfficers([...officers, data.officer]);
        setShowAddPO(false);
        setPoName('');
        setPoAgency('');
        setPoPhone('');
        setPoDistrict('');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleGetSelfHelp = async () => {
    if (!selfHelpTopic.trim()) return;
    setIsLoadingSelfHelp(true);
    try {
      const content = await geminiService.getSelfHelpMaterial(selfHelpTopic);
      setSelfHelpContent(content || '');
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoadingSelfHelp(false);
    }
  };

  const handleSearchDocket = async () => {
    if (!docketSelectedState) return;
    setIsDocketAiLoading(true);
    try {
      const query = docketInmateId
        ? `${docketCaseQuery} Inmate ID: ${docketInmateId}`
        : docketCaseQuery || 'How to look up criminal court dockets and calendar dates';
      const response = await geminiService.searchCourtDocket(docketSelectedState, query);
      setDocketAiResult(response);
    } catch (error) {
      console.error(error);
    } finally {
      setIsDocketAiLoading(false);
    }
  };

  const handleRunAiSentenceAnalysis = async () => {
    const selectedRule =
      STATUTORY_SENTENCE_MATRIX.find(r => r.id === estOffenseId) || STATUTORY_SENTENCE_MATRIX[0];
    setIsEstAiLoading(true);
    try {
      const prompt = `State: ${estState}. Offense: ${selectedRule.label}. Prior History: ${estPriorHistory}. Program Participation: ${
        estProgramCredit ? 'Yes' : 'No'
      }. Additional context: ${estCustomNotes || 'Standard statutory range inquiry'}`;
      const result = await geminiService.estimateSentence(prompt);
      setEstAiAnalysis(result || '');
    } catch (error) {
      console.error(error);
    } finally {
      setIsEstAiLoading(false);
    }
  };

  // Compute interactive statutory sentence estimate
  const selectedOffense =
    STATUTORY_SENTENCE_MATRIX.find(r => r.id === estOffenseId) || STATUTORY_SENTENCE_MATRIX[0];
  const stateConfig = STATE_MULTIPLIERS[estState] || STATE_MULTIPLIERS.Colorado;
  const priorMultiplier =
    estPriorHistory === 'none' ? 1.0 : estPriorHistory === 'one_prior' ? 1.35 : 1.85;

  const rawMinMonths = Math.round(selectedOffense.baseMinMonths * stateConfig.factor * priorMultiplier);
  const rawMaxMonths = Math.round(selectedOffense.baseMaxMonths * stateConfig.factor * priorMultiplier);
  const creditReductionFactor = estProgramCredit
    ? (100 - selectedOffense.typicalGoodTimeCreditPct) / 100
    : 0.85;
  const projectedActualMonthsMin = Math.max(1, Math.round(rawMinMonths * creditReductionFactor));
  const projectedActualMonthsMax = Math.max(
    projectedActualMonthsMin,
    Math.round(rawMaxMonths * creditReductionFactor)
  );
  const paroleEligibilityMonths = Math.max(
    1,
    Math.round(rawMinMonths * (selectedOffense.paroleEligibilityPct / 100))
  );

  const filteredDockets = STATE_COURT_DOCKETS.filter(
    d =>
      d.state.toLowerCase().includes(docketSearchFilter.toLowerCase()) ||
      d.abbr.toLowerCase().includes(docketSearchFilter.toLowerCase()) ||
      d.courtPortalName.toLowerCase().includes(docketSearchFilter.toLowerCase())
  );

  return (
    <div className="space-y-16">
      <header className="space-y-4">
        <div className="flex flex-wrap items-center gap-2 text-xs font-mono uppercase tracking-widest opacity-60 font-bold">
          <span>Re-Entry Command Hub</span>
          <span>•</span>
          <span>4 Core Resource Pillars</span>
        </div>
        <h2 className="text-6xl font-serif italic tracking-tighter">Resources & Legal Suite</h2>
        <p className="text-xl opacity-60 max-w-3xl">
          Access mental health support organizations & self-help workbooks, 50-state court docket databases, an interactive statutory sentence estimator, and parole guidance including RMOMS urine analysis check-ins.
        </p>
      </header>

      {/* Pillar Navigation Tabs */}
      <div className="flex flex-wrap border-2 border-[#141414] bg-white text-xs font-mono uppercase tracking-widest font-bold">
        {[
          { id: 'all', label: 'All 4 Resource Pillars' },
          { id: 'mental_health', label: '01 Mental Health & Self-Help' },
          { id: 'dockets', label: '02 State Court Dockets' },
          { id: 'estimator', label: '03 Sentence Estimator' },
          { id: 'parole', label: '04 Parole & RMOMS UA' },
          { id: 'map', label: 'Service Map' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setSelectedCategory(tab.id as any)}
            className={`px-5 py-4 border-r border-b lg:border-b-0 border-[#141414] transition-colors cursor-pointer ${
              selectedCategory === tab.id
                ? 'bg-[#141414] text-[#E4E3E0]'
                : 'hover:bg-neutral-100 text-[#141414]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="space-y-20">
        {/* =====================================================================
            PILLAR 1: MENTAL HEALTH SUPPORT ORGANIZATIONS & SELF-HELP MATERIALS
           ===================================================================== */}
        {(selectedCategory === 'all' || selectedCategory === 'mental_health') && (
          <section className="space-y-10" id="resources-pillar-mental-health">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b-2 border-[#141414] pb-4">
              <div className="space-y-1">
                <span className="text-[10px] font-mono uppercase tracking-widest text-rose-700 font-black">
                  Pillar 01 // Mental Well-Being & Re-Entry Coping Strategies
                </span>
                <div className="flex items-center gap-3">
                  <HeartPulse className="text-rose-600" size={30} />
                  <h3 className="text-4xl font-serif italic font-bold">
                    Mental Health Support & Self-Help Materials
                  </h3>
                </div>
              </div>
              <span className="text-xs font-mono uppercase tracking-widest bg-rose-50 border border-rose-300 text-rose-900 px-3 py-1.5 font-bold">
                24/7 Crisis Hotline: Call or Text 988
              </span>
            </div>

            {/* Verified Support Organizations Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {MENTAL_HEALTH_RESOURCES.map(mh => (
                <ResourceCard key={mh.id} item={mh} icon={Activity} type="Support Organization" />
              ))}
            </div>

            {/* Curated Self-Help Materials & Actionable Workbooks */}
            <div className="bg-white border-2 border-[#141414] p-8 space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-[#141414]/15 pb-4">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest opacity-60 font-bold block">
                    Evidence-Based Re-Entry Workbooks
                  </span>
                  <h4 className="text-2xl font-serif italic font-bold flex items-center gap-2">
                    <BookOpen size={22} /> Self-Help Materials & Grounding Guides
                  </h4>
                </div>
                <span className="text-[10px] font-mono uppercase tracking-widest bg-amber-100 border border-amber-300 px-2.5 py-1 font-bold">
                  Click any guide to expand steps
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {SELF_HELP_MATERIALS.map(item => {
                  const isExpanded = expandedWorkbookId === item.id;
                  return (
                    <div
                      key={item.id}
                      className={`border transition-all p-5 flex flex-col justify-between ${
                        isExpanded
                          ? 'border-[#141414] bg-amber-50/40 shadow-md'
                          : 'border-[#141414]/30 bg-white hover:border-[#141414]'
                      }`}
                    >
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-mono uppercase tracking-widest bg-[#141414] text-[#E4E3E0] px-2 py-0.5 font-bold">
                            {item.category}
                          </span>
                          <span className="text-[10px] font-mono opacity-60">{item.readTime}</span>
                        </div>
                        <h5 className="text-lg font-serif italic font-bold text-[#141414]">
                          {item.title}
                        </h5>
                        <p className="text-xs text-neutral-700 leading-relaxed">{item.summary}</p>

                        {isExpanded && (
                          <div className="pt-3 border-t border-[#141414]/15 space-y-2">
                            <span className="text-[10px] font-mono uppercase tracking-widest font-bold text-amber-900 block">
                              Step-by-Step Practice:
                            </span>
                            <ol className="list-decimal pl-5 space-y-1.5 text-xs text-[#141414]">
                              {item.steps.map((step, sIdx) => (
                                <li key={sIdx} className="leading-relaxed">
                                  {step}
                                </li>
                              ))}
                            </ol>
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => setExpandedWorkbookId(isExpanded ? null : item.id)}
                        className="mt-4 pt-3 border-t border-[#141414]/10 text-left text-[10px] font-mono uppercase tracking-widest font-bold hover:underline cursor-pointer"
                      >
                        {isExpanded ? 'Hide Workbook Steps ↑' : 'Open Self-Help Workbook →'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* AI Self-Help Guide Generator */}
            <div className="bg-[#141414] text-[#E4E3E0] p-8 md:p-10 relative overflow-hidden rounded-sm shadow-xl">
              <div className="relative z-10 max-w-4xl space-y-6">
                <div className="flex items-center gap-3">
                  <Sparkles className="text-amber-400" size={28} />
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-amber-300 font-bold block">
                      On-Demand Coping Plan
                    </span>
                    <h4 className="text-3xl font-serif italic">Custom Self-Help Guide Generator</h4>
                  </div>
                </div>
                <p className="text-sm opacity-70 leading-relaxed max-w-2xl">
                  Enter any topic (e.g., "managing sensory overload after release", "explaining a felony gap on a resume", "staying calm before a parole meeting") to generate a personalized workbook.
                </p>

                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    value={selfHelpTopic}
                    onChange={e => setSelfHelpTopic(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleGetSelfHelp()}
                    placeholder="What challenge are you navigating today?"
                    className="flex-1 bg-white/10 border border-white/20 px-4 py-3 text-sm focus:outline-none focus:border-amber-400 placeholder:text-white/40"
                  />
                  <button
                    onClick={handleGetSelfHelp}
                    disabled={isLoadingSelfHelp || !selfHelpTopic.trim()}
                    className="bg-amber-400 text-[#141414] px-6 py-3 uppercase tracking-widest text-xs font-mono font-bold hover:bg-amber-300 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isLoadingSelfHelp ? 'Generating...' : <>Generate Guide <ArrowRight size={15} /></>}
                  </button>
                </div>

                {selfHelpContent && (
                  <div className="prose prose-invert prose-sm max-w-none bg-white/5 border border-white/15 p-6 rounded-sm">
                    <Markdown>{selfHelpContent}</Markdown>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* =====================================================================
            PILLAR 2: STATE COURT DOCKETS & DOC INMATE LOCATOR DATABASE
           ===================================================================== */}
        {(selectedCategory === 'all' || selectedCategory === 'dockets') && (
          <section className="space-y-8" id="resources-pillar-dockets">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b-2 border-[#141414] pb-4">
              <div className="space-y-1">
                <span className="text-[10px] font-mono uppercase tracking-widest text-amber-800 font-black">
                  Pillar 02 // Public Court Records & State Docket Portals
                </span>
                <div className="flex items-center gap-3">
                  <Scale className="text-[#141414]" size={30} />
                  <h3 className="text-4xl font-serif italic font-bold">
                    State Court Dockets & Case Lookup Database
                  </h3>
                </div>
              </div>
              <div className="relative w-full md:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 opacity-40" size={15} />
                <input
                  type="text"
                  value={docketSearchFilter}
                  onChange={e => setDocketSearchFilter(e.target.value)}
                  placeholder="Filter by state (e.g. CA, Texas, NY)..."
                  className="w-full bg-white border border-[#141414] py-2.5 pl-9 pr-4 text-xs focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left 2 Columns: State Court Docket Cards */}
              <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filteredDockets.map(entry => (
                  <div
                    key={entry.abbr}
                    className="bg-white border border-[#141414] p-5 flex flex-col justify-between space-y-4 hover:shadow-md transition-all"
                  >
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="px-2 py-0.5 bg-[#141414] text-[#E4E3E0] font-mono text-[10px] font-bold uppercase tracking-widest">
                          {entry.abbr}
                        </span>
                        <span className="text-[10px] font-mono opacity-60">
                          Parole HQ: {entry.paroleOfficePhone}
                        </span>
                      </div>
                      <h4 className="text-xl font-serif italic font-bold">{entry.state}</h4>
                      <p className="text-xs font-bold text-neutral-800">{entry.courtPortalName}</p>
                      <p className="text-xs text-neutral-600 leading-relaxed">{entry.notes}</p>
                    </div>

                    <div className="pt-3 border-t border-[#141414]/10 flex flex-wrap gap-2">
                      <a
                        href={entry.docketUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 bg-[#141414] text-[#E4E3E0] py-2 px-3 text-[10px] font-mono uppercase tracking-widest font-bold text-center flex items-center justify-center gap-1 hover:opacity-90"
                      >
                        Court Dockets <ExternalLink size={11} />
                      </a>
                      <a
                        href={entry.inmateLocatorUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 border border-[#141414] bg-white text-[#141414] py-2 px-3 text-[10px] font-mono uppercase tracking-widest font-bold text-center flex items-center justify-center gap-1 hover:bg-neutral-100"
                      >
                        DOC Locator <ExternalLink size={11} />
                      </a>
                    </div>
                  </div>
                ))}
              </div>

              {/* Right Column: Live AI Court Docket Assistant */}
              <div className="bg-white border-2 border-[#141414] p-6 space-y-5 h-fit">
                <div className="space-y-1 border-b border-[#141414]/15 pb-3">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-amber-800 font-bold block">
                    Live Search Grounding
                  </span>
                  <h4 className="text-2xl font-serif italic font-bold">Court Docket Lookup Assistant</h4>
                  <p className="text-xs opacity-60">
                    Search state docket procedures, clerk portals, or case lookup instructions by state and case/inmate ID.
                  </p>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-mono uppercase tracking-widest font-bold mb-1">
                      Jurisdiction / State
                    </label>
                    <select
                      value={docketSelectedState}
                      onChange={e => setDocketSelectedState(e.target.value)}
                      className="w-full border border-[#141414] p-2.5 text-xs bg-white focus:outline-none"
                    >
                      {STATE_COURT_DOCKETS.map(s => (
                        <option key={s.abbr} value={s.state}>
                          {s.state} ({s.abbr})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono uppercase tracking-widest font-bold mb-1">
                      Case Number / County / Party Name
                    </label>
                    <input
                      type="text"
                      value={docketCaseQuery}
                      onChange={e => setDocketCaseQuery(e.target.value)}
                      placeholder="e.g. Denver District Court CR-2024..."
                      className="w-full border border-[#141414] p-2.5 text-xs focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono uppercase tracking-widest font-bold mb-1">
                      DOC / Register Number (Optional)
                    </label>
                    <input
                      type="text"
                      value={docketInmateId}
                      onChange={e => setDocketInmateId(e.target.value)}
                      placeholder="e.g. DOC #184920"
                      className="w-full border border-[#141414] p-2.5 text-xs focus:outline-none"
                    />
                  </div>

                  <button
                    onClick={handleSearchDocket}
                    disabled={isDocketAiLoading}
                    className="w-full bg-[#141414] text-[#E4E3E0] py-3 text-xs font-mono uppercase tracking-widest font-bold hover:opacity-90 disabled:opacity-50 cursor-pointer"
                  >
                    {isDocketAiLoading ? 'Searching State Records...' : 'Search Court Dockets'}
                  </button>
                </div>

                {docketAiResult && (
                  <div className="pt-4 border-t border-[#141414]/15 space-y-3 text-xs">
                    <div className="p-3 bg-neutral-50 border border-[#141414]/20 prose prose-sm max-w-none">
                      <Markdown>{docketAiResult.text}</Markdown>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* =====================================================================
            PILLAR 3: SENTENCE ESTIMATOR TOOL (OFFENSE TYPE & STATE LAWS)
           ===================================================================== */}
        {(selectedCategory === 'all' || selectedCategory === 'estimator') && (
          <section className="space-y-8" id="resources-pillar-sentence-estimator">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b-2 border-[#141414] pb-4">
              <div className="space-y-1">
                <span className="text-[10px] font-mono uppercase tracking-widest text-amber-800 font-black">
                  Pillar 03 // Statutory Sentencing & Earned Time Calculator
                </span>
                <div className="flex items-center gap-3">
                  <Calculator className="text-amber-600" size={30} />
                  <h3 className="text-4xl font-serif italic font-bold">
                    Interactive Sentence Estimator Tool
                  </h3>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-amber-50 border border-amber-400 px-3 py-1.5 text-[10px] font-mono uppercase tracking-widest text-amber-950 font-bold">
                <AlertTriangle size={14} className="text-amber-600 shrink-0" />
                Educational Statutory Estimate — Not Formal Legal Counsel
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Left 7 Cols: Statutory Offense & State Parameters */}
              <div className="lg:col-span-7 bg-white border-2 border-[#141414] p-8 space-y-6">
                <h4 className="text-2xl font-serif italic font-bold border-b border-[#141414]/15 pb-3">
                  1. Select State Law & Offense Classification
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-mono uppercase tracking-widest font-bold mb-1.5">
                      State / Sentencing Jurisdiction
                    </label>
                    <select
                      value={estState}
                      onChange={e => setEstState(e.target.value)}
                      className="w-full border border-[#141414] p-3 text-xs font-bold bg-white focus:outline-none"
                    >
                      {Object.keys(STATE_MULTIPLIERS).map(st => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono uppercase tracking-widest font-bold mb-1.5">
                      Prior Felony Record Level
                    </label>
                    <select
                      value={estPriorHistory}
                      onChange={e => setEstPriorHistory(e.target.value as any)}
                      className="w-full border border-[#141414] p-3 text-xs font-bold bg-white focus:outline-none"
                    >
                      <option value="none">First-Time / No Prior Felonies (1.0x)</option>
                      <option value="one_prior">1 Prior Felony Conviction (1.35x Enhancer)</option>
                      <option value="habitual">2+ Prior Felonies / Habitual Tier (1.85x)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-widest font-bold mb-1.5">
                    Offense Type & Statutory Class
                  </label>
                  <select
                    value={estOffenseId}
                    onChange={e => setEstOffenseId(e.target.value)}
                    className="w-full border border-[#141414] p-3 text-xs font-bold bg-white focus:outline-none"
                  >
                    {STATUTORY_SENTENCE_MATRIX.map(rule => (
                      <option key={rule.id} value={rule.id}>
                        [{rule.category}] {rule.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-3 p-3.5 bg-emerald-50 border border-emerald-300">
                  <input
                    id="est-good-time-check"
                    type="checkbox"
                    checked={estProgramCredit}
                    onChange={e => setEstProgramCredit(e.target.checked)}
                    className="w-4 h-4 accent-[#141414]"
                  />
                  <label
                    htmlFor="est-good-time-check"
                    className="text-xs font-mono font-bold text-emerald-950 cursor-pointer"
                  >
                    Apply Good-Time / Earned-Time & Vocational Program Credits (Up to{' '}
                    {selectedOffense.typicalGoodTimeCreditPct}% reduction)
                  </label>
                </div>

                <div className="space-y-2 pt-2 border-t border-[#141414]/15">
                  <label className="block text-[10px] font-mono uppercase tracking-widest font-bold">
                    Optional Case Specifics for Deep Statutory Analysis
                  </label>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      type="text"
                      value={estCustomNotes}
                      onChange={e => setEstCustomNotes(e.target.value)}
                      placeholder="e.g. Plea agreement with restitution, non-violent mitigating factors..."
                      className="flex-1 border border-[#141414] p-3 text-xs focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleRunAiSentenceAnalysis}
                      disabled={isEstAiLoading}
                      className="px-5 py-3 bg-[#141414] text-[#E4E3E0] text-[10px] font-mono uppercase tracking-widest font-bold hover:opacity-90 disabled:opacity-50 shrink-0 cursor-pointer"
                    >
                      {isEstAiLoading ? 'Analyzing...' : 'Run Statutory AI Memo'}
                    </button>
                  </div>
                </div>

                {estAiAnalysis && (
                  <div className="p-5 bg-neutral-50 border border-[#141414] prose prose-sm max-w-none">
                    <Markdown>{estAiAnalysis}</Markdown>
                  </div>
                )}
              </div>

              {/* Right 5 Cols: Live Calculated Sentence Breakdown Card */}
              <div className="lg:col-span-5 bg-[#141414] text-[#E4E3E0] p-8 flex flex-col justify-between space-y-6">
                <div className="space-y-5">
                  <div className="flex justify-between items-center border-b border-white/15 pb-3">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400 font-bold">
                      Calculated Statutory Projection // {estState}
                    </span>
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 bg-white/10">
                      {selectedOffense.probationEligible ? 'Probation Eligible' : 'Mandatory Custody'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/5 border border-white/15 p-4">
                      <span className="text-[10px] font-mono uppercase tracking-widest opacity-60 block">
                        Statutory Guideline Range
                      </span>
                      <p className="text-2xl font-serif italic font-bold text-white mt-1">
                        {rawMinMonths} – {rawMaxMonths} mos
                      </p>
                      <span className="text-[10px] font-mono opacity-50">
                        ({(rawMinMonths / 12).toFixed(1)} to {(rawMaxMonths / 12).toFixed(1)} years)
                      </span>
                    </div>

                    <div className="bg-amber-400/15 border border-amber-400/40 p-4">
                      <span className="text-[10px] font-mono uppercase tracking-widest text-amber-300 font-bold block">
                        Projected Time w/ Credits
                      </span>
                      <p className="text-2xl font-serif italic font-bold text-amber-300 mt-1">
                        {projectedActualMonthsMin} – {projectedActualMonthsMax} mos
                      </p>
                      <span className="text-[10px] font-mono text-amber-200/70">
                        Est. Parolable @ {paroleEligibilityMonths} mos ({selectedOffense.paroleEligibilityPct}%)
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3 text-xs border-t border-white/15 pt-4">
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400 font-bold block">
                        State Sentencing Rule ({estState}):
                      </span>
                      <p className="opacity-80 leading-relaxed mt-0.5">
                        {stateConfig.truthInSentencingNote}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 font-bold block">
                        Offense-Specific Notes:
                      </span>
                      <p className="opacity-80 leading-relaxed mt-0.5">
                        {selectedOffense.statutoryNotes}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/15 text-[11px] opacity-60 font-mono">
                  Note: Actual sentences depend on judicial discretion, plea stipulations, pre-sentence confinement credit, and statutory enhancers.
                </div>
              </div>
            </div>
          </section>
        )}

        {/* =====================================================================
            PILLAR 4: PAROLE GUIDANCE, OFFICER LOOKUP & RMOMS UA CHECK-IN TOOLS
           ===================================================================== */}
        {(selectedCategory === 'all' || selectedCategory === 'parole') && (
          <section className="space-y-12" id="resources-pillar-parole">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b-2 border-[#141414] pb-4">
              <div className="space-y-1">
                <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-800 font-black">
                  Pillar 04 // Supervision Compliance, Officer Directory & RMOMS Urine Analysis
                </span>
                <div className="flex items-center gap-3">
                  <UserCheck className="text-emerald-700" size={30} />
                  <h3 className="text-4xl font-serif italic font-bold">
                    Parole Officer Numbers, RMOMS Check-Ins & Supervision Guide
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setShowAddPO(true)}
                className="px-5 py-3 bg-[#141414] text-[#E4E3E0] text-xs font-mono uppercase tracking-widest font-bold flex items-center gap-2 hover:opacity-90 cursor-pointer"
              >
                <Plus size={15} /> Save My Parole Officer Contact
              </button>
            </div>

            {/* RMOMS Urine Analysis Check-In Procedure & Daily Color Simulator */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-7 bg-white border-2 border-[#141414] p-8 space-y-6">
                <div className="flex items-center justify-between border-b border-[#141414]/15 pb-4">
                  <div className="flex items-center gap-3">
                    <Droplets className="text-blue-600" size={26} />
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-widest text-blue-800 font-bold block">
                        Urine Analysis (UA) Protocol
                      </span>
                      <h4 className="text-2xl font-serif italic font-bold">
                        RMOMS Daily Check-In Procedure Guide
                      </h4>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono uppercase bg-blue-50 border border-blue-300 text-blue-900 px-2.5 py-1 font-bold">
                    Call Window: 5:00 AM – 1:00 PM
                  </span>
                </div>

                <p className="text-xs text-neutral-700 leading-relaxed">
                  <strong>Rocky Mountain Offender Management Systems (RMOMS)</strong> and state UA hotlines assign you a personal 6-digit PIN or Color Group. Missing a random drop counts as a positive/refusal violation—follow this 4-step daily compliance checklist:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 bg-neutral-50 border border-[#141414]/20 space-y-1">
                    <span className="text-[10px] font-mono uppercase font-black text-blue-900">
                      01 // Daily Morning Call-In
                    </span>
                    <p className="text-xs text-neutral-700 leading-relaxed">
                      Call your RMOMS hotline or check the web portal every single morning (including weekends and holidays) after 5:00 AM. Write down your confirmation number.
                    </p>
                  </div>
                  <div className="p-4 bg-neutral-50 border border-[#141414]/20 space-y-1">
                    <span className="text-[10px] font-mono uppercase font-black text-blue-900">
                      02 // Avoid Creatinine Dilution
                    </span>
                    <p className="text-xs text-neutral-700 leading-relaxed">
                      Do not chug excessive water right before testing. A diluted sample (low specific gravity/creatinine) is treated as a technical violation by most parole boards.
                    </p>
                  </div>
                  <div className="p-4 bg-neutral-50 border border-[#141414]/20 space-y-1">
                    <span className="text-[10px] font-mono uppercase font-black text-blue-900">
                      03 // Bring Photo ID & Prescriptions
                    </span>
                    <p className="text-xs text-neutral-700 leading-relaxed">
                      Arrive at the approved collection site before closing with your state ID/DOC card and ensure any prescribed medications are pre-logged with your PO.
                    </p>
                  </div>
                  <div className="p-4 bg-neutral-50 border border-[#141414]/20 space-y-1">
                    <span className="text-[10px] font-mono uppercase font-black text-blue-900">
                      04 // Shy Bladder Protocol
                    </span>
                    <p className="text-xs text-neutral-700 leading-relaxed">
                      Once you check in at the RMOMS desk, you cannot leave the waiting room until a sample is provided. Give yourself at least 90 minutes before the clinic closes.
                    </p>
                  </div>
                </div>

                {/* Interactive RMOMS Color Group Practice Checker */}
                <div className="bg-blue-50/60 border border-blue-300 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono uppercase tracking-widest font-black text-blue-950 block">
                      RMOMS Color Group Readiness Check
                    </span>
                    <p className="text-xs text-blue-900">
                      Select your assigned UA color group to generate a same-day testing checklist:
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <select
                      value={rmomsColor}
                      onChange={e => setRmomsColor(e.target.value)}
                      className="border border-[#141414] bg-white px-3 py-2 text-xs font-mono font-bold"
                    >
                      <option value="Amber">Amber (High Freq)</option>
                      <option value="Blue">Blue (Standard)</option>
                      <option value="Green">Green (Monthly)</option>
                      <option value="Gold">Gold (Phase II)</option>
                    </select>
                    <button
                      type="button"
                      onClick={() =>
                        setRmomsCheckResult(
                          `Group ${rmomsColor}: Verify via official hotline (303-555-0123) before 1:00 PM. Bring photo ID + $10–$15 voucher if not DOC-waived.`
                        )
                      }
                      className="px-4 py-2 bg-[#141414] text-[#E4E3E0] text-[10px] font-mono uppercase tracking-widest font-bold cursor-pointer"
                    >
                      Verify Protocol
                    </button>
                  </div>
                </div>
                {rmomsCheckResult && (
                  <div className="p-3 bg-emerald-50 border border-emerald-400 text-emerald-950 text-xs font-mono flex items-center gap-2">
                    <CheckCircle2 size={15} className="text-emerald-700 shrink-0" />
                    <span>{rmomsCheckResult}</span>
                  </div>
                )}
              </div>

              {/* Right 5 Cols: Official UA Hotlines & How to Find Your Parole Officer Number */}
              <div className="lg:col-span-5 space-y-6">
                <div className="bg-white border border-[#141414] p-6 space-y-4">
                  <div className="flex items-center gap-2 border-b border-[#141414]/15 pb-3">
                    <Building2 size={20} />
                    <h4 className="text-xl font-serif italic font-bold">
                      How to Find Your Parole Officer's Number
                    </h4>
                  </div>
                  <ol className="list-decimal pl-5 space-y-2 text-xs text-neutral-700 leading-relaxed">
                    <li>
                      <strong>Check Your Release Certificate:</strong> Your reporting instructions sheet lists your assigned District Office address and your reporting window (usually within 24 hours of release).
                    </li>
                    <li>
                      <strong>Call the Regional Parole HQ:</strong> Use the State Parole Directory below or call your state DOC central parole desk with your DOC/Inmate number to get your assigned Community Parole Officer's direct cell and desk extension.
                    </li>
                    <li>
                      <strong>Save Your PO Below:</strong> Store your officer's direct phone number and district office in your personal tracker below for one-tap calling.
                    </li>
                  </ol>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {UA_CHECK_INS.map(ua => (
                    <ResourceCard key={ua.id} item={ua} icon={TestTube} type="UA Check-In Hotline" />
                  ))}
                </div>
              </div>
            </div>

            {/* State Parole Division Portals */}
            <div>
              <h4 className="text-2xl font-serif italic font-bold mb-6">
                State Parole Division Directories & Supervision Portals
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {PAROLE_RESOURCES.map(parole => (
                  <ResourceCard key={parole.id} item={parole} icon={Shield} type="State Parole Portal" />
                ))}
              </div>
            </div>

            {/* My Parole Officers Personal Contact Manager */}
            <div className="pt-4">
              <div className="flex items-center justify-between mb-6 border-b border-[#141414]/15 pb-4">
                <div className="flex items-center gap-3">
                  <Badge className="text-[#141414]" size={26} />
                  <h4 className="text-2xl font-serif italic font-bold">My Saved Parole Officers</h4>
                </div>
                <button
                  onClick={() => setShowAddPO(true)}
                  className="flex items-center gap-2 text-xs uppercase tracking-widest font-bold hover:underline cursor-pointer"
                >
                  <Plus size={16} /> Add Officer Contact
                </button>
              </div>

              <AnimatePresence>
                {showAddPO && (
                  <motion.form
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    onSubmit={handleAddPO}
                    className="bg-white border-2 border-[#141414] p-6 mb-8 overflow-hidden"
                  >
                    <div className="flex justify-between items-center mb-6">
                      <h4 className="font-bold uppercase tracking-widest text-xs">
                        Add Parole Officer Contact
                      </h4>
                      <button
                        type="button"
                        onClick={() => setShowAddPO(false)}
                        className="opacity-40 hover:opacity-100 cursor-pointer"
                      >
                        <X size={20} />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      <div>
                        <label className="block text-xs uppercase tracking-widest font-bold mb-1">
                          Officer Name
                        </label>
                        <input
                          required
                          type="text"
                          value={poName}
                          onChange={e => setPoName(e.target.value)}
                          className="w-full border border-[#141414] p-3 focus:outline-none"
                          placeholder="e.g. Officer M. Reynolds"
                        />
                      </div>
                      <div>
                        <label className="block text-xs uppercase tracking-widest font-bold mb-1">
                          Agency / Division
                        </label>
                        <input
                          required
                          type="text"
                          value={poAgency}
                          onChange={e => setPoAgency(e.target.value)}
                          className="w-full border border-[#141414] p-3 focus:outline-none"
                          placeholder="e.g. CDOC Division of Adult Parole"
                        />
                      </div>
                      <div>
                        <label className="block text-xs uppercase tracking-widest font-bold mb-1">
                          Direct Phone Number
                        </label>
                        <input
                          required
                          type="text"
                          value={poPhone}
                          onChange={e => setPoPhone(e.target.value)}
                          className="w-full border border-[#141414] p-3 focus:outline-none"
                          placeholder="(303) 555-0199"
                        />
                      </div>
                      <div>
                        <label className="block text-xs uppercase tracking-widest font-bold mb-1">
                          District / Field Office
                        </label>
                        <input
                          required
                          type="text"
                          value={poDistrict}
                          onChange={e => setPoDistrict(e.target.value)}
                          className="w-full border border-[#141414] p-3 focus:outline-none"
                          placeholder="e.g. Denver District 2 — Lincoln St"
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      className="bg-[#141414] text-[#E4E3E0] px-6 py-3 uppercase tracking-widest text-xs font-bold hover:opacity-90 transition-opacity cursor-pointer"
                    >
                      Save Officer Contact
                    </button>
                  </motion.form>
                )}
              </AnimatePresence>

              {officers.length === 0 && !showAddPO && (
                <div className="p-8 text-center opacity-60 border border-dashed border-[#141414] bg-white">
                  No personal parole officers saved yet. Click "Add Officer Contact" to keep your PO's phone number and district office on hand.
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {officers.map(officer => (
                  <motion.div
                    key={officer.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white border border-[#141414] p-6 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-[#141414] text-[#E4E3E0] rounded-sm">
                          <Badge size={24} />
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleDeleteOfficer(officer)}
                            className="text-red-600 hover:bg-red-50 p-1.5 rounded transition-all cursor-pointer"
                            title="Delete Officer"
                          >
                            <Trash2 size={16} />
                          </button>
                          <span className="text-[10px] font-mono uppercase tracking-widest opacity-40">
                            Assigned PO
                          </span>
                        </div>
                      </div>
                      <h4 className="text-xl font-bold mb-1">{officer.name}</h4>
                      <p className="text-sm font-bold opacity-80 mb-1">{officer.agency}</p>
                      <p className="text-sm opacity-60 mb-6">{officer.district}</p>
                    </div>
                    <a
                      href={`tel:${officer.phone}`}
                      className="inline-flex items-center justify-between w-full pt-4 border-t border-[#141414]/10 font-mono text-sm hover:text-blue-600 transition-colors"
                    >
                      <span>{officer.phone}</span>
                      <PhoneCall size={16} />
                    </a>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Interactive Nearby Services Map */}
        {(selectedCategory === 'all' || selectedCategory === 'map') && (
          <section className="space-y-6">
            <div className="flex items-center gap-3 border-b-2 border-[#141414] pb-4">
              <MapIcon className="text-amber-600" size={28} />
              <h3 className="text-3xl font-serif italic font-bold">Nearby Re-entry Services Map</h3>
            </div>
            <ServiceMap />
          </section>
        )}
      </div>

      <ConfirmationDialog
        isOpen={deleteConfirmOpen}
        title="Delete Parole Officer"
        message={`Are you sure you want to remove ${officerToDelete?.name} from your parole officers contact list?`}
        onConfirm={executeDeleteOfficer}
        onCancel={() => {
          setDeleteConfirmOpen(false);
          setOfficerToDelete(null);
        }}
        confirmText="Remove"
        cancelText="Cancel"
        type="danger"
      />
    </div>
  );
}
