import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FeedbackEntry, AIAnalysis, User, AppSettings, AdminRole, ChatSession, PlatformFeedback, FeatureFlags, DirectChat, DirectMessage, DirectMessageAttachment, DocumentMetadata } from '../types';
import { analyzeFeedback, generateSmartReply, analyzeChatHistory, generateStudentRecommendation, generateEmailDraft } from '../services/gemini';
import { addReply, registerUser, getAllAdmins, getAllStudents, deleteFeedback, deleteUser, updateUser, getChatHistory, getAllPlatformFeedback, updatePlatformFeedbackStatus, getUserFeedback, sendNotificationToUser, verifyUserDocument, deleteUserDocument, saveChatSessionToStore, getTeamMembers, saveTeamMembers } from '../services/db';
import { TeamMember } from '../data/teamData';
import { getAllDirectChats, sendDirectMessage, escalateChat, closeDirectChat } from '../services/directChat';
import { deleteFileFromCloudinary } from '../services/storage';
import { getSettings, saveSettings } from '../services/settings';
import { sendReplyNotification, sendTestEmail, sendDirectEmail } from '../services/email';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';
import { useLiveSync } from '../hooks/useLiveSync';
import { AuditLogsPage } from './AuditLogsPage';

interface AdminDashboardProps { feedbackList: FeedbackEntry[]; onRefresh: () => void; onLogout: () => void; isLoading?: boolean; currentUser: User; theme: 'light' | 'dark'; toggleTheme: () => void; }
type Tab = 'inquiries' | 'students' | 'admins' | 'insights' | 'settings' | 'chats' | 'chat_insights' | 'feedback_hub' | 'direct_chats' | 'audit_logs';

