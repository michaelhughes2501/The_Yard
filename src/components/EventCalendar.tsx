import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Plus, 
  Trash2, 
  Sparkles, 
  MapPin, 
  Info, 
  CheckCircle, 
  AlertCircle,
  FileText,
  Bookmark,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth } from '../firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

interface CalendarEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time?: string;
  category: 'court' | 'parole' | 'wellness' | 'career' | 'personal';
  description?: string;
  address?: string;
}

export default function EventCalendar() {
  const { user, token } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  
  // Modal / Form state
  const [isAddingEvent, setIsAddingEvent] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: '',
    category: 'personal' as const,
    time: '09:00',
    description: '',
    address: ''
  });

  const [isLoading, setIsLoading] = useState(true);

  // Load user events from both database legal cases AND custom scheduled items (localStorage)
  useEffect(() => {
    const fetchAllEvents = async () => {
      setIsLoading(true);
      const fetchedEvents: CalendarEvent[] = [];

      try {
        // 1. Fetch Legal Cases Hearing Dates from DB
        const res = await fetch('/api/legal-cases', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const cases = await res.json();
          if (Array.isArray(cases)) {
            cases.forEach((caseItem: any) => {
              if (caseItem.next_hearing_date) {
                // Parse date string (often YYYY-MM-DD)
                const dateStr = caseItem.next_hearing_date.split('T')[0];
                fetchedEvents.push({
                  id: `case-${caseItem.id}`,
                  title: `Court Hearing: Case #${caseItem.case_number}`,
                  date: dateStr,
                  time: '09:00',
                  category: 'court',
                  description: `Court hearing at ${caseItem.court || 'assigned court house'}. Synced from Case Tracker.`,
                  address: caseItem.court
                });
              }
            });
          }
        }
      } catch (err) {
        console.error('Error fetching cases for calendar:', err);
      }

      // 2. Load custom user-scheduled events
      try {
        const stored = localStorage.getItem(`yard_calendar_events_${user?.id}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            fetchedEvents.push(...parsed);
          }
        } else {
          // Setup starter seeds if empty
          const seedEvents: CalendarEvent[] = [
            {
              id: 'seed-1',
              title: 'Weekly Parole Check-in',
              date: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0], // 2 days from now
              time: '14:00',
              category: 'parole',
              description: 'Routine status consultation with Assigned Parole Officer.',
              address: 'Downtown Parole Administration Complex'
            },
            {
              id: 'seed-2',
              title: 'Career interview - Workforce1',
              date: new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0], // 5 days from now
              time: '10:30',
              category: 'career',
              description: 'Introductory mentorship check-in for advanced plumbing courses.',
              address: 'Workforce1 Development Center, Brooklyn'
            },
            {
              id: 'seed-3',
              title: 'Re-entry Group Counseling session',
              date: new Date(Date.now() - 86400000).toISOString().split('T')[0], // Yesterday
              time: '18:00',
              category: 'wellness',
              description: 'Support network check-in focusing on transitional skills.',
              address: 'Central Community Hall'
            }
          ];
          localStorage.setItem(`yard_calendar_events_${user?.id}`, JSON.stringify(seedEvents));
          fetchedEvents.push(...seedEvents);
        }
      } catch (err) {
        console.error('Error parsing stored events:', err);
      }

      setEvents(fetchedEvents);
      setIsLoading(false);
    };

    if (user && token) {
      fetchAllEvents();
    }
  }, [user, token]);

  const handleAddEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEvent.title.trim()) return;

    const eventItem: CalendarEvent = {
      id: crypto.randomUUID(),
      title: newEvent.title.trim(),
      date: selectedDate,
      time: newEvent.time,
      category: newEvent.category,
      description: newEvent.description.trim(),
      address: newEvent.address.trim()
    };

    const updatedEvents = [...events, eventItem];
    setEvents(updatedEvents);

    // Save only custom events to localStorage (ignoring database-derived case ones to avoid duplication)
    const customOnly = updatedEvents.filter(ev => !ev.id.startsWith('case-'));
    localStorage.setItem(`yard_calendar_events_${user?.id}`, JSON.stringify(customOnly));

    setIsAddingEvent(false);
    setNewEvent({
      title: '',
      category: 'personal',
      time: '09:00',
      description: '',
      address: ''
    });
  };

  const handleDeleteEvent = (id: string) => {
    if (id.startsWith('case-')) {
      alert("This event represents an active court case hearing. Please modify it from the Legal Case Tracker tab.");
      return;
    }

    const filtered = events.filter(ev => ev.id !== id);
    setEvents(filtered);
    localStorage.setItem(`yard_calendar_events_${user?.id}`, JSON.stringify(filtered.filter(ev => !ev.id.startsWith('case-'))));
  };

  // Calendar Math & Grid builders
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const firstDayIndex = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const prevMonthTotalDays = new Date(year, month, 0).getDate();

  const selectPrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const selectNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Formats to YYYY-MM-DD safely
  const getFormattedGridDate = (dayNum: number, currentOffset: 'curr' | 'prev' | 'next' = 'curr') => {
    let dYear = year;
    let dMonth = month;
    let dDay = dayNum;

    if (currentOffset === 'prev') {
      dMonth -= 1;
      if (dMonth < 0) {
        dMonth = 11;
        dYear -= 1;
      }
    } else if (currentOffset === 'next') {
      dMonth += 1;
      if (dMonth > 11) {
        dMonth = 0;
        dYear += 1;
      }
    }

    const mm = String(dMonth + 1).padStart(2, '0');
    const dd = String(dDay).padStart(2, '0');
    return `${dYear}-${mm}-${dd}`;
  };

  const selectedDayEvents = events.filter(e => e.date === selectedDate);

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'court': return { bg: 'bg-red-500', text: 'text-red-500', badge: 'bg-red-100 text-red-800 border-red-200' };
      case 'parole': return { bg: 'bg-zinc-950', text: 'text-zinc-950', badge: 'bg-zinc-100 text-zinc-900 border-zinc-200' };
      case 'wellness': return { bg: 'bg-emerald-500', text: 'text-emerald-500', badge: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
      case 'career': return { bg: 'bg-blue-600', text: 'text-blue-600', badge: 'bg-blue-100 text-blue-850 border-blue-200' };
      default: return { bg: 'bg-amber-500', text: 'text-amber-500', badge: 'bg-amber-100 text-amber-850 border-amber-200' };
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 py-4">
      
      {/* Intro Header */}
      <div className="border-b border-[#141414]/10 pb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-3xl font-serif italic text-[#141414] flex items-center gap-2">
            <CalendarIcon size={28} className="text-amber-600 animate-pulse" /> Event Calendar
          </h2>
          <p className="text-xs uppercase tracking-widest font-mono text-neutral-500">
            Keep track of legal hearing reminders, parole supervision counseling sessions, and custom milestones.
          </p>
        </div>
        <button
          onClick={() => setIsAddingEvent(true)}
          className="flex items-center gap-1 bg-[#141414] text-[#E4E3E0] px-4 py-2.5 text-xs font-bold uppercase tracking-widest hover:opacity-90 select-none cursor-pointer border border-[#141414] self-start sm:self-auto"
        >
          <Plus size={16} /> Schedule Entry
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Calendar visual board grids */}
        <div className="lg:col-span-2 bg-white border border-[#141414] p-6 shadow-sm">
          
          {/* Calendar top controls */}
          <div className="flex items-center justify-between mb-6">
            <span className="text-xl font-serif italic text-neutral-900">
              {monthNames[month]} {year}
            </span>
            <div className="flex gap-2">
              <button 
                onClick={selectPrevMonth}
                className="p-2 border border-[#141414]/20 hover:border-[#141414] transition-colors rounded"
              >
                <ChevronLeft size={16} />
              </button>
              <button 
                onClick={() => setCurrentDate(new Date())}
                className="px-3 py-1.5 border border-[#141414] text-xs font-bold uppercase tracking-wider hover:bg-[#141414]/5 transition-all text-neutral-800"
              >
                Today
              </button>
              <button 
                onClick={selectNextMonth}
                className="p-2 border border-[#141414]/20 hover:border-[#141414] transition-colors rounded"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* Weekday Labels Grid */}
          <div className="grid grid-cols-7 gap-1 text-center border-b border-neutral-100 pb-2 mb-2 font-mono text-[10px] uppercase font-bold text-neural-500 tracking-wider">
            <div>Sun</div>
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
            <div>Thu</div>
            <div>Fri</div>
            <div>Sat</div>
          </div>

          {/* Dynamic Grid of Calendar days */}
          <div className="grid grid-cols-7 gap-1.5">
            {/* Days from previous month */}
            {Array.from({ length: firstDayIndex }).map((_, i) => {
              const dayNum = prevMonthTotalDays - firstDayIndex + i + 1;
              const formattedDate = getFormattedGridDate(dayNum, 'prev');
              const dayHasEvents = events.some(e => e.date === formattedDate);
              
              return (
                <div 
                  key={`prev-${i}`} 
                  onClick={() => setSelectedDate(formattedDate)}
                  className={`min-h-[75px] p-1.5 border border-dashed border-neutral-100 opacity-35 text-[11px] font-mono hover:bg-neutral-50 transition-colors cursor-pointer flex flex-col justify-between ${
                    selectedDate === formattedDate ? 'bg-neutral-50 border-neutral-400' : ''
                  }`}
                >
                  <span className="text-neutral-400">{dayNum}</span>
                  {dayHasEvents && <div className="w-2 h-2 rounded-full self-center bg-zinc-400" />}
                </div>
              );
            })}

            {/* Days in the active month */}
            {Array.from({ length: totalDays }).map((_, i) => {
              const dayNum = i + 1;
              const formattedDate = getFormattedGridDate(dayNum, 'curr');
              const isSelected = selectedDate === formattedDate;
              
              const isToday = () => {
                const today = new Date();
                return today.getFullYear() === year && today.getMonth() === month && today.getDate() === dayNum;
              };

              const dayEvents = events.filter(e => e.date === formattedDate);

              return (
                <div 
                  key={`curr-${i}`}
                  onClick={() => setSelectedDate(formattedDate)}
                  className={`min-h-[75px] p-2 border transition-all cursor-pointer flex flex-col justify-between text-left ${
                    isSelected 
                      ? 'border-[#141414] bg-neutral-150/50' 
                      : isToday()
                        ? 'border-amber-500 bg-amber-500/5'
                        : 'border-[#141414]/10 hover:border-neutral-800'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className={`text-xs font-mono font-bold ${isToday() ? 'text-amber-600 scale-110 font-black' : 'text-neutral-700'}`}>
                      {dayNum}
                    </span>
                    {isToday() && (
                      <span className="text-[7px] text-amber-700 font-bold uppercase tracking-wider bg-amber-100 border border-amber-200 px-1 rounded-sm">
                        Today
                      </span>
                    )}
                  </div>

                  {/* Micro list of dots / pills */}
                  <div className="space-y-1 mt-1">
                    {dayEvents.slice(0, 2).map(ev => {
                      const colors = getCategoryColor(ev.category);
                      return (
                        <div 
                          key={ev.id} 
                          title={ev.title}
                          className="text-[8px] sm:text-[9px] font-medium leading-tight truncate px-1 py-0.5 border border-black/5 rounded-sm capitalize bg-neutral-50 flex items-center gap-1"
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${colors.bg}`} />
                          <span className="truncate text-black font-medium">{ev.title}</span>
                        </div>
                      );
                    })}
                    {dayEvents.length > 2 && (
                      <div className="text-[7px] font-mono tracking-wider opacity-60 text-right">
                        +{dayEvents.length - 2} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Days in next month */}
            {Array.from({ length: 42 - (firstDayIndex + totalDays) }).map((_, i) => {
              const dayNum = i + 1;
              const formattedDate = getFormattedGridDate(dayNum, 'next');
              const dayHasEvents = events.some(e => e.date === formattedDate);

              return (
                <div 
                  key={`next-${i}`}
                  onClick={() => setSelectedDate(formattedDate)}
                  className={`min-h-[75px] p-1.5 border border-dashed border-neutral-100 opacity-35 text-[11px] font-mono hover:bg-neutral-50 transition-colors cursor-pointer flex flex-col justify-between ${
                    selectedDate === formattedDate ? 'bg-neutral-50 border-neutral-400' : ''
                  }`}
                >
                  <span className="text-neutral-400">{dayNum}</span>
                  {dayHasEvents && <div className="w-2 h-2 rounded-full self-center bg-zinc-400" />}
                </div>
              );
            })}
          </div>

          {/* Quick Category Legend */}
          <div className="flex flex-wrap gap-4 mt-8 pt-4 border-t border-neutral-100 justify-center">
            <div className="flex items-center gap-1.5 text-xs text-neutral-600 font-mono">
              <span className="w-3 h-3 bg-red-500 rounded-sm" /> Court Hearing (Synced)
            </div>
            <div className="flex items-center gap-1.5 text-xs text-neutral-600 font-mono">
              <span className="w-3 h-3 bg-zinc-950 rounded-sm" /> Parole Check-In
            </div>
            <div className="flex items-center gap-1.5 text-xs text-neutral-600 font-mono">
              <span className="w-3 h-3 bg-emerald-500 rounded-sm" /> Wellness / Medical Check
            </div>
            <div className="flex items-center gap-1.5 text-xs text-neutral-600 font-mono">
              <span className="w-3 h-3 bg-blue-600 rounded-sm" /> Jobs / Interviews
            </div>
            <div className="flex items-center gap-1.5 text-xs text-neutral-600 font-mono">
              <span className="w-3 h-3 bg-amber-500 rounded-sm" /> Personal Schedule
            </div>
          </div>

        </div>

        {/* Selected date events side listings */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white border border-[#141414] p-5 shadow-sm space-y-4">
            
            <div className="border-b border-[#141414]/10 pb-3 flex justify-between items-center">
              <div className="space-y-0.5">
                <span className="text-[9px] font-mono uppercase tracking-widest text-[#141414] opacity-50 font-bold">Scheduled Events</span>
                <h3 className="font-serif italic text-lg leading-tight text-neutral-900">
                  {new Date(selectedDate + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'long', day: 'numeric' })}
                </h3>
              </div>
              <button 
                onClick={() => setIsAddingEvent(true)}
                className="text-[10px] font-black uppercase tracking-widest text-amber-600 hover:text-amber-500 hover:underline inline-flex items-center gap-0.5"
              >
                Add <Plus size={12} />
              </button>
            </div>

            <AnimatePresence mode="popLayout">
              {selectedDayEvents.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="p-8 text-center text-neutral-400 space-y-2"
                >
                  <Bookmark size={20} className="mx-auto opacity-30" />
                  <p className="text-xs font-mono uppercase">Empty Slate</p>
                  <p className="text-[11px] font-medium leading-relaxed">No critical tasks or counseling events registered on this day.</p>
                </motion.div>
              ) : (
                <div className="space-y-3.5 max-h-[400px] overflow-y-auto pr-1">
                  {selectedDayEvents.map(ev => {
                    const colors = getCategoryColor(ev.category);
                    const isCase = ev.id.startsWith('case-');

                    return (
                      <motion.div
                        layout
                        key={ev.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="bg-neutral-50 p-4 border border-[#141414]/10 rounded-sm relative group hover:border-[#141414] transition-all"
                      >
                        <div className="flex justify-between items-start gap-2 mb-2">
                          <span className={`text-[8px] font-mono font-black uppercase tracking-widest px-1.5 py-0.5 border rounded-sm ${colors.badge}`}>
                            {ev.category}
                          </span>
                          
                          {!isCase && (
                            <button
                              onClick={() => handleDeleteEvent(ev.id)}
                              className="text-neutral-400 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100 p-1"
                              title="Delete personal scheduled event"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>

                        <h4 className="font-bold text-neutral-900 text-sm mb-1.5">{ev.title}</h4>
                        {ev.description && (
                          <p className="text-xs text-neutral-600 mb-2 whitespace-pre-wrap leading-relaxed">
                            {ev.description}
                          </p>
                        )}

                        <div className="grid grid-cols-1 gap-1 pt-1.5 border-t border-dashed border-neutral-200">
                          {ev.time && (
                            <span className="text-[10px] font-mono text-neutral-500 font-medium flex items-center gap-1">
                              <Clock size={12} className="opacity-70" /> Time Scheduled: {ev.time}
                            </span>
                          )}
                          {ev.address && (
                            <span className="text-[10px] font-mono text-neutral-500 font-medium flex items-center gap-1">
                              <MapPin size={12} className="opacity-70" /> {ev.address}
                            </span>
                          )}
                        </div>

                        {isCase && (
                          <div className="mt-3 p-1.5 bg-red-50 border border-red-100 text-[10px] text-red-900 font-mono rounded flex items-center gap-1 opacity-80">
                            <Info size={12} className="shrink-0" /> Synchronized automatically from legal case list.
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </AnimatePresence>

          </div>

          {/* Quick sync block details */}
          <div className="bg-neutral-50 border border-[#141414] p-5 space-y-3 shadow-inner">
            <h4 className="text-xs font-bold uppercase tracking-widest flex items-center gap-1.5 text-neutral-800">
              <Sparkles size={14} className="text-amber-500" /> Auto-sync enabled
            </h4>
            <p className="text-xs text-neutral-600 leading-relaxed">
              When a case date is generated or updated in the Legal Case Tracker, The Yard updates your Google calendar instantly if linked.
            </p>
          </div>
        </div>

      </div>

      {/* New Event Intake Form Overlay */}
      <AnimatePresence>
        {isAddingEvent && (
          <div className="fixed inset-0 bg-[#141414]/40 backdrop-blur-xs z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-[#141414] w-full max-w-md p-6 relative shadow-2xl"
            >
              <button
                onClick={() => setIsAddingEvent(false)}
                className="absolute right-4 top-4 hover:opacity-60"
              >
                <XCircleIcon />
              </button>

              <h3 className="text-xl font-serif italic text-neutral-900 border-b border-neutral-100 pb-3 mb-4">
                Schedule Transition Goal / Appointment
              </h3>

              <form onSubmit={handleAddEvent} className="space-y-4">
                <div className="space-y-1">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-[#141414]">
                    Event Milestone Name
                  </label>
                  <input
                    type="text"
                    required
                    value={newEvent.title}
                    onChange={(e) => setNewEvent(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g. Schedule parole consult, Submit ID paper"
                    className="w-full border border-[#141414] p-3 text-xs uppercase tracking-wider focus:ring-1 focus:ring-[#141414]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-[#141414]">
                      Category
                    </label>
                    <select
                      value={newEvent.category}
                      onChange={(e) => setNewEvent(prev => ({ ...prev, category: e.target.value as any }))}
                      className="w-full border border-[#141414] p-3 text-xs uppercase tracking-wider bg-white"
                    >
                      <option value="personal">Personal / Goal</option>
                      <option value="parole">Parole / Check-in</option>
                      <option value="wellness">Wellness Support</option>
                      <option value="career">Career / Employment</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-[#141414]">
                      Time Scheduled
                    </label>
                    <input
                      type="time"
                      value={newEvent.time}
                      onChange={(e) => setNewEvent(prev => ({ ...prev, time: e.target.value }))}
                      className="w-full border border-[#141414] p-3 text-xs bg-white"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-[#141414]">
                    Location / Bureau Address
                  </label>
                  <input
                    type="text"
                    value={newEvent.address}
                    onChange={(e) => setNewEvent(prev => ({ ...prev, address: e.target.value }))}
                    placeholder="Physical suite numbers, counselor hall"
                    className="w-full border border-[#141414] p-3 text-xs bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-[#141414]">
                    Notes
                  </label>
                  <textarea
                    value={newEvent.description}
                    onChange={(e) => setNewEvent(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Attach case numbers, specific addresses, or details..."
                    className="w-full border border-[#141414] p-3 text-xs min-h-[85px] max-h-[140px]"
                  />
                </div>

                <div className="flex gap-3 pt-3">
                  <button
                    type="submit"
                    className="flex-1 bg-[#141414] text-[#E4E3E0] py-3 text-xs font-bold uppercase tracking-widest hover:opacity-95 select-none cursor-pointer"
                  >
                    Confirm Event
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAddingEvent(false)}
                    className="flex-1 border border-neutral-300 py-3 text-xs font-bold uppercase tracking-widest hover:bg-neutral-50 select-none cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

// Simple internal icon helper for compactness
function XCircleIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-[#141414]">
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="15" y1="9" x2="9" y2="15"></line>
      <line x1="9" y1="9" x2="15" y2="15"></line>
    </svg>
  );
}
