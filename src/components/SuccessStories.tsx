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
  User,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Briefcase,
  Home as HomeIcon,
  GraduationCap,
  Award,
  Users,
  Bookmark,
  Flame,
  AlertCircle,
  Compass
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../AuthContext';
import { Testimonial } from '../types';
import ConfirmationDialog from './ConfirmationDialog';

interface SuccessStoriesProps {
  onNavigateToKites?: (userId: string, userName: string) => void;
  onNavigateTab?: (tab: string) => void;
  openComposerOnMount?: boolean;
  onComposerOpened?: () => void;
}

const CATEGORY_MAP: Record<string, { label: string; icon: any }> = {
  all: { label: 'All Journeys', icon: BookOpen },
  career: { label: 'Career & Trades', icon: Briefcase },
  entrepreneurship: { label: 'Business & Founders', icon: Award },
  housing: { label: 'Housing & Stability', icon: HomeIcon },
  education: { label: 'Education & Degrees', icon: GraduationCap },
  off_paper: { label: 'Off Paper & Discharged', icon: ShieldCheck },
  family: { label: 'Family & Reconnection', icon: Users },
  mindset: { label: 'Sobriety & Mindset', icon: Sparkles }
};

const QUICK_ENCOURAGEMENTS = [
  'Respect on your journey — thank you for lighting the path!',
  'Needed to read this today. Your consistency is inspiring.',
  'Salute! Proof that our past never defines our future.',
  'Congratulations on reaching this milestone!'
];

const STORY_TEMPLATES = [
  {
    label: 'Career & Trade Breakthrough',
    category: 'career',
    promptContent:
      'When I first came home, finding an employer willing to look past my record felt overwhelming. My turning point came when I enrolled in vocational training and showed up early every single day. Today, I work full-time in my trade and mentor others walking out the gates.',
    promptAdvice:
      'Be upfront about your journey, keep your certifications organized in a folder, and let your work ethic speak louder than stigma.'
  },
  {
    label: 'Off-Paper & Parole Completion',
    category: 'off_paper',
    promptContent:
      'Completing my supervision took patience, discipline, and keeping every single appointment and check-in documented. Walking out of my final parole meeting off paper was the proudest moment I have shared with my family.',
    promptAdvice:
      'Treat every check-in like a business meeting. Save every receipt and verification slip—compliance today buys total freedom tomorrow.'
  },
  {
    label: 'First Own Apartment & Stability',
    category: 'housing',
    promptContent:
      'I started in transitional housing with two bags to my name. By sticking to a strict budget, building my credit score from scratch, and getting references from my supervisor, I finally signed the lease on my own apartment.',
    promptAdvice:
      'Bring references from your mentor or employer when meeting independent landlords in person.'
  }
];

