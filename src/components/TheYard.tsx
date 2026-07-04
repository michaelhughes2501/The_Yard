import React, { useState, useEffect } from 'react';
import { Search, UserPlus, MapPin, History, UserCheck, Sparkles, Quote, ChevronLeft, ChevronRight, Plus, X, Heart, MessageSquare, Share2, Activity, Briefcase, Home, Award, CheckCircle, TrendingUp, Compass } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../AuthContext';
import { User, Testimonial, Job, Housing } from '../types';
import { calculateRelevanceScore } from '../utils/searchUtils';

export interface ActivityItem {
  id: string;
  type: 'connection' | 'kite' | 'story' | 'comment' | 'system' | 'like';
  title: string;
  description: string;
  timestamp: string;
}

function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch (e) {
    return 'Recently';
  }
}

function AIAvatar({ name, className = "w-12 h-12" }: { name: string; className?: string }) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }

  const palettes = [
    { bg: "#F1EBE4", primary: "#8C6239", secondary: "#D9B48F", dark: "#2C1A10", eyeType: "round" },
    { bg: "#E2ECE9", primary: "#5A8F76", secondary: "#A3D2B8", dark: "#1C352D", eyeType: "square" },
    { bg: "#EBF2FA", primary: "#4A90E2", secondary: "#ADC9E6", dark: "#162E4E", eyeType: "round" },
    { bg: "#FBF2F6", primary: "#D63031", secondary: "#FAB1A0", dark: "#2D3436", eyeType: "star" },
    { bg: "#FAF3E0", primary: "#E58E26", secondary: "#F8C291", dark: "#1E272C", eyeType: "round" },
    { bg: "#F7F5FC", primary: "#6C5CE7", secondary: "#A29BFE", dark: "#2D3436", eyeType: "shades" },
    { bg: "#FFF2F2", primary: "#E84393", secondary: "#FF7675", dark: "#2D3436", eyeType: "round" }
  ];

  const design = palettes[Math.abs(hash) % palettes.length];
  const eyeRadius = Math.abs(hash) % 2 === 0 ? 8 : 6;
  const mouthWidth = 18 + (Math.abs(hash * 3) % 18);

  return (
    <svg className={`${className} rounded border border-[#141414] shadow-sm shrink-0`} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" fill={design.bg} />
      <circle cx="50" cy="50" r="38" className="opacity-15" fill={design.primary} />
      <path d={`M15 95 C 15 70, 85 70, 85 95`} stroke={design.dark} strokeWidth="4" fill={design.secondary} />
      
      {design.eyeType === "round" && (
        <>
          <circle cx="36" cy="46" r={eyeRadius} fill={design.primary} stroke={design.dark} strokeWidth="3" />
          <circle cx="64" cy="46" r={eyeRadius} fill={design.primary} stroke={design.dark} strokeWidth="3" />
          <line x1="45" y1="46" x2="55" y2="46" stroke={design.dark} strokeWidth="3" />
        </>
      )}

      {design.eyeType === "square" && (
        <>
          <rect x="26" y="38" width="16" height="14" fill={design.primary} stroke={design.dark} strokeWidth="3" />
          <rect x="58" y="38" width="16" height="14" fill={design.primary} stroke={design.dark} strokeWidth="3" />
          <line x1="42" y1="45" x2="58" y2="45" stroke={design.dark} strokeWidth="3" />
        </>
      )}

      {design.eyeType === "star" && (
        <>
          <polygon points="36,36 39,44 47,44 40,49 43,57 36,52 29,57 32,49 25,44 33,44" fill={design.primary} stroke={design.dark} strokeWidth="2" />
          <polygon points="64,36 67,44 75,44 68,49 71,57 64,52 57,57 60,49 53,44 61,44" fill={design.primary} stroke={design.dark} strokeWidth="2" />
          <line x1="43" y1="45" x2="57" y2="45" stroke={design.dark} strokeWidth="3" />
        </>
      )}

      {design.eyeType === "shades" && (
        <>
          <path d="M22 36 h56 v12 H62 L58 44 H42 L38 48 H22 Z" fill={design.dark} stroke={design.primary} strokeWidth="2" />
          <line x1="28" y1="40" x2="38" y2="40" stroke={design.bg} strokeWidth="2" opacity="0.8" />
        </>
      )}

      {Math.abs(hash) % 3 === 0 ? (
        <path d="M12 35 C 25 15, 75 15, 88 35 L 94 38 L 6 38 Z" fill={design.dark} stroke={design.dark} strokeWidth="2" />
      ) : Math.abs(hash) % 3 === 1 ? (
        <path d="M25 35 Q 50 10 75 35 Q 50 22 25 35" fill={design.primary} stroke={design.dark} strokeWidth="2" />
      ) : (
        <rect x="25" y="22" width="50" height="10" rx="3" fill={design.primary} stroke={design.dark} strokeWidth="2" />
      )}

      <path d={`M${50 - mouthWidth / 2} 70 Q 50 ${70 + (Math.abs(hash) % 10)} ${50 + mouthWidth / 2} 70`} stroke={design.dark} strokeWidth="4" strokeLinecap="round" />
      
      <polygon points="12,12 14,8 16,12 20,13 16,14 14,18 12,14 8,13" fill={design.primary} opacity="0.8" />
      <polygon points="86,16 88,13 90,16 93,17 90,18 88,21 86,18 83,17" fill={design.dark} opacity="0.6" />
    </svg>
  );
}

