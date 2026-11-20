import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { User, Mentorship } from '../types';
import {
  Users,
  CheckCircle,
  XCircle,
  Clock,
  ShieldCheck,
  MessageSquare,
  X,
  Sparkles,
  Check,
  Edit,
  MapPin,
  Building,
  Activity,
  Video,
  ClipboardList,
  Briefcase,
  HeartHandshake,
  ChevronRight,
  ChevronLeft,
  RotateCcw,
  Award,
  Compass,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import VideoCallManager from './VideoCallManager';

const SHARED_EXPERIENCE_OPTIONS = [
  {
    id: 'state_facility',
    label: 'State Correctional Facility Alumni',
    description: 'Navigated state prison system & maximum/medium security custody',
    keywords: ['quentin', 'sing sing', 'attica', 'folsom', 'chino', 'state', 'correctional', 'prison']
  },
  {
    id: 'federal_bop',
    label: 'Federal BOP / FCI Background',
    description: 'Served time in Federal Bureau of Prisons & halfway house transition',
    keywords: ['bastrop', 'fci', 'federal', 'bop', 'penitentiary', 'alcatraz']
  },
  {
    id: 'county_detention',
    label: 'County Jail & Local Re-entry',
    description: 'Transitioned from Rikers, county detention, or local custody',
    keywords: ['rikers', 'county', 'jail', 'detention', 'island']
  },
  {
    id: 'parole_rmoms',
    label: 'Parole & RMOMS UA Compliance',
    description: 'Managing parole officer check-ins, travel permits & daily color-code UA',
    keywords: ['parole', 'supervision', 'officer', 'legal', 'court', 'probation', 'compliance']
  },
  {
    id: 'long_term_sentence',
    label: 'Long-Term Sentence (5+ Years)',
    description: 'Rebuilding after major technology, housing & social shifts',
    keywords: ['years', 'decade', 'long', 'quentin', 'sing sing', 'folsom', 'rebuilding']
  },
  {
    id: 'sobriety_recovery',
    label: 'Sobriety & Trauma Recovery',
    description: 'Maintaining clean time, mental wellness, and relapse prevention',
    keywords: ['recovery', 'substance', 'sober', 'addiction', 'counseling', 'mental', 'support', 'healing']
  },
  {
    id: 'family_reunification',
    label: 'Family & Custody Reunification',
    description: 'Reconnecting with children, partners, and rebuilding family trust',
    keywords: ['family', 'father', 'mother', 'children', 'parent', 'community', 'housing', 'reunification']
  },
  {
    id: 'housing_transition',
    label: 'Transitional Housing & Independent Living',
    description: 'Moving from halfway house/transitional shelter to your own lease',
    keywords: ['housing', 'apartment', 'sober living', 'landlord', 'shelter', 'lease']
  }
];

const PROFESSIONAL_GOAL_OPTIONS = [
  {
    id: 'tech',
    label: 'Technology & Software Engineering',
    description: 'Full-stack coding, IT certifications, remote tech careers',
    keywords: ['tech', 'coding', 'software', 'programming', 'developer', 'computer', 'website', 'engineer', 'react']
  },
  {
    id: 'trades',
    label: 'Skilled Trades & Union Apprenticeships',
    description: 'HVAC, welding, electrical, carpentry, construction & CDL logistics',
    keywords: ['trade', 'carpentry', 'plumbing', 'welding', 'electrician', 'construction', 'contractor', 'mechanic', 'hvac', 'cdl', 'logistics', 'fleet']
  },
  {
    id: 'business',
    label: 'Entrepreneurship & LLC Ownership',
    description: 'Starting a business, commercial credit, independent contracting & sales',
    keywords: ['business', 'entrepreneur', 'start', 'company', 'sales', 'marketing', 'finance', 'llc', 'owner', 'agency']
  },
  {
    id: 'culinary',
    label: 'Culinary Arts & Food Service',
    description: 'Commercial kitchens, restaurant management, catering & food trucks',
    keywords: ['cooking', 'chef', 'kitchen', 'culinary', 'restaurant', 'food', 'hospitality', 'bakery']
  },
  {
    id: 'resume',
    label: 'Resume Gaps & Felony Disclosure Prep',
    description: 'Fair-chance interviewing, explaining conviction history & first 90 days',
    keywords: ['resume', 'interview', 'job hunt', 'career', 'hiring', 'employment', 'workforce', 'mentor']
  },
  {
    id: 'legal',
    label: 'Peer Support, Legal Advocacy & Nonprofits',
    description: 'Becoming a certified peer specialist, youth mentor, or policy advocate',
    keywords: ['legal', 'advocacy', 'lawyer', 'parole', 'court', 'officer', 'nonprofit', 'youth', 'advocate', 'peer']
  },
  {
    id: 'financial',
    label: 'Financial Literacy & Credit Rebuilding',
    description: 'Clearing restitution, building credit score, banking & budgeting',
    keywords: ['finance', 'financial', 'credit', 'money', 'wealth', 'savings', 'business', 'housing']
  }
];

const TIME_SERVED_BRACKETS = [
  { id: 'under_2', label: 'Under 2 Years' },
  { id: '2_to_5', label: '2 – 5 Years' },
  { id: '5_to_10', label: '5 – 10 Years' },
  { id: 'over_10', label: '10+ Years' }
];

const CHECKIN_STYLES = [
  { id: 'weekly_kites', label: 'Weekly Kites & Check-ins' },
  { id: 'video_sessions', label: '1-on-1 Video Mentorship' },
  { id: 'career_coaching', label: 'Goal-Oriented Career Sprints' },
  { id: 'peer_accountability', label: 'Daily / As-Needed Accountability' }
];

export interface MentorshipQuestionnaireData {
  completed: boolean;
  sharedExperiences: string[];
  professionalGoals: string[];
  timeServedBracket: string;
  reentryStage: string;
  checkinStyle: string;
  careerStatement: string;
}

const DEFAULT_QUESTIONNAIRE: MentorshipQuestionnaireData = {
  completed: false,
  sharedExperiences: [],
  professionalGoals: [],
  timeServedBracket: '2_to_5',
  reentryStage: 'Actively Seeking Fair-Chance Career',
  checkinStyle: 'weekly_kites',
  careerStatement: ''
};

interface MatchResult {
  score: number;
  experienceScore: number;
  goalScore: number;
  reasons: string[];
  sharedExperienceBadges: string[];
  professionalGoalBadges: string[];
}

function calculateMatch(
  userProfile: User | null,
  questionnaire: MentorshipQuestionnaireData,
  mentor: User
): MatchResult {
  let experienceScore = 0;
  let goalScore = 0;
  const reasons: string[] = [];
  const sharedExperienceBadges: string[] = [];
  const professionalGoalBadges: string[] = [];

  const userHistory = (userProfile?.history || '').toLowerCase().trim();
  const mentorHistory = (mentor.history || '').toLowerCase().trim();
  const userBio = ((userProfile?.bio || '') + ' ' + (questionnaire.careerStatement || '')).toLowerCase();
  const mentorBio = (mentor.bio || '').toLowerCase();
  const mentorCombined = `${mentorBio} ${mentorHistory} ${(mentor.location || '').toLowerCase()}`;

  // 1. Incarceration History (Facility) Match
  if (userHistory && mentorHistory && userHistory !== 'hidden' && mentorHistory !== 'hidden') {
    const facilities = ['quentin', 'rikers', 'sing sing', 'attica', 'folsom', 'chino', 'bastrop', 'alcatraz', 'penitentiary', 'correctional', 'jail', 'prison'];
    let sharedFacility = '';
    for (const f of facilities) {
      if (userHistory.includes(f) && mentorHistory.includes(f)) {
        sharedFacility = f.charAt(0).toUpperCase() + f.slice(1);
        break;
      }
    }

    if (sharedFacility) {
      experienceScore += 35;
      reasons.push(`Shared facility history: ${sharedFacility}`);
      sharedExperienceBadges.push(`${sharedFacility} Alumni`);
    } else {
      const userWords = userHistory.split(/\s+/).filter(w => w.length > 3 && !w.includes('(') && !w.includes(')'));
      const mentorWords = mentorHistory.split(/\s+/).filter(w => w.length > 3 && !w.includes('(') && !w.includes(')'));
      const commonWords = userWords.filter(w => mentorWords.includes(w));
      if (commonWords.length > 0) {
        experienceScore += 25;
        reasons.push(`Shared facility background (${commonWords[0].toUpperCase()})`);
        sharedExperienceBadges.push('Correctional Peer');
      }
    }
  }

  // 2. Location proximity
  const userLoc = (userProfile?.location || '').toLowerCase().trim();
  const mentorLoc = (mentor.location || '').toLowerCase().trim();

  if (userLoc && mentorLoc && userLoc !== 'hidden' && mentorLoc !== 'hidden') {
    const userLocParts = userLoc.split(',').map(p => p.trim());
    const mentorLocParts = mentorLoc.split(',').map(p => p.trim());
    const sharedParts = userLocParts.filter(p => p && p.length > 1 && mentorLocParts.includes(p));
    if (sharedParts.length > 0) {
      experienceScore += 20;
      reasons.push(`Regional re-entry network (${sharedParts[0].toUpperCase()})`);
      sharedExperienceBadges.push(`${sharedParts[0].toUpperCase()} Local`);
    }
  }

  // 3. Questionnaire Shared Experiences Match
  questionnaire.sharedExperiences.forEach(expId => {
    const opt = SHARED_EXPERIENCE_OPTIONS.find(o => o.id === expId);
    if (!opt) return;
    const matchesMentor = opt.keywords.some(k => mentorCombined.includes(k));
    if (matchesMentor) {
      experienceScore += 18;
      reasons.push(`Shared Experience: ${opt.label}`);
      if (!sharedExperienceBadges.includes(opt.label)) {
        sharedExperienceBadges.push(opt.label);
      }
    }
  });

  // 4. Questionnaire Professional Goals Match
  questionnaire.professionalGoals.forEach(goalId => {
    const opt = PROFESSIONAL_GOAL_OPTIONS.find(o => o.id === goalId);
    if (!opt) return;
    const matchesMentor = opt.keywords.some(k => mentorCombined.includes(k));
    if (matchesMentor) {
      goalScore += 22;
      reasons.push(`Professional Goal Alignment: ${opt.label}`);
      if (!professionalGoalBadges.includes(opt.label)) {
        professionalGoalBadges.push(opt.label);
      }
    }
  });

  // 5. Implicit bio/career keyword overlap
  PROFESSIONAL_GOAL_OPTIONS.forEach(opt => {
    if (!questionnaire.professionalGoals.includes(opt.id)) {
      const userHas = opt.keywords.some(k => userBio.includes(k) || userHistory.includes(k));
      const mentorHas = opt.keywords.some(k => mentorCombined.includes(k));
      if (userHas && mentorHas) {
        goalScore += 12;
        reasons.push(`Mutual career focus: ${opt.label}`);
        if (!professionalGoalBadges.includes(opt.label)) {
          professionalGoalBadges.push(opt.label);
        }
      }
    }
  });

  let totalScore = experienceScore + goalScore;
  if (totalScore === 0) {
    totalScore = 48;
    experienceScore = 24;
    goalScore = 24;
    reasons.push('Re-entry peer and transitional support mentor');
  } else {
    totalScore = Math.min(99, totalScore + 25);
  }

  return {
    score: totalScore,
    experienceScore: Math.min(100, experienceScore + 30),
    goalScore: Math.min(100, goalScore + 30),
    reasons,
    sharedExperienceBadges: sharedExperienceBadges.slice(0, 3),
    professionalGoalBadges: professionalGoalBadges.slice(0, 3)
  };
}

export default function MentorshipTab() {
  const { user, token } = useAuth();
  const [mentors, setMentors] = useState<User[]>([]);
  const [mentorships, setMentorships] = useState<Mentorship[]>([]);
  const [isMentor, setIsMentor] = useState(false);
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [selectedMentor, setSelectedMentor] = useState<User | null>(null);
  const [requestMessage, setRequestMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [statusBanner, setStatusBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Active call target state for initiator call overlay
  const [activeCallTarget, setActiveCallTarget] = useState<{ id: string; username: string } | null>(null);

  // Profile data for matchmaking
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [editBio, setEditBio] = useState('');
  const [editHistory, setEditHistory] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [showTweakDNA, setShowTweakDNA] = useState(false);

  // Mentorship Matching Questionnaire State
  const [questionnaire, setQuestionnaire] = useState<MentorshipQuestionnaireData>(DEFAULT_QUESTIONNAIRE);
  const [showQuestionnaireWizard, setShowQuestionnaireWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1);
  const [isSavingQuestionnaire, setIsSavingQuestionnaire] = useState(false);

  const [filterMode, setFilterMode] = useState<'relevance' | 'experiences' | 'goals' | 'all'>('relevance');
  const [expandedReasons, setExpandedReasons] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchData();
  }, [token]);

  useEffect(() => {
    if (user?.id) {
      const savedQ = localStorage.getItem(`mentorship_questionnaire_v2_${user.id}`);
      if (savedQ) {
        try {
          const parsed = JSON.parse(savedQ);
          setQuestionnaire({ ...DEFAULT_QUESTIONNAIRE, ...parsed });
          return;
        } catch (e) {
          console.error(e);
        }
      }
      // Fallback to legacy preferences if present
      const legacy = localStorage.getItem(`mentorship_pref_${user.id}`);
      if (legacy) {
        try {
          const legacyArr: string[] = JSON.parse(legacy);
          const goals = legacyArr.filter(id => PROFESSIONAL_GOAL_OPTIONS.some(g => g.id === id));
          const exps: string[] = [];
          if (legacyArr.includes('recovery')) exps.push('sobriety_recovery');
          if (legacyArr.includes('housing')) exps.push('housing_transition');
          if (legacyArr.includes('legal')) exps.push('parole_rmoms');
          setQuestionnaire(prev => ({
            ...prev,
            professionalGoals: goals,
            sharedExperiences: exps
          }));
        } catch (e) {
          console.error(e);
        }
      }
    }
  }, [user?.id]);

  const persistQuestionnaire = async (updated: MentorshipQuestionnaireData, syncBackend = false) => {
    setQuestionnaire(updated);
    if (user?.id) {
      localStorage.setItem(`mentorship_questionnaire_v2_${user.id}`, JSON.stringify(updated));
    }
    if (syncBackend && token) {
      setIsSavingQuestionnaire(true);
      try {
        const expLabels = updated.sharedExperiences
          .map(id => SHARED_EXPERIENCE_OPTIONS.find(o => o.id === id)?.label)
          .filter(Boolean) as string[];
        const goalLabels = updated.professionalGoals
          .map(id => PROFESSIONAL_GOAL_OPTIONS.find(o => o.id === id)?.label)
          .filter(Boolean) as string[];

        await fetch('/api/mentorship/survey', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            mentorship_role: isMentor ? 'both' : 'mentee',
            interests: expLabels,
            life_goals: goalLabels,
            availability: updated.checkinStyle,
            statement: updated.careerStatement || `Re-entry focus: ${updated.reentryStage}`
          })
        });
        setStatusBanner({
          type: 'success',
          text: 'Mentorship Matching Questionnaire saved! Mentor scores updated below.'
        });
      } catch (err) {
        console.error(err);
      } finally {
        setIsSavingQuestionnaire(false);
      }
    }
  };

  const toggleSharedExperience = (id: string) => {
    const exists = questionnaire.sharedExperiences.includes(id);
    const next = exists
      ? questionnaire.sharedExperiences.filter(item => item !== id)
      : [...questionnaire.sharedExperiences, id];
    persistQuestionnaire({ ...questionnaire, sharedExperiences: next });
  };

  const toggleProfessionalGoal = (id: string) => {
    const exists = questionnaire.professionalGoals.includes(id);
    const next = exists
      ? questionnaire.professionalGoals.filter(item => item !== id)
      : [...questionnaire.professionalGoals, id];
    persistQuestionnaire({ ...questionnaire, professionalGoals: next });
  };

  const handleCompleteQuestionnaire = async (e: React.FormEvent) => {
    e.preventDefault();
    const completedData: MentorshipQuestionnaireData = {
      ...questionnaire,
      completed: true
    };
    await persistQuestionnaire(completedData, true);
    setShowQuestionnaireWizard(false);
    setFilterMode('relevance');
  };

  const handleResetQuestionnaire = () => {
    const resetData = { ...DEFAULT_QUESTIONNAIRE };
    persistQuestionnaire(resetData, false);
    setWizardStep(1);
    setStatusBanner({
      type: 'success',
      text: 'Questionnaire reset. Select your shared experiences and professional goals to re-match.'
    });
  };

  const toggleReasons = (mentorId: string) => {
    setExpandedReasons(prev => ({
      ...prev,
      [mentorId]: !prev[mentorId]
    }));
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingProfile(true);
    try {
      const res = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          history: editHistory,
          location: editLocation,
          bio: editBio,
          hide_location: userProfile?.hide_location || 0,
          hide_history: userProfile?.hide_history || 0
        })
      });
      if (res.ok) {
        setShowTweakDNA(false);
        fetchData();
        setStatusBanner({ type: 'success', text: 'Profile alignment history and location synchronized.' });
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const fetchData = () => {
    fetch('/api/users', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then((users: User[]) => {
        const me = users.find(u => u.id === user?.id);
        if (me) setIsMentor(!!me.is_mentor);
      });

    fetch('/api/users/profile', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then((profile: User) => {
        setUserProfile(profile);
        setEditBio(profile.bio || '');
        setEditHistory(profile.history || '');
        setEditLocation(profile.location || '');

        if (user?.id && !localStorage.getItem(`mentorship_questionnaire_v2_${user.id}`)) {
          const bioLower = (profile.bio || '').toLowerCase();
          const historyLower = (profile.history || '').toLowerCase();
          const autoGoals: string[] = [];
          const autoExps: string[] = [];

          if (bioLower.includes('code') || bioLower.includes('software') || bioLower.includes('tech')) autoGoals.push('tech');
          if (bioLower.includes('trade') || bioLower.includes('welding') || bioLower.includes('construct') || bioLower.includes('cdl')) autoGoals.push('trades');
          if (bioLower.includes('cooking') || bioLower.includes('chef') || bioLower.includes('kitchen')) autoGoals.push('culinary');
          if (bioLower.includes('business') || bioLower.includes('entrepreneur') || bioLower.includes('llc')) autoGoals.push('business');
          if (bioLower.includes('resume') || bioLower.includes('interview') || bioLower.includes('job')) autoGoals.push('resume');

          if (historyLower.includes('quentin') || historyLower.includes('sing') || historyLower.includes('folsom')) autoExps.push('state_facility');
          if (historyLower.includes('bastrop') || historyLower.includes('fci') || historyLower.includes('federal')) autoExps.push('federal_bop');
          if (historyLower.includes('rikers') || historyLower.includes('county')) autoExps.push('county_detention');
          if (bioLower.includes('sober') || bioLower.includes('recovery')) autoExps.push('sobriety_recovery');

          if (autoGoals.length > 0 || autoExps.length > 0) {
            const initialQ: MentorshipQuestionnaireData = {
              ...DEFAULT_QUESTIONNAIRE,
              sharedExperiences: autoExps,
              professionalGoals: autoGoals
            };
            setQuestionnaire(initialQ);
            localStorage.setItem(`mentorship_questionnaire_v2_${user.id}`, JSON.stringify(initialQ));
          }
        }
      });

    fetch('/api/mentors', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(setMentors);

    fetch('/api/mentorships', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(setMentorships);
  };

  const toggleMentorStatus = async () => {
    await fetch('/api/users/mentor-status', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ is_mentor: !isMentor })
    });
    setIsMentor(!isMentor);
    fetchData();
  };

  const requestMentorship = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMentor) return;

    setIsSubmitting(true);
    setStatusBanner(null);
    try {
      const res = await fetch('/api/mentorships/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          mentorId: selectedMentor.id,
          message: requestMessage,
          isAnonymous: isAnonymous
        })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Unable to send mentorship request');
      }
      setRequestModalOpen(false);
      setSelectedMentor(null);
      setRequestMessage('');
      setIsAnonymous(false);
      setStatusBanner({
        type: 'success',
        text: `Mentorship Kite sent to ${selectedMentor.name}!`
      });
      fetchData();
    } catch (err: any) {
      setStatusBanner({
        type: 'error',
        text: err.message || 'Failed to send mentorship request.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const openRequestModal = (mentor: User) => {
    setSelectedMentor(mentor);
    const match = calculateMatch(userProfile, questionnaire, mentor);
    const checkinLabel = CHECKIN_STYLES.find(c => c.id === questionnaire.checkinStyle)?.label || 'Weekly Check-ins';

    let intro = `Hi ${mentor.name},\n\nI completed the Mentorship Matching Questionnaire and saw we have a ${match.score}% compatibility match!\n\nHere is where our backgrounds and goals align:\n`;
    match.reasons.slice(0, 4).forEach(r => {
      intro += `• ${r}\n`;
    });
    if (questionnaire.careerStatement.trim()) {
      intro += `\nMy primary objective right now: "${questionnaire.careerStatement.trim()}"\n`;
    }
    intro += `\nPreferred Mentorship Style: ${checkinLabel}.\nLooking forward to connecting and learning from your path!`;

    setRequestMessage(intro);
    setIsAnonymous(false);
    setRequestModalOpen(true);
  };

  const updateStatus = async (id: string, status: string) => {
    await fetch(`/api/mentorships/${id}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ status })
    });
    fetchData();
  };

  const myMentees = mentorships.filter(m => m.mentor_id === user?.id && m.status === 'active');
  const myMentors = mentorships.filter(m => m.mentee_id === user?.id && m.status === 'active');
  const pendingIncoming = mentorships.filter(m => m.mentor_id === user?.id && m.status === 'pending');
  const pendingOutgoing = mentorships.filter(m => m.mentee_id === user?.id && m.status === 'pending');

  return (
    <div className="space-y-10">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#141414] text-[#E4E3E0] text-[10px] font-mono uppercase tracking-widest font-bold">
            <Compass size={12} className="text-amber-400" /> Peer Re-Entry Guidance & Career Alignment
          </div>
          <h2 className="text-5xl md:text-6xl font-serif italic tracking-tighter">Mentorship</h2>
          <p className="text-lg opacity-65 max-w-2xl">
            Complete the matching questionnaire to connect with verified alumni mentors who share your lived experiences and professional career goals.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setWizardStep(1);
              setShowQuestionnaireWizard(!showQuestionnaireWizard);
            }}
            className="px-5 py-3 bg-amber-500 text-[#141414] border-2 border-[#141414] uppercase tracking-widest text-xs font-black font-mono shadow-[4px_4px_0px_0px_rgba(20,20,20,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all flex items-center gap-2 cursor-pointer"
          >
            <ClipboardList size={16} />
            {showQuestionnaireWizard
              ? 'Close Matching Questionnaire'
              : questionnaire.completed
              ? 'Edit Matching Questionnaire'
              : 'Take Matching Questionnaire'}
          </button>

          <button
            type="button"
            onClick={toggleMentorStatus}
            className={`px-5 py-3 uppercase tracking-widest text-xs font-bold border-2 border-[#141414] transition-colors cursor-pointer ${
              isMentor
                ? 'bg-[#141414] text-[#E4E3E0]'
                : 'bg-white hover:bg-[#141414]/5 text-[#141414]'
            }`}
          >
            {isMentor ? '✓ Active Mentor' : 'Become a Mentor'}
          </button>
        </div>
      </header>

      {/* Status Notification Banner */}
      <AnimatePresence>
        {statusBanner && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className={`p-4 border-2 border-[#141414] flex items-center justify-between gap-4 ${
              statusBanner.type === 'success' ? 'bg-emerald-50 text-emerald-950' : 'bg-red-50 text-red-950'
            }`}
          >
            <div className="flex items-center gap-2.5 text-xs font-mono font-bold">
              {statusBanner.type === 'success' ? (
                <CheckCircle size={16} className="text-emerald-700 shrink-0" />
              ) : (
                <AlertCircle size={16} className="text-red-700 shrink-0" />
              )}
              <span>{statusBanner.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setStatusBanner(null)}
              className="text-xs font-mono uppercase tracking-wider opacity-60 hover:opacity-100 cursor-pointer"
            >
              Dismiss
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Interactive Multi-Step Mentorship Matching Questionnaire */}
      <AnimatePresence>
        {showQuestionnaireWizard && (
          <motion.section
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="bg-white border-2 border-[#141414] shadow-[8px_8px_0px_0px_rgba(20,20,20,1)] overflow-hidden"
          >
            <div className="bg-[#141414] text-[#E4E3E0] p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-amber-400 text-[10px] font-mono uppercase tracking-widest font-bold mb-1">
                  <Sparkles size={12} /> Personalized Mentor Discovery Wizard
                </div>
                <h3 className="text-2xl font-serif italic">Mentorship Matching Questionnaire</h3>
                <p className="text-xs text-[#E4E3E0]/70 mt-1">
                  Match with verified mentors based on shared incarceration/re-entry experiences and professional career goals.
                </p>
              </div>

              {/* Step Indicator */}
              <div className="flex items-center gap-2 shrink-0">
                {[
                  { step: 1, label: '1. Shared Experiences' },
                  { step: 2, label: '2. Professional Goals' },
                  { step: 3, label: '3. Mentorship Format' }
                ].map(item => (
                  <button
                    key={item.step}
                    type="button"
                    onClick={() => setWizardStep(item.step as 1 | 2 | 3)}
                    className={`px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider font-bold border transition-all cursor-pointer ${
                      wizardStep === item.step
                        ? 'bg-amber-400 text-[#141414] border-amber-400'
                        : 'bg-white/10 text-[#E4E3E0]/80 border-white/20 hover:bg-white/20'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleCompleteQuestionnaire} className="p-6 md:p-8 space-y-6">
              {wizardStep === 1 && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#141414]/10 pb-4">
                    <div>
                      <h4 className="text-lg font-serif italic font-bold flex items-center gap-2">
                        <HeartHandshake size={20} className="text-amber-600" /> Step 1: Shared Lived Experiences
                      </h4>
                      <p className="text-xs opacity-70 mt-0.5">
                        Select the correctional backgrounds and re-entry chapters you want your mentor to understand firsthand.
                      </p>
                    </div>
                    <span className="text-[11px] font-mono font-bold bg-[#141414]/5 px-3 py-1 border border-[#141414]/20">
                      {questionnaire.sharedExperiences.length} Selected
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {SHARED_EXPERIENCE_OPTIONS.map(opt => {
                      const selected = questionnaire.sharedExperiences.includes(opt.id);
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => toggleSharedExperience(opt.id)}
                          className={`text-left p-4 border-2 transition-all cursor-pointer flex items-start gap-3 ${
                            selected
                              ? 'bg-[#141414] text-[#E4E3E0] border-[#141414] shadow-[3px_3px_0px_0px_rgba(245,158,11,1)]'
                              : 'bg-white text-[#141414] border-[#141414]/20 hover:border-[#141414]'
                          }`}
                        >
                          <div
                            className={`w-5 h-5 mt-0.5 border flex items-center justify-center shrink-0 ${
                              selected ? 'bg-amber-400 border-amber-400 text-[#141414]' : 'border-[#141414]/40'
                            }`}
                          >
                            {selected && <Check size={13} strokeWidth={3} />}
                          </div>
                          <div>
                            <div className="text-xs font-mono uppercase tracking-wider font-bold">{opt.label}</div>
                            <div className={`text-xs mt-1 leading-relaxed ${selected ? 'text-[#E4E3E0]/75' : 'text-[#141414]/65'}`}>
                              {opt.description}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    <div>
                      <label className="block text-[10px] font-mono uppercase tracking-widest font-bold mb-2">
                        Time Served / Sentence Bracket
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {TIME_SERVED_BRACKETS.map(b => (
                          <button
                            key={b.id}
                            type="button"
                            onClick={() => persistQuestionnaire({ ...questionnaire, timeServedBracket: b.id })}
                            className={`p-2.5 text-xs font-mono font-bold border transition-all cursor-pointer ${
                              questionnaire.timeServedBracket === b.id
                                ? 'bg-[#141414] text-[#E4E3E0] border-[#141414]'
                                : 'bg-white border-[#141414]/25 hover:border-[#141414]'
                            }`}
                          >
                            {b.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono uppercase tracking-widest font-bold mb-2">
                        Current Re-Entry Stage
                      </label>
                      <select
                        value={questionnaire.reentryStage}
                        onChange={e => persistQuestionnaire({ ...questionnaire, reentryStage: e.target.value })}
                        className="w-full p-2.5 text-xs font-mono font-bold border-2 border-[#141414] bg-white outline-none"
                      >
                        <option value="First 90 Days Home / Transitional">First 90 Days Home / Transitional</option>
                        <option value="On Active Parole / RMOMS Supervision">On Active Parole / RMOMS Supervision</option>
                        <option value="Actively Seeking Fair-Chance Career">Actively Seeking Fair-Chance Career</option>
                        <option value="Scaling Career & Long-Term Stability">Scaling Career & Long-Term Stability</option>
                        <option value="Ready to Give Back & Guide Others">Ready to Give Back & Guide Others</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {wizardStep === 2 && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#141414]/10 pb-4">
                    <div>
                      <h4 className="text-lg font-serif italic font-bold flex items-center gap-2">
                        <Briefcase size={20} className="text-emerald-700" /> Step 2: Professional & Career Goals
                      </h4>
                      <p className="text-xs opacity-70 mt-0.5">
                        Choose the industries, trades, or professional milestones where you want hands-on mentorship.
                      </p>
                    </div>
                    <span className="text-[11px] font-mono font-bold bg-[#141414]/5 px-3 py-1 border border-[#141414]/20">
                      {questionnaire.professionalGoals.length} Selected
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {PROFESSIONAL_GOAL_OPTIONS.map(opt => {
                      const selected = questionnaire.professionalGoals.includes(opt.id);
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => toggleProfessionalGoal(opt.id)}
                          className={`text-left p-4 border-2 transition-all cursor-pointer flex items-start gap-3 ${
                            selected
                              ? 'bg-[#141414] text-[#E4E3E0] border-[#141414] shadow-[3px_3px_0px_0px_rgba(16,185,129,1)]'
                              : 'bg-white text-[#141414] border-[#141414]/20 hover:border-[#141414]'
                          }`}
                        >
                          <div
                            className={`w-5 h-5 mt-0.5 border flex items-center justify-center shrink-0 ${
                              selected ? 'bg-emerald-400 border-emerald-400 text-[#141414]' : 'border-[#141414]/40'
                            }`}
                          >
                            {selected && <Check size={13} strokeWidth={3} />}
                          </div>
                          <div>
                            <div className="text-xs font-mono uppercase tracking-wider font-bold">{opt.label}</div>
                            <div className={`text-xs mt-1 leading-relaxed ${selected ? 'text-[#E4E3E0]/75' : 'text-[#141414]/65'}`}>
                              {opt.description}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {wizardStep === 3 && (
                <div className="space-y-6">
                  <div className="border-b border-[#141414]/10 pb-4">
                    <h4 className="text-lg font-serif italic font-bold flex items-center gap-2">
                      <Award size={20} className="text-amber-600" /> Step 3: Mentorship Format & Personal Goal Statement
                    </h4>
                    <p className="text-xs opacity-70 mt-0.5">
                      Define how you prefer to communicate and what a successful 90-day mentorship looks like for you.
                    </p>
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono uppercase tracking-widest font-bold mb-2">
                      Preferred Check-in Cadence & Format
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {CHECKIN_STYLES.map(style => (
                        <button
                          key={style.id}
                          type="button"
                          onClick={() => persistQuestionnaire({ ...questionnaire, checkinStyle: style.id })}
                          className={`p-3.5 text-left border-2 font-mono text-xs font-bold transition-all cursor-pointer flex items-center justify-between ${
                            questionnaire.checkinStyle === style.id
                              ? 'bg-[#141414] text-[#E4E3E0] border-[#141414]'
                              : 'bg-white text-[#141414] border-[#141414]/25 hover:border-[#141414]'
                          }`}
                        >
                          <span>{style.label}</span>
                          {questionnaire.checkinStyle === style.id && <Check size={14} className="text-amber-400" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono uppercase tracking-widest font-bold mb-2">
                      Your 90-Day Professional or Re-Entry Goal Statement (Included in Mentor Kite Intro)
                    </label>
                    <textarea
                      value={questionnaire.careerStatement}
                      onChange={e => persistQuestionnaire({ ...questionnaire, careerStatement: e.target.value })}
                      rows={3}
                      placeholder="e.g., Looking for a mentor who transitioned from a state facility into commercial welding or tech, and can help me navigate parole check-ins while studying for certifications."
                      className="w-full border-2 border-[#141414] p-3 text-sm font-medium focus:outline-none bg-neutral-50"
                    />
                  </div>
                </div>
              )}

              {/* Wizard Footer Controls */}
              <div className="pt-4 border-t border-[#141414]/15 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  {wizardStep > 1 && (
                    <button
                      type="button"
                      onClick={() => setWizardStep((wizardStep - 1) as 1 | 2 | 3)}
                      className="px-4 py-2.5 border border-[#141414] text-xs font-mono uppercase tracking-wider font-bold flex items-center gap-1 hover:bg-[#141414]/5 cursor-pointer"
                    >
                      <ChevronLeft size={14} /> Previous
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleResetQuestionnaire}
                    className="px-3 py-2.5 text-xs font-mono uppercase tracking-wider opacity-60 hover:opacity-100 flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw size={13} /> Reset
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  {wizardStep < 3 ? (
                    <button
                      type="button"
                      onClick={() => setWizardStep((wizardStep + 1) as 1 | 2 | 3)}
                      className="px-6 py-2.5 bg-[#141414] text-[#E4E3E0] text-xs font-mono uppercase tracking-widest font-bold flex items-center gap-1.5 hover:bg-neutral-800 cursor-pointer"
                    >
                      Next Step <ChevronRight size={14} />
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={isSavingQuestionnaire}
                      className="px-6 py-3 bg-emerald-600 text-white border-2 border-[#141414] text-xs font-mono uppercase tracking-widest font-black shadow-[3px_3px_0px_0px_rgba(20,20,20,1)] hover:bg-emerald-700 transition-all cursor-pointer disabled:opacity-50"
                    >
                      {isSavingQuestionnaire ? 'Calculating Mentor Matches...' : 'Save & Find Matching Mentors'}
                    </button>
                  )}
                </div>
              </div>
            </form>
          </motion.section>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Active & Pending Mentorships (5 cols) */}
        <div className="lg:col-span-5 space-y-8">
          {/* Questionnaire Summary Card */}
          <div className="bg-white border-2 border-[#141414] p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs uppercase tracking-widest font-black font-mono flex items-center gap-2">
                <ClipboardList size={15} className="text-amber-600" /> Your Matching Profile
              </h3>
              <button
                type="button"
                onClick={() => setShowQuestionnaireWizard(true)}
                className="text-[10px] font-mono uppercase tracking-wider font-bold underline hover:text-amber-700 cursor-pointer"
              >
                {questionnaire.completed ? 'Update Answers' : 'Complete Questionnaire'}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-amber-50/70 border border-amber-900/20">
                <div className="text-[10px] font-mono uppercase tracking-wider text-amber-900/70 font-bold">
                  Shared Experiences
                </div>
                <div className="text-lg font-serif italic font-bold text-amber-950 mt-0.5">
                  {questionnaire.sharedExperiences.length} Active Filters
                </div>
              </div>
              <div className="p-3 bg-emerald-50/70 border border-emerald-900/20">
                <div className="text-[10px] font-mono uppercase tracking-wider text-emerald-900/70 font-bold">
                  Professional Goals
                </div>
                <div className="text-lg font-serif italic font-bold text-emerald-950 mt-0.5">
                  {questionnaire.professionalGoals.length} Career Tracks
                </div>
              </div>
            </div>

            {(questionnaire.sharedExperiences.length > 0 || questionnaire.professionalGoals.length > 0) && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {questionnaire.sharedExperiences.map(id => {
                  const opt = SHARED_EXPERIENCE_OPTIONS.find(o => o.id === id);
                  return opt ? (
                    <span
                      key={id}
                      className="text-[10px] font-mono bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 font-bold"
                    >
                      {opt.label}
                    </span>
                  ) : null;
                })}
                {questionnaire.professionalGoals.map(id => {
                  const opt = PROFESSIONAL_GOAL_OPTIONS.find(o => o.id === id);
                  return opt ? (
                    <span
                      key={id}
                      className="text-[10px] font-mono bg-emerald-100 text-emerald-900 border border-emerald-300 px-2 py-0.5 font-bold"
                    >
                      {opt.label}
                    </span>
                  ) : null;
                })}
              </div>
            )}
          </div>

          {/* Pending Requests (Incoming) */}
          {pendingIncoming.length > 0 && (
            <section>
              <h3 className="text-xs uppercase tracking-widest font-bold mb-4 flex items-center gap-2">
                <Clock size={16} /> Pending Requests
              </h3>
              <div className="space-y-4">
                {pendingIncoming.map(m => (
                  <div key={m.id} className="bg-white border border-[#141414] p-4 flex justify-between items-center">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                      <div>
                        <span className="font-bold">{m.mentee_name}</span> wants you as a mentor.
                      </div>
                      {m.is_anonymous === 1 && (
                        <span className="inline-flex items-center gap-1 text-[9px] font-mono uppercase tracking-widest font-black bg-amber-100 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded-sm self-start sm:self-auto">
                          Anonymous Query
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => updateStatus(m.id, 'active')}
                        className="p-2 hover:bg-green-100 text-green-700 rounded-full border border-green-200 select-none cursor-pointer"
                      >
                        <CheckCircle size={20} />
                      </button>
                      <button
                        onClick={() => updateStatus(m.id, 'declined')}
                        className="p-2 hover:bg-red-100 text-red-700 rounded-full border border-red-200 select-none cursor-pointer"
                      >
                        <XCircle size={20} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Active Mentorships */}
          <section>
            <h3 className="text-xs uppercase tracking-widest font-bold mb-4 flex items-center gap-2">
              <ShieldCheck size={16} /> Active Connections
            </h3>
            <div className="space-y-4">
              {myMentors.map(m => (
                <div key={m.id} className="bg-[#141414] text-[#E4E3E0] p-6 relative">
                  <div className="flex justify-between items-start mb-2">
                    <div className="text-[10px] uppercase tracking-widest opacity-60">Your Mentor</div>
                    {m.is_anonymous === 1 && (
                      <span className="text-[9px] font-mono bg-white/10 text-amber-300 px-2 py-0.5 rounded-sm font-bold uppercase tracking-wider">
                        Connected Anonymously
                      </span>
                    )}
                  </div>
                  <div className="text-2xl font-serif italic mb-4">{m.mentor_name}</div>
                  <div className="flex justify-between items-center">
                    <div className="flex gap-4">
                      <button className="text-xs uppercase tracking-widest flex items-center gap-2 hover:opacity-80">
                        <MessageSquare size={14} /> Send Kite
                      </button>
                      <button
                        onClick={() => setActiveCallTarget({ id: m.mentor_id, username: m.mentor_name })}
                        className="text-xs uppercase tracking-widest flex items-center gap-2 text-amber-400 hover:text-amber-300 font-bold cursor-pointer"
                      >
                        <Video size={14} /> Video Call
                      </button>
                    </div>
                    <button
                      onClick={() => updateStatus(m.id, 'completed')}
                      className="text-xs uppercase tracking-widest opacity-60 hover:opacity-100 cursor-pointer"
                    >
                      Mark Completed
                    </button>
                  </div>
                </div>
              ))}
              {myMentees.map(m => (
                <div key={m.id} className="bg-white border border-[#141414] p-6 relative">
                  <div className="flex justify-between items-start mb-2">
                    <div className="text-[10px] uppercase tracking-widest opacity-60">Your Mentee</div>
                    {m.is_anonymous === 1 && (
                      <span className="text-[9px] font-mono bg-neutral-100 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-sm font-bold uppercase tracking-wider">
                        Anonymous Connection
                      </span>
                    )}
                  </div>
                  <div className="text-2xl font-serif italic mb-4">{m.mentee_name}</div>
                  <div className="flex justify-between items-center">
                    <div className="flex gap-4">
                      <button className="text-xs uppercase tracking-widest flex items-center gap-2 hover:opacity-80">
                        <MessageSquare size={14} /> Send Kite
                      </button>
                      {m.is_anonymous === 1 ? (
                        <div className="text-[11px] text-zinc-500 flex items-center gap-1 font-medium font-mono">
                          <Video size={14} className="opacity-60" /> Video Call Off (Anonymized)
                        </div>
                      ) : (
                        <button
                          onClick={() => setActiveCallTarget({ id: m.mentee_id, username: m.mentee_name })}
                          className="text-xs uppercase tracking-widest flex items-center gap-2 text-amber-600 hover:text-amber-500 font-bold cursor-pointer"
                        >
                          <Video size={14} /> Video Call
                        </button>
                      )}
                    </div>
                    <button
                      onClick={() => updateStatus(m.id, 'completed')}
                      className="text-xs uppercase tracking-widest opacity-60 hover:opacity-100 cursor-pointer"
                    >
                      Mark Completed
                    </button>
                  </div>
                </div>
              ))}
              {myMentors.length === 0 && myMentees.length === 0 && (
                <div className="p-6 border border-[#141414]/20 text-center opacity-60 text-sm">
                  No active mentorships yet. Use the questionnaire on the right to find a mentor.
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Right Column: Alignment Engine & Verified Mentor Directory (7 cols) */}
        <section className="lg:col-span-7 space-y-6">
          <div className="bg-[#141414]/5 border-2 border-[#141414] p-5 space-y-4">
            <div className="flex justify-between items-center flex-wrap gap-2">
              <h3 className="text-sm uppercase tracking-widest font-black flex items-center gap-2 text-[#141414]">
                <Sparkles size={16} className="text-[#141414]" /> Alignment Engine & Quick Filters
              </h3>
              <div className="flex flex-wrap gap-1 border border-[#141414] p-0.5 bg-white">
                <button
                  type="button"
                  onClick={() => setFilterMode('relevance')}
                  className={`px-2.5 py-1 text-[9px] font-mono uppercase tracking-wider font-bold transition-all cursor-pointer ${
                    filterMode === 'relevance'
                      ? 'bg-[#141414] text-[#E4E3E0]'
                      : 'hover:bg-[#141414]/5 text-[#141414]'
                  }`}
                >
                  Best Overall
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode('experiences')}
                  className={`px-2.5 py-1 text-[9px] font-mono uppercase tracking-wider font-bold transition-all cursor-pointer ${
                    filterMode === 'experiences'
                      ? 'bg-amber-600 text-white'
                      : 'hover:bg-[#141414]/5 text-[#141414]'
                  }`}
                >
                  Shared Experiences
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode('goals')}
                  className={`px-2.5 py-1 text-[9px] font-mono uppercase tracking-wider font-bold transition-all cursor-pointer ${
                    filterMode === 'goals'
                      ? 'bg-emerald-700 text-white'
                      : 'hover:bg-[#141414]/5 text-[#141414]'
                  }`}
                >
                  Professional Goals
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode('all')}
                  className={`px-2.5 py-1 text-[9px] font-mono uppercase tracking-wider font-bold transition-all cursor-pointer ${
                    filterMode === 'all'
                      ? 'bg-[#141414] text-[#E4E3E0]'
                      : 'hover:bg-[#141414]/5 text-[#141414]'
                  }`}
                >
                  All Mentors
                </button>
              </div>
            </div>

            {/* Quick Toggle Pills for Shared Experiences & Professional Goals */}
            <div className="space-y-3">
              <div>
                <span className="block text-[10px] uppercase tracking-wider font-bold text-amber-900 font-mono mb-1.5">
                  Shared Experiences Filter (Click to toggle):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {SHARED_EXPERIENCE_OPTIONS.map(exp => {
                    const active = questionnaire.sharedExperiences.includes(exp.id);
                    return (
                      <button
                        key={exp.id}
                        type="button"
                        onClick={() => toggleSharedExperience(exp.id)}
                        className={`px-2.5 py-1 text-[11px] border transition-all cursor-pointer flex items-center gap-1 ${
                          active
                            ? 'bg-amber-500 text-[#141414] border-[#141414] font-bold'
                            : 'bg-white text-[#141414]/75 border-[#141414]/20 hover:border-[#141414]'
                        }`}
                      >
                        {active && <Check size={10} strokeWidth={3} />}
                        {exp.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <span className="block text-[10px] uppercase tracking-wider font-bold text-emerald-900 font-mono mb-1.5">
                  Professional Goals Filter (Click to toggle):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {PROFESSIONAL_GOAL_OPTIONS.map(goal => {
                    const active = questionnaire.professionalGoals.includes(goal.id);
                    return (
                      <button
                        key={goal.id}
                        type="button"
                        onClick={() => toggleProfessionalGoal(goal.id)}
                        className={`px-2.5 py-1 text-[11px] border transition-all cursor-pointer flex items-center gap-1 ${
                          active
                            ? 'bg-emerald-700 text-white border-[#141414] font-bold'
                            : 'bg-white text-[#141414]/75 border-[#141414]/20 hover:border-[#141414]'
                        }`}
                      >
                        {active && <Check size={10} strokeWidth={3} />}
                        {goal.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-[#141414]/10 flex justify-between items-center">
              <button
                type="button"
                onClick={() => setShowTweakDNA(!showTweakDNA)}
                className="text-[10px] uppercase font-mono tracking-wider font-bold text-[#141414] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Edit size={12} /> {showTweakDNA ? 'Close Alignment Setup' : 'Calibrate Facility & Location Profile'}
              </button>
              {userProfile && (
                <div className="text-[10px] font-mono text-[#141414]/60 uppercase">
                  Profile Status:{' '}
                  <span className="font-bold text-emerald-700">
                    {userProfile.bio && userProfile.history && userProfile.location ? 'Synchronized' : 'Incomplete'}
                  </span>
                </div>
              )}
            </div>

            {/* Inline profile tweak editor */}
            <AnimatePresence>
              {showTweakDNA && (
                <motion.form
                  onSubmit={handleUpdateProfile}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4 pt-3 border-t border-[#141414]/10 overflow-hidden"
                >
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#141414] font-mono flex items-center gap-1.5">
                    <Activity size={12} className="text-[#141414]" /> Alignment DNA Editor
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[9px] uppercase tracking-wider font-mono text-[#141414]/60 mb-1">
                        Incarceration History Facility
                      </label>
                      <input
                        type="text"
                        value={editHistory}
                        onChange={e => setEditHistory(e.target.value)}
                        placeholder="e.g., San Quentin or Rikers Island"
                        className="w-full text-xs border border-[#141414]/20 focus:border-[#141414] p-2 bg-white outline-none font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] uppercase tracking-wider font-mono text-[#141414]/60 mb-1">
                        Current Metro Location
                      </label>
                      <input
                        type="text"
                        value={editLocation}
                        onChange={e => setEditLocation(e.target.value)}
                        placeholder="e.g., Oakland, CA"
                        className="w-full text-xs border border-[#141414]/20 focus:border-[#141414] p-2 bg-white outline-none font-bold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[9px] uppercase tracking-wider font-mono text-[#141414]/60 mb-1">
                      Professional Bio & Ambition
                    </label>
                    <textarea
                      value={editBio}
                      onChange={e => setEditBio(e.target.value)}
                      placeholder="e.g., Re-entry student focusing on backend engineering and resume support"
                      rows={2}
                      className="w-full text-xs border border-[#141414]/20 focus:border-[#141414] p-2 bg-white outline-none resize-none font-medium"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isUpdatingProfile}
                    className="w-full bg-[#141414] text-[#E4E3E0] hover:bg-neutral-800 p-2 text-[10px] font-mono font-bold uppercase tracking-wider transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {isUpdatingProfile ? 'Saving Alignment Profile...' : 'Update & Sync Match Score'}
                  </button>
                </motion.form>
              )}
            </AnimatePresence>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs uppercase tracking-widest font-bold flex items-center gap-2">
                <Users size={16} /> Verified Mentor Directory ({mentors.length})
              </h3>
              <span className="text-[10px] font-mono uppercase tracking-wider opacity-60">
                Sorted by:{' '}
                <strong>
                  {filterMode === 'relevance'
                    ? 'Overall Compatibility'
                    : filterMode === 'experiences'
                    ? 'Shared Lived Experiences'
                    : filterMode === 'goals'
                    ? 'Professional Goal Fit'
                    : 'Directory Default'}
                </strong>
              </span>
            </div>

            {(() => {
              const scoredMentors = mentors.map(m => {
                const match = calculateMatch(userProfile, questionnaire, m);
                return {
                  mentor: m,
                  ...match
                };
              });

              const displayedMentors =
                filterMode === 'relevance'
                  ? [...scoredMentors].sort((a, b) => b.score - a.score)
                  : filterMode === 'experiences'
                  ? [...scoredMentors].sort((a, b) => b.experienceScore - a.experienceScore)
                  : filterMode === 'goals'
                  ? [...scoredMentors].sort((a, b) => b.goalScore - a.goalScore)
                  : scoredMentors;

              if (displayedMentors.length === 0) {
                return (
                  <div className="p-6 border border-[#141414]/20 text-center opacity-60 text-sm">
                    No mentors available right now. Check back later.
                  </div>
                );
              }

              return displayedMentors.map(
                ({
                  mentor,
                  score,
                  experienceScore,
                  goalScore,
                  reasons,
                  sharedExperienceBadges,
                  professionalGoalBadges
                }) => {
                  const pending = pendingOutgoing.find(m => m.mentor_id === mentor.id);
                  const active = myMentors.find(m => m.mentor_id === mentor.id);
                  const isHighMatch = score >= 80;

                  return (
                    <div
                      key={mentor.id}
                      className={`bg-white border-2 p-6 transition-all duration-300 relative ${
                        isHighMatch && filterMode !== 'all'
                          ? 'border-[#141414] shadow-[4px_4px_0px_0px_rgba(20,20,20,1)]'
                          : 'border-[#141414]/40 hover:border-[#141414]'
                      }`}
                    >
                      {isHighMatch && filterMode !== 'all' && (
                        <div className="absolute top-0 right-6 -translate-y-1/2 bg-[#141414] text-[#E4E3E0] border border-[#141414] px-2.5 py-0.5 text-[9px] uppercase tracking-wider font-mono font-bold flex items-center gap-1 rounded-sm shadow-sm select-none">
                          <Sparkles size={10} className="text-amber-400" /> TOP QUESTIONNAIRE MATCH
                        </div>
                      )}

                      <div className="flex justify-between items-start mb-3 gap-4">
                        <div>
                          <h4 className="text-xl font-serif italic font-bold">{mentor.name}</h4>
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs opacity-60 mt-1 font-mono">
                            {mentor.history && (
                              <span className="flex items-center gap-1">
                                <Building size={12} /> {mentor.history}
                              </span>
                            )}
                            {mentor.history && mentor.location && <span>•</span>}
                            {mentor.location && (
                              <span className="flex items-center gap-1">
                                <MapPin size={12} /> {mentor.location}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Compatibility Score Display */}
                        <div className="flex flex-col items-end gap-1 text-right shrink-0">
                          <div
                            className={`text-[10px] px-2.5 py-0.5 uppercase tracking-widest font-mono font-bold border rounded-sm ${
                              score >= 80
                                ? 'bg-emerald-500/10 text-emerald-800 border-emerald-500/30'
                                : score >= 60
                                ? 'bg-amber-500/10 text-amber-800 border-amber-500/30'
                                : 'bg-zinc-500/10 text-zinc-800 border-zinc-500/20'
                            }`}
                          >
                            {score}% Overall Match
                          </div>
                          <div className="flex items-center gap-1.5 text-[9px] font-mono">
                            <span className="text-amber-800 font-bold">Exp: {experienceScore}%</span>
                            <span className="opacity-40">|</span>
                            <span className="text-emerald-800 font-bold">Goals: {goalScore}%</span>
                          </div>
                        </div>
                      </div>

                      <p className="text-sm opacity-85 leading-relaxed mb-4">{mentor.bio}</p>

                      {/* Matched Shared Experience & Professional Goal Badges */}
                      {(sharedExperienceBadges.length > 0 || professionalGoalBadges.length > 0) && (
                        <div className="flex flex-wrap gap-1.5 mb-4">
                          {sharedExperienceBadges.map((badge, idx) => (
                            <span
                              key={`exp-${idx}`}
                              className="inline-flex items-center gap-1 text-[10px] font-mono font-bold bg-amber-100/80 text-amber-950 border border-amber-300 px-2 py-0.5"
                            >
                              <HeartHandshake size={11} className="text-amber-700" /> {badge}
                            </span>
                          ))}
                          {professionalGoalBadges.map((badge, idx) => (
                            <span
                              key={`goal-${idx}`}
                              className="inline-flex items-center gap-1 text-[10px] font-mono font-bold bg-emerald-100/80 text-emerald-950 border border-emerald-300 px-2 py-0.5"
                            >
                              <Briefcase size={11} className="text-emerald-700" /> {badge}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="pt-3 border-t border-[#141414]/10">
                        <div className="flex justify-between items-center flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => toggleReasons(mentor.id)}
                            className="text-[10px] uppercase font-mono tracking-wider font-bold text-[#141414]/70 hover:text-[#141414] flex items-center gap-1.5 cursor-pointer"
                          >
                            {expandedReasons[mentor.id]
                              ? 'Hide Questionnaire Alignment'
                              : `Why You Match (${reasons.length} reasons)`}
                            <Sparkles size={11} className="text-amber-500" />
                          </button>

                          {active ? (
                            <span className="text-[10px] uppercase tracking-widest bg-[#141414] text-[#E4E3E0] px-3 py-1 font-bold font-mono">
                              Active Connection
                            </span>
                          ) : pending ? (
                            <span className="text-[10px] uppercase tracking-widest border border-[#141414] px-3 py-1 opacity-60 font-mono">
                              Pending Reply
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => openRequestModal(mentor)}
                              className="text-[10px] uppercase tracking-widest bg-[#141414] text-[#E4E3E0] px-3.5 py-1.5 hover:bg-neutral-800 transition-colors font-bold font-mono shadow-[2px_2px_0px_0px_rgba(20,20,20,1)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] cursor-pointer"
                            >
                              Request Mentor
                            </button>
                          )}
                        </div>

                        <AnimatePresence>
                          {expandedReasons[mentor.id] && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden mt-3"
                            >
                              <div className="bg-[#141414]/5 p-3 rounded-sm space-y-1.5 border border-[#141414]/10">
                                <h5 className="text-[9px] uppercase tracking-wider font-mono text-[#141414]/60 font-black mb-1">
                                  QUESTIONNAIRE & PROFILE COMPATIBILITY BREAKDOWN:
                                </h5>
                                {reasons.map((reason, rIdx) => (
                                  <div
                                    key={rIdx}
                                    className="text-xs flex items-center gap-2 text-[#141414]/85 leading-relaxed font-semibold"
                                  >
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0" />
                                    <span>{reason}</span>
                                  </div>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  );
                }
              );
            })()}
          </div>
        </section>
      </div>

      {/* Mentorship Request Modal */}
      <AnimatePresence>
        {requestModalOpen && selectedMentor && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-md border border-[#141414] shadow-2xl overflow-hidden"
            >
              <div className="bg-[#141414] text-[#E4E3E0] p-4 flex justify-between items-center">
                <h3 className="font-serif italic text-xl">Request Mentorship</h3>
                <button
                  onClick={() => setRequestModalOpen(false)}
                  className="hover:opacity-70 transition-opacity"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={requestMentorship} className="p-6 space-y-6">
                <div>
                  <p className="text-sm opacity-80 mb-4">
                    You are requesting mentorship from <strong className="font-bold">{selectedMentor.name}</strong>.
                  </p>

                  <label className="block text-xs uppercase tracking-widest font-bold mb-2">
                    Personal Kite (Pre-filled from Questionnaire)
                  </label>
                  <textarea
                    required
                    value={requestMessage}
                    onChange={e => setRequestMessage(e.target.value)}
                    placeholder="Introduce yourself and explain why you'd like them to be your mentor..."
                    className="w-full border border-[#141414] p-3 min-h-[140px] focus:outline-none focus:ring-2 focus:ring-[#141414]/10 resize-y font-medium text-sm"
                  />
                  <p className="text-[10px] uppercase tracking-widest opacity-50 mt-1">
                    This will be sent as a private kite to the mentor.
                  </p>

                  {/* Anonymity settings toggle */}
                  <div className="mt-4 p-3 bg-neutral-50 border border-[#141414]/10 flex flex-col gap-1.5 rounded-sm">
                    <label className="flex items-start gap-2.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={isAnonymous}
                        onChange={e => setIsAnonymous(e.target.checked)}
                        className="mt-0.5 w-4 h-4 text-[#141414] border-[#141414] rounded focus:ring-0 cursor-pointer accent-[#141414]"
                      />
                      <div>
                        <span className="block text-xs uppercase tracking-wider font-bold text-[#141414]">
                          Send Anonymously
                        </span>
                        <span className="block text-[10px] text-neutral-500 leading-normal mt-0.5">
                          Hide your profile name and location. The vetted mentor will read your query and reply to you as{' '}
                          <strong className="text-neutral-700">"Anonymous Mentee"</strong>, maintaining maximum privacy.
                        </span>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="flex gap-4 pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 bg-[#141414] text-[#E4E3E0] p-3 text-xs uppercase tracking-widest font-bold hover:opacity-90 transition-opacity disabled:opacity-50 select-none cursor-pointer"
                  >
                    {isSubmitting ? 'Sending...' : 'Send Request'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setRequestModalOpen(false)}
                    className="flex-1 border border-[#141414] p-3 text-xs uppercase tracking-widest font-bold hover:bg-[#141414]/5 transition-colors select-none cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Video Call backdrop overlay controller */}
      <VideoCallManager
        initialCallTarget={activeCallTarget}
        onClose={() => setActiveCallTarget(null)}
      />
    </div>
  );
}

