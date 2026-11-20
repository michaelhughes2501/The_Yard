import React, { useState, useEffect } from 'react';
import {
  PhoneCall,
  ArrowRight,
  HeartPulse,
  UserCheck,
  Droplets,
  Sparkles,
  TestTube,
  Shield,
  Activity,
  Badge,
  Plus,
  X,
  Trash2,
  Map as MapIcon,
  Scale,
  Calculator,
  Search,
  BookOpen,
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  Building2,
  Star,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Check,
  MessageSquare,
  Bookmark
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  UA_CHECK_INS,
  PAROLE_RESOURCES,
  MENTAL_HEALTH_RESOURCES,
  SELF_HELP_MATERIALS,
  STATE_COURT_DOCKETS,
  STATUTORY_SENTENCE_MATRIX
} from '../constants';
import { geminiService } from '../services/geminiService';
import Markdown from 'react-markdown';
import { useAuth } from '../AuthContext';
import { ParoleOfficer, ResourceRatingSummary, ResourceBookmark } from '../types';
import ConfirmationDialog from './ConfirmationDialog';
import ServiceMap from './ServiceMap';

interface StarRatingBlockProps {
  resourceId: string;
  resourceTitle: string;
  summary?: ResourceRatingSummary;
  onSubmitRating: (
    resourceId: string,
    rating: number,
    verifiedReliable: boolean,
    reviewNote: string
  ) => Promise<void>;
  compact?: boolean;
}

