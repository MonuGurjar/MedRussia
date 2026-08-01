import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, FeedbackEntry, AppSettings, EligibilityData, DocumentMetadata } from '../types';
import { getUserFeedback, saveFeedback, toggleShortlist, updateUserDocuments, updateUserEligibility, fetchUsersFromStore, updateUser } from '../services/db';
import { getSettings } from '../services/settings';
import { uploadFileToCloudinary } from '../services/storage';
import { checkEligibility } from '../services/gemini';
import { BudgetCalculator } from './BudgetCalculator';
import { PlatformFeedbackModal } from './PlatformFeedbackModal';
import { RUSSIAN_UNIVERSITIES, getUniversityData, getUniversityImage } from '../constants/universities';
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
  { id: 'documents', label: 'Checklist', icon: 'checklist' },
  { id: 'profile', label: 'Account & Settings', icon: 'manage_accounts' },
  { id: 'help', label: 'Help', icon: 'help_outline' },
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
  const [profileData, setProfileData] = useState({ name: user?.name || 'Student', username: user?.username || '', phone: user?.phone || '', university: user?.university || '', targetYear: '2026', preferredMedium: 'English Medium (6 Years)', targetBudget: '300k-500k', passportNumber: '', passportExpiry: '', whatsappAlerts: true, emailAlerts: true });
  const [avatar, setAvatar] = useState<string | null>(user?.avatar || null);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState<'marksheet' | 'passport' | 'neetScoreCard' | null>(null);
  const [eligibilityForm, setEligibilityForm] = useState<EligibilityData>(user?.eligibilityData || { pcbPercentage: '', category: 'General', isPwd: false, neetScore: '', dob: '', medium: 'English', knowsRussian: false, passportStatus: 'Have', medicalHistory: '' });
  const [eligibilityResult, setEligibilityResult] = useState<string | null>(user?.eligibilityResult || null);
  const [checkingEligibility, setCheckingEligibility] = useState(false);
  const [uniSearch, setUniSearch] = useState('');
  const [shortlist, setShortlist] = useState<string[]>(user?.shortlistedUniversities || []);
  const [budgetFilter, setBudgetFilter] = useState<string>('all');
  const [cityFilter, setCityFilter] = useState<string[]>([]);
  const [citySearch, setCitySearch] = useState('');
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [selectedUniDetail, setSelectedUniDetail] = useState<string | null>(null);
  const [newInquiry, setNewInquiry] = useState({ targetUniversity: '', message: '', budget: '', currentStatus: 'NEET Aspirant' as any });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inquiryFilter, setInquiryFilter] = useState<'all' | 'pending' | 'replied'>('all');
  const [inquirySearch, setInquirySearch] = useState('');
  const [showInquiryStats, setShowInquiryStats] = useState(false);
  const [selectedInquiry, setSelectedInquiry] = useState<FeedbackEntry | null>(null);
  const [eligibilityDataFound, setEligibilityDataFound] = useState<string | null>(null);
  const [studentChats, setStudentChats] = useState<DirectChat[]>([]);
  const [activeStudentChat, setActiveStudentChat] = useState<DirectChat | null>(null);
  const [studentChatMsg, setStudentChatMsg] = useState('');
  const [studentChatAttachment, setStudentChatAttachment] = useState<DirectMessageAttachment | null>(null);
  const [isSendingChat, setIsSendingChat] = useState(false);
  const [isLoadingChats, setIsLoadingChats] = useState(false);
  const [chatSearch, setChatSearch] = useState('');
  const [showSecurityPrompt, setShowSecurityPrompt] = useState(false);
  const [recoveryData, setRecoveryData] = useState({ question: SECURITY_QUESTIONS[0], answer: '' });

  useEffect(() => { setActiveView(initialView); }, [initialView]);
  useEffect(() => { if (!user.recoveryQuestion && !user.recoveryAnswer) setShowSecurityPrompt(true); }, [user]);
  useEffect(() => {
    if (activeView === 'chats') {
      setIsLoadingChats(true);
      getStudentChats(user.id).then(async chats => {
        if (chats.length === 0) {
          try {
            const defaultChat = await createDirectChat(
              user.id,
              user.name,
              user.email,
              "Hello! Welcome to MedRussia. I am your assigned Senior Admission Counselor. How can I assist you with your MBBS Russia application today?"
            );
            if (defaultChat.messages[0]) {
              defaultChat.messages[0].senderRole = 'admin';
              defaultChat.messages[0].senderName = 'Admission Counselor';
            }
            setStudentChats([defaultChat]);
            setActiveStudentChat(defaultChat);
          } catch (e) {
            console.error(e);
          }
        } else {
          setStudentChats(chats);
          if (!activeStudentChat) setActiveStudentChat(chats[0]);
        }
      }).catch(console.error).finally(() => setIsLoadingChats(false));
    }
  }, [activeView]);

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
    if (uniSearch.trim() && !uniName.toLowerCase().includes(uniSearch.toLowerCase()) && !data.location.toLowerCase().includes(uniSearch.toLowerCase())) {
      return false;
    }
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

      {/* Mobile Drawer Backdrop */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 md:hidden backdrop-blur-xs" onClick={() => setIsMobileMenuOpen(false)}>
          <div className="w-72 bg-white h-full p-4 flex flex-col shadow-2xl fade-in-left" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2" onClick={() => navigate('/')}>
                <div className="w-8 h-8 bg-[#0B1A30] rounded flex items-center justify-center text-white font-bold text-sm">M</div>
                <span className="font-bold text-[#0B1A30] text-base">MedRussia Hub</span>
              </div>
              <button onClick={() => setIsMobileMenuOpen(false)} className="p-1 text-slate-500 hover:bg-slate-100 rounded-lg">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto py-4 space-y-1">
              {ALL_TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => { setActiveView(tab.id as any); setIsMobileMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    activeView === tab.id ? 'bg-slate-100 text-[#0f172a] font-bold' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className="material-symbols-outlined text-[20px]">{tab.icon}</span>{tab.label}
                </button>
              ))}
            </div>
            <div className="pt-3 border-t border-slate-100 space-y-2">
              <button onClick={() => { setIsMobileMenuOpen(false); onLogout(); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50">
                <span className="material-symbols-outlined text-[20px]">logout</span>Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Top Header */}
        <header className="h-16 md:h-20 bg-white flex items-center justify-between px-4 md:px-10 shrink-0 z-20 border-b md:border-b-0 border-slate-100">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg" title="Open Menu">
              <span className="material-symbols-outlined text-[24px]">menu</span>
            </button>
            <div>
              <h2 className="text-base sm:text-xl font-bold text-[#0f172a] leading-tight">
                {activeView === 'inquiries' && `Welcome, ${(user?.name || 'Student').split(' ')[0]}`}
                {activeView === 'explorer' && 'University Explorer'}
                {activeView === 'budget' && 'Budget Calc'}
                {activeView === 'chats' && 'Communications'}
                {activeView === 'eligibility' && 'Eligibility Checker'}
                {activeView === 'documents' && 'Application Checklist'}
                {activeView === 'profile' && 'Profile'}
                {activeView === 'settings' && 'Settings'}
                {activeView === 'help' && 'Help Center'}
              </h2>
              {activeView === 'inquiries' && <p className="text-xs sm:text-sm text-slate-500 hidden sm:block">Manage your university inquiries and applications.</p>}
            </div>
          </div>
          
          <div className="flex items-center gap-1.5 sm:gap-3 ml-auto">
             {/* Inquiry Quick Stats Icon Button */}
             <div className="relative">
               <button 
                 onClick={() => { setShowInquiryStats(!showInquiryStats); setShowNotifications(false); }} 
                 className="relative p-2 text-slate-600 hover:bg-slate-100 rounded-full transition-colors flex items-center justify-center"
                 title="Inquiry Summary & Stats"
               >
                 <span className="material-symbols-outlined text-[22px] sm:text-[24px]">analytics</span>
                 {entries.length > 0 && (
                   <span className="absolute top-1 right-1 bg-amber-500 text-slate-950 text-[10px] font-bold px-1 rounded-full border-2 border-white leading-none">
                     {entries.length}
                   </span>
                 )}
               </button>

               {showInquiryStats && (
                 <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                   <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 mb-3">
                     <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                       <span className="material-symbols-outlined text-amber-500 text-[18px]">query_stats</span> Inquiry Summary
                     </h4>
                     <button onClick={() => setShowInquiryStats(false)} className="text-slate-400 hover:text-slate-600">
                       <span className="material-symbols-outlined text-[16px]">close</span>
                     </button>
                   </div>

                   <div className="space-y-2">
                     <div className="flex items-center justify-between p-2.5 rounded-xl bg-blue-50/60 border border-blue-100">
                       <div className="flex items-center gap-2 text-xs font-bold text-blue-900">
                         <span className="material-symbols-outlined text-blue-600 text-[18px]">contact_support</span>
                         Total Inquiries
                       </div>
                       <span className="font-bold text-sm text-blue-900">{entries.length}</span>
                     </div>

                     <div className="flex items-center justify-between p-2.5 rounded-xl bg-amber-50/60 border border-amber-100">
                       <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                         <span className="material-symbols-outlined text-amber-600 text-[18px]">pending_actions</span>
                         Awaiting Response
                       </div>
                       <span className="font-bold text-sm text-amber-700">{entries.filter(e => e.status === 'pending').length}</span>
                     </div>

                     <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50/60 border border-emerald-100">
                       <div className="flex items-center gap-2 text-xs font-bold text-emerald-900">
                         <span className="material-symbols-outlined text-emerald-600 text-[18px]">check_circle</span>
                         Resolved & Replied
                       </div>
                       <span className="font-bold text-sm text-emerald-700">{entries.filter(e => e.status === 'replied').length}</span>
                     </div>
                   </div>
                 </div>
               )}
             </div>

             {/* Notifications Bell */}
             <button onClick={() => { setShowNotifications(!showNotifications); setShowInquiryStats(false); }} className="relative p-2 text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
               <span className="material-symbols-outlined text-[22px] sm:text-[24px]">notifications_none</span>
               {notifications.length > 0 && <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full"></span>}
             </button>
             
             {/* Profile Avatar */}
             <button onClick={() => setActiveView('profile' as any)} className="w-9 h-9 sm:w-10 sm:h-10 rounded-full overflow-hidden bg-[#0f172a] text-white flex items-center justify-center font-bold cursor-pointer hover:ring-2 hover:ring-slate-300 transition-all text-sm">
                {avatar ? <img src={avatar} className="w-full h-full object-cover" alt="Avatar" /> : (user?.name || 'Student').charAt(0)}
             </button>
          </div>
        </header>

        {/* Scrollable Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-20 md:pb-8">
          
          {/* INQUIRIES TAB */}
          {activeView === 'inquiries' && (
             <div className="max-w-6xl mx-auto">
               <div className="flex flex-col lg:flex-row gap-8">
                 {/* Left Column (Draft Form Card) */}
                 <div className="w-full lg:w-96 shrink-0 space-y-6">
                   <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 relative overflow-hidden">
                     <div className="h-1.5 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 absolute top-0 left-0 right-0"></div>
                     <div className="flex items-center gap-3 mb-6 pt-1">
                       <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                         <span className="material-symbols-outlined text-[20px]">edit_note</span>
                       </div>
                       <div>
                         <h3 className="font-bold text-slate-900 text-base leading-snug">Submit New Inquiry</h3>
                         <p className="text-xs text-slate-400">Response within 24 hours</p>
                       </div>
                     </div>

                     <form onSubmit={handleSubmitInquiry} className="space-y-4">
                       <div>
                         <label className="text-xs font-bold text-slate-600 mb-1.5 block">Target University / Subject</label>
                         <select 
                           className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-slate-400 focus:bg-white text-slate-800 text-sm font-medium transition-all" 
                           value={newInquiry.targetUniversity} 
                           onChange={e => setNewInquiry({ ...newInquiry, targetUniversity: e.target.value })} 
                         >
                           <option value="">General MBBS Inquiry</option>
                           {RUSSIAN_UNIVERSITIES.map(u => <option key={u} value={u}>{u}</option>)}
                         </select>
                       </div>

                       <div>
                         <label className="text-xs font-bold text-slate-600 mb-1.5 block">Inquiry Topic</label>
                         <select 
                           className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-slate-400 focus:bg-white text-slate-800 text-sm font-medium transition-all" 
                           value={newInquiry.budget} 
                           onChange={e => setNewInquiry({ ...newInquiry, budget: e.target.value })}
                         >
                           <option value="Admission Requirements">Admission Requirements</option>
                           <option value="Fee Structure & Budget">Fee Structure & Budget</option>
                           <option value="Hostel & Student Life">Hostel & Accommodation</option>
                           <option value="Visa & Legalization">Visa & Legalization</option>
                           <option value="FMGE / NEXT Qualification">FMGE / NEXT Exam</option>
                           <option value="Other">Other Query</option>
                         </select>
                       </div>

                       <div>
                         <label className="text-xs font-bold text-slate-600 mb-1.5 block">Detailed Question <span className="text-amber-600">*</span></label>
                         <textarea 
                           className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-slate-400 focus:bg-white text-slate-800 text-sm min-h-[130px] resize-none transition-all placeholder:text-slate-400" 
                           placeholder="Type your question or concern here..." 
                           value={newInquiry.message} 
                           onChange={e => setNewInquiry({ ...newInquiry, message: e.target.value })} 
                           required 
                         />
                       </div>

                       <button 
                         type="submit" 
                         disabled={isSubmitting} 
                         className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm text-sm"
                       >
                         {isSubmitting ? (
                           <>
                             <span className="animate-spin material-symbols-outlined text-[18px]">refresh</span> Submitting...
                           </>
                         ) : (
                           <>
                             Submit Official Inquiry <span className="material-symbols-outlined text-[18px]">send</span>
                           </>
                         )}
                       </button>
                     </form>
                   </div>
                   
                   {/* Helpful Guidelines Card */}
                   <div className="bg-slate-50 rounded-3xl p-5 border border-slate-200/80">
                     <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-3 flex items-center gap-2">
                       <span className="material-symbols-outlined text-slate-400 text-[18px]">help_outline</span> Response Guidelines
                     </h4>
                     <ul className="space-y-2.5 text-xs text-slate-600 font-medium">
                       <li className="flex items-start gap-2">
                         <span className="material-symbols-outlined text-emerald-500 text-[16px] shrink-0 mt-0.5">check_circle</span>
                         <span>Inquiries are reviewed by verified Senior Medical Counselors.</span>
                       </li>
                       <li className="flex items-start gap-2">
                         <span className="material-symbols-outlined text-emerald-500 text-[16px] shrink-0 mt-0.5">check_circle</span>
                         <span>Urgent queries can also be sent via live Counselor Chat.</span>
                       </li>
                     </ul>
                   </div>
                 </div>

                 {/* Right Column (Tickets List & Filters) */}
                 <div className="flex-1 space-y-6">
                    {/* Filter Tabs & Search Bar */}
                    <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
                      <div className="flex items-center gap-1.5">
                        <button 
                          onClick={() => setInquiryFilter('all')}
                          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                            inquiryFilter === 'all' ? 'bg-[#0B1A30] text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          All ({entries.length})
                        </button>
                        <button 
                          onClick={() => setInquiryFilter('pending')}
                          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                            inquiryFilter === 'pending' ? 'bg-amber-500 text-slate-950 shadow-xs' : 'text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          Pending ({entries.filter(e => e.status === 'pending').length})
                        </button>
                        <button 
                          onClick={() => setInquiryFilter('replied')}
                          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                            inquiryFilter === 'replied' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          Resolved ({entries.filter(e => e.status === 'replied').length})
                        </button>
                      </div>

                      <div className="relative">
                        <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-[18px]">search</span>
                        <input 
                          type="text" 
                          placeholder="Search tickets..." 
                          value={inquirySearch}
                          onChange={e => setInquirySearch(e.target.value)}
                          className="pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs w-full sm:w-56 focus:outline-none focus:border-slate-400 bg-slate-50/50" 
                        />
                      </div>
                    </div>

                    {/* Inquiry Items */}
                    {entries.length === 0 && !loading && (
                      <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 text-slate-400 p-8">
                        <span className="material-symbols-outlined text-[48px] text-slate-300 mb-3">mark_as_unread</span>
                        <h4 className="font-bold text-slate-700 text-base mb-1">No Inquiries Submitted Yet</h4>
                        <p className="text-xs text-slate-400 max-w-xs mx-auto">Use the form on the left to submit your first question to our admission counselors.</p>
                      </div>
                    )}

                    {entries
                      .filter(entry => {
                        if (inquiryFilter === 'pending' && entry.status !== 'pending') return false;
                        if (inquiryFilter === 'replied' && entry.status !== 'replied') return false;
                        if (inquirySearch.trim()) {
                          const q = inquirySearch.toLowerCase();
                          return (
                            (entry.targetUniversity || '').toLowerCase().includes(q) ||
                            (entry.message || '').toLowerCase().includes(q) ||
                            entry.id.toLowerCase().includes(q)
                          );
                        }
                        return true;
                      })
                      .map(entry => {
                        const isPending = entry.status === 'pending';
                        const hasReply = entry.replies && entry.replies.length > 0;
                        return (
                          <div 
                            key={entry.id} 
                            onClick={() => setSelectedInquiry(entry)}
                            className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden transition-all hover:shadow-md hover:border-amber-400 cursor-pointer group"
                          >
                            <div className="p-5">
                              {/* Top Bar */}
                              <div className="flex items-center justify-between gap-2 mb-3 pb-2.5 border-b border-slate-100">
                                <div className="flex items-center gap-2">
                                  <span className={`px-3 py-1 text-xs font-bold rounded-full flex items-center gap-1.5 ${
                                    isPending ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                                  }`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${isPending ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`}></span>
                                    {isPending ? 'Awaiting Counselor' : 'Replied & Resolved'}
                                  </span>
                                  <span className="text-slate-400 text-xs font-mono font-semibold">#TICKET-{entry.id.substring(0, 6).toUpperCase()}</span>
                                </div>
                                
                                <div className="flex items-center gap-2">
                                  <span className="text-slate-400 text-xs font-medium">
                                    {new Date(entry.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                  </span>
                                  <span className="material-symbols-outlined text-slate-400 group-hover:text-amber-600 group-hover:translate-x-0.5 transition-all text-[20px]">
                                    open_in_full
                                  </span>
                                </div>
                              </div>
                              
                              {/* Subject Title */}
                              <h4 className="text-base font-bold text-slate-900 mb-1.5 flex items-center gap-2 group-hover:text-amber-700 transition-colors">
                                <span className="material-symbols-outlined text-slate-400 text-[20px]">domain</span>
                                {entry.targetUniversity || 'General MBBS Inquiry'}
                              </h4>

                              {/* Truncated Message Preview */}
                              <p className="text-slate-600 text-xs line-clamp-1 mb-3 leading-relaxed font-normal">
                                {entry.message}
                              </p>
                              
                              {/* Bottom Snippet Hint */}
                              <div className={`rounded-xl p-2.5 flex items-center justify-between text-xs font-medium ${
                                hasReply ? 'bg-indigo-50/80 text-indigo-900 border border-indigo-100' : 'bg-slate-50 text-slate-600 border border-slate-100'
                              }`}>
                                <span className="flex items-center gap-1.5 truncate">
                                  <span className="material-symbols-outlined text-[16px] text-amber-600">
                                    {hasReply ? 'forum' : 'schedule'}
                                  </span>
                                  {hasReply ? 'Official Counselor Reply Available' : 'Inquiry Assigned to Senior Counselor Desk'}
                                </span>
                                <span className="text-[11px] font-bold text-amber-600 shrink-0 ml-2 group-hover:underline">
                                  View Full Detail →
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                 </div>
               </div>
             </div>
          )}

          {/* FULL INQUIRY COMPLAINT / REPLY MODAL */}
          {selectedInquiry && (
            <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
              <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
                
                {/* Modal Header */}
                <div className="p-5 md:p-6 border-b border-slate-200 flex items-start justify-between bg-slate-50/50 shrink-0">
                  <div>
                    <div className="flex items-center gap-2.5 mb-1.5">
                      <span className={`px-3 py-1 text-xs font-bold rounded-full flex items-center gap-1.5 ${
                        selectedInquiry.status === 'pending' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${selectedInquiry.status === 'pending' ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`}></span>
                        {selectedInquiry.status === 'pending' ? 'Awaiting Counselor Response' : 'Official Reply Received'}
                      </span>
                      <span className="text-slate-400 text-xs font-mono font-bold">#TICKET-{selectedInquiry.id.substring(0, 6).toUpperCase()}</span>
                    </div>
                    <h3 className="font-bold text-slate-900 text-lg leading-tight">
                      {selectedInquiry.targetUniversity || 'General MBBS Inquiry'}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Submitted on {new Date(selectedInquiry.timestamp).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                    </p>
                  </div>

                  <button 
                    onClick={() => setSelectedInquiry(null)}
                    className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-xl transition-colors"
                  >
                    <span className="material-symbols-outlined text-[22px]">close</span>
                  </button>
                </div>

                {/* Modal Body Scroll Area */}
                <div className="flex-1 overflow-y-auto p-5 md:p-6 space-y-6">
                  
                  {/* Section 1: Student Request */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                      <div className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-[11px]">
                        {(user?.name || 'S').charAt(0)}
                      </div>
                      Your Submitted Question / Complaint
                    </div>

                    <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 md:p-5 text-slate-800 text-sm leading-relaxed whitespace-pre-wrap font-medium">
                      {selectedInquiry.message}
                    </div>
                  </div>

                  {/* Section 2: Counselor Response or Pending Timeline */}
                  {selectedInquiry.replies && selectedInquiry.replies.length > 0 ? (
                    <div className="space-y-2 pt-2 border-t border-slate-100">
                      <div className="flex items-center gap-2 text-xs font-bold text-indigo-900 uppercase tracking-wider">
                        <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                          <span className="material-symbols-outlined text-[14px]">support_agent</span>
                        </div>
                        MedRussia Official Counselor Reply
                        <span className="ml-auto bg-indigo-100 text-indigo-800 text-[10px] px-2 py-0.5 rounded-md font-bold">Verified Support</span>
                      </div>

                      <div className="bg-indigo-50/80 border border-indigo-200/80 rounded-2xl p-5 text-indigo-950 text-sm leading-relaxed whitespace-pre-wrap font-medium shadow-xs">
                        {selectedInquiry.replies[selectedInquiry.replies.length - 1].message}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3 pt-2 border-t border-slate-100">
                      <div className="flex items-center gap-2 text-xs font-bold text-amber-800 uppercase tracking-wider">
                        <span className="material-symbols-outlined text-amber-600 text-[18px]">timeline</span>
                        Inquiry Processing Progress
                      </div>

                      <div className="bg-amber-50/60 border border-amber-200/80 rounded-2xl p-5 space-y-4">
                        <div className="flex items-start gap-3">
                          <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 mt-0.5">
                            <span className="material-symbols-outlined text-[14px]">check</span>
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-900">Step 1: Ticket Logged</p>
                            <p className="text-[11px] text-slate-500">Your query has been logged securely in our admission database.</p>
                          </div>
                        </div>

                        <div className="flex items-start gap-3">
                          <div className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shrink-0 mt-0.5 animate-pulse">
                            <span className="material-symbols-outlined text-[14px]">pending</span>
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-900">Step 2: Senior Counselor Reviewing</p>
                            <p className="text-[11px] text-slate-500">Assigned to official Russian Medical Admissions Desk. Expected response within 24-48 hours.</p>
                          </div>
                        </div>

                        <div className="flex items-start gap-3 opacity-60">
                          <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center shrink-0 mt-0.5">
                            <span className="material-symbols-outlined text-[14px]">circle</span>
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-700">Step 3: Official Guidance & Resolution</p>
                            <p className="text-[11px] text-slate-400">Response will be delivered here and notified to your email.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                </div>

                {/* Modal Action Footer */}
                <div className="p-4 bg-slate-50 border-t border-slate-200 shrink-0 flex items-center justify-between gap-3">
                  <button 
                    onClick={() => { setSelectedInquiry(null); setActiveView('chats'); }}
                    className="px-4 py-2.5 bg-[#0B1A30] hover:bg-slate-800 text-white rounded-xl font-bold text-xs flex items-center gap-2 transition-colors shadow-xs"
                  >
                    <span className="material-symbols-outlined text-[16px]">forum</span> Live Counselor Chat
                  </button>
                  
                  <button 
                    onClick={() => setSelectedInquiry(null)}
                    className="px-5 py-2.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl font-bold text-xs transition-colors"
                  >
                    Close
                  </button>
                </div>

              </div>
            </div>
          )}

          {/* CHATS TAB */}
          {activeView === 'chats' && (
            <div className="max-w-6xl mx-auto h-[calc(100vh-140px)] md:h-[calc(100vh-160px)] bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col md:flex-row">
               
               {/* Contact / Chat List Sidebar */}
               <div className={`${activeStudentChat ? 'hidden md:flex' : 'flex'} w-full md:w-80 border-r border-slate-200 flex-col shrink-0 bg-white`}>
                  {/* Header */}
                  <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-slate-900 text-base">Messages & Support</h3>
                      <p className="text-xs text-slate-400">Direct assistance & counseling</p>
                    </div>
                    <button onClick={() => setActiveStudentChat(null)} className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl flex items-center gap-1 transition-colors text-xs font-bold">
                      <span className="material-symbols-outlined text-[16px]">add</span> New
                    </button>
                  </div>

                  {/* Search Bar */}
                  <div className="p-3 border-b border-slate-100 bg-slate-50/50">
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-[18px]">search</span>
                      <input 
                        type="text" 
                        placeholder="Search messages & contacts..." 
                        value={chatSearch}
                        onChange={e => setChatSearch(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-slate-400" 
                      />
                      {chatSearch && (
                        <button onClick={() => setChatSearch('')} className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600">
                          <span className="material-symbols-outlined text-[16px]">close</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Chat List Items */}
                  <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
                    {studentChats
                      .filter(c => {
                        if (!chatSearch.trim()) return true;
                        const q = chatSearch.toLowerCase();
                        const lastMsg = c.messages[c.messages.length - 1]?.text || '';
                        return lastMsg.toLowerCase().includes(q) || 'admission counselor'.includes(q);
                      })
                      .map(chat => {
                        const lastMsg = chat.messages[chat.messages.length - 1];
                        const isSelected = activeStudentChat?.id === chat.id;
                        const timeStr = lastMsg ? new Date(lastMsg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
                        
                        return (
                          <div 
                            key={chat.id} 
                            onClick={() => setActiveStudentChat(chat)} 
                            className={`flex items-center gap-3 p-4 cursor-pointer hover:bg-slate-50 transition-colors ${isSelected ? 'bg-amber-50/60 border-l-4 border-amber-500 font-medium' : ''}`}
                          >
                             <div className="relative w-11 h-11 shrink-0">
                               <img src="https://ui-avatars.com/api/?name=Admission+Counselor&background=0F172A&color=fff" className="w-full h-full rounded-2xl object-cover shadow-xs" alt="Avatar" />
                               <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full"></div>
                             </div>
                             <div className="flex-1 min-w-0">
                               <div className="flex justify-between items-baseline mb-1">
                                 <h4 className="text-sm font-bold text-slate-900 truncate">Admission Counselor</h4>
                                 <span className="text-[11px] text-slate-400 font-medium">{timeStr}</span>
                               </div>
                               <p className="text-xs text-slate-500 truncate leading-normal">
                                 {lastMsg?.senderRole === 'student' ? 'You: ' : ''}{lastMsg?.text || 'No messages yet'}
                               </p>
                             </div>
                          </div>
                        );
                      })}

                    {studentChats.length === 0 && (
                      <div className="p-8 text-center text-slate-400">
                        <span className="material-symbols-outlined text-[36px] text-slate-300 mb-2">forum</span>
                        <p className="text-xs">No active conversations</p>
                      </div>
                    )}
                  </div>
               </div>
               
               {/* Main Chat Thread Area */}
               <div className={`${!activeStudentChat ? 'hidden md:flex' : 'flex'} flex-1 flex-col h-full bg-slate-50/50`}>
                  {activeStudentChat ? (
                    <>
                      {/* Chat Thread Header */}
                      <div className="px-4 py-3.5 border-b border-slate-200 flex items-center justify-between bg-white shrink-0 shadow-2xs">
                         <div className="flex items-center gap-3">
                           {/* Mobile Back Button */}
                           <button 
                             onClick={() => setActiveStudentChat(null)} 
                             className="md:hidden p-1 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 flex items-center gap-1 font-bold text-xs mr-1"
                           >
                             <span className="material-symbols-outlined text-[20px]">arrow_back</span>
                           </button>
                           <div className="relative w-10 h-10 shrink-0">
                             <img src="https://ui-avatars.com/api/?name=Admission+Counselor&background=0F172A&color=fff" className="w-full h-full rounded-xl object-cover" alt="Avatar" />
                             <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></div>
                           </div>
                           <div>
                             <h3 className="font-bold text-slate-900 text-sm leading-snug">Admission Counselor</h3>
                             <p className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1.5">
                               <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span> Active Now • Average reply &lt; 5 mins
                             </p>
                           </div>
                         </div>
                         <div className="flex items-center gap-1">
                           <a href="tel:+919876543210" className="p-2 text-slate-500 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors" title="Call Counselor">
                             <span className="material-symbols-outlined text-[20px]">call</span>
                           </a>
                           <button onClick={() => getStudentChats(user.id).then(chats => setStudentChats(chats))} className="p-2 text-slate-500 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors" title="Refresh Messages">
                             <span className="material-symbols-outlined text-[20px]">sync</span>
                           </button>
                         </div>
                      </div>
                      
                      {/* Messages Scroll Area */}
                      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
                        <div className="text-center my-2">
                          <span className="bg-white border border-slate-200 text-slate-500 text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full shadow-2xs">
                            Official Admission Channel
                          </span>
                        </div>

                        {activeStudentChat.messages.map((msg) => {
                          const isStudent = msg.senderRole === 'student';
                          return (
                            <div key={msg.id} className={`flex gap-3 max-w-[88%] md:max-w-[75%] ${isStudent ? 'ml-auto flex-row-reverse' : ''}`}>
                              {!isStudent && (
                                <img src="https://ui-avatars.com/api/?name=Counselor&background=0F172A&color=fff" className="w-8 h-8 rounded-full shrink-0 shadow-xs" alt="Avatar" />
                              )}
                              <div className="flex flex-col">
                                <div className={`p-4 rounded-2xl text-sm leading-relaxed ${
                                  isStudent 
                                    ? 'bg-[#0B1A30] text-white rounded-tr-xs shadow-sm' 
                                    : 'bg-white text-slate-800 border border-slate-200/80 rounded-tl-xs shadow-xs'
                                }`}>
                                  {msg.text}
                                  {msg.attachment && (
                                    <div className={`mt-3 rounded-xl p-3 flex items-center gap-3 border ${
                                      isStudent ? 'bg-white/10 border-white/20 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                                    }`}>
                                       <span className="material-symbols-outlined text-[24px]">description</span>
                                       <div className="flex-1 min-w-0">
                                         <p className="font-semibold text-xs truncate">{msg.attachment.name}</p>
                                         <p className="text-[10px] opacity-75">Attachment File</p>
                                       </div>
                                    </div>
                                  )}
                                </div>
                                <div className={`text-[10px] text-slate-400 mt-1 flex items-center gap-1 font-medium ${isStudent ? 'justify-end' : 'justify-start'}`}>
                                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  {isStudent && <span className="material-symbols-outlined text-[13px] text-blue-500">done_all</span>}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Input Footer */}
                      <div className="p-3 md:p-4 bg-white border-t border-slate-200 shrink-0">
                        {studentChatAttachment && (
                          <div className="mb-2 text-left bg-blue-50 text-blue-700 text-xs px-3 py-1.5 rounded-xl inline-flex items-center gap-2 border border-blue-200">
                             <span className="material-symbols-outlined text-[14px]">attach_file</span> {studentChatAttachment.name}
                             <button onClick={() => setStudentChatAttachment(null)} className="hover:text-blue-900 ml-1">
                               <span className="material-symbols-outlined text-[14px]">close</span>
                             </button>
                          </div>
                        )}

                        <div className="border border-slate-200 rounded-2xl bg-slate-50 flex items-center p-1.5 focus-within:border-slate-400 focus-within:bg-white transition-all shadow-xs">
                          <label className="p-2 text-slate-400 hover:text-slate-700 cursor-pointer rounded-xl hover:bg-slate-100 transition-colors" title="Attach file">
                            <span className="material-symbols-outlined text-[20px]">attach_file</span>
                            <input type="file" className="hidden" onChange={handleStudentChatFileUpload} />
                          </label>
                          <input 
                            type="text" 
                            className="flex-1 bg-transparent border-none outline-none text-sm px-2 text-slate-800 placeholder:text-slate-400" 
                            placeholder="Type your message here..." 
                            value={studentChatMsg} 
                            onChange={e => setStudentChatMsg(e.target.value)} 
                            onKeyDown={e => e.key === 'Enter' && handleSendStudentMsg()} 
                          />
                          <button 
                            onClick={handleSendStudentMsg} 
                            disabled={isSendingChat || (!studentChatMsg.trim() && !studentChatAttachment)}
                            className="bg-amber-500 text-slate-950 font-bold px-4 py-2 rounded-xl text-sm flex items-center justify-center hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xs"
                          >
                            {isSendingChat ? (
                              <span className="animate-spin material-symbols-outlined text-[18px]">refresh</span>
                            ) : (
                              <span className="material-symbols-outlined text-[18px]">send</span>
                            )}
                          </button>
                        </div>
                        <p className="text-center text-[10px] text-slate-400 mt-2 font-medium">Press Enter to send. All messages are securely stored.</p>
                      </div>
                    </>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-slate-50/50">
                      <div className="w-16 h-16 bg-amber-100 text-amber-700 rounded-3xl flex items-center justify-center mb-4 shadow-xs">
                        <span className="material-symbols-outlined text-[32px]">support_agent</span>
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 mb-2">How can we help you today?</h3>
                      <p className="text-slate-500 mb-6 max-w-sm text-sm">Start a conversation with your dedicated Senior Admission Counselor.</p>
                      
                      <div className="w-full max-w-lg bg-white p-3 rounded-2xl shadow-sm border border-slate-200">
                        <div className="border border-slate-200 rounded-xl bg-slate-50 flex items-center p-1.5">
                          <label className="p-2 text-slate-400 hover:text-slate-700 cursor-pointer">
                            <span className="material-symbols-outlined text-[20px]">attach_file</span>
                            <input type="file" className="hidden" onChange={handleStudentChatFileUpload} />
                          </label>
                          <input 
                            type="text" 
                            className="flex-1 bg-transparent border-none outline-none text-sm px-2 text-slate-800 placeholder:text-slate-400" 
                            placeholder="Type a message to start a new chat..." 
                            value={studentChatMsg} 
                            onChange={e => setStudentChatMsg(e.target.value)} 
                            onKeyDown={e => e.key === 'Enter' && handleStartNewChat()} 
                          />
                          <button onClick={handleStartNewChat} className="bg-amber-500 text-slate-950 font-bold px-4 py-2 rounded-xl text-sm flex items-center justify-center hover:bg-amber-400 transition-colors">
                            <span className="material-symbols-outlined text-[18px]">send</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
               </div>
            </div>
          )}

          {/* UNI EXPLORER TAB */}
          {activeView === 'explorer' && (
             <div className="max-w-6xl mx-auto space-y-6">
                
                {/* Mobile & Desktop Top Control Bar */}
                <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs p-3 md:p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <div className="relative flex-1">
                    <span className="material-symbols-outlined absolute left-3.5 top-3 text-slate-400 text-[20px]">search</span>
                    <input 
                      type="text" 
                      placeholder="Search universities by name or city..." 
                      value={uniSearch} 
                      onChange={e => setUniSearch(e.target.value)} 
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-2.5 pl-10 pr-4 text-sm outline-none focus:border-slate-400 focus:bg-white transition-all"
                    />
                    {uniSearch && (
                      <button onClick={() => setUniSearch('')} className="absolute right-3 top-3 text-slate-400 hover:text-slate-600">
                        <span className="material-symbols-outlined text-[18px]">close</span>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Mobile Filter Button */}
                    <button 
                      onClick={() => setShowMobileFilters(true)}
                      className="md:hidden flex-1 sm:flex-initial px-4 py-2.5 bg-slate-900 text-white rounded-2xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs"
                    >
                      <span className="material-symbols-outlined text-[18px]">filter_list</span>
                      Filters {(budgetFilter !== 'all' || cityFilter.length > 0) && `(${(budgetFilter !== 'all' ? 1 : 0) + cityFilter.length})`}
                    </button>

                    {/* Active Filter Badges */}
                    <div className="hidden sm:flex gap-1.5 flex-wrap">
                      {budgetFilter !== 'all' && (
                        <span className="bg-amber-100 text-amber-900 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                          {budgetFilter} 
                          <button onClick={() => setBudgetFilter('all')} className="material-symbols-outlined text-[14px]">close</button>
                        </span>
                      )}
                      {cityFilter.map(c => (
                        <span key={c} className="bg-slate-100 text-slate-800 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                          {c} 
                          <button onClick={() => handleCityToggle(c)} className="material-symbols-outlined text-[14px]">close</button>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row gap-8">
                   {/* Desktop Filters sidebar */}
                   <div className="hidden md:block w-56 shrink-0 space-y-8 bg-white p-5 rounded-3xl border border-slate-200 h-fit sticky top-4">
                      <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                        <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                          <span className="material-symbols-outlined text-slate-500 text-[18px]">filter_alt</span> Filters
                        </h3>
                        <button onClick={() => { setBudgetFilter('all'); setCityFilter([]); }} className="text-xs text-amber-600 font-bold hover:text-amber-700">Clear All</button>
                      </div>
                      
                      <div>
                        <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-3">Annual Budget (RUB)</h4>
                        <div className="space-y-2.5 text-xs text-slate-600">
                          <label className="flex items-center gap-2.5 cursor-pointer"><input type="radio" name="b" checked={budgetFilter === 'all'} onChange={() => setBudgetFilter('all')} className="w-4 h-4 accent-amber-500" /> <span className={budgetFilter === 'all' ? 'font-bold text-slate-900' : ''}>Any Budget</span></label>
                          <label className="flex items-center gap-2.5 cursor-pointer"><input type="radio" name="b" checked={budgetFilter === '<300k'} onChange={() => setBudgetFilter('<300k')} className="w-4 h-4 accent-amber-500" /> <span className={budgetFilter === '<300k' ? 'font-bold text-slate-900' : ''}>&lt; 300,000 ₽</span></label>
                          <label className="flex items-center gap-2.5 cursor-pointer"><input type="radio" name="b" checked={budgetFilter === '300k-500k'} onChange={() => setBudgetFilter('300k-500k')} className="w-4 h-4 accent-amber-500" /> <span className={budgetFilter === '300k-500k' ? 'font-bold text-slate-900' : ''}>300k - 500k ₽</span></label>
                          <label className="flex items-center gap-2.5 cursor-pointer"><input type="radio" name="b" checked={budgetFilter === '500k-700k'} onChange={() => setBudgetFilter('500k-700k')} className="w-4 h-4 accent-amber-500" /> <span className={budgetFilter === '500k-700k' ? 'font-bold text-slate-900' : ''}>500k - 700k ₽</span></label>
                          <label className="flex items-center gap-2.5 cursor-pointer"><input type="radio" name="b" checked={budgetFilter === '>700k'} onChange={() => setBudgetFilter('>700k')} className="w-4 h-4 accent-amber-500" /> <span className={budgetFilter === '>700k' ? 'font-bold text-slate-900' : ''}>&gt; 700,000 ₽</span></label>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-3">City</h4>
                        <div className="relative mb-2.5">
                          <span className="material-symbols-outlined absolute left-2.5 top-2 text-slate-400 text-[16px]">search</span>
                          <input type="text" placeholder="Search cities..." value={citySearch} onChange={e => setCitySearch(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-1.5 pl-8 pr-2 text-xs outline-none" />
                        </div>
                        <div className="space-y-2 text-xs text-slate-600 max-h-48 overflow-y-auto pr-1">
                          {allCities.filter(c => c.toLowerCase().includes(citySearch.toLowerCase())).map(city => (
                            <label key={city} className="flex items-center gap-2 justify-between cursor-pointer py-0.5">
                              <div className="flex items-center gap-2">
                                <input type="checkbox" checked={cityFilter.includes(city)} onChange={() => handleCityToggle(city)} className="w-3.5 h-3.5 rounded accent-amber-500" /> 
                                <span className={cityFilter.includes(city) ? 'font-bold text-slate-900' : ''}>{city}</span>
                              </div>
                              <span className="text-slate-400 font-mono text-[10px]">{RUSSIAN_UNIVERSITIES.filter(u => getUniversityData(u).location === city).length}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                   </div>

                   {/* Results Grid */}
                   <div className="flex-1">
                     <div className="flex justify-between items-center mb-4">
                       <div>
                         <h3 className="font-bold text-slate-900 text-base md:text-lg">Discover Medical Universities</h3>
                         <p className="text-xs text-slate-500">Showing {filteredUnis.length} approved medical institutions.</p>
                       </div>
                     </div>

                     {filteredUnis.length === 0 ? (
                       <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 text-slate-400 p-8">
                         <span className="material-symbols-outlined text-[48px] text-slate-300 mb-2">school</span>
                         <h4 className="font-bold text-slate-700 text-sm mb-1">No Universities Found</h4>
                         <p className="text-xs text-slate-400 max-w-xs mx-auto">Try clearing your filters or searching for another city name.</p>
                         <button onClick={() => { setBudgetFilter('all'); setCityFilter([]); setUniSearch(''); }} className="mt-4 px-4 py-2 bg-amber-500 text-slate-950 rounded-xl text-xs font-bold">
                           Reset All Filters
                         </button>
                       </div>
                     ) : (
                       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                         {filteredUnis.map((uniName, idx) => {
                            const data = getUniversityData(uniName);
                            const isShortlisted = shortlist.includes(uniName);
                            return (
                              <div 
                                key={idx} 
                                onClick={() => setSelectedUniDetail(uniName)}
                                className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden flex flex-col group shadow-2xs hover:shadow-md transition-all cursor-pointer"
                              >
                                <div className="h-36 relative overflow-hidden bg-slate-900">
                                   <img 
                                     src={getUniversityImage(data.id || data.name)} 
                                     alt={data.name} 
                                     className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                                     loading="lazy"
                                   />
                                   <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/20 to-transparent"></div>
                                   <div className="absolute top-2.5 left-2.5 bg-white/95 backdrop-blur-xs px-2 py-0.5 rounded-md text-[10px] font-bold text-slate-900 flex items-center gap-1 shadow-xs z-10">
                                     <span className="material-symbols-outlined text-[12px] text-amber-500">star</span> #{idx + 1} Ranked
                                   </div>
                                   <button 
                                     onClick={(e) => { e.stopPropagation(); handleToggleShortlist(uniName); }} 
                                     className={`absolute top-2.5 right-2.5 w-7 h-7 ${isShortlisted ? 'bg-red-500 text-white' : 'bg-black/40 text-white'} backdrop-blur-xs rounded-full flex items-center justify-center hover:scale-105 transition-transform z-10`}
                                   >
                                     <span className="material-symbols-outlined text-[15px]">{isShortlisted ? 'favorite' : 'favorite_border'}</span>
                                   </button>
                                   <div className="absolute bottom-2.5 left-2.5 text-white text-[11px] font-semibold flex items-center gap-1 drop-shadow-sm z-10">
                                     <span className="material-symbols-outlined text-[13px]">location_on</span> {data.location}
                                   </div>
                                </div>
                                
                                <div className="p-3 sm:p-3.5 flex-1 flex flex-col bg-white">
                                  <h4 className="font-bold text-slate-900 text-xs sm:text-sm leading-tight mb-1 group-hover:text-amber-700 transition-colors">{data.name}</h4>
                                  
                                  <div className="flex items-center justify-between gap-2 my-2.5 p-2 bg-slate-50 rounded-xl border border-slate-100/90 text-xs">
                                    <div>
                                      <span className="text-[9px] font-bold text-slate-400 block tracking-wider uppercase">Tuition / Year</span>
                                      <span className="font-bold text-slate-900 text-xs">{data.tuition_fee_rub.toLocaleString()} ₽</span>
                                    </div>
                                    <div className="text-right">
                                      <span className="text-[9px] font-bold text-slate-400 block tracking-wider uppercase">Medium</span>
                                      <span className="font-bold text-emerald-600 text-xs flex items-center gap-0.5 justify-end">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> English
                                      </span>
                                    </div>
                                  </div>
                                  
                                  <div className="flex gap-2 mt-auto">
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); setSelectedUniDetail(uniName); }}
                                      className="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-lg text-xs transition-colors"
                                    >
                                      Details
                                    </button>
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); handleToggleShortlist(uniName); }} 
                                      className={`flex-1 py-1.5 ${isShortlisted ? 'bg-slate-200 text-slate-700' : 'bg-slate-950 text-white hover:bg-slate-800'} font-bold rounded-lg text-xs transition-colors`}
                                    >
                                      {isShortlisted ? 'Shortlisted' : 'Shortlist'}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                         })}
                       </div>
                     )}
                   </div>
                </div>
             </div>
          )}

          {/* MOBILE FILTER BOTTOM SHEET MODAL */}
          {showMobileFilters && (
            <div className="md:hidden fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-end justify-center animate-in fade-in duration-200">
              <div className="bg-white rounded-t-3xl w-full max-h-[85vh] flex flex-col shadow-2xl border-t border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <span className="material-symbols-outlined text-slate-500 text-[18px]">filter_alt</span> Filter Universities
                  </h3>
                  <button onClick={() => setShowMobileFilters(false)} className="p-1.5 text-slate-400 hover:text-slate-700">
                    <span className="material-symbols-outlined text-[20px]">close</span>
                  </button>
                </div>

                <div className="p-5 overflow-y-auto space-y-6 flex-1">
                  <div>
                    <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-3">Annual Budget (RUB)</h4>
                    <div className="space-y-3 text-xs text-slate-700">
                      <label className="flex items-center gap-3 cursor-pointer"><input type="radio" name="mb" checked={budgetFilter === 'all'} onChange={() => setBudgetFilter('all')} className="w-4 h-4 accent-amber-500" /> <span className={budgetFilter === 'all' ? 'font-bold text-slate-900' : ''}>Any Budget</span></label>
                      <label className="flex items-center gap-3 cursor-pointer"><input type="radio" name="mb" checked={budgetFilter === '<300k'} onChange={() => setBudgetFilter('<300k')} className="w-4 h-4 accent-amber-500" /> <span className={budgetFilter === '<300k' ? 'font-bold text-slate-900' : ''}>&lt; 300,000 ₽</span></label>
                      <label className="flex items-center gap-3 cursor-pointer"><input type="radio" name="mb" checked={budgetFilter === '300k-500k'} onChange={() => setBudgetFilter('300k-500k')} className="w-4 h-4 accent-amber-500" /> <span className={budgetFilter === '300k-500k' ? 'font-bold text-slate-900' : ''}>300k - 500k ₽</span></label>
                      <label className="flex items-center gap-3 cursor-pointer"><input type="radio" name="mb" checked={budgetFilter === '500k-700k'} onChange={() => setBudgetFilter('500k-700k')} className="w-4 h-4 accent-amber-500" /> <span className={budgetFilter === '500k-700k' ? 'font-bold text-slate-900' : ''}>500k - 700k ₽</span></label>
                      <label className="flex items-center gap-3 cursor-pointer"><input type="radio" name="mb" checked={budgetFilter === '>700k'} onChange={() => setBudgetFilter('>700k')} className="w-4 h-4 accent-amber-500" /> <span className={budgetFilter === '>700k' ? 'font-bold text-slate-900' : ''}>&gt; 700,000 ₽</span></label>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-3">Filter by City</h4>
                    <div className="space-y-2 text-xs text-slate-700 max-h-40 overflow-y-auto">
                      {allCities.map(city => (
                        <label key={city} className="flex items-center gap-3 justify-between cursor-pointer py-1">
                          <div className="flex items-center gap-3">
                            <input type="checkbox" checked={cityFilter.includes(city)} onChange={() => handleCityToggle(city)} className="w-4 h-4 rounded accent-amber-500" /> 
                            <span className={cityFilter.includes(city) ? 'font-bold text-slate-900' : ''}>{city}</span>
                          </div>
                          <span className="text-slate-400 text-xs">{RUSSIAN_UNIVERSITIES.filter(u => getUniversityData(u).location === city).length}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-3 shrink-0">
                  <button 
                    onClick={() => { setBudgetFilter('all'); setCityFilter([]); }} 
                    className="flex-1 py-3 bg-white border border-slate-200 font-bold text-xs text-slate-700 rounded-xl"
                  >
                    Clear All
                  </button>
                  <button 
                    onClick={() => setShowMobileFilters(false)} 
                    className="flex-1 py-3 bg-amber-500 font-bold text-xs text-slate-950 rounded-xl"
                  >
                    Apply Filters
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* UNIVERSITY DETAIL FULL-WINDOW MODAL */}
          {selectedUniDetail && (
            <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-2 sm:p-4 lg:p-6 animate-in fade-in duration-200">
              <div className="bg-white rounded-3xl max-w-6xl w-full h-[94vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
                {(() => {
                  const data = getUniversityData(selectedUniDetail);
                  const isShortlisted = shortlist.includes(selectedUniDetail);
                  return (
                    <>
                      {/* Hero Header Banner */}
                      <div className="h-48 md:h-64 relative shrink-0 p-6 flex flex-col justify-between overflow-hidden bg-slate-950">
                        <img 
                          src={getUniversityImage(data.id || data.name)} 
                          alt={data.name} 
                          className="absolute inset-0 w-full h-full object-cover opacity-50" 
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent"></div>
                        
                        {/* Top Bar Badges & Close */}
                        <div className="relative z-10 flex items-center justify-between">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="bg-amber-400 text-slate-950 text-xs font-extrabold px-3 py-1 rounded-lg flex items-center gap-1 shadow-xs">
                              <span className="material-symbols-outlined text-[15px]">verified</span> WHO & NMC Approved
                            </span>
                            <span className="bg-white/10 text-white backdrop-blur-md text-xs font-bold px-3 py-1 rounded-lg border border-white/10 hidden sm:inline-flex items-center gap-1">
                              <span className="material-symbols-outlined text-[15px]">school</span> Govt. State Medical University
                            </span>
                          </div>

                          <button 
                            onClick={() => setSelectedUniDetail(null)} 
                            className="bg-black/40 hover:bg-black/70 text-white w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-md transition-colors"
                          >
                            <span className="material-symbols-outlined text-[20px]">close</span>
                          </button>
                        </div>

                        {/* Title & Location */}
                        <div className="relative z-10 text-white">
                          <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold leading-tight tracking-tight drop-shadow-sm">{data.name}</h2>
                          <p className="text-xs sm:text-sm text-slate-300 flex items-center gap-1.5 mt-1 font-medium">
                            <span className="material-symbols-outlined text-amber-400 text-[16px]">location_on</span> {data.location}, Russian Federation
                          </p>
                        </div>
                      </div>

                      {/* Main Full-Window Body Content */}
                      <div className="flex-1 overflow-y-auto p-5 md:p-8">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
                          
                          {/* Left Column: Detailed Information */}
                          <div className="lg:col-span-2 space-y-6">
                            
                            {/* Quick Overview Metrics Grid */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-50 border border-slate-200/80 rounded-2xl">
                              <div className="space-y-0.5">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Degree Awarded</span>
                                <span className="font-bold text-slate-900 text-xs sm:text-sm">MBBS / MD Doctor</span>
                              </div>
                              <div className="space-y-0.5">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Duration</span>
                                <span className="font-bold text-slate-900 text-xs sm:text-sm">6 Years (5+1 Internship)</span>
                              </div>
                              <div className="space-y-0.5">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Medium</span>
                                <span className="font-bold text-emerald-600 text-xs sm:text-sm">100% English</span>
                              </div>
                              <div className="space-y-0.5">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Accreditation</span>
                                <span className="font-bold text-indigo-700 text-xs sm:text-sm">NMC / WHO Listed</span>
                              </div>
                            </div>

                            {/* About Institution */}
                            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
                              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                                <span className="material-symbols-outlined text-amber-500 text-[20px]">domain</span> About {data.name}
                              </h3>
                              <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                                {data.name} is a premier government medical university in Russia renowned for its clinical excellence, cutting-edge medical research, and high FMGE (Foreign Medical Graduate Examination) / NEXT pass percentages among Indian medical graduates.
                              </p>
                              
                              <div className="flex flex-wrap gap-2 pt-2">
                                <span className="px-3 py-1 bg-emerald-50 text-emerald-800 rounded-lg text-xs font-bold border border-emerald-100 flex items-center gap-1">
                                  ✓ WHO World Directory Listed
                                </span>
                                <span className="px-3 py-1 bg-blue-50 text-blue-800 rounded-lg text-xs font-bold border border-blue-100 flex items-center gap-1">
                                  ✓ NMC / MCI Recognized
                                </span>
                                <span className="px-3 py-1 bg-amber-50 text-amber-900 rounded-lg text-xs font-bold border border-amber-100 flex items-center gap-1">
                                  ✓ ECFMG (USA) Eligible
                                </span>
                              </div>
                            </div>

                            {/* Clinical Training & Hospital Facilities */}
                            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
                              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                                <span className="material-symbols-outlined text-blue-600 text-[20px]">local_hospital</span> Clinical Training & Infrastructure
                              </h3>
                              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-700">
                                <li className="flex items-start gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                                  <span className="material-symbols-outlined text-emerald-600 text-[18px] shrink-0 mt-0.5">check_circle</span>
                                  <div>
                                    <strong className="block text-slate-900">3000+ Hospital Beds</strong>
                                    Extensive clinical rotation across top state general hospitals.
                                  </div>
                                </li>
                                <li className="flex items-start gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                                  <span className="material-symbols-outlined text-emerald-600 text-[18px] shrink-0 mt-0.5">check_circle</span>
                                  <div>
                                    <strong className="block text-slate-900">Simulation Labs</strong>
                                    High-fidelity robotic mannequins & cadaveric dissection units.
                                  </div>
                                </li>
                                <li className="flex items-start gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                                  <span className="material-symbols-outlined text-emerald-600 text-[18px] shrink-0 mt-0.5">check_circle</span>
                                  <div>
                                    <strong className="block text-slate-900">Indian Mess Facilities</strong>
                                    Delicious North & South Indian vegetarian and non-veg food.
                                  </div>
                                </li>
                                <li className="flex items-start gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                                  <span className="material-symbols-outlined text-emerald-600 text-[18px] shrink-0 mt-0.5">check_circle</span>
                                  <div>
                                    <strong className="block text-slate-900">Centralized Hostels</strong>
                                    24/7 heated, CCTV secured dormitories inside university campus.
                                  </div>
                                </li>
                              </ul>
                            </div>

                          </div>

                          {/* Right Column: Fee Structure & Action Desk */}
                          <div className="space-y-6">
                            
                            {/* Tuition & Expense Card */}
                            <div className="bg-[#0B1A30] text-white rounded-3xl p-6 border border-slate-800 space-y-5 shadow-lg">
                              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Annual Fee Summary</span>
                                <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                                  2026 Intake Open
                                </span>
                              </div>

                              <div className="space-y-3">
                                <div className="flex justify-between items-baseline">
                                  <span className="text-xs text-slate-300">Annual Tuition Fee</span>
                                  <span className="font-extrabold text-white text-lg">{data.tuition_fee_rub.toLocaleString()} ₽</span>
                                </div>
                                <div className="flex justify-between items-baseline">
                                  <span className="text-xs text-slate-300">Hostel & Insurance (Approx)</span>
                                  <span className="font-bold text-slate-200 text-sm">~60,000 ₽ / yr</span>
                                </div>
                                <div className="pt-2 border-t border-slate-800 flex justify-between items-baseline">
                                  <span className="text-xs font-bold text-slate-300">Est. Total Per Year</span>
                                  <span className="font-extrabold text-amber-400 text-xl">{(data.tuition_fee_rub + 60000).toLocaleString()} ₽</span>
                                </div>
                              </div>

                              <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 text-[11px] text-slate-300 flex items-center justify-between">
                                <span>Approx. INR Equivalent:</span>
                                <strong className="text-white font-mono">~₹{Math.round((data.tuition_fee_rub + 60000) * 0.95).toLocaleString()} / yr</strong>
                              </div>

                              {/* Primary Actions */}
                              <div className="space-y-2.5 pt-2">
                                <button 
                                  onClick={() => {
                                    setNewInquiry(prev => ({ ...prev, targetUniversity: selectedUniDetail }));
                                    setSelectedUniDetail(null);
                                    setActiveView('inquiries');
                                  }}
                                  className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-2xl text-xs flex items-center justify-center gap-2 shadow-xs transition-colors"
                                >
                                  <span className="material-symbols-outlined text-[18px]">send</span> Inquire / Start Admission
                                </button>
                                
                                <button 
                                  onClick={() => handleToggleShortlist(selectedUniDetail)}
                                  className={`w-full py-3 font-bold rounded-2xl text-xs flex items-center justify-center gap-2 border transition-colors ${
                                    isShortlisted ? 'bg-slate-800 text-slate-200 border-slate-700' : 'bg-white/10 hover:bg-white/20 text-white border-white/10'
                                  }`}
                                >
                                  <span className="material-symbols-outlined text-[16px]">{isShortlisted ? 'favorite' : 'favorite_border'}</span>
                                  {isShortlisted ? 'University Shortlisted' : 'Shortlist University'}
                                </button>

                                <button 
                                  onClick={() => {
                                    setSelectedUniDetail(null);
                                    setActiveView('chats');
                                  }}
                                  className="w-full py-3 bg-transparent text-slate-300 hover:text-white font-bold rounded-2xl text-xs flex items-center justify-center gap-2 transition-colors"
                                >
                                  <span className="material-symbols-outlined text-[16px]">support_agent</span> Chat Live with Counselor
                                </button>
                              </div>

                            </div>

                          </div>

                        </div>
                      </div>
                    </>
                  );
                })()}
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
             <div className="max-w-4xl mx-auto space-y-8">
               
               {/* Hero Banner Header */}
               <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-white rounded-3xl p-6 md:p-8 shadow-md border border-slate-800 relative overflow-hidden">
                 <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPjxyZWN0IHdpZHRoPSI0IiBoZWlnaHQ9IjQiIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSIvPjwvc3ZnPg==')] opacity-30"></div>
                 
                 <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                   <div className="space-y-2">
                     <span className="bg-amber-400/20 text-amber-300 border border-amber-400/30 text-xs font-extrabold px-3 py-1 rounded-lg inline-flex items-center gap-1.5 uppercase tracking-wider">
                       <span className="material-symbols-outlined text-[15px]">verified_user</span> NMC & WHO 2026 Guidelines
                     </span>
                     <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">Instant MBBS Eligibility Audit</h2>
                     <p className="text-xs md:text-sm text-slate-300 max-w-xl leading-relaxed">
                       Verify if your 12th PCB aggregate percentage and NEET score meet official National Medical Commission (NMC) requirements for top Russian State Medical Universities.
                     </p>
                   </div>

                   <div className="hidden md:flex flex-col items-center justify-center shrink-0 w-28 h-28 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 text-center p-3">
                     <span className="material-symbols-outlined text-[36px] text-amber-400 mb-1">analytics</span>
                     <span className="text-[10px] font-bold text-slate-200 uppercase">Automated Check</span>
                   </div>
                 </div>
               </div>

               {/* Eligibility Audit Form */}
               <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs p-6 md:p-8 space-y-6">
                  <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                    <span className="material-symbols-outlined text-amber-600 text-[20px]">edit_note</span> Enter Academic Details
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* 12th PCB % */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 block">
                        12th PCB Aggregate % <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input 
                          type="number" 
                          value={eligibilityForm.pcbPercentage} 
                          onChange={e => setEligibilityForm({...eligibilityForm, pcbPercentage: e.target.value})} 
                          className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white text-slate-900 text-sm font-semibold transition-all" 
                          placeholder="e.g. 68.5" 
                        />
                        <span className="absolute right-3 top-3 bottom-3 flex items-center justify-center bg-slate-200/70 text-slate-700 font-bold px-3 rounded-xl text-xs">%</span>
                      </div>
                    </div>

                    {/* NEET Score */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 block">
                        NEET Score (Marks) <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input 
                          type="number" 
                          value={eligibilityForm.neetScore} 
                          onChange={e => setEligibilityForm({...eligibilityForm, neetScore: e.target.value})} 
                          className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white text-slate-900 text-sm font-semibold transition-all" 
                          placeholder="e.g. 420" 
                        />
                        <span className="material-symbols-outlined absolute right-3 top-3 bottom-3 flex items-center justify-center text-slate-500 bg-slate-200/70 px-2.5 rounded-xl text-[18px]">school</span>
                      </div>
                    </div>

                    {/* Application Category Segmented Control */}
                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-xs font-bold text-slate-700 block">
                        Application Category <span className="text-red-500">*</span>
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setEligibilityForm({...eligibilityForm, category: 'General'})}
                          className={`p-4 rounded-2xl border text-left flex items-center justify-between transition-all ${
                            eligibilityForm.category === 'General'
                              ? 'bg-slate-950 text-white border-slate-950 shadow-xs'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <span className="font-bold text-xs">General Category</span>
                          <span className="material-symbols-outlined text-[20px]">
                            {eligibilityForm.category === 'General' ? 'check_circle' : 'radio_button_unchecked'}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setEligibilityForm({...eligibilityForm, category: 'Reserved'})}
                          className={`p-4 rounded-2xl border text-left flex items-center justify-between transition-all ${
                            eligibilityForm.category === 'Reserved'
                              ? 'bg-slate-950 text-white border-slate-950 shadow-xs'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <span className="font-bold text-xs">OBC / SC / ST Reserved</span>
                          <span className="material-symbols-outlined text-[20px]">
                            {eligibilityForm.category === 'Reserved' ? 'check_circle' : 'radio_button_unchecked'}
                          </span>
                        </button>
                      </div>
                    </div>

                    {/* Passport Status Segmented Control */}
                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-xs font-bold text-slate-700 block">
                        Passport Status <span className="text-red-500">*</span>
                      </label>
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { value: 'Have', label: 'Have Passport' },
                          { value: 'Applied', label: 'Applied' },
                          { value: 'No', label: 'No Passport' },
                        ].map(opt => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setEligibilityForm({...eligibilityForm, passportStatus: opt.value as any})}
                            className={`p-3.5 rounded-2xl border text-center transition-all ${
                              eligibilityForm.passportStatus === opt.value
                                ? 'bg-amber-500 text-slate-950 border-amber-500 font-bold shadow-xs'
                                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            <span className="text-xs block font-bold">{opt.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <button 
                    onClick={handleCheckEligibility} 
                    disabled={checkingEligibility} 
                    className="w-full py-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold rounded-2xl text-sm flex items-center justify-center gap-2 shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {checkingEligibility ? (
                      <span className="animate-spin material-symbols-outlined text-[20px]">refresh</span>
                    ) : (
                      <span className="material-symbols-outlined text-[20px]">analytics</span>
                    )} 
                    {checkingEligibility ? 'Analyzing Eligibility Criteria...' : 'Analyze Admission Eligibility Now'}
                  </button>
               </div>

               {/* Eligibility Audit Results Section */}
               {eligibilityResult ? (
                 <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 md:p-8 space-y-6">
                   <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                     <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                       <span className="material-symbols-outlined text-emerald-600 text-[22px]">verified</span> Personalized Eligibility Report
                     </h3>
                     <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                       getEligibilityStatus(eligibilityResult) === 'eligible' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                     }`}>
                       {getEligibilityStatus(eligibilityResult) === 'eligible' ? '✓ Fully Eligible' : '⚠️ Conditional Review'}
                     </span>
                   </div>

                   <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-slate-800 text-sm leading-relaxed whitespace-pre-wrap font-medium">
                     {eligibilityResult}
                   </div>

                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                     <button 
                       onClick={() => setActiveView('explorer')} 
                       className="py-3.5 bg-slate-950 hover:bg-slate-800 text-white font-bold rounded-2xl text-xs flex items-center justify-center gap-2 transition-colors shadow-xs"
                     >
                       <span className="material-symbols-outlined text-[18px]">account_balance</span> Explore Eligible Universities
                     </button>

                     <button 
                       onClick={() => setActiveView('chats')} 
                       className="py-3.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-2xl text-xs flex items-center justify-center gap-2 transition-colors shadow-xs"
                     >
                       <span className="material-symbols-outlined text-[18px]">support_agent</span> Discuss Admission with Counselor
                     </button>
                   </div>
                 </div>
               ) : (
                 <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 space-y-4">
                   <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider flex items-center gap-2">
                     <span className="material-symbols-outlined text-blue-600 text-[20px]">menu_book</span> NMC India Official Admission Regulations
                   </h3>

                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                     <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                       <span className="font-bold text-slate-900 block text-sm mb-1">General Category Criteria</span>
                       <p className="text-slate-600">✓ Minimum 50% aggregate in 12th Physics, Chemistry & Biology</p>
                       <p className="text-slate-600">✓ NEET Score: 164+ Marks (Qualified)</p>
                     </div>

                     <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                       <span className="font-bold text-slate-900 block text-sm mb-1">Reserved Category Criteria</span>
                       <p className="text-slate-600">✓ Minimum 40% aggregate in 12th Physics, Chemistry & Biology</p>
                       <p className="text-slate-600">✓ NEET Score: 129+ Marks (Qualified)</p>
                     </div>
                   </div>
                 </div>
               )}

             </div>
          )}

           {/* CHECKLIST TAB */}
           {/* CHECKLIST TAB */}
          {activeView === 'documents' && (
             <div className="max-w-4xl mx-auto space-y-4 md:space-y-6">
               <div>
                 <h2 className="text-xl md:text-2xl font-bold text-slate-900">Required Documents Vault</h2>
                 <p className="text-slate-500 text-xs md:text-sm mt-1">Upload clear scanned copies of your academic marksheets, passport, and NEET scorecard for visa and admission clearance.</p>
               </div>
               
               {/* Progress Tracker Bar */}
               <div className={`${cardCls} p-4 md:p-5 rounded-2xl flex flex-col sm:flex-row justify-between sm:items-center gap-3`}>
                 <div className="flex-1">
                   <div className="flex justify-between items-center mb-1.5">
                     <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                       <span className="material-symbols-outlined text-[16px] text-indigo-600">donut_large</span> Document Verification Progress
                     </span>
                     <span className="text-sm font-extrabold text-slate-900">{Math.round((['marksheet', 'passport', 'neetScoreCard'].filter(id => user.documents?.[id]?.status).length / 3) * 100)}%</span>
                   </div>
                   <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                     <div className="h-full bg-slate-900 transition-all duration-500" style={{ width: `${Math.round((['marksheet', 'passport', 'neetScoreCard'].filter(id => user.documents?.[id]?.status).length / 3) * 100)}%` }}></div>
                   </div>
                 </div>

                 <div className="flex items-center gap-3 border-t sm:border-t-0 sm:border-l border-slate-200 pt-2 sm:pt-0 sm:pl-5 text-center shrink-0">
                   <div className="bg-emerald-50 text-emerald-800 px-3 py-1 rounded-xl">
                     <span className="text-xs md:text-sm font-extrabold block">{['marksheet', 'passport', 'neetScoreCard'].filter(id => user.documents?.[id]?.status).length} / 3</span>
                     <span className="text-[9px] font-bold tracking-wider uppercase opacity-80">Uploaded</span>
                   </div>
                   <div className="bg-amber-50 text-amber-800 px-3 py-1 rounded-xl">
                     <span className="text-xs md:text-sm font-extrabold block">{3 - ['marksheet', 'passport', 'neetScoreCard'].filter(id => user.documents?.[id]?.status).length}</span>
                     <span className="text-[9px] font-bold tracking-wider uppercase opacity-80">Pending</span>
                   </div>
                 </div>
               </div>

               {/* Document Cards List */}
               <div className="space-y-3.5 md:space-y-4">
                 {[
                    { id: 'marksheet', title: '10th/12th Marksheet', desc: 'Combined PDF or high-resolution photo scan of both marksheets.' },
                    { id: 'passport', title: 'Passport Copy', desc: 'First and last page scan. Must be valid for minimum 18 months.' },
                    { id: 'neetScoreCard', title: 'NEET Scorecard', desc: 'Official NTA scorecard indicating qualification status.' }
                 ].map(doc => {
                    const docData = user.documents?.[doc.id];
                    const isUploaded = !!docData;
                    const isVerified = docData?.status === 'verified';
                    
                    return (
                       <div key={doc.id} className={`${cardCls} p-3.5 md:p-5 rounded-2xl overflow-hidden border-l-4 ${isVerified ? 'border-l-emerald-500' : isUploaded ? 'border-l-blue-500' : 'border-l-amber-500'}`}>
                         <div className="flex flex-col gap-3">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h3 className="text-sm md:text-base font-bold text-slate-900">{doc.title}</h3>
                                  {isVerified ? (
                                    <span className="bg-emerald-100 text-emerald-800 text-[10px] md:text-xs px-2 py-0.5 rounded-full flex items-center gap-1 font-bold">
                                      <span className="material-symbols-outlined text-[13px]">check_circle</span> Verified
                                    </span>
                                  ) : isUploaded ? (
                                    <span className="bg-blue-100 text-blue-800 text-[10px] md:text-xs px-2 py-0.5 rounded-full flex items-center gap-1 font-bold">
                                      <span className="material-symbols-outlined text-[13px]">cloud_done</span> Uploaded
                                    </span>
                                  ) : (
                                    <span className="bg-amber-100 text-amber-900 text-[10px] md:text-xs px-2 py-0.5 rounded-full flex items-center gap-1 font-bold">
                                      <span className="material-symbols-outlined text-[13px]">pending</span> Action Needed
                                    </span>
                                  )}
                                </div>
                                <p className="text-slate-500 text-xs mt-0.5 leading-snug">{doc.desc}</p>
                              </div>
                            </div>
                            
                            {isUploaded ? (
                              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="material-symbols-outlined text-slate-400 text-[20px] shrink-0">description</span>
                                  <div className="min-w-0">
                                    <p className="font-bold text-xs text-slate-800 truncate">{docData.publicId?.split('/').pop() || 'Document.pdf'}</p>
                                    <p className="text-[10px] text-slate-400">Uploaded {new Date(docData.uploadedAt || Date.now()).toLocaleDateString()}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <a href={docData.url} target="_blank" rel="noreferrer" className="px-2.5 py-1 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-lg flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[14px]">visibility</span> View
                                  </a>
                                  <label className="px-2.5 py-1 bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold rounded-lg flex items-center gap-1 cursor-pointer">
                                    <span className="material-symbols-outlined text-[14px]">sync</span> Replace
                                    <input type="file" className="hidden" onChange={e => handleFileUpload(e, doc.id)} />
                                  </label>
                                </div>
                              </div>
                            ) : (
                              <label className="border border-dashed border-amber-300 bg-amber-50/40 hover:bg-amber-50 rounded-xl p-3 md:p-4 flex items-center justify-between gap-3 cursor-pointer transition-colors">
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                                    {uploadingDoc === doc.id ? (
                                      <span className="animate-spin material-symbols-outlined text-[18px]">refresh</span>
                                    ) : (
                                      <span className="material-symbols-outlined text-[20px]">upload_file</span>
                                    )}
                                  </div>
                                  <div className="min-w-0">
                                    <h4 className="font-bold text-slate-900 text-xs md:text-sm leading-tight truncate">
                                      {uploadingDoc === doc.id ? 'Uploading File...' : 'Tap to Upload File'}
                                    </h4>
                                    <p className="text-[10px] md:text-xs text-slate-500">PDF, JPG, PNG (Max 5MB)</p>
                                  </div>
                                </div>

                                <span className="px-3 py-1.5 bg-slate-950 text-white font-bold text-xs rounded-xl hover:bg-slate-800 shrink-0">
                                  Select File
                                </span>
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
          {/* UNIFIED ACCOUNT & SETTINGS TAB */}
          {(activeView === 'profile' || activeView === 'settings') && (
            <div className="max-w-4xl mx-auto space-y-6 md:space-y-8">
              
              {/* Profile Hero Header Card */}
              <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-white rounded-3xl p-6 md:p-8 shadow-md border border-slate-800 relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPjxyZWN0IHdpZHRoPSI0IiBoZWlnaHQ9IjQiIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSIvPjwvc3ZnPg==')] opacity-30"></div>

                <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start gap-6">
                  {/* Avatar Upload */}
                  <div className="relative shrink-0">
                    <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl overflow-hidden border-4 border-white/20 shadow-xl bg-slate-800 flex items-center justify-center">
                      {avatar ? (
                        <img src={avatar} alt="Profile Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-3xl font-extrabold text-white">{user.name.charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    <label className="absolute -bottom-2 -right-2 w-9 h-9 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-2xl flex items-center justify-center cursor-pointer shadow-md transition-transform hover:scale-105">
                      <span className="material-symbols-outlined text-[18px]">photo_camera</span>
                      <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                    </label>
                  </div>

                  {/* User Stats & Info */}
                  <div className="flex-1 text-center sm:text-left space-y-2">
                    <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                      <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">{user.name}</h2>
                      {profileData.username && (
                        <span className="bg-white/10 text-slate-200 border border-white/10 text-xs font-bold px-2.5 py-0.5 rounded-lg">
                          @{profileData.username}
                        </span>
                      )}
                      <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                        <span className="material-symbols-outlined text-[13px]">verified</span> Verified Student
                      </span>
                    </div>

                    <p className="text-xs sm:text-sm text-slate-300 flex items-center justify-center sm:justify-start gap-1 font-medium">
                      <span className="material-symbols-outlined text-[15px] text-amber-400">mail</span> {user.email}
                    </p>

                    {/* Quick Metrics Badges */}
                    <div className="pt-2 flex items-center justify-center sm:justify-start gap-2.5 flex-wrap text-xs">
                      <span className="bg-white/10 text-white backdrop-blur-xs px-3 py-1 rounded-xl border border-white/10 flex items-center gap-1.5 font-semibold">
                        <span className="material-symbols-outlined text-amber-400 text-[15px]">favorite</span> {shortlist.length} Shortlisted
                      </span>
                      <span className="bg-white/10 text-white backdrop-blur-xs px-3 py-1 rounded-xl border border-white/10 flex items-center gap-1.5 font-semibold">
                        <span className="material-symbols-outlined text-indigo-400 text-[15px]">list_alt</span> {entries.length} Inquiries
                      </span>
                      <span className="bg-white/10 text-white backdrop-blur-xs px-3 py-1 rounded-xl border border-white/10 flex items-center gap-1.5 font-semibold">
                        <span className="material-symbols-outlined text-emerald-400 text-[15px]">folder</span> {Object.keys(user.documents || {}).length}/3 Vault Files
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 1: Personal & Academic Profile */}
              <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs p-6 md:p-8 space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                    <span className="material-symbols-outlined text-amber-600 text-[20px]">person</span> Personal & Academic Information
                  </h3>
                  <span className="text-xs text-slate-400 font-medium">Basic Profile</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-xs font-bold text-slate-700 mb-1.5 block">Full Name</label>
                    <input 
                      type="text" 
                      value={profileData.name} 
                      onChange={e => setProfileData({...profileData, name: e.target.value})} 
                      className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white text-slate-900 text-sm font-semibold transition-all" 
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 mb-1.5 block">Username</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-3.5 text-slate-400 font-bold text-[14px]">@</span>
                      <input 
                        type="text" 
                        value={profileData.username} 
                        onChange={e => setProfileData({...profileData, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '')})} 
                        className="w-full p-3.5 pl-8 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white text-slate-900 text-sm font-semibold transition-all" 
                        placeholder="username"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 mb-1.5 block">Phone Number</label>
                    <input 
                      type="text" 
                      value={profileData.phone} 
                      onChange={e => setProfileData({...profileData, phone: e.target.value})} 
                      className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white text-slate-900 text-sm font-semibold transition-all" 
                      placeholder="+91 98765 43210" 
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 mb-1.5 block">Email Address (Read-only)</label>
                    <input 
                      type="email" 
                      value={user.email} 
                      disabled 
                      className="w-full p-3.5 bg-slate-100 border border-slate-200 rounded-2xl text-slate-500 text-sm font-medium cursor-not-allowed" 
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 mb-1.5 block">Current School / Institution</label>
                    <input 
                      type="text" 
                      value={profileData.university} 
                      onChange={e => setProfileData({...profileData, university: e.target.value})} 
                      className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white text-slate-900 text-sm font-semibold transition-all" 
                      placeholder="e.g. Kendriya Vidyalaya / Delhi Public School" 
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button 
                    onClick={handleProfileUpdate} 
                    disabled={isUpdatingProfile} 
                    className="px-6 py-3 bg-slate-950 hover:bg-slate-800 text-white font-bold rounded-2xl text-xs flex items-center gap-2 shadow-xs transition-all disabled:opacity-50"
                  >
                    {isUpdatingProfile ? <span className="animate-spin material-symbols-outlined text-[16px]">refresh</span> : <span className="material-symbols-outlined text-[16px]">save</span>}
                    {isUpdatingProfile ? 'Saving...' : 'Save Profile Details'}
                  </button>
                </div>
              </div>

              {/* Section 2: Security & Password Update */}
              <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs p-6 md:p-8 space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                    <span className="material-symbols-outlined text-indigo-600 text-[20px]">lock</span> Account Security & Password
                  </h3>
                  <span className="text-xs text-slate-400 font-medium">Protection</span>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700 mb-1.5 block">Current Password</label>
                    <input 
                      type="password" 
                      placeholder="Enter current password" 
                      value={passData.current} 
                      onChange={e => setPassData({...passData, current: e.target.value})} 
                      className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white text-slate-900 text-sm font-medium transition-all" 
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-700 mb-1.5 block">New Password</label>
                      <input 
                        type="password" 
                        placeholder="Enter new password" 
                        value={passData.new} 
                        onChange={e => setPassData({...passData, new: e.target.value})} 
                        className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white text-slate-900 text-sm font-medium transition-all" 
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 mb-1.5 block">Confirm New Password</label>
                      <input 
                        type="password" 
                        placeholder="Confirm new password" 
                        value={passData.confirm} 
                        onChange={e => setPassData({...passData, confirm: e.target.value})} 
                        className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white text-slate-900 text-sm font-medium transition-all" 
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button 
                      onClick={handleSettingsSave} 
                      disabled={savingSettings} 
                      className="px-6 py-3 bg-slate-950 hover:bg-slate-800 text-white font-bold rounded-2xl text-xs flex items-center gap-2 shadow-xs transition-all disabled:opacity-50"
                    >
                      {savingSettings ? <span className="animate-spin material-symbols-outlined text-[16px]">refresh</span> : <span className="material-symbols-outlined text-[16px]">key</span>}
                      {savingSettings ? 'Updating...' : 'Update Password'}
                    </button>
                  </div>
                </div>

                {/* Security Recovery Question */}
                <div className="pt-6 border-t border-slate-100 space-y-4">
                  <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Account Recovery Question</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-700 mb-1.5 block">Security Question</label>
                      <select 
                        value={recoveryData.question} 
                        onChange={e => setRecoveryData({...recoveryData, question: e.target.value})}
                        className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 text-xs font-semibold outline-none focus:ring-2 focus:ring-amber-500 transition-all cursor-pointer"
                      >
                        {SECURITY_QUESTIONS.map(q => <option key={q} value={q}>{q}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 mb-1.5 block">Answer</label>
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          placeholder="Your secret answer" 
                          value={recoveryData.answer} 
                          onChange={e => setRecoveryData({...recoveryData, answer: e.target.value})} 
                          className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white text-slate-900 text-sm font-semibold transition-all" 
                        />
                        <button 
                          onClick={handleSaveSecurityQuestion} 
                          className="px-4 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-2xl text-xs shrink-0 transition-colors shadow-xs"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 3: App Preferences & Controls */}
              <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs p-6 md:p-8 space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                    <span className="material-symbols-outlined text-blue-600 text-[20px]">tune</span> App Preferences & Controls
                  </h3>
                  <span className="text-xs text-slate-400 font-medium">Customization</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Currency Switcher */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
                    <div>
                      <span className="font-bold text-xs text-slate-900 block">Currency Display</span>
                      <span className="text-[11px] text-slate-500">Toggle fee view in INR (₹) / RUB (₽)</span>
                    </div>
                    <button 
                      onClick={onToggleCurrency} 
                      className="px-3.5 py-2 bg-slate-950 hover:bg-slate-800 text-amber-400 font-extrabold rounded-xl text-xs flex items-center gap-1 shadow-xs transition-colors"
                    >
                      <span className="material-symbols-outlined text-[16px]">currency_exchange</span> Switch
                    </button>
                  </div>

                  {/* Theme Switcher */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
                    <div>
                      <span className="font-bold text-xs text-slate-900 block">Theme Mode</span>
                      <span className="text-[11px] text-slate-500">Current: {theme === 'dark' ? '🌙 Dark Mode' : '☀️ Light Mode'}</span>
                    </div>
                    {toggleTheme && (
                      <button 
                        onClick={toggleTheme} 
                        className="px-3.5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl text-xs flex items-center gap-1 transition-colors"
                      >
                        <span className="material-symbols-outlined text-[16px]">{theme === 'dark' ? 'light_mode' : 'dark_mode'}</span> Toggle
                      </button>
                    )}
                  </div>
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

        {/* Mobile Bottom Navigation Bar */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200 z-40 flex items-center justify-around py-2 px-1 shadow-lg">
          <button onClick={() => setActiveView('inquiries')} className={`flex flex-col items-center gap-0.5 text-[10px] font-semibold ${activeView === 'inquiries' ? 'text-[#0f172a] font-bold' : 'text-slate-400'}`}>
            <span className="material-symbols-outlined text-[20px]">dashboard</span>
            <span>Inquiries</span>
          </button>
          <button onClick={() => setActiveView('explorer')} className={`flex flex-col items-center gap-0.5 text-[10px] font-semibold ${activeView === 'explorer' ? 'text-[#0f172a] font-bold' : 'text-slate-400'}`}>
            <span className="material-symbols-outlined text-[20px]">travel_explore</span>
            <span>Explorer</span>
          </button>
          <button onClick={() => setActiveView('eligibility')} className={`flex flex-col items-center gap-0.5 text-[10px] font-semibold ${activeView === 'eligibility' ? 'text-[#0f172a] font-bold' : 'text-slate-400'}`}>
            <span className="material-symbols-outlined text-[20px]">verified</span>
            <span>Eligibility</span>
          </button>
          <button onClick={() => setActiveView('documents')} className={`flex flex-col items-center gap-0.5 text-[10px] font-semibold ${activeView === 'documents' ? 'text-[#0f172a] font-bold' : 'text-slate-400'}`}>
            <span className="material-symbols-outlined text-[20px]">folder</span>
            <span>Vault</span>
          </button>
          <button onClick={() => setActiveView('profile')} className={`flex flex-col items-center gap-0.5 text-[10px] font-semibold ${activeView === 'profile' ? 'text-[#0f172a] font-bold' : 'text-slate-400'}`}>
            <span className="material-symbols-outlined text-[20px]">person</span>
            <span>Profile</span>
          </button>
        </div>
      </div>
    </div>
  );
};
