import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { User, Mentorship, MentorshipMilestone } from '../types';
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
  AlertCircle,
  Plus,
  Target,
  TrendingUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import VideoCallManager from './VideoCallManager';

const DEFAULT_SHARED_MILESTONES: MentorshipMilestone[] = [
  {
    id: 'ms-1',
    title: 'Initial Orientation & 90-Day Re-Entry Roadmap',
    category: 'reentry',
    completed: true,
    completed_by: 'Mentor & Mentee',
    due_week: 1
  },
  {
    id: 'ms-2',
    title: 'Parole Check-In & RMOMS Compliance Schedule Review',
    category: 'legal',
    completed: true,
    completed_by: 'Mentor',
    due_week: 2
  },
  {
    id: 'ms-3',
    title: 'Fair-Chance Resume & Conviction Disclosure Prep',
    category: 'career',
    completed: true,
    completed_by: 'Mentee',
    due_week: 4
  },
  {
    id: 'ms-4',
    title: 'Mock Interview or Vocational Trade Assessment',
    category: 'career',
    completed: false,
    due_week: 6
  },
  {
    id: 'ms-5',
    title: 'Independent Housing, Banking & Credit Checkpoint',
    category: 'reentry',
    completed: false,
    due_week: 8
  },
  {
    id: 'ms-6',
    title: '90-Day Milestone Graduation & Peer Leadership Check',
    category: 'wellness',
    completed: false,
    due_week: 12
  }
];

const MILESTONE_CATEGORIES: Record<
  MentorshipMilestone['category'],
  { label: string; barColor: string; textColor: string }
> = {
  reentry: {
    label: 'Re-Entry Foundation',
    barColor: 'bg-[#984B27]',
    textColor: 'text-[#984B27]'
  },
  career: {
    label: 'Career & Vocational',
    barColor: 'bg-emerald-700',
    textColor: 'text-emerald-800'
  },
  legal: {
    label: 'Parole & Legal',
    barColor: 'bg-amber-600',
    textColor: 'text-amber-800'
  },
  wellness: {
    label: 'Wellness & Leadership',
    barColor: 'bg-[#261F1A]',
    textColor: 'text-[#261F1A]'
  }
};

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

