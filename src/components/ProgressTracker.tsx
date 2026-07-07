import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { 
  TrendingUp, 
  CheckCircle, 
  Award, 
  Flame, 
  Sparkles, 
  Plus, 
  Trash2, 
  Activity, 
  AlertCircle, 
  ShieldCheck, 
  BookOpen, 
  UserPlus, 
  Home, 
  Briefcase,
  ChevronRight,
  Info,
  CalendarDays
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';

interface Milestone {
  id: string;
  title: string;
  category: 'legal' | 'health' | 'career' | 'housing' | 'social';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  isCompleted: boolean;
  xpValue: number;
  completedAt?: string;
}

export default function ProgressTracker() {
  const { user, token } = useAuth();
  
  // Overall state
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [journalCount, setJournalCount] = useState(0);
  const [hasNewCompleted, setHasNewCompleted] = useState(false);
  const [customGoalText, setCustomGoalText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Load state on mount
  useEffect(() => {
    // 1. Fetch count of wellness journals to award streaks & credit
    try {
      fetch('/api/wellness/journals', {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setJournalCount(data.length);
        }
      })
      .catch(console.error);
    } catch (e) {
      console.warn("Problem loading wellness journal stats", e);
    }

    // Helper to get relative past date in YYYY-MM-DD
    const getPastDateStr = (daysAgo: number) => {
      const d = new Date();
      d.setDate(d.getDate() - daysAgo);
      return d.toISOString().split('T')[0];
    };

    // 2. Fetch milestones list
    const storageKey = `yard_progress_milestones_${user?.id}`;
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as Milestone[];
        // Upgrade existing completed milestones that lack a completedAt property with a mock past date
        const upgraded = parsed.map((m, idx) => {
          if (m.isCompleted && !m.completedAt) {
            return {
              ...m,
              completedAt: getPastDateStr((idx % 15) + 2) // distribute over the last couple weeks
            };
          }
          return m;
        });
        setMilestones(upgraded);
      } catch (err) {
        console.error(err);
      }
    } else {
      // Default strategic road map for re-entry with seeded historical milestones
      const defaultRoadmap: Milestone[] = [
        { id: '1', title: 'Schedule official parole check-in', category: 'legal', difficulty: 'beginner', isCompleted: true, xpValue: 100, completedAt: getPastDateStr(10) },
        { id: '2', title: 'Assemble legal identification (Gov ID/DL or SSN card)', category: 'legal', difficulty: 'beginner', isCompleted: false, xpValue: 150 },
        { id: '3', title: 'Log first daily mental checklist in Wellness journal', category: 'health', difficulty: 'beginner', isCompleted: false, xpValue: 100 },
        { id: '4', title: 'Formally request and secure a support/transition mentor', category: 'social', difficulty: 'intermediate', isCompleted: false, xpValue: 150 },
        { id: '5', title: 'Prepare a transitional employment resume', category: 'career', difficulty: 'beginner', isCompleted: false, xpValue: 120 },
        { id: '6', title: 'Research and apply to 3 certified housing resources', category: 'housing', difficulty: 'intermediate', isCompleted: false, xpValue: 200 },
        { id: '7', title: 'Commit to weekly group mentorship talks or class peer groups', category: 'social', difficulty: 'advanced', isCompleted: false, xpValue: 250 },
        { id: '8', title: 'Secure a full career/job internship connection', category: 'career', difficulty: 'advanced', isCompleted: false, xpValue: 300 },
        { id: 'hist-1', title: 'Obtain transitional clothing grant voucher', category: 'social', difficulty: 'beginner', isCompleted: true, xpValue: 100, completedAt: getPastDateStr(24) },
        { id: 'hist-2', title: 'Attend initial county health services seminar', category: 'health', difficulty: 'beginner', isCompleted: true, xpValue: 120, completedAt: getPastDateStr(18) },
        { id: 'hist-3', title: 'Complete digital literacy orientation checklist', category: 'career', difficulty: 'beginner', isCompleted: true, xpValue: 80, completedAt: getPastDateStr(5) }
      ];
      localStorage.setItem(storageKey, JSON.stringify(defaultRoadmap));
      setMilestones(defaultRoadmap);
    }
  }, [user, token]);

  const saveMilestones = (updated: Milestone[]) => {
    setMilestones(updated);
    localStorage.setItem(`yard_progress_milestones_${user?.id}`, JSON.stringify(updated));
  };

  // Toggle checklist check state
  const handleToggleMilestone = (id: string) => {
    const target = milestones.find(m => m.id === id);
    const becameCompleted = target ? !target.isCompleted : false;
    const completedAtStr = becameCompleted ? new Date().toISOString().split('T')[0] : undefined;
    
    if (becameCompleted) {
      setHasNewCompleted(true);
      setTimeout(() => setHasNewCompleted(false), 2600); // Celebrate effect timer
    }

    const updated = milestones.map(m => m.id === id ? { ...m, isCompleted: becameCompleted, completedAt: completedAtStr } : m);
    saveMilestones(updated);
  };

  // Custom micro-milestone generation
  const handleAddCustomGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customGoalText.trim()) return;

    const newItem: Milestone = {
      id: crypto.randomUUID(),
      title: customGoalText.trim(),
      category: 'social',
      difficulty: 'beginner',
      isCompleted: false,
      xpValue: 80
    };

    saveMilestones([...milestones, newItem]);
    setCustomGoalText('');
  };

  const handleDeleteMilestone = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    saveMilestones(milestones.filter(m => m.id !== id));
  };

  // Recharts interactive settings & datasets for past 30 days
  const [chartViewMode, setChartViewMode] = useState<'daily' | 'weekly'>('daily');

  const getChartDataset = () => {
    // Generate daily buckets for the past 30 days
    const dailyBuckets = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      dailyBuckets.push({
        dateStr,
        label,
        count: 0,
        xp: 0,
        milestonesList: [] as string[]
      });
    }

    // Populate daily completions count and XP counts
    milestones.forEach(m => {
      if (m.isCompleted && m.completedAt) {
        const found = dailyBuckets.find(b => b.dateStr === m.completedAt);
        if (found) {
          found.count += 1;
          found.xp += m.xpValue;
          found.milestonesList.push(m.title);
        }
      }
    });

    if (chartViewMode === 'daily') {
      return dailyBuckets;
    }

    // Group into 4 weekly blocks spanning the last 30 days
    const weeklyData = [
      { id: 4, name: 'Weeks 3-4 Ago', count: 0, xp: 0, range: '', items: [] as string[] },
      { id: 3, name: 'Weeks 2-3 Ago', count: 0, xp: 0, range: '', items: [] as string[] },
      { id: 2, name: 'Last 8-14 Days', count: 0, xp: 0, range: '', items: [] as string[] },
      { id: 1, name: 'Last 7 Days', count: 0, xp: 0, range: '', items: [] as string[] }
    ];

    const formatRange = (startOffset: number, endOffset: number) => {
      const s = new Date();
      s.setDate(s.getDate() - startOffset);
      const e = new Date();
      e.setDate(e.getDate() - endOffset);
      const opt: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
      return `${s.toLocaleDateString('en-US', opt)} - ${e.toLocaleDateString('en-US', opt)}`;
    };

    weeklyData[0].range = formatRange(29, 22);
    weeklyData[1].range = formatRange(21, 15);
    weeklyData[2].range = formatRange(14, 8);
    weeklyData[3].range = formatRange(7, 0);

    dailyBuckets.forEach((b, idx) => {
      if (idx < 8) {
        weeklyData[0].count += b.count;
        weeklyData[0].xp += b.xp;
        weeklyData[0].items.push(...b.milestonesList);
      } else if (idx < 15) {
        weeklyData[1].count += b.count;
        weeklyData[1].xp += b.xp;
        weeklyData[1].items.push(...b.milestonesList);
      } else if (idx < 23) {
        weeklyData[2].count += b.count;
        weeklyData[2].xp += b.xp;
        weeklyData[2].items.push(...b.milestonesList);
      } else {
        weeklyData[3].count += b.count;
        weeklyData[3].xp += b.xp;
        weeklyData[3].items.push(...b.milestonesList);
      }
    });

    return weeklyData.map(w => ({
      label: w.name,
      subLabel: w.range,
      count: w.count,
      xp: w.xp,
      milestonesList: w.items
    }));
  };

  const chartData = getChartDataset();

  // Custom tooltips matching the high contrast aesthetic
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-[#141414] text-white p-3 border border-neutral-700 shadow-xl max-w-xs font-mono text-[10px] space-y-1.5 uppercase rounded-sm z-[200]">
          <p className="font-bold border-b border-white/20 pb-1 text-amber-400">
            {data.label} {data.subLabel ? `(${data.subLabel})` : ''}
          </p>
          <div className="space-y-1">
            <p className="font-semibold text-neutral-300">
              Completed: <strong className="text-white font-black">{data.count}</strong> {data.count === 1 ? 'task' : 'tasks'}
            </p>
            <p className="text-rose-400">
              XP Multiplier: +{data.xp} XP
            </p>
          </div>
          {data.milestonesList && data.milestonesList.length > 0 && (
            <div className="pt-1.5 border-t border-white/10 mt-1.5 text-[9px] lowercase font-sans text-neutral-400 space-y-0.5 normal-case">
              <span className="font-mono text-[8px] uppercase tracking-wider block font-bold text-neutral-500">Completed Checklist:</span>
              {data.milestonesList.map((item: string, i: number) => (
                <div key={i} className="flex gap-1.5 items-start">
                  <span className="text-amber-500 shrink-0">✓</span>
                  <span className="truncate">{item}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  // Level & XP Math
  const completedMilestones = milestones.filter(m => m.isCompleted);
  const totalXPEarned = completedMilestones.reduce((acc, current) => acc + current.xpValue, 0) + (journalCount * 40);
  const completionPercentage = milestones.length > 0
    ? Math.round((completedMilestones.length / milestones.length) * 100)
    : 0;

  // Level thresholds: 250 XP per tier
  const calculatedLevel = Math.floor(totalXPEarned / 250) + 1;
  const xpInCurrentLevel = totalXPEarned % 250;
  const xpNeededForNext = 250 - xpInCurrentLevel;

  const getRankName = (lvl: number) => {
    if (lvl <= 2) return 'Solid Ground Explorer';
    if (lvl <= 4) return 'Transitional Champion';
    if (lvl <= 6) return 'Re-entry Guide';
    return 'Vanguard Community Elder';
  };

  const getCategoryTheme = (cat: string) => {
    switch (cat) {
      case 'legal': return { icon: ShieldCheck, color: 'text-[#141414]', border: 'border-zinc-300', bg: 'bg-zinc-50' };
      case 'health': return { icon: Activity, color: 'text-rose-600', border: 'border-rose-100', bg: 'bg-rose-50/50' };
      case 'career': return { icon: Briefcase, color: 'text-blue-600', border: 'border-blue-100', bg: 'bg-blue-50/50' };
      case 'housing': return { icon: Home, color: 'text-amber-600', border: 'border-amber-100', bg: 'bg-amber-50/50' };
      default: return { icon: UserPlus, color: 'text-violet-600', border: 'border-violet-100', bg: 'bg-violet-50/50' };
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 py-4 px-1">
      
      {/* Dynamic celebratory splash */}
      <AnimatePresence>
        {hasNewCompleted && (
          <motion.div
            initial={{ opacity: 0, y: -25, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -25, scale: 0.95 }}
            className="bg-emerald-50 border-2 border-emerald-500 p-4 shadow-xl text-emerald-900 flex justify-between items-center gap-4 rounded-sm fixed top-24 left-1/2 -translate-x-1/2 z-[100] max-w-sm w-full font-sans"
          >
            <div className="flex items-center gap-3">
              <Sparkles className="text-emerald-600 animate-spin shrink-0" size={24} />
              <div>
                <p className="font-extrabold uppercase text-[10px] tracking-wider text-emerald-800">Transition Milestone Reached!</p>
                <p className="text-xs font-medium">Progress score recalculated. Keep striving!</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main progress bento header */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Gamified circular index wheel */}
        <div className="md:col-span-1 bg-white border border-[#141414] p-6 text-center flex flex-col justify-between shadow-sm relative">
          <div className="absolute top-4 right-4 bg-amber-50 border border-amber-200 text-amber-900 text-[9px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-sm">
            Live Metric
          </div>
          <div className="space-y-1 text-left pb-4 border-b border-neutral-100">
            <h3 className="font-serif italic text-lg text-neutral-900 leading-none">Transitional Progression Index</h3>
            <p className="text-[10px] font-mono uppercase tracking-wider text-neutral-500">Overall milestone checklist completed</p>
          </div>

          <div className="py-8 flex justify-center items-center relative">
            <svg className="w-36 h-36 transform -rotate-90">
              <circle
                cx="72"
                cy="72"
                r="64"
                className="stroke-neutral-100"
                strokeWidth="10"
                fill="transparent"
              />
              <circle
                cx="72"
                cy="72"
                r="64"
                className="stroke-amber-500 transition-all duration-[1000ms] ease-out-quad"
                strokeWidth="10"
                strokeDasharray={402}
                strokeDashoffset={402 - (402 * completionPercentage) / 100}
                strokeLinecap="round"
                fill="transparent"
              />
            </svg>
            <div className="absolute inset-x-0 inset-y-0 flex flex-col justify-center items-center mt-3">
              <span className="text-4xl font-black font-mono tracking-tighter text-[#141414]">
                {completionPercentage}%
              </span>
              <span className="text-[9px] font-mono text-neutral-500 uppercase font-black uppercase tracking-widest">
                Transited
              </span>
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-xs text-neutral-600 font-medium">
              Completed <strong className="text-[#141414] font-black">{completedMilestones.length}</strong> of {milestones.length} structural milestones
            </div>
            <div className="w-full bg-neutral-100 h-1.5 rounded-full overflow-hidden mt-2">
              <div 
                className="bg-amber-500 h-full transition-all duration-700" 
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </div>
        </div>

        {/* Level and League advancement */}
        <div className="md:col-span-1 bg-white border border-[#141414] p-6 flex flex-col justify-between shadow-sm">
          <div className="space-y-4">
            <div className="flex gap-2.5 items-center">
              <div className="bg-[#141414] text-[#E4E3E0] p-2.5 rounded-sm">
                <Award size={22} />
              </div>
              <div>
                <h4 className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Member Rank & Title</h4>
                <p className="font-serif italic text-lg leading-tight text-neutral-900">{getRankName(calculatedLevel)}</p>
              </div>
            </div>

            <div className="bg-neutral-50 p-4 border border-[#141414]/10 rounded-sm">
              <div className="flex justify-between items-baseline mb-2">
                <span className="text-xs font-mono uppercase font-semibold text-neutral-500">Stage Level</span>
                <span className="text-2xl font-black font-mono text-[#141414]">Lvl {calculatedLevel}</span>
              </div>
              <div className="w-full bg-neutral-200 h-2.5 rounded-full overflow-hidden mb-1">
                <div 
                  className="bg-zinc-800 h-full transition-all duration-500" 
                  style={{ width: `${(xpInCurrentLevel / 250) * 100}%` }}
                />
              </div>
              <div className="flex justify-between text-[9px] font-mono text-neutral-500 uppercase font-bold tracking-widest leading-none pt-1">
                <span>{xpInCurrentLevel} XP</span>
                <span>{xpNeededForNext} XP to Level {calculatedLevel + 1}</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-neutral-100 flex justify-between items-center text-[11px] font-medium text-neutral-600">
            <span>Wellness Journals: {journalCount} entries</span>
            <span className="text-rose-600 font-bold flex items-center gap-0.5 font-mono">
              <Flame size={12} fill="currentColor" /> +{journalCount * 40} XP Earned
            </span>
          </div>
        </div>

        {/* Addictive Streaks & Wellness counter card */}
        <div className="md:col-span-1 bg-[#141414] text-[#E4E3E0] p-6 flex flex-col justify-between shadow-sm relative overflow-hidden">
          {/* Subtle decoration lines simulating map vectors */}
          <div className="absolute inset-0 opacity-5 pointer-events-none bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:12px_12px]" />

          <div className="space-y-3 relative z-10">
            <div className="flex items-center gap-1.5 text-amber-400">
              <Flame size={22} className="animate-pulse" fill="currentColor" />
              <span className="text-[10px] font-mono uppercase tracking-widest font-black">Habitual Wellness Streak</span>
            </div>
            
            <h3 className="text-3xl font-serif italic font-normal text-white">
              {journalCount > 0 ? `${journalCount} Success Days` : 'Initiate Streak'}
            </h3>
            
            <p className="text-xs text-neutral-300 leading-relaxed font-light">
              Submit micro personal status logs in your Wellness Journal regularly. Each entry reinforces consistent re-entry discipline and adds instant XP.
            </p>
          </div>

          <div className="p-3 bg-white/5 border border-white/10 text-xs text-white/90 rounded-sm relative z-10 flex flex-wrap items-center justify-between gap-2 mt-4">
            <span className="font-mono uppercase tracking-wider text-[10px]">Add entry to unlock:</span>
            <div className="text-[10px] bg-amber-400 text-black px-2 py-0.5 font-black uppercase rounded-sm">
              Level 2 Upgrade
            </div>
          </div>
        </div>

      </div>

      {/* 30-Day Completion History Chart Card */}
      <div className="bg-white border border-[#141414] p-6 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[#141414]/10 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-amber-600">
              <CalendarDays size={18} />
              <h3 className="text-xs font-mono uppercase tracking-widest font-black">Velocity Analytics</h3>
            </div>
            <h4 className="font-serif italic text-2xl text-[#141414] leading-none">30-Day Milestone Completion Trend</h4>
            <p className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider">Tracks milestones checked off and effort milestones built over the past 30 days</p>
          </div>
          
          {/* Controls to toggle Daily / Weekly */}
          <div className="flex gap-1 bg-neutral-100 p-0.5 border border-[#141414]/10 rounded-sm">
            <button
              onClick={() => setChartViewMode('daily')}
              className={`px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest transition-all rounded-sm cursor-pointer ${
                chartViewMode === 'daily'
                  ? 'bg-[#141414] text-white'
                  : 'text-neutral-500 hover:text-[#141414]'
              }`}
            >
              Daily Trend
            </button>
            <button
              onClick={() => setChartViewMode('weekly')}
              className={`px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest transition-all rounded-sm cursor-pointer ${
                chartViewMode === 'weekly'
                  ? 'bg-[#141414] text-white'
                  : 'text-neutral-500 hover:text-[#141414]'
              }`}
            >
              Weekly Blocks
            </button>
          </div>
        </div>

        {/* Visual Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-neutral-50 p-4 border border-[#141414]/5 rounded-sm">
          <div>
            <span className="block text-[8px] font-mono text-neutral-500 uppercase font-bold">Total Completed(30d)</span>
            <span className="text-xl font-mono font-black text-[#141414]">
              {chartData.reduce((acc, curr) => acc + curr.count, 0)} Items
            </span>
          </div>
          <div>
            <span className="block text-[8px] font-mono text-neutral-500 uppercase font-bold">XP Generated(30d)</span>
            <span className="text-xl font-mono font-black text-amber-600">
              +{chartData.reduce((acc, curr) => acc + curr.xp, 0)} XP
            </span>
          </div>
          <div>
            <span className="block text-[8px] font-mono text-neutral-500 uppercase font-bold">Peak Effort Day/Block</span>
            <span className="text-xl font-mono font-black text-zinc-800">
              {Math.max(...chartData.map(c => c.count)) > 0 
                ? `${Math.max(...chartData.map(c => c.count))} Tasks`
                : '0 Tasks'
              }
            </span>
          </div>
          <div>
            <span className="block text-[8px] font-mono text-neutral-500 uppercase font-bold">Analytics Alignment</span>
            <span className="text-xs font-serif italic text-emerald-600 block mt-1">
              Active Progression Continuous
            </span>
          </div>
        </div>

        {/* Chart Container */}
        <div className="h-64 w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.85}/>
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.25}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e3e0" strokeOpacity={0.4} />
              <XAxis 
                dataKey="label" 
                tick={{ fontSize: 9, fontFamily: 'monospace', fill: '#666' }}
                axisLine={{ stroke: '#141414', strokeOpacity: 0.15 }}
                tickLine={false}
              />
              <YAxis 
                allowDecimals={false}
                tick={{ fontSize: 9, fontFamily: 'monospace', fill: '#666' }}
                axisLine={{ stroke: '#141414', strokeOpacity: 0.15 }}
                tickLine={false}
              />
              <Tooltip 
                content={<CustomTooltip />}
                cursor={{ fill: 'rgba(20, 20, 20, 0.03)' }}
              />
              <Bar 
                dataKey="count" 
                fill="url(#barGradient)"
                radius={[3, 3, 0, 0]}
                maxBarSize={chartViewMode === 'daily' ? 14 : 45}
              >
                {chartData.map((entry, index) => {
                  const hasCompletions = entry.count > 0;
                  return (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={hasCompletions ? '#f59e0b' : '#eee'} 
                      stroke={hasCompletions ? '#d97706' : '#d4d4d8'}
                      strokeWidth={hasCompletions ? 1 : 0.5}
                      strokeDasharray={hasCompletions ? '' : '1 2'}
                    />
                  );
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Filter and active goal task grid outline */}
      <div className="bg-white border border-[#141414] p-6 shadow-sm space-y-6">
        
        {/* Category filters & quick custom adder form */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[#141414]/10 pb-6">
          <div className="flex flex-wrap gap-1.5">
            {['all', 'legal', 'health', 'career', 'housing', 'social'].map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest border transition-all select-none cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-[#141414] border-[#141414] text-white'
                    : 'border-neutral-200 hover:border-black text-neutral-500 hover:text-[#141414]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <form onSubmit={handleAddCustomGoal} className="flex gap-2 w-full md:w-auto max-w-sm">
            <input 
              type="text" 
              required
              value={customGoalText}
              onChange={(e) => setCustomGoalText(e.target.value)}
              placeholder="Add personal microgoal..."
              className="border border-[#141414] px-3 py-2 text-xs uppercase tracking-wider bg-transparent focus:outline-none placeholder:text-neutral-400 flex-1"
            />
            <button 
              type="submit"
              className="bg-[#141414] text-[#E4E3E0] px-3.5 py-2 text-xs font-bold uppercase tracking-widest hover:opacity-90 transition-all select-none cursor-pointer"
            >
              Add Goal
            </button>
          </form>
        </div>

        {/* Milestone checklist rows */}
        <div className="space-y-3">
          {milestones
            .filter(m => selectedCategory === 'all' || m.category === selectedCategory)
            .map(m => {
              const theme = getCategoryTheme(m.category);
              const CatIcon = theme.icon;

              return (
                <div 
                  key={m.id}
                  onClick={() => handleToggleMilestone(m.id)}
                  className={`p-4 border transition-all duration-200 cursor-pointer flex justify-between items-center gap-4 ${
                    m.isCompleted 
                      ? 'bg-neutral-50 border-neutral-200 opacity-60' 
                      : 'bg-white border-[#141414] hover:bg-neutral-100/50 hover:translate-x-1'
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <button 
                      className={`w-6 h-6 border flex items-center justify-center shrink-0 transition-all ${
                        m.isCompleted 
                          ? 'bg-[#141414] border-[#141414] text-white' 
                          : 'border-neutral-400 bg-white hover:border-[#141414]'
                      }`}
                    >
                      {m.isCompleted && <span className="text-[10px] font-black">✓</span>}
                    </button>

                    <div className="space-y-0.5 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`inline-flex items-center gap-1 text-[8px] font-mono font-black uppercase tracking-wider border rounded-sm px-1.5 py-0.5 ${theme.bg} ${theme.border} ${theme.color}`}>
                          <CatIcon size={10} /> {m.category}
                        </span>
                        <span className="text-[8px] font-mono tracking-widest opacity-40 uppercase font-bold">
                          {m.difficulty}
                        </span>
                      </div>
                      <p className={`font-bold text-sm truncate leading-tight text-neutral-900 ${m.isCompleted ? 'line-through text-neutral-400' : ''}`}>
                        {m.title}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-[11px] font-black font-mono tracking-tight text-[#141414] bg-neutral-100 px-2 py-0.5 rounded border border-neutral-200">
                      +{m.xpValue} XP
                    </span>
                    <button 
                      onClick={(e) => handleDeleteMilestone(m.id, e)}
                      className="p-1 hover:text-red-600 hover:bg-neutral-100 rounded text-neutral-400 transition-colors"
                      title="Remove milestone card"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}

          {milestones.length === 0 && (
            <div className="p-12 text-center text-neutral-400 space-y-2">
              <CheckCircle size={32} className="mx-auto opacity-35" />
              <p className="font-serif italic text-lg leading-none">A pristine path awaits</p>
              <p className="text-xs font-mono text-neutral-500 uppercase">You have cleared all structural transition targets</p>
            </div>
          )}
        </div>

      </div>

      {/* Gamified info/reentry wisdom support overlay */}
      <div className="bg-neutral-50 border border-[#141414] p-5 space-y-2 select-none">
        <h4 className="text-[10px] font-black uppercase tracking-widest font-mono text-[#141414] flex items-center gap-1.5">
          <Info size={14} /> The Rules of the Re-entry Champion League
        </h4>
        <p className="text-xs text-neutral-600 leading-relaxed font-light">
          Success is built incrementally on daily commitments. Completing targets raises your Transitional score and establishes credibility with peer networks. Take charge of your re-entry road map!
        </p>
      </div>

    </div>
  );
}
