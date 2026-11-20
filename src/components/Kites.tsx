import React, { useState, useEffect, useRef } from 'react';
import { Send, MessageSquare, ArrowLeft, User as UserIcon, Search, Check, CheckCheck, ExternalLink, HelpCircle, Sparkles, Plus, X, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../AuthContext';
import { Conversation, ThreadMessage, User } from '../types';

/**
 * Helper component that renders message text with interactive tooltips on slang terms
 * ("kite" = "message", "yard" = "meeting place"), and optionally translates them when
 * Standard Mode is active.
 */
function SlangAwareText({
  text,
  useSlang,
  isMe
}: {
  text: string;
  useSlang: boolean;
  isMe: boolean;
}) {
  // Split by words matching kite(s) or yard (case-insensitive)
  const parts = text.split(/\b(kites?|yard)\b/gi);

  return (
    <>
      {parts.map((part, idx) => {
        const lower = part.toLowerCase();
        if (lower === 'kite' || lower === 'kites') {
          const isPlural = lower === 'kites';
          const displayWord = useSlang
            ? part
            : part[0] === part[0].toUpperCase()
            ? isPlural
              ? 'Messages'
              : 'Message'
            : isPlural
            ? 'messages'
            : 'message';

          return (
            <span
              key={idx}
              className="relative group/slang inline-block underline decoration-dotted underline-offset-4 cursor-help font-semibold"
              title='Slang glossary: "Kite" = Private Message'
            >
              {displayWord}
              <span
                className={`pointer-events-none opacity-0 group-hover/slang:opacity-100 transition-opacity absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-48 p-2 rounded text-[10px] font-mono leading-tight shadow-lg z-30 ${
                  isMe
                    ? 'bg-amber-300 text-[#141414]'
                    : 'bg-[#141414] text-[#E4E3E0]'
                }`}
              >
                <strong>"Kite"</strong>: Synonym for a private <strong>message</strong> ({useSlang ? 'Slang active' : 'Translated from "kite"'}).
              </span>
            </span>
          );
        }

        if (lower === 'yard') {
          const displayWord = useSlang
            ? part
            : part[0] === part[0].toUpperCase()
            ? 'Meeting Place'
            : 'meeting place';

          return (
            <span
              key={idx}
              className="relative group/slang inline-block underline decoration-dotted underline-offset-4 cursor-help font-semibold"
              title='Slang glossary: "Yard" = Meeting Place'
            >
              {displayWord}
              <span
                className={`pointer-events-none opacity-0 group-hover/slang:opacity-100 transition-opacity absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-52 p-2 rounded text-[10px] font-mono leading-tight shadow-lg z-30 ${
                  isMe
                    ? 'bg-amber-300 text-[#141414]'
                    : 'bg-[#141414] text-[#E4E3E0]'
                }`}
              >
                <strong>"Yard"</strong>: Synonym for a <strong>meeting place</strong> ({useSlang ? 'Slang active' : 'Translated from "yard"'}).
              </span>
            </span>
          );
        }

        return <React.Fragment key={idx}>{part}</React.Fragment>;
      })}
    </>
  );
}

export default function Kites({ onNavigate }: { onNavigate?: (tab: any) => void }) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [directoryUsers, setDirectoryUsers] = useState<User[]>([]);
  const [activeThread, setActiveThread] = useState<string | null>(null);
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [replyContent, setReplyContent] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [messageSearchQuery, setMessageSearchQuery] = useState('');
  const [showNewKiteModal, setShowNewKiteModal] = useState(false);
  const [showGlossaryTooltip, setShowGlossaryTooltip] = useState(false);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  // Slang Mode toggle: true = use 'Kite' & 'Yard', false = use 'Message' & 'Meeting Place'
  const [useSlang, setUseSlang] = useState<boolean>(() => {
    const saved = localStorage.getItem('yard_slang_mode');
    return saved !== null ? saved === 'true' : true;
  });

  const toggleSlangMode = (val: boolean) => {
    setUseSlang(val);
    localStorage.setItem('yard_slang_mode', String(val));
  };

  const { token, user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Drafts state loaded from local storage
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user?.id) {
      const savedDrafts = localStorage.getItem(`kites_drafts_${user.id}`);
      if (savedDrafts) {
        try {
          setDrafts(JSON.parse(savedDrafts));
        } catch (e) {
          console.error('Failed to parse drafts', e);
        }
      } else {
        setDrafts({});
      }
    } else {
      setDrafts({});
    }
  }, [user?.id]);

  // Load draft when active thread changes
  useEffect(() => {
    if (activeThread) {
      setReplyContent(drafts[activeThread] || '');
    } else {
      setReplyContent('');
    }
  }, [activeThread]);

  // Update reply content and preserve state
  const handleReplyChange = (content: string) => {
    setReplyContent(content);
    if (activeThread && user?.id) {
      const updatedDrafts = { ...drafts };
      if (content.trim()) {
        updatedDrafts[activeThread] = content;
      } else {
        delete updatedDrafts[activeThread];
      }
      setDrafts(updatedDrafts);
      localStorage.setItem(`kites_drafts_${user.id}`, JSON.stringify(updatedDrafts));
    }
  };

  const fetchConversations = () => {
    fetch('/api/kites/conversations', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setConversations(data);
        }
      })
      .catch(console.error);
  };

  const fetchDirectoryUsers = () => {
    fetch('/api/users', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setDirectoryUsers(data.filter((u: User) => u.id !== user?.id));
        }
      })
      .catch(console.error);
  };

  const fetchThread = (otherUserId: string) => {
    fetch(`/api/kites/thread/${otherUserId}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setMessages(data);
          scrollToBottom();
        }
      })
      .catch(console.error);
  };

  const markAsRead = (otherUserId: string) => {
    fetch(`/api/kites/read/${otherUserId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(() => fetchConversations())
      .catch(console.error);
  };

  useEffect(() => {
    fetchConversations();
    fetchDirectoryUsers();
    const interval = setInterval(() => {
      fetchConversations();
      if (activeThread) {
        fetchThread(activeThread);
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [token, activeThread]);

  useEffect(() => {
    if (activeThread) {
      fetchThread(activeThread);
      markAsRead(activeThread);
    }
  }, [activeThread]);

  const filteredConversations = conversations.filter(
    c =>
      c.other_user_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.last_message.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredMessages = messages.filter(m =>
    m.content.toLowerCase().includes(messageSearchQuery.toLowerCase())
  );

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleReply = async () => {
    if (!replyContent.trim() || !activeThread) return;

    try {
      const res = await fetch('/api/kites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ receiverId: activeThread, content: replyContent.trim() })
      });
      if (res.ok) {
        setReplyContent('');
        if (user?.id) {
          const updatedDrafts = { ...drafts };
          delete updatedDrafts[activeThread];
          setDrafts(updatedDrafts);
          localStorage.setItem(`kites_drafts_${user.id}`, JSON.stringify(updatedDrafts));
        }
        fetchThread(activeThread);
        fetchConversations();
      } else {
        setStatusBanner('Unable to deliver your message right now. Please try again.');
        setTimeout(() => setStatusBanner(null), 4000);
      }
    } catch (err) {
      setStatusBanner('Failed to send reply.');
      setTimeout(() => setStatusBanner(null), 4000);
    }
  };

  const activeConversation = conversations.find(c => c.other_user_id === activeThread);
  const activePeerUser = directoryUsers.find(u => u.id === activeThread);
  const activePeerName = activeConversation?.other_user_name || activePeerUser?.name || 'Community Member';

  return (
    <div className="space-y-8">
      <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <h2 className="text-6xl font-serif italic tracking-tighter">
              {useSlang ? 'Kites' : 'Private Messages'}
            </h2>
            <span
              className="px-2.5 py-1 bg-amber-100 border border-[#141414] text-[10px] font-mono uppercase tracking-widest font-bold cursor-help"
              title='"Kite" is prison/re-entry slang for a private message or letter; "Yard" is slang for a meeting place.'
            >
              {useSlang ? 'Kite = Message' : 'Standard Mode'}
            </span>
          </div>
          <p className="text-xl opacity-60 max-w-2xl">
            {useSlang ? (
              <>
                Send private{' '}
                <span
                  className="underline decoration-dotted cursor-help font-semibold text-[#141414]"
                  title='"Kite" means a private message'
                >
                  kites
                </span>{' '}
                to your peers, coordinate a link-up on the{' '}
                <span
                  className="underline decoration-dotted cursor-help font-semibold text-[#141414]"
                  title='"Yard" means a meeting place'
                >
                  yard
                </span>
                , and stay connected.
              </>
            ) : (
              <>
                Send private messages to your peers, coordinate a meeting place, and stay connected.
              </>
            )}
          </p>
        </div>

        {/* Slang Synonym Control Bar & Glossary Tooltip Trigger */}
        <div className="bg-white border-2 border-[#141414] p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4 shadow-sm">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles size={13} className="text-amber-600" />
              <span className="text-[10px] font-mono uppercase tracking-widest font-black">
                Slang Terminology Option
              </span>
              <button
                type="button"
                onClick={() => setShowGlossaryTooltip(!showGlossaryTooltip)}
                className="text-neutral-500 hover:text-[#141414] cursor-pointer"
                title="View Slang Glossary"
              >
                <HelpCircle size={14} />
              </button>
            </div>
            <p className="text-[11px] opacity-70">
              Toggle between community slang (<strong>"Kite"</strong> / <strong>"Yard"</strong>) and standard terms.
            </p>
          </div>

          <div className="flex border border-[#141414] text-[10px] font-mono uppercase tracking-widest font-bold shrink-0">
            <button
              type="button"
              onClick={() => toggleSlangMode(true)}
              className={`px-3 py-2 border-r border-[#141414] transition-colors cursor-pointer ${
                useSlang ? 'bg-[#141414] text-[#E4E3E0]' : 'bg-white text-[#141414] hover:bg-neutral-100'
              }`}
            >
              Slang ("Kite" / "Yard")
            </button>
            <button
              type="button"
              onClick={() => toggleSlangMode(false)}
              className={`px-3 py-2 transition-colors cursor-pointer ${
                !useSlang ? 'bg-[#141414] text-[#E4E3E0]' : 'bg-white text-[#141414] hover:bg-neutral-100'
              }`}
            >
              Standard ("Message")
            </button>
          </div>
        </div>
      </header>

      {/* Expandable Slang Glossary Banner */}
      <AnimatePresence>
        {showGlossaryTooltip && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-amber-50 border-2 border-[#141414] p-5 overflow-hidden"
          >
            <div className="flex justify-between items-start gap-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono uppercase tracking-widest font-black text-amber-900 bg-amber-200/80 px-2 py-0.5">
                    Term 01 // "Kite" = "Message"
                  </span>
                  <p className="text-xs text-[#141414] leading-relaxed pt-1">
                    In correctional and re-entry culture, a <strong>"kite"</strong> refers to a written note or private message passed securely between trusted peers. Hover over any highlighted word in your thread to see its definition.
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-mono uppercase tracking-widest font-black text-amber-900 bg-amber-200/80 px-2 py-0.5">
                    Term 02 // "Yard" = "Meeting Place"
                  </span>
                  <p className="text-xs text-[#141414] leading-relaxed pt-1">
                    <strong>"The Yard"</strong> refers to a shared meeting place, coffee shop, park, or community hub where members gather to check in, mentor one another, or socialize safely.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGlossaryTooltip(false)}
                className="p-1 hover:bg-[#141414]/10 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {statusBanner && (
        <div className="bg-amber-50 border border-amber-500 text-amber-900 px-4 py-3 text-xs font-mono uppercase tracking-widest flex justify-between items-center">
          <span>{statusBanner}</span>
          <button onClick={() => setStatusBanner(null)} className="font-bold">✕</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 border border-[#141414] bg-white h-[700px] shadow-2xl overflow-hidden rounded-sm">
        {/* Conversations List */}
        <div className={`lg:col-span-1 border-r border-[#141414] flex flex-col ${activeThread ? 'hidden lg:flex' : 'flex'}`}>
          <div className="p-6 border-b border-[#141414] bg-[#141414] text-[#E4E3E0] space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-serif italic">
                {useSlang ? 'Kite Threads' : 'Conversations'}
              </h2>
              <button
                type="button"
                onClick={() => setShowNewKiteModal(true)}
                className="px-3 py-1.5 bg-[#E4E3E0] text-[#141414] text-[10px] font-mono uppercase tracking-widest font-bold flex items-center gap-1 hover:bg-amber-300 transition-colors cursor-pointer"
              >
                <Plus size={12} /> {useSlang ? 'New Kite' : 'New Message'}
              </button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 opacity-40" size={14} />
              <input
                type="text"
                placeholder={useSlang ? 'Search kites...' : 'Search messages...'}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-sm py-2 pl-9 pr-4 text-xs focus:outline-none focus:ring-1 focus:ring-white/40 placeholder:text-white/30"
              />
            </div>
          </div>
          <div className="divide-y divide-[#141414]/10 flex-1 overflow-y-auto">
            {filteredConversations.length === 0 && (
              <div className="p-10 text-center space-y-4">
                <p className="opacity-40 text-sm italic font-serif">
                  {searchQuery
                    ? 'No matching conversations found.'
                    : useSlang
                    ? 'No kites sent or received yet.'
                    : 'No messages yet.'}
                </p>
                <button
                  type="button"
                  onClick={() => setShowNewKiteModal(true)}
                  className="px-4 py-2 border border-[#141414] text-xs font-mono uppercase tracking-widest font-bold hover:bg-[#141414] hover:text-[#E4E3E0] transition-colors cursor-pointer"
                >
                  {useSlang ? '+ Send Your First Kite' : '+ Start a Conversation'}
                </button>
              </div>
            )}
            {filteredConversations.map(conv => (
              <button
                key={conv.other_user_id}
                onClick={() => setActiveThread(conv.other_user_id)}
                className={`w-full text-left p-6 hover:bg-[#141414]/5 transition-all group relative overflow-hidden cursor-pointer ${
                  activeThread === conv.other_user_id ? 'bg-[#141414]/5' : ''
                }`}
              >
                {activeThread === conv.other_user_id && (
                  <motion.div layoutId="active-bg" className="absolute inset-y-0 left-0 w-1 bg-[#141414]" />
                )}
                <div className="flex justify-between items-center mb-2">
                  <span
                    className={`font-bold uppercase tracking-widest text-xs flex items-center gap-2 ${
                      conv.unread_count > 0 ? 'text-[#141414]' : 'opacity-60'
                    }`}
                  >
                    {conv.other_user_name}
                    {drafts[conv.other_user_id] && (
                      <span className="text-[9px] bg-amber-500/15 text-amber-700 border border-amber-500/20 px-1.5 py-0.5 normal-case tracking-normal font-mono font-bold rounded-sm">
                        Draft
                      </span>
                    )}
                  </span>
                  <span className="text-[10px] opacity-40 flex items-center gap-1 font-mono">
                    {new Date(conv.last_message_time).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between items-end gap-4">
                  <p
                    className={`text-sm line-clamp-1 flex-1 ${
                      conv.unread_count > 0 ? 'font-bold text-[#141414]' : 'opacity-60'
                    }`}
                  >
                    {conv.sender_id === user?.id ? <span className="opacity-40 italic">You: </span> : ''}
                    {conv.last_message}
                  </p>
                  {conv.unread_count > 0 && (
                    <span className="bg-[#141414] text-[#E4E3E0] text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                      {conv.unread_count}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Thread View */}
        <div className={`lg:col-span-2 flex flex-col bg-[#F9F9F8] ${!activeThread ? 'hidden lg:flex' : 'flex'}`}>
          {activeThread ? (
            <>
              <div className="p-4 md:p-6 border-b border-[#141414] bg-white flex items-center justify-between sticky top-0 z-10">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setActiveThread(null)}
                    className="lg:hidden p-2 -ml-2 hover:bg-[#141414]/5 rounded-full"
                  >
                    <ArrowLeft size={20} />
                  </button>
                  <div className="bg-[#141414] text-[#E4E3E0] p-2 rounded-full hidden sm:block">
                    <UserIcon size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-serif italic">{activePeerName}</h3>
                      <button
                        onClick={() => onNavigate?.('profile')}
                        className="p-1 hover:bg-[#141414]/5 rounded-sm opacity-40 hover:opacity-100 transition-all"
                        title="View Profile"
                      >
                        <ExternalLink size={14} />
                      </button>
                    </div>
                    <span className="text-[10px] uppercase tracking-widest opacity-40 flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500" /> End-to-End Private{' '}
                      {useSlang ? 'Kite Channel' : 'Message Channel'}
                    </span>
                  </div>
                </div>

                <div className="relative hidden md:block w-48">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 opacity-30" size={12} />
                  <input
                    type="text"
                    placeholder="Search thread..."
                    value={messageSearchQuery}
                    onChange={e => setMessageSearchQuery(e.target.value)}
                    className="w-full border-b border-[#141414]/10 py-1 pl-8 text-xs focus:outline-none focus:border-[#141414]/40 bg-transparent"
                  />
                </div>
              </div>

              <div className="flex-1 p-4 md:p-6 overflow-y-auto space-y-6 scrollbar-thin scrollbar-thumb-[#141414]/10 scrollbar-track-transparent">
                {filteredMessages.length === 0 && (
                  <div className="text-center py-16 space-y-2 opacity-50">
                    <p className="font-serif italic text-lg">
                      {useSlang
                        ? `Drop a kite to start your conversation with ${activePeerName}.`
                        : `Send a message to start your conversation with ${activePeerName}.`}
                    </p>
                    <p className="text-xs font-mono">
                      Tip: Words like "kite" (message) and "yard" (meeting place) include interactive tooltips!
                    </p>
                  </div>
                )}
                <AnimatePresence mode="popLayout">
                  {filteredMessages.map((msg, idx) => {
                    const isMe = msg.sender_id === user?.id;
                    const showDate =
                      idx === 0 ||
                      new Date(msg.timestamp).toDateString() !==
                        new Date(filteredMessages[idx - 1].timestamp).toDateString();

                    return (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="flex flex-col"
                      >
                        {showDate && (
                          <div className="flex justify-center my-8">
                            <span className="text-[10px] uppercase tracking-widest opacity-40 bg-[#E4E3E0] px-4 py-1 rounded-full border border-[#141414]/5">
                              {new Date(msg.timestamp).toLocaleDateString(undefined, {
                                weekday: 'long',
                                month: 'short',
                                day: 'numeric'
                              })}
                            </span>
                          </div>
                        )}
                        <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                          <div
                            className={`max-w-[85%] sm:max-w-[70%] p-4 rounded-2xl shadow-sm ${
                              isMe
                                ? 'bg-[#141414] text-[#E4E3E0] rounded-tr-none'
                                : 'bg-white border border-[#141414]/10 rounded-tl-none text-[#141414]'
                            }`}
                          >
                            <p className="text-sm md:text-base leading-relaxed whitespace-pre-wrap">
                              <SlangAwareText text={msg.content} useSlang={useSlang} isMe={isMe} />
                            </p>
                          </div>
                          <div
                            className={`flex items-center gap-2 mt-1.5 opacity-40 ${
                              isMe ? 'flex-row-reverse' : 'flex-row'
                            }`}
                          >
                            <span className="text-[9px] font-mono">
                              {new Date(msg.timestamp).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: true
                              })}
                            </span>
                            {isMe && (
                              <span
                                title={
                                  msg.is_read
                                    ? `Read ${new Date(msg.read_at!).toLocaleTimeString()}`
                                    : 'Delivered'
                                }
                              >
                                {msg.is_read ? (
                                  <CheckCheck size={12} className="text-blue-500" />
                                ) : (
                                  <Check size={12} />
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
                <div ref={messagesEndRef} />
              </div>

              <div className="p-4 md:p-6 border-t border-[#141414]/10 bg-white space-y-2">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() =>
                      handleReplyChange(
                        useSlang
                          ? "Hey, you hitting the yard today? Let's link up at our usual meeting place."
                          : "Hey, are you free to meet at a local meeting place today? Let's link up."
                      )
                    }
                    className="whitespace-nowrap text-[10px] uppercase tracking-widest bg-[#141414]/5 hover:bg-[#141414]/10 px-3 py-1.5 rounded-full border border-[#141414]/10 transition-colors cursor-pointer"
                    title='Uses "yard" as a synonym for a meeting place'
                  >
                    {useSlang ? 'Suggest Yard Meetup ("Meeting Place")' : 'Suggest Meeting Place'}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleReplyChange(
                        useSlang
                          ? 'Sending you this kite to check in on your re-entry goals this week.'
                          : 'Sending you this private message to check in on your re-entry goals this week.'
                      )
                    }
                    className="whitespace-nowrap text-[10px] uppercase tracking-widest bg-[#141414]/5 hover:bg-[#141414]/10 px-3 py-1.5 rounded-full border border-[#141414]/10 transition-colors cursor-pointer"
                    title='Uses "kite" as a synonym for a private message'
                  >
                    {useSlang ? 'Drop a Kite ("Private Message")' : 'Send Check-In Message'}
                  </button>
                </div>
                <div className="relative flex gap-3 items-end">
                  <textarea
                    rows={1}
                    value={replyContent}
                    onChange={e => {
                      handleReplyChange(e.target.value);
                      e.target.style.height = 'auto';
                      e.target.style.height = e.target.scrollHeight + 'px';
                    }}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleReply();
                      }
                    }}
                    placeholder={
                      useSlang
                        ? 'Type a kite (private message)... Use "yard" for a meeting place'
                        : 'Type a private message...'
                    }
                    className="flex-1 bg-transparent border border-[#141414]/20 rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-[#141414]/10 text-base resize-none max-h-32 transition-all"
                  />
                  <button
                    onClick={handleReply}
                    disabled={!replyContent.trim()}
                    className="bg-[#141414] text-[#E4E3E0] p-4 rounded-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-30 disabled:scale-100 flex items-center justify-center shrink-0 cursor-pointer"
                    title={useSlang ? 'Send Kite (Private Message)' : 'Send Message'}
                  >
                    <Send size={20} />
                  </button>
                </div>
                {replyContent.trim() && (
                  <div className="flex items-center gap-1.5 px-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#141414]/50">
                      Draft Saved Locally
                    </span>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                className="mb-8 opacity-10"
              >
                <Send size={120} strokeWidth={1} />
              </motion.div>
              <h3 className="text-3xl font-serif italic text-[#141414]/30 mb-2">
                {useSlang ? 'Your Kites (Private Messages)' : 'Your Private Messages'}
              </h3>
              <p className="text-[#141414]/40 max-w-xs mb-6">
                {useSlang
                  ? 'Select a peer from the list to send a kite or coordinate a meetup on the yard.'
                  : 'Select a peer from the list to send a private message or coordinate a meeting place.'}
              </p>
              <button
                type="button"
                onClick={() => setShowNewKiteModal(true)}
                className="px-6 py-3 bg-[#141414] text-[#E4E3E0] text-xs font-mono uppercase tracking-widest font-bold hover:opacity-90 transition-opacity cursor-pointer"
              >
                {useSlang ? '+ Compose New Kite' : '+ Compose New Message'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modal to Start a New Kite / Conversation with Any Member */}
      <AnimatePresence>
        {showNewKiteModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#E4E3E0] text-[#141414] border-2 border-[#141414] w-full max-w-lg p-6 shadow-2xl space-y-4"
            >
              <div className="flex justify-between items-center border-b border-[#141414]/15 pb-3">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest opacity-60 font-bold block">
                    {useSlang ? 'Directory Dispatch // New Kite' : 'Directory Dispatch // New Message'}
                  </span>
                  <h3 className="text-2xl font-serif italic font-bold">
                    {useSlang ? 'Select a Peer to Send a Kite' : 'Select a Peer to Message'}
                  </h3>
                </div>
                <button
                  onClick={() => setShowNewKiteModal(false)}
                  className="p-1.5 hover:bg-[#141414]/10 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-[#141414]/10 border border-[#141414] bg-white">
                {directoryUsers.map(peer => (
                  <button
                    key={peer.id}
                    type="button"
                    onClick={() => {
                      setActiveThread(peer.id);
                      setShowNewKiteModal(false);
                    }}
                    className="w-full text-left p-4 hover:bg-[#141414] hover:text-[#E4E3E0] transition-colors flex justify-between items-center cursor-pointer"
                  >
                    <div>
                      <p className="font-serif italic font-bold text-lg">{peer.name}</p>
                      <p className="text-[10px] font-mono uppercase opacity-60 flex items-center gap-1">
                        <MapPin size={10} /> {peer.location || 'Community Member'} • {peer.history || 'Alumnus'}
                      </p>
                    </div>
                    <span className="text-[10px] font-mono uppercase tracking-widest font-bold border border-current px-2.5 py-1">
                      {useSlang ? 'Send Kite →' : 'Message →'}
                    </span>
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
