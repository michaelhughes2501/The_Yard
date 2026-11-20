import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Send,
  X,
  Compass,
  Lightbulb,
  Globe,
  Map,
  Maximize2,
  RotateCcw,
  Copy,
  Check,
  ArrowRight,
  AlertCircle,
  Loader2,
  MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { useAuth } from '../AuthContext';
import { geminiService, AIChatMessage } from '../services/geminiService';

interface SuggestedNav {
  tab: string;
  subTab?: string;
  label: string;
}

interface ChatEntry extends AIChatMessage {
  id: string;
  timestamp: string;
  suggestedTabs?: SuggestedNav[];
}

interface AIGuideBotProps {
  mode: 'floating' | 'full';
  activeTab: string;
  onNavigate: (tab: string, subTab?: string) => void;
  onExpandFull?: () => void;
}

const STARTER_PROMPTS = [
  {
    category: 'Website Navigation',
    icon: Map,
    title: 'How do I navigate this site?',
    prompt:
      'Give me a clear walkthrough of the main tabs on this website and how to navigate between Kites, Mentorship, Resources, and Forum Success Stories.'
  },
  {
    category: 'Tips & Tricks',
    icon: Lightbulb,
    title: 'Top tips & hidden shortcuts',
    prompt:
      'What are the best tips and tricks for using this platform effectively—like anonymous mentorship, slang tooltips, and 5-star resource ratings?'
  },
  {
    category: 'Resources & Parole',
    icon: Compass,
    title: 'How to rate & verify services',
    prompt:
      'How do I use the Resources tab to rate community services with 5 stars, check RMOMS UA steps, and estimate sentences?'
  },
  {
    category: 'General Knowledge',
    icon: Globe,
    title: 'Ask anything (General Knowledge)',
    prompt:
      'Explain how credit scores work from scratch and give me 5 practical steps to build strong credit in my first year.'
  }
];

const QUICK_CHIPS = [
  'Show me how to navigate the website',
  'Tips & tricks for Mentorship milestones',
  'How do I rate a service in Resources?',
  'What does "kite" and "yard" mean here?',
  'Give me a quick general knowledge tip on resumes'
];

