import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, 
  Users, 
  Target, 
  Compass, 
  Sparkles, 
  CheckCircle2, 
  X, 
  ArrowRight, 
  ArrowLeft, 
  Check, 
  Clock, 
  MessageSquare, 
  Video, 
  Phone, 
  Plus, 
  Trash2,
  Award,
  HeartHandshake
} from 'lucide-react';
import { useAuth } from '../AuthContext';
import { MentorshipSurvey } from '../types';

interface MentorshipSurveyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (survey: MentorshipSurvey) => void;
  initialSurvey?: MentorshipSurvey | null;
}

const INTEREST_CATEGORIES = [
  {
    category: 'Trades & Vocational',
    items: [
      'Construction & Carpentry',
      'Automotive & Welding',
      'Commercial Driving (CDL)',
      'Electrical & Plumbing',
      'Culinary Arts & Food Service',
      'HVAC & Facilities Maintenance'
    ]
  },
  {
    category: 'Technology & Business',
    items: [
      'Tech & Coding',
      'Web & Software Development',
      'Small Business & Entrepreneurship',
      'Resume & Interview Prep',
      'Sales & Business Operations',
      'Digital Marketing & Media'
    ]
  },
  {
    category: 'Re-entry Stability',
    items: [
      'Affordable Housing Navigation',
      'Legal & Parole Compliance',
      'Second-Chance Banking & Credit',
      'Driver License Reinstatement',
      'Record Expungement & Pardons',
      'Government Benefits & ID'
    ]
  },
  {
    category: 'Wellness & Community',
    items: [
      'Sobriety & Recovery',
      'Mental Health & Mindfulness',
      'Fitness & Strength Training',
      'Family Reconnection & Parenting',
      'Creative Arts & Music',
      'Civic Outreach & Youth Mentorship'
    ]
  }
];

const LIFE_GOALS = [
  {
    id: 'off_paper',
    title: 'Successfully Terminate Parole / Get "Off Paper"',
    desc: 'Pass all check-ins, satisfy stipulations, and achieve total unconditional freedom.',
    badge: '⚖️ Legal Milestones'
  },
  {
    id: 'stable_housing',
    title: 'Secure Permanent Independent Housing',
    desc: 'Sign a personal lease on an apartment or home without relying on transitional shelters.',
    badge: '🏠 Foundation'
  },
  {
    id: 'career_license',
    title: 'Build Long-Term Career or Obtain Trade License',
    desc: 'Move past entry-level day labor into licensed union trades, software, or skilled careers.',
    badge: '💼 Professional'
  },
  {
    id: 'launch_business',
    title: 'Launch Small Business / Independent LLC',
    desc: 'Build contracting, logistics, culinary, or consulting venture with financial independence.',
    badge: '🚀 Entrepreneurship'
  },
  {
    id: 'education',
    title: 'Complete Higher Education or Vocational Certification',
    desc: 'Earn an Associate/Bachelor degree, CDL-A, AWS welding, or tech certification.',
    badge: '🎓 Education'
  },
  {
    id: 'sobriety_wellness',
    title: 'Maintain Ongoing Sobriety & Emotional Health',
    desc: 'Daily wellness habits, 12-step/SMART recovery engagement, and positive peer support circles.',
    badge: '🛡️ Health'
  },
  {
    id: 'family_reconnection',
    title: 'Rebuild Family Trust & Parental Rights',
    desc: 'Restore relationships with children, partners, and parents with steady consistency.',
    badge: '👨‍👩‍👧 Family'
  },
  {
    id: 'financial_independence',
    title: 'Achieve Financial Independence & 700+ Credit Score',
    desc: 'Build personal savings, open second-chance bank accounts, and establish prime credit.',
    badge: '💰 Wealth'
  },
  {
    id: 'give_back',
    title: 'Uplift Others & Guide Brothers/Sisters Coming Home',
    desc: 'Lend lived wisdom, keep others from returning, and strengthen the re-entry community.',
    badge: '🤝 Service'
  }
];

