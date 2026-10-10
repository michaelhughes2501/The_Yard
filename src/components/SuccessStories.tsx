import React, { useState, useEffect } from 'react';
import { 
  Heart, 
  MessageSquare, 
  Share2, 
  Send, 
  Plus, 
  Search, 
  Sparkles, 
  Quote, 
  Check, 
  Trash2, 
  Calendar, 
  Clock, 
  User, 
  ShieldCheck, 
  ChevronDown, 
  ChevronUp, 
  ExternalLink,
  BookOpen,
  Briefcase,
  Home as HomeIcon,
  GraduationCap,
  Award,
  Users
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../AuthContext';
import { Testimonial, TestimonialComment } from '../types';
import ConfirmationDialog from './ConfirmationDialog';

interface SuccessStoriesProps {
  onNavigateToKites?: (userId: string, userName: string) => void;
  onNavigateTab?: (tab: string) => void;
}

const CATEGORY_MAP: Record<string, { label: string; icon: any }> = {
  all: { label: 'All Journeys', icon: BookOpen },
  career: { label: 'Career & Trades', icon: Briefcase },
  entrepreneurship: { label: 'Business & Founders', icon: Award },
  housing: { label: 'Housing & Stability', icon: HomeIcon },
  education: { label: 'Education & Degrees', icon: GraduationCap },
  off_paper: { label: 'Off Paper & Discharged', icon: ShieldCheck },
  family: { label: 'Family & Personal Growth', icon: Users },
  mindset: { label: 'Sobriety & Mindset', icon: Sparkles }
};

export default function SuccessStories({ onNavigateToKites, onNavigateTab }: SuccessStoriesProps) {
  const { user, token } = useAuth();
  const [stories, setStories] = useState<Testimonial[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'celebrated'>('recent');
  
  // Expanded read state
  const [expandedStoryIds, setExpandedStoryIds] = useState<Record<string, boolean>>({});
  
  // Comments visibility state
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [newCommentTexts, setNewCommentTexts] = useState<Record<string, string>>({});
  const [isSubmittingComment, setIsSubmittingComment] = useState<Record<string, boolean>>({});

  // Compose Modal State
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [showPrompts, setShowPrompts] = useState(false);
  const [storyForm, setStoryForm] = useState({
    title: '',
    author_name: user?.username || '',
    role: '',
    category: 'career',
    time_served: '',
    years_free: '',
    tags: '',
    content: '',
    advice: ''
  });
  const [isSubmittingStory, setIsSubmittingStory] = useState(false);

  // Delete State
  const [storyToDelete, setStoryToDelete] = useState<Testimonial | null>(null);

  // Toast State
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const fetchStories = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/testimonials', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStories(data);
      }
    } catch (err) {
      console.error('Failed to fetch success stories:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStories();
  }, [token]);

  // Handle Like / Celebrate
  const handleLike = async (id: string) => {
    // Optimistic update
    setStories(prev => prev.map(s => s.id === id ? { ...s, likes_count: (s.likes_count || 0) + 1 } : s));
    
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
        setStories(prev => prev.map(s => s.id === id ? { ...s, likes_count: data.likes_count } : s));
        showToast('Strength lent! Celebrated this milestone.');
      }
    } catch (err) {
      console.error('Error celebrating story:', err);
    }
  };

  // Handle Comments
  const handleAddComment = async (storyId: string) => {
    const text = newCommentTexts[storyId]?.trim();
    if (!text) return;

    setIsSubmittingComment(prev => ({ ...prev, [storyId]: true }));
    try {
      const res = await fetch(`/api/testimonials/${storyId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          content: text,
          author_name: user?.username || 'Peer Alumnus'
        })
      });
      if (res.ok) {
        const data = await res.json();
        setStories(prev => prev.map(s => s.id === storyId ? { ...s, comments: data.comments } : s));
        setNewCommentTexts(prev => ({ ...prev, [storyId]: '' }));
        setExpandedComments(prev => ({ ...prev, [storyId]: true }));
        showToast('Your words of encouragement have been posted.');
      }
    } catch (err) {
      console.error('Error submitting comment:', err);
    } finally {
      setIsSubmittingComment(prev => ({ ...prev, [storyId]: false }));
    }
  };

  // Handle Submit Story
  const handleSubmitStory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storyForm.content.trim()) {
      alert('Please write your journey narrative.');
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
        setIsComposeOpen(false);
        setStoryForm({
          title: '',
          author_name: user?.username || '',
          role: '',
          category: 'career',
          time_served: '',
          years_free: '',
          tags: '',
          content: '',
          advice: ''
        });
        await fetchStories();
        showToast('Your journey was published! Thank you for shining a light.');
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to submit journey.');
      }
    } catch (err) {
      console.error('Error publishing story:', err);
      alert('An error occurred while publishing your story.');
    } finally {
      setIsSubmittingStory(false);
    }
  };

  // Handle Delete Story
  const handleDeleteConfirm = async () => {
    if (!storyToDelete) return;
    try {
      const res = await fetch(`/api/testimonials/${storyToDelete.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setStories(prev => prev.filter(s => s.id !== storyToDelete.id));
        showToast('Story removed successfully.');
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete story.');
      }
    } catch (err) {
      console.error('Error deleting story:', err);
    } finally {
      setStoryToDelete(null);
    }
  };

  // Share / Copy Quote
  const handleShareStory = (story: Testimonial) => {
    const textToCopy = `"${story.title || 'Success Story'}" by ${story.author_name} (${story.role || 'Alumnus'})\n\n"${story.content.substring(0, 200)}..."\n\nRead more inspiring reintegration narratives on The Yard.`;
    navigator.clipboard.writeText(textToCopy);
    showToast('Story excerpt copied to clipboard!');
  };

  // Filtering and Sorting
  const filteredStories = stories.filter(story => {
    // Category match
    const storyCat = story.category || 'general';
    if (selectedCategory !== 'all' && storyCat !== selectedCategory) {
      return false;
    }

    // Search query match
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = story.title?.toLowerCase().includes(q);
      const matchContent = story.content.toLowerCase().includes(q);
      const matchAuthor = story.author_name.toLowerCase().includes(q);
      const matchRole = story.role?.toLowerCase().includes(q);
      const matchAdvice = story.advice?.toLowerCase().includes(q);
      const matchTags = story.tags?.toLowerCase().includes(q);
      if (!matchTitle && !matchContent && !matchAuthor && !matchRole && !matchAdvice && !matchTags) {
        return false;
      }
    }

    return true;
  }).sort((a, b) => {
    if (sortBy === 'celebrated') {
      return (b.likes_count || 0) - (a.likes_count || 0);
    }
    // Default: recent
    return new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime();
  });

  const totalCelebrations = stories.reduce((acc, s) => acc + (s.likes_count || 0), 0);

  const isUserAuthorOrAdmin = (story: Testimonial) => {
    if (!user) return false;
    const isAdmin = (user as any).is_admin === 1 || (user as any).role === 'admin' || (user as any).role === 'super_admin';
    const isAuthor = story.user_id === user.id;
    return isAdmin || isAuthor;
  };

  return (
    <div className="space-y-10">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 right-6 z-50 bg-[#141414] text-[#E4E3E0] px-5 py-3 border border-[#E4E3E0]/20 shadow-2xl text-xs font-mono tracking-wide flex items-center gap-3"
          >
            <Check size={16} className="text-emerald-400" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Header */}
      <header className="border-b border-[#141414]/15 pb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="space-y-3 max-w-3xl">
          <div className="text-xs uppercase tracking-widest font-mono text-[#141414]/60 flex items-center gap-2">
            <Sparkles size={14} className="text-amber-700" />
            <span>The Lighthouse // Voices of Reintegration</span>
          </div>
          <h2 className="text-5xl md:text-6xl font-serif italic tracking-tight text-[#141414]">
            Success Stories
          </h2>
          <p className="text-lg opacity-70 leading-relaxed">
            First-person accounts of transformation, careers, housing stability, and renewed freedom.
            Real testimonies proving that your past does not define where you finish.
          </p>

          {/* Unboxed Metadata Stats Strip (No static pill enclosures) */}
          <div className="pt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#141414]/70 font-mono">
            <span className="font-bold text-[#141414]">{stories.length} Published Narratives</span>
            <span aria-hidden="true">·</span>
            <span>{totalCelebrations} Strength Celebrations</span>
            <span aria-hidden="true">·</span>
            <span>100% Peer-Authored Community</span>
          </div>
        </div>

        <button
          onClick={() => {
            setStoryForm(prev => ({ ...prev, author_name: user?.username || '' }));
            setIsComposeOpen(true);
          }}
          className="bg-[#141414] text-[#E4E3E0] px-6 py-4 uppercase tracking-widest text-xs font-bold hover:bg-[#141414]/90 active:scale-[0.99] transition-all flex items-center gap-2 shrink-0 border border-[#141414] shadow-sm"
        >
          <Plus size={16} /> Share Your Journey
        </button>
      </header>

      {/* Search & Sort Controls */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        <div className="md:col-span-8 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 opacity-40" size={18} />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search stories by keyword, trade, milestone, or author..."
            className="w-full bg-white border border-[#141414] py-3.5 pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#141414]/15 transition-all"
          />
        </div>

        <div className="md:col-span-4 flex items-center justify-end gap-2 bg-white border border-[#141414] px-3 py-1.5">
          <span className="text-[11px] uppercase tracking-wider font-mono opacity-50 shrink-0">Sort:</span>
          <button
            onClick={() => setSortBy('recent')}
            className={`px-3 py-1.5 text-xs font-medium transition-colors ${
              sortBy === 'recent'
                ? 'bg-[#141414] text-[#E4E3E0]'
                : 'text-[#141414]/70 hover:text-[#141414]'
            }`}
          >
            Most Recent
          </button>
          <button
            onClick={() => setSortBy('celebrated')}
            className={`px-3 py-1.5 text-xs font-medium transition-colors ${
              sortBy === 'celebrated'
                ? 'bg-[#141414] text-[#E4E3E0]'
                : 'text-[#141414]/70 hover:text-[#141414]'
            }`}
          >
            Most Celebrated
          </button>
        </div>
      </div>

      {/* Interactive Category Filter Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-[#141414]/10 scrollbar-none">
        {Object.entries(CATEGORY_MAP).map(([key, config]) => {
          const Icon = config.icon;
          const isActive = selectedCategory === key;
          return (
            <button
              key={key}
              onClick={() => setSelectedCategory(key)}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-mono uppercase tracking-wider whitespace-nowrap transition-all border ${
                isActive
                  ? 'bg-[#141414] text-[#E4E3E0] border-[#141414]'
                  : 'bg-white/80 hover:bg-white text-[#141414] border-[#141414]/20 hover:border-[#141414]'
              }`}
            >
              <Icon size={14} className={isActive ? 'text-amber-300' : 'opacity-60'} />
              <span>{config.label}</span>
            </button>
          );
        })}
      </div>

      {/* Stories Listing */}
      {isLoading ? (
        <div className="p-16 text-center font-serif italic text-xl opacity-60">
          Gathering community journeys...
        </div>
      ) : filteredStories.length === 0 ? (
        <div className="bg-white border border-[#141414] p-12 text-center space-y-4">
          <Quote size={32} className="mx-auto opacity-30" />
          <h3 className="text-xl font-serif italic">No stories found matching your filter</h3>
          <p className="text-sm opacity-60 max-w-md mx-auto">
            {searchQuery
              ? `No narratives found for "${searchQuery}". Try different keywords or clear your search.`
              : 'Be the first to share an inspiring breakthrough in this category.'}
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('all');
            }}
            className="text-xs font-bold uppercase tracking-widest underline hover:opacity-75 pt-2"
          >
            Reset all filters
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {filteredStories.map((story) => {
            const isExpanded = expandedStoryIds[story.id] || false;
            const commentsOpen = expandedComments[story.id] || false;
            const commentsCount = story.comments?.length || 0;
            const likesCount = story.likes_count || 0;
            const isAuthor = isUserAuthorOrAdmin(story);

            // Format tags if present
            const tagsList = story.tags
              ? story.tags.split(',').map(t => t.trim()).filter(Boolean)
              : [];

            return (
              <article
                key={story.id}
                className="bg-white border border-[#141414] transition-shadow hover:shadow-md"
              >
                {/* Story Header */}
                <div className="p-6 md:p-8 border-b border-[#141414]/10">
                  {/* Clean unboxed metadata header */}
                  <div className="flex flex-wrap justify-between items-start gap-4 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#141414] text-[#E4E3E0] flex items-center justify-center font-serif text-lg font-bold">
                        {story.author_name ? story.author_name.charAt(0).toUpperCase() : 'A'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm tracking-wide text-[#141414]">
                            {story.author_name}
                          </span>
                          {story.role && (
                            <>
                              <span className="text-[#141414]/40 text-xs" aria-hidden="true">·</span>
                              <span className="text-xs font-medium text-[#141414]/75">
                                {story.role}
                              </span>
                            </>
                          )}
                        </div>
                        {/* Unboxed subline with clean dot separators */}
                        <div className="flex flex-wrap items-center gap-x-2 text-[11px] font-mono text-[#141414]/60 mt-0.5">
                          {story.years_free && (
                            <>
                              <span>{story.years_free}</span>
                              <span aria-hidden="true">·</span>
                            </>
                          )}
                          {story.time_served && (
                            <>
                              <span>Served: {story.time_served}</span>
                              <span aria-hidden="true">·</span>
                            </>
                          )}
                          <span>
                            {CATEGORY_MAP[story.category || 'general']?.label || 'General Reintegration'}
                          </span>
                          {story.created_at && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span>{new Date(story.created_at).toLocaleDateString()}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions Menu (Share, Delete if Author/Admin) */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleShareStory(story)}
                        className="p-2 text-[#141414]/60 hover:text-[#141414] hover:bg-[#141414]/5 rounded-sm transition-colors"
                        title="Copy Quote & Excerpt"
                        aria-label="Share story excerpt"
                      >
                        <Share2 size={16} />
                      </button>

                      {isAuthor && (
                        <button
                          onClick={() => setStoryToDelete(story)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-sm transition-colors"
                          title="Delete Story"
                          aria-label="Delete your story"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="text-2xl md:text-3xl font-serif italic text-[#141414] mb-4 leading-tight">
                    {story.title || 'My Reintegration Story'}
                  </h3>

                  {/* Narrative Body */}
                  <div className="text-base md:text-lg leading-relaxed text-[#141414]/85 whitespace-pre-wrap font-sans">
                    {isExpanded ? (
                      story.content
                    ) : (
                      <>
                        {story.content.length > 360
                          ? `${story.content.substring(0, 360)}...`
                          : story.content}
                      </>
                    )}
                  </div>

                  {story.content.length > 360 && (
                    <button
                      onClick={() => setExpandedStoryIds(prev => ({ ...prev, [story.id]: !isExpanded }))}
                      className="mt-3 text-xs font-mono font-bold uppercase tracking-wider text-[#141414] hover:opacity-70 flex items-center gap-1"
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp size={14} /> Collapse Story
                        </>
                      ) : (
                        <>
                          <ChevronDown size={14} /> Read Full Journey
                        </>
                      )}
                    </button>
                  )}

                  {/* Words of Wisdom / Advice Box */}
                  {story.advice && (
                    <div className="mt-6 p-5 bg-[#141414]/[0.03] border-l-4 border-[#141414] space-y-1.5">
                      <div className="text-[11px] font-mono uppercase tracking-widest font-bold text-[#141414]/60 flex items-center gap-2">
                        <Quote size={13} className="text-amber-800" />
                        <span>Key Advice for Brothers & Sisters Walking Out Today</span>
                      </div>
                      <p className="text-sm italic font-serif leading-relaxed text-[#141414]">
                        "{story.advice}"
                      </p>
                    </div>
                  )}

                  {/* Clean unboxed tags with typographic separators */}
                  {tagsList.length > 0 && (
                    <div className="mt-5 flex flex-wrap items-center gap-x-2 text-xs font-mono text-[#141414]/60">
                      <span className="font-semibold text-[#141414]/80">Milestones:</span>
                      {tagsList.map((tag, idx) => (
                        <React.Fragment key={idx}>
                          <span className="hover:text-[#141414] transition-colors">
                            {tag}
                          </span>
                          {idx < tagsList.length - 1 && <span aria-hidden="true">·</span>}
                        </React.Fragment>
                      ))}
                    </div>
                  )}
                </div>

                {/* Story Action Bar */}
                <div className="p-4 md:px-8 bg-[#141414]/[0.02] flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    {/* Celebrate / Lend Strength Button */}
                    <button
                      onClick={() => handleLike(story.id)}
                      className="flex items-center gap-2 px-4 py-2 bg-white border border-[#141414] text-xs font-mono uppercase tracking-wider hover:bg-[#141414] hover:text-[#E4E3E0] transition-colors"
                      title="Lend Strength / Celebrate"
                    >
                      <Heart size={14} className="text-rose-600 fill-rose-600/20" />
                      <span>Lend Strength</span>
                      <span className="font-bold ml-1">{likesCount}</span>
                    </button>

                    {/* Encouragement / Comments Toggle Button */}
                    <button
                      onClick={() => setExpandedComments(prev => ({ ...prev, [story.id]: !commentsOpen }))}
                      className="flex items-center gap-2 px-4 py-2 bg-white border border-[#141414]/40 text-xs font-mono uppercase tracking-wider hover:border-[#141414] transition-colors"
                    >
                      <MessageSquare size={14} className="opacity-70" />
                      <span>Encouragement ({commentsCount})</span>
                      {commentsOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </button>
                  </div>

                  {/* Direct Contact Kite Option if story author has account */}
                  <div className="flex items-center gap-2">
                    {story.user_id && story.user_id !== user?.id && (
                      <button
                        onClick={() => {
                          if (onNavigateToKites) {
                            onNavigateToKites(story.user_id!, story.author_name);
                          } else {
                            showToast(`Opening Kites to message ${story.author_name}...`);
                          }
                        }}
                        className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-[#141414]/70 hover:text-[#141414] hover:underline"
                      >
                        <Send size={13} />
                        <span>Send Kite to Author</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Collapsible Encouragement Thread */}
                <AnimatePresence>
                  {commentsOpen && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="border-t border-[#141414]/10 bg-white p-6 md:p-8 space-y-6 overflow-hidden"
                    >
                      <h4 className="text-xs font-mono uppercase tracking-widest font-bold text-[#141414]/60">
                        Peer Words of Encouragement
                      </h4>

                      {/* Comments List */}
                      {commentsCount === 0 ? (
                        <p className="text-xs font-mono opacity-50 italic">
                          No messages yet. Be the first to congratulate and encourage this brother/sister.
                        </p>
                      ) : (
                        <div className="space-y-4">
                          {story.comments?.map((comment) => (
                            <div
                              key={comment.id}
                              className="p-4 bg-[#141414]/[0.02] border-l-2 border-[#141414]/30 space-y-1"
                            >
                              <div className="flex justify-between items-center text-xs">
                                <span className="font-bold text-[#141414]">{comment.author_name}</span>
                                {comment.created_at && (
                                  <span className="text-[10px] font-mono opacity-50">
                                    {new Date(comment.created_at).toLocaleString([], {
                                      month: 'short',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-[#141414]/80 leading-relaxed">
                                {comment.content}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Comment Form */}
                      <div className="pt-2">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newCommentTexts[story.id] || ''}
                            onChange={e => setNewCommentTexts(prev => ({ ...prev, [story.id]: e.target.value }))}
                            onKeyDown={e => {
                              if (e.key === 'Enter') handleAddComment(story.id);
                            }}
                            placeholder="Add your words of respect or encouragement..."
                            className="flex-1 bg-white border border-[#141414] px-4 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#141414]"
                          />
                          <button
                            onClick={() => handleAddComment(story.id)}
                            disabled={isSubmittingComment[story.id] || !newCommentTexts[story.id]?.trim()}
                            className="bg-[#141414] text-[#E4E3E0] px-5 py-2.5 text-xs font-mono uppercase tracking-wider font-bold hover:bg-[#141414]/90 disabled:opacity-40 transition-opacity flex items-center gap-1.5"
                          >
                            <Send size={12} /> Post
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </article>
            );
          })}
        </div>
      )}

      {/* Compose Journey Modal */}
      <AnimatePresence>
        {isComposeOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-[#E4E3E0] w-full max-w-3xl border border-[#141414] shadow-2xl my-8 overflow-hidden max-h-[90vh] flex flex-col"
            >
              {/* Modal Header */}
              <div className="bg-[#141414] text-[#E4E3E0] p-6 flex justify-between items-start shrink-0">
                <div>
                  <div className="text-[11px] font-mono uppercase tracking-widest text-amber-300">
                    Voice of Resilience
                  </div>
                  <h3 className="text-2xl font-serif italic font-bold">
                    Share Your Reintegration Journey
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsComposeOpen(false)}
                  className="p-1 hover:bg-white/10 rounded-sm transition-colors text-xl font-bold font-mono"
                  aria-label="Close modal"
                >
                  ✕
                </button>
              </div>

              {/* Modal Form */}
              <form onSubmit={handleSubmitStory} className="p-6 md:p-8 space-y-6 overflow-y-auto flex-1">
                {/* Title */}
                <div>
                  <label className="block text-xs uppercase tracking-widest font-mono font-bold mb-2">
                    Story Headline / Title *
                  </label>
                  <input
                    required
                    type="text"
                    value={storyForm.title}
                    onChange={e => setStoryForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g., From a 10-Year Term to Licensed Commercial Electrician"
                    className="w-full bg-white border border-[#141414] p-3.5 text-base focus:outline-none focus:ring-2 focus:ring-[#141414]/20"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Author Name */}
                  <div>
                    <label className="block text-xs uppercase tracking-widest font-mono font-bold mb-2">
                      Author Name or Alias
                    </label>
                    <input
                      type="text"
                      value={storyForm.author_name}
                      onChange={e => setStoryForm(prev => ({ ...prev, author_name: e.target.value }))}
                      placeholder="Your name or preferred alias"
                      className="w-full bg-white border border-[#141414] p-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#141414]"
                    />
                  </div>

                  {/* Role / Current Milestone */}
                  <div>
                    <label className="block text-xs uppercase tracking-widest font-mono font-bold mb-2">
                      Current Milestone / Role
                    </label>
                    <input
                      type="text"
                      value={storyForm.role}
                      onChange={e => setStoryForm(prev => ({ ...prev, role: e.target.value }))}
                      placeholder="e.g., Union Carpenter, Homeowner, MSW Student"
                      className="w-full bg-white border border-[#141414] p-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#141414]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Category */}
                  <div>
                    <label className="block text-xs uppercase tracking-widest font-mono font-bold mb-2">
                      Category *
                    </label>
                    <select
                      value={storyForm.category}
                      onChange={e => setStoryForm(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full bg-white border border-[#141414] p-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#141414]"
                    >
                      <option value="career">Career & Trades</option>
                      <option value="entrepreneurship">Business & Founders</option>
                      <option value="housing">Housing & Stability</option>
                      <option value="education">Education & Degrees</option>
                      <option value="off_paper">Off Paper & Discharged</option>
                      <option value="family">Family & Personal</option>
                      <option value="mindset">Sobriety & Mindset</option>
                      <option value="general">General Journey</option>
                    </select>
                  </div>

                  {/* Time Served */}
                  <div>
                    <label className="block text-xs uppercase tracking-widest font-mono font-bold mb-2">
                      Time Served (Optional)
                    </label>
                    <input
                      type="text"
                      value={storyForm.time_served}
                      onChange={e => setStoryForm(prev => ({ ...prev, time_served: e.target.value }))}
                      placeholder="e.g., 7 years State / 4 years Fed"
                      className="w-full bg-white border border-[#141414] p-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#141414]"
                    />
                  </div>

                  {/* Years Free */}
                  <div>
                    <label className="block text-xs uppercase tracking-widest font-mono font-bold mb-2">
                      Time Free / Off Paper
                    </label>
                    <input
                      type="text"
                      value={storyForm.years_free}
                      onChange={e => setStoryForm(prev => ({ ...prev, years_free: e.target.value }))}
                      placeholder="e.g., 3 years free · Off Paper"
                      className="w-full bg-white border border-[#141414] p-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#141414]"
                    />
                  </div>
                </div>

                {/* Highlight Tags */}
                <div>
                  <label className="block text-xs uppercase tracking-widest font-mono font-bold mb-2">
                    Key Highlights / Tags (Comma-separated)
                  </label>
                  <input
                    type="text"
                    value={storyForm.tags}
                    onChange={e => setStoryForm(prev => ({ ...prev, tags: e.target.value }))}
                    placeholder="e.g., Commercial CDL, Union Apprenticeship, Off Paper, Clean Record"
                    className="w-full bg-white border border-[#141414] p-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#141414]"
                  />
                </div>

                {/* Story Prompts Accordion */}
                <div className="border border-[#141414]/20 bg-white/60 p-4 rounded-sm">
                  <button
                    type="button"
                    onClick={() => setShowPrompts(!showPrompts)}
                    className="w-full flex justify-between items-center text-xs font-mono font-bold uppercase tracking-wider text-[#141414] text-left"
                  >
                    <span className="flex items-center gap-1.5">
                      <Sparkles size={14} className="text-amber-700" /> Need writing inspiration? Click for helpful prompts
                    </span>
                    {showPrompts ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                  {showPrompts && (
                    <ul className="mt-3 text-xs space-y-1.5 opacity-80 list-disc list-inside font-sans">
                      <li>What was the scariest or most uncertain part of your first 30 days home?</li>
                      <li>What was the key turning point or moment of clarity that changed your trajectory?</li>
                      <li>Which resource, mentor, or habit saved you when things felt hard?</li>
                      <li>Where are you now, and what does true freedom feel like in your daily routine?</li>
                    </ul>
                  )}
                </div>

                {/* Narrative Textarea */}
                <div>
                  <label className="block text-xs uppercase tracking-widest font-mono font-bold mb-2">
                    Your Journey Narrative *
                  </label>
                  <textarea
                    required
                    rows={6}
                    value={storyForm.content}
                    onChange={e => setStoryForm(prev => ({ ...prev, content: e.target.value }))}
                    placeholder="Tell your story. Where you began, what obstacles you overcame, and where you stand today..."
                    className="w-full bg-white border border-[#141414] p-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#141414]/20 leading-relaxed font-sans"
                  />
                </div>

                {/* Advice for returning citizens */}
                <div>
                  <label className="block text-xs uppercase tracking-widest font-mono font-bold mb-2">
                    Key Advice for Someone Walking Out the Gates Today
                  </label>
                  <textarea
                    rows={2}
                    value={storyForm.advice}
                    onChange={e => setStoryForm(prev => ({ ...prev, advice: e.target.value }))}
                    placeholder="One piece of direct, unfiltered truth or wisdom that will protect their freedom..."
                    className="w-full bg-white border border-[#141414] p-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#141414] italic"
                  />
                </div>

                {/* Buttons */}
                <div className="flex justify-end gap-3 pt-4 border-t border-[#141414]/15">
                  <button
                    type="button"
                    onClick={() => setIsComposeOpen(false)}
                    className="px-6 py-3 border border-[#141414] text-xs font-mono uppercase tracking-widest hover:bg-black/5 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingStory || !storyForm.content.trim() || !storyForm.title.trim()}
                    className="bg-[#141414] text-[#E4E3E0] px-8 py-3 text-xs font-mono uppercase tracking-widest font-bold hover:bg-[#141414]/90 disabled:opacity-50 transition-opacity flex items-center gap-2"
                  >
                    <Send size={14} />
                    {isSubmittingStory ? 'Publishing...' : 'Publish Journey'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirmation Dialog for Deletion */}
      {storyToDelete && (
        <ConfirmationDialog
          isOpen={!!storyToDelete}
          title="Delete Success Story"
          message={`Are you sure you want to delete "${storyToDelete.title || 'this story'}"? This action cannot be undone.`}
          confirmText="Delete Story"
          cancelText="Cancel"
          type="danger"
          onConfirm={handleDeleteConfirm}
          onCancel={() => setStoryToDelete(null)}
        />
      )}
    </div>
  );
}
