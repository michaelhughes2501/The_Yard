import React, { useState, useEffect } from 'react';
import { 
  HeartPulse, 
  PhoneCall, 
  BookOpen, 
  Compass, 
  ChevronRight, 
  Check, 
  Bell, 
  BellOff, 
  Book, 
  PenTool, 
  Sparkles, 
  Smile, 
  BrainCircuit, 
  Lock, 
  Archive, 
  BarChart2, 
  Activity 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../AuthContext';

interface Article {
  id: string;
  title: string;
  category: 'coping' | 'stress' | 'routine';
  readTime: string;
  summary: string;
  content: string[];
}

const ARTICLES: Article[] = [
  {
    id: 'art-1',
    title: 'Navigating Sensory Overload During Re-entry',
    category: 'coping',
    readTime: '4 min read',
    summary: 'The world outside can feel loud, fast, and overwhelming. Learn practical coping skills to manage sensory baseline shifts.',
    content: [
      'Upon release, returning to busy streets, shopping centers, and heavy traffic can trigger immediate fight-or-flight reactions. Your brain has been accustomed to a highly structured, controlled auditory and rehabilitation environment.',
      'The 5-4-3-2-1 Grounding Technique is your immediate anchor. When you feel a wave of panic or anger surfacing, stop and locate: 5 things you can see, 4 things you can physically feel (the ground under your feet, your shirt), 3 things you can hear, 2 things you can smell, and 1 thing you can taste.',
      'Allow yourself permission to step away. If a conversation or a store feels overwhelming, simply say, "I need some fresh air," and walk outside. Taking five minutes to baseline is an act of strength, not avoidance.'
    ]
  },
  {
    id: 'art-2',
    title: 'De-escalating Internal Stress & Sudden Anger',
    category: 'stress',
    readTime: '5 min read',
    summary: 'System pressure can generate subconscious frustration. Here is how to handle triggers before they compromise your freedom.',
    content: [
      'Anxiety often wears the mask of anger. In high-stakes situations—such as parole meetings, job interviews, or domestic discussions—unexpected hurdles can cause instantaneous rises in heart rate.',
      'Use the "GAP" rule: Go cold, Assess, Proceed. When a trigger occurs, intentionally wait 10 seconds before replying. This delays your emotional amygdala, giving your logical prefrontal cortex time to synchronize.',
      'Remember, you do not have to defend against every comment. Your primary duty is keeping your liberty. Keep your eyes on the long-term goal: permanent freedom, stable housing, and personal peace.'
    ]
  },
  {
    id: 'art-3',
    title: 'Building a Routine of Sustainable Peace',
    category: 'routine',
    readTime: '3 min read',
    summary: 'Replacing rigid schedules with a custom routine that honors your mental health and nurtures stability.',
    content: [
      'Structure is protective, but it must be self-directed to feel human. Create a morning transition ritual that is fully yours—such as making coffee, listening to of quiet music, or stretching for 10 minutes.',
      'Exercise is a powerful somatic stress-reliever. Walking 30 minutes a day actively burns cortisol (the stress hormone) and floods your system with endorphins. Combine this with positive community check-ins here in The Yard.',
      'Acknowledge small wins daily. Simply making your bed, completing a check-in, or finishing a task is proof of your progress. Honor the distance you have covered.'
    ]
  }
];

const CRISIS_HOTLINES = [
  {
    name: '988 Suicide & Crisis Lifeline',
    phone: '988',
    description: 'Free, confidential support available 24/7. Call or text 988.',
    badge: 'Immediate Call/Text'
  },
  {
    name: 'Crisis Text Line',
    phone: '741741',
    description: 'Text HOME to 741741 to connect with a crisis counselor 24/7.',
    badge: 'Text Only'
  },
  {
    name: 'SAMHSA’s National Helpline',
    phone: '1-800-662-4357',
    description: 'Free, confidential treatment referral helpline and information service for mental health and substance abuse.',
    badge: 'Referrals & Support'
  },
  {
    name: 'StrongHearts Native Helpline',
    phone: '1-844-762-8483',
    description: 'Culturally-centered, confidential support for Native Americans.',
    badge: 'Cultural Support'
  }
];

const SUGGESTED_PROMPTS = [
  "My primary strategy for staying calm under heavy pressure is...",
  "What is one sensory trigger I successfully handled without anger today?",
  "Three positive actions I completed today that build toward stable liberty...",
  "What supports, resources, or friends can I contact when feeling overwhelmed?",
  "A promise I am declaring to my future self as an independent, free citizen is..."
];

export default function MentalHealthSupport() {
  const { token } = useAuth();
  
  // Profile & Reminders State
  const [profile, setProfile] = useState<any>(null);
  
  // Articles Modal State
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  
  // Stress Meter Quick Stats
  const [moodRating, setMoodRating] = useState<number | null>(null);
  const [hasCheckedIn, setHasCheckedIn] = useState(false);
  
  // Journal Form & Array State
  const [journals, setJournals] = useState<any[]>([]);
  const [journalTitle, setJournalTitle] = useState('');
  const [journalContent, setJournalContent] = useState('');
  const [journalPrompt, setJournalPrompt] = useState(SUGGESTED_PROMPTS[0]);
  const [journalStress, setJournalStress] = useState(3);
  const [isSubmittingJournal, setIsSubmittingJournal] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Breathing Coach Pacer States
  const [isBreathing, setIsBreathing] = useState(false);
  const [breathingPace, setBreathingPace] = useState<'box' | 'calming'>('box');
  const [breathPhase, setBreathPhase] = useState<'in' | 'hold' | 'out' | 'hold_empty'>('in');
  const [timerCount, setTimerCount] = useState(4);
  const [breathingSessionCount, setBreathingSessionCount] = useState(0);

  // Load profile, database journals and local completed breathing counters
  useEffect(() => {
    fetchProfile();
    fetchJournals();

    const savedBreaths = localStorage.getItem('breath_session_count');
    if (savedBreaths) {
      setBreathingSessionCount(parseInt(savedBreaths, 10));
    }
  }, [token]);

  const fetchProfile = () => {
    if (!token) return;
    fetch('/api/users/profile', {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
      setProfile(data);
    })
    .catch(console.error);
  };

  const fetchJournals = () => {
    if (!token) return;
    fetch('/api/wellness/journals', {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
      if (Array.isArray(data)) {
        setJournals(data);
      }
    })
    .catch(console.error);
  };

  const handleToggleReminders = async (checked: boolean) => {
    if (!profile || !token) return;
    try {
      const updated = { ...profile, wellness_reminders: checked };
      const res = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(updated)
      });
      if (res.ok) {
        setProfile(updated);
      }
    } catch (err) {
      console.error('Error toggling wellness reminders:', err);
    }
  };

  const handleSaveJournal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!journalContent.trim() || !token) return;
    setIsSubmittingJournal(true);
    try {
      const res = await fetch('/api/wellness/journals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title: journalTitle.trim() || 'Daily Reflection Log',
          content: journalContent.trim(),
          prompt: journalPrompt,
          stress_level: journalStress
        })
      });
      if (res.ok) {
        setJournalTitle('');
        setJournalContent('');
        setJournalStress(3);
        fetchJournals();
        alert('Reflection logged privately in your Secure Wellness Vault!');
      } else {
        alert('Could not save your reflection log. Please try again.');
      }
    } catch (error) {
      console.error(error);
      alert('Error updating journal.');
    } finally {
      setIsSubmittingJournal(false);
    }
  };

  // Pacer Breathing somatic interval effect
  useEffect(() => {
    if (!isBreathing) return;

    const interval = setInterval(() => {
      setTimerCount((prev) => {
        if (prev <= 1) {
          // transition to next kinetic stage
          if (breathingPace === 'box') {
            // Box Breathing: In (4s) -> Hold (4s) -> Out (4s) -> Hold (4s)
            switch (breathPhase) {
              case 'in':
                setBreathPhase('hold');
                return 4;
              case 'hold':
                setBreathPhase('out');
                return 4;
              case 'out':
                setBreathPhase('hold_empty');
                return 4;
              case 'hold_empty':
                setBreathPhase('in');
                return 4;
            }
          } else {
            // Calming 4-2-6-0: In (4s) -> Hold (2s) -> Out (6s)
            switch (breathPhase) {
              case 'in':
                setBreathPhase('hold');
                return 2;
              case 'hold':
                setBreathPhase('out');
                return 6;
              case 'out':
              case 'hold_empty':
                setBreathPhase('in');
                return 4;
            }
          }
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isBreathing, breathPhase, breathingPace]);

  const handleStartBreathing = (pace: 'box' | 'calming') => {
    setBreathingPace(pace);
    setBreathPhase('in');
    setTimerCount(4);
    setIsBreathing(true);
  };

  const handleStopBreathing = () => {
    setIsBreathing(false);
  };

  const handleCompletePractice = () => {
    const nextCount = breathingSessionCount + 1;
    setBreathingSessionCount(nextCount);
    localStorage.setItem('breath_session_count', nextCount.toString());
    alert('Practice recorded! Storing this mindfulness session in your baseline log.');
  };

  const getBreathStageMessage = () => {
    switch (breathPhase) {
      case 'in': return 'Inhale Slowly';
      case 'hold': return 'Hold Breath';
      case 'out': return 'Exhale Smoothly';
      case 'hold_empty': return 'Rest and Pause';
    }
  };

  const submitMoodCheckIn = () => {
    if (moodRating === null) return;
    setHasCheckedIn(true);
    // Submit stress log as short temporary check-in or simple journal page stub
    fetch('/api/wellness/journals', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        title: 'Quick Stress Check-in',
        content: `Quick physical pulse check. Logged stress score of ${moodRating}/5.`,
        prompt: 'Stress Pulse Meter Indicator',
        stress_level: moodRating
      })
    })
    .then(res => {
      if (res.ok) {
        fetchJournals();
      }
    })
    .catch(console.error);

    setTimeout(() => {
      setHasCheckedIn(false);
      setMoodRating(null);
    }, 4500);
  };

  return (
    <div className="space-y-12">
      
      {/* Editorial Header */}
      <header className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="h-0.5 w-12 bg-[#141414]"></span>
          <span className="text-xs uppercase font-mono tracking-widest text-gray-500 font-bold">Confidential Space</span>
        </div>
        <h2 className="text-6xl font-serif italic tracking-tighter">Wellness Room</h2>
        <p className="text-xl opacity-60 max-w-3xl leading-relaxed text-left">
          Your mind, your space, your stability. Set simple reminders, write private self-reflection journals, and practice calming somatic breathing pacers to handle sensory re-entry stress.
        </p>
      </header>

      {/* Swiss Modern Dashboard & Reminders Toggler */}
      <div className="bg-[#141414] text-[#E4E3E0] border-2 border-[#141414] p-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-[#E4E3E0]/15 pb-6">
          <div className="space-y-1 text-left">
            <span className="text-[10px] text-yellow-400 font-mono uppercase tracking-widest font-black flex items-center gap-1">
              <BrainCircuit size={12} className="animate-pulse text-yellow-300" /> SELF-CARE BASELINE & REMINDERS
            </span>
            <h3 className="text-3xl font-serif italic font-bold">Wellness Dashboard</h3>
          </div>
          
          {/* Gentle Daily Reminder Toggle */}
          <div className="bg-white/5 border border-white/10 p-5 space-y-3 max-w-sm rounded text-left">
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs font-mono uppercase tracking-widest font-black flex items-center gap-2">
                {profile?.wellness_reminders ? (
                  <>
                    <Bell size={14} className="text-yellow-400 animate-bounce" />
                    Reminders Active
                  </>
                ) : (
                  <>
                    <BellOff size={14} className="text-gray-400" />
                    Reminders Disabled
                  </>
                )}
              </span>
              
              {/* Premium Slide Toggler */}
              <button
                onClick={() => handleToggleReminders(!profile?.wellness_reminders)}
                className={`w-12 h-6 rounded-full p-0.5 transition-colors cursor-pointer relative ${
                  profile?.wellness_reminders ? 'bg-yellow-400' : 'bg-gray-700'
                }`}
                id="reminder-toggle-button"
                aria-label="Toggle Wellness Reminders"
              >
                <div
                  className={`w-5 h-5 bg-[#141414] rounded-full transition-transform transform ${
                    profile?.wellness_reminders ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
            
            <p className="text-[11px] leading-relaxed text-gray-400">
              When enabled, a gentle reminder will automatically populate in your in-app notifications if you haven't logged a response in the last 24 hours.
            </p>
          </div>
        </div>

        {/* Bento stats list */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-2">
          <div className="bg-white/5 border border-[#E4E3E0]/10 p-6 flex flex-col justify-between text-left space-y-2">
            <span className="text-[10px] text-gray-400 font-mono tracking-widest uppercase">My Reflections</span>
            <div>
              <span className="text-4xl font-serif italic text-white font-bold">{journals.length}</span>
              <span className="text-xs text-gray-400 block mt-1">Logs in Vault</span>
            </div>
          </div>

          <div className="bg-white/5 border border-[#E4E3E0]/10 p-6 flex flex-col justify-between text-left space-y-2">
            <span className="text-[10px] text-gray-400 font-mono tracking-widest uppercase">Mindful Breathing</span>
            <div>
              <span className="text-4xl font-serif italic text-white font-bold">{breathingSessionCount}</span>
              <span className="text-xs text-gray-400 block mt-1">Somatic rounds recorded</span>
            </div>
          </div>

          <div className="bg-white/5 border border-[#E4E3E0]/10 p-6 flex flex-col justify-between text-left space-y-2">
            <span className="text-[10px] text-gray-400 font-mono tracking-widest uppercase">System Stress Check</span>
            <div>
              {journals.length > 0 ? (
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-serif italic text-white font-bold">
                    {(journals.reduce((acc, curr) => acc + (curr.stress_level || 3), 0) / journals.length).toFixed(1)}
                  </span>
                  <span className="text-sm opacity-60">/ 5</span>
                </div>
              ) : (
                <span className="text-lg font-serif italic text-gray-400 block">No ratings yet</span>
              )}
              <span className="text-xs text-gray-400 block mt-1">Average tension score</span>
            </div>
          </div>

          <div className="bg-white/5 border border-[#E4E3E0]/10 p-6 flex flex-col justify-between text-left space-y-2">
            <span className="text-[10px] text-gray-400 font-mono tracking-widest uppercase">Routine Progress</span>
            <div>
              <span className="text-4xl font-serif italic text-emerald-400 font-bold">
                {journals.length > 0 ? 'Consistent' : 'Pending Check-in'}
              </span>
              <span className="text-xs text-gray-400 block mt-1">Active transition habit</span>
            </div>
          </div>
        </div>
      </div>

      {/* Core split layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Columns (lg:col-span-2) -> Breathing Coach and Reflections journal */}
        <div className="lg:col-span-2 space-y-10">
          
          {/* Somatic Breathing Coach with Practice Count integrations */}
          <section className="bg-white border-2 border-[#141414] p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-[#141414]/10 pb-4">
              <div className="flex items-center gap-3">
                <Compass size={28} className="text-[#141414]" />
                <div className="text-left">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-gray-500 font-bold block">Somatic Grounding Pacer</span>
                  <h3 className="text-3xl font-serif italic font-bold">Tranquil Breathing Coach</h3>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs font-mono font-bold bg-gray-100 py-1.5 px-3 rounded">
                  Completed Sessions: <span className="font-black text-[#141414] underline">{breathingSessionCount}</span>
                </span>
              </div>
            </div>

            {!isBreathing ? (
              <div className="space-y-4 text-left">
                <p className="text-sm text-gray-700 leading-relaxed">
                  When sensory environments generate unexpected chest tightening or sudden re-entry pressure, calming breathing pacers immediately signal safety to your core nervous system. Give yourself 2 minutes to restore clarity.
                </p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="border border-[#141414] p-5 flex flex-col justify-between space-y-4">
                    <div className="space-y-1">
                      <span className="text-[10px] font-mono bg-[#141414] text-[#E4E3E0] px-2 py-0.5 uppercase font-bold tracking-wider">Tactical Focus</span>
                      <h4 className="text-lg font-serif italic font-bold">Box Breathing (4-4-4-4)</h4>
                      <p className="text-xs opacity-60 leading-relaxed">The classical stress pacer: Inhale, hold, exhale, hold. Grounding and balancing.</p>
                    </div>
                    <button
                      onClick={() => handleStartBreathing('box')}
                      className="w-full bg-[#141414] text-[#E4E3E0] py-2.5 text-xs font-mono uppercase tracking-widest font-black transition-opacity hover:opacity-90 cursor-pointer"
                    >
                      Begin Box Pacer
                    </button>
                  </div>

                  <div className="border border-[#141414] p-5 flex flex-col justify-between space-y-4">
                    <div className="space-y-1">
                      <span className="text-[10px] font-mono bg-indigo-50 text-indigo-700 px-2 py-0.5 uppercase font-bold tracking-wider border border-indigo-200">Adrenaline cooling</span>
                      <h4 className="text-lg font-serif italic font-bold">Calming Rest (4-2-6-0)</h4>
                      <p className="text-xs opacity-60 leading-relaxed">Short inhale, brief quiet pause, and an extended sigh. Intentionally cools heart rates.</p>
                    </div>
                    <button
                      onClick={() => handleStartBreathing('calming')}
                      className="w-full bg-[#141414] text-[#E4E3E0] py-2.5 text-xs font-mono uppercase tracking-widest font-black transition-opacity hover:opacity-90 cursor-pointer"
                    >
                      Begin Calming Pacer
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-[#141414]/5 border border-[#141414]/10 p-8 flex flex-col items-center justify-center space-y-8 text-center relative overflow-hidden">
                <div className="absolute top-4 left-4">
                  <span className="text-[10px] font-mono uppercase text-gray-400 font-bold">
                    ACTIVE: {breathingPace === 'box' ? 'Box Breathing' : 'Calming Rest'}
                  </span>
                </div>

                {/* Kinetic Breathing Circle Pacer */}
                <div className="relative w-48 h-48 flex items-center justify-center">
                  <motion.div
                    animate={{
                      scale: breathPhase === 'in' ? [1, 1.45] : breathPhase === 'out' ? [1.45, 1] : breathPhase === 'hold' ? 1.45 : 1
                    }}
                    transition={{
                      duration: breathingPace === 'box' ? 4 : (breathPhase === 'in' ? 4 : breathPhase === 'hold' ? 2 : 6),
                      ease: "easeInOut"
                    }}
                    className={`absolute inset-0 rounded-full border-2 border-dashed ${
                      breathPhase === 'in' ? 'border-emerald-500 bg-emerald-500/5' :
                      breathPhase === 'out' ? 'border-indigo-500 bg-indigo-500/5' : 'border-amber-500 bg-amber-500/5'
                    }`}
                  />
                  
                  <div className="absolute text-center space-y-1 z-10">
                    <div className="text-3xl font-serif italic font-bold text-gray-900">
                      {timerCount}s
                    </div>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-[#141414] opacity-50 font-bold block">
                      {getBreathStageMessage()}
                    </span>
                  </div>
                </div>

                <div className="w-full max-w-sm space-y-4">
                  <div className="flex justify-between text-xs font-mono text-gray-500 font-bold uppercase border-b border-gray-200 pb-2">
                    <span className={breathPhase === 'in' ? 'text-emerald-600 font-black underline' : ''}>1. Inhale</span>
                    <span className={breathPhase === 'hold' ? 'text-amber-600 font-black underline' : ''}>2. Hold</span>
                    <span className={breathPhase === 'out' ? 'text-indigo-600 font-black underline' : ''}>3. Exhale</span>
                    {breathingPace === 'box' && (
                      <span className={breathPhase === 'hold_empty' ? 'text-yellow-600 font-black underline' : ''}>4. Hold</span>
                    )}
                  </div>
                  
                  <div className="flex gap-3">
                    <button
                      onClick={handleCompletePractice}
                      className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white transition-colors text-xs font-mono uppercase tracking-widest font-bold"
                    >
                      Record Somatic Session
                    </button>
                    <button
                      onClick={handleStopBreathing}
                      className="flex-1 py-2.5 border border-[#141414] hover:bg-red-50 hover:text-red-700 hover:border-red-500 transition-colors text-xs font-mono uppercase tracking-widest font-bold"
                    >
                      Stop Pacer
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Secure Reflection Journal & Past Pages Vault */}
          <section className="bg-white border-2 border-[#141414] p-8 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#141414]/10 pb-4">
              <div className="flex items-center gap-3 text-left">
                <PenTool size={26} className="text-[#141414]" />
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-gray-500 font-bold block">Secure Guarded Storage</span>
                  <h3 className="text-3xl font-serif italic font-bold">Self-Reflection Vault</h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowHistory(!showHistory)}
                className="px-4 py-2 border border-[#141414] hover:bg-gray-100 text-xs font-mono uppercase tracking-widest font-bold flex items-center gap-2 transition-all cursor-pointer"
              >
                <Archive size={14} />
                {showHistory ? 'New Entry Grid' : `View Past Log (${journals.length})`}
              </button>
            </div>

            {showHistory ? (
              /* Reflection Pages Vault History */
              <div className="space-y-6 text-left">
                <div className="bg-sky-50 border border-sky-300 p-4 rounded text-sky-950 flex items-start gap-3">
                  <Lock size={18} className="shrink-0 mt-0.5 text-sky-700" />
                  <p className="text-xs leading-relaxed">
                    Privacy is complete. These entries are tied exclusively to your account, written for your own historical awareness and peace of mind during re-entry.
                  </p>
                </div>

                {journals.length === 0 ? (
                  <div className="py-12 text-center opacity-60 border border-dashed border-[#141414] bg-gray-50 font-serif italic">
                    Your reflection log is empty. Save your first entry to see historical logs.
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                    {journals.map((j) => (
                      <div key={j.id} className="border border-gray-300 p-5 bg-white space-y-3 relative group hover:border-[#141414] transition-colors text-left">
                        <div className="flex justify-between items-start border-b border-gray-100 pb-2">
                          <div className="space-y-1">
                            <h4 className="text-lg font-serif italic font-bold">{j.title}</h4>
                            <span className="text-[9px] font-mono bg-gray-100 px-2 py-0.5 font-bold uppercase block text-gray-500">
                              Prompt: {j.prompt || 'Self Guided'}
                            </span>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-[10px] font-mono text-gray-400 block">
                              {new Date(j.created_at).toLocaleDateString()}
                            </span>
                            <span className="text-[10px] font-mono uppercase text-indigo-700 font-bold block mt-1">
                              Stress Rating: {j.stress_level || 3}/5
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap font-sans bg-gray-50/50 p-3 italic">
                          "{j.content}"
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* Insert New Reflection Log */
              <form onSubmit={handleSaveJournal} className="space-y-4 text-left">
                <div className="bg-gray-50 p-4 border border-[#141414]/10 space-y-3">
                  <label className="text-[10px] font-mono uppercase tracking-wider font-bold block text-gray-500">
                    1. Choose an Inspiring Reflection Prompt
                  </label>
                  <select
                    value={journalPrompt}
                    onChange={(e) => setJournalPrompt(e.target.value)}
                    className="w-full bg-white border border-[#141414] p-2.5 text-xs font-mono text-gray-800 focus:ring-1 focus:ring-[#141414]"
                  >
                    {SUGGESTED_PROMPTS.map((p, idx) => (
                      <option key={idx} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label htmlFor="journal-title" className="text-[10px] font-mono uppercase tracking-wider font-bold block">
                    2. Short Header/Title (Optional)
                  </label>
                  <input
                    id="journal-title"
                    type="text"
                    value={journalTitle}
                    onChange={(e) => setJournalTitle(e.target.value)}
                    placeholder="e.g. Saturday afternoon baseline, or My vision for the week"
                    className="w-full bg-white border border-[#141414] p-3 text-sm focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="journal-text" className="text-[10px] font-mono uppercase tracking-wider font-bold block">
                    3. Your Thoughts and Response
                  </label>
                  <textarea
                    id="journal-text"
                    required
                    rows={6}
                    value={journalContent}
                    onChange={(e) => setJournalContent(e.target.value)}
                    placeholder="Type your reflection here. Be honest and write purely for yourself. Take all the space you need..."
                    className="w-full bg-white border border-[#141414] p-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#141414] font-serif leading-relaxed"
                  />
                </div>

                {/* Stress rating slider and submit */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gray-50 p-4 border border-gray-200">
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono uppercase tracking-wider font-bold block text-gray-500">
                      Stress Level During Log:
                    </span>
                    <div className="flex items-center gap-4">
                      <input
                        type="range"
                        min="1"
                        max="5"
                        step="1"
                        value={journalStress}
                        onChange={(e) => setJournalStress(parseInt(e.target.value, 10))}
                        className="accent-[#141414] w-36"
                      />
                      <span className="text-xs font-sans font-black bg-[#141414] text-white px-2 py-1 select-none">
                        {journalStress === 1 && '1/5 - Very Peaceful'}
                        {journalStress === 2 && '2/5 - Calm'}
                        {journalStress === 3 && '3/5 - Moderate Tension'}
                        {journalStress === 4 && '4/5 - Highly Stressed'}
                        {journalStress === 5 && '5/5 - Extreme Overload'}
                      </span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingJournal}
                    className="w-full sm:w-auto px-8 py-3.5 bg-[#141414] text-[#E4E3E0] disabled:opacity-50 text-xs font-mono uppercase tracking-widest font-black hover:opacity-90 transition-opacity"
                  >
                    {isSubmittingJournal ? 'Saving Reflection...' : 'Store private log'}
                  </button>
                </div>
              </form>
            )}
          </section>

          {/* Curated coping guides list */}
          <section className="space-y-6">
            <div className="flex items-center gap-3 border-b border-[#141414]/10 pb-4 text-left">
              <BookOpen size={28} className="text-[#141414]" />
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-gray-500 font-bold block">Curated Knowledge</span>
                <h3 className="text-3xl font-serif italic font-bold">Coping & Routine Guides</h3>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {ARTICLES.map(art => (
                <div
                  key={art.id}
                  onClick={() => setSelectedArticle(art)}
                  className="bg-white border border-[#141414] p-6 hover:translate-y-[-2px] transition-all cursor-pointer flex flex-col justify-between text-left group"
                >
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-mono font-bold bg-gray-100 text-gray-600 px-2 py-0.5 uppercase">
                        {art.category}
                      </span>
                      <span className="text-[9px] font-mono text-gray-400">{art.readTime}</span>
                    </div>
                    <h4 className="font-serif italic font-bold text-lg group-hover:underline">{art.title}</h4>
                    <p className="text-xs text-gray-600 leading-relaxed">{art.summary}</p>
                  </div>
                  <div className="flex items-center gap-1.5 pt-4 text-[10px] font-mono uppercase tracking-widest font-black text-gray-400 group-hover:text-[#141414] transition-colors mt-4 border-t border-gray-100">
                    Read Article <ChevronRight size={12} />
                  </div>
                </div>
              ))}
            </div>
          </section>

        </div>

        {/* Right Column (lg:col-span-1) -> Daily Stress meter quick checked, Lifelines */}
        <div className="lg:col-span-1 space-y-8">
          
          {/* Stress level pulse meter */}
          <section className="bg-white border-2 border-[#141414] p-6 space-y-4 text-left">
            <h4 className="text-[10px] font-mono uppercase tracking-widest text-gray-400 font-bold">Daily Pulse Check</h4>
            <h3 className="text-xl font-serif italic text-gray-900 font-bold">How is your stress pressure?</h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              Recording your stress baseline regularly keeps you in complete command of your physical re-entry timeline.
            </p>

            {hasCheckedIn ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-emerald-50 border border-emerald-300 p-4 text-emerald-800 space-y-2 rounded text-center"
              >
                <div className="flex justify-center"><Check size={28} className="text-emerald-600" /></div>
                <h5 className="font-serif italic font-bold">Pulse Logged</h5>
                <p className="text-[11px] font-sans opacity-95">
                  Great job tuning in. Your reflection lists have updated! Remember to take 2 minutes for breathing.
                </p>
              </motion.div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between bg-gray-50 p-2 border border-gray-200">
                  {[1, 2, 3, 4, 5].map((num) => {
                    let btnColor = 'hover:bg-gray-200 text-gray-800';
                    if (moodRating === num) {
                      btnColor = 'bg-[#141414] text-white';
                    }
                    return (
                      <button
                        key={num}
                        onClick={() => setMoodRating(num)}
                        className={`w-10 h-10 border border-gray-300 font-mono font-bold transition-all flex items-center justify-center rounded-sm ${btnColor}`}
                      >
                        {num}
                      </button>
                    );
                  })}
                </div>
                <div className="flex justify-between text-[9px] font-mono text-gray-400 uppercase font-bold px-1">
                  <span>1 - High Calm</span>
                  <span>5 - High Panic</span>
                </div>

                <button
                  onClick={submitMoodCheckIn}
                  disabled={moodRating === null}
                  className="w-full py-2.5 bg-[#141414] text-[#E4E3E0] disabled:opacity-40 text-xs font-mono uppercase tracking-widest font-black transition-opacity hover:opacity-90"
                >
                  Log Daily Pulse
                </button>
              </div>
            )}
          </section>

          {/* Hotline resources and direct phone connection links */}
          <section className="bg-red-50 text-red-950 border-2 border-red-950 p-6 space-y-6 text-left relative">
            <div className="space-y-2">
              <span className="text-[10px] bg-red-950 text-red-100 border border-[#141414]/15 px-2 py-0.5 rounded font-mono uppercase font-black tracking-widest inline-block">
                Immediate Action
              </span>
              <h3 className="text-2xl font-serif italic text-red-950 font-bold flex items-center gap-2">
                <HeartPulse size={24} className="animate-pulse text-red-600" /> Support Hotlines
              </h3>
              <p className="text-xs leading-relaxed opacity-90 text-red-900 border-b border-red-950/10 pb-4">
                Professional support lines are safe, fully confidential, and accessible 24/7/365 to handle anything you are dealing with.
              </p>
            </div>

            <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1">
              {CRISIS_HOTLINES.map((hot, idx) => (
                <div key={idx} className="space-y-1 bg-white/60 p-4 border border-red-950/20">
                  <div className="flex justify-between items-baseline gap-2">
                    <h4 className="font-serif italic font-bold text-sm text-red-950">{hot.name}</h4>
                    <span className="text-[8px] font-mono uppercase font-black tracking-widest text-[#141414] opacity-50 shrink-0">
                      {hot.badge}
                    </span>
                  </div>
                  <p className="text-[11px] leading-relaxed opacity-80 text-red-900 mb-2">{hot.description}</p>
                  <a
                    href={`tel:${hot.phone}`}
                    className="inline-flex items-center gap-2 text-xs font-mono uppercase font-black text-red-950 hover:underline pt-1 border-t border-red-950/10 w-full justify-between"
                  >
                    <span>CALL: {hot.phone}</span>
                    <PhoneCall size={12} />
                  </a>
                </div>
              ))}
            </div>
          </section>

        </div>
      </div>

      {/* Rehabilitation Programs and Self-Help Library */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 border-t border-[#141414]/10 pt-12">
        {/* Rehabilitation Programs */}
        <section className="bg-white border-2 border-[#141414] p-8 space-y-6 flex flex-col text-left">
          <div className="flex items-center gap-3 border-b border-[#141414]/10 pb-4">
            <BookOpen size={28} className="text-[#141414]" />
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-gray-500 font-bold block">Local & National</span>
              <h3 className="text-3xl font-serif italic font-bold">Rehabilitation Programs</h3>
            </div>
          </div>
          <p className="text-sm opacity-80 leading-relaxed">
            Connecting with structured rehabilitation programs provides community support, accountability, and essential tools for long-term recovery and reintegration.
          </p>
          <div className="space-y-4 overflow-y-auto max-h-80 pr-2">
            <div className="border border-[#141414]/20 p-4 space-y-2">
              <h4 className="font-bold text-base">Alcoholics Anonymous (AA) / Narcotics Anonymous (NA)</h4>
              <p className="text-xs opacity-70">Peer-led support groups focused on maintaining sobriety through a 12-step program and shared experiences.</p>
              <a href="https://www.aa.org/" target="_blank" rel="noopener noreferrer" className="text-[10px] font-mono uppercase tracking-widest underline text-blue-600 block mt-2">Find a Meeting</a>
            </div>
            <div className="border border-[#141414]/20 p-4 space-y-2">
              <h4 className="font-bold text-base">SMART Recovery</h4>
              <p className="text-xs opacity-70">Science-based, self-empowering addiction recovery support groups that focus on cognitive behavioral therapy techniques.</p>
              <a href="https://www.smartrecovery.org/" target="_blank" rel="noopener noreferrer" className="text-[10px] font-mono uppercase tracking-widest underline text-blue-600 block mt-2">Explore SMART</a>
            </div>
            <div className="border border-[#141414]/20 p-4 space-y-2">
              <h4 className="font-bold text-base">Volunteers of America (VOA) Re-entry Services</h4>
              <p className="text-xs opacity-70">Provides transitional housing, employment training, and counseling services specifically designed for returning citizens.</p>
              <a href="https://www.voa.org/" target="_blank" rel="noopener noreferrer" className="text-[10px] font-mono uppercase tracking-widest underline text-blue-600 block mt-2">View Services</a>
            </div>
          </div>
        </section>

        {/* Self-Help Library */}
        <section className="bg-[#141414] text-[#E4E3E0] border-2 border-[#141414] p-8 space-y-6 flex flex-col text-left">
          <div className="flex items-center gap-3 border-b border-[#E4E3E0]/15 pb-4">
            <Archive size={28} className="text-[#E4E3E0]" />
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-gray-400 font-bold block">Personal Development</span>
              <h3 className="text-3xl font-serif italic font-bold">Self-Help Library</h3>
            </div>
          </div>
          <p className="text-sm opacity-80 leading-relaxed">
            Curated materials focused on personal growth, financial literacy, anger management, and building a positive post-incarceration life.
          </p>
          <div className="space-y-4 overflow-y-auto max-h-80 pr-2">
            <div className="bg-white/5 border border-white/10 p-4 space-y-2 flex justify-between items-center">
              <div>
                <h4 className="font-bold text-base text-white">Financial Literacy 101</h4>
                <p className="text-xs text-gray-400 mt-1">Understanding credit, budgeting basics, and opening a bank account.</p>
              </div>
              <button className="px-3 py-1.5 bg-white text-[#141414] text-[10px] font-bold uppercase tracking-widest hover:opacity-90">Read</button>
            </div>
            <div className="bg-white/5 border border-white/10 p-4 space-y-2 flex justify-between items-center">
              <div>
                <h4 className="font-bold text-base text-white">Cognitive Behavioral Worksheets</h4>
                <p className="text-xs text-gray-400 mt-1">Downloadable exercises to identify negative thought patterns and reframe them.</p>
              </div>
              <button className="px-3 py-1.5 bg-white text-[#141414] text-[10px] font-bold uppercase tracking-widest hover:opacity-90">Download</button>
            </div>
            <div className="bg-white/5 border border-white/10 p-4 space-y-2 flex justify-between items-center">
              <div>
                <h4 className="font-bold text-base text-white">Building Healthy Relationships</h4>
                <p className="text-xs text-gray-400 mt-1">Navigating family dynamics and setting boundaries upon return.</p>
              </div>
              <button className="px-3 py-1.5 bg-white text-[#141414] text-[10px] font-bold uppercase tracking-widest hover:opacity-90">Read</button>
            </div>
             <div className="bg-white/5 border border-white/10 p-4 space-y-2 flex justify-between items-center">
              <div>
                <h4 className="font-bold text-base text-white">De-escalation Handbook</h4>
                <p className="text-xs text-gray-400 mt-1">Techniques to stay calm and assertive without resorting to violence or aggression.</p>
              </div>
              <button className="px-3 py-1.5 bg-white text-[#141414] text-[10px] font-bold uppercase tracking-widest hover:opacity-90">Read</button>
            </div>
          </div>
        </section>
      </div>

      {/* Coping guides Modal Overlay */}
      <AnimatePresence>
        {selectedArticle && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#E4E3E0] text-[#141414] border-2 border-[#141414] w-full max-w-2xl p-8 relative shadow-2xl"
            >
              <button
                onClick={() => setSelectedArticle(null)}
                className="absolute top-4 right-4 p-2 hover:bg-gray-200 text-[#141414] transition-colors rounded cursor-pointer text-xs font-mono font-bold border border-[#141414]"
              >
                CLOSE
              </button>

              <div className="space-y-3 mb-6 text-left">
                <span className="text-[10px] bg-sky-150 text-sky-950 border border-sky-300 font-mono text-[9px] font-black uppercase tracking-widest px-2 py-0.5 inline-block">
                  {selectedArticle.category} // Guidebook
                </span>
                <h3 className="text-3xl font-serif italic text-[#141414] font-bold">
                  {selectedArticle.title}
                </h3>
                <span className="text-xs opacity-60 font-mono block">Estimated time: {selectedArticle.readTime}</span>
              </div>

              <div className="space-y-4 max-h-96 overflow-y-auto pr-2 text-left text-sm leading-relaxed text-gray-800 font-sans border-t border-[#141414]/10 pt-4 custom-scrollbar">
                {selectedArticle.content.map((p, i) => (
                  <p key={i} className="mb-2">
                    {p}
                  </p>
                ))}
              </div>

              <div className="flex justify-end pt-6 border-t border-[#141414]/10 mt-6">
                <button
                  onClick={() => setSelectedArticle(null)}
                  className="px-6 py-2.5 bg-[#141414] text-[#E4E3E0] text-xs font-mono uppercase tracking-widest font-black hover:opacity-95 cursor-pointer"
                >
                  I've Finished Reading
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
