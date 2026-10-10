import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, 
  HeartHandshake, 
  Lock, 
  AlertTriangle, 
  CheckCircle2, 
  X, 
  MessageSquare, 
  Flag,
  ArrowRight,
  Sparkles
} from 'lucide-react';

interface CommunityGuidelinesModalProps {
  isOpen: boolean;
  onAccept: () => void;
  onClose?: () => void;
  onDecline?: () => void;
  isFirstVisit?: boolean;
}

export default function CommunityGuidelinesModal({
  isOpen,
  onAccept,
  onClose,
  onDecline,
  isFirstVisit = false
}: CommunityGuidelinesModalProps) {
  const [agreed, setAgreed] = useState(false);

  // Close on escape if not mandatory first visit
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isFirstVisit && onClose) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isFirstVisit, onClose]);

  // Reset agreement checkbox when opening
  useEffect(() => {
    if (isOpen) {
      setAgreed(false);
    }
  }, [isOpen]);

  const guidelines = [
    {
      icon: HeartHandshake,
      title: "1. Mutual Respect & Zero Tolerance for Harassment",
      description: "Treat all members with dignity. We strictly prohibit harassment, hate speech, threats, bullying, slurs, or degradation based on conviction history, race, religion, or background. We are here to lift each other up."
    },
    {
      icon: Lock,
      title: "2. Privacy & Confidentiality",
      description: "Protect your safety and the safety of others. Never post personal addresses, phone numbers, private case docket documents, or contact details of probation/parole officers. What is shared in confidence stays within our community."
    },
    {
      icon: AlertTriangle,
      title: "3. Safe & Lawful Reentry",
      description: "Do not facilitate, solicit, or promote illegal activities, contraband, or any actions that could jeopardize someone's parole, probation, or legal status. The Yard is committed to clean, sustainable futures."
    },
    {
      icon: MessageSquare,
      title: "4. Constructive Peer Discussions & Advice",
      description: "Share real experiences, verified job leads, and constructive coping strategies. Disagree with kindness—focus on ideas, not personal attacks. Remember that peer advice is not substitute for official legal counsel or medical care."
    },
    {
      icon: Flag,
      title: "5. Active Moderation & Community Accountability",
      description: "Help keep our space healthy. If you see harmful, exploitative, or abusive messages, use the flag button to notify moderators. Repeated infractions result in account suspension."
    }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => {
              if (!isFirstVisit && onClose) {
                onClose();
              }
            }}
          />

          {/* Modal Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: "spring", duration: 0.4, bounce: 0.15 }}
            className="relative w-full max-w-2xl bg-[#E4E3E0] border-2 border-[#141414] shadow-2xl p-6 sm:p-8 my-8 z-10 max-h-[90vh] flex flex-col"
            role="dialog"
            aria-modal="true"
            aria-labelledby="guidelines-modal-title"
          >
            {/* Header */}
            <div className="flex justify-between items-start border-b border-[#141414]/15 pb-5">
              <div className="flex items-center gap-3">
                <div className="bg-[#141414] text-[#E4E3E0] p-2.5 rounded-sm">
                  <ShieldCheck size={26} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-amber-700 bg-amber-100 px-2 py-0.5 font-bold rounded-sm border border-amber-300">
                      Expectations of Conduct
                    </span>
                    {isFirstVisit && (
                      <span className="text-[10px] font-mono uppercase tracking-widest bg-[#141414]/10 px-2 py-0.5 font-semibold rounded-sm">
                        Welcome to the Forum
                      </span>
                    )}
                  </div>
                  <h2 id="guidelines-modal-title" className="text-2xl sm:text-3xl font-serif italic font-bold text-[#141414] mt-1">
                    Community Guidelines
                  </h2>
                </div>
              </div>

              {!isFirstVisit && onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 text-[#141414]/60 hover:text-[#141414] hover:bg-[#141414]/5 rounded transition-colors"
                  aria-label="Close modal"
                >
                  <X size={20} />
                </button>
              )}
            </div>

            {/* Intro text */}
            <div className="py-4 text-xs sm:text-sm text-[#141414]/80 leading-relaxed border-b border-[#141414]/10">
              <p>
                The Yard Forum is a safe, member-first brotherhood and sisterhood built on second chances, mutual accountability, and empowerment. To protect every individual’s freedom and dignity, all members agree to uphold these standards:
              </p>
            </div>

            {/* Guidelines List (Scrollable) */}
            <div className="flex-1 overflow-y-auto py-4 space-y-3.5 pr-1">
              {guidelines.map((item, index) => {
                const Icon = item.icon;
                return (
                  <div 
                    key={index} 
                    className="p-3.5 sm:p-4 bg-white/70 border border-[#141414]/15 rounded-sm hover:border-[#141414]/30 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-[#141414]/5 text-[#141414] rounded shrink-0 mt-0.5">
                        <Icon size={18} />
                      </div>
                      <div>
                        <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[#141414]">
                          {item.title}
                        </h3>
                        <p className="text-xs sm:text-sm text-[#141414]/75 mt-1 leading-relaxed">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer with Acknowledgement */}
            <div className="border-t border-[#141414]/15 pt-5 mt-2 space-y-4">
              <label className="flex items-start gap-3 cursor-pointer group select-none">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-[#141414] text-[#141414] focus:ring-[#141414] accent-[#141414]"
                />
                <span className="text-xs sm:text-sm text-[#141414]/90 group-hover:text-[#141414] leading-tight">
                  I have read, understood, and promise to uphold these Community Guidelines to ensure The Yard remains a respectful, safe space for everyone.
                </span>
              </label>

              <div className="flex flex-col sm:flex-row gap-3 justify-end items-center">
                {isFirstVisit && onDecline && (
                  <button
                    type="button"
                    onClick={onDecline}
                    className="w-full sm:w-auto px-5 py-3 text-xs font-mono uppercase tracking-widest text-[#141414]/70 hover:text-[#141414] hover:bg-[#141414]/5 border border-transparent hover:border-[#141414]/20 transition-all text-center rounded-sm"
                  >
                    Leave Forum
                  </button>
                )}

                <button
                  type="button"
                  disabled={!agreed}
                  onClick={() => {
                    if (agreed) {
                      onAccept();
                    }
                  }}
                  className={`w-full sm:w-auto px-6 py-3 text-xs font-mono uppercase tracking-widest font-bold flex items-center justify-center gap-2 transition-all rounded-sm ${
                    agreed
                      ? 'bg-[#141414] text-[#E4E3E0] hover:bg-[#141414]/90 shadow-md cursor-pointer'
                      : 'bg-[#141414]/20 text-[#141414]/40 cursor-not-allowed'
                  }`}
                >
                  <CheckCircle2 size={16} />
                  <span>{isFirstVisit ? 'Agree & Enter Forum' : 'Acknowledge Guidelines'}</span>
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
