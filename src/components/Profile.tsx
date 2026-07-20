import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { User } from '../types';
import { 
  UserCircle, MapPin, Building, Shield, EyeOff, Save, Camera, Upload, X, Loader2,
  CheckCircle2, AlertCircle, Plus, Trash2, ArrowRight, ClipboardCheck, Briefcase, 
  ExternalLink, RefreshCw, Award, Activity, Sparkles
} from 'lucide-react';

interface CustomGoal {
  id: string;
  text: string;
  completed: boolean;
}

const defaultCustomGoals: CustomGoal[] = [
  { id: 'custom-1', text: 'Apply for stable, felony-friendly housing accommodations', completed: false },
  { id: 'custom-2', text: 'Schedule a check-in with your assigned Parole/Probation Officer', completed: false },
  { id: 'custom-3', text: 'Open a local personal transition bank checking account', completed: false }
];

export default function Profile() {
  const { user, token, updateUser } = useAuth();
  const [profile, setProfile] = useState<User | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    history: '',
    location: '',
    bio: '',
    hide_location: false,
    hide_history: false,
    age: '',
    gender: '',
    pronouns: '',
    looking_for: '',
    relationship_status: '',
    interests: '',
    incarceration_details: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Reintegration tracker states
  const [tasksData, setTasksData] = useState<{
    documents: any[];
    cases: any[];
    mentorships: any[];
    jobApplications: any[];
    threadCount: number;
    loading: boolean;
  }>({
    documents: [],
    cases: [],
    mentorships: [],
    jobApplications: [],
    threadCount: 0,
    loading: true
  });

  const [customGoals, setCustomGoals] = useState<CustomGoal[]>([]);
  const [newGoalText, setNewGoalText] = useState('');
  const [profileFocusTab, setProfileFocusTab] = useState<'dynamic' | 'custom'>('dynamic');

  const fetchTrackerData = async () => {
    if (!token) return;
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [docsRes, casesRes, mentorsRes, jobsRes, threadsRes] = await Promise.all([
        fetch('/api/documents', { headers }).then(r => r.ok ? r.json() : []),
        fetch('/api/legal-cases', { headers }).then(r => r.ok ? r.json() : []),
        fetch('/api/mentorships', { headers }).then(r => r.ok ? r.json() : []),
        fetch('/api/job-applications', { headers }).then(r => r.ok ? r.json() : []),
        fetch('/api/threads', { headers }).then(r => r.ok ? r.json() : [])
      ]);
      
      const myThreads = Array.isArray(threadsRes) ? threadsRes.filter((t: any) => t.author_id === user?.id) : [];

      setTasksData({
        documents: Array.isArray(docsRes) ? docsRes : [],
        cases: Array.isArray(casesRes) ? casesRes : [],
        mentorships: Array.isArray(mentorsRes) ? mentorsRes : [],
        jobApplications: Array.isArray(jobsRes) ? jobsRes : [],
        threadCount: myThreads.length,
        loading: false
      });
    } catch (err) {
      console.error("Error fetching integration tracker data:", err);
      setTasksData(prev => ({ ...prev, loading: false }));
    }
  };

  useEffect(() => {
    if (user?.id) {
      const storageKey = `profile_custom_goals_${user.id}`;
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          setCustomGoals(JSON.parse(saved));
        } catch (e) {
          setCustomGoals(defaultCustomGoals);
        }
      } else {
        setCustomGoals(defaultCustomGoals);
        localStorage.setItem(storageKey, JSON.stringify(defaultCustomGoals));
      }
    }
  }, [user?.id]);

  const saveCustomGoals = (updated: CustomGoal[]) => {
    setCustomGoals(updated);
    if (user?.id) {
      localStorage.setItem(`profile_custom_goals_${user.id}`, JSON.stringify(updated));
    }
  };

  const handleToggleCustomGoal = (goalId: string) => {
    const updated = customGoals.map(g => g.id === goalId ? { ...g, completed: !g.completed } : g);
    saveCustomGoals(updated);
  };

  const handleAddCustomGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoalText.trim()) return;
    const newGoal: CustomGoal = {
      id: 'g-' + Math.random().toString(36).substring(2, 9),
      text: newGoalText.trim(),
      completed: false
    };
    const updated = [...customGoals, newGoal];
    saveCustomGoals(updated);
    setNewGoalText('');
  };

  const handleDeleteCustomGoal = (goalId: string) => {
    const updated = customGoals.filter(g => g.id !== goalId);
    saveCustomGoals(updated);
  };

  useEffect(() => {
    if (token) {
      fetch('/api/users/profile', {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => {
        setProfile(data);
        setFormData({
          history: data.history || '',
          location: data.location || '',
          bio: data.bio || '',
          hide_location: !!data.hide_location,
          hide_history: !!data.hide_history,
          age: data.age !== null && data.age !== undefined ? String(data.age) : '',
          gender: data.gender || '',
          pronouns: data.pronouns || '',
          looking_for: data.looking_for || '',
          relationship_status: data.relationship_status || '',
          interests: data.interests || '',
          incarceration_details: data.incarceration_details || ''
        });
      });
      fetchTrackerData();
    }
  }, [token]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (file.type.startsWith('image/')) {
        uploadAvatar(file);
      } else {
        alert("Please upload an image file.");
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadAvatar(file);
    }
  };

  const uploadAvatar = async (file: File) => {
    setIsUploading(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;

        // 1. Save in Document Vault
        const docRes = await fetch('/api/documents', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            title: 'Avatar Profile Picture',
            category: 'Personal',
            file_name: file.name,
            file_type: file.type,
            file_data: base64String
          })
        });

        if (!docRes.ok) throw new Error("Document Vault upload failed");
        const docData = await docRes.json();
        const avatarUrl = `/api/avatar/${docData.id}`;

        // 2. Clear out existing and update profile with new avatar_url
        const profileRes = await fetch('/api/users/profile', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            history: formData.history,
            location: formData.location,
            bio: formData.bio,
            hide_location: formData.hide_location,
            hide_history: formData.hide_history,
            age: formData.age ? parseInt(formData.age, 10) : null,
            gender: formData.gender,
            pronouns: formData.pronouns,
            looking_for: formData.looking_for,
            relationship_status: formData.relationship_status,
            interests: formData.interests,
            incarceration_details: formData.incarceration_details,
            avatar_url: avatarUrl
          })
        });

        if (profileRes.ok) {
          setProfile(prev => prev ? { ...prev, avatar_url: avatarUrl } : null);
          updateUser({ avatar_url: avatarUrl });
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error(err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveAvatar = async () => {
    setIsUploading(true);
    try {
      const res = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          history: formData.history,
          location: formData.location,
          bio: formData.bio,
          hide_location: formData.hide_location,
          hide_history: formData.hide_history,
          age: formData.age ? parseInt(formData.age, 10) : null,
          gender: formData.gender,
          pronouns: formData.pronouns,
          looking_for: formData.looking_for,
          relationship_status: formData.relationship_status,
          interests: formData.interests,
          incarceration_details: formData.incarceration_details,
          avatar_url: null
        })
      });
      if (res.ok) {
        setProfile(prev => prev ? { ...prev, avatar_url: undefined } : null);
        updateUser({ avatar_url: null });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const parsedAge = formData.age ? parseInt(formData.age, 10) : null;
      const savePayload = {
        ...formData,
        age: parsedAge
      };
      const res = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(savePayload)
      });
      if (res.ok) {
        setIsEditing(false);
        // Update local profile state
        setProfile(prev => prev ? { 
          ...prev, 
          ...savePayload, 
          hide_location: formData.hide_location ? 1 : 0, 
          hide_history: formData.hide_history ? 1 : 0 
        } : null);
        // Sync context
        updateUser(savePayload);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  if (!profile) return <div className="p-8 text-center opacity-60">Loading profile...</div>;

  const autoGoals = [
    {
      id: 'doc-id',
      text: "Upload transition photo ID or driver license",
      category: "Document Vault",
      description: "Establish identification by uploading your State ID, Driver's License, or equivalent documentation to coordinate housing, social security, or banking access.",
      completed: tasksData.documents.some(d => d.category === 'ID' || d.title.toLowerCase().includes('id') || d.file_name.toLowerCase().includes('id') || d.title.toLowerCase().includes('license')),
      tab: "vault" as const,
      verificationMessage: "Auto-verified: ID file found in Vault"
    },
    {
      id: 'doc-resume',
      text: "Store transition-ready professional Resume draft",
      category: "Document Vault",
      description: "Formulate a digital copy of your work resume inside the document repository to quickly attach to job postings or send to employers.",
      completed: tasksData.documents.some(d => d.category === 'Resume' || d.title.toLowerCase().includes('resume') || d.file_name.toLowerCase().includes('resume')),
      tab: "vault" as const,
      verificationMessage: "Auto-verified: Resume file logged in Vault"
    },
    {
      id: 'doc-cert',
      text: "Keep earned course certificates or milestones proof",
      category: "Document Vault",
      description: "Organize re-entry group training milestones, computer literacy credentials, or community transition achievements in your records.",
      completed: tasksData.documents.some(d => d.category === 'Certificate' || d.title.toLowerCase().includes('certificate') || d.file_name.toLowerCase().includes('cert') || d.title.toLowerCase().includes('diploma')),
      tab: "vault" as const,
      verificationMessage: "Auto-verified: Certificate documented in Vault"
    },
    {
      id: 'case-log',
      text: "Establish list of files inside Case Tracker",
      category: "Case Tracker",
      description: "Review, align, and organize your files by logging at least one legal case entry within the peer-supported Case Tracker tracker.",
      completed: tasksData.cases.length > 0,
      tab: "cases" as const,
      verificationMessage: `Auto-verified: ${tasksData.cases.length} case${tasksData.cases.length === 1 ? '' : 's'} registered`
    },
    {
      id: 'case-hearing',
      text: "Maintain scheduled court dates and calendar events",
      category: "Case Tracker",
      description: "Verify that upcoming scheduled events or hearing dates are logged to trigger automatic calendar sync and Gmail summaries.",
      completed: tasksData.cases.some(c => c.next_hearing_date && c.next_hearing_date.trim() !== ''),
      tab: "cases" as const,
      verificationMessage: "Auto-verified: Active hearings scheduled"
    },
    {
      id: 'case-closed',
      text: "Resolve cases or progress to probation milestones",
      category: "Case Tracker",
      description: "Move case statuses to 'Closed / Resolved' or 'On Probation' to check off major transition milestones.",
      completed: tasksData.cases.some(c => c.status === 'closed' || c.status === 'probation'),
      tab: "cases" as const,
      verificationMessage: "Auto-verified: Resolved/Probation case found"
    },
    {
      id: 'mentor-match',
      text: "Connect and align with a re-entry mentor",
      category: "Social Alignment",
      description: "Find strength in peer-facilitator instruction by linking an active mentorship connection in the Mentorship module.",
      completed: tasksData.mentorships.some(m => m.status === 'active' || m.status === 'completed'),
      tab: "mentorship" as const,
      verificationMessage: "Auto-verified: Peer mentor match active"
    },
    {
      id: 'job-app',
      text: "Record an active job application on Opportunities",
      category: "Social Alignment",
      description: "Track and log of felony-friendly transitions by maintaining submitted job records under the Opportunities tracker.",
      completed: tasksData.jobApplications.length > 0,
      tab: "opportunities" as const,
      verificationMessage: `Auto-verified: ${tasksData.jobApplications.length} application${tasksData.jobApplications.length === 1 ? '' : 's'} saved`
    }
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <header className="space-y-4">
        <h2 className="text-6xl font-serif italic tracking-tighter">My Profile</h2>
        <p className="text-xl opacity-60">
          Manage your identity, background, and privacy settings.
        </p>
      </header>

      <div className="bg-white border border-[#141414] p-8">
        <div className="flex items-start justify-between mb-8 flex-wrap gap-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div 
              id="avatar-upload-container"
              className={`relative group w-20 h-20 rounded-full border border-[#141414]/20 overflow-hidden flex items-center justify-center transition-all ${
                isDragging ? "ring-2 ring-offset-2 ring-[#141414]" : ""
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              title="Click or drag an image here to upload your profile picture"
            >
              {isUploading ? (
                <div className="absolute inset-0 bg-[#141414]/50 flex items-center justify-center text-white z-10">
                  <Loader2 className="animate-spin" size={24} />
                </div>
              ) : null}

              {profile?.avatar_url ? (
                <img 
                  id="profile-avatar-image"
                  src={profile.avatar_url} 
                  alt={profile.name} 
                  className="w-full h-full object-cover transition-transform duration-300 ease-in-out group-hover:scale-105 hover:scale-105"
                />
              ) : (
                <div 
                  id="profile-avatar-initials"
                  className="w-full h-full bg-[#141414] text-[#E4E3E0] flex items-center justify-center text-3xl font-serif italic selection:bg-transparent"
                >
                  {profile.name.charAt(0).toUpperCase()}
                </div>
              )}

              {/* Upload Overlay */}
              <label 
                id="avatar-file-label"
                htmlFor="avatar-file-input" 
                className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col justify-center items-center text-[#E4E3E0] cursor-pointer transition-opacity text-[10px] uppercase font-bold tracking-wider text-center"
              >
                <Camera size={18} className="mb-1" />
                <span>Upload</span>
                <input 
                  type="file" 
                  id="avatar-file-input" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleFileChange}
                />
              </label>
            </div>

            <div>
              <div className="flex items-center gap-3">
                <h3 className="text-3xl font-bold">{profile.name}</h3>
                {profile.avatar_url && (
                  <button
                    id="profile-avatar-remove-btn"
                    onClick={handleRemoveAvatar}
                    className="text-[10px] text-red-600 font-bold uppercase tracking-widest hover:underline mt-1"
                    title="Remove Profile Picture"
                  >
                    Remove Photo
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {(profile.is_mentor === 1 || tasksData.mentorships.some(m => m.mentor_id === user?.id)) && (
                  <span className="inline-flex items-center gap-1 text-xs uppercase tracking-widest bg-[#141414] text-[#E4E3E0] px-2 py-1">
                    <Shield size={12} /> Mentorship
                  </span>
                )}
                {(tasksData.threadCount >= 2 || tasksData.documents.length >= 2 || tasksData.jobApplications.length >= 2 || tasksData.cases.length >= 2) && (
                  <span className="inline-flex items-center gap-1 text-xs uppercase tracking-widest bg-amber-400 text-amber-900 px-2 py-1 font-bold">
                    <Award size={12} /> Community Contributor
                  </span>
                )}
              </div>
              <div className="text-[11px] opacity-60 uppercase tracking-wider mt-1.5 font-medium">
                Drag and drop image here to change photo
              </div>
            </div>
          </div>
          {!isEditing && (
            <button 
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 border border-[#141414] text-xs uppercase tracking-widest font-bold hover:bg-[#141414] hover:text-[#E4E3E0] transition-colors"
            >
              Edit Profile
            </button>
          )}
        </div>

        {isEditing ? (
          <div className="space-y-6">
            <div className="border-b border-[#141414]/15 pb-4">
              <span className="text-[10px] uppercase font-mono tracking-widest text-amber-800 font-bold block mb-1">
                Section 1 // Personal Status & Connection Details
              </span>
              <h4 className="text-lg font-serif italic font-bold">Identity & Seeking Goals</h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs uppercase tracking-widest font-bold mb-2">Age</label>
                <input 
                  type="number"
                  min="18"
                  max="120"
                  value={formData.age}
                  onChange={e => setFormData({...formData, age: e.target.value})}
                  className="w-full border border-[#141414] p-3 focus:outline-none focus:ring-2 focus:ring-[#141414]/10"
                  placeholder="e.g. 32"
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-widest font-bold mb-2">Gender Identity</label>
                <select 
                  value={formData.gender}
                  onChange={e => setFormData({...formData, gender: e.target.value})}
                  className="w-full bg-white border border-[#141414] p-3 focus:outline-none focus:ring-2 focus:ring-[#141414]/10"
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Non-Binary">Non-Binary</option>
                  <option value="Transgender">Transgender</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs uppercase tracking-widest font-bold mb-2">Pronouns</label>
                <input 
                  type="text"
                  value={formData.pronouns}
                  onChange={e => setFormData({...formData, pronouns: e.target.value})}
                  className="w-full border border-[#141414] p-3 focus:outline-none focus:ring-2 focus:ring-[#141414]/10"
                  placeholder="e.g. he/him"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs uppercase tracking-widest font-bold mb-2">Relationship Status</label>
                <select 
                  value={formData.relationship_status}
                  onChange={e => setFormData({...formData, relationship_status: e.target.value})}
                  className="w-full bg-white border border-[#141414] p-3 focus:outline-none focus:ring-2 focus:ring-[#141414]/10"
                >
                  <option value="">Select Status</option>
                  <option value="Single">Single</option>
                  <option value="Separated">Separated</option>
                  <option value="Divorced">Divorced</option>
                  <option value="In a Relationship">In a Relationship</option>
                  <option value="It's Complicated">It's Complicated</option>
                  <option value="Open Relationship">Open Relationship</option>
                </select>
              </div>
              <div>
                <label className="block text-xs uppercase tracking-widest font-bold mb-2">Looking For / Intent</label>
                <select 
                  value={formData.looking_for}
                  onChange={e => setFormData({...formData, looking_for: e.target.value})}
                  className="w-full bg-white border border-[#141414] p-3 focus:outline-none focus:ring-2 focus:ring-[#141414]/10"
                >
                  <option value="">What are you looking for?</option>
                  <option value="Romance & Partnership">Romance & Partnership</option>
                  <option value="Deep Connection / Dating">Deep Connection / Dating</option>
                  <option value="Casual Conversations / Friendship">Casual Conversations / Friendship</option>
                  <option value="Mutual Reentry Support">Mutual Reentry Support</option>
                  <option value="Mentorship & Growth">Mentorship & Growth</option>
                </select>
              </div>
            </div>

            <div className="border-b border-[#141414]/15 pb-4 pt-2">
              <span className="text-[10px] uppercase font-mono tracking-widest text-[#141414]/60 font-bold block mb-1">
                Section 2 // Social Spark & Profile Bio
              </span>
              <h4 className="text-lg font-serif italic font-bold">Interests & Self Details</h4>
            </div>

            <div>
              <label className="block text-xs uppercase tracking-widest font-bold mb-2">Interests (Comma-separated tags)</label>
              <input 
                type="text"
                value={formData.interests}
                onChange={e => setFormData({...formData, interests: e.target.value})}
                className="w-full border border-[#141414] p-3 focus:outline-none focus:ring-2 focus:ring-[#141414]/10"
                placeholder="e.g. landscaping, technology, weightlifting, coding, poetry, recovery"
              />
              <span className="text-[10px] text-gray-500 font-mono mt-1 block">Separate interest tags with commas for beautiful badge displays.</span>
            </div>

            <div>
              <label className="block text-xs uppercase tracking-widest font-bold mb-2">Introduction / Bio</label>
              <textarea 
                value={formData.bio}
                onChange={e => setFormData({...formData, bio: e.target.value})}
                className="w-full border border-[#141414] p-3 min-h-[100px] focus:outline-none focus:ring-2 focus:ring-[#141414]/10"
                placeholder="Tell potential matches about your transition journey, values, and what makes you unique..."
              />
            </div>

            <div className="border-b border-[#141414]/15 pb-4 pt-2">
              <span className="text-[10px] uppercase font-mono tracking-widest text-amber-800 font-bold block mb-1">
                Section 3 // Incarceration Particulars & Transition Path
              </span>
              <h4 className="text-lg font-serif italic font-bold">My Incarceration & Reentry Story</h4>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs uppercase tracking-widest font-bold mb-2">Primary Transitional Facility</label>
                <input 
                  type="text"
                  value={formData.history}
                  onChange={e => setFormData({...formData, history: e.target.value})}
                  className="w-full border border-[#141414] p-3 focus:outline-none focus:ring-2 focus:ring-[#141414]/10"
                  placeholder="e.g. San Quentin (2015-2022)"
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-widest font-bold mb-2">Location / Transit Area</label>
                <input 
                  type="text"
                  value={formData.location}
                  onChange={e => setFormData({...formData, location: e.target.value})}
                  className="w-full border border-[#141414] p-3 focus:outline-none focus:ring-2 focus:ring-[#141414]/10"
                  placeholder="e.g. Denver, CO"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs uppercase tracking-widest font-bold mb-2">Incarceration History / Sentencing details</label>
              <textarea 
                value={formData.incarceration_details}
                onChange={e => setFormData({...formData, incarceration_details: e.target.value})}
                className="w-full border border-[#141414] p-3 min-h-[90px] focus:outline-none focus:ring-2 focus:ring-[#141414]/10"
                placeholder="Details of sentence served, milestones unlocked inside, release year, or parole expectations..."
              />
              <span className="text-[10px] text-gray-500 font-mono mt-1 block">Help matching peers understand your perspective; honesty builds the strongest connections.</span>
            </div>

            <div className="pt-6 border-t border-[#141414]/10 space-y-4">
              <h4 className="text-sm uppercase tracking-widest font-bold flex items-center gap-2">
                <EyeOff size={16} /> Privacy Controls
              </h4>
              
              <label className="flex items-center gap-3 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={formData.hide_location}
                  onChange={e => setFormData({...formData, hide_location: e.target.checked})}
                  className="w-5 h-5 accent-[#141414]"
                />
                <span className="text-sm">Hide my physical location from the public database</span>
              </label>
              
              <label className="flex items-center gap-3 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={formData.hide_history}
                  onChange={e => setFormData({...formData, hide_history: e.target.checked})}
                  className="w-5 h-5 accent-[#141414]"
                />
                <span className="text-sm">Hide my facility track history from the public database</span>
              </label>
            </div>

            <div className="flex gap-4 pt-4">
              <button 
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1 bg-[#141414] text-[#E4E3E0] p-3 text-xs uppercase tracking-widest font-bold hover:opacity-90 transition-opacity flex justify-center items-center gap-2 cursor-pointer"
              >
                <Save size={16} /> {isSaving ? 'Saving...' : 'Save Profile Changes'}
              </button>
              <button 
                onClick={() => setIsEditing(false)}
                className="flex-1 border border-[#141414] p-3 text-xs uppercase tracking-widest font-bold hover:bg-[#141414]/5 transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6 text-left">
            {/* Dating Status Header Block */}
            <div className="bg-amber-50/40 p-4 border border-dashed border-[#141414]/30">
              <div className="flex flex-wrap items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-amber-950">
                {profile.age && <span>{profile.age} years old</span>}
                {profile.age && (profile.gender || profile.pronouns) && <span>•</span>}
                {profile.gender && <span>{profile.gender}</span>}
                {profile.pronouns && <span className="opacity-60">({profile.pronouns})</span>}
                {(profile.age || profile.gender) && profile.relationship_status && <span>•</span>}
                {profile.relationship_status && <span className="bg-amber-100 text-amber-950 px-2 py-0.5 rounded-sm">{profile.relationship_status}</span>}
              </div>
              {profile.looking_for && (
                <div className="text-xs font-serif italic mt-1.5 text-gray-700">
                  <span className="font-mono text-[10px] uppercase font-bold not-italic mr-1.5 text-neutral-500">Currently Seeking:</span>
                  {profile.looking_for}
                </div>
              )}
            </div>

            {profile.bio && (
              <div>
                <h4 className="text-xs uppercase tracking-widest font-bold mb-1.5 opacity-60">My Story & Bio</h4>
                <p className="leading-relaxed text-sm md:text-base text-gray-800 font-light">{profile.bio}</p>
              </div>
            )}
            
            {/* Interests Section */}
            {profile.interests && (
              <div>
                <h4 className="text-xs uppercase tracking-widest font-bold mb-2 opacity-60">Core Spark Interests</h4>
                <div className="flex flex-wrap gap-1.5">
                  {profile.interests.split(',').map((item, index) => (
                    <span 
                      key={index} 
                      className="text-[10px] bg-[#141414]/5 text-[#141414] border border-[#141414]/15 px-2.5 py-0.5 uppercase tracking-wider font-mono font-black"
                    >
                      #{item.trim()}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-[#141414]/10">
              <div>
                <h4 className="text-xs uppercase tracking-widest font-bold mb-1.5 opacity-60 flex items-center gap-2">
                  <MapPin size={14} /> Reentry Location
                </h4>
                <p className="flex items-center gap-2 text-sm font-semibold">
                  {profile.location || 'Not specified'}
                  {profile.hide_location === 1 && <span title="Hidden from public"><EyeOff size={14} className="opacity-50" /></span>}
                </p>
              </div>
              <div>
                <h4 className="text-xs uppercase tracking-widest font-bold mb-1.5 opacity-60 flex items-center gap-2">
                  <Building size={14} /> Incarcerated Facility Track
                </h4>
                <p className="flex items-center gap-2 text-sm font-semibold">
                  {profile.history || 'Not specified'}
                  {profile.hide_history === 1 && <span title="Hidden from public"><EyeOff size={14} className="opacity-50" /></span>}
                </p>
              </div>
            </div>

            {/* Incarceration background narrative section */}
            {profile.incarceration_details && (
              <div className="bg-[#141414]/5 p-4 border border-[#141414]/10 mt-4 rounded-sm">
                <h4 className="text-[10px] uppercase font-mono tracking-widest text-amber-900 font-bold mb-2">
                  Incarceration Background & Timeline
                </h4>
                <p className="text-xs leading-relaxed text-neutral-800 whitespace-pre-wrap font-sans">
                  {profile.incarceration_details}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* REINTEGRATION GOALS DASHBOARD */}
      <div className="bg-[#141414] text-[#E4E3E0] p-8 border border-[#141414] space-y-6">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E4E3E0]/20 pb-4">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-mono tracking-widest text-[#E4E3E0]/60 flex items-center gap-1.5 font-bold">
              <Award size={12} className="text-amber-400" /> Milestone Verification // Reentry Planner
            </span>
            <h3 className="text-3xl font-serif italic text-[#E4E3E0]">Transitional Alignments</h3>
          </div>
          <button
            onClick={() => {
              fetchTrackerData();
            }}
            disabled={tasksData.loading}
            className="px-3 py-1.5 border border-[#E4E3E0]/20 hover:border-[#E4E3E0] hover:bg-white hover:text-[#141414] text-[10px] font-mono font-bold uppercase tracking-widest transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
          >
            <RefreshCw size={12} className={tasksData.loading ? 'animate-spin' : ''} />
            {tasksData.loading ? 'Refreshing...' : 'Validate Status'}
          </button>
        </header>

        {/* Progress Card */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-white/5 border border-white/10 p-6">
          <div className="md:col-span-1 border-b md:border-b-0 md:border-r border-white/10 pb-4 md:pb-0 md:pr-6 flex flex-col justify-center">
            <span className="text-[9px] uppercase font-mono tracking-widest text-[#E4E3E0]/50 font-bold block mb-1">
              Transitional Integrity Index
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-black text-amber-300 tracking-tight">
                {(() => {
                  const autoCompletedCount = autoGoals.filter(g => g.completed).length;
                  const customCompletedCount = customGoals.filter(g => g.completed).length;
                  const totalCompleted = autoCompletedCount + customCompletedCount;
                  const total = autoGoals.length + customGoals.length;
                  return total > 0 ? Math.round((totalCompleted / total) * 100) : 0;
                })()}%
              </span>
              <span className="text-xs opacity-60 font-mono font-bold">Progress</span>
            </div>
          </div>

          <div className="md:col-span-2 space-y-4 flex flex-col justify-center">
            <div className="flex justify-between items-center text-xs font-mono font-bold uppercase tracking-wider">
              <span>Verified Checkpoints</span>
              <span className="text-amber-300">
                {(() => {
                  const autoCompletedCount = autoGoals.filter(g => g.completed).length;
                  const customCompletedCount = customGoals.filter(g => g.completed).length;
                  const totalCompleted = autoCompletedCount + customCompletedCount;
                  const total = autoGoals.length + customGoals.length;
                  return `${totalCompleted} / ${total} Secured`;
                })()}
              </span>
            </div>
            
            {/* Elegant Progress bar channel */}
            <div className="w-full bg-white/10 h-3 border border-white/5 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-amber-400 via-yellow-300 to-emerald-400 h-full transition-all duration-700 ease-out"
                style={{
                  width: `${(() => {
                    const autoCompletedCount = autoGoals.filter(g => g.completed).length;
                    const customCompletedCount = customGoals.filter(g => g.completed).length;
                    const totalCompleted = autoCompletedCount + customCompletedCount;
                    const total = autoGoals.length + customGoals.length;
                    return total > 0 ? Math.min(100, Math.max(0, Math.round((totalCompleted / total) * 100))) : 0;
                  })()}%`
                }}
              />
            </div>
            <p className="text-[10px] leading-relaxed text-[#E4E3E0]/70 font-sans font-medium">
              * Verification checklists combine automated system parameters (linked live to folder actions, document uploads, and mentorship agreements) together with customized self-directed milestones.
            </p>
          </div>
        </div>

        {/* Focus tabs selector */}
        <div className="flex border-b border-white/10">
          <button
            onClick={() => setProfileFocusTab('dynamic')}
            className={`px-4 py-2 border-b-2 text-xs font-mono font-bold uppercase tracking-widest transition-all cursor-pointer ${
              profileFocusTab === 'dynamic'
                ? 'border-amber-400 text-amber-300 bg-white/5'
                : 'border-transparent text-[#E4E3E0]/60 hover:text-[#E4E3E0]'
            }`}
          >
            Database Checkpoints ({autoGoals.filter(g => g.completed).length}/{autoGoals.length})
          </button>
          <button
            onClick={() => setProfileFocusTab('custom')}
            className={`px-4 py-2 border-b-2 text-xs font-mono font-bold uppercase tracking-widest transition-all cursor-pointer ${
              profileFocusTab === 'custom'
                ? 'border-amber-400 text-amber-300 bg-white/5'
                : 'border-transparent text-[#E4E3E0]/60 hover:text-[#E4E3E0]'
            }`}
          >
            Personal Milestones ({customGoals.filter(g => g.completed).length}/{customGoals.length})
          </button>
        </div>

        {/* Tab contents */}
        {profileFocusTab === 'dynamic' ? (
          <div className="space-y-4">
            <p className="text-xs text-[#E4E3E0]/60 italic font-serif">
              Dynamic actions automatically indexed via database records. Keep documents updated to maintain alignment.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {autoGoals.map((g) => (
                <div 
                  key={g.id}
                  className={`p-4 border transition-all ${
                    g.completed 
                      ? 'bg-emerald-500/10 border-emerald-500/30' 
                      : 'bg-white/5 border-white/5 hover:border-white/15'
                  }`}
                >
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <span className="text-[9px] uppercase font-mono bg-white/10 text-[#E4E3E0]/80 px-1.5 py-0.5 font-bold tracking-wider rounded-sm">
                      {g.category}
                    </span>
                    {g.completed ? (
                      <span className="text-[9px] uppercase font-mono tracking-wider font-bold text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded-sm">
                        ✓ Secured
                      </span>
                    ) : (
                      <span className="text-[9px] uppercase font-mono tracking-wider font-bold text-[#E4E3E0]/40">
                        ○ Pending
                      </span>
                    )}
                  </div>

                  <h4 className={`text-sm font-serif italic font-bold mb-1.5 ${g.completed ? 'text-[#E4E3E0]' : 'text-[#E4E3E0]/95'}`}>
                    {g.text}
                  </h4>
                  <p className="text-[11px] leading-relaxed text-[#E4E3E0]/60 font-sans mb-3 font-medium text-left">
                    {g.description}
                  </p>

                  <div className="flex justify-between items-center pt-2.5 border-t border-white/5 mt-auto">
                    {g.completed ? (
                      <span className="text-[9px] font-mono text-emerald-300 flex items-center gap-1 font-bold">
                        <CheckCircle2 size={10} className="text-emerald-400" />
                        {g.verificationMessage}
                      </span>
                    ) : (
                      <div className="flex items-center gap-1 text-[9px] font-mono text-amber-300 font-bold">
                        <AlertCircle size={10} />
                        Action needed
                      </div>
                    )}

                    {!g.completed && (
                      <button
                        onClick={() => {
                          window.dispatchEvent(new CustomEvent('changeTab', { detail: g.tab }));
                        }}
                        className="text-[9px] bg-white text-[#141414] hover:bg-amber-300 font-mono font-bold uppercase py-1 px-2 transition-all flex items-center gap-1 rounded-sm cursor-pointer"
                      >
                        Navigate <ArrowRight size={8} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-[#E4E3E0]/60 italic font-serif">
              Track self-directed goals on your transition checklist. Create or prune targets to customize alignment.
            </p>

            {/* Custom goal list */}
            <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
              {customGoals.length === 0 ? (
                <div className="p-8 border border-white/5 rounded-sm text-center bg-white/5">
                  <p className="text-xs text-[#E4E3E0]/50 italic pl-1 font-serif">
                    No custom milestones logged in your profile. Add one below to track personal targets.
                  </p>
                </div>
              ) : (
                customGoals.map((g) => (
                  <div 
                    key={g.id}
                    className={`flex items-center justify-between p-4 border transition-all ${
                      g.completed
                        ? 'bg-emerald-500/5 border-emerald-500/20 opacity-80'
                        : 'bg-white/5 border-white/5 hover:border-white/10'
                    }`}
                  >
                    <label className="flex items-center gap-3 cursor-pointer select-none flex-1 text-left">
                      <input 
                        type="checkbox"
                        checked={g.completed}
                        onChange={() => handleToggleCustomGoal(g.id)}
                        className="w-4 h-4 accent-amber-300 cursor-pointer border-white/20 bg-transparent rounded-sm"
                      />
                      <span className={`text-xs font-mono tracking-wide ${g.completed ? 'line-through opacity-50 text-[#E4E3E0]' : 'text-[#E4E3E0]'}`}>
                        {g.text}
                      </span>
                    </label>

                    <button
                      onClick={() => handleDeleteCustomGoal(g.id)}
                      className="text-white/40 hover:text-red-400 p-1.5 transition-colors cursor-pointer ml-4"
                      title="Discard target"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Form to add personal milestone */}
            <form onSubmit={handleAddCustomGoal} className="flex gap-2 pt-3 border-t border-white/10">
              <input 
                type="text"
                placeholder="Log a custom transitional goal... (e.g. Schedule parole officer check-in)"
                value={newGoalText}
                onChange={(e) => setNewGoalText(e.target.value)}
                className="flex-1 bg-white/5 border border-white/10 text-[#E4E3E0] placeholder-[#E4E3E0]/40 p-2.5 text-xs focus:outline-none focus:border-white/30 rounded"
              />
              <button
                type="submit"
                disabled={!newGoalText.trim()}
                className="bg-white hover:bg-[#E4E3E0] disabled:bg-white/20 disabled:hover:bg-white/20 text-[#141414] disabled:text-[#E4E3E0]/40 text-[10px] font-bold uppercase tracking-widest px-4 py-2.5 rounded-sm transition-all flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
              >
                <Plus size={12} /> Add Checkpoint
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
