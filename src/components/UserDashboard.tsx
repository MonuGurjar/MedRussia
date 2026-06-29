import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, FeedbackEntry, AppSettings, EligibilityData, DocumentMetadata } from '../types';
import { getUserFeedback, saveFeedback, toggleShortlist, updateUserDocuments, updateUserEligibility, fetchUsersFromStore, updateUser } from '../services/db';
import { getSettings } from '../services/settings';
import { uploadFileToCloudinary } from '../services/storage';
import { checkEligibility } from '../services/gemini';
import { BudgetCalculator } from './BudgetCalculator';
import { PlatformFeedbackModal } from './PlatformFeedbackModal';
import { RUSSIAN_UNIVERSITIES, getUniversityData } from '../constants/universities';
import { getStudentChats, createDirectChat, sendDirectMessage } from '../services/directChat';
import { DirectChat, DirectMessageAttachment } from '../types';

interface UserDashboardProps {
  user: User; onLogout: () => void; onInquirySubmitted?: () => void;
  initialView?: 'inquiries' | 'explorer' | 'budget' | 'profile' | 'settings' | 'help' | 'documents' | 'eligibility' | 'chats';
  onFabToggle?: (isOpen: boolean) => void; theme?: 'light' | 'dark'; toggleTheme?: () => void; onToggleCurrency?: () => void;
}

const ALL_TABS = [
  { id: 'inquiries', label: 'Inquiries', icon: 'list_alt' },
  { id: 'chats', label: 'Chat', icon: 'chat' },
  { id: 'explorer', label: 'Uni Explorer', icon: 'account_balance' },
  { id: 'budget', label: 'Budget Calc', icon: 'calculate' },
  { id: 'eligibility', label: 'Eligibility', icon: 'verified' },
  { id: 'profile', label: 'Profile', icon: 'person' },
  { id: 'documents', label: 'Checklist', icon: 'checklist' },
  { id: 'help', label: 'Help', icon: 'help_outline' },
  { id: 'settings', label: 'Settings', icon: 'settings' }
] as const;

const MOBILE_TABS = [
  { id: 'inquiries', label: 'Home', icon: 'home' },
  { id: 'chats', label: 'Chat', icon: 'chat' },
  { id: 'explorer', label: 'Search', icon: 'explore' },
  { id: 'eligibility', label: 'Check', icon: 'checklist' },
];

const SECURITY_QUESTIONS = ["What is the name of your first pet?", "What city were you born in?", "What is your mother's maiden name?", "What is the name of your favorite teacher?"];

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'pending': return { label: 'Pending', cls: 'bg-amber-100 text-amber-800' };
    case 'replied': return { label: 'Replied', cls: 'bg-emerald-100 text-emerald-800' };
    case 'closed': case 'resolved': return { label: 'Resolved', cls: 'bg-slate-100 text-slate-600' };
    default: return { label: status, cls: 'bg-slate-100 text-slate-600' };
  }
};

const getDocStatusStyle = (status: string) => {
  switch (status) {
    case 'verified': return 'bg-emerald-100 text-emerald-700';
    case 'rejected': return 'bg-red-100 text-red-700';
    case 'uploaded': return 'bg-blue-100 text-blue-700';
    default: return 'bg-orange-100 text-orange-700';
  }
};

const getEligibilityStatus = (result: string) => {
  if (!result) return 'unknown';
  const lower = result.toLowerCase();
  if (lower.includes('not eligible')) return 'not_eligible';
  if (lower.includes('conditionally') || lower.includes('borderline')) return 'borderline';
  if (lower.includes('eligible')) return 'eligible';
  return 'unknown';
};