const PERMISSIONS: Record<AdminRole, Tab[]> = {
  'super_admin': ['inquiries', 'students', 'admins', 'insights', 'chats', 'chat_insights', 'direct_chats', 'feedback_hub', 'audit_logs', 'settings'],
  'manager': ['inquiries', 'students', 'admins', 'insights', 'chats', 'chat_insights', 'direct_chats', 'feedback_hub', 'settings'],
  'chat_officer': ['inquiries', 'admins', 'direct_chats'],
  'editor': ['admins', 'settings'],
  'support': ['inquiries', 'students', 'admins', 'chats', 'direct_chats']
};

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ feedbackList: initialFeedbackList, onRefresh, onLogout, isLoading, currentUser, theme, toggleTheme }) => {
  const navigate = useNavigate();
  const allowedTabs = PERMISSIONS[currentUser.adminRole || 'super_admin'] || PERMISSIONS['super_admin'];
  const [activeTab, setActiveTab] = useState<Tab>(allowedTabs[0]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [viewingStudent, setViewingStudent] = useState<User | null>(null);
  const [studentTab, setStudentTab] = useState<'profile' | 'documents' | 'activity'>('profile');
  const [students, setStudents] = useState<User[]>([]);
  const [admins, setAdmins] = useState<User[]>([]);
  const [localFeedback, setLocalFeedback] = useState<FeedbackEntry[]>(initialFeedbackList);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [platformFeedback, setPlatformFeedback] = useState<PlatformFeedback[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [chatAnalysis, setChatAnalysis] = useState<AIAnalysis | null>(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [isFetchingChats, setIsFetchingChats] = useState(false);
  const [isFetchingFeedback, setIsFetchingFeedback] = useState(false);
  const [sendingNotification, setSendingNotification] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isCreatingAdmin, setIsCreatingAdmin] = useState(false);
  const [studentInquiries, setStudentInquiries] = useState<FeedbackEntry[]>([]);
  const [studentChats, setStudentChats] = useState<ChatSession[]>([]);
  const [viewingChat, setViewingChat] = useState<ChatSession | null>(null);
  const [activeCommTab, setActiveCommTab] = useState<'email' | 'notification'>('email');
  const [notificationMsg, setNotificationMsg] = useState('');
  const [notificationType, setNotificationType] = useState<any>('info');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [emailTopic, setEmailTopic] = useState('');
  const [isGeneratingEmail, setIsGeneratingEmail] = useState(false);
  const [showAIDraftBox, setShowAIDraftBox] = useState(false);
  const [rejectingDoc, setRejectingDoc] = useState<{ type: string; id: string } | null>(null);
  const [rejectionRemarks, setRejectionRemarks] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminPass, setNewAdminPass] = useState('');
  const [newAdminRole, setNewAdminRole] = useState<AdminRole>('support');
  const [editingAdmin, setEditingAdmin] = useState<User | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [editingTeamCard, setEditingTeamCard] = useState<TeamMember | null>(null);
  const [isSavingTeamCard, setIsSavingTeamCard] = useState(false);
  const [directChats, setDirectChats] = useState<DirectChat[]>([]);
  const [activeDirectChat, setActiveDirectChat] = useState<DirectChat | null>(null);
  const [directChatMsg, setDirectChatMsg] = useState('');
  const [directChatAttachment, setDirectChatAttachment] = useState<DirectMessageAttachment | null>(null);
  const [isSendingDirect, setIsSendingDirect] = useState(false);
  const [escalateReason, setEscalateReason] = useState('');
  const [showEscalateModal, setShowEscalateModal] = useState(false);
  const [isFetchingDirectChats, setIsFetchingDirectChats] = useState(false);
  const [studentSort, setStudentSort] = useState<'name' | 'email'>('name');
  const [isFetchingStudents, setIsFetchingStudents] = useState(false);
  const [isFetchingAdmins, setIsFetchingAdmins] = useState(false);
  const [inquiryFilter, setInquiryFilter] = useState<'all' | 'pending' | 'resolved'>('all');
  const [inquirySort, setInquirySort] = useState<'newest' | 'oldest'>('newest');
  const [directChatSearch, setDirectChatSearch] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);

  const { feedback: liveFeedback, students: liveStudents } = useLiveSync(true);

  useEffect(() => { getSettings().then(setSettings); }, []);
  useEffect(() => { if (liveFeedback) setLocalFeedback(liveFeedback); if (liveStudents) { setStudents(liveStudents); if (viewingStudent) { const u = liveStudents.find(s => s.id === viewingStudent.id); if (u) setViewingStudent(u); } } }, [liveFeedback, liveStudents]);

  useEffect(() => {
    const fetchData = async () => {
      if (activeTab === 'students' && students.length === 0) { setIsFetchingStudents(true); try { const s = await getAllStudents(); if (Array.isArray(s)) setStudents(s); } catch (e) { console.error(e); } finally { setIsFetchingStudents(false); } }
      if (allowedTabs.includes('admins') && activeTab === 'admins') { setIsFetchingAdmins(true); getAllAdmins().then(setAdmins).finally(() => setIsFetchingAdmins(false)); }
      if (['chats', 'chat_insights'].includes(activeTab)) { setIsFetchingChats(true); getChatHistory().then(d => setChatSessions(Array.isArray(d) ? d : [])).catch(console.error).finally(() => setIsFetchingChats(false)); }
      if (activeTab === 'feedback_hub') { setIsFetchingFeedback(true); getAllPlatformFeedback().then(d => setPlatformFeedback(Array.isArray(d) ? d : [])).catch(console.error).finally(() => setIsFetchingFeedback(false)); }
      if (activeTab === 'direct_chats') { setIsFetchingDirectChats(true); getAllDirectChats().then(d => { setDirectChats(d); if (d.length > 0 && !activeDirectChat) setActiveDirectChat(d[0]); }).catch(console.error).finally(() => setIsFetchingDirectChats(false)); }
    };
    fetchData();
  }, [activeTab]);

  useEffect(() => { if (activeTab === 'admins') getTeamMembers().then(setTeamMembers); }, [activeTab]);
  useEffect(() => { if (viewingStudent) { getUserFeedback(viewingStudent.id).then(setStudentInquiries); getChatHistory().then(c => { if (Array.isArray(c)) setStudentChats(c.filter(s => s.userId === viewingStudent.id)); }); setNotificationMsg(''); setEmailSubject(''); setEmailBody(''); setActiveCommTab('email'); } }, [viewingStudent]);

  const applyEmailTemplate = (key: string) => { if (!viewingStudent) return; const t: Record<string, { s: string; b: string }> = { 'welcome': { s: 'Welcome to MedGuide Family', b: `Dear ${viewingStudent.name},\n\nWelcome aboard!\n\nRegards,\nAdmission Team` }, 'docs_needed': { s: 'Action Required: Missing Documents', b: `Dear ${viewingStudent.name},\n\nPlease upload pending documents.\n\nRegards,\nAdmission Team` }, 'verified': { s: 'Documents Verified Successfully', b: `Dear ${viewingStudent.name},\n\nGreat news! Your documents have been verified.\n\nRegards,\nAdmission Team` }, 'payment': { s: 'Payment Reminder', b: `Dear ${viewingStudent.name},\n\nPayment deadline reminder.\n\nRegards,\nFinance Team` } }; if (t[key]) { setEmailSubject(t[key].s); setEmailBody(t[key].b); } else { setEmailSubject(''); setEmailBody(''); } };
  const handleDeleteChat = async (id: string) => { if (window.confirm("Delete this chat session?")) { const n = chatSessions.filter(s => s.id !== id); setChatSessions(n); if (viewingChat?.id === id) setViewingChat(null); await saveChatSessionToStore(n); } };
  const getStudentActivity = () => { if (!viewingStudent) return []; const a: any[] = []; studentInquiries.forEach(inq => a.push({ type: 'inquiry', label: `Inquiry: ${inq.targetUniversity}`, date: inq.timestamp, desc: inq.message })); studentChats.forEach(chat => a.push({ type: 'chat', label: `Chat Session (${chat.messageCount} msgs)`, date: chat.startTime, desc: chat.messages[0]?.text || 'Started chat' })); if (viewingStudent.documents) { Object.entries(viewingStudent.documents).forEach(([key, doc]) => { const d = doc as DocumentMetadata; a.push({ type: 'doc', label: `Uploaded ${key.toUpperCase()}`, date: d.uploadedAt, desc: `Status: ${d.status}` }); }); } return a.sort((a, b) => b.date - a.date); };
  const studentActivityLog = getStudentActivity();
  const handleToggleFeature = (feature: keyof FeatureFlags) => { if (!settings) return; setSettings({ ...settings, features: { ...settings.features, [feature]: !settings.features?.[feature] } }); };
  const handleAIAnalysis = async () => { setLoadingAI(true); try { const r = await analyzeFeedback(localFeedback); setAnalysis(r); } catch (e: any) { alert(`Error: ${e.message}`); } finally { setLoadingAI(false); } };
  const handleChatAnalysis = async () => { setLoadingAI(true); try { const s = await getChatHistory(); const r = await analyzeChatHistory(s); setChatAnalysis(r); } catch (e: any) { alert(`Error: ${e.message}`); } finally { setLoadingAI(false); } };
  const handleVerifyDoc = async (t: any, s: any, r?: string) => { if (!viewingStudent) return; try { await verifyUserDocument(viewingStudent.id, t, s, r); alert("Updated"); setRejectingDoc(null); } catch (e: any) { alert(e.message); } };
  const handleDeleteDoc = async (t: any, p?: string) => { if (!viewingStudent) return; if (window.confirm("Delete?")) { if (p) await deleteFileFromCloudinary(p); await deleteUserDocument(viewingStudent.id, t); alert("Deleted"); } };
  const handleDeleteUser = async (email: string) => { if (window.confirm("Delete User?")) { await deleteUser(email); setViewingStudent(null); setStudents(await getAllStudents()); } };
  const handleCreateAdmin = async () => { setIsCreatingAdmin(true); try { await registerUser({ name: newAdminName, email: newAdminEmail, password: newAdminPass, role: 'admin', adminRole: newAdminRole }); alert("Created"); setAdmins(await getAllAdmins()); } catch (e: any) { alert(e.message); } finally { setIsCreatingAdmin(false); } };
  const handleUpdateAdmin = async () => { if (editingAdmin) { await updateUser(editingAdmin); alert("Updated"); setAdmins(await getAllAdmins()); setEditingAdmin(null); } };
  const handleSaveTeamCard = async (card: TeamMember) => { setIsSavingTeamCard(true); try { const u = [...teamMembers]; const i = u.findIndex(m => m.id === card.id); if (i !== -1) u[i] = card; else u.push(card); await saveTeamMembers(u); setTeamMembers(u); setEditingTeamCard(null); alert('Team card saved!'); } catch (e) { alert('Failed to save'); } finally { setIsSavingTeamCard(false); } };
  const handleDeleteTeamCard = async (id: string) => { if (!window.confirm('Remove this team member?')) return; const u = teamMembers.filter(m => m.id !== id); await saveTeamMembers(u); setTeamMembers(u); };
  const handleTeamCardImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => { if (!editingTeamCard) return; const file = e.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onloadend = () => setEditingTeamCard({ ...editingTeamCard, profileImage: reader.result as string }); reader.readAsDataURL(file); };
  const handleSendDirectMsg = async () => { if (!activeDirectChat || (!directChatMsg.trim() && !directChatAttachment)) return; setIsSendingDirect(true); try { const u = await sendDirectMessage(activeDirectChat.id, currentUser.id, currentUser.name, 'admin', directChatMsg.trim(), directChatAttachment || undefined); if (u) { setDirectChats(prev => prev.map(c => c.id === u.id ? u : c)); setActiveDirectChat(u); } setDirectChatMsg(''); setDirectChatAttachment(null); } catch (e) { alert('Failed to send'); } finally { setIsSendingDirect(false); } };
  const handleDirectChatFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (!file) return; if (file.size > 5 * 1024 * 1024) { alert('Max 5MB'); return; } const reader = new FileReader(); reader.onloadend = () => setDirectChatAttachment({ name: file.name, type: file.type, data: reader.result as string }); reader.readAsDataURL(file); };
  const handleEscalateChat = async () => { if (!activeDirectChat || !escalateReason.trim()) return; const u = await escalateChat(activeDirectChat.id, currentUser.id, currentUser.name, 'manager', escalateReason); if (u) { setDirectChats(prev => prev.map(c => c.id === u.id ? u : c)); setActiveDirectChat(u); } setEscalateReason(''); setShowEscalateModal(false); };
  const handleCloseDirectChat = async (chatId: string) => { await closeDirectChat(chatId); setDirectChats(prev => prev.map(c => c.id === chatId ? { ...c, status: 'closed' as const } : c)); if (activeDirectChat?.id === chatId) setActiveDirectChat(prev => prev ? { ...prev, status: 'closed' as const } : null); };
  const handleSaveSettings = async () => { if (settings) { setIsSavingSettings(true); await saveSettings(settings); setIsSavingSettings(false); alert("Saved"); } };
  const handleSendReply = async () => { if (!replyingTo || !replyText.trim()) return; try { await addReply(replyingTo, { adminName: currentUser.name, message: replyText }); setReplyingTo(null); setReplyText(''); onRefresh(); alert("Reply Sent"); } catch (e) { alert("Failed to reply"); } };
  const handleDeleteInquiry = async (id: string) => { await deleteFeedback(id); onRefresh(); };
  const handleTestEmail = async () => { if (settings) await saveSettings(settings); await sendTestEmail(currentUser.email); alert("Sent"); };
  const handleGenerateEmailDraft = async () => { setIsGeneratingEmail(true); try { const d = await generateEmailDraft(viewingStudent!.name, emailTopic, currentUser.name); setEmailBody(d); setShowAIDraftBox(false); } catch (e) { alert("AI Error"); } finally { setIsGeneratingEmail(false); } };
  const handleSendNotification = async () => { if (!viewingStudent) return; setSendingNotification(true); try { await sendNotificationToUser(viewingStudent.id, { title: "MedGuide Update", message: notificationMsg, type: notificationType }); alert("Sent"); setNotificationMsg(''); } catch (e) { alert("Fail"); } finally { setSendingNotification(false); } };
  const handleSendEmail = async () => { setSendingEmail(true); try { await sendDirectEmail(viewingStudent!.email, viewingStudent!.name, emailBody, currentUser.name); alert("Sent"); setEmailBody(''); setEmailSubject(''); } catch (e) { alert("Fail"); } finally { setSendingEmail(false); } };

  const formatTime = (timestamp?: number) => timestamp ? new Date(timestamp).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A';
  const sortedStudents = [...(Array.isArray(students) ? students : [])].sort((a, b) => studentSort === 'name' ? (a?.name || '').localeCompare(b?.name || '') : (a?.email || '').localeCompare(b?.email || ''));

  const inputCls = "w-full p-3 bg-white border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-[#0f172a] focus:border-[#0f172a] text-slate-800 text-sm";
  const labelCls = "text-xs font-semibold text-slate-500 mb-1.5 block tracking-wide";
  const cardCls = "bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-slate-200";

  const SkeletonRow = () => (
    <div className="flex items-center gap-4 p-4">
      <div className="w-10 h-10 bg-slate-200 rounded-full animate-pulse shrink-0"></div>
      <div className="flex-1 space-y-2">
        <div className="h-3 bg-slate-200 rounded animate-pulse" style={{width: `${40 + Math.random() * 30}%`}}></div>
        <div className="h-2 bg-slate-100 rounded animate-pulse" style={{width: `${60 + Math.random() * 30}%`}}></div>
      </div>
      <div className="w-16 h-6 bg-slate-100 rounded-full animate-pulse"></div>
    </div>
  );
  const SkeletonCard = () => (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-3">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-16 h-5 bg-slate-200 rounded animate-pulse"></div>
        <div className="w-12 h-4 bg-slate-100 rounded animate-pulse"></div>
      </div>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-slate-200 rounded-full animate-pulse"></div>
        <div className="flex-1 space-y-2">
          <div className="h-4 w-32 bg-slate-200 rounded animate-pulse"></div>
          <div className="h-2.5 w-48 bg-slate-100 rounded animate-pulse"></div>
        </div>
      </div>
      <div className="h-16 bg-slate-50 rounded-xl animate-pulse mt-3 border border-slate-100"></div>
    </div>
  );
  const SkeletonTable = ({ rows = 5 }: { rows?: number }) => (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="bg-slate-50 border-b border-slate-200 p-4 flex gap-8">
        {[...Array(4)].map((_, i) => <div key={i} className="h-3 bg-slate-200 rounded animate-pulse" style={{width: `${60 + Math.random() * 40}px`}}></div>)}
      </div>
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 border-b border-slate-100 last:border-0">
          <div className="w-10 h-10 bg-slate-200 rounded-full animate-pulse shrink-0"></div>
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-slate-200 rounded animate-pulse" style={{width: `${30 + Math.random() * 40}%`}}></div>
            <div className="h-2 bg-slate-100 rounded animate-pulse" style={{width: `${50 + Math.random() * 30}%`}}></div>
          </div>
          <div className="w-20 h-6 bg-slate-100 rounded-full animate-pulse"></div>
        </div>
      ))}
    </div>
  );
  const SkeletonSidebar = ({ count = 6 }: { count?: number }) => (
    <div className="space-y-1 p-2">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-lg">
          <div className="w-10 h-10 bg-slate-200 rounded-full animate-pulse shrink-0"></div>
          <div className="flex-1 space-y-1.5">
            <div className="h-3 bg-slate-200 rounded animate-pulse" style={{width: `${50 + Math.random() * 40}%`}}></div>
            <div className="h-2 bg-slate-100 rounded animate-pulse w-2/3"></div>
          </div>
        </div>
      ))}
    </div>
  );

  const filteredInquiries = localFeedback
    .filter(e => inquiryFilter === 'all' ? true : e.status === inquiryFilter)
    .sort((a, b) => inquirySort === 'newest' ? b.timestamp - a.timestamp : a.timestamp - b.timestamp);

  const filteredDirectChats = directChats.filter(c => !directChatSearch || c.studentName.toLowerCase().includes(directChatSearch.toLowerCase()));

  const filteredNavItems = [
    { id: 'inquiries', label: 'Inquiries', icon: 'dashboard' },
    { id: 'direct_chats', label: 'Direct Chats', icon: 'chat' },
    { id: 'chats', label: 'AI Chats', icon: 'forum' },
    { id: 'students', label: 'Students', icon: 'group' },
    { id: 'admins', label: 'Team', icon: 'shield' },
    { id: 'insights', label: 'Insights', icon: 'auto_awesome' },
    { id: 'chat_insights', label: 'Chat Insights', icon: 'psychology' },
    { id: 'feedback_hub', label: 'Feedback Hub', icon: 'rate_review' },
    { id: 'audit_logs', label: 'Audit Logs', icon: 'manage_search' },
    { id: 'settings', label: 'Settings', icon: 'settings' },
  ].filter(item => allowedTabs.includes(item.id as any));

  return (
    <div className="flex h-screen bg-[#f8fafc] font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 h-full shrink-0">
        <div className="h-24 flex flex-col justify-center px-6 border-b border-slate-100 shrink-0 cursor-pointer" onClick={() => navigate('/')}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#0B1A30] rounded flex items-center justify-center text-white font-bold text-sm shadow-sm">A</div>
            <div>
              <h1 className="font-bold text-[#0B1A30] text-lg leading-tight">Admin Portal</h1>
              <p className="text-[10px] font-semibold text-slate-500 tracking-wider">MEDGUIDE RUSSIA</p>
            </div>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1 mt-2">
          {filteredNavItems.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button 
                key={tab.id} 
                onClick={() => setActiveTab(tab.id as Tab)} 
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive 
                    ? 'bg-[#0f172a] text-white font-semibold shadow-sm' 
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">{tab.icon}</span>{tab.label}
              </button>
            )
          })}
        </div>

        <div className="p-4 border-t border-slate-200">
          <button onClick={onLogout} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors">
            <span className="material-symbols-outlined text-[18px]">logout</span>Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Top Header */}
        <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 z-20">
          <div className="hidden md:block">
            <h2 className="text-xl font-bold text-[#0f172a] capitalize">{activeTab.replace('_', ' ')} Management</h2>
            <p className="text-sm text-slate-500">Overview and controls for {activeTab.replace('_', ' ')}.</p>
          </div>
          
          <div className="flex items-center gap-4 ml-auto">
             <div className="relative">
              <button onClick={() => setShowNotifications(!showNotifications)} className="relative p-2 text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                <span className="material-symbols-outlined text-[22px]">notifications</span>
                {(currentUser.notifications?.filter(n => !n.isRead).length || 0) > 0 && <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>}
              </button>
              {showNotifications && (
                <div className="absolute right-0 top-12 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden">
                  <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                    <h4 className="font-bold text-slate-900 text-sm">Notifications</h4>
                    <button onClick={() => setShowNotifications(false)} className="text-slate-400 hover:text-slate-600"><span className="material-symbols-outlined text-[18px]">close</span></button>
                  </div>
                  <div className="max-h-72 overflow-y-auto">
                    {(!currentUser.notifications || currentUser.notifications.length === 0) ? (
                      <p className="p-6 text-center text-sm text-slate-500">No notifications</p>
                    ) : (
                      currentUser.notifications.slice(0, 10).map(n => (
                        <div key={n.id} className={`p-3 border-b border-slate-50 hover:bg-slate-50 transition-colors ${!n.isRead ? 'bg-indigo-50/50' : ''}`}>
                          <p className="text-sm font-semibold text-slate-800">{n.title}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{n.message}</p>
                          <p className="text-[10px] text-slate-400 mt-1">{new Date(n.timestamp).toLocaleString()}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right hidden md:block">
                <p className="text-sm font-bold text-slate-900">{currentUser.name}</p>
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">{currentUser.adminRole?.replace('_', ' ')}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center font-bold text-indigo-700 text-sm border-2 border-white shadow-sm">
                 {currentUser.name.charAt(0)}
              </div>
            </div>
          </div>
        </header>

        {/* Scrollable Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          
          {/* INQUIRIES TAB */}
          {activeTab === 'inquiries' && (
             <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-8">
               <div className="w-full lg:w-80 shrink-0">
                 <div className={`${cardCls} p-5 sticky top-0`}>
                   <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2"><span className="material-symbols-outlined text-slate-500 text-[20px]">filter_list</span> Filters</h3>
                   <div className="space-y-4">
                     <div>
                       <label className={labelCls}>Status</label>
                        <select className={inputCls} value={inquiryFilter} onChange={e => setInquiryFilter(e.target.value as any)}>
                          <option value="all">All Inquiries</option>
                          <option value="pending">Pending</option>
                          <option value="resolved">Resolved</option>
                        </select>
                     </div>
                     <div>
                       <label className={labelCls}>Sort By</label>
                        <select className={inputCls} value={inquirySort} onChange={e => setInquirySort(e.target.value as any)}>
                          <option value="newest">Newest First</option>
                          <option value="oldest">Oldest First</option>
                        </select>
                     </div>
                      <button onClick={() => { setInquiryFilter('all'); setInquirySort('newest'); }} className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-lg font-semibold text-sm transition-colors">
                        Reset Filters
                      </button>
                   </div>
                 </div>
               </div>

               <div className="flex-1 space-y-6">
                  {isLoading && <>{[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}</>}
                  {filteredInquiries.length === 0 && !isLoading && (
                    <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 text-slate-500">No inquiries yet.</div>
                  )}
                  {filteredInquiries.map(entry => (
                   <div key={entry.id} className={`${cardCls} overflow-hidden border-l-4 ${entry.status === 'pending' ? 'border-l-amber-500' : 'border-l-emerald-500'}`}>
                     <div className="p-6">
                       <div className="flex items-center gap-3 mb-4">
                         <span className={`px-2.5 py-1 text-xs font-semibold rounded ${entry.status === 'pending' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>{entry.status.toUpperCase()}</span>
                         <span className="text-slate-400 text-sm font-medium">#{entry.id.substring(0,4).toUpperCase()}</span>
                         <span className="text-slate-400 text-sm font-medium">• {new Date(entry.timestamp).toLocaleDateString()}</span>
                         
                         <div className="ml-auto flex gap-1">
                           <button onClick={() => { setReplyingTo(entry.id); setReplyText(''); }} className="p-2 text-slate-400 hover:text-[#0f172a] hover:bg-slate-100 rounded-lg transition-colors"><span className="material-symbols-outlined text-[18px]">reply</span></button>
                           <button onClick={() => handleDeleteInquiry(entry.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><span className="material-symbols-outlined text-[18px]">delete</span></button>
                         </div>
                       </div>
                       
                       <div className="flex items-start gap-4 mb-4">
                         <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm shrink-0">
                           {entry.name.charAt(0)}
                         </div>
                         <div>
                           <h4 className="text-base font-bold text-slate-900">{entry.name}</h4>
                           <p className="text-xs text-slate-500 font-medium">{entry.email} • {entry.phone}</p>
                           <div className="mt-2 text-xs font-bold text-slate-700 bg-slate-100 inline-block px-2 py-1 rounded border border-slate-200">{entry.targetUniversity || 'General Inquiry'}</div>
                         </div>
                       </div>

                       <p className="text-slate-700 leading-relaxed text-sm bg-slate-50 p-4 rounded-xl border border-slate-100">"{entry.message}"</p>
                       
                       {entry.replies && entry.replies.length > 0 && (
                         <div className="mt-4 pl-4 border-l-2 border-indigo-200 space-y-3">
                           {entry.replies.map(r => (
                             <div key={r.id}>
                               <p className="text-xs font-bold text-indigo-600 flex items-center gap-1 mb-1"><span className="material-symbols-outlined text-[14px]">admin_panel_settings</span> {r.adminName}</p>
                               <p className="text-sm text-slate-800">{r.message}</p>
                             </div>
                           ))}
                         </div>
                       )}

                       {replyingTo === entry.id && (
                         <div className="mt-4 flex gap-2">
                           <input className={`flex-1 ${inputCls}`} placeholder="Type your reply here..." value={replyText} onChange={e => setReplyText(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSendReply()} />
                           <button onClick={handleSendReply} className="px-5 py-2 bg-[#0f172a] text-white rounded-lg font-semibold text-sm shadow-sm hover:bg-slate-800 transition-colors">Send Reply</button>
                         </div>
                       )}
                     </div>
                   </div>
                 ))}
               </div>
             </div>
          )}

          {/* DIRECT CHATS TAB */}
          {activeTab === 'direct_chats' && (
            <div className="max-w-6xl mx-auto h-[calc(100vh-160px)] flex gap-6">
               <div className={`${cardCls} w-80 shrink-0 flex flex-col`}>
                  <div className="p-4 border-b border-slate-200">
                    <h3 className="font-bold text-slate-900 mb-3">Active Conversations</h3>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-3 top-2 text-slate-400 text-[18px]">search</span>
                      <input type="text" placeholder="Search student name..." value={directChatSearch} onChange={e => setDirectChatSearch(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-slate-300" />
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {isFetchingDirectChats ? <SkeletonSidebar /> : filteredDirectChats.length === 0 ? (
                      <p className="p-4 text-center text-sm text-slate-500">No conversations found.</p>
                    ) : (
                      filteredDirectChats.map(chat => (
                        <div key={chat.id} onClick={() => setActiveDirectChat(chat)} className={`p-4 border-b border-slate-100 cursor-pointer transition-colors hover:bg-slate-50 border-l-2 ${activeDirectChat?.id === chat.id ? 'bg-slate-50 border-[#0f172a]' : 'border-transparent'}`}>
                          <div className="flex justify-between items-baseline mb-1">
                            <h4 className="text-sm font-semibold text-slate-900 truncate pr-2">{chat.studentName}</h4>
                            <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded tracking-wider ${chat.status === 'open' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>{chat.status}</span>
                          </div>
                          <p className="text-xs text-slate-500 truncate">{chat.messages[chat.messages.length - 1]?.text || 'No messages yet'}</p>
                        </div>
                      ))
                    )}
                  </div>
               </div>
               
               <div className={`${cardCls} flex-1 flex flex-col`}>
                  {activeDirectChat ? (
                    <>
                      <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-white rounded-t-2xl">
                         <div className="flex items-center gap-3">
                           <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm shrink-0">{activeDirectChat.studentName.charAt(0)}</div>
                           <div>
                             <h4 className="font-bold text-slate-900 text-sm">{activeDirectChat.studentName}</h4>
                             <p className="text-xs text-slate-500 font-medium">{activeDirectChat.studentEmail}</p>
                           </div>
                         </div>
                         <div className="flex gap-2">
                           {activeDirectChat.status !== 'closed' && (
                             <>
                               <button onClick={() => setShowEscalateModal(true)} className="px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-amber-200 transition-colors">Escalate</button>
                               <button onClick={() => handleCloseDirectChat(activeDirectChat.id)} className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold uppercase tracking-wider border border-slate-200 hover:bg-slate-200 transition-colors">Close</button>
                             </>
                           )}
                         </div>
                      </div>
                      
                      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
                         {activeDirectChat.messages.map(msg => {
                           const isAdmin = msg.senderRole === 'admin';
                           return (
                             <div key={msg.id} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                               <div className={`max-w-[75%] p-4 rounded-2xl shadow-sm text-sm ${isAdmin ? 'bg-[#0f172a] text-white rounded-br-sm' : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm'}`}>
                                 <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${isAdmin ? 'text-slate-400' : 'text-slate-400'}`}>{msg.senderName}</p>
                                 <p className="leading-relaxed">{msg.text}</p>
                                 {msg.attachment && (
                                   <div className={`mt-3 p-3 rounded-lg flex items-center gap-3 ${isAdmin ? 'bg-white/10 border border-white/20' : 'bg-slate-50 border border-slate-200'}`}>
                                     <span className="material-symbols-outlined">description</span>
                                     <p className="font-semibold text-xs">{msg.attachment.name}</p>
                                   </div>
                                 )}
                                 <p className={`text-[10px] mt-2 text-right ${isAdmin ? 'text-slate-400' : 'text-slate-400'}`}>{new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                               </div>
                             </div>
                           )
                         })}
                      </div>

                      {activeDirectChat.status !== 'closed' && (
                        <div className="p-4 bg-white border-t border-slate-200 rounded-b-2xl">
                          <div className="flex items-center gap-2">
                            <label className="p-2.5 bg-slate-100 rounded-lg cursor-pointer hover:bg-slate-200 transition-colors">
                              <span className="material-symbols-outlined text-slate-500 text-[18px]">attach_file</span>
                              <input type="file" onChange={handleDirectChatFileUpload} className="hidden" />
                            </label>
                            <input className={`flex-1 ${inputCls} bg-slate-50`} placeholder="Type your response..." value={directChatMsg} onChange={e => setDirectChatMsg(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSendDirectMsg()} />
                            <button onClick={handleSendDirectMsg} disabled={isSendingDirect || (!directChatMsg.trim() && !directChatAttachment)} className="w-11 h-11 bg-[#0f172a] text-white rounded-lg flex items-center justify-center hover:bg-slate-800 transition-all shadow-sm disabled:opacity-50">
                              <span className="material-symbols-outlined text-[18px]">send</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                      <span className="material-symbols-outlined text-[48px] mb-4 opacity-50">forum</span>
                      <p className="text-sm font-medium">Select a student chat to view or reply</p>
                    </div>
                  )}
               </div>
            </div>
          )}

          {/* STUDENTS TAB */}
          {activeTab === 'students' && (
            <div className="max-w-7xl mx-auto">
              {!viewingStudent ? (
                <>
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-slate-900">Student Directory</h2>
                    <div className="flex items-center gap-4">
                      <select className={inputCls} value={studentSort} onChange={(e: any) => setStudentSort(e.target.value)}>
                        <option value="name">Sort by Name</option>
                        <option value="email">Sort by Email</option>
                      </select>
                    </div>
                  </div>
                  
                  {isFetchingStudents ? <SkeletonTable rows={6} /> : (
                  <div className={`${cardCls} overflow-hidden`}>
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                        <tr>
                          <th className="p-4">Student</th>
                          <th className="p-4">Contact</th>
                          <th className="p-4">Status</th>
                          <th className="p-4">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {sortedStudents.map(student => (
                          <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                            <td className="p-4 flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-700 font-bold flex items-center justify-center shrink-0">
                                {student.name.charAt(0)}
                              </div>
                              <div>
                                <p className="font-bold text-slate-900">{student.name}</p>
                                <p className="text-xs text-slate-500">Joined recently</p>
                              </div>
                            </td>
                            <td className="p-4 text-slate-600">
                              <p>{student.email}</p>
                              <p className="text-xs text-slate-400">{student.phone || 'No phone'}</p>
                            </td>
                            <td className="p-4">
                              <span className="px-2 py-1 bg-blue-50 text-blue-700 font-semibold text-xs rounded uppercase">
                                {student.eligibilityData ? 'Evaluated' : 'Pending'}
                              </span>
                            </td>
                            <td className="p-4">
                              <button onClick={() => setViewingStudent(student)} className="px-4 py-1.5 bg-[#0f172a] text-white text-xs font-bold rounded hover:bg-slate-800 transition-colors">
                                View Profile
                              </button>
                            </td>
                          </tr>
                        ))}
                        {sortedStudents.length === 0 && (
                          <tr><td colSpan={4} className="p-8 text-center text-slate-500">No students found.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  )}
                </>
              ) : (
                <div className="space-y-6">
                  {/* Student Detail Header */}
                  <div className={`${cardCls} p-6 flex items-start gap-6 relative`}>
                    <button onClick={() => setViewingStudent(null)} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 bg-slate-50 rounded-full transition-colors">
                      <span className="material-symbols-outlined">close</span>
                    </button>
                    
                    <div className="w-20 h-20 rounded-full bg-indigo-100 text-indigo-700 font-bold text-2xl flex items-center justify-center shrink-0">
                      {viewingStudent.name.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <h2 className="text-2xl font-bold text-slate-900">{viewingStudent.name}</h2>
                      <p className="text-slate-500">{viewingStudent.email} • {viewingStudent.phone || 'No phone'}</p>
                      <div className="mt-4 flex gap-2">
                        <button onClick={() => setStudentTab('profile')} className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${studentTab === 'profile' ? 'bg-[#0f172a] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>Profile</button>
                        <button onClick={() => setStudentTab('documents')} className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${studentTab === 'documents' ? 'bg-[#0f172a] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>Documents</button>
                        <button onClick={() => setStudentTab('activity')} className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${studentTab === 'activity' ? 'bg-[#0f172a] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>Activity & Comms</button>
                      </div>
                    </div>
                  </div>

                  {/* PROFILE TAB */}
                  {studentTab === 'profile' && (
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className={`${cardCls} p-6`}>
                        <h3 className="text-lg font-bold text-slate-900 mb-4">Demographics</h3>
                        <div className="space-y-3 text-sm">
                          <p className="flex justify-between"><span className="text-slate-500">Name</span> <span className="font-medium text-slate-900">{viewingStudent.name}</span></p>
                          <p className="flex justify-between"><span className="text-slate-500">Email</span> <span className="font-medium text-slate-900">{viewingStudent.email}</span></p>
                          <p className="flex justify-between"><span className="text-slate-500">Phone</span> <span className="font-medium text-slate-900">{viewingStudent.phone || 'N/A'}</span></p>
                          <p className="flex justify-between"><span className="text-slate-500">University</span> <span className="font-medium text-slate-900">{viewingStudent.university || 'N/A'}</span></p>
                        </div>
                        <div className="mt-8 border-t border-slate-100 pt-4">
                          <button onClick={() => handleDeleteUser(viewingStudent.email)} className="text-red-500 text-sm font-bold hover:underline flex items-center gap-1">
                            <span className="material-symbols-outlined text-[18px]">delete_forever</span> Delete Student Account
                          </button>
                        </div>
                      </div>

                      <div className={`${cardCls} p-6`}>
                        <h3 className="text-lg font-bold text-slate-900 mb-4">Eligibility Data</h3>
                        {viewingStudent.eligibilityData ? (
                          <div className="space-y-3 text-sm">
                            <p className="flex justify-between"><span className="text-slate-500">NEET Score</span> <span className="font-bold text-slate-900">{viewingStudent.eligibilityData.neetScore}</span></p>
                            <p className="flex justify-between"><span className="text-slate-500">12th PCB %</span> <span className="font-medium text-slate-900">{viewingStudent.eligibilityData.pcbPercentage}%</span></p>
                            <p className="flex justify-between"><span className="text-slate-500">Category</span> <span className="font-medium text-slate-900">{viewingStudent.eligibilityData.category}</span></p>
                            <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">AI Verdict</p>
                              <p className="text-sm text-slate-800 whitespace-pre-wrap">{viewingStudent.eligibilityResult || 'Pending'}</p>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-slate-500">No eligibility data submitted yet.</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* DOCUMENTS TAB */}
                  {studentTab === 'documents' && (
                    <div className="grid md:grid-cols-2 gap-6">
                      {['marksheet', 'passport', 'neetScoreCard'].map(docKey => {
                        const doc = viewingStudent.documents?.[docKey as keyof typeof viewingStudent.documents];
                        return (
                          <div key={docKey} className={`${cardCls} p-5 flex flex-col`}>
                            <h4 className="font-bold text-slate-900 mb-1 capitalize">{docKey.replace(/([A-Z])/g, ' $1').trim()}</h4>
                            {doc ? (
                              <>
                                <div className="flex items-center gap-3 mb-4">
                                  <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded ${doc.status === 'verified' ? 'bg-emerald-100 text-emerald-700' : doc.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                                    {doc.status}
                                  </span>
                                  <span className="text-xs text-slate-400">{new Date(doc.uploadedAt).toLocaleDateString()}</span>
                                </div>
                                <a href={doc.url} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 py-2 mb-4 bg-blue-50 text-blue-700 font-semibold rounded-lg hover:bg-blue-100 transition-colors text-sm">
                                  <span className="material-symbols-outlined text-[18px]">visibility</span> View Document
                                </a>
                                {doc.status === 'uploaded' && (
                                  <div className="mt-auto grid grid-cols-2 gap-2">
                                    <button onClick={() => handleVerifyDoc(docKey, 'verified')} className="py-2 bg-emerald-500 text-white font-bold rounded-lg text-sm hover:bg-emerald-600 transition-colors">Approve</button>
                                    <button onClick={() => setRejectingDoc({ type: docKey, id: viewingStudent.id })} className="py-2 bg-red-50 text-red-600 font-bold rounded-lg text-sm hover:bg-red-100 transition-colors">Reject</button>
                                  </div>
                                )}
                                {rejectingDoc?.type === docKey && (
                                  <div className="mt-3 p-3 bg-red-50 rounded-lg">
                                    <input type="text" className={`${inputCls} mb-2 bg-white`} placeholder="Reason for rejection..." value={rejectionRemarks} onChange={e => setRejectionRemarks(e.target.value)} />
                                    <div className="flex gap-2">
                                      <button onClick={() => handleVerifyDoc(docKey, 'rejected', rejectionRemarks)} className="px-3 py-1 bg-red-600 text-white rounded text-xs font-bold hover:bg-red-700">Confirm Reject</button>
                                      <button onClick={() => setRejectingDoc(null)} className="px-3 py-1 bg-slate-200 text-slate-700 rounded text-xs font-bold hover:bg-slate-300">Cancel</button>
                                    </div>
                                  </div>
                                )}
                              </>
                            ) : (
                              <div className="py-8 text-center text-slate-400 bg-slate-50 rounded-lg mt-2 border border-dashed border-slate-200 flex-1 flex flex-col justify-center items-center">
                                <span className="material-symbols-outlined text-[32px] mb-2 opacity-50">description</span>
                                <p className="text-sm">Not uploaded yet</p>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* ACTIVITY & COMMS TAB */}
                  {studentTab === 'activity' && (
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className={`${cardCls} flex flex-col max-h-[600px]`}>
                        <div className="p-6 border-b border-slate-100">
                          <h3 className="text-lg font-bold text-slate-900">Communication Center</h3>
                        </div>
                        <div className="p-4 border-b border-slate-100 flex gap-4">
                           <button onClick={() => setActiveCommTab('email')} className={`text-sm font-semibold pb-2 border-b-2 transition-colors ${activeCommTab === 'email' ? 'border-[#0f172a] text-[#0f172a]' : 'border-transparent text-slate-500'}`}>Direct Email</button>
                           <button onClick={() => setActiveCommTab('notification')} className={`text-sm font-semibold pb-2 border-b-2 transition-colors ${activeCommTab === 'notification' ? 'border-[#0f172a] text-[#0f172a]' : 'border-transparent text-slate-500'}`}>In-App Notification</button>
                        </div>
                        <div className="p-6 flex-1 overflow-y-auto">
                           {activeCommTab === 'email' ? (
                             <div className="space-y-4">
                               <div className="flex flex-wrap gap-2 mb-4">
                                  {['welcome', 'docs_needed', 'verified', 'payment'].map(tpl => (
                                    <button key={tpl} onClick={() => applyEmailTemplate(tpl)} className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-semibold hover:bg-slate-200 capitalize">
                                      {tpl.replace('_', ' ')}
                                    </button>
                                  ))}
                               </div>
                               <div>
                                 <label className={labelCls}>Subject</label>
                                 <input type="text" className={inputCls} value={emailSubject} onChange={e => setEmailSubject(e.target.value)} placeholder="Email Subject" />
                               </div>
                               <div>
                                 <label className={labelCls}>Body</label>
                                 <textarea className={`${inputCls} min-h-[150px] resize-none`} value={emailBody} onChange={e => setEmailBody(e.target.value)} placeholder="Type message..." />
                               </div>
                               <button onClick={handleSendEmail} disabled={sendingEmail || !emailBody.trim()} className="w-full py-2.5 bg-[#0f172a] text-white font-bold rounded-lg hover:bg-slate-800 disabled:opacity-70 transition-colors">
                                 {sendingEmail ? 'Sending...' : 'Send Email'}
                               </button>
                             </div>
                           ) : (
                             <div className="space-y-4">
                                <div>
                                  <label className={labelCls}>Notification Type</label>
                                  <select className={inputCls} value={notificationType} onChange={e => setNotificationType(e.target.value)}>
                                    <option value="info">Information</option>
                                    <option value="success">Success</option>
                                    <option value="alert">Alert / Warning</option>
                                  </select>
                                </div>
                                <div>
                                  <label className={labelCls}>Message</label>
                                  <textarea className={`${inputCls} min-h-[100px] resize-none`} value={notificationMsg} onChange={e => setNotificationMsg(e.target.value)} placeholder="Keep it brief..." />
                                </div>
                                <button onClick={handleSendNotification} disabled={sendingNotification || !notificationMsg.trim()} className="w-full py-2.5 bg-[#0f172a] text-white font-bold rounded-lg hover:bg-slate-800 disabled:opacity-70 transition-colors">
                                 {sendingNotification ? 'Sending...' : 'Push Notification'}
                               </button>
                             </div>
                           )}
                        </div>
                      </div>

                      <div className={`${cardCls} flex flex-col max-h-[600px]`}>
                        <div className="p-6 border-b border-slate-100">
                          <h3 className="text-lg font-bold text-slate-900">Unified Activity Log</h3>
                        </div>
                        <div className="p-6 flex-1 overflow-y-auto">
                          {studentActivityLog.length === 0 ? (
                            <p className="text-center text-slate-500 py-10">No activity recorded yet.</p>
                          ) : (
                            <div className="space-y-6">
                              {studentActivityLog.map((log, i) => (
                                <div key={i} className="flex gap-4 relative">
                                  {i !== studentActivityLog.length - 1 && <div className="absolute top-8 left-3.5 w-0.5 h-full bg-slate-200"></div>}
                                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 z-10 ${log.type === 'doc' ? 'bg-emerald-100 text-emerald-600' : log.type === 'inquiry' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'}`}>
                                    <span className="material-symbols-outlined text-[14px]">
                                      {log.type === 'doc' ? 'description' : log.type === 'inquiry' ? 'help' : 'forum'}
                                    </span>
                                  </div>
                                  <div className="pb-4">
                                    <p className="font-bold text-slate-900 text-sm">{log.label}</p>
                                    <p className="text-xs text-slate-400 mb-1">{formatTime(log.date)}</p>
                                    <p className="text-sm text-slate-600 bg-slate-50 p-2 rounded-lg mt-1">{log.desc}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          {/* ADMINS & TEAM TAB */}
          {activeTab === 'admins' && (
            <div className="max-w-7xl mx-auto space-y-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-slate-900">Team & Admin Management</h2>
                <div className="flex gap-4">
                  <button onClick={() => setIsCreatingAdmin(true)} className="px-4 py-2 bg-[#0f172a] text-white text-sm font-bold rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px]">add</span> New Admin
                  </button>
                  <button onClick={() => {
                     setEditingTeamCard({id: Date.now().toString(), name:'', role:'', profileImage:'', bio:'', emoji:'👨‍💼', specialization:'', isFeatured:false});
                  }} className="px-4 py-2 bg-slate-200 text-slate-800 text-sm font-bold rounded-lg hover:bg-slate-300 transition-colors flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px]">person_add</span> Add Public Team Card
                  </button>
                </div>
              </div>

              {/* Admin Accounts */}
              {isFetchingAdmins ? <SkeletonTable rows={4} /> : (
              <div className={`${cardCls} overflow-hidden mb-8`}>
                <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
                  <span className="material-symbols-outlined text-slate-400">admin_panel_settings</span>
                  <h3 className="font-bold text-slate-900">Platform Administrators</h3>
                </div>
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-xs">
                    <tr>
                      <th className="p-4">Name</th>
                      <th className="p-4">Email</th>
                      <th className="p-4">Role</th>
                      <th className="p-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {admins.map(admin => (
                      <tr key={admin.id}>
                        <td className="p-4 font-bold text-slate-900 flex items-center gap-2">
                           <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center shrink-0">
                             {admin.name.charAt(0)}
                           </div>
                           {admin.name}
                        </td>
                        <td className="p-4 text-slate-600">{admin.email}</td>
                        <td className="p-4">
                           <span className="px-2 py-1 bg-purple-50 text-purple-700 font-semibold text-[10px] rounded uppercase tracking-wide">
                             {admin.adminRole || 'admin'}
                           </span>
                        </td>
                        <td className="p-4">
                           <span className="px-2 py-1 bg-emerald-50 text-emerald-700 font-semibold text-[10px] rounded uppercase">Active</span>
                        </td>
                      </tr>
                    ))}
                    {admins.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-slate-500">No admins found.</td></tr>}
                  </tbody>
                </table>
              </div>
              )}

              {/* Public Team Cards */}
              <div className={`${cardCls} overflow-hidden`}>
                <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
                  <span className="material-symbols-outlined text-slate-400">groups</span>
                  <h3 className="font-bold text-slate-900">Public Team Cards (About Us Section)</h3>
                </div>
                {teamMembers.length === 0 ? (
                  <p className="p-8 text-center text-slate-500">No team members added for the public site.</p>
                ) : (
                  <div className="grid md:grid-cols-3 gap-6 p-6 bg-slate-50/50">
                    {teamMembers.map(member => (
                      <div key={member.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative group">
                        <button onClick={() => {
                          setEditingTeamCard(member);
                        }} className="absolute top-4 right-4 p-2 bg-slate-100 text-slate-500 rounded-full hover:bg-indigo-50 hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition-all">
                          <span className="material-symbols-outlined text-[16px]">edit</span>
                        </button>
                        <button onClick={() => handleDeleteTeamCard(member.id)} className="absolute top-4 right-14 p-2 bg-slate-100 text-slate-500 rounded-full hover:bg-red-50 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all">
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                        </button>
                        <div className="w-20 h-20 rounded-full bg-slate-200 mx-auto mb-4 overflow-hidden border-4 border-slate-50">
                          {member.profileImage ? (
                            <img src={member.profileImage} alt={member.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold text-2xl">{member.name.charAt(0)}</div>
                          )}
                        </div>
                        <h4 className="text-center font-bold text-slate-900 text-lg">{member.name}</h4>
                        <p className="text-center text-sm font-semibold text-indigo-600 mb-3">{member.role}</p>
                        <p className="text-center text-xs text-slate-500">{member.bio}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Edit/Create Team Member Modal Overlay */}
              {editingTeamCard && (
                <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                  <div className={`${cardCls} w-full max-w-md p-6 relative`}>
                    <button onClick={() => setEditingTeamCard(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-700">
                      <span className="material-symbols-outlined">close</span>
                    </button>
                    <h3 className="text-xl font-bold text-slate-900 mb-6">{editingTeamCard.id ? 'Edit Team Member' : 'New Team Member'}</h3>
                    <div className="space-y-4">
                      <div>
                        <label className={labelCls}>Full Name</label>
                        <input type="text" className={inputCls} value={editingTeamCard.name} onChange={e => setEditingTeamCard({...editingTeamCard, name: e.target.value})} />
                      </div>
                      <div>
                        <label className={labelCls}>Role / Title</label>
                        <input type="text" className={inputCls} value={editingTeamCard.role} onChange={e => setEditingTeamCard({...editingTeamCard, role: e.target.value})} />
                      </div>
                      <div>
                        <label className={labelCls}>Profile Image URL</label>
                        <input type="text" className={inputCls} value={editingTeamCard.profileImage || ''} onChange={e => setEditingTeamCard({...editingTeamCard, profileImage: e.target.value})} />
                      </div>
                      <div>
                        <label className={labelCls}>Short Bio</label>
                        <textarea className={`${inputCls} min-h-[80px] resize-none`} value={editingTeamCard.bio} onChange={e => setEditingTeamCard({...editingTeamCard, bio: e.target.value})} />
                      </div>
                      <button onClick={() => handleSaveTeamCard(editingTeamCard)} disabled={isSavingTeamCard} className="w-full py-2.5 bg-[#0f172a] text-white font-bold rounded-lg hover:bg-slate-800 disabled:opacity-70 transition-colors mt-2">
                        {isSavingTeamCard ? 'Saving...' : 'Save Card'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Create Admin Modal Overlay */}
              {isCreatingAdmin && (
                <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                  <div className={`${cardCls} w-full max-w-md p-6 relative`}>
                    <button onClick={() => setIsCreatingAdmin(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-700">
                      <span className="material-symbols-outlined">close</span>
                    </button>
                    <h3 className="text-xl font-bold text-slate-900 mb-6">Create New Admin</h3>
                    <div className="space-y-4">
                      <div>
                        <label className={labelCls}>Full Name</label>
                        <input type="text" className={inputCls} value={newAdminName} onChange={e => setNewAdminName(e.target.value)} />
                      </div>
                      <div>
                        <label className={labelCls}>Email Address</label>
                        <input type="email" className={inputCls} value={newAdminEmail} onChange={e => setNewAdminEmail(e.target.value)} />
                      </div>
                      <div>
                        <label className={labelCls}>Temporary Password</label>
                        <input type="password" className={inputCls} value={newAdminPass} onChange={e => setNewAdminPass(e.target.value)} />
                      </div>
                      <div>
                        <label className={labelCls}>Role Level</label>
                        <select className={inputCls} value={newAdminRole} onChange={e => setNewAdminRole(e.target.value as AdminRole)}>
                          <option value="manager">Manager</option>
                          <option value="chat_officer">Chat Officer</option>
                          <option value="editor">Content Editor</option>
                          <option value="support">Support Staff</option>
                        </select>
                      </div>
                      <button onClick={handleCreateAdmin} disabled={isCreatingAdmin || !newAdminEmail || !newAdminPass || !newAdminName} className="w-full py-2.5 bg-[#0f172a] text-white font-bold rounded-lg hover:bg-slate-800 disabled:opacity-70 transition-colors mt-2">
                        {isCreatingAdmin ? 'Creating...' : 'Create Admin Account'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          {activeTab === 'settings' && settings && (
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-slate-900">Platform Settings</h2>
                <button onClick={handleSaveSettings} disabled={isSavingSettings} className="px-6 py-2.5 bg-[#0f172a] text-white font-bold rounded-lg shadow-sm hover:bg-slate-800 disabled:opacity-70 transition-colors">
                  {isSavingSettings ? 'Saving...' : 'Save All Settings'}
                </button>
              </div>

              <div className={`${cardCls} p-6`}>
                <h3 className="text-lg font-bold text-slate-900 mb-4 border-b border-slate-100 pb-2">Feature Flags</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  {Object.entries(settings.features || {}).filter(([key]) => key !== 'eligibilityCheck').map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                      <div>
                        <p className="font-semibold text-slate-900 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
                        <p className="text-xs text-slate-500">Enable or disable this module globally.</p>
                      </div>
                      <button onClick={() => handleToggleFeature(key as keyof FeatureFlags)} className={`w-12 h-6 rounded-full transition-colors relative ${value ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                        <span className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${value ? 'translate-x-6' : 'translate-x-0'}`}></span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className={`${cardCls} p-6`}>
                <h3 className="text-lg font-bold text-slate-900 mb-4 border-b border-slate-100 pb-2">System Prompts</h3>
                <div className="space-y-4">
                  <div>
                    <label className={labelCls}>Eligibility Checker AI Prompt</label>
                    <textarea 
                      className={`${inputCls} min-h-[100px] resize-none`} 
                      value={settings.systemPrompts?.eligibilityChecker || ''} 
                      onChange={e => setSettings({...settings, systemPrompts: {...settings.systemPrompts, eligibilityChecker: e.target.value} as any})}
                    />
                    <p className="text-[10px] text-slate-500 mt-1">Instructions for Groq when analyzing a student's eligibility.</p>
                  </div>
                  <div>
                    <label className={labelCls}>Chat Bot Welcome Message</label>
                    <input 
                      type="text" 
                      className={inputCls} 
                      value={settings.chatBot.welcomeMessage} 
                      onChange={e => setSettings({...settings, chatBot: {...settings.chatBot, welcomeMessage: e.target.value}})}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Chat Bot AI Prompt</label>
                    <textarea 
                      className={`${inputCls} min-h-[100px] resize-none`} 
                      value={settings.systemPrompts?.chatBot || ''} 
                      onChange={e => setSettings({...settings, systemPrompts: {...settings.systemPrompts, chatBot: e.target.value} as any})}
                    />
                    <p className="text-[10px] text-slate-500 mt-1">Instructions for Groq when responding to inquiries in the chat widget.</p>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* AI CHATS TAB */}
          {activeTab === 'chats' && (
            <div className="max-w-7xl mx-auto h-[calc(100vh-160px)] flex gap-6">
              {/* Sidebar List */}
              <div className={`${cardCls} w-80 shrink-0 flex flex-col`}>
                <div className="p-4 border-b border-slate-100">
                  <h3 className="font-bold text-slate-900">AI Chat Sessions</h3>
                  <p className="text-xs text-slate-500">{chatSessions.length} total sessions</p>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                  {chatSessions.length === 0 ? (
                    <p className="p-4 text-center text-sm text-slate-500">No AI chats found.</p>
                  ) : (
                    chatSessions.map(session => (
                      <button key={session.id} onClick={() => setViewingChat(session)} className={`w-full text-left p-3 rounded-lg transition-colors flex items-center justify-between group ${viewingChat?.id === session.id ? 'bg-indigo-50 border border-indigo-100' : 'hover:bg-slate-50 border border-transparent'}`}>
                        <div>
                          <p className={`font-semibold text-sm truncate ${viewingChat?.id === session.id ? 'text-indigo-900' : 'text-slate-700'}`}>{session.visitorName || 'Anonymous'}</p>
                          <p className="text-xs text-slate-400 mt-1">{new Date(session.lastMessageTime).toLocaleString()}</p>
                        </div>
                        <div onClick={e => { e.stopPropagation(); handleDeleteChat(session.id); }} className="w-8 h-8 rounded hover:bg-red-100 text-red-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all" title="Delete Session">
                           <span className="material-symbols-outlined text-[16px]">delete</span>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* Chat View */}
              <div className={`${cardCls} flex-1 flex flex-col`}>
                {viewingChat ? (
                  <>
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-t-2xl">
                      <div>
                        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                          <span className="material-symbols-outlined text-indigo-600">robot_2</span> AI Chat Transcript
                        </h3>
                        <p className="text-sm text-slate-500 mt-1">Chatting with: <span className="font-medium text-slate-700">{viewingChat.visitorName || 'Anonymous Visitor'}</span></p>
                      </div>
                      <span className="px-3 py-1 bg-slate-200 text-slate-700 text-xs font-bold rounded-full">{viewingChat.messageCount} Messages</span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/30">
                      {viewingChat.messages.map((m, i) => (
                        <div key={i} className={`flex gap-4 ${m.role === 'model' ? '' : 'flex-row-reverse'}`}>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1 ${m.role === 'model' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-600'}`}>
                            {m.role === 'model' ? <span className="material-symbols-outlined text-[16px]">robot_2</span> : <span className="material-symbols-outlined text-[16px]">person</span>}
                          </div>
                          <div className={`p-4 rounded-2xl max-w-[80%] ${m.role === 'model' ? 'bg-white border border-slate-200 text-slate-700 rounded-tl-sm shadow-sm' : 'bg-[#0f172a] text-white rounded-tr-sm'}`}>
                            <p className="whitespace-pre-wrap text-sm leading-relaxed">{m.text}</p>
                            <p className={`text-[10px] mt-2 ${m.role === 'model' ? 'text-slate-400' : 'text-slate-400'}`}>{new Date(m.timestamp).toLocaleTimeString()}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                    <span className="material-symbols-outlined text-4xl mb-4 opacity-50">forum</span>
                    <p>Select a chat session to view the transcript</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* CHAT INSIGHTS TAB */}
          {activeTab === 'chat_insights' && (
            <div className="max-w-6xl mx-auto space-y-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">AI Chat Insights</h2>
                  <p className="text-slate-500 mt-1">Analyze all recorded AI chat sessions to discover common questions and concerns.</p>
                </div>
                <button onClick={handleChatAnalysis} disabled={loadingAI} className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-lg shadow-md hover:shadow-lg disabled:opacity-70 transition-all flex items-center gap-2">
                  <span className={`material-symbols-outlined ${loadingAI ? 'animate-spin' : ''}`}>magic_button</span> 
                  {loadingAI ? 'Analyzing Transcripts...' : 'Generate AI Insights'}
                </button>
              </div>

              {chatAnalysis ? (
                 <div className="grid lg:grid-cols-3 gap-6">
                   <div className="lg:col-span-2 space-y-6">
                     <div className={`${cardCls} p-8 bg-gradient-to-br from-indigo-50 to-white border-indigo-100`}>
                        <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2"><span className="material-symbols-outlined text-indigo-600">summarize</span> Executive Summary</h3>
                        <p className="text-slate-700 leading-relaxed">{chatAnalysis.summary}</p>
                     </div>
                     <div className={`${cardCls} p-6`}>
                        <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2"><span className="material-symbols-outlined text-amber-500">warning</span> Common User Concerns</h3>
                        <ul className="space-y-3">
                          {chatAnalysis.commonConcerns.map((c, i) => (
                             <li key={i} className="flex gap-3 text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100"><span className="text-amber-500 font-bold">•</span> {c}</li>
                          ))}
                        </ul>
                     </div>
                     {chatAnalysis.strategicInsight && (
                       <div className={`${cardCls} p-6 bg-slate-900 text-white`}>
                          <h3 className="font-bold mb-4 flex items-center gap-2"><span className="material-symbols-outlined text-emerald-400">lightbulb</span> Strategic Recommendation</h3>
                          <p className="text-slate-300 leading-relaxed">{chatAnalysis.strategicInsight}</p>
                       </div>
                     )}
                   </div>
                   <div className="space-y-6">
                     <div className={`${cardCls} p-6`}>
                        <h3 className="font-bold text-slate-900 mb-4">Sentiment Breakdown</h3>
                        <ResponsiveContainer width="100%" height={220}>
                          <PieChart>
                            <Pie data={[{name:'Positive',value:chatAnalysis.sentiment.positive},{name:'Neutral',value:chatAnalysis.sentiment.neutral},{name:'Negative',value:chatAnalysis.sentiment.negative}]} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value" label={({name,value})=>`${name}: ${value}%`} labelLine={false}>
                              <Cell fill="#10b981" />
                              <Cell fill="#94a3b8" />
                              <Cell fill="#ef4444" />
                            </Pie>
                            <RechartsTooltip />
                            <Legend verticalAlign="bottom" height={36} />
                          </PieChart>
                        </ResponsiveContainer>
                     </div>
                     <div className={`${cardCls} p-6`}>
                        <h3 className="font-bold text-slate-900 mb-4">Top Themes</h3>
                        <ResponsiveContainer width="100%" height={Math.max(200, chatAnalysis.themes.length * 45)}>
                          <BarChart data={chatAnalysis.themes} layout="vertical" margin={{left:20,right:20,top:5,bottom:5}}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis type="number" tick={{fontSize:12}} />
                            <YAxis type="category" dataKey="topic" tick={{fontSize:11}} width={100} />
                            <RechartsTooltip />
                            <Bar dataKey="count" radius={[0,6,6,0]}>
                              {chatAnalysis.themes.map((_:any,i:number)=>(<Cell key={i} fill={['#6366f1','#8b5cf6','#a78bfa','#c4b5fd','#ddd6fe','#ede9fe'][i%6]} />))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                     </div>
                   </div>
                 </div>
              ) : (
                <div className={`${cardCls} p-12 flex flex-col items-center justify-center text-center`}>
                  <div className="w-16 h-16 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center mb-4">
                    <span className="material-symbols-outlined text-3xl">analytics</span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">No Insights Generated Yet</h3>
                  <p className="text-slate-500 max-w-md mx-auto">Click the button above to run Groq AI analysis on all past chat sessions to discover what students are asking the bot about most frequently.</p>
                </div>
              )}
            </div>
          )}

          {/* INQUIRY INSIGHTS TAB */}
          {activeTab === 'insights' && (
            <div className="max-w-6xl mx-auto space-y-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Inquiry Insights</h2>
                  <p className="text-slate-500 mt-1">Analyze all admission inquiries to discover trends and user needs.</p>
                </div>
                <button onClick={handleAIAnalysis} disabled={loadingAI} className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-lg shadow-md hover:shadow-lg disabled:opacity-70 transition-all flex items-center gap-2">
                  <span className={`material-symbols-outlined ${loadingAI ? 'animate-spin' : ''}`}>magic_button</span> 
                  {loadingAI ? 'Analyzing Inquiries...' : 'Generate Form Insights'}
                </button>
              </div>

              {analysis ? (
                 <div className="grid lg:grid-cols-3 gap-6">
                   <div className="lg:col-span-2 space-y-6">
                     <div className={`${cardCls} p-8 bg-gradient-to-br from-blue-50 to-white border-blue-100`}>
                        <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2"><span className="material-symbols-outlined text-blue-600">summarize</span> Executive Summary</h3>
                        <p className="text-slate-700 leading-relaxed">{analysis.summary}</p>
                     </div>
                     <div className={`${cardCls} p-6`}>
                        <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2"><span className="material-symbols-outlined text-amber-500">warning</span> Common User Concerns</h3>
                        <ul className="space-y-3">
                          {analysis.commonConcerns.map((c, i) => (
                             <li key={i} className="flex gap-3 text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100"><span className="text-amber-500 font-bold">•</span> {c}</li>
                          ))}
                        </ul>
                     </div>
                     <div className={`${cardCls} p-6`}>
                        <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2"><span className="material-symbols-outlined text-emerald-500">add_task</span> Suggested Content Ideas</h3>
                        <ul className="space-y-3">
                          {analysis.suggestedContentIdeas.map((c, i) => (
                             <li key={i} className="flex gap-3 text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100"><span className="text-emerald-500 font-bold">•</span> {c}</li>
                          ))}
                        </ul>
                     </div>
                   </div>
                   <div className="space-y-6">
                     <div className={`${cardCls} p-6`}>
                        <h3 className="font-bold text-slate-900 mb-4">Sentiment Breakdown</h3>
                        <ResponsiveContainer width="100%" height={220}>
                          <PieChart>
                            <Pie data={[{name:'Positive',value:analysis.sentiment.positive},{name:'Neutral',value:analysis.sentiment.neutral},{name:'Negative',value:analysis.sentiment.negative}]} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value" label={({name,value})=>`${name}: ${value}%`} labelLine={false}>
                              <Cell fill="#10b981" />
                              <Cell fill="#94a3b8" />
                              <Cell fill="#ef4444" />
                            </Pie>
                            <RechartsTooltip />
                            <Legend verticalAlign="bottom" height={36} />
                          </PieChart>
                        </ResponsiveContainer>
                     </div>
                     <div className={`${cardCls} p-6`}>
                        <h3 className="font-bold text-slate-900 mb-4">Top Themes</h3>
                        <ResponsiveContainer width="100%" height={Math.max(200, analysis.themes.length * 45)}>
                          <BarChart data={analysis.themes} layout="vertical" margin={{left:20,right:20,top:5,bottom:5}}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis type="number" tick={{fontSize:12}} />
                            <YAxis type="category" dataKey="topic" tick={{fontSize:11}} width={100} />
                            <RechartsTooltip />
                            <Bar dataKey="count" radius={[0,6,6,0]}>
                              {analysis.themes.map((_:any,i:number)=>(<Cell key={i} fill={['#6366f1','#8b5cf6','#a78bfa','#c4b5fd','#ddd6fe','#ede9fe'][i%6]} />))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                     </div>
                   </div>
                 </div>
              ) : (
                <div className={`${cardCls} p-12 flex flex-col items-center justify-center text-center`}>
                  <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-4">
                    <span className="material-symbols-outlined text-3xl">insights</span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">No Insights Generated Yet</h3>
                  <p className="text-slate-500 max-w-md mx-auto">Click the button above to run Groq AI analysis on all past student inquiries to discover what students are looking for most frequently.</p>
                </div>
              )}
            </div>
          )}

          {/* FEEDBACK HUB TAB */}
          {activeTab === 'feedback_hub' && (
            <div className="max-w-7xl mx-auto space-y-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-slate-900">Platform Feedback Hub</h2>
                <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full font-bold text-xs">{platformFeedback.length} entries</span>
              </div>
              {isFetchingFeedback ? <SkeletonTable rows={5} /> : (
              <div className={`${cardCls} overflow-hidden`}>
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-xs">
                    <tr>
                      <th className="p-4">Date</th>
                      <th className="p-4">Type</th>
                      <th className="p-4 w-1/2">Message</th>
                      <th className="p-4">Sender</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {platformFeedback.length === 0 ? (
                      <tr><td colSpan={4} className="p-8 text-center text-slate-500">No platform feedback found.</td></tr>
                    ) : (
                      platformFeedback.sort((a, b) => b.timestamp - a.timestamp).map(fb => (
                        <tr key={fb.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-4 whitespace-nowrap text-slate-600">{new Date(fb.timestamp).toLocaleDateString()}</td>
                          <td className="p-4">
                            <span className="px-2 py-1 bg-slate-100 text-slate-700 font-semibold text-[10px] rounded uppercase">{fb.feedbackType}</span>
                          </td>
                          <td className="p-4 text-slate-800">{fb.message}</td>
                          <td className="p-4 text-slate-500 text-xs">
                            {fb.email ? <a href={`mailto:${fb.email}`} className="text-indigo-600 hover:underline">{fb.email}</a> : 'Anonymous'}
                            <br/><span className="capitalize text-slate-400">({fb.userRole})</span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              )}
            </div>
          )}

          {activeTab === 'audit_logs' && <AuditLogsPage />}

        </main>
      </div>

      {showEscalateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className={`${cardCls} w-full max-w-md p-6`}>
            <h3 className="font-bold text-slate-900 text-lg mb-4">Escalate Conversation</h3>
            <p className="text-sm text-slate-500 mb-4">Provide a reason for escalating this chat to a manager. They will be notified immediately.</p>
            <textarea className={`${inputCls} min-h-[100px] resize-none mb-4`} placeholder="Reason for escalation..." value={escalateReason} onChange={e => setEscalateReason(e.target.value)} />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowEscalateModal(false)} className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm font-semibold hover:bg-slate-50">Cancel</button>
              <button onClick={handleEscalateChat} disabled={!escalateReason.trim()} className="px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-bold shadow-sm hover:bg-amber-600 disabled:opacity-50">Submit Escalation</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