export default function SuccessStories({
  onNavigateToKites,
  openComposerOnMount = false,
  onComposerOpened
}: SuccessStoriesProps) {
  const { user, token } = useAuth();
  const [stories, setStories] = useState<Testimonial[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'celebrated' | 'saved'>('recent');

  // Saved / Bookmarked story IDs in localStorage
  const bookmarkStorageKey = user?.id
    ? `the_yard_saved_stories_${user.id}`
    : 'the_yard_saved_stories_guest';
  const [savedStoryIds, setSavedStoryIds] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(bookmarkStorageKey);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  // Expanded read state
  const [expandedStoryIds, setExpandedStoryIds] = useState<Record<string, boolean>>({});

  // Comments visibility state
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [newCommentTexts, setNewCommentTexts] = useState<Record<string, string>>({});
  const [isSubmittingComment, setIsSubmittingComment] = useState<Record<string, boolean>>({});

  // Compose Modal State
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [showPrompts, setShowPrompts] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
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
    setTimeout(() => setToastMessage(null), 3500);
  };

  useEffect(() => {
    if (openComposerOnMount) {
      setStoryForm(prev => ({ ...prev, author_name: user?.username || prev.author_name }));
      setIsComposeOpen(true);
      if (onComposerOpened) onComposerOpened();
    }
  }, [openComposerOnMount, user?.username, onComposerOpened]);

  const fetchStories = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/testimonials', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStories(Array.isArray(data) ? data : []);
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

  const toggleSaveStory = (storyId: string) => {
    setSavedStoryIds(prev => {
      const exists = prev.includes(storyId);
      const next = exists ? prev.filter(id => id !== storyId) : [...prev, storyId];
      try {
        localStorage.setItem(bookmarkStorageKey, JSON.stringify(next));
      } catch {
        // ignore storage error
      }
      showToast(
        exists
          ? 'Removed story from your saved inspiration list.'
          : 'Saved story to your personal inspiration list!'
      );
      return next;
    });
  };

  // Handle Like / Celebrate
  const handleLike = async (id: string) => {
    setStories(prev =>
      prev.map(s => (s.id === id ? { ...s, likes_count: (s.likes_count || 0) + 1 } : s))
    );

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
        setStories(prev =>
          prev.map(s => (s.id === id ? { ...s, likes_count: data.likes_count } : s))
        );
        showToast('Strength lent! You celebrated this brother/sister’s milestone.');
      }
    } catch (err) {
      console.error('Error celebrating story:', err);
    }
  };

  // Handle Comments
  const handleAddComment = async (storyId: string, customText?: string) => {
    const text = (customText ?? newCommentTexts[storyId])?.trim();
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
        setStories(prev =>
          prev.map(s => (s.id === storyId ? { ...s, comments: data.comments } : s))
        );
        if (!customText) {
          setNewCommentTexts(prev => ({ ...prev, [storyId]: '' }));
        }
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
    setFormError(null);

    if (!storyForm.title.trim() || !storyForm.content.trim()) {
      setFormError('Please provide both a headline and your journey narrative.');
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
        showToast('Your success story was published! Thank you for inspiring the community.');
      } else {
        const data = await res.json();
        setFormError(data.error || 'Failed to submit your story.');
      }
    } catch (err) {
      console.error('Error publishing story:', err);
      setFormError('An unexpected error occurred while publishing your story.');
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
        showToast('Success story removed.');
      }
    } catch (err) {
      console.error('Error deleting story:', err);
    } finally {
      setStoryToDelete(null);
    }
  };

  // Share / Copy Quote
  const handleShareStory = (story: Testimonial) => {
    const textToCopy = `"${story.title || 'Success Story'}" by ${story.author_name} (${story.role || 'Alumnus'})\n\n"${story.content.substring(0, 220)}..."\n\nShared from The Yard · Success Stories`;
    navigator.clipboard.writeText(textToCopy);
    showToast('Story excerpt copied to clipboard!');
  };

  // Filtering and Sorting
  const filteredStories = stories
    .filter(story => {
      if (sortBy === 'saved' && !savedStoryIds.includes(story.id)) {
        return false;
      }

      const storyCat = story.category || 'general';
      if (selectedCategory !== 'all' && storyCat !== selectedCategory) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = story.title?.toLowerCase().includes(q);
        const matchContent = story.content.toLowerCase().includes(q);
        const matchAuthor = story.author_name.toLowerCase().includes(q);
        const matchRole = story.role?.toLowerCase().includes(q);
        const matchAdvice = story.advice?.toLowerCase().includes(q);
        const matchTags = story.tags?.toLowerCase().includes(q);
        if (
          !matchTitle &&
          !matchContent &&
          !matchAuthor &&
          !matchRole &&
          !matchAdvice &&
          !matchTags
        ) {
          return false;
        }
      }

      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'celebrated') {
        return (b.likes_count || 0) - (a.likes_count || 0);
      }
      return new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime();
    });

  const totalCelebrations = stories.reduce((acc, s) => acc + (s.likes_count || 0), 0);
  const totalComments = stories.reduce((acc, s) => acc + (s.comments?.length || 0), 0);

  // Spotlight story: highest celebrated story
  const spotlightStory =
    stories.length > 0
      ? [...stories].sort((a, b) => (b.likes_count || 0) - (a.likes_count || 0))[0]
      : null;

  const isUserAuthorOrAdmin = (story: Testimonial) => {
    if (!user) return false;
    const isAdmin =
      (user as any).is_admin === 1 ||
      (user as any).role === 'admin' ||
      (user as any).role === 'super_admin';
    const isAuthor = story.user_id === user.id;
    return isAdmin || isAuthor;
  };

  return (
    <div className="space-y-8">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="fixed top-20 right-6 z-50 bg-[#261F1A] text-[#F7F3EC] px-5 py-3.5 rounded-xl border border-[#C69249]/40 shadow-xl text-xs font-medium flex items-center gap-3"
          >
            <Check size={16} className="text-[#C69249] shrink-0" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Deep Espresso Editorial Hero Banner */}
      <section className="bg-[#261F1A] text-[#F7F3EC] rounded-2xl p-7 md:p-9 shadow-sm relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-[#C69249] font-semibold">
              <Sparkles size={13} /> THE LIGHTHOUSE · FORMERLY INCARCERATED VOICES
            </div>
            <h2 className="text-3xl md:text-5xl font-serif tracking-tight leading-tight">
              Success Stories & Re-Entry Triumphs
            </h2>
            <p className="text-sm md:text-base text-[#D6CEC2] leading-relaxed">
              First-person accounts of transformation, union trades, business ownership, housing stability, and getting off paper. Share your breakthroughs or draw strength from peers who walked the same yard.
            </p>

            {/* Unboxed Metadata Metrics Line */}
            <div className="pt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#C69249] font-mono tabular-nums">
              <span className="font-semibold text-[#F7F3EC]">{stories.length} Published Stories</span>
              <span aria-hidden="true">·</span>
              <span>{totalCelebrations} Strength Salutes</span>
              <span aria-hidden="true">·</span>
              <span>{totalComments} Peer Encouragements</span>
              <span aria-hidden="true">·</span>
              <span>{savedStoryIds.length} Saved in Your Collection</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => {
                setStoryForm(prev => ({ ...prev, author_name: user?.username || prev.author_name }));
                setFormError(null);
                setIsComposeOpen(true);
              }}
              className="bg-[#984B27] hover:bg-[#823E1E] text-[#F7F3EC] px-6 py-3.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 shadow-sm cursor-pointer"
            >
              <Plus size={16} /> Post Your Success Story
            </button>
          </div>
        </div>

        {/* Featured Community Spotlight Strip inside Hero */}
        {spotlightStory && (
          <div className="mt-7 pt-6 border-t border-white/15 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1 max-w-3xl">
              <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-[#C69249]">
                <Flame size={12} /> MOST CELEBRATED COMMUNITY STORY
              </div>
              <div className="text-lg font-serif text-[#F7F3EC]">
                “{spotlightStory.title || 'Reintegration Journey'}” —{' '}
                <span className="text-[#C69249] font-sans text-sm font-semibold">
                  {spotlightStory.author_name}
                </span>
                {spotlightStory.role && (
                  <span className="text-xs text-[#B8AFA4] font-sans"> · {spotlightStory.role}</span>
                )}
              </div>
              {spotlightStory.advice && (
                <p className="text-xs text-[#D6CEC2] italic">
                  Advice for peers: "{spotlightStory.advice}"
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                setExpandedStoryIds(prev => ({ ...prev, [spotlightStory.id]: true }));
                const el = document.getElementById(`story-card-${spotlightStory.id}`);
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-[#F7F3EC] text-xs font-medium transition-colors shrink-0 self-start md:self-center cursor-pointer"
            >
              Read Spotlight Story
            </button>
          </div>
        )}
      </section>

      {/* Search, Sort & Saved Filter Controls */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        <div className="md:col-span-7 relative">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 text-[#7D7166]"
            size={17}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search success stories by keyword, trade, facility, milestone, or author..."
            className="w-full bg-[#F6F2EB] border border-[#DDD4C7] rounded-xl py-3.5 pl-11 pr-4 text-sm text-[#261F1A] placeholder:text-[#8C7F73] focus:outline-none focus:border-[#984B27] transition-all"
          />
        </div>

        <div className="md:col-span-5 flex items-center justify-end gap-1.5 bg-[#F6F2EB] border border-[#DDD4C7] rounded-xl px-2.5 py-1.5">
          <span className="text-[11px] uppercase tracking-wider font-mono text-[#7D7166] px-1.5 shrink-0">
            View:
          </span>
          <button
            type="button"
            onClick={() => setSortBy('recent')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              sortBy === 'recent'
                ? 'bg-[#261F1A] text-[#F7F3EC]'
                : 'text-[#6E6359] hover:text-[#261F1A]'
            }`}
          >
            Most Recent
          </button>
          <button
            type="button"
            onClick={() => setSortBy('celebrated')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              sortBy === 'celebrated'
                ? 'bg-[#261F1A] text-[#F7F3EC]'
                : 'text-[#6E6359] hover:text-[#261F1A]'
            }`}
          >
            Most Celebrated
          </button>
          <button
            type="button"
            onClick={() => setSortBy('saved')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 cursor-pointer ${
              sortBy === 'saved'
                ? 'bg-[#984B27] text-[#F7F3EC]'
                : 'text-[#6E6359] hover:text-[#261F1A]'
            }`}
          >
            <Bookmark size={12} />
            <span>Saved ({savedStoryIds.length})</span>
          </button>
        </div>
      </div>

      {/* Interactive Category Filter Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {Object.entries(CATEGORY_MAP).map(([key, config]) => {
          const Icon = config.icon;
          const isActive = selectedCategory === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setSelectedCategory(key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all border cursor-pointer ${
                isActive
                  ? 'bg-[#984B27] text-[#F7F3EC] border-[#984B27] shadow-xs'
                  : 'bg-[#F6F2EB] hover:border-[#984B27] text-[#4A4037] border-[#D8CFC2]'
              }`}
            >
              <Icon size={13} className={isActive ? 'text-[#F7F3EC]' : 'text-[#984B27]'} />
              <span>{config.label}</span>
            </button>
          );
        })}
      </div>

      {/* Stories Listing */}
      {isLoading ? (
        <div className="p-16 text-center font-serif text-xl text-[#74695E]">
          Loading community success stories...
        </div>
      ) : filteredStories.length === 0 ? (
        <div className="bg-[#F6F2EB] border border-[#DDD4C7] rounded-2xl p-12 text-center space-y-4">
          <Quote size={32} className="mx-auto text-[#984B27]/50" />
          <h3 className="text-2xl font-serif text-[#261F1A]">
            No success stories match your current filter
          </h3>
          <p className="text-sm text-[#74695E] max-w-md mx-auto">
            {sortBy === 'saved'
              ? 'You have not bookmarked any success stories yet. Click the bookmark icon on any story to save it for daily motivation.'
              : searchQuery
              ? `No stories found for "${searchQuery}". Try clearing your search or exploring another category.`
              : 'Be the first to share an inspiring breakthrough in this category.'}
          </p>
          <div className="flex justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
                setSortBy('recent');
              }}
              className="px-4 py-2 rounded-xl border border-[#D8CFC2] text-xs font-semibold text-[#261F1A] hover:bg-[#261F1A]/5 cursor-pointer"
            >
              Reset Filters
            </button>
            <button
              type="button"
              onClick={() => setIsComposeOpen(true)}
              className="px-4 py-2 rounded-xl bg-[#984B27] text-[#F7F3EC] text-xs font-semibold hover:bg-[#823E1E] cursor-pointer"
            >
              Share a Story in This Category
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredStories.map(story => {
            const isExpanded = expandedStoryIds[story.id] || false;
            const commentsOpen = expandedComments[story.id] || false;
            const commentsCount = story.comments?.length || 0;
            const likesCount = story.likes_count || 0;
            const isAuthor = isUserAuthorOrAdmin(story);
            const isSaved = savedStoryIds.includes(story.id);

            const tagsList = story.tags
              ? story.tags
                  .split(',')
                  .map(t => t.trim())
                  .filter(Boolean)
              : [];

            return (
              <article
                id={`story-card-${story.id}`}
                key={story.id}
                className="bg-[#F6F2EB] border border-[#DDD4C7] rounded-2xl transition-all hover:border-[#C7BBAF] overflow-hidden shadow-xs"
              >
                {/* Story Main Content */}
                <div className="p-6 md:p-8 border-b border-[#E5DDD0]">
                  {/* Clean Author & Re-Entry Metadata Header */}
                  <div className="flex flex-wrap justify-between items-start gap-4 mb-5">
                    <div className="flex items-center gap-3.5">
                      <div className="w-11 h-11 rounded-full bg-[#261F1A] text-[#F7F3EC] flex items-center justify-center font-serif text-lg font-bold shrink-0">
                        {story.author_name ? story.author_name.charAt(0).toUpperCase() : 'A'}
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-base text-[#261F1A]">
                            {story.author_name}
                          </span>
                          {story.role && (
                            <>
                              <span className="text-[#8C7F73]" aria-hidden="true">
                                ·
                              </span>
                              <span className="text-xs font-semibold text-[#984B27]">
                                {story.role}
                              </span>
                            </>
                          )}
                        </div>

                        {/* Unboxed subline with clean dot separators */}
                        <div className="flex flex-wrap items-center gap-x-2 text-xs text-[#74695E] mt-0.5 font-mono">
                          {story.years_free && (
                            <>
                              <span className="text-emerald-800 font-semibold">
                                {story.years_free}
                              </span>
                              <span aria-hidden="true">·</span>
                            </>
                          )}
                          {story.time_served && (
                            <>
                              <span>Time Served: {story.time_served}</span>
                              <span aria-hidden="true">·</span>
                            </>
                          )}
                          <span>
                            {CATEGORY_MAP[story.category || 'general']?.label ||
                              'Reintegration Story'}
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

                    {/* Action Icons (Bookmark, Share, Delete) */}
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => toggleSaveStory(story.id)}
                        className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                          isSaved
                            ? 'bg-[#984B27]/15 border-[#984B27] text-[#984B27]'
                            : 'border-transparent text-[#74695E] hover:text-[#261F1A] hover:bg-[#261F1A]/5'
                        }`}
                        title={isSaved ? 'Saved in your collection' : 'Save story for inspiration'}
                        aria-label="Save story for inspiration"
                      >
                        <Bookmark size={16} className={isSaved ? 'fill-[#984B27]' : ''} />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleShareStory(story)}
                        className="p-2 text-[#74695E] hover:text-[#261F1A] hover:bg-[#261F1A]/5 rounded-xl transition-colors cursor-pointer"
                        title="Copy Story Quote & Excerpt"
                        aria-label="Share story excerpt"
                      >
                        <Share2 size={16} />
                      </button>

                      {isAuthor && (
                        <button
                          type="button"
                          onClick={() => setStoryToDelete(story)}
                          className="p-2 text-red-700 hover:bg-red-100/60 rounded-xl transition-colors cursor-pointer"
                          title="Delete Story"
                          aria-label="Delete your story"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Story Title */}
                  <h3 className="text-2xl md:text-3xl font-serif text-[#261F1A] mb-4 leading-snug">
                    {story.title || 'My Reintegration Journey'}
                  </h3>

                  {/* Narrative Body */}
                  <div className="text-base leading-relaxed text-[#3D342C] whitespace-pre-wrap">
                    {isExpanded
                      ? story.content
                      : story.content.length > 420
                      ? `${story.content.substring(0, 420)}...`
                      : story.content}
                  </div>

                  {story.content.length > 420 && (
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedStoryIds(prev => ({ ...prev, [story.id]: !isExpanded }))
                      }
                      className="mt-3 text-xs font-semibold text-[#984B27] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp size={14} /> Show Less
                        </>
                      ) : (
                        <>
                          <ChevronDown size={14} /> Read Full Story
                        </>
                      )}
                    </button>
                  )}

                  {/* Words of Wisdom / Takeaway Callout */}
                  {story.advice && (
                    <div className="mt-6 p-5 rounded-xl bg-[#EFE7DC]/80 border-l-4 border-[#984B27] space-y-1.5">
                      <div className="text-[11px] font-mono uppercase tracking-wider font-bold text-[#984B27] flex items-center gap-2">
                        <Quote size={13} />
                        <span>Advice for Brothers & Sisters Coming Home Today</span>
                      </div>
                      <p className="text-sm md:text-base font-serif italic leading-relaxed text-[#261F1A]">
                        “{story.advice}”
                      </p>
                    </div>
                  )}

                  {/* Clean unboxed milestone tags */}
                  {tagsList.length > 0 && (
                    <div className="mt-5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#74695E]">
                      <span className="font-semibold text-[#261F1A]">Key Milestones:</span>
                      {tagsList.map((tag, idx) => (
                        <React.Fragment key={idx}>
                          <button
                            type="button"
                            onClick={() => setSearchQuery(tag)}
                            className="hover:text-[#984B27] hover:underline transition-colors cursor-pointer"
                          >
                            {tag}
                          </button>
                          {idx < tagsList.length - 1 && <span aria-hidden="true">·</span>}
                        </React.Fragment>
                      ))}
                    </div>
                  )}
                </div>

                {/* Story Footer Action Bar */}
                <div className="px-6 py-4 md:px-8 bg-[#EFE7DC]/55 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-3">
                    {/* Lend Strength / Celebrate Button */}
                    <button
                      type="button"
                      onClick={() => handleLike(story.id)}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#F6F2EB] border border-[#D8CFC2] hover:border-[#984B27] text-xs font-semibold text-[#261F1A] transition-all cursor-pointer shadow-2xs"
                    >
                      <Heart size={14} className="text-[#984B27] fill-[#984B27]/20" />
                      <span>Lend Strength</span>
                      <span className="font-mono font-bold text-[#984B27] tabular-nums">
                        {likesCount}
                      </span>
                    </button>

                    {/* Encouragement / Comments Toggle Button */}
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedComments(prev => ({ ...prev, [story.id]: !commentsOpen }))
                      }
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#F6F2EB] border border-[#D8CFC2] hover:border-[#261F1A] text-xs font-semibold text-[#261F1A] transition-all cursor-pointer"
                    >
                      <MessageSquare size={14} className="text-[#74695E]" />
                      <span>Words of Encouragement ({commentsCount})</span>
                      {commentsOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    </button>
                  </div>

                  {/* Direct Kite to Author */}
                  <div className="flex items-center gap-3">
                    {story.user_id && story.user_id !== user?.id && (
                      <button
                        type="button"
                        onClick={() => {
                          if (onNavigateToKites) {
                            onNavigateToKites(story.user_id!, story.author_name);
                          } else {
                            showToast(`Opening Kites to message ${story.author_name}...`);
                          }
                        }}
                        className="flex items-center gap-1.5 text-xs font-semibold text-[#984B27] hover:underline cursor-pointer"
                      >
                        <Send size={13} />
                        <span>Send Kite to {story.author_name}</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Collapsible Peer Encouragement & Comments Drawer */}
                <AnimatePresence>
                  {commentsOpen && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="border-t border-[#E5DDD0] bg-[#FAF7F2] p-6 md:p-8 space-y-5 overflow-hidden"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <h4 className="text-xs font-mono uppercase tracking-wider font-bold text-[#7D7166]">
                          Community Support & Words of Encouragement
                        </h4>
                        <span className="text-[11px] text-[#74695E]">
                          Leave a supportive note or click a quick salute below
                        </span>
                      </div>

                      {/* Quick One-Click Encouragement Salutes */}
                      <div className="flex flex-wrap gap-2">
                        {QUICK_ENCOURAGEMENTS.map((msg, idx) => (
                          <button
                            key={idx}
                            type="button"
                            disabled={isSubmittingComment[story.id]}
                            onClick={() => handleAddComment(story.id, msg)}
                            className="text-xs px-3 py-1.5 rounded-full bg-[#EFE7DC] hover:bg-[#261F1A] hover:text-[#F7F3EC] text-[#4A4037] border border-[#D8CFC2] transition-colors cursor-pointer"
                          >
                            + “{msg}”
                          </button>
                        ))}
                      </div>

                      {/* Comments List */}
                      {commentsCount === 0 ? (
                        <p className="text-xs text-[#74695E] italic">
                          No comments yet. Be the first to congratulate {story.author_name} on this milestone.
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {story.comments?.map(comment => (
                            <div
                              key={comment.id}
                              className="p-4 rounded-xl bg-[#F6F2EB] border border-[#E2D9CC] space-y-1"
                            >
                              <div className="flex justify-between items-center text-xs">
                                <span className="font-semibold text-[#261F1A]">
                                  {comment.author_name}
                                </span>
                                {comment.created_at && (
                                  <span className="text-[11px] font-mono text-[#7D7166]">
                                    {new Date(comment.created_at).toLocaleString([], {
                                      month: 'short',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-[#3D342C] leading-relaxed">
                                {comment.content}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Custom Comment Form */}
                      <div className="flex gap-2 pt-1">
                        <input
                          type="text"
                          value={newCommentTexts[story.id] || ''}
                          onChange={e =>
                            setNewCommentTexts(prev => ({ ...prev, [story.id]: e.target.value }))
                          }
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleAddComment(story.id);
                          }}
                          placeholder={`Write a supportive message to ${story.author_name}...`}
                          className="flex-1 bg-[#F6F2EB] border border-[#D8CFC2] rounded-xl px-4 py-2.5 text-xs text-[#261F1A] focus:outline-none focus:border-[#984B27]"
                        />
                        <button
                          type="button"
                          onClick={() => handleAddComment(story.id)}
                          disabled={
                            isSubmittingComment[story.id] || !newCommentTexts[story.id]?.trim()
                          }
                          className="bg-[#261F1A] text-[#F7F3EC] px-5 py-2.5 rounded-xl text-xs font-semibold hover:bg-[#3A3028] disabled:opacity-40 transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <Send size={12} /> Post
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </article>
            );
          })}
        </div>
      )}

      {/* Compose Success Story Modal */}
      <AnimatePresence>
        {isComposeOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 15 }}
              className="bg-[#F6F2EB] w-full max-w-3xl border border-[#D8CFC2] rounded-2xl shadow-2xl my-8 overflow-hidden max-h-[92vh] flex flex-col"
            >
              {/* Modal Header */}
              <div className="bg-[#261F1A] text-[#F7F3EC] p-6 flex justify-between items-start shrink-0">
                <div>
                  <div className="text-[11px] font-mono uppercase tracking-[0.18em] text-[#C69249] flex items-center gap-1.5">
                    <Compass size={13} /> SHARE YOUR RE-ENTRY BREAKTHROUGH
                  </div>
                  <h3 className="text-2xl font-serif mt-1">
                    Post a Community Success Story
                  </h3>
                  <p className="text-xs text-[#B8AFA4] mt-1">
                    Your experience can give hope and practical guidance to someone in their first week home.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsComposeOpen(false)}
                  className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-base font-mono cursor-pointer"
                  aria-label="Close modal"
                >
                  ✕
                </button>
              </div>

              {/* Modal Form */}
              <form
                onSubmit={handleSubmitStory}
                className="p-6 md:p-8 space-y-5 overflow-y-auto flex-1"
              >
                {formError && (
                  <div className="p-3.5 rounded-xl bg-red-50 border border-red-300 text-red-900 text-xs flex items-center gap-2">
                    <AlertCircle size={15} className="text-red-700 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                {/* Quick Starter Templates */}
                <div className="p-4 rounded-xl bg-[#EFE7DC]/80 border border-[#D8CFC2] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono uppercase tracking-wider font-bold text-[#7D7166]">
                      Optional Story Starters (Click to pre-fill structure):
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowPrompts(!showPrompts)}
                      className="text-xs font-semibold text-[#984B27] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Sparkles size={12} />
                      {showPrompts ? 'Hide Writing Prompts' : 'Show Writing Prompts'}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {STORY_TEMPLATES.map((tpl, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() =>
                          setStoryForm(prev => ({
                            ...prev,
                            category: tpl.category,
                            content: prev.content || tpl.promptContent,
                            advice: prev.advice || tpl.promptAdvice
                          }))
                        }
                        className="px-3 py-1.5 rounded-lg bg-[#FAF7F2] hover:bg-[#261F1A] hover:text-[#F7F3EC] text-[#261F1A] border border-[#D5CBC0] text-xs font-medium transition-colors cursor-pointer"
                      >
                        + {tpl.label}
                      </button>
                    ))}
                  </div>

                  {showPrompts && (
                    <ul className="pt-2 text-xs text-[#4A4037] space-y-1 list-disc list-inside border-t border-[#D8CFC2]">
                      <li>What was the hardest challenge during your first 30–90 days home?</li>
                      <li>Which habit, trade program, or mentor helped you turn the corner?</li>
                      <li>What milestone are you celebrating today, and what advice do you have for peers?</li>
                    </ul>
                  )}
                </div>

                {/* Title */}
                <div>
                  <label className="block text-xs font-semibold text-[#261F1A] mb-1.5">
                    Story Headline / Milestone Title *
                  </label>
                  <input
                    required
                    type="text"
                    value={storyForm.title}
                    onChange={e => setStoryForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g., From a 10-Year Term to Licensed Commercial Electrician & Father"
                    className="w-full bg-[#FAF7F2] border border-[#D5CBC0] rounded-xl p-3.5 text-sm text-[#261F1A] focus:outline-none focus:border-[#984B27]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Author Name */}
                  <div>
                    <label className="block text-xs font-semibold text-[#261F1A] mb-1.5">
                      Author Name or Preferred Alias
                    </label>
                    <input
                      type="text"
                      value={storyForm.author_name}
                      onChange={e =>
                        setStoryForm(prev => ({ ...prev, author_name: e.target.value }))
                      }
                      placeholder="Your name or community alias"
                      className="w-full bg-[#FAF7F2] border border-[#D5CBC0] rounded-xl p-3 text-sm text-[#261F1A] focus:outline-none focus:border-[#984B27]"
                    />
                  </div>

                  {/* Role / Current Milestone */}
                  <div>
                    <label className="block text-xs font-semibold text-[#261F1A] mb-1.5">
                      Current Role or Achievement
                    </label>
                    <input
                      type="text"
                      value={storyForm.role}
                      onChange={e => setStoryForm(prev => ({ ...prev, role: e.target.value }))}
                      placeholder="e.g., Union Welder, Homeowner, Peer Mentor"
                      className="w-full bg-[#FAF7F2] border border-[#D5CBC0] rounded-xl p-3 text-sm text-[#261F1A] focus:outline-none focus:border-[#984B27]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Category */}
                  <div>
                    <label className="block text-xs font-semibold text-[#261F1A] mb-1.5">
                      Journey Category *
                    </label>
                    <select
                      value={storyForm.category}
                      onChange={e => setStoryForm(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full bg-[#FAF7F2] border border-[#D5CBC0] rounded-xl p-3 text-sm text-[#261F1A] focus:outline-none focus:border-[#984B27]"
                    >
                      <option value="career">Career & Trades</option>
                      <option value="entrepreneurship">Business & Founders</option>
                      <option value="housing">Housing & Stability</option>
                      <option value="education">Education & Degrees</option>
                      <option value="off_paper">Off Paper & Discharged</option>
                      <option value="family">Family & Reconnection</option>
                      <option value="mindset">Sobriety & Mindset</option>
                      <option value="general">General Journey</option>
                    </select>
                  </div>

                  {/* Time Served */}
                  <div>
                    <label className="block text-xs font-semibold text-[#261F1A] mb-1.5">
                      Time Served (Optional)
                    </label>
                    <input
                      type="text"
                      value={storyForm.time_served}
                      onChange={e =>
                        setStoryForm(prev => ({ ...prev, time_served: e.target.value }))
                      }
                      placeholder="e.g., 7 years State"
                      className="w-full bg-[#FAF7F2] border border-[#D5CBC0] rounded-xl p-3 text-sm text-[#261F1A] focus:outline-none focus:border-[#984B27]"
                    />
                  </div>

                  {/* Years Free */}
                  <div>
                    <label className="block text-xs font-semibold text-[#261F1A] mb-1.5">
                      Time Home / Status
                    </label>
                    <input
                      type="text"
                      value={storyForm.years_free}
                      onChange={e =>
                        setStoryForm(prev => ({ ...prev, years_free: e.target.value }))
                      }
                      placeholder="e.g., 3 years free · Off Paper"
                      className="w-full bg-[#FAF7F2] border border-[#D5CBC0] rounded-xl p-3 text-sm text-[#261F1A] focus:outline-none focus:border-[#984B27]"
                    />
                  </div>
                </div>

                {/* Highlight Tags */}
                <div>
                  <label className="block text-xs font-semibold text-[#261F1A] mb-1.5">
                    Milestone Tags (Comma-separated)
                  </label>
                  <input
                    type="text"
                    value={storyForm.tags}
                    onChange={e => setStoryForm(prev => ({ ...prev, tags: e.target.value }))}
                    placeholder="e.g., Commercial CDL, Union Apprenticeship, Off Paper, First Apartment"
                    className="w-full bg-[#FAF7F2] border border-[#D5CBC0] rounded-xl p-3 text-sm text-[#261F1A] focus:outline-none focus:border-[#984B27]"
                  />
                </div>

                {/* Narrative Textarea */}
                <div>
                  <label className="block text-xs font-semibold text-[#261F1A] mb-1.5">
                    Your Success Story Narrative *
                  </label>
                  <textarea
                    required
                    rows={6}
                    value={storyForm.content}
                    onChange={e => setStoryForm(prev => ({ ...prev, content: e.target.value }))}
                    placeholder="Share where your journey started, the obstacles you faced coming home, and the victory or stability you've built..."
                    className="w-full bg-[#FAF7F2] border border-[#D5CBC0] rounded-xl p-4 text-sm text-[#261F1A] focus:outline-none focus:border-[#984B27] leading-relaxed"
                  />
                </div>

                {/* Advice for returning citizens */}
                <div>
                  <label className="block text-xs font-semibold text-[#261F1A] mb-1.5">
                    Key Advice for Someone Walking Out the Gates Today
                  </label>
                  <textarea
                    rows={2}
                    value={storyForm.advice}
                    onChange={e => setStoryForm(prev => ({ ...prev, advice: e.target.value }))}
                    placeholder="One piece of practical wisdom that helped you protect your freedom and keep moving forward..."
                    className="w-full bg-[#FAF7F2] border border-[#D5CBC0] rounded-xl p-3 text-sm text-[#261F1A] focus:outline-none focus:border-[#984B27] italic"
                  />
                </div>

                {/* Modal Footer Buttons */}
                <div className="flex justify-end gap-3 pt-4 border-t border-[#E2D9CC]">
                  <button
                    type="button"
                    onClick={() => setIsComposeOpen(false)}
                    className="px-5 py-2.5 rounded-xl border border-[#D5CBC0] text-xs font-semibold text-[#261F1A] hover:bg-[#261F1A]/5 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={
                      isSubmittingStory ||
                      !storyForm.content.trim() ||
                      !storyForm.title.trim()
                    }
                    className="bg-[#984B27] hover:bg-[#823E1E] text-[#F7F3EC] px-7 py-2.5 rounded-xl text-xs font-semibold disabled:opacity-50 transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <Send size={14} />
                    {isSubmittingStory ? 'Publishing Story...' : 'Publish Success Story'}
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