export default function TheYard() {
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [connectedIds, setConnectedIds] = useState<string[]>([]);
  const [filterMode, setFilterMode] = useState<'all' | 'connections' | 'meet'>('all');
  const { token, user } = useAuth();

  // Recommended for You additional state
  const [userMilestones, setUserMilestones] = useState<any[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [housing, setHousing] = useState<Housing[]>([]);
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationMessage, setCelebrationMessage] = useState('');

  // Your personal Yard presence states
  const [currentUserProfile, setCurrentUserProfile] = useState<User | null>(null);
  const [isEditingPresence, setIsEditingPresence] = useState(false);
  const [presenceForm, setPresenceForm] = useState({
    public_status: '',
    interests: '',
    looking_to_meet: false
  });

  const fetchUsers = () => {
    fetch('/api/users', {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
      if (Array.isArray(data)) {
        setUsers(data);
      } else {
        console.error('Expected array of users, got:', data);
      }
    })
    .catch(console.error);
  };

  const fetchCurrentUserProfile = () => {
    fetch('/api/users/profile', {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
      setCurrentUserProfile(data);
      setPresenceForm({
        public_status: data.public_status || '',
        interests: data.interests || '',
        looking_to_meet: !!data.looking_to_meet
      });
    })
    .catch(console.error);
  };

  const handleSavePresence = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          ...currentUserProfile,
          public_status: presenceForm.public_status,
          interests: presenceForm.interests,
          looking_to_meet: presenceForm.looking_to_meet
        })
      });
      if (res.ok) {
        setIsEditingPresence(false);
        fetchCurrentUserProfile();
        fetchUsers();
        alert('Your Yard presence has been updated successfully!');
        
        logActivity(
          'system',
          'Yard Status Synchronized',
          presenceForm.public_status 
            ? `Broadcasted physical meet update: "${presenceForm.public_status}"`
            : `Updated your Yard interests to: "${presenceForm.interests}"`
        );
      } else {
        alert('Failed to update your Yard presence.');
      }
    } catch (err) {
      console.error('Error saving Yard presence:', err);
      alert('An error occurred while saving your presence.');
    }
  };

  // User's Recent Activities
  const [activities, setActivities] = useState<ActivityItem[]>([]);

  useEffect(() => {
    const fetchRealActivities = async () => {
      if (!user?.id) return;
      
      try {
        const [casesRes, threadsRes] = await Promise.all([
          fetch('/api/legal-cases', { headers: { Authorization: `Bearer ${token}` } }),
          fetch('/api/threads', { headers: { Authorization: `Bearer ${token}` } })
        ]);
        
        const cases = await casesRes.json();
        const allThreads = await threadsRes.json();
        
        const myThreads = allThreads.filter((t: any) => t.author_id === user.id);
        
        const realActivities: ActivityItem[] = [];
        
        cases.forEach((c: any) => {
          realActivities.push({
            id: `case-${c.id}`,
            type: 'system',
            title: `Case Update: ${c.case_number}`,
            description: `Status: ${c.status || 'Active'}. Court: ${c.court || 'Unknown'}.`,
            timestamp: c.created_at || new Date().toISOString()
          });
        });
        
        myThreads.forEach((t: any) => {
          realActivities.push({
            id: `thread-${t.id}`,
            type: 'story',
            title: `Forum Post: ${t.title}`,
            description: `Posted in ${t.category} category.`,
            timestamp: t.timestamp || new Date().toISOString()
          });
        });

        const storageKey = `recent_activities_${user.id}`;
        const saved = localStorage.getItem(storageKey);
        let localActivities: ActivityItem[] = [];
        if (saved) {
          try {
            localActivities = JSON.parse(saved);
          } catch (e) {}
        }

        const combined = [...realActivities, ...localActivities]
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .slice(0, 15);

        setActivities(combined);
      } catch (err) {
        console.error('Error fetching real activities:', err);
      }
    };

    fetchRealActivities();
  }, [user?.id, token]);

  const logActivity = (type: ActivityItem['type'], title: string, description: string) => {
    if (!user?.id) return;
    const storageKey = `recent_activities_${user.id}`;
    const newActivity: ActivityItem = {
      id: Math.random().toString(36).substring(2, 11),
      type,
      title,
      description,
      timestamp: new Date().toISOString()
    };
    
    setActivities(prev => {
      const updated = [newActivity, ...prev].slice(0, 10); // Keep last 10 activities
      localStorage.setItem(storageKey, JSON.stringify(updated));
      return updated;
    });
  };

  // Testimonials and Success Stories states
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [showStoryModal, setShowStoryModal] = useState(false);
  const [isSubmittingStory, setIsSubmittingStory] = useState(false);
  const [storyForm, setStoryForm] = useState({ author_name: '', role: '', content: '' });
  const [storyIndex, setStoryIndex] = useState(0);

  // Share States & Methods
  const [sharedStoryId, setSharedStoryId] = useState<string | null>(null);
  const [copiedStoryId, setCopiedStoryId] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const storyParam = params.get('story');
    if (storyParam) {
      setSharedStoryId(storyParam);
    }
  }, []);

  useEffect(() => {
    if (sharedStoryId && testimonials.length > 0) {
      const foundIndex = testimonials.findIndex(t => t.id === sharedStoryId);
      if (foundIndex !== -1) {
        setStoryIndex(foundIndex);
        setExpandedComments(prev => ({
          ...prev,
          [sharedStoryId]: true
        }));
      }
    }
  }, [sharedStoryId, testimonials]);

  const handleShareStory = (id: string) => {
    const shareUrl = `${window.location.origin}${window.location.pathname}?story=${id}`;
    navigator.clipboard.writeText(shareUrl)
      .then(() => {
        setCopiedStoryId(id);
        setTimeout(() => {
          setCopiedStoryId(null);
        }, 2500);
      })
      .catch(err => {
        console.error('Failed to copy share link:', err);
      });
  };

  // Comments states
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [newCommentTexts, setNewCommentTexts] = useState<Record<string, string>>({});
  const [isSubmittingComment, setIsSubmittingComment] = useState<Record<string, boolean>>({});

  const toggleComments = (id: string) => {
    setExpandedComments(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleCommentTextChange = (id: string, text: string) => {
    setNewCommentTexts(prev => ({
      ...prev,
      [id]: text
    }));
  };

  const handlePostComment = async (testimonialId: string) => {
    const text = newCommentTexts[testimonialId] || '';
    if (!text.trim()) return;

    setIsSubmittingComment(prev => ({ ...prev, [testimonialId]: true }));
    try {
      const res = await fetch(`/api/testimonials/${testimonialId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ content: text.trim(), author_name: user?.username || '' })
      });
      if (res.ok) {
        const data = await res.json();
        // Update testimonials list with new comments
        setTestimonials(prev => prev.map(t => t.id === testimonialId ? { ...t, comments: data.comments } : t));
        // Clear input
        setNewCommentTexts(prev => ({ ...prev, [testimonialId]: '' }));
        
        // Log recent interaction details
        const targetStory = testimonials.find(t => t.id === testimonialId);
        logActivity(
          'comment',
          'Enriched with Feedback',
          `Posted words of support and transition encouragement to ${targetStory ? targetStory.author_name : 'a peer'}'s milestone.`
        );
      } else {
        const errData = await res.json();
        alert(errData.error || 'Failed to post comment.');
      }
    } catch (err) {
      console.error('Error posting comment:', err);
      alert('An error occurred while posting comment.');
    } finally {
      setIsSubmittingComment(prev => ({ ...prev, [testimonialId]: false }));
    }
  };

  const fetchTestimonials = () => {
    fetch('/api/testimonials')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setTestimonials(data);
        }
      })
      .catch(console.error);
  };

  useEffect(() => {
    if (user) {
      setStoryForm(prev => ({
        ...prev,
        author_name: user.username || ''
      }));
    }
  }, [user]);

  const fetchMilestones = () => {
    if (user?.id) {
      const storageKey = `yard_progress_milestones_${user.id}`;
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        try {
          setUserMilestones(JSON.parse(stored));
        } catch (err) {
          console.error(err);
        }
      } else {
        const defaultRoadmap = [
          { id: '1', title: 'Schedule official parole check-in', category: 'legal', difficulty: 'beginner', isCompleted: true, xpValue: 100 },
          { id: '2', title: 'Assemble legal identification (Gov ID/DL or SSN card)', category: 'legal', difficulty: 'beginner', isCompleted: false, xpValue: 150 },
          { id: '3', title: 'Log first daily mental checklist in Wellness journal', category: 'health', difficulty: 'beginner', isCompleted: false, xpValue: 100 },
          { id: '4', title: 'Formally request and secure a support/transition mentor', category: 'social', difficulty: 'intermediate', isCompleted: false, xpValue: 150 },
          { id: '5', title: 'Prepare a transitional employment resume', category: 'career', difficulty: 'beginner', isCompleted: false, xpValue: 120 },
          { id: '6', title: 'Research and apply to 3 certified housing resources', category: 'housing', difficulty: 'intermediate', isCompleted: false, xpValue: 200 }
        ];
        localStorage.setItem(storageKey, JSON.stringify(defaultRoadmap));
        setUserMilestones(defaultRoadmap);
      }
    }
  };

  const handleCompleteMilestone = (milestoneId: string, titleStr: string) => {
    if (!user?.id) return;
    const storageKey = `yard_progress_milestones_${user.id}`;
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      try {
        const list = JSON.parse(stored);
        const updated = list.map((m: any) => m.id === milestoneId ? { ...m, isCompleted: true } : m);
        localStorage.setItem(storageKey, JSON.stringify(updated));
        setUserMilestones(updated);
        
        // Show celebration alert
        setCelebrationMessage(`🎉 Finished priority step: "${titleStr}"! Scorecard updated successfully.`);
        setShowCelebration(true);
        setTimeout(() => setShowCelebration(false), 3500);

        logActivity(
          'system',
          'Milestone Completed!',
          `Successfully checked off "${titleStr}" via Re-entry Recommendations.`
        );
      } catch (err) {
        console.error(err);
      }
    }
  };

  useEffect(() => {
    // Fetch all users list
    fetchUsers();

    // Fetch current user details
    fetchCurrentUserProfile();

    // Fetch user's connection list
    fetch('/api/connections', {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
      if (Array.isArray(data)) {
        setConnectedIds(data);
      }
    })
    .catch(console.error);

    // Fetch testimonials
    fetchTestimonials();

    // Load static and local storage milestones, jobs, housing
    fetchMilestones();

    fetch('/api/jobs', {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
      if (Array.isArray(data)) setJobs(data);
    })
    .catch(console.error);

    fetch('/api/housing', {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
      if (Array.isArray(data)) setHousing(data);
    })
    .catch(console.error);
  }, [token, user]);

  const handleSubmitStory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storyForm.content.trim()) {
      alert("Please write your success story details.");
      return;
    }
    setIsSubmittingStory(true);
    try {
      const res = await fetch('/api/testimonials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(storyForm)
      });
      if (res.ok) {
        setStoryForm({ author_name: user?.username || '', role: '', content: '' });
        setShowStoryModal(false);
        fetchTestimonials();
        // Reset slider to the newest story
        setStoryIndex(0);
        alert('Thank you for sharing your story of hope! It has been posted to the Home Feed.');
        
        // Log milestone story shared
        logActivity(
          'story',
          'Shared Milestone Story',
          `Published a community success lighthouse story under your alias.`
        );
      } else {
        const errData = await res.json();
        alert(errData.error || 'Failed to submit success story.');
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred during submission.');
    } finally {
      setIsSubmittingStory(false);
    }
  };

  const handleLikeTestimonial = async (id: string) => {
    try {
      const res = await fetch(`/api/testimonials/${id}/like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setTestimonials(prev => prev.map(t => t.id === id ? { ...t, likes_count: data.likes_count } : t));
        
        // Log celebration clicked
        const targetStory = testimonials.find(t => t.id === id);
        logActivity(
          'like',
          'Celebrated Re-entry Milestone',
          `Lending positive peer strength to ${targetStory ? targetStory.author_name : 'a member'}'s journey.`
        );
      } else {
        const errData = await res.json();
        alert(errData.error || 'Failed to celebrate this story.');
      }
    } catch (err) {
      console.error('Error celebrating testimonial:', err);
    }
  };

  const handleSendKite = async (receiverId: string, name: string) => {
    const content = prompt(`Send a kite to ${name}:`);
    if (!content) return;
    
    try {
      await fetch('/api/kites', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ receiverId, content })
      });
      alert('Kite sent successfully! Check your Kites tab to view the conversation.');
      
      // Log encrypted peer messaging
      logActivity(
        'kite',
        'Launched private Kite',
        `Dispatched an encrypted peer-to-peer message to ${name}.`
      );
    } catch (err) {
      alert('Failed to send kite.');
    }
  };

  const handleToggleConnect = async (e: React.MouseEvent, userId: string, isCurrentlyConnected: boolean) => {
    e.stopPropagation(); // Avoid parent click actions
    try {
      const url = isCurrentlyConnected ? `/api/connections/${userId}` : '/api/connections';
      const method = isCurrentlyConnected ? 'DELETE' : 'POST';
      const body = isCurrentlyConnected ? undefined : JSON.stringify({ receiverId: userId });

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body
      });

      if (res.ok) {
        const targetUser = users.find(u => u.id === userId);
        const name = targetUser ? targetUser.name : 'a peer';
        if (isCurrentlyConnected) {
          setConnectedIds(prev => prev.filter(id => id !== userId));
          logActivity(
            'connection',
            'Connection Cleared',
            `Unlinked active directory pairing with ${name}.`
          );
        } else {
          setConnectedIds(prev => [...prev, userId]);
          logActivity(
            'connection',
            'Directory Connection Formed',
            `Linked direct secure connection pairing in The Yard with ${name}.`
          );
        }
      } else {
        const errData = await res.json();
        alert(errData.error || 'Failed to update connection.');
      }
    } catch (err) {
      console.error('Error toggling connection:', err);
      alert('An error occurred while updating the connection.');
    }
  };

  const finalFilteredUsers = users
    .filter(u => {
      if (filterMode === 'connections') return connectedIds.includes(u.id);
      if (filterMode === 'meet') return u.looking_to_meet === true;
      return true;
    })
    .map(u => ({
      ...u,
      relevance: calculateRelevanceScore(u, search, {
        name: 3,
        history: 2, // facility
        location: 2,
        bio: 1,
        public_status: 1,
        interests: 1
      })
    }))
    .filter(u => search.trim() === '' || u.relevance > 0)
    .sort((a, b) => {
      if (search.trim() === '') return 0; // Keep original order if no search
      return b.relevance - a.relevance;
    });

  // Extract user interests
  const userInterests = currentUserProfile?.interests
    ? currentUserProfile.interests.split(',').map(tag => tag.trim().toLowerCase()).filter(Boolean)
    : [];

  // Determine user focus categories (categories where there are uncompleted milestones)
  const uncompletedMilestones = userMilestones.filter(m => !m.isCompleted);
  const focusCategories = Array.from(new Set(uncompletedMilestones.map(m => m.category || 'career')));

  // Recommendations generator
  const getWorkspaceRecommendations = () => {
    const list = [];

    // Recommendation 1: Milestone target
    if (uncompletedMilestones.length > 0) {
      // Pick a beginner or beginner-difficulty milestone first
      const nextMilestone = uncompletedMilestones.find(m => m.difficulty === 'beginner') || uncompletedMilestones[0];
      list.push({
        id: `rec-milestone-${nextMilestone.id}`,
        type: 'milestone',
        title: 'Action Recommended',
        badge: '🎯 Direct Priority',
        boldTitle: nextMilestone.title,
        description: `This beginner transitional task in the ${nextMilestone.category} field matches your re-entry track timeline. Tackle this today!`,
        actionLabel: 'Mark Complete',
        actionData: nextMilestone.id,
        category: nextMilestone.category,
        meta: `Difficulty: ${nextMilestone.difficulty} // +${nextMilestone.xpValue} XP`
      });
    } else {
      list.push({
        id: 'rec-milestone-empty',
        type: 'milestone-empty',
        title: 'Target Acquired',
        badge: '🏆 Track Cleared',
        boldTitle: 'Set custom milestones next',
        description: 'You completed your core re-entry roadmap targets! Formulate new custom microgoals in the Progress Tracker.',
        actionLabel: 'View Progress Cards',
        category: 'social',
        meta: 'Member League Level High'
      });
    }

    // Recommendation 2: Peer match
    const otherUsers = users.filter(u => u.id !== user?.id);
    if (otherUsers.length > 0) {
      const scoredPeers = otherUsers.map(u => {
        let score = 0;
        const reasons = [];

        // Availability status check
        if (u.looking_to_meet) {
          score += 4;
          reasons.push('and looking to meet');
        }

        // Shared location check
        if (currentUserProfile?.location && u.location && 
            (u.location.toLowerCase().includes(currentUserProfile.location.toLowerCase()) || 
             currentUserProfile.location.toLowerCase().includes(u.location.toLowerCase()))) {
          score += 5;
          reasons.push(`resides near ${u.location}`);
        }

        // Shared facility check
        if (currentUserProfile?.history && u.history && 
            u.history.toLowerCase().trim() === currentUserProfile.history.toLowerCase().trim()) {
          score += 8;
          reasons.push(`walked the line at ${u.history}`);
        }

        // Shared interests check
        const peerInterests = u.interests ? u.interests.split(',').map(tag => tag.trim().toLowerCase()) : [];
        const matchingInterests = peerInterests.filter(tag => userInterests.includes(tag));
        if (matchingInterests.length > 0) {
          score += matchingInterests.length * 3;
          reasons.push(`shares interest in #${matchingInterests[0]}`);
        }

        return { userItem: u, score, reasons };
      });

      // Sort by score desc
      const topPeers = scoredPeers.sort((a, b) => b.score - a.score);
      const chosenPeer = topPeers[0];

      if (chosenPeer && chosenPeer.score > 0) {
        const u = chosenPeer.userItem;
        const reasonStr = chosenPeer.reasons.length > 0
          ? `${chosenPeer.reasons.join(', ')}.`
          : 'Part of your community support circle.';

        list.push({
          id: `rec-peer-${u.id}`,
          type: 'peer',
          title: 'Peer Recommendation',
          badge: '🤝 Support Match',
          boldTitle: u.name,
          description: `Recommended connection because he/she ${reasonStr}`,
          actionLabel: 'Send Private Kite',
          actionData: { id: u.id, name: u.name },
          category: 'social',
          meta: u.history ? `Facility: ${u.history}` : `Location: ${u.location || 'Colorado'}`
        });
      } else if (otherUsers.length > 0) {
        // Fallback peer recommendation
        const u = otherUsers[0];
        list.push({
          id: `rec-peer-fallback-${u.id}`,
          type: 'peer',
          title: 'Peer Connection',
          badge: '👥 Member Radar',
          boldTitle: u.name,
          description: 'A fellow community alumnus with active presence in the Yard.',
          actionLabel: 'Send Private Kite',
          actionData: { id: u.id, name: u.name },
          category: 'social',
          meta: u.history ? `Facility: ${u.history}` : 'Active Member'
        });
      }
    }

    // Recommendation 3: Opportunities recommendation (Job / Housing)
    const hasHousingFocus = focusCategories.includes('housing');

    if (hasHousingFocus && housing.length > 0) {
      // Pick a housing recommendation
      const h = housing[0];
      list.push({
        id: `rec-housing-${h.id}`,
        type: 'housing',
        title: 'Housing Resource Alternative',
        badge: '🏠 Approved Shelter',
        boldTitle: h.name,
        description: `This transitional housing option located in ${h.location} could help resolve your remaining housing milestones. Contact ${h.contact_info || 'representative'}!`,
        actionLabel: 'Open Housing Guide',
        category: 'housing',
        meta: `Type: ${h.type.replace('_', ' ').toUpperCase()}`
      });
    } else if (jobs.length > 0) {
      let bestJob = jobs[0];
      let maxMatch = 0;
      for (const j of jobs) {
        let maxJobMatch = 0;
        const combinedText = `${j.title} ${j.description}`.toLowerCase();
        for (const tag of userInterests) {
          if (combinedText.includes(tag)) maxJobMatch++;
        }
        if (j.is_felony_friendly) maxJobMatch += 2;
        if (maxJobMatch > maxMatch) {
          maxMatch = maxJobMatch;
          bestJob = j;
        }
      }

      list.push({
        id: `rec-job-${bestJob.id}`,
        type: 'job',
        title: 'Career Opportunity Path',
        badge: '💼 Felony Friendly Job',
        boldTitle: `${bestJob.title} at ${bestJob.company}`,
        description: `Recommended based on your professional re-entry goals. ${bestJob.description.substring(0, 75)}...`,
        actionLabel: 'Apply on Job Board',
        category: 'career',
        meta: `Location: ${bestJob.location}`
      });
    }

    return list;
  };

  return (
    <div className="space-y-12">
      <header className="space-y-4">
        <h2 className="text-6xl font-serif italic tracking-tighter">The Yard</h2>
        <p className="text-xl opacity-60 max-w-2xl">
          Find the people you walked the line with. Search by facility, name, or location.
        </p>
      </header>

      {/* Dynamic Your Yard Presence Section */}
      <div className="bg-white border-2 border-[#141414] p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#141414]/15 pb-4">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-mono tracking-widest text-[#141414]/60 font-black flex items-center gap-1.5">
              <Activity size={12} className="text-[#141414]" /> Broadcast Your Mind // The Yard Status
            </span>
            <h3 className="text-2xl font-serif italic font-bold">Your Yard Status</h3>
          </div>
          {!isEditingPresence && (
            <button
              onClick={() => setIsEditingPresence(true)}
              className="px-4 py-2 border border-[#141414] hover:bg-[#141414] hover:text-[#E4E3E0] text-xs font-mono uppercase tracking-widest font-bold transition-all cursor-pointer"
            >
              Set My Yard Status
            </button>
          )}
        </div>

        {isEditingPresence ? (
          <form onSubmit={handleSavePresence} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider font-bold font-mono">My Public Status Update</label>
                <input
                  type="text"
                  maxLength={120}
                  value={presenceForm.public_status}
                  onChange={e => setPresenceForm(prev => ({ ...prev, public_status: e.target.value }))}
                  placeholder="What's on your mind? e.g. Open to coffee around Denver or looking for CDL resources!"
                  className="w-full bg-white border border-[#141414] p-3 text-sm focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider font-bold font-mono">My Core Interests (Comma-separated)</label>
                <input
                  type="text"
                  value={presenceForm.interests}
                  onChange={e => setPresenceForm(prev => ({ ...prev, interests: e.target.value }))}
                  placeholder="e.g. landscaping, technology, mentoring, fitness"
                  className="w-full bg-white border border-[#141414] p-3 text-sm focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 py-2">
              <input
                type="checkbox"
                id="presence-meet-check"
                checked={presenceForm.looking_to_meet}
                onChange={e => setPresenceForm(prev => ({ ...prev, looking_to_meet: e.target.checked }))}
                className="w-4 h-4 border border-[#141414]"
              />
              <label htmlFor="presence-meet-check" className="text-xs font-bold font-mono uppercase tracking-wide cursor-pointer select-none">
                🟢 Signal availability: Put me high on the directory as <strong className="text-amber-950">"ACTIVE ON THE YARD"</strong> (Ready to connect and meet peers)
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-[#141414]/10">
              <button
                type="button"
                onClick={() => setIsEditingPresence(false)}
                className="px-4 py-2 border border-[#141414] text-xs font-mono uppercase tracking-widest hover:bg-gray-100 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-[#141414] text-[#E4E3E0] text-xs font-mono uppercase tracking-widest font-bold hover:opacity-90 transition-all cursor-pointer"
              >
                Save My Yard Status
              </button>
            </div>
          </form>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
            <div className="space-y-1 text-left">
              <h4 className="text-[10px] font-mono uppercase tracking-wider text-gray-500 font-bold">Public Status Update</h4>
              <p className="text-sm font-serif italic text-gray-800 leading-relaxed">
                "{currentUserProfile?.public_status || "No update posted yet. Share what you are working on or need help with."}"
              </p>
            </div>

            <div className="space-y-1 text-left">
              <h4 className="text-[10px] font-mono uppercase tracking-wider text-gray-500 font-bold">Your Declared Interests</h4>
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {currentUserProfile?.interests ? (
                  currentUserProfile.interests.split(',').map((tag, i) => (
                    <span key={i} className="text-[10px] bg-gray-100 border border-current/10 px-2 py-0.5 font-mono uppercase font-black text-gray-600">
                      #{tag.trim()}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-gray-400 italic">No interests declared yet.</span>
                )}
              </div>
            </div>

            <div className="space-y-1 text-left">
              <h4 className="text-[10px] font-mono uppercase tracking-wider text-gray-500 font-bold">Availability Status</h4>
              <div className="pt-0.5">
                {currentUserProfile?.looking_to_meet ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-300 font-mono text-[10px] font-black uppercase tracking-widest">
                    <span>🟢</span> Active on the Yard
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 font-mono text-[10px] font-black uppercase tracking-widest">
                    <span>⚪</span> Off the Yard (Recess)
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Dynamic Celebration Toast for Completed Milestones */}
      <AnimatePresence>
        {showCelebration && (
          <motion.div
            initial={{ opacity: 0, y: -25, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -25, scale: 0.95 }}
            className="bg-emerald-50 border-2 border-emerald-500 p-4 shadow-xl text-emerald-950 flex justify-between items-center gap-4 rounded-sm fixed top-24 left-1/2 -translate-x-1/2 z-[100] max-w-md w-full font-sans"
          >
            <div className="flex items-center gap-3">
              <Sparkles className="text-emerald-600 animate-spin shrink-0" size={24} />
              <div>
                <p className="font-extrabold uppercase text-[10px] tracking-wider text-emerald-800">Milestone Unlocked!</p>
                <p className="text-xs font-semibold">{celebrationMessage}</p>
              </div>
            </div>
            <button onClick={() => setShowCelebration(false)} className="text-emerald-700 hover:text-emerald-950 text-xs font-bold leading-none px-2 py-1">✕</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Recommended For You Section */}
      <div className="bg-gradient-to-r from-amber-50 to-zinc-50 border-2 border-[#141414] p-8 space-y-6 shadow-sm relative overflow-hidden">
        {/* Decorative corner visual */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[#141414]/10 pb-4">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-mono tracking-widest text-amber-800 font-bold flex items-center gap-1.5 leading-none">
              <Compass size={14} className="text-amber-600 animate-pulse" /> Active Re-entry Navigation // Algorithmic Tailoring
            </span>
            <h3 className="text-3xl font-serif italic font-bold text-[#141414]">Recommended For You</h3>
          </div>
          <span className="text-[9px] font-mono bg-amber-200/60 text-amber-950 border border-amber-300 font-bold uppercase tracking-wider px-2.5 py-1 rounded">
            Live Alignment
          </span>
        </div>

        {/* Info or helper text */}
        <p className="text-xs text-neutral-600 leading-relaxed font-light max-w-3xl">
          Based on your <span className="font-semibold text-[#141414]">declared interests</span> and <span className="font-semibold text-[#141414]">remaining milestones</span>, we have matching resources and peers supporting your specific developmental path.
        </p>

        {/* Three recommendations grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {getWorkspaceRecommendations().map((rec) => {
            const isMilestone = rec.type === 'milestone';
            const isPeer = rec.type === 'peer';
            const isOpportunity = rec.type === 'job' || rec.type === 'housing';

            return (
              <motion.div
                key={rec.id}
                whileHover={{ y: -3 }}
                className="bg-white border border-[#141414] p-6 flex flex-col justify-between space-y-4 hover:shadow-md transition-all relative group"
              >
                {/* Header of card */}
                <div className="space-y-2 text-left">
                  <div className="flex justify-between items-center bg-transparent">
                    <span className="text-[9px] font-mono uppercase font-black text-gray-500 tracking-wider">
                      {rec.title}
                    </span>
                    <span className="text-[9px] font-mono bg-neutral-100 text-[#141414] border border-neutral-300 px-1.5 py-0.5 font-bold uppercase tracking-wide rounded-sm">
                      {rec.badge}
                    </span>
                  </div>
                  
                  <h4 className="text-lg font-serif italic font-bold text-[#141414] leading-snug">
                    {rec.boldTitle}
                  </h4>
                  
                  <p className="text-xs text-neutral-600 leading-relaxed font-light">
                    {rec.description}
                  </p>
                </div>

                {/* Footer of card */}
                <div className="space-y-3 pt-3 border-t border-dashed border-neutral-200 text-left">
                  <span className="text-[10px] font-mono text-gray-500 block truncate font-medium">
                    {rec.meta}
                  </span>

                  {isMilestone && rec.actionData && (
                    <button
                      onClick={() => handleCompleteMilestone(rec.actionData, rec.boldTitle)}
                      className="w-full bg-[#141414] hover:bg-neutral-800 text-white text-[10px] font-black font-mono uppercase tracking-widest py-2.5 transition-all cursor-pointer flex items-center justify-center gap-1.5 rounded-sm"
                    >
                      <CheckCircle size={12} /> {rec.actionLabel}
                    </button>
                  )}

                  {isPeer && rec.actionData && (
                    <button
                      onClick={() => handleSendKite(rec.actionData.id, rec.actionData.name)}
                      className="w-full bg-white hover:bg-neutral-50 text-[#141414] border border-[#141414] text-[10px] font-black font-mono uppercase tracking-widest py-2.5 transition-all cursor-pointer flex items-center justify-center gap-1.5 rounded-sm"
                    >
                      <MessageSquare size={12} /> {rec.actionLabel}
                    </button>
                  )}

                  {isOpportunity && (
                    <div className="text-center text-[10px] text-zinc-400 font-mono italic">
                      Visit the <strong className="text-[#141414] font-bold">Opportunities</strong> tab to view complete specs
                    </div>
                  )}

                  {rec.type === 'milestone-empty' && (
                    <div className="text-center text-[10px] text-emerald-600 font-mono uppercase font-black tracking-wide bg-emerald-50 py-1.5 border border-emerald-200 rounded">
                      🎉 Full Roadmap Cleared
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Community Milestones & Recent Activity Dashboard */}
      <div className="bg-[#141414] text-[#E4E3E0] border border-[#141414] p-8 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#E4E3E0]/20 pb-4">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-mono tracking-widest text-[#E4E3E0]/60 flex items-center gap-1.5 font-bold">
              <Sparkles size={12} className="text-[#E4E3E0] opacity-80" /> Voices of Triumph // Success Stories
            </span>
            <h3 className="text-3xl font-serif italic">Community Milestones</h3>
          </div>
          <button
            onClick={() => setShowStoryModal(true)}
            className="px-4 py-2 border border-[#E4E3E0]/30 hover:border-[#E4E3E0] text-xs font-bold uppercase tracking-widest font-mono hover:bg-white hover:text-[#141414] transition-all flex items-center gap-2 cursor-pointer"
          >
            <Plus size={14} /> + Share Your Story
          </button>
        </div>

        {/* Dashboard Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Milestones (Col Span 2) */}
          <div className="lg:col-span-2 space-y-4">
            {testimonials.length > 0 ? (
              <div className="relative">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {(() => {
                    const activeStoriesToShow = [];
                    if (testimonials.length > 0) {
                      activeStoriesToShow.push(testimonials[storyIndex]);
                      if (testimonials.length > 1) {
                        const secondIdx = (storyIndex + 1) % testimonials.length;
                        activeStoriesToShow.push(testimonials[secondIdx]);
                      }
                    }

                    return activeStoriesToShow.map((test, index) => {
                      const isShared = test.id === sharedStoryId;
                      return (
                        <motion.div
                          key={test.id + "-" + index}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.3 }}
                          className={`bg-white/5 border p-6 flex flex-col justify-between space-y-6 hover:border-white/20 transition-all group ${
                            isShared
                              ? 'border-amber-400/80 shadow-[0_0_15px_rgba(245,158,11,0.15)] ring-1 ring-amber-400/30'
                              : 'border-white/10'
                          }`}
                        >
                          <div className="space-y-3 text-left">
                            <div className="flex justify-between items-start">
                              <Quote className="text-[#E4E3E0]/30 rotate-180 shrink-0" size={24} />
                              {isShared && (
                                <span className="text-[8px] bg-amber-400/10 text-amber-300 border border-amber-400/20 px-1.5 py-0.5 uppercase tracking-widest font-mono font-bold rounded">
                                  Direct Shared Post
                                </span>
                              )}
                            </div>
                            <p className="text-sm font-serif italic leading-relaxed text-[#E4E3E0]/90">
                              "{test.content}"
                            </p>
                          </div>

                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-white/10">
                            <div className="flex items-center gap-4">
                              {test.avatar_url ? (
                                <img
                                  src={test.avatar_url}
                                  alt={test.author_name}
                                  className="w-12 h-12 rounded border border-[#141414] object-cover shrink-0"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <AIAvatar name={test.author_name} className="w-12 h-12" />
                              )}
                              <div className="text-left">
                                <h4 className="font-serif italic font-bold text-[#E4E3E0]">{test.author_name}</h4>
                                <span className="text-[10px] font-mono uppercase tracking-wider text-[#E4E3E0]/50 font-bold block">
                                  {test.role || "Community Alumnus"}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                              <button
                                onClick={() => handleLikeTestimonial(test.id)}
                                className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 border border-white/10 hover:border-white/30 hover:bg-white/10 text-[10px] font-bold uppercase tracking-wider font-mono text-[#E4E3E0] transition-all cursor-pointer rounded-sm"
                                title="Celebrate this success story!"
                              >
                                <Heart size={12} className="text-rose-400 fill-rose-400/20" />
                                <span>Celebrate ({test.likes_count || 0})</span>
                              </button>

                              <button
                                onClick={() => toggleComments(test.id)}
                                className={`flex items-center justify-center gap-1.5 px-2.5 py-1.5 border hover:bg-white/10 text-[10px] font-bold uppercase tracking-wider font-mono text-[#E4E3E0] transition-all cursor-pointer rounded-sm ${
                                  expandedComments[test.id]
                                    ? 'border-white bg-white/10'
                                    : 'border-white/10 hover:border-white/30'
                                }`}
                                title="Show comments and encouragement"
                              >
                                <MessageSquare size={12} className="text-[#E4E3E0]/80" />
                                <span>Comments ({test.comments?.length || 0})</span>
                              </button>

                              <button
                                onClick={() => handleShareStory(test.id)}
                                className={`flex items-center justify-center gap-1.5 px-2.5 py-1.5 border text-[10px] font-bold uppercase tracking-wider font-mono text-[#E4E3E0] transition-all cursor-pointer rounded-sm ${
                                  copiedStoryId === test.id
                                    ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300'
                                    : 'border-white/10 hover:border-white/30 hover:bg-white/10'
                                }`}
                                title="Copy a share link to this story!"
                              >
                                <Share2 size={12} className={copiedStoryId === test.id ? 'text-emerald-400' : 'text-[#E4E3E0]/80'} />
                                <span>{copiedStoryId === test.id ? 'Copied!' : 'Share'}</span>
                              </button>
                            </div>
                          </div>

                          {expandedComments[test.id] && (
                            <div className="mt-4 pt-4 border-t border-white/10 space-y-4 text-left">
                              <h5 className="text-[10px] font-mono uppercase tracking-widest text-[#E4E3E0]/50 font-bold">
                                Discussion & Encouragement ({test.comments?.length || 0})
                              </h5>
                              
                              {/* List of comments */}
                              <div className="max-h-48 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
                                {(!test.comments || test.comments.length === 0) ? (
                                  <p className="text-xs text-[#E4E3E0]/40 italic pl-1">
                                    No encouragement left yet. Be the first to lift them up!
                                  </p>
                                ) : (
                                  test.comments.map((comment) => (
                                    <div key={comment.id} className="space-y-1 bg-white/5 p-3 rounded border border-white/5 text-left">
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                          {comment.avatar_url ? (
                                            <img
                                              src={comment.avatar_url}
                                              alt={comment.author_name}
                                              className="w-5 h-5 rounded-sm border border-[#141414] object-cover shrink-0"
                                              referrerPolicy="no-referrer"
                                            />
                                          ) : (
                                            <AIAvatar name={comment.author_name} className="w-5 h-5" />
                                          )}
                                          <span className="font-serif italic font-bold text-[#E4E3E0] text-xs">
                                            {comment.author_name}
                                          </span>
                                        </div>
                                        {comment.created_at && (
                                          <span className="text-[8px] font-mono text-[#E4E3E0]/40">
                                            {new Date(comment.created_at).toLocaleDateString(undefined, {
                                              month: 'short',
                                              day: 'numeric',
                                              hour: '2-digit',
                                              minute: '2-digit'
                                            })}
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-xs text-[#E4E3E0]/80 pl-7 leading-relaxed font-sans">
                                        {comment.content}
                                      </p>
                                    </div>
                                  ))
                                )}
                              </div>

                              {/* Add Comment Box */}
                              <div className="flex gap-2 pt-2 border-t border-white/5">
                                <textarea
                                  rows={1}
                                  value={newCommentTexts[test.id] || ""}
                                  onChange={(e) => handleCommentTextChange(test.id, e.target.value)}
                                  placeholder="Type an encouraging note..."
                                  className="flex-1 bg-white/5 border border-white/10 text-[#E4E3E0] placeholder-[#E4E3E0]/40 p-2 text-xs focus:outline-none focus:border-white/30 resize-none rounded animate-none"
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                      e.preventDefault();
                                      handlePostComment(test.id);
                                    }
                                  }}
                                />
                                <button
                                  onClick={() => handlePostComment(test.id)}
                                  disabled={isSubmittingComment[test.id] || !(newCommentTexts[test.id] || "").trim()}
                                  className="bg-white hover:bg-[#E4E3E0] text-[#141414] disabled:opacity-40 disabled:hover:bg-white text-[10px] font-semibold uppercase tracking-wider font-mono px-3 py-2 rounded-sm transition-all shrink-0 cursor-pointer"
                                >
                                  {isSubmittingComment[test.id] ? "Posting..." : "Post"}
                                </button>
                              </div>
                            </div>
                          )}
                        </motion.div>
                      );
                    });
                  })()}
                </div>

                {/* Slider navigations */}
                {testimonials.length > 2 && (
                  <div className="flex justify-end gap-2 mt-4 pt-2">
                    <button
                      onClick={() => setStoryIndex(prev => (prev - 1 + testimonials.length) % testimonials.length)}
                      className="p-2 border border-white/10 hover:border-white/30 text-[#E4E3E0] hover:bg-white/10 transition-all text-xs cursor-pointer"
                      title="Previous Success Story"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button
                      onClick={() => setStoryIndex(prev => (prev + 1) % testimonials.length)}
                      className="p-2 border border-white/10 hover:border-white/30 text-[#E4E3E0] hover:bg-white/10 transition-all text-xs cursor-pointer"
                      title="Next Success Story"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-8 border border-white/10 text-center flex flex-col items-center justify-center space-y-4">
                <Quote className="text-white/20" size={32} />
                <p className="text-sm font-serif italic text-white/70 max-w-md bg-transparent">
                  No breakthrough milestones have been published yet. Be the first to lift up brothers and share your steps of perseverance home.
                </p>
              </div>
            )}
          </div>

          {/* Right Column: Recent Activity Feed (Col Span 1) */}
          <div className="lg:col-span-1 border-t lg:border-t-0 lg:border-l border-[#E4E3E0]/15 pt-6 lg:pt-0 lg:pl-8 flex flex-col justify-between">
            <div className="space-y-4 flex-1">
              <div className="flex justify-between items-center">
                <h4 className="text-[10px] uppercase font-mono tracking-widest text-[#E4E3E0]/60 font-black flex items-center gap-2">
                  <Activity size={12} className="text-amber-400" /> Recent Interactions
                </h4>
                {activities.length > 0 && (
                  <button
                    onClick={() => {
                      if (user?.id) {
                        const empty: ActivityItem[] = [];
                        setActivities(empty);
                        localStorage.setItem(`recent_activities_${user.id}`, JSON.stringify(empty));
                      }
                    }}
                    className="text-[9px] uppercase font-mono text-[#E4E3E0]/40 hover:text-[#E4E3E0] transition-colors cursor-pointer tracking-wider font-bold"
                  >
                    Clear Stream
                  </button>
                )}
              </div>

              {activities.length === 0 ? (
                <div className="p-4 border border-white/5 rounded-sm bg-white/5 space-y-2 text-left">
                  <p className="text-xs text-[#E4E3E0]/50 font-sans">
                    No active updates logged in your current browser session.
                  </p>
                  <p className="text-[10px] text-amber-300 font-mono leading-relaxed font-bold">
                    → Try sending a Kite, celebrating a success story, or linking with a connection below to see live updates populate.
                  </p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1 select-none custom-scrollbar relative pl-3">
                  {/* Vertical Timeline Thread Line */}
                  <div className="absolute left-1.5 top-2 bottom-2 w-0.5 bg-gradient-to-b from-amber-400/50 via-white/10 to-transparent" />

                  {activities.map((act) => {
                    let bulletColor = 'bg-gray-400';
                    let typeLabel = 'Update';
                    if (act.type === 'connection') {
                      bulletColor = 'bg-emerald-400';
                      typeLabel = 'Net Link';
                    } else if (act.type === 'kite') {
                      bulletColor = 'bg-cyan-400';
                      typeLabel = 'Direct Message';
                    } else if (act.type === 'story') {
                      bulletColor = 'bg-purple-400';
                      typeLabel = 'Publishing';
                    } else if (act.type === 'comment') {
                      bulletColor = 'bg-amber-400';
                      typeLabel = 'Feedback';
                    } else if (act.type === 'like') {
                      bulletColor = 'bg-rose-400';
                      typeLabel = 'Celebration';
                    }

                    return (
                      <div key={act.id} className="relative group/act text-left">
                        {/* Timeline node bullet */}
                        <div className={`absolute -left-[19px] top-1.5 w-2.5 h-2.5 rounded-full ${bulletColor} ring-4 ring-[#141414] transition-transform group-hover/act:scale-110`} />
                        
                        <div className="space-y-1">
                          <div className="flex justify-between items-baseline gap-2">
                            <span className="text-[8px] font-mono tracking-wider text-amber-300 font-bold uppercase">
                              {typeLabel}
                            </span>
                            <span className="text-[9px] text-[#E4E3E0]/40 font-mono shrink-0 font-bold">
                              {formatRelativeTime(act.timestamp)}
                            </span>
                          </div>
                          <h5 className="text-xs font-serif italic text-[#E4E3E0] font-bold">
                            {act.title}
                          </h5>
                          <p className="text-[11px] leading-relaxed text-[#E4E3E0]/70 font-sans font-medium">
                            {act.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 opacity-40" />
          <input 
            type="text" 
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by facility (e.g. San Quentin), name, or state..."
            className="w-full bg-white border border-[#141414] py-6 pl-14 pr-6 text-xl focus:outline-none focus:ring-2 focus:ring-[#141414]/10 transition-all"
          />
        </div>

        {/* Elegant Connections Filter Switch */}
        <div className="flex border border-[#141414] bg-white text-xs font-bold uppercase tracking-widest max-w-lg">
          <button
            onClick={() => setFilterMode('all')}
            className={`flex-1 py-4 text-center border-r border-[#141414] transition-colors cursor-pointer ${
              filterMode === 'all'
                ? 'bg-[#141414] text-[#E4E3E0]'
                : 'hover:bg-gray-100 text-[#141414]'
            }`}
          >
            All Members
          </button>
          <button
            onClick={() => setFilterMode('connections')}
            className={`flex-1 py-4 text-center border-r border-[#141414] transition-colors cursor-pointer ${
              filterMode === 'connections'
                ? 'bg-[#141414] text-[#E4E3E0]'
                : 'hover:bg-gray-100 text-[#141414]'
            }`}
          >
            Connected ({connectedIds.length})
          </button>
          <button
            onClick={() => setFilterMode('meet')}
            className={`flex-1 py-4 text-center transition-colors cursor-pointer ${
              filterMode === 'meet'
                ? 'bg-[#141414] text-[#E4E3E0]'
                : 'hover:bg-gray-100 text-[#141414]'
            }`}
          >
            Looking to Meet
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {finalFilteredUsers.length === 0 && (
          <div className="col-span-full p-12 text-center opacity-60 border border-dashed border-[#141414] bg-white font-serif italic text-base">
            {filterMode === 'connections' 
              ? "You haven't connected with anyone in The Yard yet. Find peers below to build your network." 
              : filterMode === 'meet' 
              ? "No members are currently listed as 'Looking to Meet'. Be the first by saving your update above!"
              : "No users found. Be the first to invite your brothers."}
          </div>
        )}
        {finalFilteredUsers.map((user, idx) => {
          const isConnected = connectedIds.includes(user.id);
          return (
            <motion.div 
              key={user.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="group bg-white border border-[#141414] p-8 hover:bg-[#141414] hover:text-[#E4E3E0] transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-3xl font-serif italic font-bold leading-none">{user.name}</h3>
                      {user.looking_to_meet && (
                        <span className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-100 group-hover:bg-emerald-500/20 text-emerald-800 group-hover:text-emerald-300 border border-emerald-300 font-mono text-[9px] font-black uppercase tracking-wider rounded">
                          🟢 Active on Yard
                        </span>
                      )}
                    </div>
                    
                    {/* Dating Demographic Badge strip */}
                    {(user.age || user.gender || user.relationship_status) && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[10px] font-mono font-bold uppercase tracking-wider text-amber-900 group-hover:text-amber-300">
                        {user.age && <span>{user.age} Yrs</span>}
                        {user.age && (user.gender || user.pronouns) && <span>•</span>}
                        {user.gender && <span>{user.gender}</span>}
                        {user.pronouns && <span className="opacity-60">({user.pronouns})</span>}
                        {(user.age || user.gender) && user.relationship_status && <span>•</span>}
                        {user.relationship_status && <span className="underline decoration-wavy">{user.relationship_status}</span>}
                      </div>
                    )}

                    <div className="flex items-center gap-1.5 text-xs uppercase tracking-widest opacity-60 pt-0.5">
                      <MapPin size={12} />
                      {user.location || 'Unknown Location'}
                    </div>
                  </div>
                  <button 
                    onClick={(e) => handleToggleConnect(e, user.id, isConnected)}
                    title={isConnected ? 'Disconnect' : 'Connect'}
                    className={`p-3 border rounded-full transition-colors cursor-pointer ${
                      isConnected 
                        ? 'bg-[#141414] text-[#E4E3E0] border-[#E4E3E0] group-hover:bg-[#E4E3E0] group-hover:text-[#141414] group-hover:border-[#141414]' 
                        : 'border-[#141414] text-[#141414] hover:bg-[#141414] hover:text-[#E4E3E0] group-hover:border-current group-hover:hover:bg-[#E4E3E0] group-hover:hover:text-[#141414]'
                    }`}
                    id={`connect-btn-${user.id}`}
                  >
                    {isConnected ? <UserCheck size={20} /> : <UserPlus size={20} />}
                  </button>
                </div>

                <div className="space-y-4">
                  {user.looking_for && (
                    <div className="text-xs italic font-serif leading-relaxed text-gray-700 group-hover:text-gray-300 border-l-2 border-amber-600/50 pl-2 mt-2">
                      <span className="font-mono text-[9px] uppercase font-bold not-italic text-neutral-400 group-hover:text-amber-400 mr-1 block">Looking For:</span>
                      {user.looking_for}
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-sm font-mono pt-1">
                    <History size={16} className="opacity-40" />
                    <span className="opacity-60">Facility Track:</span>
                    <span>{user.history || 'Not specified'}</span>
                  </div>

                  <p className="text-sm leading-relaxed opacity-80">
                    "{user.bio || 'No bio provided.'}"
                  </p>

                  {user.public_status && (
                    <div className="bg-[#141414]/5 group-hover:bg-white/5 border-l-2 border-[#141414] group-hover:border-white p-3 font-serif italic text-sm text-gray-700 group-hover:text-white/90">
                      "{user.public_status}"
                    </div>
                  )}

                  {user.incarceration_details && (
                    <div className="bg-[#141414]/5 group-hover:bg-white/5 border border-dashed border-[#141414]/20 group-hover:border-white/20 p-2.5 text-xs text-neutral-700 group-hover:text-neutral-300 font-sans mt-2 rounded">
                      <strong className="text-[10px] font-mono uppercase tracking-wider text-amber-900 group-hover:text-amber-400 font-black block mb-0.5">Story Background:</strong>
                      {user.incarceration_details}
                    </div>
                  )}

                  {user.interests && (
                    <div className="space-y-1">
                      <span className="text-[9px] font-mono tracking-widest text-gray-400 font-bold uppercase block">Core Interests:</span>
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {user.interests.split(',').map((tag, i) => (
                          <span key={i} className="text-[10px] bg-gray-100 group-hover:bg-white/10 text-gray-600 group-hover:text-white border border-current/10 px-2 py-0.5 font-mono uppercase font-black">
                            #{tag.trim()}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-current/10 flex gap-4">
                <button 
                  onClick={() => handleSendKite(user.id, user.name)}
                  className="text-xs uppercase tracking-widest font-bold hover:underline cursor-pointer"
                >
                  Send Kite
                </button>
                <span className="text-xs uppercase tracking-widest opacity-40 select-none">|</span>
                <span className="text-xs uppercase tracking-widest font-bold font-mono">
                  {isConnected ? '✓ Linked Connection' : 'Not Connected'}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Share Your Success Story Modal */}
      <AnimatePresence>
        {showStoryModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#E4E3E0] text-[#141414] border-2 border-[#141414] w-full max-w-xl p-8 shadow-2xl relative"
            >
              <button
                onClick={() => setShowStoryModal(false)}
                className="absolute top-4 right-4 p-2 hover:bg-[#141414]/10 transition-colors rounded text-[#141414] cursor-pointer"
                title="Close"
              >
                <X size={20} />
              </button>

              <div className="space-y-2 mb-6">
                <div className="flex items-center gap-2 text-xs uppercase tracking-widest font-mono font-bold text-gray-500">
                  <Sparkles size={14} className="text-[#141414]" /> Voices of Triumph
                </div>
                <h3 className="text-3xl font-serif italic text-[#141414]">Share Your Re-entry Story</h3>
                <p className="text-xs opacity-70">
                  Your journey of perseverance and triumph serves as an encouraging lighthouse of hope for brothers currently returning home.
                </p>
              </div>

              <form onSubmit={handleSubmitStory} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-wider font-bold font-mono">Your Name / Alias</label>
                    <input
                      type="text"
                      required
                      value={storyForm.author_name}
                      onChange={e => setStoryForm(prev => ({ ...prev, author_name: e.target.value }))}
                      placeholder="e.g. Marcus V."
                      className="w-full bg-white border border-[#141414] p-3 text-sm focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-wider font-bold font-mono">Your Role or Milestone</label>
                    <input
                      type="text"
                      value={storyForm.role}
                      onChange={e => setStoryForm(prev => ({ ...prev, role: e.target.value }))}
                      placeholder="e.g. Alumnus & Junior Dev, Mentor, Business Owner"
                      className="w-full bg-white border border-[#141414] p-3 text-sm focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider font-bold font-mono">Your Success Story & Testimony</label>
                  <textarea
                    required
                    rows={5}
                    value={storyForm.content}
                    onChange={e => setStoryForm(prev => ({ ...prev, content: e.target.value }))}
                    placeholder="Describe your breakthrough. What did you achieve after release? How did navigation tools or support networks help? Empower the community with your steps."
                    className="w-full bg-white border border-[#141414] p-3 text-sm focus:outline-none resize-none leading-relaxed"
                  />
                </div>

                {/* Dynamic AI-Generated Profile Avatar Preview */}
                <div className="bg-white/40 border border-[#141414]/10 p-4 flex items-center gap-4 rounded-sm">
                  <AIAvatar name={storyForm.author_name || "Guest"} className="w-12 h-12" />
                  <div>
                    <h5 className="text-[10px] uppercase tracking-widest font-bold text-gray-500 font-mono">Bespoke AI Avatar Preview</h5>
                    <p className="text-[11px] text-gray-600 font-sans mt-0.5">
                      Based on your name, a beautiful bespoke retro geometric portrait art is generated deterministically!
                    </p>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-[#141414]/10">
                  <button
                    type="button"
                    onClick={() => setShowStoryModal(false)}
                    className="px-6 py-3 border border-[#141414] text-[10px] font-bold uppercase tracking-widest font-mono hover:bg-white transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingStory}
                    className="px-8 py-3 bg-[#141414] text-[#E4E3E0] text-[10px] font-bold uppercase tracking-widest font-mono hover:opacity-90 disabled:opacity-50 transition-all flex items-center gap-2 cursor-pointer"
                  >
                    {isSubmittingStory ? "Sharing..." : "Post Success Story"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
