import React, { useState, useRef, useEffect } from 'react';
import { Compass, Home, Briefcase, UserPlus, X, ChevronUp, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface QuickActionsProps {
  onAction: (action: 'jobs' | 'housing' | 'contact') => void;
}

export default function QuickActions({ onAction }: QuickActionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const actions = [
    {
      id: 'jobs' as const,
      label: 'Find Jobs',
      description: 'Browse parole-friendly employment',
      icon: Briefcase,
      color: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20 hover:bg-emerald-500/20'
    },
    {
      id: 'housing' as const,
      label: 'Find Housing',
      description: 'Search release-approved housing',
      icon: Home,
      color: 'bg-blue-500/10 text-blue-700 border-blue-500/20 hover:bg-blue-500/20'
    },
    {
      id: 'contact' as const,
      label: 'Add Contact',
      description: 'Register parole officer or support',
      icon: UserPlus,
      color: 'bg-purple-500/10 text-purple-700 border-purple-500/20 hover:bg-purple-500/20'
    }
  ];

  return (
    <div ref={containerRef} className="fixed bottom-6 left-6 z-50 font-sans">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 15, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute bottom-16 left-0 w-72 bg-[#E4E3E0] border-2 border-[#141414] shadow-[4px_4px_0px_0px_rgba(20,20,20,1)] p-4 flex flex-col gap-3 rounded-sm mb-2"
          >
            <div className="flex justify-between items-center pb-2 border-b border-[#141414]/10">
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#141414]/60 font-bold flex items-center gap-1.5">
                <Compass size={12} className="animate-spin-slow" /> Quick Actions
              </span>
              <button 
                onClick={() => setIsOpen(false)}
                className="hover:bg-[#141414]/5 p-1 rounded-sm transition-colors text-[#141414]"
              >
                <X size={14} />
              </button>
            </div>

            <div className="flex flex-col gap-2">
              {actions.map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.id}
                    onClick={() => {
                      onAction(action.id);
                      setIsOpen(false);
                    }}
                    className="flex items-start gap-3 p-2.5 border border-[#141414]/10 hover:border-[#141414] hover:bg-white/40 transition-all text-left rounded-sm cursor-pointer group"
                  >
                    <div className={`p-2 border rounded-sm shrink-0 transition-all group-hover:scale-105 ${action.color}`}>
                      <Icon size={16} />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-[#141414]">
                        {action.label}
                      </h4>
                      <p className="text-[10px] text-[#141414]/60 mt-0.5 leading-snug">
                        {action.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 p-3.5 px-4 z-50 rounded-full border-2 border-[#141414] shadow-[4px_4px_0px_0px_rgba(20,20,20,1)] transition-all cursor-pointer font-mono text-[11px] font-bold uppercase tracking-wider focus:outline-none ${
          isOpen
            ? 'bg-[#141414] text-[#E4E3E0] shadow-none translate-x-[2px] translate-y-[2px]'
            : 'bg-[#E4E3E0] text-[#141414] hover:scale-105'
        }`}
        title="Quick Navigation & Action Actions"
      >
        <Compass size={18} className={isOpen ? "rotate-45 transition-transform duration-300" : "transition-transform duration-300"} />
        <span>Actions</span>
        {isOpen ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
      </button>
    </div>
  );
}