export default function AIGuideBot({
  mode,
  activeTab,
  onNavigate,
  onExpandFull
}: AIGuideBotProps) {
  const { user, token } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const storageKey = user?.id
    ? `yard_ai_guide_history_${user.id}`
    : 'yard_ai_guide_history_guest';

  const [messages, setMessages] = useState<ChatEntry[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore storage errors
    }
    return [];
  });

  const scrollEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(messages.slice(-30)));
    } catch {
      // ignore storage quota errors
    }
  }, [messages, storageKey]);

  useEffect(() => {
    scrollEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading, isOpen]);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearChat = () => {
    setMessages([]);
    setErrorMsg(null);
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // ignore
    }
  };

  const sendMessage = async (textOverride?: string) => {
    const content = (textOverride ?? input).trim();
    if (!content || isLoading) return;

    setErrorMsg(null);
    const userMsg: ChatEntry = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: content,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    if (!textOverride) setInput('');
    setIsLoading(true);

    try {
      const apiPayload: AIChatMessage[] = nextHistory.map(m => ({
        role: m.role,
        text: m.text
      }));
      const res = await geminiService.chatWithAssistant(apiPayload, activeTab, token);

      const botMsg: ChatEntry = {
        id: `model-${Date.now()}`,
        role: 'model',
        text: res.text,
        suggestedTabs: res.suggestedTabs || [],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, botMsg]);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unable to reach AI Guide right now. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const displayName = user?.name || user?.username || 'Friend';
  const firstName =
    displayName === 'maren_voss' ? 'Maren' : displayName.split(/\s+|_/)[0] || 'Friend';

  // Shared message renderer
  const renderMessagesList = (compact = false) => (
    <div className={compact ? 'space-y-4' : 'space-y-6'}>
      {messages.map(msg => {
        const isUser = msg.role === 'user';
        return (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
          >
            {!isUser && (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#261F1A] via-[#984B27] to-[#C69249] text-[#F7F3EC] flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                <Sparkles size={15} />
              </div>
            )}

            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                isUser
                  ? 'bg-[#261F1A] text-[#F7F3EC] rounded-tr-sm'
                  : 'bg-[#F6F2EB] border border-[#DDD4C7] text-[#261F1A] rounded-tl-sm shadow-2xs'
              }`}
            >
              {isUser ? (
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
              ) : (
                <div className="prose prose-sm max-w-none prose-headings:font-serif prose-headings:text-[#261F1A] prose-p:text-[#3D342C] prose-strong:text-[#261F1A] prose-li:text-[#3D342C] prose-a:text-[#984B27]">
                  <Markdown>{msg.text}</Markdown>
                </div>
              )}

              {/* One-Click Interactive Website Navigation Buttons */}
              {!isUser && msg.suggestedTabs && msg.suggestedTabs.length > 0 && (
                <div className="mt-3 pt-3 border-t border-[#E2D9CC] flex flex-wrap gap-2">
                  {msg.suggestedTabs.map((nav, idx) => (
                    <button
                      key={`${nav.tab}-${idx}`}
                      type="button"
                      onClick={() => {
                        onNavigate(nav.tab, nav.subTab);
                        if (mode === 'floating') setIsOpen(false);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#984B27] hover:bg-[#823E1E] text-[#F7F3EC] text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
                    >
                      <Compass size={12} />
                      <span>{nav.label}</span>
                      <ArrowRight size={12} />
                    </button>
                  ))}
                </div>
              )}

              {/* Footer timestamp + copy button */}
              <div
                className={`mt-2 flex items-center justify-between gap-3 text-[10px] font-mono ${
                  isUser ? 'text-[#B8AFA4]' : 'text-[#8C7F73]'
                }`}
              >
                <span>{msg.timestamp}</span>
                {!isUser && (
                  <button
                    type="button"
                    onClick={() => handleCopy(msg.id, msg.text)}
                    className="inline-flex items-center gap-1 hover:text-[#261F1A] transition-colors cursor-pointer"
                    title="Copy response"
                  >
                    {copiedId === msg.id ? (
                      <>
                        <Check size={11} className="text-emerald-700" /> Copied
                      </>
                    ) : (
                      <>
                        <Copy size={11} /> Copy
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        );
      })}

      {/* Thinking indicator */}
      {isLoading && (
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#261F1A] via-[#984B27] to-[#C69249] text-[#F7F3EC] flex items-center justify-center shrink-0">
            <Sparkles size={15} className="animate-pulse" />
          </div>
          <div className="bg-[#F6F2EB] border border-[#DDD4C7] rounded-2xl rounded-tl-sm px-4 py-3 text-xs text-[#74695E] flex items-center gap-2">
            <Loader2 size={14} className="animate-spin text-[#984B27]" />
            <span>Thinking through your question...</span>
          </div>
        </div>
      )}

      {/* Real API error banner */}
      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-300 text-red-900 text-xs flex items-start gap-2.5">
          <AlertCircle size={15} className="text-red-700 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">AI Guide Notice</p>
            <p className="mt-0.5 leading-relaxed">{errorMsg}</p>
          </div>
          <button
            type="button"
            onClick={() => setErrorMsg(null)}
            className="text-red-700 hover:opacity-70 cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>
      )}

      <div ref={scrollEndRef} />
    </div>
  );

  // =========================================================================
  // FULL-PAGE GEMINI-STYLE WORKSPACE MODE
  // =========================================================================
  if (mode === 'full') {
    return (
      <div className="bg-[#F6F2EB] border border-[#DDD4C7] rounded-2xl shadow-xs overflow-hidden flex flex-col min-h-[720px] max-h-[82vh]">
        {/* Top Bar */}
        <div className="bg-[#261F1A] text-[#F7F3EC] px-6 py-4 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#984B27] to-[#C69249] flex items-center justify-center shadow-sm">
              <Sparkles size={20} className="text-[#F7F3EC]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-serif text-xl text-[#F7F3EC]">Yard Guide AI</h2>
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#C69249]">
                  · Site Navigator & General Knowledge
                </span>
              </div>
              <p className="text-xs text-[#B8AFA4]">
                Ask how to use any page, discover tips & tricks, or explore any general knowledge topic.
              </p>
            </div>
          </div>

          {messages.length > 0 && (
            <button
              type="button"
              onClick={handleClearChat}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-medium text-[#F7F3EC] flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCcw size={13} /> New Chat
            </button>
          )}
        </div>

        {/* Conversation Area */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-[#FAF7F2]">
          {messages.length === 0 ? (
            <div className="max-w-3xl mx-auto py-6 space-y-8">
              {/* Gemini-Style Warm Greeting */}
              <div className="space-y-2 text-center md:text-left">
                <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-[#984B27] font-semibold">
                  <Sparkles size={13} /> YOUR PERSONAL INTERACTIVE GUIDE
                </div>
                <h3 className="text-3xl md:text-4xl font-serif text-[#261F1A]">
                  Hello, {firstName}. What can I help you explore today?
                </h3>
                <p className="text-sm text-[#74695E] max-w-2xl">
                  Ask me to walk you through any tab on the site, share platform tips & tricks, jump directly to a tool, or answer any general knowledge question.
                </p>
              </div>

              {/* 4 Starter Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {STARTER_PROMPTS.map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => sendMessage(item.prompt)}
                      className="text-left p-5 rounded-2xl bg-[#F6F2EB] border border-[#DDD4C7] hover:border-[#984B27] transition-all group cursor-pointer flex flex-col justify-between gap-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-[#984B27]">
                          {item.category}
                        </span>
                        <div className="p-2 rounded-xl bg-[#EFE7DC] text-[#261F1A] group-hover:bg-[#984B27] group-hover:text-[#F7F3EC] transition-colors">
                          <Icon size={15} />
                        </div>
                      </div>
                      <div>
                        <div className="font-serif text-lg text-[#261F1A] group-hover:text-[#984B27] transition-colors">
                          {item.title}
                        </div>
                        <p className="text-xs text-[#74695E] mt-1 line-clamp-2 leading-relaxed">
                          {item.prompt}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto">{renderMessagesList(false)}</div>
          )}
        </div>

        {/* Bottom Prompt Composer */}
        <div className="p-4 md:p-6 bg-[#F6F2EB] border-t border-[#DDD4C7] shrink-0">
          <div className="max-w-3xl mx-auto space-y-3">
            {/* Quick Suggestion Chips */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {QUICK_CHIPS.map((chip, idx) => (
                <button
                  key={idx}
                  type="button"
                  disabled={isLoading}
                  onClick={() => sendMessage(chip)}
                  className="px-3 py-1.5 rounded-full bg-[#EFE7DC] hover:bg-[#261F1A] hover:text-[#F7F3EC] text-[#4A4037] border border-[#D8CFC2] text-xs whitespace-nowrap transition-colors cursor-pointer"
                >
                  {chip}
                </button>
              ))}
            </div>

            <div className="flex items-end gap-2 bg-[#FAF7F2] border border-[#D5CBC0] focus-within:border-[#984B27] rounded-2xl p-2 pl-4 transition-colors">
              <textarea
                rows={1}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about website navigation, tips & tricks, or any general knowledge question..."
                className="flex-1 bg-transparent py-2.5 text-sm text-[#261F1A] placeholder:text-[#8C7F73] focus:outline-none resize-none max-h-36"
              />
              <button
                type="button"
                disabled={isLoading || !input.trim()}
                onClick={() => sendMessage()}
                className="p-3 rounded-xl bg-[#984B27] hover:bg-[#823E1E] text-[#F7F3EC] disabled:opacity-40 transition-colors cursor-pointer shrink-0"
                title="Send message"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // FLOATING GEMINI-STYLE ASSISTANT DRAWER (AVAILABLE ON EVERY TAB)
  // =========================================================================
  return (
    <>
      {/* Floating Launcher Pill positioned cleanly above SOSButton */}
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className="fixed bottom-24 right-6 z-50 bg-[#261F1A] hover:bg-[#3A3028] text-[#F7F3EC] border border-[#C69249]/60 px-4 py-3 rounded-full shadow-2xl transition-all hover:scale-105 flex items-center gap-2.5 cursor-pointer group"
        title="Ask Yard Guide AI — Navigation, Tips & General Knowledge"
      >
        <span className="w-7 h-7 rounded-full bg-gradient-to-br from-[#984B27] to-[#C69249] flex items-center justify-center">
          <Sparkles size={15} className="text-[#F7F3EC]" />
        </span>
        <span className="text-xs font-semibold tracking-wide pr-1">Ask AI Guide</span>
      </button>

      {/* Floating Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-40 right-6 z-50 w-[calc(100vw-3rem)] sm:w-[430px] h-[580px] max-h-[75vh] bg-[#FAF7F2] border border-[#D8CFC2] rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Drawer Header */}
            <div className="bg-[#261F1A] text-[#F7F3EC] px-4 py-3.5 flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#984B27] to-[#C69249] flex items-center justify-center shrink-0">
                  <Sparkles size={15} />
                </div>
                <div className="min-w-0">
                  <div className="font-serif text-base leading-tight truncate">Yard Guide AI</div>
                  <div className="text-[10px] text-[#C69249] font-mono truncate">
                    Site Navigator · Tips · General Knowledge
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {messages.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearChat}
                    className="p-1.5 rounded-lg text-[#B8AFA4] hover:text-[#F7F3EC] hover:bg-white/10 transition-colors cursor-pointer"
                    title="Clear conversation"
                  >
                    <RotateCcw size={15} />
                  </button>
                )}
                {onExpandFull && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      onExpandFull();
                    }}
                    className="p-1.5 rounded-lg text-[#B8AFA4] hover:text-[#F7F3EC] hover:bg-white/10 transition-colors cursor-pointer"
                    title="Open full-screen AI Guide"
                  >
                    <Maximize2 size={15} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-lg text-[#B8AFA4] hover:text-[#F7F3EC] hover:bg-white/10 transition-colors cursor-pointer"
                  title="Close"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Drawer Messages Body */}
            <div className="flex-1 overflow-y-auto p-4">
              {messages.length === 0 ? (
                <div className="space-y-4 py-2">
                  <div className="p-4 rounded-2xl bg-[#F6F2EB] border border-[#DDD4C7] space-y-1.5">
                    <div className="flex items-center gap-2 text-xs font-semibold text-[#984B27]">
                      <MessageSquare size={14} /> Hi {firstName}!
                    </div>
                    <p className="text-xs text-[#4A4037] leading-relaxed">
                      I’m your Gemini-style site assistant. Ask me how to navigate any tab, uncover tips & tricks, or ask any general knowledge question!
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="text-[10px] font-mono uppercase tracking-wider text-[#7D7166] font-bold">
                      Try asking:
                    </div>
                    {QUICK_CHIPS.map((chip, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => sendMessage(chip)}
                        className="w-full text-left px-3.5 py-2.5 rounded-xl bg-[#F6F2EB] hover:bg-[#261F1A] hover:text-[#F7F3EC] text-[#261F1A] border border-[#D8CFC2] text-xs font-medium transition-colors flex items-center justify-between gap-2 cursor-pointer"
                      >
                        <span>{chip}</span>
                        <ArrowRight size={13} className="shrink-0 opacity-60" />
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                renderMessagesList(true)
              )}
            </div>

            {/* Drawer Input Composer */}
            <div className="p-3 bg-[#F6F2EB] border-t border-[#DDD4C7] shrink-0">
              <div className="flex items-end gap-2 bg-[#FAF7F2] border border-[#D5CBC0] focus-within:border-[#984B27] rounded-xl p-1.5 pl-3 transition-colors">
                <textarea
                  rows={1}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask anything about the site or world..."
                  className="flex-1 bg-transparent py-2 text-xs text-[#261F1A] placeholder:text-[#8C7F73] focus:outline-none resize-none max-h-28"
                />
                <button
                  type="button"
                  disabled={isLoading || !input.trim()}
                  onClick={() => sendMessage()}
                  className="p-2.5 rounded-lg bg-[#984B27] hover:bg-[#823E1E] text-[#F7F3EC] disabled:opacity-40 transition-colors cursor-pointer shrink-0"
                  title="Send"
                >
                  <Send size={14} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
