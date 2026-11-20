import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Plus,
  ArrowLeft,
  Send,
  Clock,
  User,
  Hash,
  Search,
  Flag,
  Sparkles,
  ShieldCheck,
  Heart,
  Quote,
  ArrowRight,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../AuthContext';
import { Thread, Reply, Testimonial } from '../types';
import { calculateRelevanceScore } from '../utils/searchUtils';
import SuccessStories from './SuccessStories';
import CommunityGuidelinesModal from './CommunityGuidelinesModal';
import ConfirmationDialog from './ConfirmationDialog';

type ViewState = 'list' | 'create' | 'thread';
type ForumSection = 'discussions' | 'stories';

interface ForumProps {
  initialSubSection?: ForumSection;
  onNavigateToKites?: (userId: string, userName: string) => void;
  onNavigateTab?: (tab: string) => void;
}

export default function Forum({
  initialSubSection = 'discussions',
  onNavigateToKites,
  onNavigateTab
}: ForumProps) {
  const { token, user } = useAuth();
  const [section, setSection] = useState<ForumSection>(initialSubSection);
  const [view, setView] = useState<ViewState>('list');
  const [threads, setThreads] = useState<Thread[]>([]);
  const [previewStories, setPreviewStories] = useState<Testimonial[]>([]);
  const [openStoryComposer, setOpenStoryComposer] = useState(false);
  const [activeThread, setActiveThread] = useState<{
    thread: Thread & { author_history?: string; author_location?: string };
    replies: Reply[];
  } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Flag confirmation & toast state (no window.confirm / window.alert)
  const [flagTarget, setFlagTarget] = useState<{ type: 'thread' | 'reply'; id: string } | null>(
    null
  );
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Community Guidelines modal state
  const [showGuidelines, setShowGuidelines] = useState(false);
  const [isFirstVisit, setIsFirstVisit] = useState(false);

  const storageKey = user?.id
    ? `the_yard_forum_guidelines_accepted_${user.id}`
    : 'the_yard_forum_guidelines_accepted';

  useEffect(() => {
    try {
      const accepted = localStorage.getItem(storageKey);
      if (!accepted) {
        setShowGuidelines(true);
        setIsFirstVisit(true);
      }
    } catch (e) {
      console.warn('Could not read localStorage for guidelines', e);
    }
  }, [storageKey]);

  const handleAcceptGuidelines = () => {
    try {
      localStorage.setItem(storageKey, new Date().toISOString());
    } catch (e) {
      console.warn('Could not save guidelines acceptance', e);
    }
    setShowGuidelines(false);
    setIsFirstVisit(false);
  };

  const handleDeclineGuidelines = () => {
    if (onNavigateTab) {
      onNavigateTab('yard');
    } else {
      setShowGuidelines(false);
    }
  };

  useEffect(() => {
    if (initialSubSection) {
      setSection(initialSubSection);
    }
  }, [initialSubSection]);

  // Create form state
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('general');
  const [newContent, setNewContent] = useState('');

  // Reply form state
  const [replyContent, setReplyContent] = useState('');

  const fetchThreads = () => {
    fetch('/api/threads', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setThreads(data);
      })
      .catch(console.error);
  };

  const fetchPreviewStories = () => {
    fetch('/api/testimonials', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setPreviewStories(data);
      })
      .catch(console.error);
  };

  useEffect(() => {
    fetchPreviewStories();
    if (section === 'discussions' && view === 'list') {
      fetchThreads();
    }
  }, [view, section, token]);

  const handleCreateThread = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/threads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: newTitle, category: newCategory, content: newContent })
      });
      const data = await res.json();
      if (data.success) {
        setNewTitle('');
        setNewContent('');
        setView('list');
        showToast('Discussion thread published to the Forum.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleViewThread = async (id: string) => {
    try {
      const res = await fetch(`/api/threads/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setActiveThread(data);
      setView('thread');
    } catch (err) {
      console.error(err);
    }
  };

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeThread || !replyContent) return;
    try {
      const res = await fetch(`/api/threads/${activeThread.thread.id}/replies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content: replyContent })
      });
      const data = await res.json();
      if (data.success) {
        setReplyContent('');
        handleViewThread(activeThread.thread.id);
        showToast('Your reply has been added.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleConfirmFlag = async () => {
    if (!flagTarget) return;
    try {
      const endpoint =
        flagTarget.type === 'thread'
          ? `/api/threads/${flagTarget.id}/flag`
          : `/api/replies/${flagTarget.id}/flag`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        showToast(
          flagTarget.type === 'thread'
            ? 'Thread flagged for moderator review.'
            : 'Reply flagged for moderator review.'
        );
      }
    } catch (err) {
      console.error(err);
    } finally {
      setFlagTarget(null);
    }
  };

  // List View filtering
  const filteredThreads = threads
    .map(thread => ({
      ...thread,
      relevance: calculateRelevanceScore(thread, searchQuery, {
        title: 4,
        category: 3,
        content: 2,
        author_name: 1
      })
    }))
    .filter(thread => searchQuery.trim() === '' || thread.relevance > 0)
    .sort((a, b) => {
      if (searchQuery.trim() === '') {
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      }
      return b.relevance - a.relevance;
    });

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

      {/* Top Section Navigation: Community Discussions vs Success Stories */}
      <div className="bg-[#F6F2EB] border border-[#DDD4C7] rounded-2xl p-3 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 shadow-2xs">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setSection('discussions');
              setView('list');
            }}
            className={`px-5 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ${
              section === 'discussions'
                ? 'bg-[#261F1A] text-[#F7F3EC] shadow-xs'
                : 'text-[#6E6359] hover:text-[#261F1A] hover:bg-[#261F1A]/5'
            }`}
          >
            <MessageSquare size={15} />
            <span>Community Discussions</span>
            <span className="font-mono text-[11px] opacity-75 tabular-nums">
              ({threads.length})
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSection('stories')}
            className={`px-5 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ${
              section === 'stories'
                ? 'bg-[#984B27] text-[#F7F3EC] shadow-xs'
                : 'text-[#6E6359] hover:text-[#261F1A] hover:bg-[#261F1A]/5'
            }`}
          >
            <Sparkles
              size={15}
              className={section === 'stories' ? 'text-[#F7F3EC]' : 'text-[#984B27]'}
            />
            <span>Success Stories</span>
            <span className="font-mono text-[11px] opacity-80 tabular-nums">
              ({previewStories.length})
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2.5 self-end sm:self-auto">
          <button
            type="button"
            onClick={() => {
              setSection('stories');
              setOpenStoryComposer(true);
            }}
            className="px-4 py-2 rounded-xl bg-[#984B27]/12 hover:bg-[#984B27] text-[#984B27] hover:text-[#F7F3EC] border border-[#984B27]/30 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Plus size={14} />
            <span>Share Success Story</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setIsFirstVisit(false);
              setShowGuidelines(true);
            }}
            className="flex items-center gap-1.5 text-xs font-medium px-3.5 py-2 rounded-xl border border-[#D8CFC2] hover:border-[#261F1A] text-[#4A4037] hover:text-[#261F1A] transition-all cursor-pointer"
            title="Review Community Guidelines"
          >
            <ShieldCheck size={14} className="text-[#984B27]" />
            <span>Guidelines</span>
          </button>
        </div>
      </div>

      {section === 'stories' ? (
        <SuccessStories
          onNavigateToKites={onNavigateToKites}
          onNavigateTab={onNavigateTab}
          openComposerOnMount={openStoryComposer}
          onComposerOpened={() => setOpenStoryComposer(false)}
        />
      ) : view === 'create' ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-3xl mx-auto space-y-6"
        >
          <button
            type="button"
            onClick={() => setView('list')}
            className="flex items-center gap-2 text-xs font-semibold text-[#74695E] hover:text-[#261F1A] transition-colors cursor-pointer"
          >
            <ArrowLeft size={16} /> Back to Discussions
          </button>

          <div>
            <h2 className="text-3xl md:text-4xl font-serif text-[#261F1A]">
              Start a Community Discussion
            </h2>
            <p className="text-sm text-[#74695E] mt-1">
              Ask a question, share re-entry advice, or support a brother or sister.
            </p>
          </div>

          <form
            onSubmit={handleCreateThread}
            className="bg-[#F6F2EB] border border-[#DDD4C7] rounded-2xl p-6 md:p-8 space-y-5 shadow-xs"
          >
            <div>
              <label className="block text-xs font-semibold text-[#261F1A] mb-2">
                Discussion Title *
              </label>
              <input
                required
                type="text"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                className="w-full bg-[#FAF7F2] border border-[#D5CBC0] rounded-xl p-3.5 focus:outline-none focus:border-[#984B27] text-base text-[#261F1A]"
                placeholder="What's on your mind?"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#261F1A] mb-2">
                Category
              </label>
              <select
                value={newCategory}
                onChange={e => setNewCategory(e.target.value)}
                className="w-full bg-[#FAF7F2] border border-[#D5CBC0] rounded-xl p-3.5 focus:outline-none focus:border-[#984B27] text-sm text-[#261F1A]"
              >
                <option value="general">General</option>
                <option value="parole">Parole & Probation</option>
                <option value="jobs">Employment & Fair-Chance Jobs</option>
                <option value="housing">Housing & Transitional Living</option>
                <option value="support">Support & Re-Entry Advice</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#261F1A] mb-2">
                Post Content *
              </label>
              <textarea
                required
                value={newContent}
                onChange={e => setNewContent(e.target.value)}
                className="w-full bg-[#FAF7F2] border border-[#D5CBC0] rounded-xl p-4 focus:outline-none focus:border-[#984B27] min-h-[180px] text-sm text-[#261F1A]"
                placeholder="Share the details here..."
              />
            </div>
            <button
              type="submit"
              className="w-full bg-[#261F1A] hover:bg-[#3A3028] text-[#F7F3EC] py-3.5 px-6 rounded-xl text-xs font-semibold transition-colors flex justify-center items-center gap-2 cursor-pointer"
            >
              <Send size={16} /> Publish Discussion Thread
            </button>
          </form>
        </motion.div>
      ) : view === 'thread' && activeThread ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto space-y-6"
        >
          <button
            type="button"
            onClick={() => setView('list')}
            className="flex items-center gap-2 text-xs font-semibold text-[#74695E] hover:text-[#261F1A] transition-colors cursor-pointer"
          >
            <ArrowLeft size={16} /> Back to Discussions
          </button>

          {/* Original Post */}
          <div className="bg-[#F6F2EB] border border-[#DDD4C7] rounded-2xl overflow-hidden shadow-xs">
            <div className="p-6 md:p-8 border-b border-[#E5DDD0]">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#984B27] font-semibold">
                  <Hash size={13} /> {activeThread.thread.category}
                  <span className="mx-1 text-[#8C7F73]">·</span>
                  <Clock size={13} className="text-[#74695E]" />
                  <span className="text-[#74695E]">
                    {new Date(activeThread.thread.timestamp).toLocaleString()}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setFlagTarget({ type: 'thread', id: activeThread.thread.id })
                  }
                  className="text-[#984B27] hover:bg-[#984B27]/10 px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
                  title="Flag for moderation"
                >
                  <Flag size={13} /> Flag
                </button>
              </div>
              <h2 className="text-2xl md:text-3xl font-serif text-[#261F1A] mb-4">
                {activeThread.thread.title}
              </h2>
              <p className="text-base leading-relaxed text-[#3D342C] whitespace-pre-wrap">
                {activeThread.thread.content}
              </p>
            </div>
            <div className="bg-[#EFE7DC]/60 px-6 py-4 md:px-8 flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-full bg-[#261F1A] text-[#F7F3EC] flex items-center justify-center">
                <User size={18} />
              </div>
              <div>
                <div className="font-semibold text-sm text-[#261F1A]">
                  {activeThread.thread.author_name}
                </div>
                <div className="text-xs text-[#74695E]">
                  {activeThread.thread.author_history || 'Community Member'} ·{' '}
                  {activeThread.thread.author_location || 'The Yard'}
                </div>
              </div>
            </div>
          </div>

          {/* Replies */}
          <div className="space-y-4">
            <h3 className="text-xs font-mono uppercase tracking-wider font-bold text-[#7D7166]">
              {activeThread.replies.length}{' '}
              {activeThread.replies.length === 1 ? 'Community Reply' : 'Community Replies'}
            </h3>

            {activeThread.replies.map(reply => (
              <div
                key={reply.id}
                className="bg-[#F6F2EB] border border-[#DDD4C7] rounded-2xl p-6 flex gap-4"
              >
                <div className="hidden sm:flex w-9 h-9 rounded-full bg-[#EFE7DC] text-[#261F1A] items-center justify-center shrink-0">
                  <User size={16} />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-xs text-[#261F1A]">
                        {reply.author_name}
                      </span>
                      <span className="text-[11px] font-mono text-[#7D7166] flex items-center gap-1">
                        <Clock size={11} /> {new Date(reply.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFlagTarget({ type: 'reply', id: reply.id })}
                      className="text-[#984B27] hover:bg-[#984B27]/10 p-1.5 rounded-lg transition-colors cursor-pointer"
                      title="Flag for moderation"
                    >
                      <Flag size={13} />
                    </button>
                  </div>
                  <p className="text-sm text-[#3D342C] leading-relaxed whitespace-pre-wrap">
                    {reply.content}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Reply Form */}
          <form
            onSubmit={handleReply}
            className="bg-[#F6F2EB] border border-[#DDD4C7] rounded-2xl p-6 space-y-4"
          >
            <label className="block text-xs font-semibold text-[#261F1A]">
              Add a Supportive Reply
            </label>
            <textarea
              required
              value={replyContent}
              onChange={e => setReplyContent(e.target.value)}
              className="w-full bg-[#FAF7F2] border border-[#D5CBC0] rounded-xl p-3.5 text-sm text-[#261F1A] focus:outline-none focus:border-[#984B27] min-h-[110px]"
              placeholder="Write your response..."
            />
            <div className="flex justify-end">
              <button
                type="submit"
                className="bg-[#261F1A] hover:bg-[#3A3028] text-[#F7F3EC] px-6 py-2.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-2 cursor-pointer"
              >
                <Send size={14} /> Post Reply
              </button>
            </div>
          </form>
        </motion.div>
      ) : (
        /* Discussions List View + Featured Success Stories Spotlight */
        <div className="space-y-8">
          <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-[#984B27] font-semibold">
                <MessageSquare size={13} /> PEER SUPPORT & RE-ENTRY DIALOGUE
              </div>
              <h2 className="text-4xl md:text-5xl font-serif text-[#261F1A] tracking-tight">
                Community Forum
              </h2>
              <p className="text-sm md:text-base text-[#70655B] max-w-2xl">
                Connect with peers, celebrate Success Stories from formerly incarcerated alumni, and share practical re-entry advice.
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0 flex-wrap">
              <button
                type="button"
                onClick={() => setView('create')}
                className="bg-[#261F1A] hover:bg-[#3A3028] text-[#F7F3EC] px-5 py-3 rounded-xl text-xs font-semibold transition-colors flex items-center gap-2 shrink-0 cursor-pointer shadow-xs"
              >
                <Plus size={16} /> New Discussion Thread
              </button>
            </div>
          </header>

          {/* Featured Success Stories Section Spotlight inside the Forum Tab */}
          <section className="bg-[#F6F2EB] border border-[#DDD4C7] rounded-2xl p-6 md:p-7 space-y-5 shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E5DDD0] pb-4">
              <div>
                <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.18em] text-[#984B27] font-semibold mb-1">
                  <Sparkles size={13} /> COMMUNITY SUCCESS STORIES
                </div>
                <h3 className="text-2xl font-serif text-[#261F1A]">
                  Inspirational Journeys from Formerly Incarcerated Alumni
                </h3>
                <p className="text-xs text-[#74695E] mt-0.5">
                  Real breakthroughs in career trades, entrepreneurship, housing, and getting off paper.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setSection('stories');
                    setOpenStoryComposer(true);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-[#984B27] hover:bg-[#823E1E] text-[#F7F3EC] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus size={14} /> Post Your Success Story
                </button>
                <button
                  type="button"
                  onClick={() => setSection('stories')}
                  className="px-4 py-2.5 rounded-xl bg-[#261F1A] hover:bg-[#3A3028] text-[#F7F3EC] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span>View All Stories ({previewStories.length})</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>

            {/* 3-Card Preview Grid of Inspirational Success Stories */}
            {previewStories.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {previewStories.slice(0, 3).map(story => (
                  <div
                    key={story.id}
                    onClick={() => setSection('stories')}
                    className="p-5 rounded-xl bg-[#FAF7F2] border border-[#D8CFC2] hover:border-[#984B27] transition-all flex flex-col justify-between gap-4 cursor-pointer group"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between gap-2 text-[11px] font-mono text-[#74695E]">
                        <span className="font-semibold text-[#984B27] truncate">
                          {story.author_name}
                        </span>
                        {story.years_free && (
                          <span className="text-emerald-800 font-semibold shrink-0">
                            {story.years_free}
                          </span>
                        )}
                      </div>
                      <h4 className="font-serif text-lg text-[#261F1A] group-hover:text-[#984B27] transition-colors line-clamp-2 leading-snug">
                        {story.title || 'My Reintegration Story'}
                      </h4>
                      <p className="text-xs text-[#4A4037] line-clamp-3 leading-relaxed">
                        {story.content}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-[#E5DDD0] flex items-center justify-between text-[11px] text-[#74695E]">
                      <span className="flex items-center gap-1 font-medium text-[#984B27]">
                        <Heart size={12} className="fill-[#984B27]/20" />
                        {story.likes_count || 0} Salutes
                      </span>
                      <span className="flex items-center gap-1 font-semibold text-[#261F1A] group-hover:translate-x-0.5 transition-transform">
                        Read Story <ArrowRight size={12} />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Search Discussions */}
          <div className="relative">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-[#7D7166]"
              size={18}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search discussion threads by title, content, or category..."
              className="w-full bg-[#F6F2EB] border border-[#DDD4C7] rounded-xl py-4 pl-12 pr-6 text-sm text-[#261F1A] placeholder:text-[#8C7F73] focus:outline-none focus:border-[#984B27] transition-all"
            />
          </div>

          {/* Discussion Threads List */}
          <div className="bg-[#F6F2EB] border border-[#DDD4C7] rounded-2xl divide-y divide-[#E5DDD0] overflow-hidden shadow-xs">
            {filteredThreads.length === 0 && (
              <div className="p-12 text-center text-sm text-[#74695E]">
                {threads.length === 0
                  ? 'No discussion threads yet. Be the first to start a conversation.'
                  : 'No threads found matching your search.'}
              </div>
            )}
            {filteredThreads.map(thread => (
              <div
                key={thread.id}
                onClick={() => handleViewThread(thread.id)}
                className="p-6 hover:bg-[#EFE7DC]/70 transition-colors cursor-pointer group flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-[#984B27] font-semibold mb-1.5">
                    <Hash size={12} /> {thread.category}
                  </div>
                  <h3 className="text-xl font-serif text-[#261F1A] group-hover:text-[#984B27] transition-colors mb-2">
                    {thread.title}
                  </h3>
                  <div className="flex items-center gap-4 text-xs text-[#74695E]">
                    <span className="flex items-center gap-1.5 font-medium text-[#261F1A]">
                      <User size={13} /> {thread.author_name}
                    </span>
                    <span className="flex items-center gap-1 font-mono text-[11px]">
                      <Clock size={12} /> {new Date(thread.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs font-mono font-semibold bg-[#EFE7DC] text-[#261F1A] px-3.5 py-2 rounded-xl border border-[#D8CFC2]">
                  <MessageSquare size={14} className="text-[#984B27]" />
                  {thread.reply_count}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Community Guidelines Modal */}
      <CommunityGuidelinesModal
        isOpen={showGuidelines}
        isFirstVisit={isFirstVisit}
        onAccept={handleAcceptGuidelines}
        onClose={() => setShowGuidelines(false)}
        onDecline={handleDeclineGuidelines}
      />

      {/* Moderation Flag Confirmation Dialog */}
      {flagTarget && (
        <ConfirmationDialog
          isOpen={!!flagTarget}
          title="Flag Content for Moderation"
          message={`Are you sure you want to flag this ${flagTarget.type} for community moderator review?`}
          confirmText="Flag Content"
          cancelText="Cancel"
          type="warning"
          onConfirm={handleConfirmFlag}
          onCancel={() => setFlagTarget(null)}
        />
      )}
    </div>
  );
}
