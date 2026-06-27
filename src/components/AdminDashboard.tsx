import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FeedbackEntry, AIAnalysis, User, AppSettings, AdminRole, ChatSession, PlatformFeedback, FeatureFlags, DirectChat, DirectMessage, DirectMessageAttachment, DocumentMetadata } from '../types';
import { analyzeFeedback, generateSmartReply, analyzeChatHistory, generateStudentRecommendation, generateEmailDraft } from '../services/gemini';
import { addReply, registerUser, getAllAdmins, getAllStudents, deleteFeedback, deleteUser, updateUser, getChatHistory, getAllPlatformFeedback, updatePlatformFeedbackStatus, getUserFeedback, sendNotificationToUser, verifyUserDocument, removeUserDocument, saveChatSessionToUpstash, getTeamMembers, saveTeamMembers } from '../services/db';
import { TeamMember } from '../data/teamData';
import { getAllDirectChats, sendDirectMessage, escalateChat, closeDirectChat } from '../services/directChat';
import { deleteFileFromCloudinary } from '../services/storage';
import { getSettings, saveSettings } from '../services/settings';
import { sendReplyNotification, sendTestEmail, sendDirectEmail } from '../services/email';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';
import { useLiveSync } from '../hooks/useLiveSync';

interface AdminDashboardProps { feedbackList: FeedbackEntry[]; onRefresh: () => void; onLogout: () => void; isLoading?: boolean; currentUser: User; theme: 'light' | 'dark'; toggleTheme: () => void; }
type Tab = 'inquiries' | 'students' | 'admins' | 'insights' | 'settings' | 'chats' | 'chat_insights' | 'feedback_hub' | 'direct_chats';