function ResourceStarRatingWidget({
  resourceId,
  resourceTitle,
  summary,
  onSubmitRating,
  compact = false
}: StarRatingBlockProps) {
  const [hoverStar, setHoverStar] = useState<number>(0);
  const [selectedStar, setSelectedStar] = useState<number>(summary?.user_rating || 0);
  const [verifiedReliable, setVerifiedReliable] = useState<boolean>(
    summary?.user_verified ?? true
  );
  const [reviewNote, setReviewNote] = useState<string>(summary?.user_note || '');
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [showReviews, setShowReviews] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (summary?.user_rating) setSelectedStar(summary.user_rating);
    if (summary?.user_note !== undefined) setReviewNote(summary.user_note);
    if (summary?.user_verified !== undefined) setVerifiedReliable(summary.user_verified);
  }, [summary?.user_rating, summary?.user_note, summary?.user_verified]);

  const avg = summary?.average_rating || 0;
  const total = summary?.total_ratings || 0;
  const verifiedCount = summary?.verified_count || 0;
  const reviews = summary?.reviews || [];
  const isVerifiedBadge = avg >= 4.0 && verifiedCount >= 1;

  const handleStarClick = (starValue: number) => {
    setSelectedStar(starValue);
    setIsEditorOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedStar < 1 || selectedStar > 5) return;
    setIsSaving(true);
    try {
      await onSubmitRating(resourceId, selectedStar, verifiedReliable, reviewNote);
      setIsEditorOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={`pt-3 mt-3 border-t border-[#E5DDD0] space-y-2.5 ${compact ? 'text-[11px]' : 'text-xs'}`}>
      {/* Summary & Verification Row */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-0.5" aria-label={`Average rating ${avg} out of 5`}>
            {[1, 2, 3, 4, 5].map(idx => {
              const active = idx <= Math.round(avg);
              return (
                <Star
                  key={idx}
                  size={compact ? 12 : 14}
                  className={
                    active
                      ? 'text-[#C69249] fill-[#C69249]'
                      : 'text-[#C9BFAF]'
                  }
                />
              );
            })}
          </div>
          <span className="font-mono font-bold text-[#261F1A] tabular-nums">
            {total > 0 ? avg.toFixed(1) : 'New'}
          </span>
          <span className="text-[#74695E] font-mono tabular-nums">
            ({total} {total === 1 ? 'rating' : 'ratings'})
          </span>
        </div>

        {isVerifiedBadge && (
          <span className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold text-emerald-800">
            <ShieldCheck size={12} className="text-emerald-700" />
            Verified Reliable ({verifiedCount})
          </span>
        )}
      </div>

      {/* Interactive User 5-Star Input Row */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-[#74695E]">
            {summary?.user_rating ? 'Your rating:' : 'Rate reliability:'}
          </span>
          <div
            className="flex items-center gap-0.5"
            onMouseLeave={() => setHoverStar(0)}
          >
            {[1, 2, 3, 4, 5].map(starVal => {
              const filled = starVal <= (hoverStar || selectedStar);
              return (
                <button
                  key={starVal}
                  type="button"
                  onMouseEnter={() => setHoverStar(starVal)}
                  onClick={() => handleStarClick(starVal)}
                  className="p-0.5 hover:scale-110 transition-transform cursor-pointer focus:outline-none"
                  title={`Rate ${resourceTitle} ${starVal} out of 5 stars`}
                  aria-label={`Rate ${starVal} stars`}
                >
                  <Star
                    size={15}
                    className={
                      filled
                        ? 'text-[#984B27] fill-[#984B27]'
                        : 'text-[#B5A99B] hover:text-[#984B27]'
                    }
                  />
                </button>
              );
            })}
          </div>
        </div>

        {reviews.length > 0 && (
          <button
            type="button"
            onClick={() => setShowReviews(prev => !prev)}
            className="text-[11px] font-medium text-[#984B27] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <MessageSquare size={11} />
            <span>
              {showReviews ? 'Hide Notes' : `Peer Notes (${reviews.length})`}
            </span>
            {showReviews ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
          </button>
        )}
      </div>

      {/* Inline Rating & Reliability Verification Form */}
      <AnimatePresence>
        {isEditorOpen && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleSave}
            className="p-3.5 rounded-xl bg-[#EFE7DC]/85 border border-[#D8CFC2] space-y-2.5 overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-[#261F1A]">
                Verify Service Reliability ({selectedStar}/5 Stars)
              </span>
              <button
                type="button"
                onClick={() => setIsEditorOpen(false)}
                className="text-[#74695E] hover:text-[#261F1A] cursor-pointer"
              >
                <X size={13} />
              </button>
            </div>

            <label className="flex items-center gap-2 text-[11px] text-[#3D342C] cursor-pointer select-none">
              <input
                type="checkbox"
                checked={verifiedReliable}
                onChange={e => setVerifiedReliable(e.target.checked)}
                className="w-3.5 h-3.5 rounded accent-[#984B27]"
              />
              <span>I confirmed this phone/service is active and reliable</span>
            </label>

            <input
              type="text"
              value={reviewNote}
              onChange={e => setReviewNote(e.target.value)}
              maxLength={300}
              placeholder="Optional peer tip (e.g., wait times, helpful staff, hours)..."
              className="w-full bg-[#FAF7F2] border border-[#D5CBC0] rounded-lg px-2.5 py-2 text-xs text-[#261F1A] focus:outline-none focus:border-[#984B27]"
            />

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsEditorOpen(false)}
                className="px-2.5 py-1.5 rounded-lg text-[11px] text-[#74695E] hover:text-[#261F1A] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-3.5 py-1.5 rounded-lg bg-[#984B27] hover:bg-[#823E1E] text-[#F7F3EC] text-[11px] font-semibold disabled:opacity-50 cursor-pointer"
              >
                {isSaving ? 'Saving...' : 'Submit Rating'}
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Expandable Peer Reviews List */}
      <AnimatePresence>
        {showReviews && reviews.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2 pt-1 overflow-hidden"
          >
            {reviews.slice(0, 4).map(rev => (
              <div
                key={rev.id}
                className="p-2.5 rounded-xl bg-[#FAF7F2] border border-[#E2D9CC] space-y-1"
              >
                <div className="flex items-center justify-between gap-2 text-[11px]">
                  <span className="font-semibold text-[#261F1A]">{rev.user_name}</span>
                  <div className="flex items-center gap-1.5">
                    {rev.verified_reliable && (
                      <span className="text-[10px] text-emerald-800 font-mono">✓ Verified</span>
                    )}
                    <span className="font-mono font-bold text-[#984B27] tabular-nums">
                      {rev.rating}★
                    </span>
                  </div>
                </div>
                {rev.review_note && (
                  <p className="text-[11px] text-[#4A4037] leading-relaxed">
                    “{rev.review_note}”
                  </p>
                )}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const ResourceCard = ({
  item,
  icon: Icon,
  type,
  ratingSummary,
  onSubmitRating,
  isBookmarked,
  onToggleBookmark
}: {
  item: any;
  icon: any;
  type: string;
  ratingSummary?: ResourceRatingSummary;
  onSubmitRating: (
    resourceId: string,
    rating: number,
    verifiedReliable: boolean,
    reviewNote: string
  ) => Promise<void>;
  isBookmarked: boolean;
  onToggleBookmark: () => void;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 14 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    className="flex flex-col justify-between bg-[#F6F2EB] border border-[#DDD4C7] hover:border-[#C5B8A8] rounded-2xl p-6 transition-all duration-200 shadow-2xs"
  >
    <div>
      <div className="flex justify-between items-start mb-4 gap-2">
        <div className="p-2.5 bg-[#EFE7DC] text-[#984B27] rounded-xl">
          <Icon size={20} />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono uppercase tracking-wider text-[#7D7166]">
            {type}
          </span>
          <button
            type="button"
            onClick={onToggleBookmark}
            title={isBookmarked ? 'Remove from Saved Bookmarks' : 'Save to Resource Bookmarks'}
            aria-label={isBookmarked ? `Remove ${item.title} from bookmarks` : `Bookmark ${item.title}`}
            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
              isBookmarked
                ? 'bg-[#984B27] border-[#984B27] text-[#F7F3EC]'
                : 'bg-[#FAF7F2] border-[#D8CFC2] text-[#7D7166] hover:border-[#984B27] hover:text-[#984B27]'
            }`}
          >
            <Bookmark size={14} className={isBookmarked ? 'fill-[#F7F3EC]' : ''} />
          </button>
        </div>
      </div>
      <h4 className="text-lg font-serif font-semibold text-[#261F1A] mb-2">{item.title}</h4>
      <p className="text-xs text-[#4A4037] leading-relaxed">{item.description}</p>
    </div>

    <div className="mt-4">
      <ResourceStarRatingWidget
        resourceId={item.id}
        resourceTitle={item.title}
        summary={ratingSummary}
        onSubmitRating={onSubmitRating}
      />

      {item.phone ? (
        <a
          href={`tel:${item.phone}`}
          className="inline-flex items-center justify-between w-full mt-3 pt-3 border-t border-[#E5DDD0] font-mono text-xs font-semibold text-[#984B27] hover:text-[#261F1A] transition-colors"
        >
          <span>{item.phone}</span>
          <PhoneCall size={15} />
        </a>
      ) : (
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-between w-full mt-3 pt-3 border-t border-[#E5DDD0] font-mono text-xs font-semibold text-[#984B27] hover:text-[#261F1A] transition-colors"
        >
          <span>Visit Official Portal</span>
          <ArrowRight size={15} />
        </a>
      )}
    </div>
  </motion.div>
);

const STATE_MULTIPLIERS: Record<string, { factor: number; truthInSentencingNote: string }> = {
  Colorado: {
    factor: 1.0,
    truthInSentencingNote:
      'Colorado CRS § 18-1.3-401 presumptive ranges; non-violent offenses eligible for 50% earned time.'
  },
  California: {
    factor: 0.9,
    truthInSentencingNote:
      'California Determinate Sentencing Law (Low / Middle / Upper Triad) + Prop 57 milestone credits.'
  },
  Texas: {
    factor: 1.15,
    truthInSentencingNote:
      'Texas Penal Code Chapter 12 degree ranges; 3g/aggravated offenses require 50% flat time.'
  },
  'New York': {
    factor: 0.95,
    truthInSentencingNote:
      'NY Penal Law Article 70 determinate/indeterminate tiers + Merit Time & Less Is More Act.'
  },
  Florida: {
    factor: 1.2,
    truthInSentencingNote:
      'Florida Criminal Punishment Code requiring 85% minimum service across state prison sentences.'
  },
  Illinois: {
    factor: 0.95,
    truthInSentencingNote:
      'Illinois Unified Code of Corrections Class 1–4 sentencing + day-for-day credit on eligible classes.'
  },
  Pennsylvania: {
    factor: 1.0,
    truthInSentencingNote:
      'PA Sentencing Guidelines Matrix (Min/Max indeterminate structure; eligible for RRRI minimum).'
  },
  'Federal (U.S. Sentencing Guidelines)': {
    factor: 1.25,
    truthInSentencingNote:
      'U.S.S.G. Offense Level / Criminal History Zone + First Step Act (up to 54 days/yr good conduct time).'
  }
};

export default function Resources({ initialShowAddPO = false }: { initialShowAddPO?: boolean }) {
  const { token } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<
    'all' | 'bookmarks' | 'mental_health' | 'dockets' | 'estimator' | 'parole' | 'map'
  >('all');

  // 5-Star Community Ratings & Bookmarks State
  const [ratingsMap, setRatingsMap] = useState<Record<string, ResourceRatingSummary>>({});
  const [bookmarks, setBookmarks] = useState<ResourceBookmark[]>([]);
  const [ratingFilter, setRatingFilter] = useState<'all' | 'verified4plus' | 'top_rated'>('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Pillar 1: Mental Health & Self-Help states
  const [expandedWorkbookId, setExpandedWorkbookId] = useState<string | null>('sh-1');
  const [selfHelpTopic, setSelfHelpTopic] = useState('');
  const [selfHelpContent, setSelfHelpContent] = useState('');
  const [selfHelpError, setSelfHelpError] = useState<string | null>(null);
  const [isLoadingSelfHelp, setIsLoadingSelfHelp] = useState(false);

  // Pillar 2: Court Dockets Database & Search states
  const [docketSearchFilter, setDocketSearchFilter] = useState('');
  const [docketSelectedState, setDocketSelectedState] = useState('Colorado');
  const [docketCaseQuery, setDocketCaseQuery] = useState('');
  const [docketInmateId, setDocketInmateId] = useState('');
  const [docketAiResult, setDocketAiResult] = useState<any>(null);
  const [docketAiError, setDocketAiError] = useState<string | null>(null);
  const [isDocketAiLoading, setIsDocketAiLoading] = useState(false);

  // Pillar 3: Sentence Estimator states
  const [estState, setEstState] = useState('Colorado');
  const [estOffenseId, setEstOffenseId] = useState(STATUTORY_SENTENCE_MATRIX[0].id);
  const [estPriorHistory, setEstPriorHistory] = useState<'none' | 'one_prior' | 'habitual'>('none');
  const [estProgramCredit, setEstProgramCredit] = useState(true);
  const [estCustomNotes, setEstCustomNotes] = useState('');
  const [estAiAnalysis, setEstAiAnalysis] = useState('');
  const [estAiError, setEstAiError] = useState<string | null>(null);
  const [isEstAiLoading, setIsEstAiLoading] = useState(false);

  // Pillar 4: Parole & RMOMS UA states
  const [officers, setOfficers] = useState<ParoleOfficer[]>([]);
  const [showAddPO, setShowAddPO] = useState(initialShowAddPO);
  const [poName, setPoName] = useState('');
  const [poAgency, setPoAgency] = useState('');
  const [poPhone, setPoPhone] = useState('');
  const [poDistrict, setPoDistrict] = useState('');
  const [rmomsColor, setRmomsColor] = useState('Amber');
  const [rmomsCheckResult, setRmomsCheckResult] = useState<string | null>(null);

  // Confirmation Dialog state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [officerToDelete, setOfficerToDelete] = useState<ParoleOfficer | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  useEffect(() => {
    if (initialShowAddPO) {
      setShowAddPO(true);
      setSelectedCategory('all');
    }
  }, [initialShowAddPO]);

  const fetchResourceRatings = async () => {
    try {
      const res = await fetch('/api/resources/ratings', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        if (data && typeof data === 'object') {
          setRatingsMap(data);
        }
      }
    } catch (err) {
      console.error('Failed to load resource ratings:', err);
    }
  };

  const fetchResourceBookmarks = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/resources/bookmarks', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setBookmarks(data);
        }
      }
    } catch (err) {
      console.error('Failed to load resource bookmarks:', err);
    }
  };

  useEffect(() => {
    fetchResourceRatings();
    fetchResourceBookmarks();
    fetch('/api/parole-officers', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setOfficers(data);
      })
      .catch(console.error);
  }, [token]);

  const bookmarkedIds = new Set(bookmarks.map(b => b.resource_id));

  const handleToggleBookmark = async (
    resourceId: string,
    resourceType: string,
    resourceTitle: string
  ) => {
    if (!token) {
      showToast('Please sign in to save resource bookmarks.');
      return;
    }
    try {
      const res = await fetch('/api/resources/bookmarks/toggle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          resource_id: resourceId,
          resource_type: resourceType,
          resource_title: resourceTitle
        })
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data.bookmarks)) {
        setBookmarks(data.bookmarks);
        showToast(
          data.bookmarked
            ? `Saved "${resourceTitle}" to your Resource Bookmarks.`
            : `Removed "${resourceTitle}" from your bookmarks.`
        );
      }
    } catch (err) {
      console.error('Error toggling bookmark:', err);
    }
  };

  const handleSubmitResourceRating = async (
    resourceId: string,
    rating: number,
    verifiedReliable: boolean,
    reviewNote: string
  ) => {
    try {
      const res = await fetch(`/api/resources/${encodeURIComponent(resourceId)}/rate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          rating,
          verified_reliable: verifiedReliable,
          review_note: reviewNote
        })
      });
      const data = await res.json();
      if (res.ok && data.summary) {
        setRatingsMap(prev => ({
          ...prev,
          [resourceId]: data.summary
        }));
        showToast(
          `Saved your ${rating}-star rating! Thank you for verifying community service reliability.`
        );
      }
    } catch (err) {
      console.error('Error submitting resource rating:', err);
    }
  };

  // Helper to filter & sort resource lists by community star ratings
  const applyRatingFilter = <T extends { id: string }>(items: T[]): T[] => {
    let list = [...items];
    if (ratingFilter === 'verified4plus') {
      list = list.filter(it => (ratingsMap[it.id]?.average_rating || 0) >= 4.0);
    }
    if (ratingFilter === 'top_rated' || ratingFilter === 'verified4plus') {
      list.sort(
        (a, b) =>
          (ratingsMap[b.id]?.average_rating || 0) - (ratingsMap[a.id]?.average_rating || 0)
      );
    }
    return list;
  };

  // Aggregate reliability stats across all rated resources
  const allRatingSummaries = Object.values(ratingsMap) as ResourceRatingSummary[];
  const totalPeerRatingsCount = allRatingSummaries.reduce((acc, r) => acc + r.total_ratings, 0);
  const verifiedServicesCount = allRatingSummaries.filter(
    r => r.average_rating >= 4.0 && r.verified_count >= 1
  ).length;
  const globalAverageRating =
    allRatingSummaries.length > 0
      ? (
          allRatingSummaries.reduce((acc, r) => acc + r.average_rating, 0) /
          allRatingSummaries.length
        ).toFixed(1)
      : '4.6';

  const handleDeleteOfficer = (officer: ParoleOfficer) => {
    setOfficerToDelete(officer);
    setDeleteConfirmOpen(true);
  };

  const executeDeleteOfficer = async () => {
    if (!officerToDelete) return;
    try {
      const res = await fetch(`/api/parole-officers/${officerToDelete.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setOfficers(officers.filter(o => o.id !== officerToDelete.id));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDeleteConfirmOpen(false);
      setOfficerToDelete(null);
    }
  };

  const handleAddPO = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/parole-officers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: poName,
          agency: poAgency,
          phone: poPhone,
          district: poDistrict
        })
      });
      const data = await res.json();
      if (data.success) {
        setOfficers([...officers, data.officer]);
        setShowAddPO(false);
        setPoName('');
        setPoAgency('');
        setPoPhone('');
        setPoDistrict('');
        showToast('Parole officer contact saved.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleGetSelfHelp = async () => {
    if (!selfHelpTopic.trim()) return;
    setIsLoadingSelfHelp(true);
    setSelfHelpError(null);
    try {
      const content = await geminiService.getSelfHelpMaterial(selfHelpTopic);
      setSelfHelpContent(content || '');
    } catch (error: any) {
      setSelfHelpError(error?.message || 'Unable to generate guide right now.');
    } finally {
      setIsLoadingSelfHelp(false);
    }
  };

  const handleSearchDocket = async () => {
    if (!docketSelectedState) return;
    setIsDocketAiLoading(true);
    setDocketAiError(null);
    try {
      const query = docketInmateId
        ? `${docketCaseQuery} Inmate ID: ${docketInmateId}`
        : docketCaseQuery || 'How to look up criminal court dockets and calendar dates';
      const response = await geminiService.searchCourtDocket(docketSelectedState, query);
      setDocketAiResult(response);
    } catch (error: any) {
      setDocketAiError(error?.message || 'Unable to run live court docket lookup.');
    } finally {
      setIsDocketAiLoading(false);
    }
  };

  const handleRunAiSentenceAnalysis = async () => {
    const selectedRule =
      STATUTORY_SENTENCE_MATRIX.find(r => r.id === estOffenseId) || STATUTORY_SENTENCE_MATRIX[0];
    setIsEstAiLoading(true);
    setEstAiError(null);
    try {
      const prompt = `State: ${estState}. Offense: ${selectedRule.label}. Prior History: ${estPriorHistory}. Program Participation: ${
        estProgramCredit ? 'Yes' : 'No'
      }. Additional context: ${estCustomNotes || 'Standard statutory range inquiry'}`;
      const result = await geminiService.estimateSentence(prompt);
      setEstAiAnalysis(result || '');
    } catch (error: any) {
      setEstAiError(error?.message || 'Unable to generate statutory analysis memo.');
    } finally {
      setIsEstAiLoading(false);
    }
  };

  // Compute interactive statutory sentence estimate
  const selectedOffense =
    STATUTORY_SENTENCE_MATRIX.find(r => r.id === estOffenseId) || STATUTORY_SENTENCE_MATRIX[0];
  const stateConfig = STATE_MULTIPLIERS[estState] || STATE_MULTIPLIERS.Colorado;
  const priorMultiplier =
    estPriorHistory === 'none' ? 1.0 : estPriorHistory === 'one_prior' ? 1.35 : 1.85;

  const rawMinMonths = Math.round(
    selectedOffense.baseMinMonths * stateConfig.factor * priorMultiplier
  );
  const rawMaxMonths = Math.round(
    selectedOffense.baseMaxMonths * stateConfig.factor * priorMultiplier
  );
  const creditReductionFactor = estProgramCredit
    ? (100 - selectedOffense.typicalGoodTimeCreditPct) / 100
    : 0.85;
  const projectedActualMonthsMin = Math.max(1, Math.round(rawMinMonths * creditReductionFactor));
  const projectedActualMonthsMax = Math.max(
    projectedActualMonthsMin,
    Math.round(rawMaxMonths * creditReductionFactor)
  );
  const paroleEligibilityMonths = Math.max(
    1,
    Math.round(rawMinMonths * (selectedOffense.paroleEligibilityPct / 100))
  );

  const filteredDockets = STATE_COURT_DOCKETS.filter(
    d =>
      d.state.toLowerCase().includes(docketSearchFilter.toLowerCase()) ||
      d.abbr.toLowerCase().includes(docketSearchFilter.toLowerCase()) ||
      d.courtPortalName.toLowerCase().includes(docketSearchFilter.toLowerCase())
  );

  const displayedMentalHealth = applyRatingFilter(MENTAL_HEALTH_RESOURCES);
  const displayedUACheckIns = applyRatingFilter(UA_CHECK_INS);
  const displayedParoleResources = applyRatingFilter(PAROLE_RESOURCES);

  return (
    <div className="space-y-12">
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

      {/* Header */}
      <header className="space-y-3">
        <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-[#984B27] font-semibold">
          <ShieldCheck size={14} /> RE-ENTRY COMMAND HUB · PEER-VERIFIED SERVICES
        </div>
        <h2 className="text-4xl md:text-5xl font-serif text-[#261F1A] tracking-tight">
          Resources & Community Reliability Directory
        </h2>
        <p className="text-sm md:text-base text-[#70655B] max-w-3xl">
          Access mental health support organizations & self-help workbooks, state court dockets, an interactive statutory sentence estimator, and parole/RMOMS check-in tools — backed by a <strong>user-driven 5-star rating system</strong> so you can verify local service reliability.
        </p>
      </header>

      {/* Community 5-Star Reliability Bar & Rating Filter */}
      <section className="bg-[#261F1A] text-[#F7F3EC] rounded-2xl p-5 md:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-5 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.16em] text-[#C69249] font-semibold">
            <Star size={13} className="fill-[#C69249]" /> COMMUNITY-VERIFIED 5-STAR RELIABILITY INDEX
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[#D6CEC2] pt-1">
            <span className="font-serif text-lg text-[#F7F3EC] tabular-nums">
              {globalAverageRating} ★ Avg Score
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono text-xs tabular-nums">
              {totalPeerRatingsCount} Peer Verifications
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono text-xs text-emerald-300 tabular-nums">
              {verifiedServicesCount} Verified 4★+ Services
            </span>
          </div>
          <p className="text-xs text-[#B8AFA4]">
            Click any star on a resource card below to rate reliability, confirm active phone lines, and leave tips for peers.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {[
            { id: 'all', label: 'All Services' },
            { id: 'verified4plus', label: '4★+ Verified Only' },
            { id: 'top_rated', label: 'Highest Rated First' }
          ].map(opt => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setRatingFilter(opt.id as any)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                ratingFilter === opt.id
                  ? 'bg-[#984B27] text-[#F7F3EC]'
                  : 'bg-white/10 text-[#F7F3EC]/85 hover:bg-white/20'
              }`}
            >
              {opt.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() =>
              setSelectedCategory(prev => (prev === 'bookmarks' ? 'all' : 'bookmarks'))
            }
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
              selectedCategory === 'bookmarks'
                ? 'bg-[#C69249] text-[#261F1A]'
                : 'bg-white/10 text-[#F7F3EC] hover:bg-white/20 border border-[#C69249]/40'
            }`}
          >
            <Bookmark
              size={13}
              className={selectedCategory === 'bookmarks' ? 'fill-[#261F1A]' : 'text-[#C69249]'}
            />
            Saved Bookmarks ({bookmarks.length})
          </button>
        </div>
      </section>

      {/* Pillar Navigation Tabs */}
      <div className="flex flex-wrap gap-2 bg-[#F6F2EB] border border-[#DDD4C7] rounded-2xl p-2">
        {[
          { id: 'all', label: 'All 4 Resource Pillars' },
          { id: 'bookmarks', label: `Saved Bookmarks (${bookmarks.length})` },
          { id: 'mental_health', label: '01 Mental Health & Self-Help' },
          { id: 'dockets', label: '02 State Court Dockets' },
          { id: 'estimator', label: '03 Sentence Estimator' },
          { id: 'parole', label: '04 Parole & RMOMS UA' },
          { id: 'map', label: 'Service Map' }
        ].map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setSelectedCategory(tab.id as any)}
            className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
              selectedCategory === tab.id
                ? 'bg-[#261F1A] text-[#F7F3EC]'
                : 'text-[#6E6359] hover:text-[#261F1A] hover:bg-[#261F1A]/5'
            }`}
          >
            {tab.id === 'bookmarks' && (
              <Bookmark
                size={12}
                className={selectedCategory === 'bookmarks' ? 'fill-[#C69249] text-[#C69249]' : 'text-[#984B27]'}
              />
            )}
            {tab.label}
          </button>
        ))}
      </div>

      <div className="space-y-16">
        {/* =====================================================================
            DEDICATED VIEW: MY SAVED RESOURCE BOOKMARKS
           ===================================================================== */}
        {selectedCategory === 'bookmarks' && (
          <section className="space-y-6" id="resources-saved-bookmarks">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#D8CFC2] pb-4">
              <div className="space-y-1">
                <span className="text-[11px] font-mono uppercase tracking-wider text-[#984B27] font-bold">
                  Personal Re-Entry Toolkit · Quick Access
                </span>
                <div className="flex items-center gap-3">
                  <Bookmark className="text-[#984B27] fill-[#984B27]" size={24} />
                  <h3 className="text-3xl font-serif text-[#261F1A]">
                    My Saved Resource Bookmarks ({bookmarks.length})
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCategory('all')}
                className="text-xs font-semibold text-[#984B27] hover:underline cursor-pointer"
              >
                Browse All 4 Resource Pillars →
              </button>
            </div>

            {bookmarks.length === 0 ? (
              <div className="p-10 rounded-2xl bg-[#F6F2EB] border border-dashed border-[#C9BFAF] text-center space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-[#EFE7DC] text-[#984B27] flex items-center justify-center mx-auto">
                  <Bookmark size={22} />
                </div>
                <div className="space-y-1 max-w-md mx-auto">
                  <h4 className="text-xl font-serif text-[#261F1A]">No Resources Bookmarked Yet</h4>
                  <p className="text-xs text-[#74695E] leading-relaxed">
                    Tap the bookmark ribbon on any mental health organization, self-help workbook, state court docket, RMOMS hotline, or parole portal to pin it here for instant access.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedCategory('all')}
                  className="px-5 py-2.5 rounded-xl bg-[#261F1A] text-[#F7F3EC] text-xs font-semibold hover:bg-[#3A3028] transition-colors cursor-pointer"
                >
                  Explore Resources Directory
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {bookmarks.map(bm => {
                  const mhMatch = MENTAL_HEALTH_RESOURCES.find(r => r.id === bm.resource_id);
                  const uaMatch = UA_CHECK_INS.find(r => r.id === bm.resource_id);
                  const paroleMatch = PAROLE_RESOURCES.find(r => r.id === bm.resource_id);
                  const shMatch = SELF_HELP_MATERIALS.find(r => r.id === bm.resource_id);
                  const docketMatch = STATE_COURT_DOCKETS.find(
                    d => `docket-${d.abbr.toLowerCase()}` === bm.resource_id
                  );

                  const resolvedTitle =
                    mhMatch?.title ||
                    uaMatch?.title ||
                    paroleMatch?.title ||
                    shMatch?.title ||
                    (docketMatch ? `${docketMatch.state} Court Dockets` : bm.resource_title);
                  const resolvedDesc =
                    mhMatch?.description ||
                    uaMatch?.description ||
                    paroleMatch?.description ||
                    shMatch?.summary ||
                    (docketMatch
                      ? `${docketMatch.courtPortalName} — ${docketMatch.notes}`
                      : 'Saved community re-entry resource.');
                  const resolvedPhone = mhMatch?.phone || uaMatch?.phone || paroleMatch?.phone || docketMatch?.paroleOfficePhone;
                  const resolvedUrl = mhMatch?.url || uaMatch?.url || paroleMatch?.url || docketMatch?.docketUrl;
                  const typeLabel =
                    bm.resource_type === 'mental_health'
                      ? 'Support Organization'
                      : bm.resource_type === 'self_help'
                      ? 'Self-Help Workbook'
                      : bm.resource_type === 'court_docket'
                      ? 'State Court Docket'
                      : bm.resource_type === 'ua_hotline'
                      ? 'UA Check-In Hotline'
                      : bm.resource_type === 'parole_portal'
                      ? 'State Parole Portal'
                      : 'Saved Resource';

                  return (
                    <motion.div
                      key={bm.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-[#F6F2EB] border border-[#DDD4C7] rounded-2xl p-6 flex flex-col justify-between shadow-2xs"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <span className="text-[10px] font-mono uppercase tracking-wider text-[#984B27] font-bold">
                            {typeLabel}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              handleToggleBookmark(bm.resource_id, bm.resource_type, resolvedTitle)
                            }
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-[#74695E] hover:text-red-700 cursor-pointer"
                            title="Remove bookmark"
                          >
                            <Bookmark size={13} className="fill-[#984B27] text-[#984B27]" />
                            Remove
                          </button>
                        </div>
                        <h4 className="text-lg font-serif font-semibold text-[#261F1A] mb-2">
                          {resolvedTitle}
                        </h4>
                        <p className="text-xs text-[#4A4037] leading-relaxed">{resolvedDesc}</p>
                      </div>

                      <div className="mt-4">
                        {bm.resource_type !== 'self_help' && (
                          <ResourceStarRatingWidget
                            resourceId={bm.resource_id}
                            resourceTitle={resolvedTitle}
                            summary={ratingsMap[bm.resource_id]}
                            onSubmitRating={handleSubmitResourceRating}
                            compact
                          />
                        )}

                        <div className="pt-3 mt-3 border-t border-[#E5DDD0] flex flex-wrap gap-2">
                          {shMatch ? (
                            <button
                              type="button"
                              onClick={() => {
                                setExpandedWorkbookId(shMatch.id);
                                setSelectedCategory('mental_health');
                              }}
                              className="w-full py-2 px-3 rounded-xl bg-[#261F1A] text-[#F7F3EC] text-xs font-semibold hover:bg-[#3A3028] transition-colors cursor-pointer"
                            >
                              Open Self-Help Workbook →
                            </button>
                          ) : (
                            <>
                              {resolvedPhone && (
                                <a
                                  href={`tel:${resolvedPhone}`}
                                  className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-[#984B27] text-[#F7F3EC] font-mono text-xs font-semibold hover:bg-[#823E1E]"
                                >
                                  <PhoneCall size={13} /> {resolvedPhone}
                                </a>
                              )}
                              {resolvedUrl && (
                                <a
                                  href={resolvedUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-[#261F1A] text-[#F7F3EC] text-xs font-semibold hover:bg-[#3A3028]"
                                >
                                  Open Portal <ExternalLink size={12} />
                                </a>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </section>
        )}
        {/* =====================================================================
            PILLAR 1: MENTAL HEALTH SUPPORT ORGANIZATIONS & SELF-HELP MATERIALS
           ===================================================================== */}
        {(selectedCategory === 'all' || selectedCategory === 'mental_health') && (
          <section className="space-y-8" id="resources-pillar-mental-health">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#D8CFC2] pb-4">
              <div className="space-y-1">
                <span className="text-[11px] font-mono uppercase tracking-wider text-[#984B27] font-bold">
                  Pillar 01 · Mental Well-Being & Re-Entry Coping Strategies
                </span>
                <div className="flex items-center gap-3">
                  <HeartPulse className="text-[#984B27]" size={26} />
                  <h3 className="text-3xl font-serif text-[#261F1A]">
                    Mental Health Support & Self-Help Materials
                  </h3>
                </div>
              </div>
              <span className="text-xs font-mono font-semibold text-rose-900 bg-rose-50 border border-rose-200 px-3.5 py-1.5 rounded-xl">
                24/7 Crisis Hotline: Call or Text 988
              </span>
            </div>

            {/* Verified Support Organizations Grid with 5-Star Ratings */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {displayedMentalHealth.map(mh => (
                <ResourceCard
                  key={mh.id}
                  item={mh}
                  icon={Activity}
                  type="Support Organization"
                  ratingSummary={ratingsMap[mh.id]}
                  onSubmitRating={handleSubmitResourceRating}
                  isBookmarked={bookmarkedIds.has(mh.id)}
                  onToggleBookmark={() => handleToggleBookmark(mh.id, 'mental_health', mh.title)}
                />
              ))}
            </div>

            {/* Curated Self-Help Materials & Actionable Workbooks */}
            <div className="bg-[#F6F2EB] border border-[#DDD4C7] rounded-2xl p-6 md:p-8 space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-[#E5DDD0] pb-4">
                <div>
                  <span className="text-[11px] font-mono uppercase tracking-wider text-[#7D7166] font-bold block">
                    Evidence-Based Re-Entry Workbooks
                  </span>
                  <h4 className="text-2xl font-serif text-[#261F1A] flex items-center gap-2 mt-0.5">
                    <BookOpen size={20} className="text-[#984B27]" /> Self-Help Materials & Grounding Guides
                  </h4>
                </div>
                <span className="text-xs text-[#74695E]">Click any guide to expand steps</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {SELF_HELP_MATERIALS.map(item => {
                  const isExpanded = expandedWorkbookId === item.id;
                  return (
                    <div
                      key={item.id}
                      className={`rounded-xl border transition-all p-5 flex flex-col justify-between ${
                        isExpanded
                          ? 'border-[#984B27] bg-[#FAF7F2] shadow-xs'
                          : 'border-[#D8CFC2] bg-[#FAF7F2]/70 hover:border-[#261F1A]'
                      }`}
                    >
                      <div className="space-y-2.5">
                        <div className="flex justify-between items-center text-[11px] font-mono gap-2">
                          <span className="font-semibold text-[#984B27]">{item.category}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-[#74695E]">{item.readTime}</span>
                            <button
                              type="button"
                              onClick={() => handleToggleBookmark(item.id, 'self_help', item.title)}
                              title={bookmarkedIds.has(item.id) ? 'Remove from Saved Bookmarks' : 'Save Workbook'}
                              aria-label={bookmarkedIds.has(item.id) ? `Remove ${item.title} from bookmarks` : `Bookmark ${item.title}`}
                              className={`p-1 rounded-md border transition-colors cursor-pointer ${
                                bookmarkedIds.has(item.id)
                                  ? 'bg-[#984B27] border-[#984B27] text-[#F7F3EC]'
                                  : 'bg-[#F6F2EB] border-[#D8CFC2] text-[#7D7166] hover:border-[#984B27] hover:text-[#984B27]'
                              }`}
                            >
                              <Bookmark size={12} className={bookmarkedIds.has(item.id) ? 'fill-[#F7F3EC]' : ''} />
                            </button>
                          </div>
                        </div>
                        <h5 className="text-lg font-serif text-[#261F1A]">{item.title}</h5>
                        <p className="text-xs text-[#4A4037] leading-relaxed">{item.summary}</p>

                        {isExpanded && (
                          <div className="pt-3 border-t border-[#E5DDD0] space-y-2">
                            <span className="text-[11px] font-mono uppercase tracking-wider font-bold text-[#984B27] block">
                              Step-by-Step Practice:
                            </span>
                            <ol className="list-decimal pl-5 space-y-1.5 text-xs text-[#261F1A]">
                              {item.steps.map((step, sIdx) => (
                                <li key={sIdx} className="leading-relaxed">
                                  {step}
                                </li>
                              ))}
                            </ol>
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => setExpandedWorkbookId(isExpanded ? null : item.id)}
                        className="mt-4 pt-3 border-t border-[#E5DDD0] text-left text-xs font-semibold text-[#984B27] hover:underline cursor-pointer"
                      >
                        {isExpanded ? 'Hide Workbook Steps ↑' : 'Open Self-Help Workbook →'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* AI Self-Help Guide Generator */}
            <div className="bg-[#261F1A] text-[#F7F3EC] p-7 md:p-9 rounded-2xl shadow-sm">
              <div className="max-w-4xl space-y-5">
                <div className="flex items-center gap-3">
                  <Sparkles className="text-[#C69249]" size={26} />
                  <div>
                    <span className="text-[11px] font-mono uppercase tracking-wider text-[#C69249] font-semibold block">
                      On-Demand Coping Plan
                    </span>
                    <h4 className="text-2xl md:text-3xl font-serif">
                      Custom Self-Help Guide Generator
                    </h4>
                  </div>
                </div>
                <p className="text-sm text-[#D6CEC2] leading-relaxed max-w-2xl">
                  Enter any topic (e.g., "managing sensory overload after release", "explaining a felony gap on a resume", "staying calm before a parole meeting") to generate a personalized workbook.
                </p>

                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    value={selfHelpTopic}
                    onChange={e => setSelfHelpTopic(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleGetSelfHelp()}
                    placeholder="What challenge are you navigating today?"
                    className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-sm text-[#F7F3EC] focus:outline-none focus:border-[#C69249] placeholder:text-white/45"
                  />
                  <button
                    type="button"
                    onClick={handleGetSelfHelp}
                    disabled={isLoadingSelfHelp || !selfHelpTopic.trim()}
                    className="bg-[#984B27] hover:bg-[#823E1E] text-[#F7F3EC] px-6 py-3 rounded-xl text-xs font-semibold disabled:opacity-50 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isLoadingSelfHelp ? (
                      'Generating...'
                    ) : (
                      <>
                        Generate Guide <ArrowRight size={15} />
                      </>
                    )}
                  </button>
                </div>

                {selfHelpError && (
                  <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-400/50 text-red-200 text-xs">
                    {selfHelpError}
                  </div>
                )}

                {selfHelpContent && (
                  <div className="prose prose-invert prose-sm max-w-none bg-white/5 border border-white/15 p-6 rounded-xl">
                    <Markdown>{selfHelpContent}</Markdown>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* =====================================================================
            PILLAR 2: STATE COURT DOCKETS & DOC INMATE LOCATOR DATABASE
           ===================================================================== */}
        {(selectedCategory === 'all' || selectedCategory === 'dockets') && (
          <section className="space-y-8" id="resources-pillar-dockets">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#D8CFC2] pb-4">
              <div className="space-y-1">
                <span className="text-[11px] font-mono uppercase tracking-wider text-[#984B27] font-bold">
                  Pillar 02 · Public Court Records & State Docket Portals
                </span>
                <div className="flex items-center gap-3">
                  <Scale className="text-[#984B27]" size={26} />
                  <h3 className="text-3xl font-serif text-[#261F1A]">
                    State Court Dockets & Case Lookup Database
                  </h3>
                </div>
              </div>
              <div className="relative w-full md:w-72">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7D7166]" size={15} />
                <input
                  type="text"
                  value={docketSearchFilter}
                  onChange={e => setDocketSearchFilter(e.target.value)}
                  placeholder="Filter by state (e.g. CA, Texas, NY)..."
                  className="w-full bg-[#F6F2EB] border border-[#D8CFC2] rounded-xl py-2.5 pl-9 pr-4 text-xs text-[#261F1A] focus:outline-none focus:border-[#984B27]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left 2 Columns: State Court Docket Cards with 5-Star Portal Verification */}
              <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filteredDockets.map(entry => {
                  const docketResourceId = `docket-${entry.abbr.toLowerCase()}`;
                  return (
                    <div
                      key={entry.abbr}
                      className="bg-[#F6F2EB] border border-[#DDD4C7] rounded-2xl p-5 flex flex-col justify-between space-y-3 shadow-2xs"
                    >
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-[11px] font-mono gap-2">
                          <span className="px-2 py-0.5 rounded-md bg-[#261F1A] text-[#F7F3EC] font-bold">
                            {entry.abbr}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-[#74695E]">Parole HQ: {entry.paroleOfficePhone}</span>
                            <button
                              type="button"
                              onClick={() =>
                                handleToggleBookmark(
                                  docketResourceId,
                                  'court_docket',
                                  `${entry.state} Court Dockets`
                                )
                              }
                              title={
                                bookmarkedIds.has(docketResourceId)
                                  ? 'Remove from Saved Bookmarks'
                                  : 'Save State Court Docket'
                              }
                              aria-label={
                                bookmarkedIds.has(docketResourceId)
                                  ? `Remove ${entry.state} docket from bookmarks`
                                  : `Bookmark ${entry.state} docket`
                              }
                              className={`p-1 rounded-md border transition-colors cursor-pointer ${
                                bookmarkedIds.has(docketResourceId)
                                  ? 'bg-[#984B27] border-[#984B27] text-[#F7F3EC]'
                                  : 'bg-[#FAF7F2] border-[#D8CFC2] text-[#7D7166] hover:border-[#984B27] hover:text-[#984B27]'
                              }`}
                            >
                              <Bookmark
                                size={12}
                                className={bookmarkedIds.has(docketResourceId) ? 'fill-[#F7F3EC]' : ''}
                              />
                            </button>
                          </div>
                        </div>
                        <h4 className="text-xl font-serif text-[#261F1A]">{entry.state}</h4>
                        <p className="text-xs font-semibold text-[#261F1A]">{entry.courtPortalName}</p>
                        <p className="text-xs text-[#4A4037] leading-relaxed">{entry.notes}</p>
                      </div>

                      <div>
                        <ResourceStarRatingWidget
                          resourceId={docketResourceId}
                          resourceTitle={`${entry.state} Court Docket Portal`}
                          summary={ratingsMap[docketResourceId]}
                          onSubmitRating={handleSubmitResourceRating}
                          compact
                        />

                        <div className="pt-3 mt-3 border-t border-[#E5DDD0] flex flex-wrap gap-2">
                          <a
                            href={entry.docketUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 bg-[#261F1A] text-[#F7F3EC] py-2 px-3 rounded-xl text-xs font-semibold text-center flex items-center justify-center gap-1 hover:bg-[#3A3028]"
                          >
                            Court Dockets <ExternalLink size={11} />
                          </a>
                          <a
                            href={entry.inmateLocatorUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 border border-[#D5CBC0] bg-[#FAF7F2] text-[#261F1A] py-2 px-3 rounded-xl text-xs font-semibold text-center flex items-center justify-center gap-1 hover:border-[#261F1A]"
                          >
                            DOC Locator <ExternalLink size={11} />
                          </a>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Right Column: Live AI Court Docket Assistant */}
              <div className="bg-[#F6F2EB] border border-[#DDD4C7] rounded-2xl p-6 space-y-5 h-fit shadow-xs">
                <div className="space-y-1 border-b border-[#E5DDD0] pb-3">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-[#984B27] font-bold block">
                    Live Search Grounding
                  </span>
                  <h4 className="text-2xl font-serif text-[#261F1A]">Court Docket Lookup Assistant</h4>
                  <p className="text-xs text-[#74695E]">
                    Search state docket procedures, clerk portals, or case lookup instructions by state and case/inmate ID.
                  </p>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#261F1A] mb-1">
                      Jurisdiction / State
                    </label>
                    <select
                      value={docketSelectedState}
                      onChange={e => setDocketSelectedState(e.target.value)}
                      className="w-full border border-[#D5CBC0] rounded-xl p-2.5 text-xs bg-[#FAF7F2] focus:outline-none focus:border-[#984B27]"
                    >
                      {STATE_COURT_DOCKETS.map(s => (
                        <option key={s.abbr} value={s.state}>
                          {s.state} ({s.abbr})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#261F1A] mb-1">
                      Case Number / County / Party Name
                    </label>
                    <input
                      type="text"
                      value={docketCaseQuery}
                      onChange={e => setDocketCaseQuery(e.target.value)}
                      placeholder="e.g. Denver District Court CR-2024..."
                      className="w-full border border-[#D5CBC0] bg-[#FAF7F2] rounded-xl p-2.5 text-xs focus:outline-none focus:border-[#984B27]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#261F1A] mb-1">
                      DOC / Register Number (Optional)
                    </label>
                    <input
                      type="text"
                      value={docketInmateId}
                      onChange={e => setDocketInmateId(e.target.value)}
                      placeholder="e.g. DOC #184920"
                      className="w-full border border-[#D5CBC0] bg-[#FAF7F2] rounded-xl p-2.5 text-xs focus:outline-none focus:border-[#984B27]"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleSearchDocket}
                    disabled={isDocketAiLoading}
                    className="w-full bg-[#261F1A] hover:bg-[#3A3028] text-[#F7F3EC] py-3 rounded-xl text-xs font-semibold disabled:opacity-50 cursor-pointer"
                  >
                    {isDocketAiLoading ? 'Searching State Records...' : 'Search Court Dockets'}
                  </button>
                </div>

                {docketAiError && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-900 text-xs">
                    {docketAiError}
                  </div>
                )}

                {docketAiResult && (
                  <div className="pt-4 border-t border-[#E5DDD0] space-y-3 text-xs">
                    <div className="p-3.5 bg-[#FAF7F2] border border-[#D8CFC2] rounded-xl prose prose-sm max-w-none">
                      <Markdown>{docketAiResult.text}</Markdown>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* =====================================================================
            PILLAR 3: SENTENCE ESTIMATOR TOOL (OFFENSE TYPE & STATE LAWS)
           ===================================================================== */}
        {(selectedCategory === 'all' || selectedCategory === 'estimator') && (
          <section className="space-y-8" id="resources-pillar-sentence-estimator">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#D8CFC2] pb-4">
              <div className="space-y-1">
                <span className="text-[11px] font-mono uppercase tracking-wider text-[#984B27] font-bold">
                  Pillar 03 · Statutory Sentencing & Earned Time Calculator
                </span>
                <div className="flex items-center gap-3">
                  <Calculator className="text-[#984B27]" size={26} />
                  <h3 className="text-3xl font-serif text-[#261F1A]">
                    Interactive Sentence Estimator Tool
                  </h3>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-amber-50 border border-amber-300 rounded-xl px-3.5 py-2 text-xs text-amber-950 font-medium">
                <AlertTriangle size={14} className="text-amber-700 shrink-0" />
                Educational Statutory Estimate — Not Formal Legal Counsel
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left 7 Cols: Statutory Offense & State Parameters */}
              <div className="lg:col-span-7 bg-[#F6F2EB] border border-[#DDD4C7] rounded-2xl p-6 md:p-8 space-y-6">
                <h4 className="text-2xl font-serif text-[#261F1A] border-b border-[#E5DDD0] pb-3">
                  1. Select State Law & Offense Classification
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#261F1A] mb-1.5">
                      State / Sentencing Jurisdiction
                    </label>
                    <select
                      value={estState}
                      onChange={e => setEstState(e.target.value)}
                      className="w-full border border-[#D5CBC0] rounded-xl p-3 text-xs font-medium bg-[#FAF7F2] focus:outline-none focus:border-[#984B27]"
                    >
                      {Object.keys(STATE_MULTIPLIERS).map(st => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#261F1A] mb-1.5">
                      Prior Felony Record Level
                    </label>
                    <select
                      value={estPriorHistory}
                      onChange={e => setEstPriorHistory(e.target.value as any)}
                      className="w-full border border-[#D5CBC0] rounded-xl p-3 text-xs font-medium bg-[#FAF7F2] focus:outline-none focus:border-[#984B27]"
                    >
                      <option value="none">First-Time / No Prior Felonies (1.0x)</option>
                      <option value="one_prior">1 Prior Felony Conviction (1.35x Enhancer)</option>
                      <option value="habitual">2+ Prior Felonies / Habitual Tier (1.85x)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#261F1A] mb-1.5">
                    Offense Type & Statutory Class
                  </label>
                  <select
                    value={estOffenseId}
                    onChange={e => setEstOffenseId(e.target.value)}
                    className="w-full border border-[#D5CBC0] rounded-xl p-3 text-xs font-medium bg-[#FAF7F2] focus:outline-none focus:border-[#984B27]"
                  >
                    {STATUTORY_SENTENCE_MATRIX.map(rule => (
                      <option key={rule.id} value={rule.id}>
                        [{rule.category}] {rule.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50/70 border border-emerald-200">
                  <input
                    id="est-good-time-check"
                    type="checkbox"
                    checked={estProgramCredit}
                    onChange={e => setEstProgramCredit(e.target.checked)}
                    className="w-4 h-4 accent-[#984B27]"
                  />
                  <label
                    htmlFor="est-good-time-check"
                    className="text-xs font-medium text-emerald-950 cursor-pointer"
                  >
                    Apply Good-Time / Earned-Time & Vocational Program Credits (Up to{' '}
                    {selectedOffense.typicalGoodTimeCreditPct}% reduction)
                  </label>
                </div>

                <div className="space-y-2 pt-2 border-t border-[#E5DDD0]">
                  <label className="block text-xs font-semibold text-[#261F1A]">
                    Optional Case Specifics for Deep Statutory Analysis
                  </label>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      type="text"
                      value={estCustomNotes}
                      onChange={e => setEstCustomNotes(e.target.value)}
                      placeholder="e.g. Plea agreement with restitution, non-violent mitigating factors..."
                      className="flex-1 border border-[#D5CBC0] bg-[#FAF7F2] rounded-xl p-3 text-xs focus:outline-none focus:border-[#984B27]"
                    />
                    <button
                      type="button"
                      onClick={handleRunAiSentenceAnalysis}
                      disabled={isEstAiLoading}
                      className="px-5 py-3 bg-[#984B27] hover:bg-[#823E1E] text-[#F7F3EC] rounded-xl text-xs font-semibold disabled:opacity-50 shrink-0 cursor-pointer"
                    >
                      {isEstAiLoading ? 'Analyzing...' : 'Run Statutory AI Memo'}
                    </button>
                  </div>
                </div>

                {estAiError && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-900 text-xs">
                    {estAiError}
                  </div>
                )}

                {estAiAnalysis && (
                  <div className="p-5 bg-[#FAF7F2] border border-[#D8CFC2] rounded-xl prose prose-sm max-w-none">
                    <Markdown>{estAiAnalysis}</Markdown>
                  </div>
                )}
              </div>

              {/* Right 5 Cols: Live Calculated Sentence Breakdown Card */}
              <div className="lg:col-span-5 bg-[#261F1A] text-[#F7F3EC] rounded-2xl p-7 flex flex-col justify-between space-y-6">
                <div className="space-y-5">
                  <div className="flex justify-between items-center border-b border-white/15 pb-3">
                    <span className="text-[11px] font-mono uppercase tracking-wider text-[#C69249] font-semibold">
                      Statutory Projection · {estState}
                    </span>
                    <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-white/10">
                      {selectedOffense.probationEligible ? 'Probation Eligible' : 'Mandatory Custody'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/5 border border-white/15 rounded-xl p-4">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-[#B8AFA4] block">
                        Guideline Range
                      </span>
                      <p className="text-2xl font-serif font-bold text-white mt-1 tabular-nums">
                        {rawMinMonths} – {rawMaxMonths} mos
                      </p>
                      <span className="text-[10px] font-mono text-[#B8AFA4] tabular-nums">
                        ({(rawMinMonths / 12).toFixed(1)} to {(rawMaxMonths / 12).toFixed(1)} yrs)
                      </span>
                    </div>

                    <div className="bg-[#984B27]/25 border border-[#C69249]/40 rounded-xl p-4">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-[#C69249] font-bold block">
                        With Good-Time Credits
                      </span>
                      <p className="text-2xl font-serif font-bold text-[#F7F3EC] mt-1 tabular-nums">
                        {projectedActualMonthsMin} – {projectedActualMonthsMax} mos
                      </p>
                      <span className="text-[10px] font-mono text-[#D6CEC2] tabular-nums">
                        Est. Parole @ {paroleEligibilityMonths} mos ({selectedOffense.paroleEligibilityPct}%)
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3 text-xs border-t border-white/15 pt-4">
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-wider text-[#C69249] font-bold block">
                        State Sentencing Rule ({estState}):
                      </span>
                      <p className="text-[#D6CEC2] leading-relaxed mt-0.5">
                        {stateConfig.truthInSentencingNote}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-300 font-bold block">
                        Offense-Specific Notes:
                      </span>
                      <p className="text-[#D6CEC2] leading-relaxed mt-0.5">
                        {selectedOffense.statutoryNotes}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/15 text-[11px] text-[#B8AFA4] font-mono">
                  Note: Actual sentences depend on judicial discretion, plea stipulations, pre-sentence confinement credit, and statutory enhancers.
                </div>
              </div>
            </div>
          </section>
        )}

        {/* =====================================================================
            PILLAR 4: PAROLE GUIDANCE, OFFICER LOOKUP & RMOMS UA CHECK-IN TOOLS
           ===================================================================== */}
        {(selectedCategory === 'all' || selectedCategory === 'parole') && (
          <section className="space-y-10" id="resources-pillar-parole">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#D8CFC2] pb-4">
              <div className="space-y-1">
                <span className="text-[11px] font-mono uppercase tracking-wider text-[#984B27] font-bold">
                  Pillar 04 · Supervision Compliance, Officer Directory & RMOMS Urine Analysis
                </span>
                <div className="flex items-center gap-3">
                  <UserCheck className="text-[#984B27]" size={26} />
                  <h3 className="text-3xl font-serif text-[#261F1A]">
                    Parole Officer Numbers, RMOMS Check-Ins & Supervision Guide
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddPO(true)}
                className="px-5 py-3 rounded-xl bg-[#261F1A] hover:bg-[#3A3028] text-[#F7F3EC] text-xs font-semibold flex items-center gap-2 cursor-pointer"
              >
                <Plus size={15} /> Save My Parole Officer Contact
              </button>
            </div>

            {/* RMOMS Urine Analysis Check-In Procedure & Hotlines */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-7 bg-[#F6F2EB] border border-[#DDD4C7] rounded-2xl p-6 md:p-8 space-y-6">
                <div className="flex items-center justify-between flex-wrap gap-3 border-b border-[#E5DDD0] pb-4">
                  <div className="flex items-center gap-3">
                    <Droplets className="text-[#984B27]" size={24} />
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-wider text-[#984B27] font-bold block">
                        Urine Analysis (UA) Protocol
                      </span>
                      <h4 className="text-2xl font-serif text-[#261F1A]">
                        RMOMS Daily Check-In Procedure Guide
                      </h4>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-semibold text-[#261F1A] bg-[#EFE7DC] border border-[#D8CFC2] px-3 py-1 rounded-xl">
                    Call Window: 5:00 AM – 1:00 PM
                  </span>
                </div>

                <p className="text-xs text-[#4A4037] leading-relaxed">
                  <strong>Rocky Mountain Offender Management Systems (RMOMS)</strong> and state UA hotlines assign you a personal 6-digit PIN or Color Group. Missing a random drop counts as a positive/refusal violation—follow this 4-step daily compliance checklist:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-[#FAF7F2] border border-[#D8CFC2] space-y-1">
                    <span className="text-[11px] font-mono font-bold text-[#984B27]">
                      01 · Daily Morning Call-In
                    </span>
                    <p className="text-xs text-[#4A4037] leading-relaxed">
                      Call your RMOMS hotline or check the web portal every single morning (including weekends and holidays) after 5:00 AM. Write down your confirmation number.
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-[#FAF7F2] border border-[#D8CFC2] space-y-1">
                    <span className="text-[11px] font-mono font-bold text-[#984B27]">
                      02 · Avoid Creatinine Dilution
                    </span>
                    <p className="text-xs text-[#4A4037] leading-relaxed">
                      Do not chug excessive water right before testing. A diluted sample (low specific gravity/creatinine) is treated as a technical violation by most parole boards.
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-[#FAF7F2] border border-[#D8CFC2] space-y-1">
                    <span className="text-[11px] font-mono font-bold text-[#984B27]">
                      03 · Bring Photo ID & Prescriptions
                    </span>
                    <p className="text-xs text-[#4A4037] leading-relaxed">
                      Arrive at the approved collection site before closing with your state ID/DOC card and ensure any prescribed medications are pre-logged with your PO.
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-[#FAF7F2] border border-[#D8CFC2] space-y-1">
                    <span className="text-[11px] font-mono font-bold text-[#984B27]">
                      04 · Shy Bladder Protocol
                    </span>
                    <p className="text-xs text-[#4A4037] leading-relaxed">
                      Once you check in at the RMOMS desk, you cannot leave the waiting room until a sample is provided. Give yourself at least 90 minutes before the clinic closes.
                    </p>
                  </div>
                </div>

                {/* Interactive RMOMS Color Group Readiness Check */}
                <div className="bg-[#EFE7DC]/80 border border-[#D8CFC2] rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-[#261F1A] block">
                      RMOMS Color Group Readiness Check
                    </span>
                    <p className="text-xs text-[#74695E]">
                      Select your assigned UA color group to generate a same-day testing checklist:
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <select
                      value={rmomsColor}
                      onChange={e => setRmomsColor(e.target.value)}
                      className="border border-[#D5CBC0] bg-[#FAF7F2] rounded-xl px-3 py-2 text-xs font-medium"
                    >
                      <option value="Amber">Amber (High Freq)</option>
                      <option value="Blue">Blue (Standard)</option>
                      <option value="Green">Green (Monthly)</option>
                      <option value="Gold">Gold (Phase II)</option>
                    </select>
                    <button
                      type="button"
                      onClick={() =>
                        setRmomsCheckResult(
                          `Group ${rmomsColor}: Verify via official hotline (303-555-0123) before 1:00 PM. Bring photo ID + $10–$15 voucher if not DOC-waived.`
                        )
                      }
                      className="px-4 py-2 rounded-xl bg-[#984B27] hover:bg-[#823E1E] text-[#F7F3EC] text-xs font-semibold cursor-pointer"
                    >
                      Verify Protocol
                    </button>
                  </div>
                </div>
                {rmomsCheckResult && (
                  <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-950 text-xs flex items-center gap-2">
                    <CheckCircle2 size={15} className="text-emerald-700 shrink-0" />
                    <span>{rmomsCheckResult}</span>
                  </div>
                )}
              </div>

              {/* Right 5 Cols: Official UA Hotlines (with 5-Star Ratings) & PO Guide */}
              <div className="lg:col-span-5 space-y-5">
                <div className="bg-[#F6F2EB] border border-[#DDD4C7] rounded-2xl p-6 space-y-4">
                  <div className="flex items-center gap-2 border-b border-[#E5DDD0] pb-3">
                    <Building2 size={19} className="text-[#984B27]" />
                    <h4 className="text-xl font-serif text-[#261F1A]">
                      How to Find Your Parole Officer’s Number
                    </h4>
                  </div>
                  <ol className="list-decimal pl-5 space-y-2 text-xs text-[#4A4037] leading-relaxed">
                    <li>
                      <strong>Check Your Release Certificate:</strong> Your reporting instructions sheet lists your assigned District Office address and your reporting window (usually within 24 hours of release).
                    </li>
                    <li>
                      <strong>Call Regional Parole HQ:</strong> Use the verified State Parole Directory below with your DOC/Inmate number to obtain your Community Parole Officer’s direct cell and desk extension.
                    </li>
                    <li>
                      <strong>Save Your PO Below:</strong> Store your officer’s direct phone number and district office in your personal tracker below for one-tap calling.
                    </li>
                  </ol>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {displayedUACheckIns.map(ua => (
                    <ResourceCard
                      key={ua.id}
                      item={ua}
                      icon={TestTube}
                      type="UA Check-In Hotline"
                      ratingSummary={ratingsMap[ua.id]}
                      onSubmitRating={handleSubmitResourceRating}
                      isBookmarked={bookmarkedIds.has(ua.id)}
                      onToggleBookmark={() => handleToggleBookmark(ua.id, 'ua_hotline', ua.title)}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* State Parole Division Portals with 5-Star Community Ratings */}
            <div>
              <h4 className="text-2xl font-serif text-[#261F1A] mb-5">
                State Parole Division Directories & Supervision Portals
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {displayedParoleResources.map(parole => (
                  <ResourceCard
                    key={parole.id}
                    item={parole}
                    icon={Shield}
                    type="State Parole Portal"
                    ratingSummary={ratingsMap[parole.id]}
                    onSubmitRating={handleSubmitResourceRating}
                    isBookmarked={bookmarkedIds.has(parole.id)}
                    onToggleBookmark={() =>
                      handleToggleBookmark(parole.id, 'parole_portal', parole.title)
                    }
                  />
                ))}
              </div>
            </div>

            {/* My Parole Officers Personal Contact Manager */}
            <div className="pt-2">
              <div className="flex items-center justify-between mb-5 border-b border-[#D8CFC2] pb-3">
                <div className="flex items-center gap-2.5">
                  <Badge className="text-[#984B27]" size={22} />
                  <h4 className="text-2xl font-serif text-[#261F1A]">My Saved Parole Officers</h4>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddPO(true)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-[#984B27] hover:underline cursor-pointer"
                >
                  <Plus size={15} /> Add Officer Contact
                </button>
              </div>

              <AnimatePresence>
                {showAddPO && (
                  <motion.form
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    onSubmit={handleAddPO}
                    className="bg-[#F6F2EB] border border-[#DDD4C7] rounded-2xl p-6 mb-6 overflow-hidden"
                  >
                    <div className="flex justify-between items-center mb-5">
                      <h4 className="font-semibold text-sm text-[#261F1A]">
                        Add Parole Officer Contact
                      </h4>
                      <button
                        type="button"
                        onClick={() => setShowAddPO(false)}
                        className="text-[#74695E] hover:text-[#261F1A] cursor-pointer"
                      >
                        <X size={18} />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                      <div>
                        <label className="block text-xs font-semibold text-[#261F1A] mb-1">
                          Officer Name
                        </label>
                        <input
                          required
                          type="text"
                          value={poName}
                          onChange={e => setPoName(e.target.value)}
                          className="w-full border border-[#D5CBC0] bg-[#FAF7F2] rounded-xl p-3 text-sm focus:outline-none focus:border-[#984B27]"
                          placeholder="e.g. Officer M. Reynolds"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[#261F1A] mb-1">
                          Agency / Division
                        </label>
                        <input
                          required
                          type="text"
                          value={poAgency}
                          onChange={e => setPoAgency(e.target.value)}
                          className="w-full border border-[#D5CBC0] bg-[#FAF7F2] rounded-xl p-3 text-sm focus:outline-none focus:border-[#984B27]"
                          placeholder="e.g. CDOC Division of Adult Parole"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[#261F1A] mb-1">
                          Direct Phone Number
                        </label>
                        <input
                          required
                          type="text"
                          value={poPhone}
                          onChange={e => setPoPhone(e.target.value)}
                          className="w-full border border-[#D5CBC0] bg-[#FAF7F2] rounded-xl p-3 text-sm focus:outline-none focus:border-[#984B27]"
                          placeholder="(303) 555-0199"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[#261F1A] mb-1">
                          District / Field Office
                        </label>
                        <input
                          required
                          type="text"
                          value={poDistrict}
                          onChange={e => setPoDistrict(e.target.value)}
                          className="w-full border border-[#D5CBC0] bg-[#FAF7F2] rounded-xl p-3 text-sm focus:outline-none focus:border-[#984B27]"
                          placeholder="e.g. Denver District 2 — Lincoln St"
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      className="bg-[#984B27] hover:bg-[#823E1E] text-[#F7F3EC] px-6 py-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                    >
                      Save Officer Contact
                    </button>
                  </motion.form>
                )}
              </AnimatePresence>

              {officers.length === 0 && !showAddPO && (
                <div className="p-8 text-center text-sm text-[#74695E] border border-dashed border-[#C9BFAF] rounded-2xl bg-[#F6F2EB]">
                  No personal parole officers saved yet. Click "Add Officer Contact" to keep your PO’s phone number and district office on hand.
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {officers.map(officer => (
                  <motion.div
                    key={officer.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-[#F6F2EB] border border-[#DDD4C7] rounded-2xl p-6 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex justify-between items-start mb-4">
                        <div className="p-2.5 bg-[#261F1A] text-[#F7F3EC] rounded-xl">
                          <Badge size={20} />
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleDeleteOfficer(officer)}
                            className="text-red-700 hover:bg-red-100/60 p-1.5 rounded-lg transition-all cursor-pointer"
                            title="Delete Officer"
                          >
                            <Trash2 size={15} />
                          </button>
                          <span className="text-[10px] font-mono uppercase tracking-wider text-[#7D7166]">
                            Assigned PO
                          </span>
                        </div>
                      </div>
                      <h4 className="text-lg font-serif font-semibold text-[#261F1A] mb-1">
                        {officer.name}
                      </h4>
                      <p className="text-xs font-semibold text-[#4A4037] mb-1">{officer.agency}</p>
                      <p className="text-xs text-[#74695E] mb-5">{officer.district}</p>
                    </div>
                    <a
                      href={`tel:${officer.phone}`}
                      className="inline-flex items-center justify-between w-full pt-3 border-t border-[#E5DDD0] font-mono text-xs font-semibold text-[#984B27] hover:text-[#261F1A] transition-colors"
                    >
                      <span>{officer.phone}</span>
                      <PhoneCall size={15} />
                    </a>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Interactive Nearby Services Map */}
        {(selectedCategory === 'all' || selectedCategory === 'map') && (
          <section className="space-y-5">
            <div className="flex items-center gap-2.5 border-b border-[#D8CFC2] pb-3">
              <MapIcon className="text-[#984B27]" size={24} />
              <h3 className="text-3xl font-serif text-[#261F1A]">Nearby Re-entry Services Map</h3>
            </div>
            <ServiceMap />
          </section>
        )}
      </div>

      <ConfirmationDialog
        isOpen={deleteConfirmOpen}
        title="Delete Parole Officer"
        message={`Are you sure you want to remove ${officerToDelete?.name} from your parole officers contact list?`}
        onConfirm={executeDeleteOfficer}
        onCancel={() => {
          setDeleteConfirmOpen(false);
          setOfficerToDelete(null);
        }}
        confirmText="Remove"
        cancelText="Cancel"
        type="danger"
      />
    </div>
  );
}