function getPhaseLabel(percent: number): string {
  if (percent >= 100) return 'All Milestones Complete · Ready to Graduate';
  if (percent >= 75) return 'Phase 3 · Independent Stability & Leadership';
  if (percent >= 40) return 'Phase 2 · Career Readiness & Compliance';
  return 'Phase 1 · Initial Orientation & Foundation';
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
  const [activateImmediately, setActivateImmediately] = useState(true);
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

  // Shared Milestone UI States
  const [expandedMilestones, setExpandedMilestones] = useState<Record<string, boolean>>({});
  const [newMilestoneTitle, setNewMilestoneTitle] = useState<Record<string, string>>({});
  const [newMilestoneCategory, setNewMilestoneCategory] = useState<
    Record<string, MentorshipMilestone['category']>
  >({});

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

  const getMentorshipMilestones = (m: Mentorship): MentorshipMilestone[] => {
    if (Array.isArray(m.milestones) && m.milestones.length > 0) {
      return m.milestones;
    }
    const localSaved = localStorage.getItem(`mentorship_milestones_${m.id}`);
    if (localSaved) {
      try {
        return JSON.parse(localSaved);
      } catch (e) {
        console.error(e);
      }
    }
    return DEFAULT_SHARED_MILESTONES;
  };

  const handleToggleMilestone = async (mentorship: Mentorship, milestoneId: string) => {
    const currentList = getMentorshipMilestones(mentorship);
    const roleLabel = mentorship.mentor_id === user?.id ? 'Mentor' : 'Mentee';
    let toggledTitle = '';

    const updatedList = currentList.map(ms => {
      if (ms.id === milestoneId) {
        const nextCompleted = !ms.completed;
        toggledTitle = ms.title;
        return {
          ...ms,
          completed: nextCompleted,
          completed_by: nextCompleted ? roleLabel : undefined,
          completed_at: nextCompleted ? new Date().toISOString() : null
        };
      }
      return ms;
    });

    // Optimistic state update
    setMentorships(prev =>
      prev.map(item => (item.id === mentorship.id ? { ...item, milestones: updatedList } : item))
    );
    localStorage.setItem(`mentorship_milestones_${mentorship.id}`, JSON.stringify(updatedList));

    try {
      await fetch(`/api/mentorships/${mentorship.id}/milestones`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          milestones: updatedList,
          toggledMilestoneTitle: toggledTitle
        })
      });
    } catch (err) {
      console.error('Failed to sync milestone update:', err);
    }
  };

  const handleAddCustomMilestone = async (e: React.FormEvent, mentorship: Mentorship) => {
    e.preventDefault();
    const title = (newMilestoneTitle[mentorship.id] || '').trim();
    if (!title) return;

    const category = newMilestoneCategory[mentorship.id] || 'career';
    const currentList = getMentorshipMilestones(mentorship);
    const newItem: MentorshipMilestone = {
      id: `ms-${Date.now()}`,
      title,
      category,
      completed: false,
      due_week: Math.min(12, currentList.length * 2 + 1)
    };

    const updatedList = [...currentList, newItem];
    setMentorships(prev =>
      prev.map(item => (item.id === mentorship.id ? { ...item, milestones: updatedList } : item))
    );
    localStorage.setItem(`mentorship_milestones_${mentorship.id}`, JSON.stringify(updatedList));
    setNewMilestoneTitle(prev => ({ ...prev, [mentorship.id]: '' }));

    try {
      await fetch(`/api/mentorships/${mentorship.id}/milestones`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          milestones: updatedList,
          toggledMilestoneTitle: `Added milestone: ${title}`
        })
      });
      setStatusBanner({
        type: 'success',
        text: `Added shared milestone "${title}" to your mentorship roadmap.`
      });
    } catch (err) {
      console.error('Failed to add custom milestone:', err);
    }
  };

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
      .then((list: Mentorship[]) => {
        if (Array.isArray(list)) {
          setMentorships(list);
          // Expand the first active mentorship's milestones by default
          const firstActive = list.find(item => item.status === 'active');
          if (firstActive) {
            setExpandedMilestones(prev => ({
              ...prev,
              [firstActive.id]: prev[firstActive.id] ?? true
            }));
          }
        }
      });
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
          isAnonymous: isAnonymous,
          activateImmediately: activateImmediately
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
        text: activateImmediately
          ? `Shared Mentorship Roadmap started with ${selectedMentor.name}!`
          : `Mentorship Kite sent to ${selectedMentor.name}!`
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
    intro += `\nPreferred Mentorship Style: ${checkinLabel}.\nLooking forward to tracking our shared milestones and learning from your path!`;

    setRequestMessage(intro);
    setIsAnonymous(false);
    setActivateImmediately(true);
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
  const activeConnections = [...myMentors, ...myMentees];
  const pendingIncoming = mentorships.filter(m => m.mentor_id === user?.id && m.status === 'pending');
  const pendingOutgoing = mentorships.filter(m => m.mentee_id === user?.id && m.status === 'pending');

  // Aggregate milestone statistics across all active mentorship connections
  const allActiveMilestones = activeConnections.flatMap(m => getMentorshipMilestones(m));
  const totalMilestonesCount = allActiveMilestones.length;
  const completedMilestonesCount = allActiveMilestones.filter(ms => ms.completed).length;
  const overallProgressPercent =
    totalMilestonesCount > 0 ? Math.round((completedMilestonesCount / totalMilestonesCount) * 100) : 0;

  const renderSharedMilestoneTracker = (m: Mentorship, isDarkSurface = false) => {
    const milestones = getMentorshipMilestones(m);
    const total = milestones.length;
    const completed = milestones.filter(ms => ms.completed).length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    const isExpanded = expandedMilestones[m.id] ?? true;
    const partnerRole = m.mentor_id === user?.id ? 'Mentee' : 'Mentor';
    const partnerName = m.mentor_id === user?.id ? m.mentee_name : m.mentor_name;

    return (
      <div
        className={`mt-5 pt-5 border-t ${
          isDarkSurface ? 'border-white/15' : 'border-[#D8CFC2]'
        } space-y-4`}
      >
        {/* Top Progress Bar Summary */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Target
                size={14}
                className={isDarkSurface ? 'text-[#C69249]' : 'text-[#984B27]'}
              />
              <span className="text-[11px] uppercase tracking-[0.16em] font-semibold">
                Shared Milestones with {partnerName}
              </span>
            </div>
            <span className="text-xs font-mono font-bold tabular-nums">
              {completed}/{total} ({percent}%)
            </span>
          </div>

          {/* Primary Visual Progress Bar with Milestone Node Markers */}
          <div className="relative pt-1">
            <div
              className={`w-full h-3 rounded-full overflow-hidden ${
                isDarkSurface ? 'bg-white/15' : 'bg-[#E5DDD0]'
              }`}
              role="progressbar"
              aria-valuenow={percent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Shared mentorship milestone progress with ${partnerName}`}
            >
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${percent}%` }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                className={`h-full rounded-full ${
                  percent === 100
                    ? 'bg-emerald-600'
                    : isDarkSurface
                    ? 'bg-[#C69249]'
                    : 'bg-[#984B27]'
                }`}
              />
            </div>

            {/* 25% / 50% / 75% / 100% Scale Ticks */}
            <div className="flex justify-between text-[9px] font-mono opacity-60 mt-1 tabular-nums">
              <span>0%</span>
              <span>25%</span>
              <span>50%</span>
              <span>75%</span>
              <span>100%</span>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 pt-0.5">
            <span className="text-[11px] opacity-75 font-medium">
              {getPhaseLabel(percent)}
            </span>
            <button
              type="button"
              onClick={() =>
                setExpandedMilestones(prev => ({
                  ...prev,
                  [m.id]: !isExpanded
                }))
              }
              className="text-[10px] font-mono uppercase tracking-wider underline hover:opacity-100 opacity-80 cursor-pointer"
            >
              {isExpanded ? 'Hide Milestones' : `Manage Milestones (${total})`}
            </button>
          </div>
        </div>

        {/* Expandable Interactive Milestone Checklist & Pillar Progress Bars */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-4 overflow-hidden"
            >
              {/* Category Mini Progress Bars */}
              <div
                className={`grid grid-cols-2 gap-2.5 p-3 rounded-xl border ${
                  isDarkSurface
                    ? 'bg-white/5 border-white/10'
                    : 'bg-[#EFE7DC]/70 border-[#D8CFC2]'
                }`}
              >
                {(Object.keys(MILESTONE_CATEGORIES) as MentorshipMilestone['category'][]).map(
                  catKey => {
                    const catItems = milestones.filter(ms => ms.category === catKey);
                    const catDone = catItems.filter(ms => ms.completed).length;
                    const catTotal = catItems.length;
                    const catPct = catTotal > 0 ? Math.round((catDone / catTotal) * 100) : 0;
                    const meta = MILESTONE_CATEGORIES[catKey];

                    return (
                      <div key={catKey} className="space-y-1">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="font-medium truncate">{meta.label}</span>
                          <span className="font-mono font-bold tabular-nums opacity-75">
                            {catDone}/{catTotal}
                          </span>
                        </div>
                        <div
                          className={`w-full h-1.5 rounded-full overflow-hidden ${
                            isDarkSurface ? 'bg-white/15' : 'bg-[#DCD2C4]'
                          }`}
                        >
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              isDarkSurface ? 'bg-[#C69249]' : meta.barColor
                            }`}
                            style={{ width: `${catPct}%` }}
                          />
                        </div>
                      </div>
                    );
                  }
                )}
              </div>

              {/* Shared Milestone Items */}
              <div className="space-y-2">
                {milestones.map(ms => {
                  const catMeta = MILESTONE_CATEGORIES[ms.category] || MILESTONE_CATEGORIES.reentry;
                  return (
                    <button
                      key={ms.id}
                      type="button"
                      onClick={() => handleToggleMilestone(m, ms.id)}
                      className={`w-full text-left p-3 rounded-xl border transition-all flex items-start gap-3 cursor-pointer ${
                        isDarkSurface
                          ? ms.completed
                            ? 'bg-white/10 border-[#C69249]/50 text-[#F7F3EC]'
                            : 'bg-white/5 border-white/10 text-[#F7F3EC]/80 hover:border-white/30'
                          : ms.completed
                          ? 'bg-[#EFE7DC] border-[#984B27]/40 text-[#261F1A]'
                          : 'bg-[#FAF7F2] border-[#D8CFC2] text-[#261F1A] hover:border-[#984B27]'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 mt-0.5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                          ms.completed
                            ? 'bg-[#984B27] border-[#984B27] text-white'
                            : isDarkSurface
                            ? 'border-white/40'
                            : 'border-[#8C7F73]'
                        }`}
                      >
                        {ms.completed && <Check size={12} strokeWidth={3} />}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div
                          className={`text-xs font-semibold leading-snug ${
                            ms.completed ? 'line-through opacity-75' : ''
                          }`}
                        >
                          {ms.title}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-[10px] opacity-65 mt-1 font-mono">
                          <span>{catMeta.label}</span>
                          {ms.due_week && (
                            <>
                              <span>·</span>
                              <span>Target: Week {ms.due_week}</span>
                            </>
                          )}
                          {ms.completed && ms.completed_by && (
                            <>
                              <span>·</span>
                              <span>Checked by {ms.completed_by}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Add Shared Milestone Form */}
              <form
                onSubmit={e => handleAddCustomMilestone(e, m)}
                className="flex flex-col sm:flex-row gap-2 pt-1"
              >
                <input
                  type="text"
                  value={newMilestoneTitle[m.id] || ''}
                  onChange={e =>
                    setNewMilestoneTitle(prev => ({
                      ...prev,
                      [m.id]: e.target.value
                    }))
                  }
                  placeholder={`Add shared milestone with ${partnerRole.toLowerCase()}...`}
                  className={`flex-1 text-xs rounded-xl px-3 py-2 border focus:outline-none ${
                    isDarkSurface
                      ? 'bg-white/10 border-white/20 text-[#F7F3EC] placeholder:text-white/45'
                      : 'bg-[#FAF7F2] border-[#D5CBC0] text-[#261F1A]'
                  }`}
                />
                <div className="flex gap-2">
                  <select
                    value={newMilestoneCategory[m.id] || 'career'}
                    onChange={e =>
                      setNewMilestoneCategory(prev => ({
                        ...prev,
                        [m.id]: e.target.value as MentorshipMilestone['category']
                      }))
                    }
                    className={`text-xs rounded-xl px-2.5 py-2 border focus:outline-none ${
                      isDarkSurface
                        ? 'bg-[#261F1A] border-white/20 text-[#F7F3EC]'
                        : 'bg-[#FAF7F2] border-[#D5CBC0] text-[#261F1A]'
                    }`}
                  >
                    <option value="reentry">Re-Entry</option>
                    <option value="career">Career</option>
                    <option value="legal">Legal</option>
                    <option value="wellness">Wellness</option>
                  </select>
                  <button
                    type="submit"
                    className="px-3.5 py-2 rounded-xl bg-[#984B27] text-[#F7F3EC] text-xs font-medium flex items-center gap-1 hover:bg-[#823E1E] transition-colors cursor-pointer shrink-0"
                  >
                    <Plus size={13} /> Add
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-[#984B27] font-semibold">
            <Compass size={13} /> PEER RE-ENTRY GUIDANCE & SHARED MILESTONE TRACKER
          </div>
          <h2 className="text-4xl md:text-5xl font-serif text-[#261F1A] tracking-tight">
            Mentorship & Shared Milestones
          </h2>
          <p className="text-sm md:text-base text-[#70655B] max-w-2xl">
            Find verified alumni mentors through the matching questionnaire and track shared re-entry and career milestones together in real time.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setWizardStep(1);
              setShowQuestionnaireWizard(!showQuestionnaireWizard);
            }}
            className="px-5 py-3 rounded-xl bg-[#984B27] text-[#F7F3EC] text-xs font-semibold flex items-center gap-2 hover:bg-[#843F1F] transition-all cursor-pointer shadow-xs"
          >
            <ClipboardList size={15} />
            {showQuestionnaireWizard
              ? 'Close Matching Questionnaire'
              : questionnaire.completed
              ? 'Edit Matching Questionnaire'
              : 'Take Matching Questionnaire'}
          </button>

          <button
            type="button"
            onClick={toggleMentorStatus}
            className={`px-5 py-3 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
              isMentor
                ? 'bg-[#261F1A] text-[#F6F2EB] border-[#261F1A]'
                : 'bg-[#F6F2EB] hover:bg-[#261F1A]/5 text-[#261F1A] border-[#D5CBC0]'
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
            className={`p-4 rounded-2xl border flex items-center justify-between gap-4 ${
              statusBanner.type === 'success'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                : 'bg-red-50 border-red-300 text-red-950'
            }`}
          >
            <div className="flex items-center gap-2.5 text-xs font-medium">
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

      {/* Aggregate Shared Mentorship Milestone Progress Dashboard Bar */}
      <section className="bg-[#F6F2EB] border border-[#DDD4C7] rounded-2xl p-6 md:p-7 space-y-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.18em] text-[#984B27] font-semibold mb-1">
              <TrendingUp size={13} /> SHARED MENTORSHIP ROADMAP PROGRESS
            </div>
            <h3 className="text-2xl font-serif text-[#261F1A]">
              Mentor & Mentee Milestone Completion
            </h3>
            <p className="text-xs text-[#74695E] mt-0.5">
              Both mentors and mentees can check off shared milestones below as you progress through your 90-day re-entry and career plan.
            </p>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            <div className="text-right">
              <div className="text-2xl font-serif font-bold text-[#261F1A] tabular-nums">
                {overallProgressPercent}% Complete
              </div>
              <div className="text-xs text-[#74695E] font-mono tabular-nums">
                {completedMilestonesCount} of {totalMilestonesCount} Shared Milestones Done
              </div>
            </div>
          </div>
        </div>

        {/* Overall Master Visual Progress Bar */}
        <div className="space-y-1.5">
          <div
            className="w-full h-3.5 rounded-full bg-[#E5DDD0] overflow-hidden"
            role="progressbar"
            aria-valuenow={overallProgressPercent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Overall mentorship milestone completion"
          >
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${overallProgressPercent}%` }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className="h-full rounded-full bg-[#984B27]"
            />
          </div>
          <div className="flex justify-between text-[10px] font-mono text-[#7D7166] tabular-nums">
            <span>Week 1 · Orientation</span>
            <span>Week 4 · Career & Parole Prep</span>
            <span>Week 8 · Housing & Credit</span>
            <span>Week 12 · Graduation</span>
          </div>
        </div>

        {/* 4-Pillar Progress Breakdown */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
          {(Object.keys(MILESTONE_CATEGORIES) as MentorshipMilestone['category'][]).map(catKey => {
            const catItems = allActiveMilestones.filter(ms => ms.category === catKey);
            const catDone = catItems.filter(ms => ms.completed).length;
            const catTotal = catItems.length;
            const catPct = catTotal > 0 ? Math.round((catDone / catTotal) * 100) : 0;
            const meta = MILESTONE_CATEGORIES[catKey];

            return (
              <div
                key={catKey}
                className="p-4 rounded-xl bg-[#EFE7DC]/70 border border-[#D8CFC2] space-y-2"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#261F1A]">{meta.label}</span>
                  <span className="font-mono font-bold text-[#984B27] tabular-nums">
                    {catPct}%
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-[#DCD2C4] overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${meta.barColor}`}
                    style={{ width: `${catPct}%` }}
                  />
                </div>
                <div className="text-[11px] text-[#74695E] font-mono tabular-nums">
                  {catDone} of {catTotal} milestones completed
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Interactive Multi-Step Mentorship Matching Questionnaire */}
      <AnimatePresence>
        {showQuestionnaireWizard && (
          <motion.section
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="bg-[#F6F2EB] border border-[#DDD4C7] rounded-2xl shadow-md overflow-hidden"
          >
            <div className="bg-[#261F1A] text-[#F7F3EC] p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-[#C69249] text-[10px] font-mono uppercase tracking-widest font-bold mb-1">
                  <Sparkles size={12} /> Personalized Mentor Discovery Wizard
                </div>
                <h3 className="text-2xl font-serif">Mentorship Matching Questionnaire</h3>
                <p className="text-xs text-[#B8AFA4] mt-1">
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
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-mono uppercase tracking-wider font-bold border transition-all cursor-pointer ${
                      wizardStep === item.step
                        ? 'bg-[#984B27] text-[#F7F3EC] border-[#984B27]'
                        : 'bg-white/10 text-[#F7F3EC]/80 border-white/20 hover:bg-white/20'
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
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#D8CFC2] pb-4">
                    <div>
                      <h4 className="text-lg font-serif font-bold flex items-center gap-2">
                        <HeartHandshake size={20} className="text-[#984B27]" /> Step 1: Shared Lived Experiences
                      </h4>
                      <p className="text-xs text-[#74695E] mt-0.5">
                        Select the correctional backgrounds and re-entry chapters you want your mentor to understand firsthand.
                      </p>
                    </div>
                    <span className="text-[11px] font-mono font-bold bg-[#EFE7DC] px-3 py-1 rounded-lg border border-[#D8CFC2]">
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
                          className={`text-left p-4 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                            selected
                              ? 'bg-[#261F1A] text-[#F7F3EC] border-[#261F1A]'
                              : 'bg-[#FAF7F2] text-[#261F1A] border-[#D8CFC2] hover:border-[#261F1A]'
                          }`}
                        >
                          <div
                            className={`w-5 h-5 mt-0.5 rounded-md border flex items-center justify-center shrink-0 ${
                              selected ? 'bg-[#984B27] border-[#984B27] text-white' : 'border-[#8C7F73]'
                            }`}
                          >
                            {selected && <Check size={13} strokeWidth={3} />}
                          </div>
                          <div>
                            <div className="text-xs font-semibold">{opt.label}</div>
                            <div className={`text-xs mt-1 leading-relaxed ${selected ? 'text-[#F7F3EC]/75' : 'text-[#74695E]'}`}>
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
                            className={`p-2.5 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
                              questionnaire.timeServedBracket === b.id
                                ? 'bg-[#261F1A] text-[#F7F3EC] border-[#261F1A]'
                                : 'bg-[#FAF7F2] border-[#D8CFC2] hover:border-[#261F1A]'
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
                        className="w-full p-2.5 rounded-xl text-xs font-medium border border-[#D8CFC2] bg-[#FAF7F2] outline-none"
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
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#D8CFC2] pb-4">
                    <div>
                      <h4 className="text-lg font-serif font-bold flex items-center gap-2">
                        <Briefcase size={20} className="text-emerald-700" /> Step 2: Professional & Career Goals
                      </h4>
                      <p className="text-xs text-[#74695E] mt-0.5">
                        Choose the industries, trades, or professional milestones where you want hands-on mentorship.
                      </p>
                    </div>
                    <span className="text-[11px] font-mono font-bold bg-[#EFE7DC] px-3 py-1 rounded-lg border border-[#D8CFC2]">
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
                          className={`text-left p-4 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                            selected
                              ? 'bg-[#261F1A] text-[#F7F3EC] border-[#261F1A]'
                              : 'bg-[#FAF7F2] text-[#261F1A] border-[#D8CFC2] hover:border-[#261F1A]'
                          }`}
                        >
                          <div
                            className={`w-5 h-5 mt-0.5 rounded-md border flex items-center justify-center shrink-0 ${
                              selected ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-[#8C7F73]'
                            }`}
                          >
                            {selected && <Check size={13} strokeWidth={3} />}
                          </div>
                          <div>
                            <div className="text-xs font-semibold">{opt.label}</div>
                            <div className={`text-xs mt-1 leading-relaxed ${selected ? 'text-[#F7F3EC]/75' : 'text-[#74695E]'}`}>
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
                  <div className="border-b border-[#D8CFC2] pb-4">
                    <h4 className="text-lg font-serif font-bold flex items-center gap-2">
                      <Award size={20} className="text-[#984B27]" /> Step 3: Mentorship Format & Personal Goal Statement
                    </h4>
                    <p className="text-xs text-[#74695E] mt-0.5">
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
                          className={`p-3.5 text-left rounded-xl border text-xs font-semibold transition-all cursor-pointer flex items-center justify-between ${
                            questionnaire.checkinStyle === style.id
                              ? 'bg-[#261F1A] text-[#F7F3EC] border-[#261F1A]'
                              : 'bg-[#FAF7F2] text-[#261F1A] border-[#D8CFC2] hover:border-[#261F1A]'
                          }`}
                        >
                          <span>{style.label}</span>
                          {questionnaire.checkinStyle === style.id && <Check size={14} className="text-[#C69249]" />}
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
                      className="w-full rounded-xl border border-[#D8CFC2] p-3 text-sm font-medium focus:outline-none bg-[#FAF7F2]"
                    />
                  </div>
                </div>
              )}

              {/* Wizard Footer Controls */}
              <div className="pt-4 border-t border-[#D8CFC2] flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  {wizardStep > 1 && (
                    <button
                      type="button"
                      onClick={() => setWizardStep((wizardStep - 1) as 1 | 2 | 3)}
                      className="px-4 py-2.5 rounded-xl border border-[#D8CFC2] text-xs font-medium flex items-center gap-1 hover:border-[#261F1A] cursor-pointer"
                    >
                      <ChevronLeft size={14} /> Previous
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleResetQuestionnaire}
                    className="px-3 py-2.5 text-xs opacity-60 hover:opacity-100 flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw size={13} /> Reset
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  {wizardStep < 3 ? (
                    <button
                      type="button"
                      onClick={() => setWizardStep((wizardStep + 1) as 1 | 2 | 3)}
                      className="px-6 py-2.5 rounded-xl bg-[#261F1A] text-[#F7F3EC] text-xs font-semibold flex items-center gap-1.5 hover:bg-[#3A3028] cursor-pointer"
                    >
                      Next Step <ChevronRight size={14} />
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={isSavingQuestionnaire}
                      className="px-6 py-3 rounded-xl bg-[#984B27] text-[#F7F3EC] text-xs font-semibold hover:bg-[#843F1F] transition-all cursor-pointer disabled:opacity-50"
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
        {/* Left Column: Active Mentorships & Shared Milestone Checklists (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Questionnaire Summary Card */}
          <div className="bg-[#F6F2EB] border border-[#DDD4C7] rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs uppercase tracking-[0.16em] font-semibold text-[#7D7166] flex items-center gap-2">
                <ClipboardList size={14} className="text-[#984B27]" /> Your Matching Profile
              </h3>
              <button
                type="button"
                onClick={() => setShowQuestionnaireWizard(true)}
                className="text-xs font-semibold text-[#984B27] hover:underline cursor-pointer"
              >
                {questionnaire.completed ? 'Update Answers' : 'Complete Questionnaire'}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl bg-[#EFE7DC]/70 border border-[#D8CFC2]">
                <div className="text-[10px] uppercase tracking-wider text-[#7D7166] font-semibold">
                  Shared Experiences
                </div>
                <div className="text-lg font-serif font-bold text-[#261F1A] mt-0.5 tabular-nums">
                  {questionnaire.sharedExperiences.length} Active Filters
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-[#EFE7DC]/70 border border-[#D8CFC2]">
                <div className="text-[10px] uppercase tracking-wider text-[#7D7166] font-semibold">
                  Professional Goals
                </div>
                <div className="text-lg font-serif font-bold text-[#261F1A] mt-0.5 tabular-nums">
                  {questionnaire.professionalGoals.length} Career Tracks
                </div>
              </div>
            </div>
          </div>

          {/* Pending Requests (Incoming) */}
          {pendingIncoming.length > 0 && (
            <section className="space-y-3">
              <h3 className="text-xs uppercase tracking-[0.16em] font-semibold text-[#7D7166] flex items-center gap-2">
                <Clock size={15} /> Pending Requests
              </h3>
              <div className="space-y-3">
                {pendingIncoming.map(m => (
                  <div
                    key={m.id}
                    className="bg-[#F6F2EB] border border-[#DDD4C7] rounded-2xl p-4 flex justify-between items-center"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                      <div className="text-sm">
                        <span className="font-bold">{m.mentee_name}</span> requested you as a mentor.
                      </div>
                      {m.is_anonymous === 1 && (
                        <span className="text-[10px] font-mono text-[#984B27]">
                          · Anonymous Query
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => updateStatus(m.id, 'active')}
                        className="p-2 hover:bg-emerald-100 text-emerald-700 rounded-full border border-emerald-200 cursor-pointer"
                      >
                        <CheckCircle size={18} />
                      </button>
                      <button
                        type="button"
                        onClick={() => updateStatus(m.id, 'declined')}
                        className="p-2 hover:bg-red-100 text-red-700 rounded-full border border-red-200 cursor-pointer"
                      >
                        <XCircle size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Active Mentorships with Shared Milestone Progress Bars */}
          <section className="space-y-4">
            <h3 className="text-xs uppercase tracking-[0.16em] font-semibold text-[#7D7166] flex items-center gap-2">
              <ShieldCheck size={15} className="text-[#984B27]" /> Active Connections & Shared Milestones
            </h3>
            <div className="space-y-5">
              {myMentors.map(m => (
                <div
                  key={m.id}
                  className="bg-[#261F1A] text-[#F7F3EC] rounded-2xl p-6 relative shadow-sm"
                >
                  <div className="flex justify-between items-start mb-1">
                    <div className="text-[10px] uppercase tracking-[0.18em] text-[#C69249]">
                      Your Mentor
                    </div>
                    {m.is_anonymous === 1 && (
                      <span className="text-[10px] font-mono text-[#C69249]">
                        Connected Anonymously
                      </span>
                    )}
                  </div>
                  <div className="text-2xl font-serif mb-4">{m.mentor_name}</div>
                  <div className="flex justify-between items-center flex-wrap gap-2">
                    <div className="flex gap-4">
                      <button
                        type="button"
                        onClick={() =>
                          window.dispatchEvent(new CustomEvent('changeTab', { detail: 'kites' }))
                        }
                        className="text-xs flex items-center gap-1.5 hover:opacity-80 cursor-pointer"
                      >
                        <MessageSquare size={14} /> Send Kite
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveCallTarget({ id: m.mentor_id, username: m.mentor_name })}
                        className="text-xs flex items-center gap-1.5 text-[#C69249] hover:opacity-80 font-semibold cursor-pointer"
                      >
                        <Video size={14} /> Video Call
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => updateStatus(m.id, 'completed')}
                      className="text-xs opacity-65 hover:opacity-100 cursor-pointer"
                    >
                      Mark Completed
                    </button>
                  </div>

                  {/* Shared Milestone Progress Bar & Interactive Checklist */}
                  {renderSharedMilestoneTracker(m, true)}
                </div>
              ))}

              {myMentees.map(m => (
                <div
                  key={m.id}
                  className="bg-[#F6F2EB] border border-[#DDD4C7] rounded-2xl p-6 relative shadow-xs"
                >
                  <div className="flex justify-between items-start mb-1">
                    <div className="text-[10px] uppercase tracking-[0.18em] text-[#984B27] font-semibold">
                      Your Mentee
                    </div>
                    {m.is_anonymous === 1 && (
                      <span className="text-[10px] font-mono text-[#984B27]">
                        Anonymous Connection
                      </span>
                    )}
                  </div>
                  <div className="text-2xl font-serif text-[#261F1A] mb-4">{m.mentee_name}</div>
                  <div className="flex justify-between items-center flex-wrap gap-2">
                    <div className="flex gap-4">
                      <button
                        type="button"
                        onClick={() =>
                          window.dispatchEvent(new CustomEvent('changeTab', { detail: 'kites' }))
                        }
                        className="text-xs flex items-center gap-1.5 hover:opacity-80 cursor-pointer"
                      >
                        <MessageSquare size={14} /> Send Kite
                      </button>
                      {m.is_anonymous === 1 ? (
                        <div className="text-xs text-[#7D7166] flex items-center gap-1">
                          <Video size={14} className="opacity-60" /> Video Call Off (Anonymized)
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setActiveCallTarget({ id: m.mentee_id, username: m.mentee_name })}
                          className="text-xs flex items-center gap-1.5 text-[#984B27] font-semibold cursor-pointer"
                        >
                          <Video size={14} /> Video Call
                        </button>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => updateStatus(m.id, 'completed')}
                      className="text-xs opacity-65 hover:opacity-100 cursor-pointer"
                    >
                      Mark Completed
                    </button>
                  </div>

                  {/* Shared Milestone Progress Bar & Interactive Checklist */}
                  {renderSharedMilestoneTracker(m, false)}
                </div>
              ))}

              {myMentors.length === 0 && myMentees.length === 0 && (
                <div className="p-6 rounded-2xl bg-[#F6F2EB] border border-[#DDD4C7] text-center space-y-3">
                  <p className="text-sm text-[#74695E]">
                    No active mentorships yet. Select a mentor on the right to start a shared 90-day milestone roadmap.
                  </p>
                  {mentors.length > 0 && (
                    <button
                      type="button"
                      onClick={() => openRequestModal(mentors[0])}
                      className="px-4 py-2 rounded-xl bg-[#984B27] text-[#F7F3EC] text-xs font-semibold cursor-pointer"
                    >
                      Start Shared Roadmap with {mentors[0].name}
                    </button>
                  )}
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Right Column: Alignment Engine & Verified Mentor Directory (7 cols) */}
        <section className="lg:col-span-7 space-y-6">
          <div className="bg-[#F6F2EB] border border-[#DDD4C7] rounded-2xl p-6 space-y-5 shadow-xs">
            <div className="flex justify-between items-center flex-wrap gap-3">
              <h3 className="text-sm font-serif font-bold flex items-center gap-2 text-[#261F1A]">
                <Sparkles size={16} className="text-[#984B27]" /> Alignment Engine & Quick Filters
              </h3>
              <div className="flex flex-wrap gap-1 border border-[#D8CFC2] rounded-xl p-1 bg-[#FAF7F2]">
                <button
                  type="button"
                  onClick={() => setFilterMode('relevance')}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    filterMode === 'relevance'
                      ? 'bg-[#261F1A] text-[#F6F2EB]'
                      : 'hover:bg-[#261F1A]/5 text-[#6E6359]'
                  }`}
                >
                  Best Overall
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode('experiences')}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    filterMode === 'experiences'
                      ? 'bg-[#984B27] text-white'
                      : 'hover:bg-[#261F1A]/5 text-[#6E6359]'
                  }`}
                >
                  Shared Experiences
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode('goals')}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    filterMode === 'goals'
                      ? 'bg-emerald-700 text-white'
                      : 'hover:bg-[#261F1A]/5 text-[#6E6359]'
                  }`}
                >
                  Professional Goals
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode('all')}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    filterMode === 'all'
                      ? 'bg-[#261F1A] text-[#F6F2EB]'
                      : 'hover:bg-[#261F1A]/5 text-[#6E6359]'
                  }`}
                >
                  All Mentors
                </button>
              </div>
            </div>

            {/* Quick Toggle Pills for Shared Experiences & Professional Goals */}
            <div className="space-y-4">
              <div>
                <span className="block text-[11px] uppercase tracking-[0.15em] font-semibold text-[#7D7166] mb-2">
                  Shared Experiences Filter (Click to toggle):
                </span>
                <div className="flex flex-wrap gap-2">
                  {SHARED_EXPERIENCE_OPTIONS.map(exp => {
                    const active = questionnaire.sharedExperiences.includes(exp.id);
                    return (
                      <button
                        key={exp.id}
                        type="button"
                        onClick={() => toggleSharedExperience(exp.id)}
                        className={`px-3.5 py-1.5 rounded-full text-xs border transition-all cursor-pointer flex items-center gap-1.5 ${
                          active
                            ? 'bg-[#984B27] text-[#F7F3EC] border-[#984B27] font-medium'
                            : 'bg-transparent text-[#4A4037] border-[#D5CBC0] hover:border-[#984B27]'
                        }`}
                      >
                        {active && <Check size={12} strokeWidth={2.5} />}
                        {exp.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <span className="block text-[11px] uppercase tracking-[0.15em] font-semibold text-[#7D7166] mb-2">
                  Professional Goals Filter (Click to toggle):
                </span>
                <div className="flex flex-wrap gap-2">
                  {PROFESSIONAL_GOAL_OPTIONS.map(goal => {
                    const active = questionnaire.professionalGoals.includes(goal.id);
                    return (
                      <button
                        key={goal.id}
                        type="button"
                        onClick={() => toggleProfessionalGoal(goal.id)}
                        className={`px-3.5 py-1.5 rounded-full text-xs border transition-all cursor-pointer flex items-center gap-1.5 ${
                          active
                            ? 'bg-[#261F1A] text-[#F7F3EC] border-[#261F1A] font-medium'
                            : 'bg-transparent text-[#4A4037] border-[#D5CBC0] hover:border-[#261F1A]'
                        }`}
                      >
                        {active && <Check size={12} strokeWidth={2.5} />}
                        {goal.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-[#E2D9CC] flex justify-between items-center">
              <button
                type="button"
                onClick={() => setShowTweakDNA(!showTweakDNA)}
                className="text-xs font-medium text-[#984B27] hover:underline flex items-center gap-1.5 cursor-pointer"
              >
                <Edit size={13} /> {showTweakDNA ? 'Close Alignment Setup' : 'Calibrate Facility & Location Profile'}
              </button>
              {userProfile && (
                <div className="text-xs text-[#74695E]">
                  Profile Status:{' '}
                  <span className="font-semibold text-emerald-800">
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
                  className="space-y-4 pt-3 border-t border-[#E2D9CC] overflow-hidden"
                >
                  <h4 className="text-xs font-semibold text-[#261F1A] flex items-center gap-1.5">
                    <Activity size={13} /> Alignment Profile Editor
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-[#74695E] mb-1">
                        Incarceration History Facility
                      </label>
                      <input
                        type="text"
                        value={editHistory}
                        onChange={e => setEditHistory(e.target.value)}
                        placeholder="e.g., San Quentin or Rikers Island"
                        className="w-full text-xs border border-[#D5CBC0] rounded-xl p-2.5 bg-[#FAF7F2] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[#74695E] mb-1">
                        Current Metro Location
                      </label>
                      <input
                        type="text"
                        value={editLocation}
                        onChange={e => setEditLocation(e.target.value)}
                        placeholder="e.g., Oakland, CA"
                        className="w-full text-xs border border-[#D5CBC0] rounded-xl p-2.5 bg-[#FAF7F2] outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-[#74695E] mb-1">
                      Professional Bio & Ambition
                    </label>
                    <textarea
                      value={editBio}
                      onChange={e => setEditBio(e.target.value)}
                      placeholder="e.g., Re-entry student focusing on backend engineering and resume support"
                      rows={2}
                      className="w-full text-xs border border-[#D5CBC0] rounded-xl p-2.5 bg-[#FAF7F2] outline-none resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isUpdatingProfile}
                    className="w-full bg-[#261F1A] text-[#F6F2EB] rounded-xl py-2.5 text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {isUpdatingProfile ? 'Saving Alignment Profile...' : 'Update & Sync Match Score'}
                  </button>
                </motion.form>
              )}
            </AnimatePresence>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs uppercase tracking-[0.16em] font-semibold text-[#7D7166] flex items-center gap-2">
                <Users size={15} /> Verified Mentor Directory ({mentors.length})
              </h3>
              <span className="text-xs text-[#74695E]">
                Sorted by:{' '}
                <strong className="text-[#261F1A]">
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
                  <div className="p-6 rounded-2xl bg-[#F6F2EB] border border-[#DDD4C7] text-center text-sm text-[#74695E]">
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

                  return (
                    <div
                      key={mentor.id}
                      className="bg-[#F6F2EB] border border-[#DDD4C7] rounded-2xl p-6 transition-all duration-200 relative shadow-xs"
                    >
                      <div className="flex justify-between items-start mb-3 gap-4">
                        <div>
                          <h4 className="text-xl font-serif font-semibold text-[#261F1A]">{mentor.name}</h4>
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#74695E] mt-1">
                            {mentor.history && (
                              <span className="flex items-center gap-1">
                                <Building size={12} /> {mentor.history}
                              </span>
                            )}
                            {mentor.history && mentor.location && <span>·</span>}
                            {mentor.location && (
                              <span className="flex items-center gap-1">
                                <MapPin size={12} /> {mentor.location}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Compatibility Score & Mini Visual Bars */}
                        <div className="flex flex-col items-end gap-1 text-right shrink-0">
                          <div className="text-sm font-serif font-bold text-[#261F1A] tabular-nums">
                            {score}% Overall Match
                          </div>
                          <div className="flex items-center gap-2 text-[11px] font-mono text-[#74695E] tabular-nums">
                            <span>Exp: {experienceScore}%</span>
                            <span>·</span>
                            <span>Goals: {goalScore}%</span>
                          </div>
                        </div>
                      </div>

                      <p className="text-sm text-[#4A4037] leading-relaxed mb-4">{mentor.bio}</p>

                      {/* Clean Unboxed Metadata Line for Shared Experiences & Goals */}
                      {(sharedExperienceBadges.length > 0 || professionalGoalBadges.length > 0) && (
                        <div className="flex flex-wrap items-center gap-2 text-xs text-[#74695E] mb-4">
                          <span className="font-semibold text-[#984B27]">Aligned on:</span>
                          {[...sharedExperienceBadges, ...professionalGoalBadges].map((item, idx, arr) => (
                            <React.Fragment key={`${item}-${idx}`}>
                              <span className="text-[#261F1A] font-medium">{item}</span>
                              {idx < arr.length - 1 && <span aria-hidden="true">·</span>}
                            </React.Fragment>
                          ))}
                        </div>
                      )}

                      <div className="pt-4 border-t border-[#E2D9CC]">
                        <div className="flex justify-between items-center flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => toggleReasons(mentor.id)}
                            className="text-xs font-medium text-[#74695E] hover:text-[#261F1A] flex items-center gap-1.5 cursor-pointer"
                          >
                            {expandedReasons[mentor.id]
                              ? 'Hide Questionnaire Alignment'
                              : `Why You Match (${reasons.length} reasons)`}
                          </button>

                          {active ? (
                            <span className="text-xs font-semibold text-emerald-800">
                              ✓ Active Connection
                            </span>
                          ) : pending ? (
                            <span className="text-xs text-[#74695E]">
                              Pending Reply
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => openRequestModal(mentor)}
                              className="px-4 py-2 rounded-xl bg-[#261F1A] text-[#F6F2EB] text-xs font-semibold hover:bg-[#3A3028] transition-colors cursor-pointer"
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
                              <div className="bg-[#EFE7DC]/70 p-3.5 rounded-xl space-y-1.5 border border-[#D8CFC2]">
                                <div className="text-[10px] uppercase tracking-wider font-mono text-[#7D7166] font-bold mb-1">
                                  Questionnaire Compatibility Breakdown
                                </div>
                                {reasons.map((reason, rIdx) => (
                                  <div
                                    key={rIdx}
                                    className="text-xs flex items-center gap-2 text-[#261F1A]"
                                  >
                                    <Check size={12} className="text-[#984B27] shrink-0" />
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
              className="bg-[#F6F2EB] w-full max-w-md border border-[#D8CFC2] rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="bg-[#261F1A] text-[#F7F3EC] p-5 flex justify-between items-center">
                <h3 className="font-serif text-xl">Request Mentorship & Shared Roadmap</h3>
                <button
                  type="button"
                  onClick={() => setRequestModalOpen(false)}
                  className="hover:opacity-70 transition-opacity cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={requestMentorship} className="p-6 space-y-5">
                <div>
                  <p className="text-sm text-[#4A4037] mb-4">
                    You are starting a mentorship connection with{' '}
                    <strong className="font-semibold text-[#261F1A]">{selectedMentor.name}</strong>.
                  </p>

                  <label className="block text-xs font-semibold text-[#261F1A] mb-2">
                    Personal Kite (Pre-filled from Questionnaire)
                  </label>
                  <textarea
                    required
                    value={requestMessage}
                    onChange={e => setRequestMessage(e.target.value)}
                    placeholder="Introduce yourself and explain why you'd like them to be your mentor..."
                    className="w-full border border-[#D5CBC0] bg-[#FAF7F2] rounded-xl p-3 min-h-[130px] focus:outline-none text-sm"
                  />

                  {/* Start Shared Milestone Track Immediately Toggle */}
                  <div className="mt-4 p-3.5 bg-[#EFE7DC]/70 border border-[#D8CFC2] rounded-xl space-y-3">
                    <label className="flex items-start gap-2.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={activateImmediately}
                        onChange={e => setActivateImmediately(e.target.checked)}
                        className="mt-0.5 w-4 h-4 rounded accent-[#984B27] cursor-pointer"
                      />
                      <div>
                        <span className="block text-xs font-semibold text-[#261F1A]">
                          Initialize 90-Day Shared Milestone Progress Tracker
                        </span>
                        <span className="block text-[11px] text-[#74695E] mt-0.5">
                          Immediately create your shared 6-step milestone progress bar so both you and {selectedMentor.name} can track goals together.
                        </span>
                      </div>
                    </label>

                    <label className="flex items-start gap-2.5 cursor-pointer select-none pt-2 border-t border-[#D8CFC2]">
                      <input
                        type="checkbox"
                        checked={isAnonymous}
                        onChange={e => setIsAnonymous(e.target.checked)}
                        className="mt-0.5 w-4 h-4 rounded accent-[#261F1A] cursor-pointer"
                      />
                      <div>
                        <span className="block text-xs font-semibold text-[#261F1A]">
                          Connect Anonymously
                        </span>
                        <span className="block text-[11px] text-[#74695E] mt-0.5">
                          Hide your profile name and location. The mentor will see you as "Anonymous Mentee".
                        </span>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 bg-[#984B27] text-[#F7F3EC] py-3 px-4 rounded-xl text-xs font-semibold hover:bg-[#823E1E] transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmitting ? 'Starting...' : 'Send Kite & Start Roadmap'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setRequestModalOpen(false)}
                    className="flex-1 border border-[#D5CBC0] py-3 px-4 rounded-xl text-xs font-semibold hover:bg-[#261F1A]/5 transition-colors cursor-pointer"
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