const PERMISSIONS: Record<AdminRole, Tab[]> = {
  'super_admin': ['inquiries', 'students', 'admins', 'insights', 'chats', 'chat_insights', 'direct_chats', 'feedback_hub', 'settings'],
  'manager': ['inquiries', 'students', 'admins', 'insights', 'chats', 'chat_insights', 'direct_chats', 'feedback_hub', 'settings'],
  'chat_officer': ['inquiries', 'admins', 'direct_chats'],
  'editor': ['admins', 'settings'],
  'support': ['inquiries', 'students', 'admins', 'chats', 'direct_chats']
};

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ feedbackList: initialFeedbackList, onRefresh, onLogout, isLoading, currentUser, theme, toggleTheme }) => {
  const navigate = useNavigate();
  const allowedTabs = PERMISSIONS[currentUser.adminRole || 'support'] || PERMISSIONS['support'];
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

  const { feedback: liveFeedback, students: liveStudents } = useLiveSync(true);

  useEffect(() => { getSettings().then(setSettings); }, []);
  useEffect(() => { if (liveFeedback) setLocalFeedback(liveFeedback); if (liveStudents) { setStudents(liveStudents); if (viewingStudent) { const u = liveStudents.find(s => s.id === viewingStudent.id); if (u) setViewingStudent(u); } } }, [liveFeedback, liveStudents]);

  useEffect(() => {
    const fetchData = async () => {
      if (activeTab === 'students' && students.length === 0) { try { const s = await getAllStudents(); if (Array.isArray(s)) setStudents(s); } catch (e) { console.error(e); } }
      if (allowedTabs.includes('admins') && activeTab === 'admins') getAllAdmins().then(setAdmins);
      if (['chats', 'chat_insights'].includes(activeTab)) { setIsFetchingChats(true); getChatHistory().then(d => setChatSessions(Array.isArray(d) ? d : [])).catch(console.error).finally(() => setIsFetchingChats(false)); }
      if (activeTab === 'feedback_hub') { setIsFetchingFeedback(true); getAllPlatformFeedback().then(d => setPlatformFeedback(Array.isArray(d) ? d : [])).catch(console.error).finally(() => setIsFetchingFeedback(false)); }
      if (activeTab === 'direct_chats') { setIsFetchingDirectChats(true); getAllDirectChats().then(d => { setDirectChats(d); if (d.length > 0 && !activeDirectChat) setActiveDirectChat(d[0]); }).catch(console.error).finally(() => setIsFetchingDirectChats(false)); }
    };
    fetchData();
  }, [activeTab]);

  useEffect(() => { if (activeTab === 'admins') getTeamMembers().then(setTeamMembers); }, [activeTab]);
  useEffect(() => { if (viewingStudent) { getUserFeedback(viewingStudent.id).then(setStudentInquiries); getChatHistory().then(c => { if (Array.isArray(c)) setStudentChats(c.filter(s => s.userId === viewingStudent.id)); }); setNotificationMsg(''); setEmailSubject(''); setEmailBody(''); setActiveCommTab('email'); } }, [viewingStudent]);

  const applyEmailTemplate = (key: string) => { if (!viewingStudent) return; const t: Record<string, { s: string; b: string }> = { 'welcome': { s: 'Welcome to MedGuide Family', b: `Dear ${viewingStudent.name},\n\nWelcome aboard!\n\nRegards,\nAdmission Team` }, 'docs_needed': { s: 'Action Required: Missing Documents', b: `Dear ${viewingStudent.name},\n\nPlease upload pending documents.\n\nRegards,\nAdmission Team` }, 'verified': { s: 'Documents Verified Successfully', b: `Dear ${viewingStudent.name},\n\nGreat news! Your documents have been verified.\n\nRegards,\nAdmission Team` }, 'payment': { s: 'Payment Reminder', b: `Dear ${viewingStudent.name},\n\nPayment deadline reminder.\n\nRegards,\nFinance Team` } }; if (t[key]) { setEmailSubject(t[key].s); setEmailBody(t[key].b); } else { setEmailSubject(''); setEmailBody(''); } };
  const handleDeleteChat = async (id: string) => { if (window.confirm("Delete this chat session?")) { const n = chatSessions.filter(s => s.id !== id); setChatSessions(n); if (viewingChat?.id === id) setViewingChat(null); await saveChatSessionToUpstash(n); } };
  const getStudentActivity = () => { if (!viewingStudent) return []; const a: any[] = []; studentInquiries.forEach(inq => a.push({ type: 'inquiry', label: `Inquiry: ${inq.targetUniversity}`, date: inq.timestamp, desc: inq.message })); studentChats.forEach(chat => a.push({ type: 'chat', label: `Chat Session (${chat.messageCount} msgs)`, date: chat.startTime, desc: chat.messages[0]?.text || 'Started chat' })); if (viewingStudent.documents) { Object.entries(viewingStudent.documents).forEach(([key, doc]) => { const d = doc as DocumentMetadata; a.push({ type: 'doc', label: `Uploaded ${key.toUpperCase()}`, date: d.uploadedAt, desc: `Status: ${d.status}` }); }); } return a.sort((a, b) => b.date - a.date); };
  const studentActivityLog = getStudentActivity();
  const handleToggleFeature = (feature: keyof FeatureFlags) => { if (!settings) return; setSettings({ ...settings, features: { ...settings.features, [feature]: !settings.features?.[feature] } }); };
  const handleAIAnalysis = async () => { setLoadingAI(true); try { const r = await analyzeFeedback(localFeedback); setAnalysis(r); } catch (e: any) { alert(`Error: ${e.message}`); } finally { setLoadingAI(false); } };
  const handleChatAnalysis = async () => { setLoadingAI(true); try { const s = await getChatHistory(); const r = await analyzeChatHistory(s); setChatAnalysis(r); } catch (e: any) { alert(`Error: ${e.message}`); } finally { setLoadingAI(false); } };
  const handleVerifyDoc = async (t: any, s: any, r?: string) => { if (!viewingStudent) return; try { await verifyUserDocument(viewingStudent.id, t, s, r); alert("Updated"); setRejectingDoc(null); } catch (e: any) { alert(e.message); } };
  const handleDeleteDoc = async (t: any, p?: string) => { if (!viewingStudent) return; if (window.confirm("Delete?")) { if (p) await deleteFileFromCloudinary(p); await removeUserDocument(viewingStudent.id, t); alert("Deleted"); } };
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

  const filteredNavItems = [
    { id: 'inquiries', label: 'Inquiries', icon: 'dashboard' },
    { id: 'direct_chats', label: 'Direct Chats', icon: 'chat' },
    { id: 'chats', label: 'AI Chats', icon: 'forum' },
    { id: 'students', label: 'Students', icon: 'group' },
    { id: 'admins', label: 'Team', icon: 'shield' },
    { id: 'insights', label: 'Insights', icon: 'auto_awesome' },
    { id: 'chat_insights', label: 'Chat Insights', icon: 'psychology' },
    { id: 'feedback_hub', label: 'Feedback Hub', icon: 'rate_review' },
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
             <button className="relative p-2 text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
              <span className="material-symbols-outlined text-[22px]">notifications</span>
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
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
                       <select className={inputCls}>
                         <option>All Inquiries</option>
                         <option>Pending</option>
                         <option>Resolved</option>
                       </select>
                     </div>
                     <div>
                       <label className={labelCls}>Sort By</label>
                       <select className={inputCls}>
                         <option>Newest First</option>
                         <option>Oldest First</option>
                       </select>
                     </div>
                     <button className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-lg font-semibold text-sm transition-colors">
                       Reset Filters
                     </button>
                   </div>
                 </div>
               </div>

               <div className="flex-1 space-y-6">
                 {localFeedback.length === 0 && !isFetchingFeedback && (
                   <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 text-slate-500">No inquiries yet.</div>
                 )}
                 {localFeedback.map(entry => (
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
                      <input type="text" placeholder="Search student name..." className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-slate-300" />
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {directChats.map(chat => (
                      <div key={chat.id} onClick={() => setActiveDirectChat(chat)} className={`p-4 border-b border-slate-100 cursor-pointer transition-colors hover:bg-slate-50 border-l-2 ${activeDirectChat?.id === chat.id ? 'bg-slate-50 border-[#0f172a]' : 'border-transparent'}`}>
                         <div className="flex justify-between items-baseline mb-1">
                           <h4 className="text-sm font-semibold text-slate-900 truncate pr-2">{chat.studentName}</h4>
                           <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded tracking-wider ${chat.status === 'open' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>{chat.status}</span>
                         </div>
                         <p className="text-xs text-slate-500 truncate">{chat.messages[chat.messages.length - 1]?.text || 'No messages yet'}</p>
                      </div>
                    ))}
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

          {/* Fallbacks for other tabs since user only cared about "inquiries", "chats" mostly */}
          {activeTab === 'students' && <div className="max-w-6xl mx-auto"><h2 className="text-2xl font-bold text-slate-900 mb-6">Student Directory</h2><div className="text-center py-20 bg-white rounded-2xl border border-slate-200 text-slate-500">Student list rendering...</div></div>}
          {activeTab === 'admins' && <div className="max-w-6xl mx-auto"><h2 className="text-2xl font-bold text-slate-900 mb-6">Team Management</h2><div className="text-center py-20 bg-white rounded-2xl border border-slate-200 text-slate-500">Team list rendering...</div></div>}
          {activeTab === 'settings' && <div className="max-w-4xl mx-auto"><h2 className="text-2xl font-bold text-slate-900 mb-6">Platform Settings</h2><div className="text-center py-20 bg-white rounded-2xl border border-slate-200 text-slate-500">Settings panel rendering...</div></div>}

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