export default function MentorshipSurveyModal({
  isOpen,
  onClose,
  onSaved,
  initialSurvey
}: MentorshipSurveyModalProps) {
  const { token } = useAuth();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [isSaving, setIsSaving] = useState(false);
  const [customInterest, setCustomInterest] = useState('');
  const [customGoal, setCustomGoal] = useState('');

  // Form states
  const [rolePreference, setRolePreference] = useState<'mentor' | 'mentee' | 'both'>('both');
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [selectedLifeGoals, setSelectedLifeGoals] = useState<string[]>([]);
  const [cadence, setCadence] = useState<'weekly' | 'biweekly' | 'monthly' | 'flexible'>('weekly');
  const [communicationStyle, setCommunicationStyle] = useState<'text_kites' | 'video_calls' | 'voice_calls' | 'all'>('all');
  const [experienceLevel, setExperienceLevel] = useState<'early_reentry' | 'established' | 'veteran_alumni'>('early_reentry');
  const [personalStatement, setPersonalStatement] = useState('');
  const [availabilityStatus, setAvailabilityStatus] = useState<'actively_seeking' | 'open_to_matching' | 'paused'>('actively_seeking');

  useEffect(() => {
    if (initialSurvey) {
      setRolePreference(initialSurvey.role_preference || 'both');
      setSelectedInterests(initialSurvey.interests || []);
      setSelectedLifeGoals(initialSurvey.life_goals || []);
      setCadence(initialSurvey.cadence || 'weekly');
      setCommunicationStyle(initialSurvey.communication_style || 'all');
      setExperienceLevel(initialSurvey.experience_level || 'early_reentry');
      setPersonalStatement(initialSurvey.personal_statement || '');
      setAvailabilityStatus(initialSurvey.availability_status || 'actively_seeking');
    }
  }, [initialSurvey, isOpen]);

  if (!isOpen) return null;

  const toggleInterest = (item: string) => {
    setSelectedInterests(prev => 
      prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]
    );
  };

  const handleAddCustomInterest = (e: React.FormEvent) => {
    e.preventDefault();
    if (customInterest.trim() && !selectedInterests.includes(customInterest.trim())) {
      setSelectedInterests(prev => [...prev, customInterest.trim()]);
      setCustomInterest('');
    }
  };

  const toggleGoal = (goalTitle: string) => {
    setSelectedLifeGoals(prev => 
      prev.includes(goalTitle) ? prev.filter(g => g !== goalTitle) : [...prev, goalTitle]
    );
  };

  const handleAddCustomGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (customGoal.trim() && !selectedLifeGoals.includes(customGoal.trim())) {
      setSelectedLifeGoals(prev => [...prev, customGoal.trim()]);
      setCustomGoal('');
    }
  };

  const handleSubmit = async () => {
    setIsSaving(true);
    try {
      const payload: MentorshipSurvey = {
        role_preference: rolePreference,
        interests: selectedInterests,
        life_goals: selectedLifeGoals,
        cadence,
        communication_style: communicationStyle,
        experience_level: experienceLevel,
        personal_statement: personalStatement,
        availability_status: availabilityStatus
      };

      const res = await fetch('/api/mentorship/survey', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        if (onSaved) {
          onSaved(data.survey || payload);
        }
        onClose();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to save profile survey.');
      }
    } catch (e) {
      console.error(e);
      alert('An unexpected error occurred while saving your survey.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#141414]/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        className="bg-[#E4E3E0] text-[#141414] border-2 border-[#141414] w-full max-w-3xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <div className="bg-[#141414] text-[#E4E3E0] p-5 sm:p-6 flex items-start justify-between border-b border-[#141414] shrink-0">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-mono tracking-widest text-[#E4E3E0]/70 flex items-center gap-1.5 font-bold">
                <Compass size={13} className="text-amber-400" /> The Yard Peer Network
              </span>
              <span className="text-[9px] font-mono bg-amber-400 text-[#141414] px-1.5 py-0.5 font-black uppercase">
                Matchmaking Survey
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-serif italic font-bold">
              Find Your Mentor or Mentee
            </h2>
            <p className="text-xs text-[#E4E3E0]/70 max-w-xl font-light">
              Connect with peers who walk your path. We match you on common interests, shared life milestones, and carceral background.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#E4E3E0]/70 hover:text-white hover:bg-white/10 transition-colors rounded cursor-pointer"
            title="Close Survey"
          >
            <X size={20} />
          </button>
        </div>

        {/* Progress Bar & Steps Tabs */}
        <div className="bg-white border-b border-[#141414]/15 px-6 py-3 shrink-0 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 sm:gap-4 overflow-x-auto text-[11px] font-mono uppercase tracking-wider font-bold">
            <button
              onClick={() => setStep(1)}
              className={`flex items-center gap-1.5 px-2.5 py-1 transition-all ${
                step === 1 ? 'bg-[#141414] text-white' : 'text-gray-500 hover:text-black'
              }`}
            >
              <span>1.</span> Role & Stage
            </button>
            <button
              onClick={() => setStep(2)}
              className={`flex items-center gap-1.5 px-2.5 py-1 transition-all ${
                step === 2 ? 'bg-[#141414] text-white' : 'text-gray-500 hover:text-black'
              }`}
            >
              <span>2.</span> Interests ({selectedInterests.length})
            </button>
            <button
              onClick={() => setStep(3)}
              className={`flex items-center gap-1.5 px-2.5 py-1 transition-all ${
                step === 3 ? 'bg-[#141414] text-white' : 'text-gray-500 hover:text-black'
              }`}
            >
              <span>3.</span> Life Goals ({selectedLifeGoals.length})
            </button>
            <button
              onClick={() => setStep(4)}
              className={`flex items-center gap-1.5 px-2.5 py-1 transition-all ${
                step === 4 ? 'bg-[#141414] text-white' : 'text-gray-500 hover:text-black'
              }`}
            >
              <span>4.</span> Preferences
            </button>
          </div>
          <span className="text-[10px] font-mono text-gray-500 hidden sm:inline">
            Step {step} of 4
          </span>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* STEP 1: ROLE PREFERENCE & JOURNEY STAGE */}
          {step === 1 && (
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <div className="space-y-1">
                <h3 className="text-lg font-serif italic font-bold">What connection are you seeking in The Yard?</h3>
                <p className="text-xs text-neutral-600">
                  Choose your primary intention. You can always change this later as your re-entry evolves.
                </p>
              </div>

              {/* Role Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setRolePreference('mentee')}
                  className={`p-4 border-2 text-left transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                    rolePreference === 'mentee'
                      ? 'border-[#141414] bg-white shadow-md ring-2 ring-[#141414]/10'
                      : 'border-[#141414]/20 bg-white/50 hover:bg-white'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <span className="text-2xl">🌱</span>
                    {rolePreference === 'mentee' && (
                      <CheckCircle2 size={16} className="text-emerald-700" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold text-sm">Find a Mentor</h4>
                    <p className="text-[11px] text-neutral-600 mt-1 leading-snug">
                      I want advice from someone who walked this line and successfully rebuilt their life.
                    </p>
                  </div>
                  <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-amber-800 bg-amber-50 px-2 py-0.5 border border-amber-200 inline-block w-fit">
                    Mentee Candidate
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setRolePreference('mentor')}
                  className={`p-4 border-2 text-left transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                    rolePreference === 'mentor'
                      ? 'border-[#141414] bg-white shadow-md ring-2 ring-[#141414]/10'
                      : 'border-[#141414]/20 bg-white/50 hover:bg-white'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <span className="text-2xl">🛡️</span>
                    {rolePreference === 'mentor' && (
                      <CheckCircle2 size={16} className="text-emerald-700" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold text-sm">Be a Mentor</h4>
                    <p className="text-[11px] text-neutral-600 mt-1 leading-snug">
                      I have grounded time out, professional skills, and want to guide someone newly released.
                    </p>
                  </div>
                  <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2 py-0.5 border border-emerald-200 inline-block w-fit">
                    Active Mentor
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setRolePreference('both')}
                  className={`p-4 border-2 text-left transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                    rolePreference === 'both'
                      ? 'border-[#141414] bg-white shadow-md ring-2 ring-[#141414]/10'
                      : 'border-[#141414]/20 bg-white/50 hover:bg-white'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <span className="text-2xl">🤝</span>
                    {rolePreference === 'both' && (
                      <CheckCircle2 size={16} className="text-emerald-700" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold text-sm">Open to Both</h4>
                    <p className="text-[11px] text-neutral-600 mt-1 leading-snug">
                      Open to learning from veteran alumni while also supporting newly released peers.
                    </p>
                  </div>
                  <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-blue-800 bg-blue-50 px-2 py-0.5 border border-blue-200 inline-block w-fit">
                    Peer Partner
                  </span>
                </button>
              </div>

              {/* Re-entry Experience Level */}
              <div className="space-y-2 pt-2 border-t border-[#141414]/10">
                <label className="text-xs font-bold uppercase font-mono tracking-wider block">
                  Your Re-entry Timeline / Experience Level
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'early_reentry', label: 'Early Re-entry', sub: 'Under 1 year free // Navigating basics' },
                    { id: 'established', label: 'Grounded & Stabilizing', sub: '1–3 years free // Active in career/school' },
                    { id: 'veteran_alumni', label: 'Veteran Alumni', sub: '3+ years out // Off paper or established' },
                  ].map(lvl => (
                    <button
                      key={lvl.id}
                      type="button"
                      onClick={() => setExperienceLevel(lvl.id as any)}
                      className={`p-3 text-left border text-xs transition-all cursor-pointer ${
                        experienceLevel === lvl.id
                          ? 'border-[#141414] bg-white font-bold'
                          : 'border-[#141414]/20 bg-white/40 hover:bg-white'
                      }`}
                    >
                      <div className="font-mono text-xs">{lvl.label}</div>
                      <div className="text-[10px] text-gray-500 font-sans mt-0.5">{lvl.sub}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Availability Status */}
              <div className="space-y-2 pt-2 border-t border-[#141414]/10">
                <label className="text-xs font-bold uppercase font-mono tracking-wider block">
                  Availability On The Yard
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'actively_seeking', label: '🟢 Actively Seeking', sub: 'Ready to connect this week' },
                    { id: 'open_to_matching', label: '🟡 Open to Matching', sub: 'Happy to answer inquiries' },
                    { id: 'paused', label: '⚪ Paused', sub: 'Focused on personal workload' },
                  ].map(av => (
                    <button
                      key={av.id}
                      type="button"
                      onClick={() => setAvailabilityStatus(av.id as any)}
                      className={`p-3 text-left border text-xs transition-all cursor-pointer ${
                        availabilityStatus === av.id
                          ? 'border-[#141414] bg-white font-bold'
                          : 'border-[#141414]/20 bg-white/40 hover:bg-white'
                      }`}
                    >
                      <div className="font-mono text-xs">{av.label}</div>
                      <div className="text-[10px] text-gray-500 font-sans mt-0.5">{av.sub}</div>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 2: COMMON INTERESTS */}
          {step === 2 && (
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-serif italic font-bold">Select Your Core Interests & Trades</h3>
                  <span className="text-[11px] font-mono font-bold bg-white px-2 py-0.5 border border-[#141414]">
                    {selectedInterests.length} Selected
                  </span>
                </div>
                <p className="text-xs text-neutral-600">
                  We look for other brothers and sisters in The Yard who share these passions to make communication natural.
                </p>
              </div>

              {/* Categorized Interest Tags */}
              <div className="space-y-5">
                {INTEREST_CATEGORIES.map(cat => (
                  <div key={cat.category} className="space-y-2">
                    <h4 className="text-[10px] uppercase font-mono tracking-wider font-bold text-gray-600">
                      // {cat.category}
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {cat.items.map(item => {
                        const isSelected = selectedInterests.includes(item);
                        return (
                          <button
                            key={item}
                            type="button"
                            onClick={() => toggleInterest(item)}
                            className={`px-3 py-1.5 text-xs font-mono uppercase tracking-wide border transition-all cursor-pointer flex items-center gap-1.5 rounded-sm ${
                              isSelected
                                ? 'bg-[#141414] text-[#E4E3E0] border-[#141414] font-bold shadow-sm'
                                : 'bg-white text-gray-800 border-[#141414]/20 hover:border-[#141414]'
                            }`}
                          >
                            {isSelected && <Check size={12} className="text-amber-400" />}
                            {item}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Custom Interest Adder */}
              <form onSubmit={handleAddCustomInterest} className="pt-3 border-t border-[#141414]/10 space-y-2">
                <label className="text-[10px] font-mono uppercase tracking-wider font-bold text-gray-600">
                  Add Custom Interest or Specialized Field
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customInterest}
                    onChange={e => setCustomInterest(e.target.value)}
                    placeholder="e.g. Barbering, CDL Dispatch, Graphic Design, Agriculture..."
                    className="flex-1 bg-white border border-[#141414] px-3 py-2 text-xs focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={!customInterest.trim()}
                    className="px-4 py-2 bg-[#141414] text-white text-xs font-mono uppercase tracking-wider font-bold disabled:opacity-40 hover:opacity-90 transition-opacity"
                  >
                    Add Tag
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {/* STEP 3: SHARED LIFE GOALS */}
          {step === 3 && (
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-serif italic font-bold">What Are Your Shared Life Goals?</h3>
                  <span className="text-[11px] font-mono font-bold bg-white px-2 py-0.5 border border-[#141414]">
                    {selectedLifeGoals.length} Selected
                  </span>
                </div>
                <p className="text-xs text-neutral-600">
                  Select the milestones you are striving toward or have successfully overcome. Mentorship thrives on common destination.
                </p>
              </div>

              {/* Life Goal Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {LIFE_GOALS.map(goal => {
                  const isSelected = selectedLifeGoals.includes(goal.title);
                  return (
                    <button
                      key={goal.id}
                      type="button"
                      onClick={() => toggleGoal(goal.title)}
                      className={`p-4 border-2 text-left transition-all cursor-pointer flex flex-col justify-between space-y-2 rounded-sm ${
                        isSelected
                          ? 'border-[#141414] bg-white shadow-sm ring-2 ring-[#141414]/10'
                          : 'border-[#141414]/20 bg-white/60 hover:bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-gray-500 font-bold">
                          {goal.badge}
                        </span>
                        <div className={`w-4 h-4 rounded-sm border flex items-center justify-center shrink-0 ${
                          isSelected ? 'bg-[#141414] border-[#141414] text-white' : 'border-gray-400'
                        }`}>
                          {isSelected && <Check size={12} />}
                        </div>
                      </div>
                      <h4 className="font-bold text-xs text-[#141414] leading-snug">
                        {goal.title}
                      </h4>
                      <p className="text-[11px] text-neutral-600 leading-relaxed font-light">
                        {goal.desc}
                      </p>
                    </button>
                  );
                })}
              </div>

              {/* Custom Goal Adder */}
              <form onSubmit={handleAddCustomGoal} className="pt-3 border-t border-[#141414]/10 space-y-2">
                <label className="text-[10px] font-mono uppercase tracking-wider font-bold text-gray-600">
                  Add Your Own Life Goal / Personal Target
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customGoal}
                    onChange={e => setCustomGoal(e.target.value)}
                    placeholder="e.g. Buying a first work truck, clearing student debt..."
                    className="flex-1 bg-white border border-[#141414] px-3 py-2 text-xs focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={!customGoal.trim()}
                    className="px-4 py-2 bg-[#141414] text-white text-xs font-mono uppercase tracking-wider font-bold disabled:opacity-40 hover:opacity-90 transition-opacity"
                  >
                    Add Goal
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {/* STEP 4: MENTORSHIP DYNAMICS & ASPIRATIONS */}
          {step === 4 && (
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <div className="space-y-1">
                <h3 className="text-lg font-serif italic font-bold">Communication Pace & Guidance Philosophy</h3>
                <p className="text-xs text-neutral-600">
                  Set expectations so connections are comfortable and respectful of each other's parole schedule and work hours.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Cadence */}
                <div className="space-y-2 bg-white p-4 border border-[#141414]/20">
                  <label className="text-[10px] font-mono uppercase tracking-wider font-bold text-gray-600 flex items-center gap-1.5">
                    <Clock size={12} /> Preferred Meeting / Check-in Cadence
                  </label>
                  <div className="space-y-1.5 pt-1">
                    {[
                      { id: 'weekly', label: 'Weekly Check-in', desc: 'Consistent accountability' },
                      { id: 'biweekly', label: 'Every 2 Weeks', desc: 'Balanced & steady rhythm' },
                      { id: 'monthly', label: 'Monthly Milestone', desc: 'High-level roadmap review' },
                      { id: 'flexible', label: 'Flexible as Needed', desc: 'Kite whenever guidance is needed' }
                    ].map(c => (
                      <label
                        key={c.id}
                        className={`flex items-center gap-2 p-2 border text-xs cursor-pointer rounded-sm ${
                          cadence === c.id ? 'border-[#141414] bg-neutral-100 font-bold' : 'border-transparent hover:bg-neutral-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="cadence"
                          checked={cadence === c.id}
                          onChange={() => setCadence(c.id as any)}
                          className="accent-[#141414]"
                        />
                        <div>
                          <span>{c.label}</span>
                          <span className="text-[10px] text-gray-500 block">{c.desc}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Communication Medium */}
                <div className="space-y-2 bg-white p-4 border border-[#141414]/20">
                  <label className="text-[10px] font-mono uppercase tracking-wider font-bold text-gray-600 flex items-center gap-1.5">
                    <MessageSquare size={12} /> Preferred Communication Format
                  </label>
                  <div className="space-y-1.5 pt-1">
                    {[
                      { id: 'all', label: 'All Formats Welcome', desc: 'Secure Kites, Video, & Calls' },
                      { id: 'text_kites', label: 'Encrypted Kites Only', desc: 'Private written text messaging' },
                      { id: 'video_calls', label: '1-on-1 Video Calls', desc: 'Deep-dive face-to-face sessions' },
                      { id: 'voice_calls', label: 'Voice Calls', desc: 'Direct phone / audio check-ins' }
                    ].map(cm => (
                      <label
                        key={cm.id}
                        className={`flex items-center gap-2 p-2 border text-xs cursor-pointer rounded-sm ${
                          communicationStyle === cm.id ? 'border-[#141414] bg-neutral-100 font-bold' : 'border-transparent hover:bg-neutral-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="communicationStyle"
                          checked={communicationStyle === cm.id}
                          onChange={() => setCommunicationStyle(cm.id as any)}
                          className="accent-[#141414]"
                        />
                        <div>
                          <span>{cm.label}</span>
                          <span className="text-[10px] text-gray-500 block">{cm.desc}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Personal Statement / Guidance Aspirations */}
              <div className="space-y-2 pt-2">
                <label className="text-xs font-bold uppercase font-mono tracking-wider block">
                  Personal Note or Guidance Aspirations (Optional)
                </label>
                <textarea
                  rows={3}
                  value={personalStatement}
                  onChange={e => setPersonalStatement(e.target.value)}
                  placeholder="Share a short sentence about what you are hoping to get out of mentorship, or what lived wisdom you are ready to pass on..."
                  className="w-full bg-white border border-[#141414] p-3 text-xs focus:outline-none font-sans"
                />
              </div>

              {/* Summary overview box */}
              <div className="bg-amber-50 border border-amber-300 p-4 rounded-sm text-xs space-y-2">
                <div className="flex items-center gap-1.5 text-amber-900 font-mono font-bold uppercase text-[10px]">
                  <Sparkles size={12} /> Live Matching Readiness
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-neutral-800">
                  <div>
                    <span className="text-[10px] text-gray-500 block font-mono">Role:</span>
                    <strong className="capitalize">{rolePreference}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-500 block font-mono">Interests:</span>
                    <strong>{selectedInterests.length} tagged</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-500 block font-mono">Life Goals:</span>
                    <strong>{selectedLifeGoals.length} selected</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-500 block font-mono">Check-in:</span>
                    <strong className="capitalize">{cadence}</strong>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="bg-white border-t border-[#141414]/15 p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div>
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep((step - 1) as any)}
                className="px-4 py-2 border border-[#141414] text-xs font-mono uppercase tracking-wider font-bold hover:bg-neutral-100 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft size={13} /> Back
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-[#141414]/30 text-xs font-mono uppercase tracking-wider text-gray-600 hover:text-black transition-colors"
              >
                Cancel
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {step < 4 ? (
              <button
                type="button"
                onClick={() => setStep((step + 1) as any)}
                className="px-6 py-2.5 bg-[#141414] text-white text-xs font-mono uppercase tracking-wider font-bold hover:opacity-90 transition-opacity flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                Next Step <ArrowRight size={13} />
              </button>
            ) : (
              <button
                type="button"
                disabled={isSaving}
                onClick={handleSubmit}
                className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-mono uppercase tracking-wider font-bold transition-colors flex items-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
              >
                {isSaving ? (
                  <span>Saving Survey...</span>
                ) : (
                  <>
                    <CheckCircle2 size={14} /> Save Profile & Find Matches
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
