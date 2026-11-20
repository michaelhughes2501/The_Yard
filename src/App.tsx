import React, { useState, useEffect } from 'react';
import {
  Users,
  Send,
  ShieldCheck,
  Scale,
  LogOut,
  Menu,
  X,
  MessageSquare,
  Bell,
  Archive,
  UserCircle,
  Briefcase,
  Search,
  ShieldAlert,
  HelpCircle,
  Globe,
  HeartPulse,
  TrendingUp,
  Calendar,
  Sun,
  Moon,
  Clapperboard,
  Compass,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { AuthProvider, useAuth } from './AuthContext';
import Auth from './components/Auth';
import { AppNotification } from './types';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

import TheYard from './components/TheYard';
import Kites from './components/Kites';
import Resources from './components/Resources';
import Tools from './components/Tools';
import Forum from './components/Forum';
import MentorshipTab from './components/Mentorship';
import Vault from './components/Vault';
import Profile from './components/Profile';
import Opportunities from './components/Opportunities';
import SOSButton from './components/SOSButton';
import GlobalSearch from './components/GlobalSearch';
import AdminDashboard from './components/AdminDashboard';
import HelpCenter from './components/HelpCenter';
import CaseTracker from './components/CaseTracker';
import WorkspaceHub from './components/WorkspaceHub';
import QuickActions from './components/QuickActions';
import MentalHealthSupport from './components/MentalHealthSupport';
import EventCalendar from './components/EventCalendar';
import ProgressTracker from './components/ProgressTracker';
import StudioConsole from './components/StudioConsole';
import ExpeditionPreferences from './components/ExpeditionPreferences';
import AIGuideBot from './components/AIGuideBot';

type Tab =
  | 'expedition'
  | 'ai-guide'
  | 'yard'
  | 'kites'
  | 'resources'
  | 'tools'
  | 'forum'
  | 'mentorship'
  | 'vault'
  | 'profile'
  | 'opportunities'
  | 'admin'
  | 'help'
  | 'cases'
  | 'workspace'
  | 'mental-health'
  | 'calendar'
  | 'progress'
  | 'studio';

function GeometricSnowflake({ size = 28, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <line x1="18" y1="3" x2="18" y2="33" />
      <line x1="3" y1="18" x2="33" y2="18" />
      <line x1="7.4" y1="7.4" x2="28.6" y2="28.6" />
      <line x1="28.6" y1="7.4" x2="7.4" y2="28.6" />
      <polyline points="14,7 18,11 22,7" />
      <polyline points="14,29 18,25 22,29" />
      <polyline points="7,14 11,18 7,22" />
      <polyline points="29,14 25,18 29,22" />
      <circle cx="18" cy="18" r="2.5" />
    </svg>
  );
}

function MainApp() {
  const { user, token, logout, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('expedition');
  const [forumSubTab, setForumSubTab] = useState<'discussions' | 'stories'>('discussions');
  const [opportunitiesSubTab, setOpportunitiesSubTab] = useState<'jobs' | 'housing' | 'tracker'>('jobs');
  const [resourcesShowAddPO, setResourcesShowAddPO] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('theme') as 'light' | 'dark') || 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const handleTabChange = (e: Event) => {
      const customEvent = e as CustomEvent<Tab>;
      if (customEvent.detail) {
        setActiveTab(customEvent.detail);
      }
    };
    window.addEventListener('changeTab', handleTabChange);
    return () => window.removeEventListener('changeTab', handleTabChange);
  }, []);

  useEffect(() => {
    if (!user || !token) return;
    const fetchNotifications = () => {
      fetch('/api/notifications', {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setNotifications(data);
          } else {
            console.error('Expected array of notifications, got:', data);
          }
        })
        .catch(console.error);
    };
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, [user, token]);

  const handleNotificationClick = async (notif: AppNotification) => {
    if (!notif.is_read) {
      await fetch(`/api/notifications/${notif.id}/read`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(prev => prev.map(n => (n.id === notif.id ? { ...n, is_read: 1 } : n)));
    }
    setActiveTab(notif.link as Tab);
    setShowNotifications(false);
  };

  const markAllAsRead = async () => {
    await fetch('/api/notifications/read-all', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` }
    });
    setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen wayfare-grid-bg flex items-center justify-center font-serif italic text-2xl text-[#261F1A]">
        Loading...
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  const tabs: { id: Tab; name: string; icon: React.ComponentType<{ size?: number; className?: string }> }[] = [
    { id: 'expedition', name: 'Expedition profile', icon: Compass },
    { id: 'ai-guide', name: 'AI Guide', icon: Sparkles },
    { id: 'yard', name: 'The Yard', icon: Users },
    { id: 'mentorship', name: 'Mentorship', icon: ShieldCheck },
    { id: 'kites', name: 'Kites', icon: Send },
    { id: 'resources', name: 'Resources', icon: ShieldCheck },
    { id: 'forum', name: 'Forum', icon: MessageSquare },
    { id: 'opportunities', name: 'Opportunities', icon: Briefcase },
    { id: 'tools', name: 'Legal Tools', icon: Scale },
    { id: 'mental-health', name: 'Wellness', icon: HeartPulse },
    { id: 'studio', name: 'Studio Settings', icon: Clapperboard },
    { id: 'workspace', name: 'Workspace', icon: Globe },
    { id: 'cases', name: 'Case Tracker', icon: Scale },
    { id: 'progress', name: 'Progress Tracker', icon: TrendingUp },
    { id: 'calendar', name: 'Calendar', icon: Calendar },
    { id: 'vault', name: 'The Vault', icon: Archive },
    { id: 'help', name: 'Help Center', icon: HelpCircle }
  ];

  const activeTabObj = tabs.find(t => t.id === activeTab);
  const activeTabLabel =
    activeTab === 'profile'
      ? 'Member profile'
      : activeTab === 'admin'
      ? 'Admin console'
      : activeTabObj?.name || 'Expedition profile';

  const displayName = user?.name || user?.username || 'Maren Voss';
  const initials = displayName
    .split(/\s+|_/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('') || 'MV';

  const handleAiNavigate = (tab: string, subTab?: string) => {
    if (tab === 'forum' && (subTab === 'stories' || subTab === 'discussions')) {
      setForumSubTab(subTab);
    }
    if (tab === 'opportunities' && (subTab === 'jobs' || subTab === 'housing' || subTab === 'tracker')) {
      setOpportunitiesSubTab(subTab);
    }
    setActiveTab(tab as Tab);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'expedition':
        return <ExpeditionPreferences onNavigateTab={tab => setActiveTab(tab as Tab)} />;
      case 'ai-guide':
        return (
          <AIGuideBot
            mode="full"
            activeTab={activeTab}
            onNavigate={handleAiNavigate}
          />
        );
      case 'yard':
        return <TheYard />;
      case 'studio':
        return <StudioConsole />;
      case 'opportunities':
        return <Opportunities initialTab={opportunitiesSubTab} />;
      case 'forum':
        return (
          <Forum
            initialSubSection={forumSubTab}
            onNavigateToKites={() => setActiveTab('kites')}
            onNavigateTab={tab => setActiveTab(tab as Tab)}
          />
        );
      case 'kites':
        return <Kites onNavigate={(tab: Tab) => setActiveTab(tab)} />;
      case 'mentorship':
        return <MentorshipTab />;
      case 'vault':
        return <Vault />;
      case 'resources':
        return <Resources initialShowAddPO={resourcesShowAddPO} />;
      case 'mental-health':
        return <MentalHealthSupport />;
      case 'calendar':
        return <EventCalendar />;
      case 'progress':
        return <ProgressTracker />;
      case 'tools':
        return <Tools />;
      case 'cases':
        return <CaseTracker />;
      case 'workspace':
        return <WorkspaceHub />;
      case 'help':
        return <HelpCenter />;
      case 'profile':
        return <Profile />;
      case 'admin':
        return <AdminDashboard />;
      default:
        return <ExpeditionPreferences onNavigateTab={tab => setActiveTab(tab as Tab)} />;
    }
  };

  return (
    <div className="min-h-screen wayfare-grid-bg text-[#261F1A] font-sans selection:bg-[#261F1A] selection:text-[#F6F2EB]">
      {/* Top Bar matching Taste-Trail-Preferences.png */}
      <header className="max-w-[1380px] mx-auto px-4 md:px-10 pt-6 pb-4 flex items-center justify-between gap-6">
        {/* Left: Brand Lockup + Breadcrumb */}
        <div className="flex items-center gap-8 md:gap-16 min-w-0">
          <button
            type="button"
            onClick={() => setActiveTab('expedition')}
            className="flex items-center gap-3.5 text-left cursor-pointer shrink-0"
          >
            <div className="w-11 h-11 rounded-xl bg-[#261F1A] text-[#F6F2EB] flex items-center justify-center shadow-xs">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 19L9 7l4 6 3-4 5 10H3z" />
              </svg>
            </div>
            <div>
              <div className="text-lg font-serif font-medium text-[#261F1A] leading-tight">
                Wayfare Kitchen
              </div>
              <div className="text-[9px] uppercase tracking-[0.22em] text-[#7D7166] leading-tight mt-0.5">
                MEMBER
                <br />
                PREFERENCES
              </div>
            </div>
          </button>

          {/* Breadcrumb Trail */}
          <div className="hidden sm:flex items-center gap-2 text-xs md:text-sm">
            <span className="text-[#8A7D70]">Settings</span>
            <ChevronRight size={14} className="text-[#8A7D70]" />
            <span className="text-[#261F1A] font-medium">{activeTabLabel}</span>
          </div>
        </div>

        {/* Right: Quick Utilities + Member Name & Monogram Avatar */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setIsSearchOpen(true)}
            className="p-2 rounded-full text-[#6E6359] hover:text-[#261F1A] hover:bg-[#261F1A]/5 transition-colors cursor-pointer"
            title="Search"
          >
            <Search size={18} />
          </button>

          <button
            type="button"
            onClick={() => setTheme(prev => (prev === 'light' ? 'dark' : 'light'))}
            className="p-2 rounded-full text-[#6E6359] hover:text-[#261F1A] hover:bg-[#261F1A]/5 transition-colors cursor-pointer"
            title={theme === 'light' ? 'Dark Mode' : 'Light Mode'}
          >
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>

          {/* Notifications Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 rounded-full text-[#6E6359] hover:text-[#261F1A] hover:bg-[#261F1A]/5 transition-colors cursor-pointer"
              title="Notifications"
            >
              <Bell size={18} />
              {notifications.filter(n => !n.is_read).length > 0 && (
                <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-[#984B27] text-white text-[10px] font-bold flex items-center justify-center rounded-full">
                  {notifications.filter(n => !n.is_read).length}
                </span>
              )}
            </button>

            <AnimatePresence>
              {showNotifications && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute right-0 mt-2 w-80 bg-[#F6F2EB] border border-[#D8CFC2] rounded-2xl shadow-xl z-50 overflow-hidden"
                >
                  <div className="p-4 border-b border-[#D8CFC2] flex justify-between items-center bg-[#261F1A] text-[#F6F2EB]">
                    <h3 className="font-serif italic">Notifications</h3>
                    {notifications.filter(n => !n.is_read).length > 0 && (
                      <button
                        type="button"
                        onClick={markAllAsRead}
                        className="text-[10px] uppercase tracking-widest opacity-70 hover:opacity-100 cursor-pointer"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-96 overflow-y-auto divide-y divide-[#D8CFC2]/60">
                    {notifications.length === 0 ? (
                      <div className="p-4 text-center text-sm text-[#786D62]">No notifications</div>
                    ) : (
                      notifications.map(notif => (
                        <button
                          key={notif.id}
                          type="button"
                          onClick={() => handleNotificationClick(notif)}
                          className={cn(
                            'w-full text-left p-4 hover:bg-[#261F1A]/5 transition-colors text-sm flex gap-3 cursor-pointer',
                            !notif.is_read ? 'bg-[#261F1A]/5' : 'opacity-70'
                          )}
                        >
                          {!notif.is_read && <div className="w-2 h-2 rounded-full bg-[#984B27] mt-1.5 shrink-0" />}
                          <div>
                            <p>{notif.content}</p>
                            <span className="text-[10px] uppercase tracking-widest opacity-60 mt-1 block">
                              {new Date(notif.timestamp).toLocaleDateString()}
                            </span>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Member Profile Pill & Warm Ochre Monogram Avatar */}
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className="flex items-center gap-3 pl-2 cursor-pointer group"
          >
            <span className="hidden md:inline text-xs font-medium text-[#70655B] group-hover:text-[#261F1A] transition-colors">
              {displayName === 'maren_voss' ? 'Maren Voss' : displayName}
            </span>
            <div className="w-9 h-9 rounded-full bg-[#C5A47E] text-[#261F1A] text-xs font-bold flex items-center justify-center shadow-xs">
              {initials}
            </div>
          </button>

          {['super_admin', 'admin', 'moderator'].includes(
            user?.role || (user?.is_admin === 1 ? 'super_admin' : 'user')
          ) && (
            <button
              type="button"
              onClick={() => setActiveTab('admin')}
              className="hidden md:flex items-center gap-1 text-xs text-[#984B27] hover:underline cursor-pointer"
              title="Admin Console"
            >
              <ShieldAlert size={15} />
            </button>
          )}

          <button
            type="button"
            onClick={logout}
            className="hidden md:flex items-center gap-1 p-2 rounded-full text-[#70655B] hover:text-[#261F1A] hover:bg-[#261F1A]/5 transition-colors cursor-pointer"
            title="Log out"
          >
            <LogOut size={16} />
          </button>

          <button
            type="button"
            className="lg:hidden p-2 text-[#261F1A]"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </header>

      {/* Mobile Slide-Over Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="lg:hidden fixed inset-0 z-40 wayfare-grid-bg pt-24 px-6 overflow-y-auto"
          >
            <div className="max-w-md mx-auto space-y-2 pb-12">
              {tabs.map(tab => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      if (tab.id === 'opportunities') setOpportunitiesSubTab('jobs');
                      if (tab.id === 'resources') setResourcesShowAddPO(false);
                      setActiveTab(tab.id);
                      setIsMenuOpen(false);
                    }}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium text-left transition-all',
                      active
                        ? 'bg-[#F6F2EB] text-[#261F1A] border border-[#D8CFC2] shadow-xs'
                        : 'text-[#6E6359] hover:text-[#261F1A]'
                    )}
                  >
                    <Icon size={17} />
                    <span>{tab.name}</span>
                  </button>
                );
              })}
              <div className="pt-4 border-t border-[#D8CFC2] flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('profile');
                    setIsMenuOpen(false);
                  }}
                  className="text-sm font-medium text-[#261F1A] flex items-center gap-2"
                >
                  <UserCircle size={18} /> Member Profile
                </button>
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    setIsMenuOpen(false);
                  }}
                  className="text-sm font-medium text-[#984B27] flex items-center gap-1.5"
                >
                  <LogOut size={16} /> Log out
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Container matching Taste-Trail-Preferences.png */}
      <div className="max-w-[1380px] mx-auto px-4 md:px-10 py-4 space-y-8">
        {/* Deep Espresso Hero Card */}
        <section className="bg-[#261F1A] text-[#F7F3EC] rounded-2xl px-7 py-8 md:px-12 md:py-10 flex flex-col md:flex-row md:items-center justify-between gap-8 shadow-sm">
          <div className="max-w-xl space-y-3">
            <div className="text-[11px] uppercase tracking-[0.22em] text-[#C69249] font-medium">
              SOLSTICE GREETINGS · YEAR FOUR OF YOUR JOURNEY
            </div>
            <h1 className="text-3xl md:text-[38px] font-serif leading-[1.18] text-[#F7F3EC] tracking-tight">
              Happy holidays, {displayName === 'maren_voss' ? 'Maren' : displayName.split(' ')[0]}. The trail rests — the table doesn’t.
            </h1>
            <p className="text-xs md:text-sm text-[#B8AFA4] leading-relaxed pt-1">
              You cooked 142 expedition meals across 11 cuisines this year and stayed connected across The Yard. Your December route and community preferences are set below — adjust them before Dec 19.
            </p>
          </div>

          {/* Right Ornamental Terracotta Geometric Snowflakes */}
          <div className="hidden md:flex items-center gap-7 pr-4 shrink-0">
            <GeometricSnowflake size={22} className="text-[#9E6B43] opacity-75" />
            <GeometricSnowflake size={38} className="text-[#A9532A]" />
            <GeometricSnowflake size={18} className="text-[#9E6B43] opacity-75" />
          </div>
        </section>

        {/* Workspace Layout: Left Sidebar Navigation + Main Content */}
        <div className="flex flex-col lg:flex-row items-start gap-8">
          {/* Left Column Sidebar matching Taste-Trail-Preferences.png */}
          <aside className="w-full lg:w-64 shrink-0 space-y-6">
            <nav className="space-y-1">
              {tabs.map(tab => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      if (tab.id === 'opportunities') setOpportunitiesSubTab('jobs');
                      if (tab.id === 'resources') setResourcesShowAddPO(false);
                      setActiveTab(tab.id);
                    }}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all cursor-pointer text-left',
                      active
                        ? 'bg-[#F6F2EB] text-[#261F1A] font-semibold shadow-xs border border-[#DED5C8]'
                        : 'text-[#6E6359] hover:text-[#261F1A] hover:bg-[#F6F2EB]/40 font-medium'
                    )}
                  >
                    <Icon
                      size={16}
                      className={active ? 'text-[#261F1A]' : 'text-[#8C7F73]'}
                    />
                    <span className="truncate">{tab.name}</span>
                  </button>
                );
              })}
            </nav>

            {/* CURRENT PLAN Card matching bottom-left of Taste-Trail-Preferences.png */}
            <div className="rounded-2xl border border-[#D5CBC0] bg-[#EAE2D6]/60 p-5 space-y-1.5">
              <div className="text-[10px] uppercase tracking-[0.2em] text-[#7D7166] font-medium">
                CURRENT PLAN
              </div>
              <div className="text-lg font-serif text-[#261F1A]">
                Pathfinder · Duo
              </div>
              <div className="text-xs text-[#74695E] tabular-nums">
                3 expeditions / week — $71.40
              </div>
            </div>
          </aside>

          {/* Main Active View */}
          <main className="flex-1 min-w-0 w-full">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
            >
              {renderContent()}
            </motion.div>
          </main>
        </div>
      </div>

      <SOSButton />

      {activeTab !== 'ai-guide' && (
        <AIGuideBot
          mode="floating"
          activeTab={activeTab}
          onNavigate={handleAiNavigate}
          onExpandFull={() => setActiveTab('ai-guide')}
        />
      )}

      <QuickActions
        onAction={(action: 'jobs' | 'housing' | 'contact') => {
          if (action === 'jobs') {
            setOpportunitiesSubTab('jobs');
            setActiveTab('opportunities');
          } else if (action === 'housing') {
            setOpportunitiesSubTab('housing');
            setActiveTab('opportunities');
          } else if (action === 'contact') {
            setResourcesShowAddPO(true);
            setActiveTab('resources');
          }
        }}
      />

      {isSearchOpen && (
        <GlobalSearch
          onClose={() => setIsSearchOpen(false)}
          onNavigate={(tab, subTab) => {
            if (subTab === 'stories' || subTab === 'discussions') {
              setForumSubTab(subTab);
            }
            setActiveTab(tab as Tab);
          }}
        />
      )}

      {/* Subtle Editorial Footer */}
      <footer className="max-w-[1380px] mx-auto px-4 md:px-10 mt-20 pb-12 pt-8 border-t border-[#D6CCC0] text-xs text-[#74695E] flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="font-serif text-sm text-[#261F1A]">Wayfare Kitchen · The Yard Network</span>
          <span>·</span>
          <span>Expedition & Re-Entry Community Portal</span>
        </div>
        <div className="flex flex-wrap items-center gap-5">
          <button
            type="button"
            onClick={() => setActiveTab('expedition')}
            className="hover:text-[#261F1A] cursor-pointer"
          >
            Expedition Profile
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('mentorship')}
            className="hover:text-[#261F1A] cursor-pointer"
          >
            Mentorship Questionnaire
          </button>
          <button
            type="button"
            onClick={() => {
              setForumSubTab('stories');
              setActiveTab('forum');
            }}
            className="hover:text-[#261F1A] cursor-pointer"
          >
            Success Stories
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('resources')}
            className="hover:text-[#261F1A] cursor-pointer"
          >
            Resources & Parole
          </button>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}

