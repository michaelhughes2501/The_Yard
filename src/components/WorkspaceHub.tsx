import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { 
  Briefcase, 
  Mail, 
  FolderLock, 
  Video, 
  MessageSquare, 
  Contact, 
  Plus, 
  Send, 
  Upload, 
  ExternalLink,
  RefreshCw,
  Trash2,
  Trash,
  CheckCircle,
  HelpCircle,
  Clock,
  Link,
  CloudLightning,
  AlertCircle,
  Calendar
} from 'lucide-react';
import { 
  isGoogleConnected, 
  connectGoogleWorkspace, 
  disconnectGoogleWorkspace,
  listGoogleDriveFiles, 
  uploadFileToGoogleDrive,
  listGmailMessages, 
  sendGmailMessage, 
  listGoogleChatSpaces, 
  createGoogleMeetSpace, 
  listGoogleContacts,
  listGoogleCalendarEvents,
  updateGoogleCalendarEvent,
  addGoogleCalendarEvent,
  createGoogleSheet,
  listGoogleTasksLists,
  listGoogleTasks,
  createGoogleTask,
  listGoogleClassroomCourses,
  listGoogleClassroomCourseWork,
  createGoogleSlide,
  createGoogleForm
} from '../services/googleWorkspace.ts';
import ConfirmationDialog from './ConfirmationDialog';