export const UserDashboard: React.FC<UserDashboardProps> = ({ user, onLogout, onInquirySubmitted, initialView = 'inquiries', onFabToggle, theme, toggleTheme, onToggleCurrency }) => {
  const navigate = useNavigate();
  const [entries, setEntries] = useState<FeedbackEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInquiryForm, setShowInquiryForm] = useState(false);
  const [activeView, setActiveView] = useState(initialView);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<{ id: string; text: string; type: 'info' | 'success' | 'alert' | 'recommendation'; time: string }[]>([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [passData, setPassData] = useState({ current: '', new: '', confirm: '' });
  const [savingSettings, setSavingSettings] = useState(false);
  const [profileData, setProfileData] = useState({ name: user.name, phone: user.phone || '', university: user.university || '' });
  const [avatar, setAvatar] = useState<string | null>(user.avatar || null);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState<'marksheet' | 'passport' | 'neetScoreCard' | null>(null);
  const [eligibilityForm, setEligibilityForm] = useState<EligibilityData>(user.eligibilityData || { pcbPercentage: '', category: 'General', isPwd: false, neetScore: '', dob: '', medium: 'English', knowsRussian: false, passportStatus: 'Have', medicalHistory: '' });
  const [eligibilityResult, setEligibilityResult] = useState<string | null>(user.eligibilityResult || null);
  const [checkingEligibility, setCheckingEligibility] = useState(false);
  const [uniSearch, setUniSearch] = useState('');
  const [shortlist, setShortlist] = useState<string[]>(user.shortlistedUniversities || []);
  const [budgetFilter, setBudgetFilter] = useState<string>('all');
  const [cityFilter, setCityFilter] = useState<string[]>([]);
  const [citySearch, setCitySearch] = useState('');
  const [newInquiry, setNewInquiry] = useState({ targetUniversity: '', message: '', budget: '', currentStatus: 'NEET Aspirant' as any });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [eligibilityDataFound, setEligibilityDataFound] = useState<string | null>(null);
  const [studentChats, setStudentChats] = useState<DirectChat[]>([]);
  const [activeStudentChat, setActiveStudentChat] = useState<DirectChat | null>(null);
  const [studentChatMsg, setStudentChatMsg] = useState('');
  const [studentChatAttachment, setStudentChatAttachment] = useState<DirectMessageAttachment | null>(null);
  const [isSendingChat, setIsSendingChat] = useState(false);
  const [isLoadingChats, setIsLoadingChats] = useState(false);
  const [showSecurityPrompt, setShowSecurityPrompt] = useState(false);
  const [recoveryData, setRecoveryData] = useState({ question: SECURITY_QUESTIONS[0], answer: '' });

  useEffect(() => { setActiveView(initialView); }, [initialView]);
  useEffect(() => { if (!user.recoveryQuestion && !user.recoveryAnswer) setShowSecurityPrompt(true); }, [user]);
  useEffect(() => { if (activeView === 'chats') { setIsLoadingChats(true); getStudentChats(user.id).then(chats => { setStudentChats(chats); if (chats.length > 0 && !activeStudentChat) setActiveStudentChat(chats[0]); }).catch(console.error).finally(() => setIsLoadingChats(false)); } }, [activeView]);

  const fetchFeedbackAndNotifications = async () => {
    setLoading(true);
    const data = await getUserFeedback(user.id);
    setEntries(data); setLoading(false);
    const newNotifs: typeof notifications = [];
    try { const users = await fetchUsersFromStore(); const freshUser = users.find((u: any) => u.id === user.id); if (freshUser?.notifications) freshUser.notifications.forEach((n: any) => newNotifs.push({ id: n.id, text: n.message, type: n.type, time: new Date(n.timestamp).toLocaleDateString() })); } catch (e) { console.error(e); }
    const repliedEntries = data.filter(e => e.status === 'replied');
    if (repliedEntries.length > 0) newNotifs.push({ id: 'reply-' + repliedEntries[0].id, text: `Admin replied to your inquiry about ${repliedEntries[0].targetUniversity}`, type: 'success', time: 'Recent' });
    setNotifications(newNotifs);
  };

  useEffect(() => {
    fetchFeedbackAndNotifications();
    getSettings().then(data => setSettings(data));
    const pendingScore = localStorage.getItem('mr_neet_score');
    if (pendingScore) { setEligibilityDataFound(pendingScore); setEligibilityForm(prev => ({ ...prev, neetScore: pendingScore })); setNewInquiry(prev => ({ ...prev, currentStatus: 'NEET Aspirant', message: `Eligibility Check: My NEET Score is ${pendingScore}. What are my chances?`, budget: 'Not sure yet' })); setActiveView('eligibility'); localStorage.removeItem('mr_neet_score'); }
  }, [user.id]);

  const handleToggleShortlist = async (uni: string) => { const newList = await toggleShortlist(user.id, uni); setShortlist([...newList]); };

  const handleSubmitInquiry = async (e: React.FormEvent) => {
    e.preventDefault(); setIsSubmitting(true);
    try { await saveFeedback({ userId: user.id, name: user.name, email: user.email, phone: user.phone || 'N/A', university: user.university || 'N/A', ...newInquiry }); setShowInquiryForm(false); setNewInquiry({ targetUniversity: '', message: '', budget: '', currentStatus: 'NEET Aspirant' }); fetchFeedbackAndNotifications(); if (onInquirySubmitted) onInquirySubmitted(); } catch (err) { alert('Failed to submit inquiry'); } finally { setIsSubmitting(false); }
  };

  const handleSaveSecurityQuestion = async () => {
    if (!recoveryData.answer.trim()) return;
    try { const updatedUser = { ...user, recoveryQuestion: recoveryData.question, recoveryAnswer: recoveryData.answer }; await updateUser(updatedUser); setShowSecurityPrompt(false); alert("Recovery question saved!"); } catch (e) { alert("Failed to save security question."); }
  };

  const handleCheckEligibility = async () => { setCheckingEligibility(true); try { const result = await checkEligibility(eligibilityForm); setEligibilityResult(result); await updateUserEligibility(user.id, eligibilityForm, result); } catch (e) { alert("Failed check"); } finally { setCheckingEligibility(false); } };
  const handleProfileUpdate = async (e: React.FormEvent) => { e.preventDefault(); setIsUpdatingProfile(true); await new Promise(r => setTimeout(r, 600)); try { const updatedUser = { ...user, ...profileData, avatar }; await updateUser(updatedUser); setIsUpdatingProfile(false); alert('Profile updated!'); } catch (e) { setIsUpdatingProfile(false); } };
  const handleSettingsSave = async () => { setSavingSettings(true); await new Promise(r => setTimeout(r, 800)); if (passData.new && passData.new !== passData.confirm) { alert("Passwords do not match!"); setSavingSettings(false); return; } setPassData({ current: '', new: '', confirm: '' }); setSavingSettings(false); alert("Settings updated!"); };
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (file) { if (file.size > 2 * 1024 * 1024) { alert("Image too large"); return; } const reader = new FileReader(); reader.onloadend = () => setAvatar(reader.result as string); reader.readAsDataURL(file); } };
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: any) => { const file = e.target.files?.[0]; if (!file) return; if (file.size > 5 * 1024 * 1024) { alert("Max 5MB"); return; } setUploadingDoc(type); try { const uploadData = await uploadFileToCloudinary(file); const metaData: DocumentMetadata = { url: uploadData.secure_url, publicId: uploadData.public_id, status: 'uploaded', uploadedAt: Date.now() }; await updateUserDocuments(user.id, type, metaData); if (!user.documents) user.documents = {}; user.documents[type] = metaData; alert(`Uploaded!`); } catch (err: any) { alert(`Failed: ${err.message}`); } finally { setUploadingDoc(null); } };

  const handleStartNewChat = async () => { if (!studentChatMsg.trim() && !studentChatAttachment) return; setIsSendingChat(true); try { const newChat = await createDirectChat(user.id, user.name, user.email, studentChatMsg.trim(), studentChatAttachment || undefined); setStudentChats(prev => [newChat, ...prev]); setActiveStudentChat(newChat); setStudentChatMsg(''); setStudentChatAttachment(null); } catch (e) { alert('Failed to start chat'); } finally { setIsSendingChat(false); } };
  const handleSendStudentMsg = async () => { if (!activeStudentChat || (!studentChatMsg.trim() && !studentChatAttachment)) return; setIsSendingChat(true); try { const updated = await sendDirectMessage(activeStudentChat.id, user.id, user.name, 'student', studentChatMsg.trim(), studentChatAttachment || undefined); if (updated) { setStudentChats(prev => prev.map(c => c.id === updated.id ? updated : c)); setActiveStudentChat(updated); } setStudentChatMsg(''); setStudentChatAttachment(null); } catch (e) { alert('Failed to send'); } finally { setIsSendingChat(false); } };
  const handleStudentChatFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (!file) return; if (file.size > 5 * 1024 * 1024) { alert('Max 5MB'); return; } const reader = new FileReader(); reader.onloadend = () => { setStudentChatAttachment({ name: file.name, type: file.type, data: reader.result as string }); }; reader.readAsDataURL(file); };

  const inputCls = "w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-1 focus:ring-[#0f172a] focus:border-[#0f172a] text-slate-800";
  const labelCls = "text-xs font-bold text-slate-500 mb-1.5 block tracking-wide";
  const cardCls = "bg-white rounded-[24px] shadow-sm border border-slate-200";

  const allCities = Array.from(new Set(RUSSIAN_UNIVERSITIES.map(u => getUniversityData(u).location))).sort();
  const handleCityToggle = (city: string) => setCityFilter(prev => prev.includes(city) ? prev.filter(c => c !== city) : [...prev, city]);

  const filteredUnis = RUSSIAN_UNIVERSITIES.filter(uniName => {
    const data = getUniversityData(uniName);
    if (budgetFilter === '<300k' && data.tuition_fee_rub >= 300000) return false;
    if (budgetFilter === '300k-500k' && (data.tuition_fee_rub < 300000 || data.tuition_fee_rub > 500000)) return false;
    if (budgetFilter === '500k-700k' && (data.tuition_fee_rub < 500000 || data.tuition_fee_rub > 700000)) return false;
    if (budgetFilter === '>700k' && data.tuition_fee_rub <= 700000) return false;

    if (cityFilter.length > 0 && !cityFilter.includes(data.location)) return false;

    return true;
  });
  
  // Custom scrollbar classes added in global css (assumed) or just use standard
  return (
    <div className="flex h-screen bg-[#f8fafc] font-sans overflow-hidden">
      
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 h-full">
        <div className="h-24 flex flex-col justify-center px-6 border-b border-slate-100 shrink-0 cursor-pointer" onClick={() => navigate('/')}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#0B1A30] rounded flex items-center justify-center text-white font-bold text-sm shadow-sm">M</div>
            <div>
              <h1 className="font-bold text-[#0B1A30] text-lg leading-tight">MBBS Russia</h1>
              <p className="text-[10px] font-semibold text-slate-500 tracking-wider">MEDICAL ADMISSIONS</p>
            </div>
          </div>
        </div>
        
        <div className="px-4 py-6 border-b border-slate-100">
          <button onClick={() => { setActiveView('inquiries'); setShowInquiryForm(true); }} className="w-full py-3 bg-[#c2842a] hover:bg-[#a16b1e] text-white rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors shadow-sm">
            <span className="material-symbols-outlined text-[20px]">add</span> New Inquiry
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {ALL_TABS.map(tab => {
            const isActive = activeView === tab.id;
            return (
              <button 
                key={tab.id} 
                onClick={() => setActiveView(tab.id as any)} 
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive 
                    ? 'bg-slate-100 text-[#0f172a] font-semibold relative after:absolute after:left-0 after:top-1/2 after:-translate-y-1/2 after:h-6 after:w-1 after:bg-[#0f172a] after:rounded-r-full' 
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">{tab.icon}</span>{tab.label}
              </button>
            )
          })}
        </div>

        <div className="p-4 border-t border-slate-200 space-y-2">
          <PlatformFeedbackModal trigger={<button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors"><span className="material-symbols-outlined text-[18px]">chat_bubble_outline</span>Help Improve</button>} />
          <button onClick={onLogout} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"><span className="material-symbols-outlined text-[18px]">logout</span>Sign Out</button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Top Header */}
        <header className="h-20 bg-white flex items-center justify-between px-6 shrink-0 md:px-10 z-20">
          <div className="hidden md:block">
            <h2 className="text-xl font-bold text-[#0f172a]">
              {activeView === 'inquiries' && `Welcome, ${user.name.split(' ')[0]}`}
              {activeView === 'explorer' && 'University Explorer'}
              {activeView === 'budget' && 'Budget Calc'}
              {activeView === 'chats' && 'Communications'}
              {activeView === 'eligibility' && 'Eligibility Checker'}
              {activeView === 'documents' && 'Application Checklist'}
              {activeView === 'profile' && 'Profile'}
              {activeView === 'settings' && 'Settings'}
              {activeView === 'help' && 'Help Center'}
            </h2>
            {activeView === 'inquiries' && <p className="text-sm text-slate-500">Manage your university inquiries and applications.</p>}
          </div>
          
          <div className="flex items-center gap-4 ml-auto">
             <button onClick={() => setShowNotifications(!showNotifications)} className="relative p-2 text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
              <span className="material-symbols-outlined text-[24px]">notifications_none</span>
              {notifications.length > 0 && <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full"></span>}
            </button>
            <button onClick={() => setActiveView('profile' as any)} className="w-10 h-10 rounded-full overflow-hidden bg-[#0f172a] text-white flex items-center justify-center font-bold cursor-pointer hover:ring-2 hover:ring-slate-300 transition-all">
               {avatar ? <img src={avatar} className="w-full h-full object-cover" alt="Avatar" /> : user.name.charAt(0)}
            </button>
          </div>
        </header>

        {/* Scrollable Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          
          {/* INQUIRIES TAB */}
          {activeView === 'inquiries' && (
            <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-8">
              {/* Left Column (Form) */}
              <div className="w-full lg:w-80 shrink-0">
                <div className={`${cardCls} p-5 sticky top-0`}>
                  <h3 className="font-semibold text-[#0f172a] mb-4 flex items-center gap-2"><span className="material-symbols-outlined text-amber-600 text-[20px]">edit_document</span> Draft Inquiry</h3>
                  <form onSubmit={handleSubmitInquiry} className="space-y-4">
                    <div>
                      <label className={labelCls}>Target Institution</label>
                      <select className={inputCls} value={newInquiry.targetUniversity} onChange={e => setNewInquiry({ ...newInquiry, targetUniversity: e.target.value })} required>
                        <option value="">General Inquiry</option>
                        {RUSSIAN_UNIVERSITIES.map(u => <option key={u} value={u}>{u}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>Topic</label>
                      <select className={inputCls} value={newInquiry.budget} onChange={e => setNewInquiry({ ...newInquiry, budget: e.target.value })}>
                        <option value="Admission Requirements">Admission Requirements</option>
                        <option value="Fee Structure">Fee Structure</option>
                        <option value="Hostel Facilities">Hostel Facilities</option>
                        <option value="Visa Process">Visa Process</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>Your Question</label>
                      <textarea className={`${inputCls} min-h-[120px] resize-none`} placeholder="Detail your query here..." value={newInquiry.message} onChange={e => setNewInquiry({ ...newInquiry, message: e.target.value })} required />
                    </div>
                    <button type="submit" disabled={isSubmitting} className="w-full bg-[#0f172a] text-white py-3 rounded-lg font-semibold hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 shadow-sm text-sm">
                      {isSubmitting ? 'Submitting...' : 'Submit Inquiry'} <span className="material-symbols-outlined text-[16px]">send</span>
                    </button>
                  </form>
                </div>
                
                <div className={`${cardCls} p-5 mt-6`}>
                  <h3 className="font-semibold text-[#0f172a] mb-3 text-sm flex items-center gap-2"><span className="material-symbols-outlined text-slate-400 text-[18px]">menu_book</span> Quick Resources</h3>
                  <ul className="space-y-2 text-sm text-slate-600">
                    <li className="hover:text-[#0f172a] cursor-pointer">› MBBS in Russia Guide 2024</li>
                    <li className="hover:text-[#0f172a] cursor-pointer">› Document Legalization Steps</li>
                    <li className="hover:text-[#0f172a] cursor-pointer">› MCI/NMC Approval Process</li>
                  </ul>
                </div>
              </div>

              {/* Right Column (List) */}
              <div className="flex-1 space-y-6">
                 {/* Filters/Tabs */}
                 <div className="flex items-center gap-3">
                   <button className="px-5 py-2 bg-[#0f172a] text-white rounded-full text-sm font-medium shadow-sm">All ({entries.length})</button>
                   <button className="px-5 py-2 bg-white border border-slate-200 text-slate-600 rounded-full text-sm font-medium hover:bg-slate-50">Pending (0)</button>
                   <button className="px-5 py-2 bg-white border border-slate-200 text-slate-600 rounded-full text-sm font-medium hover:bg-slate-50">Resolved (0)</button>
                   <div className="ml-auto relative">
                     <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-[18px]">search</span>
                     <input type="text" placeholder="Search ID or Keyword..." className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm w-64 focus:outline-none focus:border-slate-400" />
                   </div>
                 </div>

                 {entries.length === 0 && !loading && (
                   <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 text-slate-500">No inquiries yet.</div>
                 )}

                 {entries.map(entry => (
                   <div key={entry.id} className={`${cardCls} overflow-hidden border-l-4 ${entry.status === 'pending' ? 'border-l-amber-500' : 'border-l-slate-300'}`}>
                     <div className="p-6">
                       <div className="flex items-center gap-3 mb-4">
                         <span className={`px-2.5 py-1 text-xs font-semibold rounded ${getStatusLabel(entry.status).cls}`}>{getStatusLabel(entry.status).label}</span>
                         <span className="text-slate-400 text-sm font-medium">#{entry.id.substring(0,4).toUpperCase()}</span>
                         <span className="text-slate-400 text-sm font-medium">• {new Date(entry.timestamp).toLocaleDateString()}</span>
                         <button className="ml-auto text-slate-400 hover:text-slate-600"><span className="material-symbols-outlined">more_horiz</span></button>
                       </div>
                       
                       <h4 className="text-lg font-bold text-[#0f172a] mb-3">{entry.targetUniversity || 'General Inquiry'}</h4>
                       <p className="text-slate-700 leading-relaxed mb-4">{entry.message}</p>
                       
                       {entry.replies && entry.replies.length > 0 ? (
                         <div className="bg-[#eef2ff] rounded-xl p-4 mt-4 relative">
                            <div className="flex items-center gap-2 mb-2 text-[#4f46e5] font-semibold text-sm">
                              <span className="material-symbols-outlined text-[18px]">support_agent</span> MedGuide Support Team
                              <span className="ml-auto font-normal text-indigo-400 text-xs">Recently</span>
                            </div>
                            <p className="text-[#3730a3] text-sm leading-relaxed">{entry.replies[entry.replies.length - 1].message}</p>
                         </div>
                       ) : (
                         <div className="bg-slate-100 rounded-xl p-4 mt-4 flex items-start gap-3">
                           <span className="material-symbols-outlined text-slate-400">schedule</span>
                           <div>
                             <p className="text-sm font-semibold text-slate-700">Awaiting Counselor Response</p>
                             <p className="text-sm text-slate-500 mt-1">Usually replies within 24-48 hours. Your query has been assigned to our experts.</p>
                           </div>
                         </div>
                       )}
                     </div>
                   </div>
                 ))}
              </div>
            </div>
          )}

          {/* CHATS TAB */}
          {activeView === 'chats' && (
            <div className="max-w-6xl mx-auto h-[calc(100vh-160px)] flex gap-6">
               <div className={`${cardCls} w-80 shrink-0 flex flex-col`}>
                  <div className="p-4 border-b border-slate-200">
                    <button onClick={() => setActiveStudentChat(null)} className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors text-sm">
                      <span className="material-symbols-outlined text-[18px]">edit_square</span> New Chat
                    </button>
                  </div>
                  <div className="p-3 border-b border-slate-200">
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-[18px]">search</span>
                      <input type="text" placeholder="Search contacts..." className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-slate-300" />
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    {studentChats.map(chat => (
                      <div key={chat.id} onClick={() => setActiveStudentChat(chat)} className={`flex items-start gap-3 p-4 cursor-pointer hover:bg-slate-50 transition-colors border-l-2 ${activeStudentChat?.id === chat.id ? 'bg-slate-50 border-[#0f172a]' : 'border-transparent'}`}>
                         <div className="relative w-10 h-10 shrink-0">
                           <img src="https://ui-avatars.com/api/?name=Counselor&background=0D8ABC&color=fff" className="w-full h-full rounded-full object-cover" alt="Avatar" />
                           <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                         </div>
                         <div className="flex-1 min-w-0">
                           <div className="flex justify-between items-baseline mb-0.5">
                             <h4 className="text-sm font-semibold text-slate-900 truncate">Admission Counselor</h4>
                             <span className="text-xs text-slate-400">10:42 AM</span>
                           </div>
                           <p className="text-xs text-slate-500 truncate">{chat.messages[chat.messages.length - 1]?.text || 'No messages'}</p>
                         </div>
                      </div>
                    ))}
                  </div>
               </div>
               
               <div className={`${cardCls} flex-1 flex flex-col`}>
                  {activeStudentChat ? (
                    <>
                      <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-white rounded-t-2xl">
                         <div className="flex items-center gap-3">
                           <div className="relative w-10 h-10">
                             <img src="https://ui-avatars.com/api/?name=Counselor&background=0D8ABC&color=fff" className="w-full h-full rounded-full object-cover" alt="Avatar" />
                             <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                           </div>
                           <div>
                             <h3 className="font-bold text-slate-900 text-sm">Admission Counselor</h3>
                             <p className="text-xs text-green-600 font-medium flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block"></span> Active Now</p>
                           </div>
                         </div>
                         <div className="flex gap-2">
                           <button className="p-2 text-slate-400 hover:text-slate-600"><span className="material-symbols-outlined">calendar_today</span></button>
                           <button className="p-2 text-slate-400 hover:text-slate-600"><span className="material-symbols-outlined">more_vert</span></button>
                         </div>
                      </div>
                      
                      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
                        <div className="text-center"><span className="bg-slate-200 text-slate-600 text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">Today, 10:15 AM</span></div>
                        {activeStudentChat.messages.map((msg, i) => {
                          const isStudent = msg.senderRole === 'student';
                          return (
                            <div key={msg.id} className={`flex gap-3 max-w-[80%] ${isStudent ? 'ml-auto flex-row-reverse' : ''}`}>
                              {!isStudent && <img src="https://ui-avatars.com/api/?name=Counselor&background=0D8ABC&color=fff" className="w-8 h-8 rounded-full shrink-0" alt="Avatar" />}
                              <div>
                                <div className={`p-4 rounded-2xl text-sm ${isStudent ? 'bg-[#0f172a] text-white rounded-tr-sm' : 'bg-slate-200 text-slate-800 rounded-tl-sm'}`}>
                                  {msg.text}
                                  {msg.attachment && (
                                    <div className="mt-3 bg-white/10 rounded-lg p-3 flex items-center gap-3 border border-white/20 cursor-pointer">
                                       <span className="material-symbols-outlined">picture_as_pdf</span>
                                       <div>
                                         <p className="font-medium text-sm truncate w-40">{msg.attachment.name}</p>
                                         <p className="text-xs opacity-70">1.2 MB</p>
                                       </div>
                                    </div>
                                  )}
                                </div>
                                <div className={`text-[10px] text-slate-400 mt-1 ${isStudent ? 'text-right' : ''}`}>
                                  {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                  {isStudent && <span className="material-symbols-outlined text-[14px] align-middle ml-1">done_all</span>}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>

                      <div className="p-4 bg-white rounded-b-2xl">
                        <div className="border border-slate-200 rounded-xl bg-slate-50 flex items-center p-2 focus-within:border-slate-400 transition-colors">
                          <label className="p-2 text-slate-400 hover:text-slate-600 cursor-pointer">
                            <span className="material-symbols-outlined">attach_file</span>
                            <input type="file" className="hidden" onChange={handleStudentChatFileUpload} />
                          </label>
                          <input type="text" className="flex-1 bg-transparent border-none outline-none text-sm px-2 text-slate-800" placeholder="Type your message..." value={studentChatMsg} onChange={e => setStudentChatMsg(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSendStudentMsg()} />
                          <button onClick={handleSendStudentMsg} className="bg-[#0f172a] text-white w-10 h-10 rounded-lg flex items-center justify-center hover:bg-slate-800 transition-colors">
                            <span className="material-symbols-outlined text-[20px]">send</span>
                          </button>
                        </div>
                        <p className="text-center text-[10px] text-slate-400 mt-3 font-medium">Press Enter to send, Shift+Enter for new line. Communications are securely encrypted.</p>
                      </div>
                    </>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-slate-50/50">
                      <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4">
                        <span className="material-symbols-outlined text-[32px]">support_agent</span>
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 mb-2">How can we help you today?</h3>
                      <p className="text-slate-500 mb-8 max-w-sm">Start a new conversation with our admission counselors to get answers to your questions.</p>
                      
                      <div className="w-full max-w-lg bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
                        <div className="border border-slate-200 rounded-xl bg-slate-50 flex items-center p-2 focus-within:border-slate-400 transition-colors">
                          <label className="p-2 text-slate-400 hover:text-slate-600 cursor-pointer">
                            <span className="material-symbols-outlined">attach_file</span>
                            <input type="file" className="hidden" onChange={handleStudentChatFileUpload} />
                          </label>
                          <input type="text" className="flex-1 bg-transparent border-none outline-none text-sm px-2 text-slate-800" placeholder="Type your message to start a new chat..." value={studentChatMsg} onChange={e => setStudentChatMsg(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleStartNewChat()} />
                          <button onClick={handleStartNewChat} className="bg-[#0f172a] text-white w-10 h-10 rounded-lg flex items-center justify-center hover:bg-slate-800 transition-colors">
                            <span className="material-symbols-outlined text-[20px]">send</span>
                          </button>
                        </div>
                        {studentChatAttachment && (
                          <div className="mt-3 text-left bg-blue-50 text-blue-700 text-xs px-3 py-1.5 rounded-lg inline-flex items-center gap-2">
                             <span className="material-symbols-outlined text-[14px]">attach_file</span> {studentChatAttachment.name}
                             <button onClick={() => setStudentChatAttachment(null)} className="hover:text-blue-900 ml-1"><span className="material-symbols-outlined text-[14px]">close</span></button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
               </div>
            </div>
          )}

          {/* UNI EXPLORER TAB */}
          {activeView === 'explorer' && (
             <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-10">
                {/* Filters sidebar */}
                <div className="w-full md:w-56 shrink-0 space-y-8">
                   <div className="flex justify-between items-center">
                     <h3 className="font-bold text-slate-900 text-base">Filters</h3>
                     <button onClick={() => { setBudgetFilter('all'); setCityFilter([]); }} className="text-xs text-amber-600 font-bold hover:text-amber-700">Clear All</button>
                   </div>
                   
                   <div>
                     <h4 className="font-bold text-slate-800 text-sm mb-4">Annual Budget (RUB)</h4>
                     <div className="space-y-3 text-sm text-slate-600">
                       <label className="flex items-center gap-3 cursor-pointer"><input type="radio" name="b" checked={budgetFilter === 'all'} onChange={() => setBudgetFilter('all')} className="w-4 h-4 text-purple-600 focus:ring-purple-600 accent-purple-600" /> <span className={budgetFilter === 'all' ? 'font-medium text-slate-900' : ''}>Any Budget</span></label>
                       <label className="flex items-center gap-3 cursor-pointer"><input type="radio" name="b" checked={budgetFilter === '<300k'} onChange={() => setBudgetFilter('<300k')} className="w-4 h-4 text-purple-600 focus:ring-purple-600 accent-purple-600" /> <span className={budgetFilter === '<300k' ? 'font-medium text-slate-900' : ''}>&lt; 300,000 ₽</span></label>
                       <label className="flex items-center gap-3 cursor-pointer"><input type="radio" name="b" checked={budgetFilter === '300k-500k'} onChange={() => setBudgetFilter('300k-500k')} className="w-4 h-4 text-purple-600 focus:ring-purple-600 accent-purple-600" /> <span className={budgetFilter === '300k-500k' ? 'font-medium text-slate-900' : ''}>300k - 500k ₽</span></label>
                       <label className="flex items-center gap-3 cursor-pointer"><input type="radio" name="b" checked={budgetFilter === '500k-700k'} onChange={() => setBudgetFilter('500k-700k')} className="w-4 h-4 text-purple-600 focus:ring-purple-600 accent-purple-600" /> <span className={budgetFilter === '500k-700k' ? 'font-medium text-slate-900' : ''}>500k - 700k ₽</span></label>
                       <label className="flex items-center gap-3 cursor-pointer"><input type="radio" name="b" checked={budgetFilter === '>700k'} onChange={() => setBudgetFilter('>700k')} className="w-4 h-4 text-purple-600 focus:ring-purple-600 accent-purple-600" /> <span className={budgetFilter === '>700k' ? 'font-medium text-slate-900' : ''}>&gt; 700,000 ₽</span></label>
                     </div>
                   </div>

                   <div>
                     <h4 className="font-bold text-slate-800 text-sm mb-4">City</h4>
                     <div className="relative mb-3">
                       <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-[18px]">search</span>
                       <input type="text" placeholder="Search cities..." value={citySearch} onChange={e => setCitySearch(e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-xl py-2.5 pl-9 pr-3 text-sm focus:ring-1 focus:ring-slate-300 outline-none" />
                     </div>
                     <div className="space-y-3 text-sm text-slate-600 max-h-48 overflow-y-auto pr-2">
                       {allCities.filter(c => c.toLowerCase().includes(citySearch.toLowerCase())).map(city => (
                         <label key={city} className="flex items-center gap-3 justify-between cursor-pointer">
                           <div className="flex items-center gap-3">
                             <input type="checkbox" checked={cityFilter.includes(city)} onChange={() => handleCityToggle(city)} className="w-4 h-4 rounded text-purple-600 focus:ring-purple-600 accent-purple-600" /> 
                             <span className={cityFilter.includes(city) ? 'font-medium text-slate-900' : ''}>{city}</span>
                           </div>
                           <span className="text-slate-400">{RUSSIAN_UNIVERSITIES.filter(u => getUniversityData(u).location === city).length}</span>
                         </label>
                       ))}
                     </div>
                   </div>
                </div>

                {/* Results Grid */}
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h3 className="font-bold text-slate-900 text-lg">Discover Universities</h3>
                      <p className="text-sm text-slate-500 mt-1">Showing {filteredUnis.length} institutions matching your criteria.</p>
                    </div>
                    <div className="flex gap-2 flex-wrap justify-end max-w-sm">
                       {budgetFilter !== 'all' && <span className="bg-slate-100 text-slate-700 px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1">{budgetFilter} <button onClick={() => setBudgetFilter('all')} className="material-symbols-outlined text-[14px]">close</button></span>}
                       {cityFilter.map(c => <span key={c} className="bg-slate-100 text-slate-700 px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1">{c} <button onClick={() => handleCityToggle(c)} className="material-symbols-outlined text-[14px]">close</button></span>)}
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredUnis.map((uniName, idx) => {
                       const data = getUniversityData(uniName);
                       const isShortlisted = shortlist.includes(uniName);
                       return (
                         <div key={idx} className="bg-white rounded-[24px] border border-slate-200 overflow-hidden flex flex-col group shadow-sm">
                           <div className="h-44 bg-gradient-to-br from-slate-700 to-slate-900 relative">
                              {/* Overlay for realism */}
                              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPjxyZWN0IHdpZHRoPSI0IiBoZWlnaHQ9IjQiIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSIvPjwvc3ZnPg==')] opacity-30 mix-blend-overlay"></div>
                              <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-lg text-[11px] font-bold text-slate-900 flex items-center gap-1">
                                <span className="material-symbols-outlined text-[14px]">star</span> #{idx + 1} Ranked
                              </div>
                              <button onClick={() => handleToggleShortlist(uniName)} className={`absolute top-3 right-3 w-8 h-8 ${isShortlisted ? 'bg-red-500 text-white' : 'bg-black/20 text-white'} backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white hover:text-red-500 transition-colors`}>
                                <span className="material-symbols-outlined text-[18px]">{isShortlisted ? 'favorite' : 'favorite_border'}</span>
                              </button>
                              <div className="absolute bottom-3 left-3 text-white text-xs font-semibold flex items-center gap-1 drop-shadow-md">
                                <span className="material-symbols-outlined text-[14px]">location_on</span> {data.location}
                              </div>
                           </div>
                           <div className="p-5 flex-1 flex flex-col bg-white">
                             <h4 className="font-bold text-[#0f172a] text-[15px] leading-tight mb-2">{data.name}</h4>
                             <p className="text-[13px] text-slate-500 mb-5 line-clamp-2 leading-relaxed">Leading medical university recognized globally for extensive clinical training.</p>
                             
                             <div className="grid grid-cols-2 gap-4 mb-6 mt-auto">
                               <div>
                                 <span className="text-[10px] font-bold text-slate-400 block mb-0.5 tracking-wider">TUITION/HOSTEL/YEAR</span>
                                 <span className="font-bold text-slate-900 text-sm">{data.tuition_fee_rub.toLocaleString()} ₽</span>
                                 <span className="text-xs text-slate-500 ml-1">~60k ₽</span>
                               </div>
                               <div>
                                 <span className="text-[10px] font-bold text-slate-400 block mb-0.5 tracking-wider">INSTRUCTION/DURATION</span>
                                 <span className="font-bold text-emerald-600 text-sm">English Fully</span>
                                 <span className="text-xs text-slate-500 block">6 Years</span>
                               </div>
                             </div>
                             
                             <div className="flex gap-2">
                               <button className="flex-1 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl text-sm hover:bg-slate-50 transition-colors">Details</button>
                               <button onClick={() => handleToggleShortlist(uniName)} className={`flex-1 py-2.5 ${isShortlisted ? 'bg-slate-200 text-slate-700' : 'bg-[#0f172a] text-white'} font-bold rounded-xl text-sm hover:bg-slate-800 transition-colors`}>
                                 {isShortlisted ? 'Shortlisted' : 'Shortlist'}
                               </button>
                             </div>
                           </div>
                         </div>
                       )
                    })}
                  </div>
                </div>
             </div>
          )}

          {/* BUDGET CALCULATOR TAB */}
          {activeView === 'budget' && (
             <div className="max-w-6xl mx-auto">
                <div className="mb-8">
                   <h2 className="text-2xl font-bold text-slate-900">Estimate Your Journey</h2>
                   <p className="text-slate-500 mt-2 text-sm">Use this calculator to project your 6-year expenses including tuition, accommodation, and daily living in Russia.</p>
                </div>
                <BudgetCalculator apiKey={settings?.currencyConverter?.apiKey} />
             </div>
          )}

          {/* ELIGIBILITY CHECKER TAB */}
          {activeView === 'eligibility' && (
             <div className="max-w-3xl mx-auto">
               <div className="text-center mb-10">
                 <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                   <span className="material-symbols-outlined text-[24px]">verified_user</span>
                 </div>
                 <h2 className="text-3xl font-bold text-slate-900 mb-3">Check Your Eligibility</h2>
                 <p className="text-slate-500 text-[15px] max-w-lg mx-auto">Enter your academic details below to instantly verify your qualification for leading Russian medical universities and discover your options.</p>
               </div>
               
               <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm p-8 mb-8">
                  <div className="grid md:grid-cols-2 gap-x-8 gap-y-6">
                     <div>
                       <label className="text-xs font-bold text-slate-500 mb-1.5 block tracking-wide">12th PCB % <span className="text-red-500">*</span></label>
                       <div className="relative">
                         <input type="number" value={eligibilityForm.pcbPercentage} onChange={e => setEligibilityForm({...eligibilityForm, pcbPercentage: e.target.value})} className="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-1 focus:ring-[#0f172a] focus:border-[#0f172a] text-slate-800 pr-12 transition-shadow" placeholder="e.g. 75.5" />
                         <span className="absolute right-3 top-3 bottom-3 flex items-center justify-center bg-slate-100 text-slate-400 font-bold px-3 rounded-xl">%</span>
                       </div>
                     </div>
                     <div>
                       <label className="text-xs font-bold text-slate-500 mb-1.5 block tracking-wide">NEET Score <span className="text-red-500">*</span></label>
                       <div className="relative">
                         <input type="number" value={eligibilityForm.neetScore} onChange={e => setEligibilityForm({...eligibilityForm, neetScore: e.target.value})} className="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-1 focus:ring-[#0f172a] focus:border-[#0f172a] text-slate-800 pr-12 transition-shadow" placeholder="e.g. 450" />
                         <span className="material-symbols-outlined absolute right-3 top-3 bottom-3 flex items-center justify-center text-slate-400 bg-slate-100 px-2 rounded-xl">school</span>
                       </div>
                     </div>
                     <div>
                       <label className="text-xs font-bold text-slate-500 mb-1.5 block tracking-wide">Application Category <span className="text-red-500">*</span></label>
                       <select value={eligibilityForm.category} onChange={e => setEligibilityForm({...eligibilityForm, category: e.target.value as 'General' | 'Reserved'})} className="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-1 focus:ring-[#0f172a] focus:border-[#0f172a] text-slate-800 appearance-none cursor-pointer transition-shadow" style={{ backgroundImage: 'url(\'data:image/svg+xml;utf8,<svg fill="none" stroke="%2394a3b8" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="m6 9 6 6 6-6"/></svg>\')', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1.25rem center', backgroundSize: '1.2em' }}><option>General</option><option>Reserved</option></select>
                     </div>
                     <div>
                       <label className="text-xs font-bold text-slate-500 mb-1.5 block tracking-wide">Passport Status <span className="text-red-500">*</span></label>
                       <select value={eligibilityForm.passportStatus} onChange={e => setEligibilityForm({...eligibilityForm, passportStatus: e.target.value as any})} className="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-1 focus:ring-[#0f172a] focus:border-[#0f172a] text-slate-800 appearance-none cursor-pointer transition-shadow" style={{ backgroundImage: 'url(\'data:image/svg+xml;utf8,<svg fill="none" stroke="%2394a3b8" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="m6 9 6 6 6-6"/></svg>\')', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1.25rem center', backgroundSize: '1.2em' }}><option>Have</option><option>Applied</option><option>No</option></select>
                     </div>
                  </div>
                  <button onClick={handleCheckEligibility} disabled={checkingEligibility} className="w-full mt-8 py-4 bg-[#0f172a] text-white font-bold rounded-2xl text-[15px] hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 shadow-md">
                    {checkingEligibility ? <span className="animate-spin material-symbols-outlined text-[20px]">refresh</span> : <span className="material-symbols-outlined text-[20px]">analytics</span>} 
                    {checkingEligibility ? 'Analyzing...' : 'Analyze Eligibility'}
                  </button>
               </div>

               <div className="bg-slate-50/50 border border-slate-200 border-dashed rounded-3xl p-8 text-center text-slate-500">
                  {eligibilityResult ? (
                    <>
                      <div className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full inline-block mb-4 ${getEligibilityStatus(eligibilityResult) === 'eligible' ? 'bg-emerald-200 text-emerald-800' : getEligibilityStatus(eligibilityResult) === 'borderline' ? 'bg-amber-200 text-amber-800' : 'bg-red-200 text-red-800'}`}>STATUS: {getEligibilityStatus(eligibilityResult)}</div>
                      <h3 className="text-lg font-bold text-slate-800 mb-2">Analysis Complete</h3>
                      <p className="text-[13px] max-w-sm mx-auto leading-relaxed">{eligibilityResult}</p>
                    </>
                  ) : (
                    <>
                      <div className="bg-slate-200 text-slate-600 text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full inline-block mb-4">STATUS: PENDING ANALYSIS</div>
                      <h3 className="text-lg font-bold text-slate-800 mb-2">Awaiting Input</h3>
                      <p className="text-[13px] max-w-sm mx-auto leading-relaxed">Fill out your academic details above and click 'Analyze Eligibility' to generate your personalized report and view university recommendations.</p>
                    </>
                  )}
               </div>
             </div>
          )}

           {/* CHECKLIST TAB */}
          {activeView === 'documents' && (
             <div className="max-w-4xl mx-auto">
               <h2 className="text-2xl font-bold text-slate-900 mb-2">Required Documents for Admission</h2>
               <p className="text-slate-500 mb-8 text-sm">Please upload clear, scanned copies of the following documents. These are essential for initiating your university admission process and visa application.</p>
               
               <div className={`${cardCls} p-6 flex justify-between items-center mb-8`}>
                 <div className="flex-1 pr-12">
                   <div className="flex justify-between mb-2"><span className="text-sm font-bold text-slate-900">Document Completion</span><span className="text-lg font-bold text-[#0f172a]">{Math.round((['marksheet', 'passport', 'neetScoreCard'].filter(id => user.documents?.[id]?.status).length / 3) * 100)}%</span></div>
                   <div className="h-2 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-[#0f172a] transition-all" style={{ width: `${Math.round((['marksheet', 'passport', 'neetScoreCard'].filter(id => user.documents?.[id]?.status).length / 3) * 100)}%` }}></div></div>
                 </div>
                 <div className="flex gap-8 border-l border-slate-200 pl-8 text-center">
                   <div><div className="text-2xl font-bold text-slate-900">{['marksheet', 'passport', 'neetScoreCard'].filter(id => user.documents?.[id]?.status).length}</div><div className="text-[10px] font-bold text-slate-500 tracking-wider">COMPLETED</div></div>
                   <div><div className="text-2xl font-bold text-red-600">{3 - ['marksheet', 'passport', 'neetScoreCard'].filter(id => user.documents?.[id]?.status).length}</div><div className="text-[10px] font-bold text-slate-500 tracking-wider">PENDING</div></div>
                 </div>
               </div>

               <div className="space-y-6">
                 {[
                    { id: 'marksheet', title: '10th/12th Marksheet', desc: 'Combined PDF or separate high-resolution images of both marksheets.' },
                    { id: 'passport', title: 'Passport Copy', desc: 'Scanned copy of the first and last page. Must be valid for at least 18 months.' },
                    { id: 'neetScoreCard', title: 'NEET Scorecard', desc: 'Official scorecard downloaded from the NTA website indicating qualification status.' }
                 ].map(doc => {
                    const docData = user.documents?.[doc.id];
                    const isUploaded = !!docData;
                    const isVerified = docData?.status === 'verified';
                    
                    return (
                       <div key={doc.id} className={`${cardCls} overflow-hidden border-l-4 ${isVerified ? 'border-l-emerald-500' : isUploaded ? 'border-l-blue-500' : 'border-l-amber-500 border border-amber-400 shadow-md relative'}`}>
                         {!isUploaded && <div className="absolute top-0 left-0 w-1 h-full bg-amber-500"></div>}
                         <div className="p-6">
                            <div className="mb-4 flex justify-between items-start">
                              <div>
                                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-3">{doc.title} 
                                   {isVerified ? <span className="bg-emerald-100 text-emerald-700 text-xs px-2.5 py-0.5 rounded-full flex items-center gap-1 font-semibold"><span className="material-symbols-outlined text-[14px]">check_circle</span> Verified</span>
                                   : isUploaded ? <span className="bg-blue-100 text-blue-700 text-xs px-2.5 py-0.5 rounded-full flex items-center gap-1 font-semibold"><span className="material-symbols-outlined text-[14px]">cloud_done</span> Uploaded</span>
                                   : <span className="bg-amber-100 text-amber-800 text-xs px-2.5 py-0.5 rounded-full flex items-center gap-1 font-semibold"><span className="material-symbols-outlined text-[14px]">pending_actions</span> Pending</span>}
                                </h3>
                                <p className="text-slate-500 text-sm mt-1">{doc.desc}</p>
                              </div>
                              {isUploaded && (
                                <div className="flex gap-3">
                                   <a href={docData.url} target="_blank" rel="noreferrer" className="text-sm font-semibold text-slate-700 flex items-center gap-1 hover:text-[#0f172a]"><span className="material-symbols-outlined text-[18px]">visibility</span> View</a>
                                   <label className="text-sm font-semibold text-slate-700 flex items-center gap-1 hover:text-[#0f172a] cursor-pointer"><span className="material-symbols-outlined text-[18px]">sync</span> Replace
                                      <input type="file" className="hidden" onChange={e => handleFileUpload(e, doc.id)} />
                                   </label>
                                </div>
                              )}
                            </div>
                            
                            {isUploaded ? (
                              <div className="inline-flex items-center gap-3 p-2.5 border border-slate-200 rounded-lg bg-slate-50 text-sm max-w-sm w-full">
                                <span className="material-symbols-outlined text-slate-400">description</span>
                                <div className="flex-1 min-w-0"><p className="font-semibold text-slate-700 truncate">{docData.publicId?.split('/').pop() || 'Document'}</p><p className="text-xs text-slate-400">Uploaded {new Date(docData.uploadedAt || Date.now()).toLocaleDateString()}</p></div>
                              </div>
                            ) : (
                              <label className="block border-2 border-dashed border-slate-300 bg-slate-50/50 rounded-xl p-8 text-center cursor-pointer hover:bg-slate-50 transition-colors">
                                <div className="w-12 h-12 bg-slate-200 text-slate-600 rounded-full flex items-center justify-center mx-auto mb-3">
                                  {uploadingDoc === doc.id ? <span className="animate-spin material-symbols-outlined">refresh</span> : <span className="material-symbols-outlined">upload_file</span>}
                                </div>
                                <h4 className="font-bold text-slate-700 mb-1">{uploadingDoc === doc.id ? 'Uploading...' : 'Click to upload your file'}</h4>
                                <p className="text-xs text-slate-400">Supported formats: PDF, JPG, PNG (Max 5MB)</p>
                                <input type="file" className="hidden" onChange={e => handleFileUpload(e, doc.id)} disabled={uploadingDoc !== null} />
                              </label>
                            )}
                         </div>
                       </div>
                    );
                 })}
               </div>
             </div>
          )}

          {/* PROFILE TAB */}
          {activeView === 'profile' && (
             <div className="max-w-3xl mx-auto">
               <div className={`${cardCls} p-10`}>
                 <div className="flex flex-col items-center text-center pb-8 border-b border-slate-100 mb-8">
                   <div className="relative mb-4">
                     <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-lg bg-slate-200">
                        {avatar ? <img src={avatar} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-slate-400">{user.name.charAt(0)}</div>}
                     </div>
                     <button className="absolute bottom-1 right-1 w-10 h-10 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-600 shadow-sm hover:text-[#0f172a] hover:bg-slate-50">
                       <span className="material-symbols-outlined text-[20px]">photo_camera</span>
                     </button>
                   </div>
                   <h2 className="text-2xl font-bold text-[#0f172a]">{user.name}</h2>
                   <p className="text-slate-500">Prospective Medical Student</p>
                   <button className="mt-4 px-5 py-2 border border-slate-300 text-slate-700 font-semibold text-sm rounded-lg hover:bg-slate-50">Upload New Photo</button>
                 </div>
                 
                 <div className="grid md:grid-cols-2 gap-8">
                   <div>
                     <label className={labelCls}>Full Name</label>
                     <input type="text" className={inputCls} value={profileData.name} onChange={e => setProfileData({...profileData, name: e.target.value})} />
                   </div>
                   <div>
                     <label className={labelCls}>Phone Number</label>
                     <input type="text" className={inputCls} value={profileData.phone} onChange={e => setProfileData({...profileData, phone: e.target.value})} />
                   </div>
                   <div>
                     <label className={labelCls}>Email Address</label>
                     <input type="email" className={inputCls} value={user.email} disabled />
                   </div>
                   <div>
                     <label className={labelCls}>Current University/School</label>
                     <input type="text" className={inputCls} placeholder="Enter your current institution" value={profileData.university} onChange={e => setProfileData({...profileData, university: e.target.value})} />
                   </div>
                 </div>
                 
                 <div className="mt-10 flex justify-end pt-6 border-t border-slate-100">
                   <button className="px-8 py-3 bg-[#0f172a] text-white font-bold rounded-lg hover:bg-slate-800 shadow-md transition-colors text-sm">Save Profile</button>
                 </div>
               </div>
             </div>
          )}
          
          {/* SETTINGS TAB */}
          {activeView === 'settings' && (
            <div className="max-w-2xl mx-auto space-y-6">
              <div className={`${cardCls} p-8`}>
                <h2 className="text-2xl font-bold text-[#0f172a] mb-6">Security Settings</h2>
                <div className="space-y-4">
                  <div>
                    <label className={labelCls}>Current Password</label>
                    <input type="password" className={inputCls} placeholder="Enter current password" value={passData.current} onChange={e => setPassData({...passData, current: e.target.value})} />
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}>New Password</label>
                      <input type="password" className={inputCls} placeholder="Enter new password" value={passData.new} onChange={e => setPassData({...passData, new: e.target.value})} />
                    </div>
                    <div>
                      <label className={labelCls}>Confirm New Password</label>
                      <input type="password" className={inputCls} placeholder="Confirm new password" value={passData.confirm} onChange={e => setPassData({...passData, confirm: e.target.value})} />
                    </div>
                  </div>
                </div>
                <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end">
                  <button onClick={handleSettingsSave} disabled={savingSettings} className="px-6 py-2.5 bg-[#0f172a] text-white font-bold rounded-lg hover:bg-slate-800 disabled:opacity-70 text-sm">
                    {savingSettings ? 'Saving...' : 'Update Password'}
                  </button>
                </div>
              </div>

              <div className={`${cardCls} p-8`}>
                <h2 className="text-xl font-bold text-[#0f172a] mb-4">Security Question</h2>
                <p className="text-sm text-slate-500 mb-6">Set a security question to help recover your account if you lose access.</p>
                <div className="space-y-4">
                  <div>
                    <label className={labelCls}>Question</label>
                    <select className={inputCls} value={recoveryData.question} onChange={e => setRecoveryData({...recoveryData, question: e.target.value})}>
                      <option value="maiden">What is your mother's maiden name?</option>
                      <option value="pet">What was the name of your first pet?</option>
                      <option value="city">In what city were you born?</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Answer</label>
                    <input type="text" className={inputCls} placeholder="Your answer" value={recoveryData.answer} onChange={e => setRecoveryData({...recoveryData, answer: e.target.value})} />
                  </div>
                </div>
                <div className="mt-6">
                  <button onClick={handleSaveSecurityQuestion} className="px-6 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-lg hover:bg-slate-200 text-sm">Save Security Question</button>
                </div>
              </div>
            </div>
          )}

          {/* HELP CENTER TAB */}
          {activeView === 'help' && (
            <div className="max-w-4xl mx-auto space-y-6">
              <div className={`${cardCls} p-8 bg-gradient-to-r from-blue-600 to-[#0f172a] text-white`}>
                <h2 className="text-3xl font-bold mb-3">Help Center</h2>
                <p className="text-blue-100 max-w-lg leading-relaxed">Find answers to common questions about studying MBBS in Russia or contact our support team directly.</p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className={`${cardCls} p-6`}>
                  <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-4">
                    <span className="material-symbols-outlined">school</span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">Admission Process</h3>
                  <p className="text-sm text-slate-500 mb-4 line-clamp-3">Learn about the steps required to apply to top Russian medical universities, deadlines, and prerequisites.</p>
                  <a href="#" className="text-blue-600 text-sm font-semibold hover:underline">Read Guide &rarr;</a>
                </div>

                <div className={`${cardCls} p-6`}>
                  <div className="w-12 h-12 bg-green-50 text-green-600 rounded-xl flex items-center justify-center mb-4">
                    <span className="material-symbols-outlined">description</span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">Document Preparation</h3>
                  <p className="text-sm text-slate-500 mb-4 line-clamp-3">Detailed information on passport requirements, apostille, translations, and NEET scorecards.</p>
                  <a href="#" className="text-green-600 text-sm font-semibold hover:underline">View Checklist Guide &rarr;</a>
                </div>

                <div className={`${cardCls} p-6`}>
                  <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center mb-4">
                    <span className="material-symbols-outlined">payments</span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">Fees & Financials</h3>
                  <p className="text-sm text-slate-500 mb-4 line-clamp-3">Information about tuition fees, hostel charges, living expenses, and currency conversion.</p>
                  <a href="#" className="text-purple-600 text-sm font-semibold hover:underline">Fee Structures &rarr;</a>
                </div>

                <div className={`${cardCls} p-6`}>
                  <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center mb-4">
                    <span className="material-symbols-outlined">support_agent</span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">Contact Support</h3>
                  <p className="text-sm text-slate-500 mb-4 line-clamp-3">Need personalized help? Open a direct chat with our admission counselors for immediate assistance.</p>
                  <button onClick={() => setActiveView('chats')} className="text-orange-600 text-sm font-semibold hover:underline">Open Communications &rarr;</button>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
};
