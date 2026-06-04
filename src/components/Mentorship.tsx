import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { User, Mentorship } from '../types';
import { Users, CheckCircle, XCircle, Clock, ShieldCheck, MessageSquare, X, Sparkles, Sliders, Check, TrendingUp, Info, Edit, MapPin, Building, Activity, Video } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import VideoCallManager from './VideoCallManager';

const MATCH_TAGS = [
  { id: 'tech', label: 'Tech & Coding' },
  { id: 'trades', label: 'Vocational Trades' },
  { id: 'culinary', label: 'Culinary Arts' },
  { id: 'business', label: 'Business & Sales' },
  { id: 'resume', label: 'Resume & Interview Prep' },
  { id: 'housing', label: 'Housing Navigation' },
  { id: 'legal', label: 'Legal & Parole' },
  { id: 'recovery', label: 'Sobriety & Counseling' }
];

interface MatchResult {
  score: number;
  reasons: string[];
}

function calculateMatch(userProfile: User | null, preferences: string[], mentor: User): MatchResult {
  let score = 0;
  const reasons: string[] = [];

  if (!userProfile) return { score: 0, reasons: [] };

  // 1. Incarceration History (Facility) Match
  const userHistory = (userProfile.history || '').toLowerCase().trim();
  const mentorHistory = (mentor.history || '').toLowerCase().trim();
  
  if (userHistory && mentorHistory && userHistory !== 'hidden' && mentorHistory !== 'hidden') {
    // Look for shared facility keywords
    const facilities = ['quentin', 'rikers', 'sing sing', 'attica', 'folsom', 'chino', 'bastrop', 'alcatraz', 'penitentiary', 'correctional', 'jail', 'prison'];
    let sharedFacility = '';
    for (const f of facilities) {
      if (userHistory.includes(f) && mentorHistory.includes(f)) {
        sharedFacility = f.charAt(0).toUpperCase() + f.slice(1);
        break;
      }
    }
    
    if (sharedFacility) {
      score += 40;
      reasons.push(`Shared facility history: ${sharedFacility}`);
    } else {
      // General check for word overlap
      const userWords = userHistory.split(/\s+/).filter(w => w.length > 3 && !w.includes('(') && !w.includes(')'));
      const mentorWords = mentorHistory.split(/\s+/).filter(w => w.length > 3 && !w.includes('(') && !w.includes(')'));
      const commonWords = userWords.filter(w => mentorWords.includes(w));
      if (commonWords.length > 0) {
        score += 30;
        reasons.push(`Shared background alignment (${commonWords[0].toUpperCase()})`);
      }
    }
  }

  // 2. Location proximity
  const userLoc = (userProfile.location || '').toLowerCase().trim();
  const mentorLoc = (mentor.location || '').toLowerCase().trim();
  
  if (userLoc && mentorLoc && userLoc !== 'hidden' && mentorLoc !== 'hidden') {
    const userLocParts = userLoc.split(',').map(p => p.trim());
    const mentorLocParts = mentorLoc.split(',').map(p => p.trim());
    
    // Check if parts exist in both locations
    const sharedParts = userLocParts.filter(p => p && p.length > 1 && mentorLocParts.includes(p));
    if (sharedParts.length > 0) {
      score += 30;
      reasons.push(`Geographical alignment (${sharedParts[0].toUpperCase()})`);
    }
  }

  // 3. Focus Area Preferences / Bio Keyword Matches
  const userBio = (userProfile.bio || '').toLowerCase();
  const mentorBio = (mentor.bio || '').toLowerCase();

  const keywordsMap: Record<string, string[]> = {
    'tech': ['tech', 'coding', 'software', 'programming', 'developer', 'computer', 'website'],
    'trades': ['trade', 'carpentry', 'plumbing', 'welding', 'electrician', 'construction', 'contractor', 'mechanic'],
    'culinary': ['cooking', 'chef', 'kitchen', 'culinary', 'restaurant', 'food'],
    'business': ['business', 'entrepreneur', 'start', 'company', 'sales', 'marketing', 'finance'],
    'resume': ['resume', 'interview', 'job hunt', 'career', 'hiring', 'employment'],
    'housing': ['housing', 'apartment', 'sober living', 'landlord', 'shelter'],
    'legal': ['legal', 'advocacy', 'lawyer', 'parole', 'court', 'officer'],
    'recovery': ['recovery', 'substance', 'sober', 'addiction', 'counseling', 'mental', 'support']
  };

  // Find matches from preferences selections
  preferences.forEach(pref => {
    const list = keywordsMap[pref] || [pref];
    const hasMentorMatch = list.some(k => mentorBio.includes(k) || (mentor.history || '').toLowerCase().includes(k));
    if (hasMentorMatch) {
      score += 15;
      const capitalized = pref.charAt(0).toUpperCase() + pref.slice(1);
      reasons.push(`Mentor aligns with your interest in ${capitalized}`);
    }
  });

  // Implicit matches (keywords overlapping implicitly outside tags)
  Object.entries(keywordsMap).forEach(([category, terms]) => {
    if (!preferences.includes(category)) {
      const userHas = terms.some(k => userBio.includes(k) || userHistory.includes(k));
      const mentorHas = terms.some(k => mentorBio.includes(k) || mentorHistory.includes(k));
      if (userHas && mentorHas) {
        score += 10;
        const capitalized = category.charAt(0).toUpperCase() + category.slice(1);
        reasons.push(`Mutual focus on ${capitalized}`);
      }
    }
  });

  if (score === 0) {
    score = 45; // Baseline connection for alumni
    reasons.push("Re-entry peer and transitional advice");
  }

  score = Math.min(score, 100);
  return { score, reasons };
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
  
  // Active call target state for initiator call overlay
  const [activeCallTarget, setActiveCallTarget] = useState<{ id: string; username: string } | null>(null);

  // Profile data for matchmaking
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [editBio, setEditBio] = useState('');
  const [editHistory, setEditHistory] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [showTweakDNA, setShowTweakDNA] = useState(false);
  const [preferences, setPreferences] = useState<string[]>([]);
  const [filterMode, setFilterMode] = useState<'relevance' | 'all'>('relevance');
  const [expandedReasons, setExpandedReasons] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchData();
  }, [token]);

  useEffect(() => {
    if (user?.id) {
      const saved = localStorage.getItem(`mentorship_pref_${user.id}`);
      if (saved) {
        try {
          setPreferences(JSON.parse(saved));
        } catch (e) {
          console.error(e);
        }
      }
    }
  }, [user?.id]);

  const togglePreference = (id: string) => {
    const updated = preferences.includes(id) 
      ? preferences.filter(p => p !== id) 
      : [...preferences, id];
    setPreferences(updated);
    if (user?.id) {
      localStorage.setItem(`mentorship_pref_${user.id}`, JSON.stringify(updated));
    }
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
        
        // Auto-detect interests from bio if preference storage is completely empty
        if (user?.id && !localStorage.getItem(`mentorship_pref_${user.id}`)) {
          const bioLower = (profile.bio || '').toLowerCase();
          const autoPrefs: string[] = [];
          if (bioLower.includes('code') || bioLower.includes('software') || bioLower.includes('tech') || bioLower.includes('program')) autoPrefs.push('tech');
          if (bioLower.includes('trade') || bioLower.includes('welding') || bioLower.includes('construct') || bioLower.includes('electrician') || bioLower.includes('carpentry')) autoPrefs.push('trades');
          if (bioLower.includes('cooking') || bioLower.includes('chef') || bioLower.includes('kitchen') || bioLower.includes('food') || bioLower.includes('cook')) autoPrefs.push('culinary');
          if (bioLower.includes('business') || bioLower.includes('entrepreneur') || bioLower.includes('sales')) autoPrefs.push('business');
          if (bioLower.includes('resume') || bioLower.includes('interview') || bioLower.includes('career') || bioLower.includes('job')) autoPrefs.push('resume');
          if (bioLower.includes('housing') || bioLower.includes('apartment') || bioLower.includes('sober living')) autoPrefs.push('housing');
          if (bioLower.includes('legal') || bioLower.includes('parole') || bioLower.includes('court') || bioLower.includes('law')) autoPrefs.push('legal');
          if (bioLower.includes('sober') || bioLower.includes('recovery') || bioLower.includes('addict') || bioLower.includes('counsel')) autoPrefs.push('recovery');
          
          if (autoPrefs.length > 0) {
            setPreferences(autoPrefs);
            localStorage.setItem(`mentorship_pref_${user.id}`, JSON.stringify(autoPrefs));
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
    try {
      const res = await fetch('/api/mentorships/request', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ 
          mentorId: selectedMentor.id,
          message: requestMessage
        })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      setRequestModalOpen(false);
      setSelectedMentor(null);
      setRequestMessage('');
      fetchData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openRequestModal = (mentor: User) => {
    setSelectedMentor(mentor);
    const match = calculateMatch(userProfile, preferences, mentor);
    let intro = `Hi ${mentor.name},\n\nI am looking for a mentor and noticed we have a compatibility match score of ${match.score}%! Here is where we align:\n`;
    match.reasons.forEach(r => {
      intro += `• ${r}\n`;
    });
    intro += `\nI'm looking forward to learning from your experiences and connecting on my transitional journey. Thanks!`;
    setRequestMessage(intro);
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
    <div className="space-y-12">
      <header className="space-y-4">
        <h2 className="text-6xl font-serif italic tracking-tighter">Mentorship</h2>
        <p className="text-xl opacity-60 max-w-2xl">
          Guide others through their journey or find someone who has walked the path before you.
        </p>
      </header>

      {/* Mentor Toggle */}
      <div className="bg-white border border-[#141414] p-6 flex items-center justify-between">
        <div>
          <h3 className="text-xl font-serif italic mb-1">Offer Mentorship</h3>
          <p className="text-sm opacity-60">Make yourself available to guide new members of The Yard.</p>
        </div>
        <button
          onClick={toggleMentorStatus}
          className={`px-6 py-3 uppercase tracking-widest text-xs font-bold transition-colors ${
            isMentor 
              ? 'bg-[#141414] text-[#E4E3E0]' 
              : 'border border-[#141414] hover:bg-[#141414]/5'
          }`}
        >
          {isMentor ? 'Active Mentor' : 'Become a Mentor'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column: Active & Pending */}
        <div className="space-y-8">
          {/* Pending Requests (Incoming) */}
          {pendingIncoming.length > 0 && (
            <section>
              <h3 className="text-xs uppercase tracking-widest font-bold mb-4 flex items-center gap-2">
                <Clock size={16} /> Pending Requests
              </h3>
              <div className="space-y-4">
                {pendingIncoming.map(m => (
                  <div key={m.id} className="bg-white border border-[#141414] p-4 flex justify-between items-center">
                    <div>
                      <span className="font-bold">{m.mentee_name}</span> wants you as a mentor.
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => updateStatus(m.id, 'active')} className="p-2 hover:bg-green-100 text-green-700 rounded-full">
                        <CheckCircle size={20} />
                      </button>
                      <button onClick={() => updateStatus(m.id, 'declined')} className="p-2 hover:bg-red-100 text-red-700 rounded-full">
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
                <div key={m.id} className="bg-[#141414] text-[#E4E3E0] p-6">
                  <div className="text-[10px] uppercase tracking-widest opacity-60 mb-2">Your Mentor</div>
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
                    <button onClick={() => updateStatus(m.id, 'completed')} className="text-xs uppercase tracking-widest opacity-60 hover:opacity-100 cursor-pointer">
                      Mark Completed
                    </button>
                  </div>
                </div>
              ))}
              {myMentees.map(m => (
                <div key={m.id} className="bg-white border border-[#141414] p-6">
                  <div className="text-[10px] uppercase tracking-widest opacity-60 mb-2">Your Mentee</div>
                  <div className="text-2xl font-serif italic mb-4">{m.mentee_name}</div>
                  <div className="flex justify-between items-center">
                    <div className="flex gap-4">
                      <button className="text-xs uppercase tracking-widest flex items-center gap-2 hover:opacity-80">
                        <MessageSquare size={14} /> Send Kite
                      </button>
                      <button 
                        onClick={() => setActiveCallTarget({ id: m.mentee_id, username: m.mentee_name })} 
                        className="text-xs uppercase tracking-widest flex items-center gap-2 text-amber-600 hover:text-amber-500 font-bold cursor-pointer"
                      >
                        <Video size={14} /> Video Call
                      </button>
                    </div>
                    <button onClick={() => updateStatus(m.id, 'completed')} className="text-xs uppercase tracking-widest opacity-60 hover:opacity-100 cursor-pointer">
                      Mark Completed
                    </button>
                  </div>
                </div>
              ))}
              {myMentors.length === 0 && myMentees.length === 0 && (
                <div className="p-6 border border-[#141414]/20 text-center opacity-60 text-sm">
                  No active mentorships.
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Right Column: Find a Mentor & Auto-Matcher DNA */}
        <section className="space-y-6">
          <div className="bg-[#141414]/5 border-2 border-[#141414] p-5 space-y-4">
            <div className="flex justify-between items-center flex-wrap gap-2">
              <h3 className="text-sm uppercase tracking-widest font-black flex items-center gap-2 text-[#141414]">
                <Sparkles size={16} className="text-[#141414] animate-pulse" /> Alignment Engine
              </h3>
              <div className="flex gap-1.5 border border-[#141414] p-0.5 bg-white">
                <button
                  type="button"
                  onClick={() => setFilterMode('relevance')}
                  className={`px-2.5 py-1 text-[9px] font-mono uppercase tracking-wider font-bold transition-all cursor-pointer ${
                    filterMode === 'relevance'
                      ? 'bg-[#141414] text-[#E4E3E0]'
                      : 'hover:bg-[#141414]/5 text-[#141414]'
                  }`}
                >
                  Match Score
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
                  Standard List
                </button>
              </div>
            </div>

            <p className="text-xs text-[#141414]/70 leading-relaxed font-medium">
              We automatically calculate your compatibility with potential mentors using location proximity, shared facility histories, and mutual focus vectors.
            </p>

            <div className="space-y-2">
              <span className="block text-[10px] uppercase tracking-wider font-bold text-[#141414]/60 font-mono">
                My Focus Targets (Tag to refine matches):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {MATCH_TAGS.map(tag => {
                  const active = preferences.includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => togglePreference(tag.id)}
                      className={`px-3 py-1 text-xs border rounded-full transition-all cursor-pointer flex items-center gap-1 ${
                        active
                          ? 'bg-[#141414] text-[#E4E3E0] border-[#141414] font-semibold'
                          : 'bg-white text-[#141414]/70 border-[#141414]/20 hover:border-[#141414] hover:bg-[#141414]/5'
                      }`}
                    >
                      {active && <Check size={10} />}
                      {tag.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-2 border-t border-[#141414]/10 flex justify-between items-center">
              <button
                type="button"
                onClick={() => setShowTweakDNA(!showTweakDNA)}
                className="text-[10px] uppercase font-mono tracking-wider font-bold text-[#141414] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Edit size={12} /> {showTweakDNA ? "Close Alignment Setup" : "Calibrate Profile inline"}
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
                  animate={{ opacity: 1, height: "auto" }}
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
                        placeholder="e.g., Seattle, WA"
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
                    {isUpdatingProfile ? "Saving Alignment Profile..." : "Update & Sync Match Score"}
                  </button>
                </motion.form>
              )}
            </AnimatePresence>
          </div>

          <div className="space-y-4">
            <h3 className="text-xs uppercase tracking-widest font-bold flex items-center gap-2">
              <Users size={16} /> Verified Mentor Directory
            </h3>
            
            {(() => {
              const scoredMentors = mentors.map(m => {
                const match = calculateMatch(userProfile, preferences, m);
                return {
                  mentor: m,
                  score: match.score,
                  reasons: match.reasons
                };
              });

              const displayedMentors = filterMode === 'relevance' 
                ? [...scoredMentors].sort((a, b) => b.score - a.score)
                : scoredMentors;

              if (displayedMentors.length === 0) {
                return (
                  <div className="p-6 border border-[#141414]/20 text-center opacity-60 text-sm">
                    No mentors available right now. Check back later.
                  </div>
                );
              }

              return displayedMentors.map(({ mentor, score, reasons }) => {
                const pending = pendingOutgoing.find(m => m.mentor_id === mentor.id);
                const active = myMentors.find(m => m.mentor_id === mentor.id);
                const isHighMatch = score >= 80;
                
                return (
                  <div 
                    key={mentor.id} 
                    className={`bg-white border-2 p-6 transition-all duration-300 relative ${
                      isHighMatch && filterMode === 'relevance'
                        ? 'border-[#141414] shadow-[4px_4px_0px_0px_rgba(20,20,20,1)]'
                        : 'border-[#141414]/40 hover:border-[#141414]'
                    }`}
                  >
                    {isHighMatch && filterMode === 'relevance' && (
                      <div className="absolute top-0 right-6 -translate-y-1/2 bg-[#141414] text-[#E4E3E0] border border-[#141414] px-2.5 py-0.5 text-[9px] uppercase tracking-wider font-mono font-bold flex items-center gap-1 rounded-sm shadow-sm select-none">
                        <Sparkles size={10} className="text-amber-400" /> RECOMMENDED MATCH
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
                      <div className="flex flex-col items-end gap-0.5 text-right shrink-0">
                        <div className={`text-[10px] px-2 py-0.5 uppercase tracking-widest font-mono font-bold border rounded-sm ${
                          score >= 80 
                            ? 'bg-emerald-500/10 text-emerald-800 border-emerald-500/20' 
                            : score >= 60
                            ? 'bg-amber-500/10 text-amber-800 border-amber-500/20'
                            : 'bg-zinc-500/10 text-zinc-800 border-zinc-500/20'
                        }`}>
                          {score}% Match
                        </div>
                        <span className="text-[8px] font-mono tracking-wider text-[#141414]/50 uppercase font-black">
                          {score >= 80 ? 'Optimal match' : score >= 60 ? 'Strong fit' : 'Community fit'}
                        </span>
                      </div>
                    </div>

                    <p className="text-sm opacity-80 leading-relaxed mb-4">{mentor.bio}</p>

                    <div className="pt-3 border-t border-[#141414]/5">
                      <div className="flex justify-between items-center flex-wrap gap-2">
                        <button 
                          type="button"
                          onClick={() => toggleReasons(mentor.id)}
                          className="text-[10px] uppercase font-mono tracking-wider font-bold text-[#141414]/60 hover:text-[#141414] flex items-center gap-1.5 cursor-pointer"
                        >
                          {expandedReasons[mentor.id] ? "Hide Match Details" : `Show Match Details (${reasons.length})`}
                          <Sparkles size={11} className="text-amber-500" />
                        </button>

                        {active ? (
                          <span className="text-[10px] uppercase tracking-widest bg-[#141414] text-[#E4E3E0] px-3 py-1 font-bold font-mono">Active Connection</span>
                        ) : pending ? (
                          <span className="text-[10px] uppercase tracking-widest border border-[#141414] px-3 py-1 opacity-60 font-mono">Pending Reply</span>
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
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden mt-3"
                          >
                            <div className="bg-[#141414]/5 p-3 rounded-sm space-y-1.5 border border-[#141414]/10">
                              <h5 className="text-[9px] uppercase tracking-wider font-mono text-[#141414]/60 font-black mb-1">
                                COMPATIBILITY DNA BREAKDOWN:
                              </h5>
                              {reasons.map((reason, rIdx) => (
                                <div key={rIdx} className="text-xs flex items-center gap-2 text-[#141414]/85 leading-relaxed font-semibold">
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
              });
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
                    Personal Message
                  </label>
                  <textarea
                    required
                    value={requestMessage}
                    onChange={(e) => setRequestMessage(e.target.value)}
                    placeholder="Introduce yourself and explain why you'd like them to be your mentor..."
                    className="w-full border border-[#141414] p-3 min-h-[120px] focus:outline-none focus:ring-2 focus:ring-[#141414]/10 resize-y"
                  />
                  <p className="text-[10px] uppercase tracking-widest opacity-60 mt-2">
                    This will be sent as a Kite to the mentor.
                  </p>
                </div>

                <div className="flex gap-4 pt-2">
                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 bg-[#141414] text-[#E4E3E0] p-3 text-xs uppercase tracking-widest font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {isSubmitting ? 'Sending...' : 'Send Request'}
                  </button>
                  <button 
                    type="button"
                    onClick={() => setRequestModalOpen(false)}
                    className="flex-1 border border-[#141414] p-3 text-xs uppercase tracking-widest font-bold hover:bg-[#141414]/5 transition-colors"
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