export default function WorkspaceHub() {
  const { token } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState<'drive' | 'gmail' | 'chat' | 'meet' | 'contacts' | 'sheets' | 'tasks' | 'classroom' | 'slides' | 'forms' | 'picker'>('drive');
  const [isConnected, setIsConnected] = useState(isGoogleConnected());
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Local document storage from Vault to back up to Drive
  const [localDocs, setLocalDocs] = useState<any[]>([]);

  // Google Workspace States
  const [driveFiles, setDriveFiles] = useState<any[]>([]);
  const [gmailMessages, setGmailMessages] = useState<any[]>([]);
  const [chatSpaces, setChatSpaces] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  
  // New States
  const [sheetsTitle, setSheetsTitle] = useState('');
  const [slidesTitle, setSlidesTitle] = useState('');
  const [formsTitle, setFormsTitle] = useState('');
  const [pickedFile, setPickedFile] = useState<any>(null);

  const [tasksLists, setTasksLists] = useState<any[]>([]);
  const [selectedTaskList, setSelectedTaskList] = useState('');
  const [tasks, setTasks] = useState<any[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [classroomCourses, setClassroomCourses] = useState<any[]>([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [courseWork, setCourseWork] = useState<any[]>([]);

  // Form States
  const [emailTo, setEmailTo] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  
  const [meetTitle, setMeetTitle] = useState('');
  const [createdMeetUrl, setCreatedMeetUrl] = useState('');

  // Confirmation Modals States
  const [confirmSendEmail, setConfirmSendEmail] = useState(false);
  const [confirmBackupDocId, setConfirmBackupDocId] = useState<string | null>(null);

  // Calendar Background Sync States
  const [syncLogs, setSyncLogs] = useState<string[]>([]);
  const [isAutoSyncEnabled, setIsAutoSyncEnabled] = useState(true);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [syncInProgress, setSyncInProgress] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle');

  // Fetch local documents from the app vault
  const fetchLocalDocs = async () => {
    try {
      const res = await fetch('/api/documents', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setLocalDocs(data || []);
      }
    } catch (err) {
      console.error('Error fetching vault documents:', err);
    }
  };

  const runCalendarSync = async (silent = false) => {
    if (!isGoogleConnected()) return;
    if (syncInProgress) return;

    if (!silent) {
      setSyncInProgress(true);
      setSyncStatus('scanning');
    }
    const log = (msg: string) => {
      setSyncLogs(prev => [ `[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 19) ]);
    };

    try {
      log('Starting sync: checking case hearings against Google Calendar...');
      
      // 1. Fetch user's cases from local db
      const casesRes = await fetch('/api/legal-cases', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!casesRes.ok) throw new Error('Failed to fetch legal cases.');
      const cases: any[] = await casesRes.json();
      
      const casesWithHearings = cases.filter(c => c.next_hearing_date);
      log(`Found ${casesWithHearings.length} cases with future hearing dates.`);

      if (casesWithHearings.length === 0) {
        log('No upcoming hearings found to sync.');
        setSyncStatus('success');
        setLastSyncTime(new Date());
        return;
      }

      // 2. Fetch all Google Calendar events
      const calendarEvents = await listGoogleCalendarEvents();
      log(`Fetched ${calendarEvents.length} existing calendar events.`);

      let mismatchCount = 0;
      let insertedCount = 0;
      let updatedCount = 0;

      for (const legalCase of casesWithHearings) {
        const expectedSummary = `Hearing: Case #${legalCase.case_number}`;
        const newDateStr = legalCase.next_hearing_date; // YYYY-MM-DD
        
        // Find existing event for this case
        const matchedEvent = calendarEvents.find((evt: any) => 
          evt.summary === expectedSummary || 
          evt.summary?.includes(`Case #${legalCase.case_number}`)
        );

        const calendarLocation = legalCase.court || 'Court';
        const calendarDescription = `Case Tracker reference of Case #${legalCase.case_number} at ${legalCase.court || 'Court'}.\n\nNotes:\n${legalCase.notes || 'No notes provided.'}\n\nSynced automatically from The Yard.`;

        if (matchedEvent) {
          // Event exists, check for discrepancies
          const currentEventDate = matchedEvent.start?.date || matchedEvent.start?.dateTime?.split('T')[0];
          
          if (currentEventDate !== newDateStr) {
            log(`Discrepancy found for Case #${legalCase.case_number}! Calendar: ${currentEventDate || 'N/A'}, Local: ${newDateStr}. Auto-updating...`);
            mismatchCount++;
            
            await updateGoogleCalendarEvent(
              matchedEvent.id,
              expectedSummary,
              calendarLocation,
              calendarDescription,
              newDateStr
            );
            log(`Successfully updated Calendar event for Case #${legalCase.case_number} to ${newDateStr}.`);
            updatedCount++;
          }
        } else {
          // Event doesn't exist, create it!
          log(`Discrepancy found: Case #${legalCase.case_number} has no event in Google Calendar. Pushing...`);
          mismatchCount++;
          
          await addGoogleCalendarEvent(
            expectedSummary,
            calendarLocation,
            calendarDescription,
            newDateStr
          );
          log(`Successfully created Calendar event for Case #${legalCase.case_number} on ${newDateStr}.`);
          insertedCount++;
        }
      }

      if (mismatchCount === 0) {
        log('Sync complete: No discrepancies found. Everything is fully synced!');
      } else {
        log(`Sync complete: Auto-resolved ${mismatchCount} discrepancy/discrepancies (created ${insertedCount}, updated ${updatedCount}).`);
      }
      
      setSyncStatus('success');
      setLastSyncTime(new Date());

    } catch (err: any) {
      console.error('Calendar Background Sync Error:', err);
      log(`Sync error: ${err.message || err}`);
      setSyncStatus('error');
    } finally {
      setSyncInProgress(false);
    }
  };

  useEffect(() => {
    if (!isConnected || !isAutoSyncEnabled || !token) return;

    // Run first check immediately (after short delay) or wait for component mount
    const initialTimeout = setTimeout(() => {
      runCalendarSync(true); // run silently in the background initially
    }, 3000);

    // Periodic interval: run every 60 seconds
    const intervalId = setInterval(() => {
      runCalendarSync(true); // run silently
    }, 60000);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(intervalId);
    };
  }, [isConnected, isAutoSyncEnabled, token]);

  // Central refresh that fetches active sub tab data
  const refreshSubTabData = async () => {
    if (!isGoogleConnected()) return;
    setLoading(true);
    setErrorMsg('');
    try {
      if (activeSubTab === 'drive' || activeSubTab === 'picker') {
        const files = await listGoogleDriveFiles();
        setDriveFiles(files);
      } else if (activeSubTab === 'gmail') {
        const messages = await listGmailMessages();
        setGmailMessages(messages);
      } else if (activeSubTab === 'chat') {
        const spaces = await listGoogleChatSpaces();
        setChatSpaces(spaces);
      } else if (activeSubTab === 'contacts') {
        const conns = await listGoogleContacts();
        setContacts(conns);
      } else if (activeSubTab === 'tasks') {
        const lists = await listGoogleTasksLists();
        setTasksLists(lists);
        if (lists.length > 0 && !selectedTaskList) {
          setSelectedTaskList(lists[0].id);
        }
      } else if (activeSubTab === 'classroom') {
        const courses = await listGoogleClassroomCourses();
        setClassroomCourses(courses);
        if (courses.length > 0 && !selectedCourse) {
          setSelectedCourse(courses[0].id);
        }
      }
    } catch (err: any) {
      console.error(`Error refreshing workspace ${activeSubTab} data:`, err);
      setErrorMsg(err.message || `Failed to fetch your ${activeSubTab} details.`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLocalDocs();
  }, [token]);

  useEffect(() => {
    setIsConnected(isGoogleConnected());
    if (isGoogleConnected()) {
      refreshSubTabData();
    }
  }, [activeSubTab, isConnected]);

  useEffect(() => {
    if (activeSubTab === 'tasks' && selectedTaskList) {
      listGoogleTasks(selectedTaskList).then(setTasks).catch(err => setErrorMsg(err.message));
    }
  }, [selectedTaskList, activeSubTab]);

  useEffect(() => {
    if (activeSubTab === 'classroom' && selectedCourse) {
      listGoogleClassroomCourseWork(selectedCourse).then(setCourseWork).catch(err => setErrorMsg(err.message));
    }
  }, [selectedCourse, activeSubTab]);

  const handleConnect = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const result = await connectGoogleWorkspace();
      if (result) {
        setIsConnected(true);
        setSuccessMsg('Successfully connected your Google Workspace account!');
        setTimeout(() => setSuccessMsg(''), 5000);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication with Google failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = () => {
    disconnectGoogleWorkspace();
    setIsConnected(false);
    setDriveFiles([]);
    setGmailMessages([]);
    setChatSpaces([]);
    setContacts([]);
    setSuccessMsg('Disconnected Google Workspace account.');
    setTimeout(() => setSuccessMsg(''), 5000);
  };

  // Google Drive: Backup a Local document to Google Drive
  const handleBackupToDrive = async (docObj: any) => {
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      // First, get the full base64 file data from download api
      const dlRes = await fetch(`/api/documents/${docObj.id}/download`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!dlRes.ok) throw new Error('Could not download file data for backup.');
      const data = await dlRes.json();
      
      const fileData = data.file_data; // contains base64 data
      const fileName = data.file_name;
      const fileType = data.file_type || 'application/octet-stream';

      await uploadFileToGoogleDrive(fileName, fileType, fileData);
      setSuccessMsg(`"${docObj.title}" successfully backed up to your Google Drive!`);
      setTimeout(() => setSuccessMsg(''), 5000);
      
      // Refresh list
      const files = await listGoogleDriveFiles();
      setDriveFiles(files);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to backup file to Google Drive.');
    } finally {
      setLoading(false);
    }
  };

  // Gmail: Send email handler
  const handleSendEmail = async () => {
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await sendGmailMessage(emailTo, emailSubject, emailBody);
      setSuccessMsg(`Email successfully sent to ${emailTo}!`);
      setTimeout(() => setSuccessMsg(''), 5000);
      
      // Clear fields
      setEmailTo('');
      setEmailSubject('');
      setEmailBody('');
      
      // Refresh inbox list
      const messages = await listGmailMessages();
      setGmailMessages(messages);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to send email.');
    } finally {
      setLoading(false);
    }
  };

  // Google Meet: Create Meeting Space
  const handleCreateMeet = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setCreatedMeetUrl('');
    try {
      const spaceObj = await createGoogleMeetSpace(meetTitle || undefined);
      if (spaceObj?.meetingUri || spaceObj?.uri) {
        const uri = spaceObj.meetingUri || spaceObj.uri;
        setCreatedMeetUrl(uri);
        setSuccessMsg(`Google Meet Space created successfully! Link: ${uri}`);
        setTimeout(() => setSuccessMsg(''), 10000);
      } else {
        throw new Error('Created space details were empty.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create meeting space.');
    } finally {
      setLoading(false);
    }
  };

  // Google Contacts: Import contact into Local Parole Database
  const handleImportContact = async (c: any) => {
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await fetch('/api/parole-officers', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: c.name,
          agency: 'Imported from Google Contacts',
          phone: c.phone || 'Unavailable',
          district: 'Not Specified'
        })
      });
      if (!res.ok) {
        throw new Error('Could not add contact to Parole Officer list.');
      }
      setSuccessMsg(`Successfully imported "${c.name}" into your Legal Tools.`);
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to import connection.');
    }
  };

  return (
    <div className="space-y-8">
      {/* Editorial Header */}
      <header className="space-y-4">
        <div className="flex justify-between items-start flex-col md:flex-row gap-4">
          <div>
            <h2 className="text-6xl font-serif italic tracking-tighter">Google Workspace</h2>
            <p className="text-xl opacity-60 max-w-2xl mt-1">
              Link your Google Account to back up documents, check emails, list advocacy chat groups, and coordinate parole check-ins.
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            {isConnected ? (
              <div className="flex items-center gap-3 bg-white border border-[#141414] p-2 pr-4">
                <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse ml-2" />
                <span className="text-xs font-bold uppercase tracking-widest text-green-700">Connected</span>
                <button
                  onClick={handleDisconnect}
                  className="text-xs underline text-red-600 font-medium hover:text-red-800 transition-colors cursor-pointer"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button 
                onClick={handleConnect}
                disabled={loading}
                className="gsi-material-button shadow-md flex items-center bg-white border border-[#141414] cursor-pointer hover:bg-gray-50 transition-colors"
                style={{ padding: '4px 12px', minHeight: '44px' }}
                id="link-google-button"
              >
                <div className="gsi-material-button-content-wrapper flex items-center gap-3">
                  <div className="gsi-material-button-icon">
                    <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-[18px] h-[18px]" style={{ display: 'block' }}>
                      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                      <path fill="none" d="M0 0h48v48H0z"></path>
                    </svg>
                  </div>
                  <span className="gsi-material-button-contents text-xs font-bold uppercase tracking-widest text-[#141414]">Link Google Account</span>
                </div>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Messages / Banner Alerts */}
      {errorMsg && (
        <div className="bg-red-50 border border-red-500 text-red-700 px-4 py-3 text-sm flex items-start gap-2 animate-fade-in" id="workspace-error-banner">
          <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="bg-green-50 border border-green-500 text-green-700 px-4 py-3 text-sm flex items-start gap-2 animate-fade-in" id="workspace-success-banner">
          <CheckCircle size={16} className="mt-0.5 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {!isConnected ? (
        /* Not Connected State */
        <div className="bg-white border border-[#141414] p-12 text-center" id="workspace-unlinked bg">
          <div className="max-w-md mx-auto space-y-6">
            <div className="bg-[#E4E3E0] text-[#141414] p-5 rounded-full w-20 h-20 flex items-center justify-center mx-auto border border-[#141414]">
              <Briefcase size={36} />
            </div>
            <h3 className="text-2xl font-serif italic">Your Digital Hub Awaiting</h3>
            <p className="text-sm opacity-60 leading-relaxed">
              Unlock access to your full suite of recovery productivity tools. Link your Google Workspace account safely to start backing up identification to Drive, texting peers on Google Chat, and managing legal emails with Gmail.
            </p>
            <button
              onClick={handleConnect}
              disabled={loading}
              className="px-6 py-3 bg-[#141414] text-[#E4E3E0] uppercase tracking-widest text-xs font-bold hover:opacity-90 transition-opacity flex items-center gap-2 mx-auto cursor-pointer"
            >
              Connect My Account
            </button>
          </div>
        </div>
      ) : (
        /* Connected Workspace Management Area */
        <div className="space-y-6" id="workspace-active-panel">
          {/* Bento Sub tabs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-[repeat(11,minmax(0,1fr))] border border-[#141414] bg-white text-xs font-bold uppercase tracking-widest">
            <button
              onClick={() => setActiveSubTab('drive')}
              className={`p-4 flex flex-col items-center justify-center gap-2 border-r border-b lg:border-b-0 border-[#141414] transition-colors ${
                activeSubTab === 'drive' ? 'bg-[#141414] text-[#E4E3E0]' : 'hover:bg-gray-100'
              }`}
            >
              <FolderLock size={16} /> Drive
            </button>
            <button
              onClick={() => setActiveSubTab('gmail')}
              className={`p-4 flex flex-col items-center justify-center gap-2 border-r border-b lg:border-b-0 border-[#141414] transition-colors ${
                activeSubTab === 'gmail' ? 'bg-[#141414] text-[#E4E3E0]' : 'hover:bg-gray-100'
              }`}
            >
              <Mail size={16} /> Gmail
            </button>
            <button
              onClick={() => setActiveSubTab('chat')}
              className={`p-4 flex flex-col items-center justify-center gap-2 border-r border-b lg:border-b-0 border-[#141414] transition-colors ${
                activeSubTab === 'chat' ? 'bg-[#141414] text-[#E4E3E0]' : 'hover:bg-gray-100'
              }`}
            >
              <MessageSquare size={16} /> Chat
            </button>
            <button
              onClick={() => setActiveSubTab('meet')}
              className={`p-4 flex flex-col items-center justify-center gap-2 border-r border-b lg:border-b-0 border-[#141414] transition-colors ${
                activeSubTab === 'meet' ? 'bg-[#141414] text-[#E4E3E0]' : 'hover:bg-gray-100'
              }`}
            >
              <Video size={16} /> Meetings
            </button>
            <button
              onClick={() => setActiveSubTab('contacts')}
              className={`p-4 flex flex-col items-center justify-center gap-2 border-r border-b lg:border-b-0 border-[#141414] transition-colors ${
                activeSubTab === 'contacts' ? 'bg-[#141414] text-[#E4E3E0]' : 'hover:bg-gray-100'
              }`}
            >
              <Contact size={16} /> Contacts
            </button>
            <button
              onClick={() => setActiveSubTab('sheets')}
              className={`p-4 flex flex-col items-center justify-center gap-2 border-r border-b lg:border-b-0 border-[#141414] transition-colors ${
                activeSubTab === 'sheets' ? 'bg-[#141414] text-[#E4E3E0]' : 'hover:bg-gray-100'
              }`}
            >
              <Briefcase size={16} /> Sheets
            </button>
            <button
              onClick={() => setActiveSubTab('tasks')}
              className={`p-4 flex flex-col items-center justify-center gap-2 border-r border-b sm:border-b-0 lg:border-b-0 border-[#141414] transition-colors ${
                activeSubTab === 'tasks' ? 'bg-[#141414] text-[#E4E3E0]' : 'hover:bg-gray-100'
              }`}
            >
              <CheckCircle size={16} /> Tasks
            </button>
            <button
              onClick={() => setActiveSubTab('classroom')}
              className={`p-4 flex flex-col items-center justify-center gap-2 border-r border-b sm:border-b-0 lg:border-b-0 border-[#141414] transition-colors ${
                activeSubTab === 'classroom' ? 'bg-[#141414] text-[#E4E3E0]' : 'hover:bg-gray-100'
              }`}
            >
              <Briefcase size={16} /> Classes
            </button>
            <button
              onClick={() => setActiveSubTab('slides')}
              className={`p-4 flex flex-col items-center justify-center gap-2 border-r border-b sm:border-b-0 lg:border-b-0 border-[#141414] transition-colors ${
                activeSubTab === 'slides' ? 'bg-[#141414] text-[#E4E3E0]' : 'hover:bg-gray-100'
              }`}
            >
              <Plus size={16} /> Slides
            </button>
            <button
              onClick={() => setActiveSubTab('forms')}
              className={`p-4 flex flex-col items-center justify-center gap-2 border-r border-b sm:border-b-0 lg:border-b-0 border-[#141414] transition-colors ${
                activeSubTab === 'forms' ? 'bg-[#141414] text-[#E4E3E0]' : 'hover:bg-gray-100'
              }`}
            >
              <CheckCircle size={16} /> Forms
            </button>
            <button
              onClick={() => setActiveSubTab('picker')}
              className={`p-4 flex flex-col items-center justify-center gap-2 border-b sm:border-b-0 lg:border-b-0 border-[#141414] transition-colors ${
                activeSubTab === 'picker' ? 'bg-[#141414] text-[#E4E3E0]' : 'hover:bg-gray-100'
              }`}
            >
              <FolderLock size={16} /> Picker
            </button>
          </div>

          {/* Quick Refresh Banner */}
          <div className="flex justify-between items-center bg-white/50 border border-[#141414] p-3 text-xs">
            <span className="opacity-60 flex items-center gap-1.5 font-mono">
              <Clock size={12} /> Managed via Google Cloud Sandbox
            </span>
            <button
              onClick={refreshSubTabData}
              disabled={loading}
              className="flex items-center gap-1 underline font-bold uppercase hover:opacity-100 opacity-60 flex-shrink-0 transition-opacity cursor-pointer"
            >
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>

          {/* Case Hearing Calendar Sync Autopilot Section */}
          <div className="bg-white border border-[#141414] p-6 space-y-4" id="calendar-sync-autopilot">
            <div className="flex justify-between items-start flex-col sm:flex-row gap-4">
              <div>
                <h3 className="text-xl font-serif italic flex items-center gap-2">
                  <Calendar size={18} className="text-[#141414]" /> Case Tracker Calendar Sync Hub
                </h3>
                <p className="text-xs opacity-60 mt-1">
                  Periodic background runner checks your Case Tracker hear-dates and resolves differences automatically in your personal Google Calendar.
                </p>
              </div>
              
              <div className="flex flex-wrap items-center gap-3">
                <label className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isAutoSyncEnabled}
                    onChange={e => {
                      setIsAutoSyncEnabled(e.target.checked);
                      if (e.target.checked) {
                        setSyncLogs(prev => [`[${new Date().toLocaleTimeString()}] Enable automatic background checking (60s).`, ...prev]);
                      } else {
                        setSyncLogs(prev => [`[${new Date().toLocaleTimeString()}] Paused background checking.`, ...prev]);
                      }
                    }}
                    className="h-4 w-4 border-[#141414] accent-[#141414]"
                  />
                  Auto-Sync
                </label>

                <button
                  onClick={() => runCalendarSync(false)}
                  disabled={syncInProgress}
                  className="px-4 py-2 border border-[#141414] text-xs font-bold uppercase tracking-widest hover:bg-[#141414] hover:text-[#E4E3E0] transition-colors cursor-pointer flex items-center gap-1"
                >
                  <RefreshCw size={12} className={syncInProgress ? 'animate-spin' : ''} />
                  Check & Sync Now
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
              <div className="border border-[#141414]/10 p-3 flex flex-col justify-between bg-gray-50">
                <span className="text-[10px] uppercase opacity-40 font-bold tracking-widest">Scheduler State</span>
                <span className="text-xs font-mono font-bold uppercase mt-1">
                  {isAutoSyncEnabled ? (
                    <span className="text-green-700 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> Active (Every 60s)
                    </span>
                  ) : (
                    <span className="text-yellow-600">Paused</span>
                  )}
                </span>
              </div>
              
              <div className="border border-[#141414]/10 p-3 flex flex-col justify-between bg-gray-50">
                <span className="text-[10px] uppercase opacity-40 font-bold tracking-widest">Status</span>
                <span className="text-xs font-mono font-bold uppercase mt-1">
                  {syncInProgress ? (
                    <span className="text-blue-600">Scanning...</span>
                  ) : syncStatus === 'success' ? (
                    <span className="text-green-700">Fully Synced</span>
                  ) : syncStatus === 'error' ? (
                    <span className="text-red-600">Failed</span>
                  ) : (
                    <span className="text-gray-400">Idle</span>
                  )}
                </span>
              </div>

              <div className="border border-[#141414]/10 p-3 flex flex-col justify-between bg-gray-50">
                <span className="text-[10px] uppercase opacity-40 font-bold tracking-widest">Last Synced</span>
                <span className="text-xs font-mono font-bold mt-1">
                  {lastSyncTime ? lastSyncTime.toLocaleTimeString() : 'Never'}
                </span>
              </div>

              <div className="border border-[#141414]/10 p-3 flex flex-col justify-between bg-gray-50">
                <span className="text-[10px] uppercase opacity-40 font-bold tracking-widest font-serif">Logs Count</span>
                <span className="text-xs font-mono font-bold mt-1">
                  {syncLogs.length} Entries
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] uppercase font-bold tracking-widest text-[#141414] font-mono">Sync Activity Log Stream</label>
              <div className="bg-[#141414] text-[#E4E3E0] p-4 text-xs font-mono rounded-xs h-32 overflow-y-auto space-y-1 scrollbar-thin">
                {syncLogs.length === 0 ? (
                  <p className="opacity-40 italic">Waiting for activity...</p>
                ) : (
                  syncLogs.map((entry, idx) => (
                    <p key={idx} className="leading-relaxed whitespace-pre-wrap select-text">{entry}</p>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="bg-white border border-[#141414] p-6 min-h-[400px]">
            {/* GOOGLE DRIVE VIEWER */}
            {activeSubTab === 'drive' && (
              <div className="space-y-6" id="subtab-drive">
                <div className="flex justify-between items-center flex-wrap gap-2">
                  <div>
                    <h3 className="text-xl font-serif italic">The Google Drive Vault</h3>
                    <p className="text-xs opacity-60">Listing secure files currently stored in your Drive file cloud.</p>
                  </div>
                </div>

                {/* Vault Backup Integration */}
                <div className="bg-[#E4E3E0]/20 border border-[#141414]/10 p-4">
                  <h4 className="text-xs uppercase tracking-widest font-bold mb-2">Sync Local Document to Drive</h4>
                  {localDocs.length === 0 ? (
                    <p className="text-xs opacity-60">No files found currently in your Local Vault.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-40 overflow-y-auto">
                      {localDocs.map(doc => (
                        <div key={doc.id} className="bg-white border border-[#141414]/20 p-3 flex justify-between items-center text-xs">
                          <div>
                            <p className="font-bold truncate max-w-[180px]">{doc.title}</p>
                            <span className="text-[10px] uppercase bg-gray-100 px-1">{doc.category}</span>
                          </div>
                          <button
                            onClick={() => {
                              setConfirmBackupDocId(doc.id);
                            }}
                            className="bg-[#141414] text-white p-1.5 pl-3 pr-3 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 cursor-pointer transition-opacity hover:opacity-90"
                          >
                            <Upload size={10} /> Sync
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {loading ? (
                  <div className="text-center py-12 font-serif italic opacity-60">Pulling files list...</div>
                ) : driveFiles.length === 0 ? (
                  <div className="text-center py-12 opacity-60 text-xs">No files detected in your Google Drive folder.</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {driveFiles.map(file => (
                      <div key={file.id} className="bg-white border border-[#141414] p-4 flex flex-col justify-between">
                        <div className="space-y-1">
                          <h4 className="font-bold text-sm truncate" title={file.name}>{file.name}</h4>
                          <p className="text-xs opacity-60 font-mono">Format: {file.mimeType.split('/').pop()}</p>
                          <p className="text-xs opacity-60">Added: {new Date(file.createdTime).toLocaleDateString()}</p>
                        </div>

                        {file.webViewLink && (
                          <div className="mt-4 pt-4 border-t border-[#141414]/10 flex justify-end">
                            <a
                              href={file.webViewLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-bold uppercase tracking-widest flex items-center gap-1 hover:underline text-[#141414]"
                            >
                              Open in Drive <ExternalLink size={12} />
                            </a>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* GMAIL VIEWER */}
            {activeSubTab === 'gmail' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8" id="subtab-gmail">
                {/* Email List Left side */}
                <div className="lg:col-span-2 space-y-4">
                  <h3 className="text-xl font-serif italic">Your Recent Gmail Emails</h3>
                  <p className="text-xs opacity-60 mb-2">Displaying the 10 most recent emails from your linked Google inbox.</p>

                  {loading ? (
                    <div className="text-center py-12 font-serif italic opacity-60">Connecting to mail servers...</div>
                  ) : gmailMessages.length === 0 ? (
                    <div className="text-center py-12 opacity-60 text-sm">Your Gmail inbox is silent.</div>
                  ) : (
                    <div className="divide-y divide-[#141414]/10 border border-[#141414]">
                      {gmailMessages.map(msg => (
                        <div key={msg.id} className="p-4 bg-white hover:bg-gray-50 flex flex-col space-y-1">
                          <div className="flex justify-between items-start">
                            <span className="text-xs font-bold truncate max-w-[150px]">{msg.from}</span>
                            <span className="text-[10px] opacity-60 whitespace-nowrap">{msg.date}</span>
                          </div>
                          <span className="font-bold text-xs truncate">{msg.subject}</span>
                          <p className="text-xs opacity-60 line-clamp-2 leading-relaxed">{msg.snippet}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Mail Sender Form Right side */}
                <div className="space-y-4 border-l border-dashed border-[#141414]/20 lg:pl-6">
                  <h3 className="text-xl font-serif italic flex items-center gap-2"><Send size={18} /> Compose Message</h3>
                  <p className="text-xs opacity-60">Compose and send an email securely on your behalf to aid in reentry tasks.</p>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-[10px] uppercase font-bold tracking-widest mb-1 text-gray-700">Recipient Email</label>
                      <input
                        type="email"
                        placeholder="recipient@example.com"
                        value={emailTo}
                        onChange={e => setEmailTo(e.target.value)}
                        className="w-full text-xs font-sans border border-[#141414] p-3 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-bold tracking-widest mb-1 text-gray-700">Subject Line</label>
                      <input
                        type="text"
                        placeholder="e.g. Case Worker Check-in Details"
                        value={emailSubject}
                        onChange={e => setEmailSubject(e.target.value)}
                        className="w-full text-xs font-sans border border-[#141414] p-3 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-bold tracking-widest mb-1 text-gray-700">MIME Text Body</label>
                      <textarea
                        placeholder="Write your email respectfully..."
                        value={emailBody}
                        onChange={e => setEmailBody(e.target.value)}
                        className="w-full text-xs font-sans border border-[#141414] p-3 focus:outline-none h-44 resize-none"
                      />
                    </div>

                    <button
                      onClick={() => {
                        if (!emailTo || !emailSubject || !emailBody) {
                          alert('All fields are required to draft and send emails.');
                          return;
                        }
                        setConfirmSendEmail(true);
                      }}
                      disabled={loading || !emailTo}
                      className="w-full bg-[#141414] text-white p-3 uppercase font-bold text-xs tracking-widest hover:opacity-90 transition-opacity flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Send size={14} /> Send Email
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* GOOGLE CHAT VIEWER */}
            {activeSubTab === 'chat' && (
              <div className="space-y-6" id="subtab-chat">
                <div>
                  <h3 className="text-xl font-serif italic">Linked Support Spaces</h3>
                  <p className="text-xs opacity-60">Advocacy circles or support groups you belong to in Google Chat.</p>
                </div>

                {loading ? (
                  <div className="text-center py-12 font-serif italic opacity-60">Scanning spaces...</div>
                ) : chatSpaces.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 border border-[#141414]/10 rounded-sm">
                    <MessageSquare size={36} className="mx-auto text-gray-400 mb-2" />
                    <p className="text-xs opacity-60 max-w-sm mx-auto">No Google Chat spaces found. You can communicate with peers and mentors in real-time once added to advocacy rooms.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {chatSpaces.map(space => (
                      <div key={space.name} className="border border-[#141414] bg-white p-4 flex flex-col justify-between">
                        <div>
                          <div className="bg-gray-100 p-2 text-xs font-bold font-mono tracking-wider truncate uppercase">
                            Room Circle
                          </div>
                          <h4 className="font-serif italic font-medium text-lg mt-3 truncate">{space.displayName || 'Support Circle'}</h4>
                          <p className="text-xs opacity-60 mt-2 truncate">Space Type: {space.type}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* GOOGLE MEET SCHEDULER */}
            {activeSubTab === 'meet' && (
              <div className="max-w-xl space-y-6" id="subtab-meet">
                <div>
                  <h3 className="text-xl font-serif italic">Google Meet Scheduler</h3>
                  <p className="text-xs opacity-60">Generate instantly accessible virtual conferencing meetups for case officer reviews or mentor catch ups.</p>
                </div>

                <form onSubmit={handleCreateMeet} className="space-y-4">
                  <div>
                    <label className="block text-xs uppercase font-bold tracking-widest mb-1 text-gray-700">Meeting Topic / Title</label>
                    <input
                      type="text"
                      placeholder="e.g. Weekly Mentorship Check-in"
                      value={meetTitle}
                      onChange={e => setMeetTitle(e.target.value)}
                      className="w-full border border-[#141414] p-3 text-xs focus:outline-none focus:ring-1 focus:ring-[#141414]/10 bg-white"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-[#141414] text-white p-3 px-6 uppercase text-xs font-bold tracking-widest flex items-center gap-2 hover:opacity-90 cursor-pointer"
                  >
                    <Plus size={14} /> Create Room Space
                  </button>
                </form>

                {createdMeetUrl && (
                  <div className="bg-[#E4E3E0]/30 border border-[#141414] p-4 text-center space-y-3">
                    <p className="text-xs uppercase tracking-widest font-bold text-green-700 flex items-center justify-center gap-1.5">
                      <CheckCircle size={14} /> Meeting Space Created successfully
                    </p>
                    <p className="text-lg font-serif italic truncate">{meetTitle || 'Google Meet Space'}</p>
                    <a
                      href={createdMeetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 bg-[#141414] text-white p-3 pr-4 pl-4 font-bold uppercase tracking-widest text-xs hover:opacity-95"
                    >
                      Join Meeting Now <ExternalLink size={12} />
                    </a>
                    <p className="text-[10px] opacity-40 font-mono break-all">{createdMeetUrl}</p>
                  </div>
                )}
              </div>
            )}

            {/* GOOGLE CONTACTS VIEWER */}
            {activeSubTab === 'contacts' && (
              <div className="space-y-6" id="subtab-contacts">
                <div>
                  <h3 className="text-xl font-serif italic">Your Google Contacts Connections</h3>
                  <p className="text-xs opacity-60">Import trusted contacts into your Legal App parole officer or mentors records instantaneously.</p>
                </div>

                {loading ? (
                  <div className="text-center py-12 font-serif italic opacity-60">Scanning connections...</div>
                ) : contacts.length === 0 ? (
                  <div className="text-center py-12 opacity-60 text-xs">No Google Contacts connections detected.</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {contacts.map(c => (
                      <div key={c.resourceName} className="border border-[#141414] bg-white p-4 flex flex-col justify-between">
                        <div className="space-y-1">
                          <h4 className="font-bold text-sm truncate">{c.name}</h4>
                          <p className="text-xs opacity-60 truncate">{c.email || 'No email register'}</p>
                          <p className="text-xs opacity-60 truncate">{c.phone || 'No phone register'}</p>
                        </div>

                        <div className="mt-4 pt-3 border-t border-[#141414]/10 flex justify-end">
                          <button
                            onClick={() => handleImportContact(c)}
                            className="bg-[#141414] text-white p-1 px-3 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 hover:opacity-90 cursor-pointer"
                          >
                            <Plus size={10} /> Import to POs
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* GOOGLE SHEETS CREATOR */}
            {activeSubTab === 'sheets' && (
              <div className="max-w-xl space-y-6" id="subtab-sheets">
                <div>
                  <h3 className="text-xl font-serif italic">Google Sheets Creator</h3>
                  <p className="text-xs opacity-60">Create a new spreadsheet to track expenses, progress, or other personal data.</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs uppercase font-bold tracking-widest mb-1 text-gray-700">Sheet Title</label>
                    <input
                      type="text"
                      placeholder="e.g. Monthly Budget"
                      value={sheetsTitle}
                      onChange={e => setSheetsTitle(e.target.value)}
                      className="w-full border border-[#141414] p-3 text-xs focus:outline-none focus:ring-1 focus:ring-[#141414]/10 bg-white"
                    />
                  </div>

                  <button
                    onClick={async () => {
                      if (!sheetsTitle) return;
                      setLoading(true);
                      setErrorMsg('');
                      try {
                        const res = await createGoogleSheet(sheetsTitle);
                        setSuccessMsg('Successfully created Google Sheet: ' + res.spreadsheetUrl);
                        setSheetsTitle('');
                      } catch (err: any) {
                        setErrorMsg(err.message);
                      } finally {
                        setLoading(false);
                      }
                    }}
                    disabled={loading || !sheetsTitle}
                    className="bg-[#141414] text-white p-3 px-6 uppercase text-xs font-bold tracking-widest flex items-center gap-2 hover:opacity-90 cursor-pointer disabled:opacity-50"
                  >
                    <Plus size={14} /> Create Spreadsheet
                  </button>
                </div>
              </div>
            )}

            {/* GOOGLE TASKS MANAGER */}
            {activeSubTab === 'tasks' && (
              <div className="space-y-6" id="subtab-tasks">
                <div>
                  <h3 className="text-xl font-serif italic">Google Tasks Integration</h3>
                  <p className="text-xs opacity-60">Manage your to-do lists directly from your Google Tasks account.</p>
                </div>

                {loading ? (
                  <div className="text-center py-12 font-serif italic opacity-60">Loading tasks...</div>
                ) : tasksLists.length === 0 ? (
                  <div className="text-center py-12 opacity-60 text-xs">No task lists found.</div>
                ) : (
                  <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row gap-4">
                      <select
                        value={selectedTaskList}
                        onChange={e => setSelectedTaskList(e.target.value)}
                        className="border border-[#141414] p-2 text-xs uppercase tracking-widest font-bold bg-white focus:outline-none"
                      >
                        {tasksLists.map(list => (
                          <option key={list.id} value={list.id}>{list.title}</option>
                        ))}
                      </select>
                    </div>

                    <div className="border border-[#141414] bg-white p-4 space-y-4">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="New Task Title..."
                          value={newTaskTitle}
                          onChange={e => setNewTaskTitle(e.target.value)}
                          className="flex-1 border border-[#141414] p-2 text-xs focus:outline-none"
                        />
                        <button
                          onClick={async () => {
                            if (!newTaskTitle || !selectedTaskList) return;
                            setLoading(true);
                            try {
                              await createGoogleTask(selectedTaskList, newTaskTitle);
                              const updatedTasks = await listGoogleTasks(selectedTaskList);
                              setTasks(updatedTasks);
                              setNewTaskTitle('');
                            } catch (err: any) {
                              setErrorMsg(err.message);
                            } finally {
                              setLoading(false);
                            }
                          }}
                          disabled={loading || !newTaskTitle}
                          className="bg-[#141414] text-white px-4 text-xs font-bold uppercase disabled:opacity-50"
                        >
                          Add
                        </button>
                      </div>

                      <div className="space-y-2">
                        {tasks.map(task => (
                          <div key={task.id} className="flex items-center gap-3 border border-gray-100 p-2 text-sm">
                            {task.status === 'completed' ? (
                              <CheckCircle size={16} className="text-emerald-500" />
                            ) : (
                              <div className="w-4 h-4 border border-gray-300 rounded-sm" />
                            )}
                            <span className={task.status === 'completed' ? 'line-through opacity-50' : ''}>
                              {task.title}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* GOOGLE CLASSROOM VIEWER */}
            {activeSubTab === 'classroom' && (
              <div className="space-y-6" id="subtab-classroom">
                <div>
                  <h3 className="text-xl font-serif italic">Google Classroom Viewer</h3>
                  <p className="text-xs opacity-60">View your active courses and upcoming coursework directly from Google Classroom.</p>
                </div>

                {loading ? (
                  <div className="text-center py-12 font-serif italic opacity-60">Loading courses...</div>
                ) : classroomCourses.length === 0 ? (
                  <div className="text-center py-12 opacity-60 text-xs">No active Google Classroom courses found.</div>
                ) : (
                  <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row gap-4">
                      <select
                        value={selectedCourse}
                        onChange={e => setSelectedCourse(e.target.value)}
                        className="border border-[#141414] p-2 text-xs uppercase tracking-widest font-bold bg-white focus:outline-none"
                      >
                        {classroomCourses.map(course => (
                          <option key={course.id} value={course.id}>{course.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {courseWork.map(work => (
                        <div key={work.id} className="border border-[#141414] bg-white p-4 flex flex-col justify-between">
                          <div className="space-y-2">
                            <h4 className="font-bold text-sm">{work.title}</h4>
                            <p className="text-xs opacity-60 truncate">{work.description || 'No description provided'}</p>
                          </div>
                          
                          <div className="mt-4 pt-3 border-t border-[#141414]/10 flex justify-between items-center">
                            <span className="text-[10px] font-mono opacity-50">
                              {work.dueDate ? `Due: ${work.dueDate.year}-${work.dueDate.month}-${work.dueDate.day}` : 'No Due Date'}
                            </span>
                            <a
                              href={work.alternateLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="bg-[#141414] text-white p-1 px-3 text-[10px] font-bold uppercase tracking-widest hover:opacity-90 flex items-center gap-1"
                            >
                              Open <ExternalLink size={10} />
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* GOOGLE SLIDES CREATOR */}
            {activeSubTab === 'slides' && (
              <div className="max-w-xl space-y-6" id="subtab-slides">
                <div>
                  <h3 className="text-xl font-serif italic">Google Slides Creator</h3>
                  <p className="text-xs opacity-60">Create a new presentation.</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs uppercase font-bold tracking-widest mb-1 text-gray-700">Slide Title</label>
                    <input
                      type="text"
                      placeholder="e.g. Project Pitch"
                      value={slidesTitle}
                      onChange={e => setSlidesTitle(e.target.value)}
                      className="w-full border border-[#141414] p-3 text-xs focus:outline-none focus:ring-1 focus:ring-[#141414]/10 bg-white"
                    />
                  </div>

                  <button
                    onClick={async () => {
                      if (!slidesTitle) return;
                      setLoading(true);
                      setErrorMsg('');
                      try {
                        const res = await createGoogleSlide(slidesTitle);
                        setSuccessMsg('Successfully created Google Slide: ' + res.presentationId);
                        setSlidesTitle('');
                      } catch (err: any) {
                        setErrorMsg(err.message);
                      } finally {
                        setLoading(false);
                      }
                    }}
                    disabled={loading || !slidesTitle}
                    className="bg-[#141414] text-white p-3 px-6 uppercase text-xs font-bold tracking-widest flex items-center gap-2 hover:opacity-90 cursor-pointer disabled:opacity-50"
                  >
                    <Plus size={14} /> Create Presentation
                  </button>
                </div>
              </div>
            )}

            {/* GOOGLE FORMS CREATOR */}
            {activeSubTab === 'forms' && (
              <div className="max-w-xl space-y-6" id="subtab-forms">
                <div>
                  <h3 className="text-xl font-serif italic">Google Forms Creator</h3>
                  <p className="text-xs opacity-60">Create a new form.</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs uppercase font-bold tracking-widest mb-1 text-gray-700">Form Title</label>
                    <input
                      type="text"
                      placeholder="e.g. Feedback Survey"
                      value={formsTitle}
                      onChange={e => setFormsTitle(e.target.value)}
                      className="w-full border border-[#141414] p-3 text-xs focus:outline-none focus:ring-1 focus:ring-[#141414]/10 bg-white"
                    />
                  </div>

                  <button
                    onClick={async () => {
                      if (!formsTitle) return;
                      setLoading(true);
                      setErrorMsg('');
                      try {
                        const res = await createGoogleForm(formsTitle);
                        setSuccessMsg('Successfully created Google Form: ' + res.formId);
                        setFormsTitle('');
                      } catch (err: any) {
                        setErrorMsg(err.message);
                      } finally {
                        setLoading(false);
                      }
                    }}
                    disabled={loading || !formsTitle}
                    className="bg-[#141414] text-white p-3 px-6 uppercase text-xs font-bold tracking-widest flex items-center gap-2 hover:opacity-90 cursor-pointer disabled:opacity-50"
                  >
                    <Plus size={14} /> Create Form
                  </button>
                </div>
              </div>
            )}

            {/* GOOGLE PICKER / DRIVE VIEWER */}
            {activeSubTab === 'picker' && (
              <div className="space-y-6" id="subtab-picker">
                <div>
                  <h3 className="text-xl font-serif italic">Google File Picker</h3>
                  <p className="text-xs opacity-60">Select a file from your Google Drive.</p>
                </div>
                
                {loading ? (
                  <div className="text-center py-12 font-serif italic opacity-60">Loading files...</div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {pickedFile && (
                      <div className="border border-emerald-500 bg-emerald-50 p-4 mb-4">
                        <h4 className="font-bold text-emerald-800 text-sm">Selected File</h4>
                        <p className="text-xs text-emerald-700 mt-1">{pickedFile.name}</p>
                        <a
                          href={pickedFile.webViewLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 inline-block bg-emerald-600 text-white p-1 px-3 text-[10px] font-bold uppercase tracking-widest hover:bg-emerald-700"
                        >
                          Open File
                        </a>
                      </div>
                    )}
                    
                    <div className="border border-[#141414] bg-white">
                      <div className="bg-gray-50 border-b border-[#141414]/20 p-2 text-[10px] font-mono uppercase tracking-widest text-gray-500 font-bold flex justify-between">
                        <span>Select a File</span>
                        <span>{driveFiles.length} files</span>
                      </div>
                      <div className="divide-y divide-[#141414]/10 max-h-96 overflow-y-auto">
                        {driveFiles.map(file => (
                          <div key={file.id} className="p-3 flex justify-between items-center hover:bg-gray-50 group transition-colors">
                            <div className="flex items-center gap-3 overflow-hidden">
                              <FolderLock size={16} className="opacity-40" />
                              <div className="truncate">
                                <h4 className="text-sm font-bold truncate pr-4">{file.name}</h4>
                                <p className="text-[10px] font-mono opacity-50 truncate mt-0.5">{file.mimeType}</p>
                              </div>
                            </div>
                            <button
                              onClick={() => setPickedFile(file)}
                              className="bg-[#141414] text-white p-1.5 px-4 text-[10px] font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              Pick
                            </button>
                          </div>
                        ))}
                        {driveFiles.length === 0 && (
                          <div className="p-8 text-center text-xs opacity-50">No files found or refresh needed.</div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Confirmation Dialogs to ensure we never run destructive or mutating Workspace APIs without permission */}
      <ConfirmationDialog
        isOpen={confirmSendEmail}
        title="Send Email Confirmation"
        message={`Are you sure you want to send this email message securely to "${emailTo}"?`}
        onConfirm={() => {
          setConfirmSendEmail(false);
          handleSendEmail();
        }}
        onCancel={() => setConfirmSendEmail(false)}
        confirmText="Confirm Send"
        cancelText="Cancel"
        type="info"
      />

      <ConfirmationDialog
        isOpen={confirmBackupDocId !== null}
        title="Sync Document Back-up"
        message="Backing up files links Google Drive. Do you wish to synchronize this critical document securely to your Google Drive Google Cloud vault?"
        onConfirm={() => {
          const docId = confirmBackupDocId;
          setConfirmBackupDocId(null);
          if (docId) {
            const documentObj = localDocs.find(d => d.id === docId);
            if (documentObj) handleBackupToDrive(documentObj);
          }
        }}
        onCancel={() => setConfirmBackupDocId(null)}
        confirmText="Verify Back-up"
        cancelText="Cancel"
        type="info"
      />
    </div>
  );
}
