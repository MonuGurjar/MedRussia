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
import {
    LayoutDashboard, Users, Shield, Sparkles, Settings, LogOut, Menu,
    ExternalLink, Sun, Moon, Search, Trash2, MessageCircle, Edit3, Save,
    ToggleLeft, Key, Palette, Cpu, Globe, Database, BrainCircuit, Lightbulb, MessageSquare,
    MessageSquarePlus, CheckCircle, Bell, Send, ArrowLeft, FileText, Activity, User as UserIcon, Mail, Smartphone, Wand2, XCircle, ToggleRight, List, AlertTriangle, Lightbulb as IdeaIcon, Camera, X, Plus, Upload
} from 'lucide-react';

interface AdminDashboardProps {
    feedbackList: FeedbackEntry[];
    onRefresh: () => void;
    onLogout: () => void;
    isLoading?: boolean;
    currentUser: User;
    theme: 'light' | 'dark';
    toggleTheme: () => void;
}

type Tab = 'inquiries' | 'students' | 'admins' | 'insights' | 'settings' | 'chats' | 'chat_insights' | 'feedback_hub' | 'direct_chats';

const PERMISSIONS: Record<AdminRole, Tab[]> = {
    'super_admin': ['inquiries', 'students', 'admins', 'insights', 'chats', 'chat_insights', 'direct_chats', 'feedback_hub', 'settings'],
    'manager': ['inquiries', 'students', 'admins', 'insights', 'chats', 'chat_insights', 'direct_chats', 'feedback_hub', 'settings'],
    'chat_officer': ['inquiries', 'admins', 'direct_chats'],
    'editor': ['admins', 'settings'],
    'support': ['inquiries', 'students', 'admins', 'chats', 'direct_chats']
};

const COLORS = ['#10b981', '#64748b', '#ef4444', '#f59e0b']; // Emerald, Slate, Red, Amber

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ feedbackList: initialFeedbackList, onRefresh, onLogout, isLoading, currentUser, theme, toggleTheme }) => {
    const navigate = useNavigate();
    const allowedTabs = PERMISSIONS[currentUser.adminRole || 'support'] || PERMISSIONS['support'];
    const [activeTab, setActiveTab] = useState<Tab>(allowedTabs[0]);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Student Profile State
    const [viewingStudent, setViewingStudent] = useState<User | null>(null);
    const [studentTab, setStudentTab] = useState<'profile' | 'documents' | 'activity'>('profile');

    // Data States
    const [students, setStudents] = useState<User[]>([]);
    const [admins, setAdmins] = useState<User[]>([]);
    const [localFeedback, setLocalFeedback] = useState<FeedbackEntry[]>(initialFeedbackList);
    const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
    const [platformFeedback, setPlatformFeedback] = useState<PlatformFeedback[]>([]);
    const [settings, setSettings] = useState<AppSettings | null>(null);

    // Analysis States
    const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
    const [chatAnalysis, setChatAnalysis] = useState<AIAnalysis | null>(null);

    // Action States
    const [loadingAI, setLoadingAI] = useState(false);
    const [isFetchingChats, setIsFetchingChats] = useState(false);
    const [isFetchingFeedback, setIsFetchingFeedback] = useState(false);

    // ... (Other standard states)
    const [sendingNotification, setSendingNotification] = useState(false);
    const [sendingEmail, setSendingEmail] = useState(false);
    const [isSavingSettings, setIsSavingSettings] = useState(false);
    const [isCreatingAdmin, setIsCreatingAdmin] = useState(false);

    // Input States
    const [studentInquiries, setStudentInquiries] = useState<FeedbackEntry[]>([]);
    const [studentChats, setStudentChats] = useState<ChatSession[]>([]);
    const [viewingChat, setViewingChat] = useState<ChatSession | null>(null);

    // Forms & Comm Hub
    const [activeCommTab, setActiveCommTab] = useState<'email' | 'notification'>('email');
    const [notificationMsg, setNotificationMsg] = useState('');
    const [notificationType, setNotificationType] = useState<any>('info');
    const [emailSubject, setEmailSubject] = useState('');
    const [emailBody, setEmailBody] = useState('');
    const [emailTopic, setEmailTopic] = useState('');
    const [isGeneratingEmail, setIsGeneratingEmail] = useState(false);
    const [showEmailForm, setShowEmailForm] = useState(false); // Kept for legacy if needed, but UI modernized
    const [showNotifForm, setShowNotifForm] = useState(false);
    const [showAIDraftBox, setShowAIDraftBox] = useState(false);

    const [rejectingDoc, setRejectingDoc] = useState<{ type: string, id: string } | null>(null);
    const [rejectionRemarks, setRejectionRemarks] = useState('');

    const [replyingTo, setReplyingTo] = useState<string | null>(null);
    const [replyText, setReplyText] = useState('');

    // Admin Mgmt
    const [newAdminEmail, setNewAdminEmail] = useState('');
    const [newAdminName, setNewAdminName] = useState('');
    const [newAdminPass, setNewAdminPass] = useState('');
    const [newAdminRole, setNewAdminRole] = useState<AdminRole>('support');
    const [editingAdmin, setEditingAdmin] = useState<User | null>(null);

    // Team Card State
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
    const [editingTeamCard, setEditingTeamCard] = useState<TeamMember | null>(null);
    const [isSavingTeamCard, setIsSavingTeamCard] = useState(false);

    // Direct Chat State
    const [directChats, setDirectChats] = useState<DirectChat[]>([]);
    const [activeDirectChat, setActiveDirectChat] = useState<DirectChat | null>(null);
    const [directChatMsg, setDirectChatMsg] = useState('');
    const [directChatAttachment, setDirectChatAttachment] = useState<DirectMessageAttachment | null>(null);
    const [isSendingDirect, setIsSendingDirect] = useState(false);
    const [escalateReason, setEscalateReason] = useState('');
    const [showEscalateModal, setShowEscalateModal] = useState(false);
    const [isFetchingDirectChats, setIsFetchingDirectChats] = useState(false);

    const [studentView, setStudentView] = useState<'grid' | 'list'>('grid');
    const [studentSort, setStudentSort] = useState<'name' | 'email'>('name');

    const { feedback: liveFeedback, students: liveStudents } = useLiveSync(true);

    // Initialization
    useEffect(() => { getSettings().then(setSettings); }, []);

    useEffect(() => {
        if (liveFeedback) setLocalFeedback(liveFeedback);
        if (liveStudents) {
            setStudents(liveStudents);
            if (viewingStudent) {
                const updated = liveStudents.find(s => s.id === viewingStudent.id);
                if (updated) setViewingStudent(updated);
            }
        }
    }, [liveFeedback, liveStudents]);

    // Main Data Fetcher
    useEffect(() => {
        const fetchData = async () => {
            if (activeTab === 'students' && students.length === 0) {
                try {
                    const fetchedStudents = await getAllStudents();
                    if (Array.isArray(fetchedStudents)) setStudents(fetchedStudents);
                } catch (e) { console.error("Error fetching students", e); }
            }

            if (allowedTabs.includes('admins') && activeTab === 'admins') {
                getAllAdmins().then(setAdmins);
            }

            if (['chats', 'chat_insights'].includes(activeTab)) {
                setIsFetchingChats(true);
                getChatHistory().then(data => {
                    setChatSessions(Array.isArray(data) ? data : []);
                }).catch(console.error).finally(() => setIsFetchingChats(false));
            }

            if (activeTab === 'feedback_hub') {
                setIsFetchingFeedback(true);
                getAllPlatformFeedback().then(data => {
                    setPlatformFeedback(Array.isArray(data) ? data : []);
                }).catch(console.error).finally(() => setIsFetchingFeedback(false));
            }

            if (activeTab === 'direct_chats') {
                setIsFetchingDirectChats(true);
                getAllDirectChats().then(data => {
                    setDirectChats(data);
                    // Select first chat if none selected
                    if (data.length > 0 && !activeDirectChat) setActiveDirectChat(data[0]);
                }).catch(console.error).finally(() => setIsFetchingDirectChats(false));
            }
        };

        fetchData();
    }, [activeTab]);

    // Fetch team members when Team tab is active
    useEffect(() => {
        if (activeTab === 'admins') {
            getTeamMembers().then(setTeamMembers);
        }
    }, [activeTab]);

    useEffect(() => {
        if (viewingStudent) {
            getUserFeedback(viewingStudent.id).then(setStudentInquiries);
            getChatHistory().then(allChats => {
                if (Array.isArray(allChats)) {
                    setStudentChats(allChats.filter(s => s.userId === viewingStudent.id));
                }
            });
            setNotificationMsg('');
            setEmailSubject('');
            setEmailBody('');
            setActiveCommTab('email');
        }
    }, [viewingStudent]);

    // --- Handlers ---
    const applyEmailTemplate = (key: string) => {
        if (!viewingStudent) return;
        const templates: Record<string, { s: string, b: string }> = {
            'welcome': { s: 'Welcome to MedRussia Family', b: `Dear ${viewingStudent.name},\n\nWelcome aboard! We are thrilled to guide you on your journey to becoming a doctor in Russia.\n\nPlease ensure your profile is complete and all necessary documents are uploaded.\n\nRegards,\nAdmission Team` },
            'docs_needed': { s: 'Action Required: Missing Documents', b: `Dear ${viewingStudent.name},\n\nWe reviewed your application and noticed some pending documents. Please upload them in your dashboard to proceed with the verification process.\n\nRegards,\nAdmission Team` },
            'verified': { s: 'Documents Verified Successfully', b: `Dear ${viewingStudent.name},\n\nGreat news! Your uploaded documents have been verified by our team. We are moving forward with your application process.\n\nRegards,\nAdmission Team` },
            'payment': { s: 'Payment Reminder', b: `Dear ${viewingStudent.name},\n\nThis is a gentle reminder regarding the upcoming payment deadline for your admission processing fee.\n\nRegards,\nFinance Team` }
        };

        if (templates[key]) {
            setEmailSubject(templates[key].s);
            setEmailBody(templates[key].b);
        } else {
            setEmailSubject('');
            setEmailBody('');
        }
    };

    const handleDeleteChat = async (id: string) => {
        if (window.confirm("Are you sure you want to delete this chat session?")) {
            const newSessions = chatSessions.filter(s => s.id !== id);
            setChatSessions(newSessions);
            if (viewingChat?.id === id) setViewingChat(null);
            await saveChatSessionToUpstash(newSessions);
        }
    };

    const getStudentActivity = () => {
        if (!viewingStudent) return [];
        const activity = [];
        studentInquiries.forEach(inq => activity.push({ type: 'inquiry', label: `Inquiry: ${inq.targetUniversity}`, date: inq.timestamp, desc: inq.message }));
        studentChats.forEach(chat => activity.push({ type: 'chat', label: `Chat Session (${chat.messageCount} msgs)`, date: chat.startTime, desc: chat.messages[0]?.text || 'Started chat' }));
        if (viewingStudent.documents) {
            Object.entries(viewingStudent.documents).forEach(([key, doc]) => { const d = doc as DocumentMetadata; activity.push({ type: 'doc', label: `Uploaded ${key.toUpperCase()}`, date: d.uploadedAt, desc: `Status: ${d.status}` }); });
        }
        return activity.sort((a, b) => b.date - a.date);
    };
    const studentActivityLog = getStudentActivity();

    const handleToggleFeature = (feature: keyof FeatureFlags) => {
        if (!settings) return;
        setSettings({
            ...settings,
            features: { ...settings.features, [feature]: !settings.features?.[feature] }
        });
    };

    const handleAIAnalysis = async () => {
        setLoadingAI(true);
        try {
            const result = await analyzeFeedback(localFeedback);
            setAnalysis(result);
        } catch (err: any) {
            alert(`Error: ${err.message}`);
        } finally {
            setLoadingAI(false);
        }
    };

    const handleChatAnalysis = async () => {
        setLoadingAI(true);
        try {
            const sessions = await getChatHistory();
            const result = await analyzeChatHistory(sessions);
            setChatAnalysis(result);
        } catch (err: any) {
            alert(`Error: ${err.message}`);
        } finally {
            setLoadingAI(false);
        }
    };

    const handleVerifyDoc = async (t: any, s: any, r?: string) => {
        if (!viewingStudent) return;
        try { await verifyUserDocument(viewingStudent.id, t, s, r); alert("Updated"); setRejectingDoc(null); } catch (e: any) { alert(e.message) }
    };
    const handleDeleteDoc = async (t: any, p?: string) => {
        if (!viewingStudent) return;
        if (window.confirm("Delete?")) {
            if (p) await deleteFileFromCloudinary(p);
            await removeUserDocument(viewingStudent.id, t);
            alert("Deleted");
        }
    };
    const handleDeleteUser = async (email: string) => {
        if (window.confirm("Delete User?")) {
            await deleteUser(email);
            setViewingStudent(null);
            const fresh = await getAllStudents();
            setStudents(fresh);
        }
    };
    const handleCreateAdmin = async () => {
        setIsCreatingAdmin(true);
        try { await registerUser({ name: newAdminName, email: newAdminEmail, password: newAdminPass, role: 'admin', adminRole: newAdminRole }); alert("Created"); setAdmins(await getAllAdmins()); } catch (e: any) { alert(e.message); } finally { setIsCreatingAdmin(false); }
    };
    const handleUpdateAdmin = async () => { if (editingAdmin) { await updateUser(editingAdmin); alert("Updated"); setAdmins(await getAllAdmins()); setEditingAdmin(null); } };

    // Team Card Handlers
    const handleSaveTeamCard = async (card: TeamMember) => {
        setIsSavingTeamCard(true);
        try {
            const updated = [...teamMembers];
            const index = updated.findIndex(m => m.id === card.id);
            if (index !== -1) {
                updated[index] = card;
            } else {
                updated.push(card);
            }
            await saveTeamMembers(updated);
            setTeamMembers(updated);
            setEditingTeamCard(null);
            alert('Team card saved!');
        } catch (e) {
            alert('Failed to save');
        } finally {
            setIsSavingTeamCard(false);
        }
    };

    const handleDeleteTeamCard = async (id: string) => {
        if (!window.confirm('Remove this team member?')) return;
        const updated = teamMembers.filter(m => m.id !== id);
        await saveTeamMembers(updated);
        setTeamMembers(updated);
    };

    const handleTeamCardImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!editingTeamCard) return;
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => {
            setEditingTeamCard({ ...editingTeamCard, profileImage: reader.result as string });
        };
        reader.readAsDataURL(file);
    };

    const getMyTeamCard = (): TeamMember | undefined => {
        return teamMembers.find(m => m.linkedEmail === currentUser.email);
    };

    // Direct Chat Handlers
    const handleSendDirectMsg = async () => {
        if (!activeDirectChat || (!directChatMsg.trim() && !directChatAttachment)) return;
        setIsSendingDirect(true);
        try {
            const updated = await sendDirectMessage(
                activeDirectChat.id, currentUser.id, currentUser.name, 'admin',
                directChatMsg.trim(), directChatAttachment || undefined
            );
            if (updated) {
                setDirectChats(prev => prev.map(c => c.id === updated.id ? updated : c));
                setActiveDirectChat(updated);
            }
            setDirectChatMsg('');
            setDirectChatAttachment(null);
        } catch (e) { alert('Failed to send'); }
        finally { setIsSendingDirect(false); }
    };

    const handleDirectChatFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) { alert('Max 5MB'); return; }
        const reader = new FileReader();
        reader.onloadend = () => {
            setDirectChatAttachment({ name: file.name, type: file.type, data: reader.result as string });
        };
        reader.readAsDataURL(file);
    };

    const handleEscalateChat = async () => {
        if (!activeDirectChat || !escalateReason.trim()) return;
        const updated = await escalateChat(activeDirectChat.id, currentUser.id, currentUser.name, 'manager', escalateReason);
        if (updated) {
            setDirectChats(prev => prev.map(c => c.id === updated.id ? updated : c));
            setActiveDirectChat(updated);
        }
        setEscalateReason('');
        setShowEscalateModal(false);
    };

    const handleCloseDirectChat = async (chatId: string) => {
        await closeDirectChat(chatId);
        setDirectChats(prev => prev.map(c => c.id === chatId ? { ...c, status: 'closed' as const } : c));
        if (activeDirectChat?.id === chatId) setActiveDirectChat(prev => prev ? { ...prev, status: 'closed' as const } : null);
    };
    const handleSaveSettings = async () => { if (settings) { setIsSavingSettings(true); await saveSettings(settings); setIsSavingSettings(false); alert("Saved"); } };
    const handleSendReply = async () => {
        if (!replyingTo || !replyText.trim()) return;
        try {
            await addReply(replyingTo, { adminName: currentUser.name, message: replyText });
            setReplyingTo(null);
            setReplyText('');
            onRefresh(); // Refresh feedback list
            alert("Reply Sent");
        } catch (e) { alert("Failed to reply"); }
    };
    const handleDeleteInquiry = async (id: string) => { await deleteFeedback(id); onRefresh(); };
    const handleTestEmail = async () => { if (settings) await saveSettings(settings); await sendTestEmail(currentUser.email); alert("Sent"); };
    const handleMarkFeedbackReviewed = async (id: string) => { await updatePlatformFeedbackStatus(id, 'reviewed'); setPlatformFeedback(await getAllPlatformFeedback()); };
    const handleGenerateEmailDraft = async () => {
        setIsGeneratingEmail(true);
        try { const draft = await generateEmailDraft(viewingStudent!.name, emailTopic, currentUser.name); setEmailBody(draft); setShowAIDraftBox(false); } catch (e) { alert("AI Error"); } finally { setIsGeneratingEmail(false); }
    };
    const handleSendNotification = async () => {
        if (!viewingStudent) return;
        setSendingNotification(true);
        try { await sendNotificationToUser(viewingStudent.id, { title: "MedRussia Update", message: notificationMsg, type: notificationType }); alert("Sent"); setNotificationMsg(''); } catch (e) { alert("Fail"); } finally { setSendingNotification(false); }
    };
    const handleSendEmail = async () => {
        setSendingEmail(true);
        try { await sendDirectEmail(viewingStudent!.email, viewingStudent!.name, emailBody, currentUser.name); alert("Sent"); setEmailBody(''); setEmailSubject(''); } catch (e) { alert("Fail"); } finally { setSendingEmail(false); }
    };

    // Rendering Helpers
    const formatTime = (timestamp?: number) => timestamp ? new Date(timestamp).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A';
    const sortedStudents = [...(Array.isArray(students) ? students : [])].sort((a, b) => {
        const nameA = a?.name || '';
        const nameB = b?.name || '';
        const emailA = a?.email || '';
        const emailB = b?.email || '';

        return studentSort === 'name' ? nameA.localeCompare(nameB) : emailA.localeCompare(emailB);
    });

    // --- RENDER ---

    if (viewingStudent) {
        return (
            <div className="fixed inset-0 z-50 bg-slate-50 dark:bg-slate-900 overflow-y-auto custom-scrollbar animate-in slide-in-from-right-10 duration-300">
                <div className="max-w-7xl mx-auto px-4 py-6 md:px-8">
                    <div className="flex items-center justify-between mb-8">
                        <button onClick={() => setViewingStudent(null)} className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 dark:text-slate-400 font-bold"><ArrowLeft size={20} /> Back</button>
                        <button onClick={() => handleDeleteUser(viewingStudent.email)} className="px-4 py-2 bg-red-50 text-red-600 rounded-xl font-bold text-sm">Delete</button>
                    </div>

                    <div className="grid lg:grid-cols-12 gap-8">
                        {/* Left: Communication Hub */}
                        <div className="lg:col-span-4 space-y-6">
                            {/* Student Card */}
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] shadow-sm border border-slate-200 dark:border-slate-700 relative overflow-hidden group">
                                <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-r from-indigo-500 to-purple-600"></div>
                                <div className="relative mt-8 flex flex-col items-center">
                                    <div className="w-24 h-24 bg-white dark:bg-slate-800 rounded-full p-1.5 shadow-xl mb-4">
                                        <div className="w-full h-full rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-3xl overflow-hidden font-black text-indigo-500">
                                            {viewingStudent.avatar ? <img src={viewingStudent.avatar} className="w-full h-full object-cover" alt="User" /> : viewingStudent.name.charAt(0)}
                                        </div>
                                    </div>
                                    <h2 className="text-2xl font-black text-slate-900 dark:text-white text-center">{viewingStudent.name}</h2>
                                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-6">{viewingStudent.email}</p>

                                    <div className="w-full grid grid-cols-2 gap-2 text-center">
                                        <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl">
                                            <div className="text-[10px] text-slate-400 uppercase font-bold">Phone</div>
                                            <div className="text-sm font-bold text-slate-700 dark:text-slate-200">{viewingStudent.phone || 'N/A'}</div>
                                        </div>
                                        <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl">
                                            <div className="text-[10px] text-slate-400 uppercase font-bold">Role</div>
                                            <div className="text-sm font-bold text-slate-700 dark:text-slate-200 capitalize">{viewingStudent.role}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Communication Hub */}
                            <div className="bg-white dark:bg-slate-800 rounded-[2rem] shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                                <div className="flex border-b border-slate-100 dark:border-slate-700">
                                    <button onClick={() => setActiveCommTab('email')} className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeCommTab === 'email' ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                                        <Mail size={18} /> Email
                                    </button>
                                    <button onClick={() => setActiveCommTab('notification')} className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeCommTab === 'notification' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                                        <Bell size={18} /> Push
                                    </button>
                                </div>

                                <div className="p-6 space-y-4">
                                    {activeCommTab === 'email' ? (
                                        <div className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-300">
                                            <div className="flex justify-between items-center">
                                                <label className="text-xs font-bold text-slate-400 uppercase">Template</label>
                                                <select className="bg-slate-50 dark:bg-slate-900 border-none text-xs font-bold rounded-lg py-1 px-2 outline-none dark:text-white cursor-pointer" onChange={(e) => applyEmailTemplate(e.target.value)}>
                                                    <option value="custom">Custom</option>
                                                    <option value="welcome">Welcome Kit</option>
                                                    <option value="docs_needed">Missing Docs</option>
                                                    <option value="verified">Verified</option>
                                                    <option value="payment">Payment</option>
                                                </select>
                                            </div>
                                            <input className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white" placeholder="Subject" value={emailSubject} onChange={e => setEmailSubject(e.target.value)} />
                                            <div className="relative">
                                                <textarea className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm min-h-[150px] outline-none focus:ring-2 focus:ring-indigo-500 resize-none dark:text-white" value={emailBody} onChange={e => setEmailBody(e.target.value)} placeholder="Write your message..." />
                                                <button onClick={() => setShowAIDraftBox(!showAIDraftBox)} className="absolute bottom-3 right-3 p-2 bg-white dark:bg-slate-700 rounded-lg shadow-sm text-indigo-500 hover:scale-110 transition-transform border border-slate-200 dark:border-slate-600" title="AI Draft"><Wand2 size={16} /></button>
                                            </div>

                                            {showAIDraftBox && (
                                                <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl space-y-2 border border-indigo-100 dark:border-indigo-800 animate-in zoom-in-95">
                                                    <div className="flex gap-2">
                                                        <input className="flex-1 p-2 rounded-lg text-xs border border-indigo-200 dark:border-indigo-800 outline-none dark:bg-slate-800 dark:text-white" placeholder="Topic (e.g. Fee Deadline)" value={emailTopic} onChange={e => setEmailTopic(e.target.value)} />
                                                        <button onClick={handleGenerateEmailDraft} disabled={isGeneratingEmail} className="px-3 bg-indigo-600 text-white text-xs font-bold rounded-lg">{isGeneratingEmail ? '...' : 'Generate'}</button>
                                                    </div>
                                                </div>
                                            )}

                                            <button onClick={handleSendEmail} disabled={sendingEmail} className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 dark:shadow-none flex items-center justify-center gap-2">
                                                {sendingEmail ? 'Sending...' : <><Send size={18} /> Send Email</>}
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                                            <div>
                                                <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Notification Type</label>
                                                <div className="grid grid-cols-4 gap-2">
                                                    {['info', 'success', 'alert', 'recommendation'].map(t => (
                                                        <button
                                                            key={t}
                                                            onClick={() => setNotificationType(t)}
                                                            className={`h-10 rounded-xl flex items-center justify-center border transition-all ${notificationType === t ? 'border-transparent shadow-md scale-105' : 'border-slate-200 dark:border-slate-700 opacity-60 hover:opacity-100'} ${t === 'info' && notificationType === t ? 'bg-blue-500 text-white' : ''} ${t === 'success' && notificationType === t ? 'bg-green-500 text-white' : ''} ${t === 'alert' && notificationType === t ? 'bg-red-500 text-white' : ''} ${t === 'recommendation' && notificationType === t ? 'bg-indigo-500 text-white' : ''}`}
                                                            title={t}
                                                        >
                                                            <div className={`w-3 h-3 rounded-full ${t === 'info' && notificationType !== t ? 'bg-blue-500' : ''} ${t === 'success' && notificationType !== t ? 'bg-green-500' : ''} ${t === 'alert' && notificationType !== t ? 'bg-red-500' : ''} ${t === 'recommendation' && notificationType !== t ? 'bg-indigo-500' : ''}`}></div>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                            <textarea className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm min-h-[150px] outline-none focus:ring-2 focus:ring-emerald-500 resize-none dark:text-white" value={notificationMsg} onChange={e => setNotificationMsg(e.target.value)} placeholder="Notification message..." />
                                            <button onClick={handleSendNotification} disabled={sendingNotification} className="w-full py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 dark:shadow-none flex items-center justify-center gap-2">
                                                {sendingNotification ? 'Sending...' : <><Bell size={18} /> Send Notification</>}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Right: Tabs */}
                        <div className="lg:col-span-8">
                            <div className="flex gap-2 mb-4">
                                {['profile', 'documents', 'activity'].map(t => (
                                    <button key={t} onClick={() => setStudentTab(t as any)} className={`px-4 py-2 rounded-xl text-sm font-bold capitalize transition-colors ${studentTab === t ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>{t}</button>
                                ))}
                            </div>
                            <div className="bg-white dark:bg-slate-800 rounded-[2rem] p-6 shadow-sm min-h-[400px] border border-slate-100 dark:border-slate-700">
                                {studentTab === 'documents' && (
                                    <div className="space-y-4">
                                        {[{ id: 'passport', l: 'Passport' }, { id: 'marksheet', l: 'Marksheet' }, { id: 'neetScoreCard', l: 'NEET Score' }].map((d: any) => {
                                            const doc = viewingStudent.documents?.[d.id as 'passport'];
                                            return (
                                                <div key={d.id} className="flex justify-between items-center p-4 border border-slate-100 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`p-2 rounded-lg ${doc?.url ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' : 'bg-slate-100 dark:bg-slate-700 text-slate-400'}`}><FileText size={20} /></div>
                                                        <div>
                                                            <h4 className="font-bold text-slate-900 dark:text-white text-sm">{d.l}</h4>
                                                            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${doc?.status === 'verified' ? 'bg-green-100 text-green-700' : doc?.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-500'}`}>{doc?.status || 'Pending'}</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {doc?.url ? (
                                                            <>
                                                                <a href={doc.url} target="_blank" className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="View"><ExternalLink size={18} /></a>
                                                                <button onClick={() => handleVerifyDoc(d.id, 'verified')} className="p-2 text-green-500 hover:bg-green-50 rounded-lg transition-colors" title="Approve"><CheckCircle size={18} /></button>
                                                                <button onClick={() => setRejectingDoc({ type: d.id, id: viewingStudent.id })} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Reject"><XCircle size={18} /></button>
                                                                <button onClick={() => handleDeleteDoc(d.id, doc.publicId)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete"><Trash2 size={18} /></button>
                                                            </>
                                                        ) : <span className="text-slate-400 text-xs italic pr-2">Not uploaded</span>}
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                                {studentTab === 'activity' && (
                                    <div className="space-y-6 relative">
                                        {studentActivityLog.length === 0 ? <div className="text-center text-slate-400 py-10">No activity recorded yet.</div> : (
                                            <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-slate-100 dark:bg-slate-700"></div>
                                        )}
                                        {studentActivityLog.map((l, i) => (
                                            <div key={i} className="flex gap-4 relative">
                                                <div className="w-8 h-8 rounded-full bg-white dark:bg-slate-800 border-4 border-indigo-50 dark:border-indigo-900/30 flex items-center justify-center shrink-0 z-10">
                                                    <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                                                </div>
                                                <div>
                                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-0.5">{formatTime(l.date)}</div>
                                                    <h4 className="font-bold text-slate-900 dark:text-white text-sm">{l.label}</h4>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{l.desc}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {studentTab === 'profile' && (
                                    <div className="grid md:grid-cols-2 gap-4">
                                        <div className="p-5 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-700">
                                            <div className="text-xs font-bold text-slate-400 uppercase mb-2">Target University</div>
                                            <div className="text-lg font-black text-indigo-600 dark:text-indigo-400">{viewingStudent.university || 'Not Selected'}</div>
                                        </div>
                                        <div className="p-5 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-700">
                                            <div className="text-xs font-bold text-slate-400 uppercase mb-2">NEET Score</div>
                                            <div className="text-lg font-black text-slate-900 dark:text-white">{viewingStudent.eligibilityData?.neetScore || 'N/A'}</div>
                                        </div>
                                        <div className="p-5 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-700">
                                            <div className="text-xs font-bold text-slate-400 uppercase mb-2">Shortlisted</div>
                                            <div className="flex flex-wrap gap-2">
                                                {viewingStudent.shortlistedUniversities?.length ? viewingStudent.shortlistedUniversities.map(u => (
                                                    <span key={u} className="px-2 py-1 bg-white dark:bg-slate-800 rounded text-xs font-medium border border-slate-200 dark:border-slate-600">{u}</span>
                                                )) : <span className="text-slate-400 text-sm">None</span>}
                                            </div>
                                        </div>
                                        <div className="p-5 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-700">
                                            <div className="text-xs font-bold text-slate-400 uppercase mb-2">Eligibility Status</div>
                                            <div className="text-sm font-medium text-slate-700 dark:text-slate-300 whitespace-pre-line">{viewingStudent.eligibilityResult || 'Not Checked'}</div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
                {rejectingDoc && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[60]">
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl w-full max-w-sm border border-slate-200 dark:border-slate-700 shadow-2xl animate-in zoom-in-95">
                            <h3 className="font-bold text-slate-900 dark:text-white mb-4 text-lg">Reject Document</h3>
                            <textarea className="w-full border border-slate-200 dark:border-slate-600 p-3 rounded-xl mb-4 dark:bg-slate-700 dark:text-white text-sm outline-none focus:ring-2 focus:ring-red-500" value={rejectionRemarks} onChange={e => setRejectionRemarks(e.target.value)} placeholder="Reason for rejection..." autoFocus />
                            <div className="flex justify-end gap-2">
                                <button onClick={() => setRejectingDoc(null)} className="px-4 py-2 text-slate-500 font-bold hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">Cancel</button>
                                <button onClick={() => handleVerifyDoc(rejectingDoc.type, 'rejected', rejectionRemarks)} className="px-4 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors shadow-lg shadow-red-200 dark:shadow-none">Reject</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    const filteredNavItems = [
        { id: 'inquiries', label: 'Inquiries', icon: <LayoutDashboard size={20} /> },
        { id: 'direct_chats', label: 'Direct Chats', icon: <MessageCircle size={20} /> },
        { id: 'chats', label: 'AI Chats', icon: <MessageSquare size={20} /> },
        { id: 'students', label: 'Students', icon: <Users size={20} /> },
        { id: 'admins', label: 'Team', icon: <Shield size={20} /> },
        { id: 'insights', label: 'Insights', icon: <Sparkles size={20} /> },
        { id: 'chat_insights', label: 'Chat Insights', icon: <BrainCircuit size={20} /> },
        { id: 'feedback_hub', label: 'Feedback Hub', icon: <MessageSquarePlus size={20} /> },
        { id: 'settings', label: 'Settings', icon: <Settings size={20} /> },
    ].filter(item => allowedTabs.includes(item.id as any));

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300 flex">
            {/* Desktop Sidebar */}
            <aside className="hidden md:flex fixed top-0 left-0 z-40 h-screen w-64 flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800">
                <div className="h-20 flex items-center px-6 border-b border-slate-100 dark:border-slate-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors" onClick={() => navigate('/')}>
                    <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center text-white font-black text-xs mr-3 shadow-[0_3px_0_rgb(49,46,129)] border border-indigo-400">MR</div>
                    <span className="font-black text-xl text-slate-900 dark:text-white tracking-tight">Admin</span>
                </div>
                <div className="flex-1 overflow-y-auto py-6 px-4 space-y-2 custom-scrollbar">
                    {filteredNavItems.map(item => (
                        <button key={item.id} onClick={() => setActiveTab(item.id as Tab)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === item.id ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                            {item.icon} {item.label}
                        </button>
                    ))}
                </div>
                <div className="p-4 border-t border-slate-100 dark:border-slate-800">
                    <button onClick={onLogout} className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-black uppercase tracking-wider text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"><LogOut size={14} /> Sign Out</button>
                </div>
            </aside>

            {/* Mobile Nav */}
            <nav className="md:hidden fixed bottom-0 left-0 z-50 w-full bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 pb-safe shadow-lg">
                <div className="flex justify-between items-center px-2 h-16">
                    {filteredNavItems.slice(0, 4).map(item => (
                        <button key={item.id} onClick={() => { setActiveTab(item.id as Tab); setIsMobileMenuOpen(false); }} className={`flex-1 flex flex-col items-center justify-center gap-1 h-full ${activeTab === item.id ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'}`}>
                            {React.cloneElement(item.icon as any, { size: 24 })} <span className="text-[10px] font-bold">{item.label}</span>
                        </button>
                    ))}
                    {filteredNavItems.length > 4 && (
                        <button onClick={() => setIsMobileMenuOpen(true)} className={`flex-1 flex flex-col items-center justify-center gap-1 h-full text-slate-400 dark:text-slate-500`}>
                            <Menu size={24} /><span className="text-[10px] font-bold">More</span>
                        </button>
                    )}
                </div>
            </nav>

            {/* Mobile Drawer */}
            {isMobileMenuOpen && (
                <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm md:hidden" onClick={() => setIsMobileMenuOpen(false)}>
                    <div className="absolute bottom-0 left-0 w-full bg-white dark:bg-slate-800 rounded-t-3xl p-6 space-y-2 animate-in slide-in-from-bottom-full duration-300 max-h-[80vh] overflow-y-auto">
                        <div className="w-12 h-1 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-6"></div>
                        {filteredNavItems.map(item => (
                            <button key={item.id} onClick={() => { setActiveTab(item.id as Tab); setIsMobileMenuOpen(false); }} className={`w-full flex items-center gap-4 p-4 rounded-xl text-sm font-bold transition-colors ${activeTab === item.id ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
                                {item.icon} {item.label}
                            </button>
                        ))}
                        <button onClick={onLogout} className="w-full flex items-center gap-4 p-4 rounded-xl text-sm font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 border-t border-slate-100 dark:border-slate-700 mt-2"><LogOut size={20} /> Sign Out</button>
                    </div>
                </div>
            )}

            <main className="flex-1 md:ml-64 p-4 pb-24 md:p-8 overflow-x-hidden">
                {/* ... Top Bar (keeping simpler) ... */}
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white">{filteredNavItems.find(n => n.id === activeTab)?.label}</h1>
                        <p className="text-sm text-slate-500 font-medium">Platform Management</p>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => window.open('/', '_blank')} className="px-3 py-2 bg-white dark:bg-slate-800 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700">Public Site</button>
                        <button onClick={toggleTheme} className="w-9 h-9 flex items-center justify-center bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">{theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}</button>
                    </div>
                </div>

                {/* --- INSIGHTS --- */}
                {activeTab === 'insights' && (
                    <div className="space-y-6">
                        {!analysis ? (
                            <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-[2rem] border border-slate-200 dark:border-slate-700">
                                <Sparkles size={40} className="mx-auto mb-4 text-indigo-500" />
                                <button onClick={handleAIAnalysis} disabled={loadingAI} className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 disabled:opacity-50">{loadingAI ? 'Analyzing...' : 'Generate Insights'}</button>
                            </div>
                        ) : (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                                {/* Strategic Card */}
                                <div className="p-6 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-[2rem] text-white shadow-xl">
                                    <h3 className="text-lg font-bold mb-2 flex items-center gap-2"><Lightbulb size={20} /> Strategic Insight</h3>
                                    <p className="text-sm md:text-lg font-medium leading-relaxed">{analysis.strategicInsight}</p>
                                </div>

                                <div className="grid lg:grid-cols-2 gap-6">
                                    {/* Sentiment Chart */}
                                    <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm h-80">
                                        <h4 className="font-bold text-slate-900 dark:text-white mb-4">Sentiment Analysis</h4>
                                        <ResponsiveContainer width="100%" height="80%">
                                            <PieChart>
                                                <Pie
                                                    data={[
                                                        { name: 'Positive', value: analysis.sentiment.positive },
                                                        { name: 'Neutral', value: analysis.sentiment.neutral },
                                                        { name: 'Negative', value: analysis.sentiment.negative }
                                                    ]}
                                                    cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value"
                                                >
                                                    {COLORS.slice(0, 3).map((color, index) => <Cell key={`cell-${index}`} fill={color} stroke="none" />)}
                                                </Pie>
                                                <RechartsTooltip contentStyle={{ borderRadius: '12px', border: 'none', backgroundColor: '#1e293b', color: '#fff' }} />
                                                <Legend verticalAlign="bottom" height={36} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>

                                    {/* Topics Chart */}
                                    <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm h-80">
                                        <h4 className="font-bold text-slate-900 dark:text-white mb-4">Top Themes</h4>
                                        <ResponsiveContainer width="100%" height="80%">
                                            <BarChart data={analysis.themes.slice(0, 5)} layout="vertical">
                                                <CartesianGrid strokeDasharray="3 3" horizontal={false} strokeOpacity={0.2} />
                                                <XAxis type="number" hide />
                                                <YAxis dataKey="topic" type="category" width={100} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                                                <RechartsTooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '12px', border: 'none', backgroundColor: '#1e293b', color: '#fff' }} />
                                                <Bar dataKey="count" fill="#6366f1" radius={[0, 10, 10, 0]} barSize={20} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                {/* Analysis Areas */}
                                <div className="grid md:grid-cols-2 gap-6">
                                    <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-700">
                                        <h4 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2"><AlertTriangle size={18} className="text-amber-500" /> Common Concerns</h4>
                                        <ul className="space-y-2">
                                            {analysis.commonConcerns.map((c, i) => (
                                                <li key={i} className="text-sm text-slate-600 dark:text-slate-300 flex items-start gap-2">
                                                    <span className="text-amber-500 mt-1">•</span> {c}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                    <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-700">
                                        <h4 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2"><IdeaIcon size={18} className="text-emerald-500" /> Actionable Suggestions</h4>
                                        <ul className="space-y-2">
                                            {analysis.suggestedContentIdeas.map((c, i) => (
                                                <li key={i} className="text-sm text-slate-600 dark:text-slate-300 flex items-start gap-2">
                                                    <span className="text-emerald-500 mt-1">✓</span> {c}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* --- CHAT INSIGHTS (Similar structure to Insights) --- */}
                {activeTab === 'chat_insights' && (
                    <div className="space-y-6">
                        {!chatAnalysis ? (
                            <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-[2rem] border border-slate-200 dark:border-slate-700">
                                <BrainCircuit size={40} className="mx-auto mb-4 text-teal-500" />
                                <p className="text-slate-500 mb-6">Analyze AI interactions to understand visitor intent.</p>
                                <button onClick={handleChatAnalysis} disabled={loadingAI} className="px-8 py-3 bg-teal-600 text-white font-bold rounded-2xl hover:bg-teal-700 disabled:opacity-50">{loadingAI ? 'Analyzing...' : 'Analyze Chats'}</button>
                            </div>
                        ) : (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                                <div className="p-6 bg-gradient-to-br from-teal-600 to-emerald-600 rounded-[2rem] text-white shadow-xl">
                                    <h3 className="text-lg font-bold mb-2 flex items-center gap-2"><BrainCircuit size={20} /> Bot Intelligence</h3>
                                    <p className="text-sm md:text-lg font-medium leading-relaxed">{chatAnalysis.strategicInsight}</p>
                                </div>
                                <div className="grid md:grid-cols-2 gap-6">
                                    <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-700">
                                        <h4 className="font-bold text-slate-900 dark:text-white mb-4">Query Topics</h4>
                                        <div className="space-y-3">
                                            {chatAnalysis.themes.slice(0, 6).map((theme, i) => (
                                                <div key={i} className="flex justify-between items-center text-sm">
                                                    <span className="text-slate-600 dark:text-slate-300">{theme.topic}</span>
                                                    <div className="w-1/2 bg-slate-100 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                                                        <div className="bg-teal-500 h-full rounded-full" style={{ width: `${Math.min(theme.count * 10, 100)}%` }}></div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-700">
                                        <h4 className="font-bold text-slate-900 dark:text-white mb-4">Unresolved Queries</h4>
                                        <ul className="space-y-2">
                                            {chatAnalysis.commonConcerns.map((c, i) => (
                                                <li key={i} className="text-sm text-slate-600 dark:text-slate-300 p-2 bg-red-50 dark:bg-red-900/10 rounded-lg border border-red-100 dark:border-red-900/30">{c}</li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* --- SETTINGS --- */}
                {activeTab === 'settings' && settings && (
                    <div className="space-y-8 animate-in fade-in duration-300 pb-20">
                        {/* Features */}
                        <section className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm">
                            <h3 className="text-lg font-black text-slate-900 dark:text-white mb-6 flex items-center gap-2"><ToggleRight size={20} /> Feature Management</h3>
                            <div className="grid md:grid-cols-2 gap-4">
                                {[
                                    { key: 'eligibilityCheck', label: 'Eligibility Checker' },
                                    { key: 'universityCompare', label: 'University Comparison' },
                                    { key: 'chatWidget', label: 'AI Chat Widget' },
                                    { key: 'whatsappFab', label: 'WhatsApp Button' },
                                    { key: 'studentLogin', label: 'Student Login / Auth' }
                                ].map((feat) => (
                                    <div key={feat.key} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-700">
                                        <span className="font-bold text-slate-700 dark:text-slate-300 text-sm">{feat.label}</span>
                                        <button
                                            onClick={() => handleToggleFeature(feat.key as keyof FeatureFlags)}
                                            className={`w-12 h-6 rounded-full transition-colors relative ${settings.features?.[feat.key as keyof FeatureFlags] ? 'bg-green-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                                        >
                                            <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${settings.features?.[feat.key as keyof FeatureFlags] ? 'left-7' : 'left-1'}`}></div>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* AI Config */}
                        <section className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm">
                            <h3 className="text-lg font-black text-slate-900 dark:text-white mb-6 flex items-center gap-2"><MessageSquare size={20} /> AI Chat Configuration</h3>
                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-xs font-bold text-slate-400 uppercase mb-1 block ml-1">Bot Name</label>
                                        <input className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-sm outline-none" value={settings.chatBot?.botName || ''} onChange={(e) => setSettings({ ...settings, chatBot: { ...settings.chatBot, botName: e.target.value } })} />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-400 uppercase mb-1 block ml-1">Welcome Message</label>
                                        <textarea className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-sm outline-none min-h-[100px]" value={settings.chatBot?.welcomeMessage || ''} onChange={(e) => setSettings({ ...settings, chatBot: { ...settings.chatBot, welcomeMessage: e.target.value } })} />
                                    </div>
                                </div>
                                <div className="bg-indigo-50 dark:bg-indigo-900/10 p-6 rounded-2xl flex items-center justify-center text-center">
                                    <div>
                                        <div className="text-4xl mb-4">🤖</div>
                                        <p className="text-sm font-bold text-indigo-900 dark:text-indigo-200">Preview</p>
                                        <div className="mt-4 bg-white dark:bg-slate-800 p-3 rounded-tl-2xl rounded-tr-2xl rounded-br-2xl shadow-sm text-xs text-left max-w-xs mx-auto border border-indigo-100 dark:border-indigo-800">
                                            <span className="font-bold text-indigo-600 block mb-1">{settings.chatBot?.botName}</span>
                                            {settings.chatBot?.welcomeMessage}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Integrations */}
                        <section className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm">
                            <h3 className="text-lg font-black text-slate-900 dark:text-white mb-6 flex items-center gap-2"><Database size={20} /> Integrations & Keys</h3>
                            <div className="grid md:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <h4 className="font-bold text-slate-700 dark:text-slate-300 text-sm border-b border-slate-100 dark:border-slate-700 pb-2">EmailJS (Notifications)</h4>
                                    <input type="text" className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-sm outline-none" placeholder="Service ID" value={settings.emailJs?.serviceId || ''} onChange={(e) => setSettings({ ...settings, emailJs: { ...settings.emailJs, serviceId: e.target.value } })} />
                                    <input type="text" className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-sm outline-none" placeholder="Template ID" value={settings.emailJs?.templateId || ''} onChange={(e) => setSettings({ ...settings, emailJs: { ...settings.emailJs, templateId: e.target.value } })} />
                                    <input type="password" className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-sm outline-none" placeholder="Public Key" value={settings.emailJs?.publicKey || ''} onChange={(e) => setSettings({ ...settings, emailJs: { ...settings.emailJs, publicKey: e.target.value } })} />
                                    <button onClick={handleTestEmail} className="w-full py-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 font-bold rounded-lg text-xs uppercase hover:bg-indigo-100 transition-colors">Test Configuration</button>
                                </div>
                                <div className="space-y-4">
                                    <h4 className="font-bold text-slate-700 dark:text-slate-300 text-sm border-b border-slate-100 dark:border-slate-700 pb-2">Groq AI & Currency</h4>
                                    <div>
                                        <label className="text-xs font-bold text-slate-400 uppercase mb-1 block ml-1">Groq API Key (Override)</label>
                                        <input type="password" className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-sm outline-none" placeholder="gsk_..." value={settings.groqAI?.apiKey || ''} onChange={(e) => setSettings({ ...settings, groqAI: { ...settings.groqAI, apiKey: e.target.value } })} />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-400 uppercase mb-1 block ml-1">Currency API Key</label>
                                        <input type="password" className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-sm outline-none" placeholder="Exchangerate-API Key" value={settings.currencyConverter?.apiKey || ''} onChange={(e) => setSettings({ ...settings, currencyConverter: { ...settings.currencyConverter, apiKey: e.target.value } })} />
                                    </div>
                                </div>
                            </div>
                        </section>

                        <div className="fixed bottom-6 right-6 md:bottom-10 md:right-10 z-40">
                            <button onClick={handleSaveSettings} disabled={isSavingSettings} className="px-6 py-3 bg-green-600 text-white font-bold rounded-2xl shadow-xl hover:bg-green-700 transition-transform hover:scale-105 active:scale-95 flex items-center gap-2">
                                <Save size={20} /> {isSavingSettings ? 'Saving...' : 'Save Settings'}
                            </button>
                        </div>
                    </div>
                )}

                {/* --- TEAM --- */}
                {activeTab === 'admins' && (
                    <div className="space-y-8 animate-in fade-in duration-300">
                        {/* My Team Card Section — All Roles */}
                        <section className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm">
                            <h3 className="text-xl font-black text-slate-900 dark:text-white mb-6 flex items-center gap-2"><UserIcon size={20} /> My Team Card</h3>
                            {(() => {
                                const myCard = getMyTeamCard();
                                if (!myCard) return (
                                    <div className="text-center py-8">
                                        <p className="text-slate-500 dark:text-slate-400 mb-4">You don't have a team card linked yet.</p>
                                        {currentUser.adminRole === 'super_admin' && (
                                            <button onClick={() => {
                                                const newCard: TeamMember = {
                                                    id: Math.random().toString(36).substr(2, 9),
                                                    name: currentUser.name,
                                                    role: '',
                                                    bio: '',
                                                    emoji: '👤',
                                                    specialization: '',
                                                    isFeatured: false,
                                                    linkedEmail: currentUser.email
                                                };
                                                setEditingTeamCard(newCard);
                                            }} className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all">
                                                Create My Card
                                            </button>
                                        )}
                                    </div>
                                );
                                return (
                                    <div className="flex flex-col sm:flex-row items-center gap-6 p-6 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-2xl border border-indigo-100 dark:border-indigo-800">
                                        <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-indigo-200 to-purple-200 dark:from-indigo-800 dark:to-purple-800 flex items-center justify-center text-4xl overflow-hidden border-2 border-white dark:border-slate-700 shadow-lg">
                                            {myCard.profileImage ? <img src={myCard.profileImage} alt={myCard.name} className="w-full h-full object-cover" /> : myCard.emoji}
                                        </div>
                                        <div className="flex-1 text-center sm:text-left">
                                            <h4 className="text-xl font-black text-slate-900 dark:text-white">{myCard.name}</h4>
                                            <p className="text-sm text-indigo-600 dark:text-indigo-400 font-bold">{myCard.role}</p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md">{myCard.bio}</p>
                                            <div className="flex flex-wrap gap-2 mt-2">
                                                <span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded text-[10px] font-bold uppercase">{myCard.specialization}</span>
                                                {myCard.isFeatured && <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded text-[10px] font-bold uppercase">⭐ Featured</span>}
                                            </div>
                                        </div>
                                        <button onClick={() => setEditingTeamCard({ ...myCard })} className="px-5 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all text-sm flex items-center gap-2">
                                            <Edit3 size={16} /> Edit My Card
                                        </button>
                                    </div>
                                );
                            })()}
                        </section>

                        {/* Admin Management — super_admin and manager only */}
                        {(currentUser.adminRole === 'super_admin' || currentUser.adminRole === 'manager') && (
                            <div className="grid lg:grid-cols-3 gap-8">
                                <div className="lg:col-span-1">
                                    <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm sticky top-8">
                                        <h3 className="text-xl font-black text-slate-900 dark:text-white mb-6">Add New Member</h3>
                                        <div className="space-y-4">
                                            <input type="text" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm" placeholder="Name" value={newAdminName} onChange={e => setNewAdminName(e.target.value)} />
                                            <input type="email" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm" placeholder="Email" value={newAdminEmail} onChange={e => setNewAdminEmail(e.target.value)} />
                                            <input type="password" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm" placeholder="Password" value={newAdminPass} onChange={e => setNewAdminPass(e.target.value)} />
                                            <div>
                                                <label className="text-xs font-bold text-slate-400 uppercase mb-2 block ml-1">Role</label>
                                                <div className="grid grid-cols-2 gap-2">
                                                    {(['super_admin', 'manager', 'chat_officer', 'editor', 'support'] as const)
                                                        .filter(role => currentUser.adminRole === 'super_admin' || role !== 'super_admin')
                                                        .map(role => (
                                                            <button key={role} onClick={() => setNewAdminRole(role as AdminRole)} className={`py-2 rounded-lg text-xs font-bold uppercase border transition-all ${newAdminRole === role ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-transparent text-slate-500 border-slate-200 dark:border-slate-700 hover:border-indigo-400'}`}>{role.replace('_', ' ')}</button>
                                                        ))}
                                                </div>
                                            </div>
                                            <button onClick={handleCreateAdmin} disabled={isCreatingAdmin || !newAdminName || !newAdminEmail || !newAdminPass} className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg disabled:opacity-50">{isCreatingAdmin ? 'Creating...' : 'Register Admin'}</button>
                                        </div>
                                    </div>
                                </div>
                                <div className="lg:col-span-2 space-y-4">
                                    <h3 className="text-xl font-black text-slate-900 dark:text-white">Current Team</h3>
                                    <div className="grid sm:grid-cols-2 gap-4">
                                        {admins
                                            .filter(admin => {
                                                // super_admin sees everyone
                                                if (currentUser.adminRole === 'super_admin') return true;
                                                // manager doesn't see super_admins
                                                if (currentUser.adminRole === 'manager') return admin.adminRole !== 'super_admin';
                                                return false;
                                            })
                                            .map(admin => {
                                                const canEdit = currentUser.adminRole === 'super_admin' ||
                                                    (currentUser.adminRole === 'manager' && admin.adminRole !== 'super_admin' && admin.adminRole !== 'manager');
                                                return (
                                                    <div key={admin.id} className="flex flex-col p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm relative group">
                                                        <div className="flex items-center gap-4 mb-3">
                                                            <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-lg overflow-hidden">
                                                                {admin.avatar ? <img src={admin.avatar} className="w-full h-full object-cover" alt="" /> : admin.name.charAt(0)}
                                                            </div>
                                                            <div>
                                                                <h4 className="font-bold text-slate-900 dark:text-white">{admin.name}</h4>
                                                                <span className="text-[10px] uppercase font-bold bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded text-slate-500">{admin.adminRole?.replace('_', ' ')}</span>
                                                            </div>
                                                        </div>
                                                        <div className="text-xs text-slate-500 break-all mb-4">{admin.email}</div>
                                                        {(canEdit && currentUser.id !== admin.id) && (
                                                            <div className="flex gap-2 mt-auto">
                                                                <button onClick={() => setEditingAdmin(admin)} className="flex-1 py-1.5 bg-slate-50 dark:bg-slate-700 rounded-lg text-xs font-bold hover:bg-indigo-50 hover:text-indigo-600 transition-colors">Edit</button>
                                                                <button onClick={() => handleDeleteUser(admin.email)} className="flex-1 py-1.5 bg-red-50 dark:bg-red-900/10 rounded-lg text-xs font-bold text-red-500 hover:bg-red-100 transition-colors">Remove</button>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* All Team Cards Section */}
                        <section className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2"><Users size={20} /> Team Cards (Public Display)</h3>
                                {(currentUser.adminRole === 'super_admin' || currentUser.adminRole === 'manager') && (
                                    <button onClick={() => setEditingTeamCard({
                                        id: Math.random().toString(36).substr(2, 9),
                                        name: '', role: '', bio: '', emoji: '👤', specialization: '', isFeatured: false
                                    })} className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all text-sm flex items-center gap-2">
                                        <Plus size={16} /> Add Card
                                    </button>
                                )}
                            </div>
                            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {teamMembers.map(member => {
                                    const canEdit = currentUser.adminRole === 'super_admin' ||
                                        currentUser.adminRole === 'manager' ||
                                        member.linkedEmail === currentUser.email;
                                    return (
                                        <div key={member.id} className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-700 relative group">
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/40 dark:to-purple-900/40 flex items-center justify-center text-2xl overflow-hidden border border-indigo-200/50 dark:border-indigo-700/30">
                                                    {member.profileImage ? <img src={member.profileImage} alt={member.name} className="w-full h-full object-cover" /> : member.emoji}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-bold text-slate-900 dark:text-white text-sm truncate">{member.name}</h4>
                                                    <p className="text-xs text-indigo-600 dark:text-indigo-400 font-bold truncate">{member.role}</p>
                                                    <span className="text-[9px] uppercase font-bold bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-300 px-1.5 py-0.5 rounded">{member.specialization}</span>
                                                </div>
                                            </div>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-3">{member.bio}</p>
                                            <div className="flex items-center justify-between">
                                                <div className="flex gap-1">
                                                    {member.isFeatured && <span className="text-[9px] bg-amber-100 dark:bg-amber-900/20 text-amber-600 px-1.5 py-0.5 rounded font-bold">⭐ Featured</span>}
                                                    {member.linkedEmail && <span className="text-[9px] bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 px-1.5 py-0.5 rounded font-bold">🔗 Linked</span>}
                                                </div>
                                                <div className="flex gap-1">
                                                    {canEdit && (
                                                        <button onClick={() => setEditingTeamCard({ ...member })} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors" title="Edit">
                                                            <Edit3 size={14} />
                                                        </button>
                                                    )}
                                                    {(currentUser.adminRole === 'super_admin' || currentUser.adminRole === 'manager') && (
                                                        <button onClick={() => handleDeleteTeamCard(member.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" title="Delete">
                                                            <Trash2 size={14} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    </div>
                )}

                {/* ... (Existing Tabs: inquiries, feedback_hub, chats, students - logic mostly same, preserving existing rendering) ... */}
                {activeTab === 'inquiries' && (
                    <div className="space-y-4">
                        {localFeedback.length === 0 ? <div className="text-center py-20 text-slate-400">No inquiries yet.</div> :
                            localFeedback.map(entry => (
                                <div key={entry.id} className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                    <div className="flex justify-between mb-4">
                                        <div><h4 className="font-bold text-slate-900 dark:text-white">{entry.name}</h4><div className="text-xs text-slate-500">{entry.email} • {formatTime(entry.timestamp)}</div></div>
                                        <div className="flex gap-2"><button onClick={() => handleDeleteInquiry(entry.id)} className="text-red-500"><Trash2 size={18} /></button><button onClick={() => { setReplyingTo(entry.id); setReplyText(''); }} className="text-indigo-600 font-bold text-xs uppercase flex items-center gap-1"><MessageCircle size={16} /> Reply</button></div>
                                    </div>
                                    <p className="text-sm text-slate-700 dark:text-slate-300 italic bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl">"{entry.message}"</p>
                                </div>
                            ))
                        }
                    </div>
                )}

                {/* DIRECT CHATS TAB */}
                {activeTab === 'direct_chats' && (
                    <div className="grid lg:grid-cols-3 gap-6 h-[calc(100vh-12rem)]">
                        {/* Chat List Sidebar */}
                        <div className="bg-white dark:bg-slate-800 rounded-[2rem] border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col">
                            <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                                <h3 className="font-black text-slate-900 dark:text-white">Student Chats</h3>
                                {isFetchingDirectChats && <span className="text-[10px] bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded text-slate-500 animate-pulse">Syncing...</span>}
                            </div>
                            <div className="flex-1 overflow-y-auto custom-scrollbar">
                                {directChats.length === 0 ? (
                                    <div className="text-center py-16 text-slate-400 text-xs">No conversations yet.<br />Students can start chats from their dashboard.</div>
                                ) : directChats.map(chat => (
                                    <div key={chat.id} onClick={() => setActiveDirectChat(chat)} className={`p-4 border-b border-slate-100 dark:border-slate-700 cursor-pointer transition-all hover:bg-slate-50 dark:hover:bg-slate-900/50 ${activeDirectChat?.id === chat.id ? 'bg-indigo-50 dark:bg-indigo-900/20 border-l-4 border-l-indigo-500' : ''}`}>
                                        <div className="flex items-center justify-between mb-1">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center text-xs font-bold text-indigo-600 dark:text-indigo-400">{chat.studentName.charAt(0)}</div>
                                                <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate max-w-[120px]">{chat.studentName}</h4>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                {chat.status === 'escalated' && <span className="text-[9px] bg-amber-100 dark:bg-amber-900/30 text-amber-600 px-1.5 py-0.5 rounded font-bold">⚠️</span>}
                                                <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${chat.status === 'open' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600' : chat.status === 'escalated' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'}`}>{chat.status}</span>
                                            </div>
                                        </div>
                                        <p className="text-[11px] text-slate-500 truncate mt-1">{chat.messages[chat.messages.length - 1]?.text || 'No messages'}</p>
                                        <p className="text-[9px] text-slate-400 mt-1">{new Date(chat.lastMessageAt).toLocaleDateString()} · {chat.messages.length} msgs</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Active Chat View */}
                        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-[2rem] border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col">
                            {activeDirectChat ? (
                                <>
                                    {/* Chat Header */}
                                    <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center text-sm font-bold text-indigo-600">{activeDirectChat.studentName.charAt(0)}</div>
                                            <div>
                                                <h4 className="font-bold text-slate-900 dark:text-white">{activeDirectChat.studentName}</h4>
                                                <p className="text-[10px] text-slate-500">{activeDirectChat.studentEmail}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {(currentUser.adminRole === 'chat_officer' || currentUser.adminRole === 'support') && activeDirectChat.status !== 'closed' && (
                                                <button onClick={() => setShowEscalateModal(true)} className="px-3 py-1.5 bg-amber-50 dark:bg-amber-900/20 text-amber-600 rounded-xl text-xs font-bold hover:bg-amber-100 transition-colors flex items-center gap-1">⚠️ Escalate</button>
                                            )}
                                            {(currentUser.adminRole === 'super_admin' || currentUser.adminRole === 'manager') && activeDirectChat.status !== 'closed' && (
                                                <button onClick={() => handleCloseDirectChat(activeDirectChat.id)} className="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-red-50 hover:text-red-600 transition-colors">Close Chat</button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Escalation Banner */}
                                    {activeDirectChat.status === 'escalated' && (
                                        <div className="px-4 py-2 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-100 dark:border-amber-800 flex items-center gap-2 text-xs text-amber-700 dark:text-amber-400 font-bold">
                                            ⚠️ Escalated to {activeDirectChat.escalatedTo} — {activeDirectChat.escalationReason}
                                        </div>
                                    )}
                                    {activeDirectChat.status === 'closed' && (
                                        <div className="px-4 py-2 bg-slate-50 dark:bg-slate-900/30 border-b border-slate-100 dark:border-slate-700 text-center text-xs text-slate-500 font-bold">This conversation has been closed.</div>
                                    )}

                                    {/* Messages */}
                                    <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                                        {activeDirectChat.messages.map(msg => (
                                            <div key={msg.id} className={`flex ${msg.senderRole === 'admin' ? 'justify-end' : 'justify-start'}`}>
                                                <div className={`max-w-[75%] p-3 rounded-2xl ${msg.isEscalation ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800' : msg.senderRole === 'admin' ? 'bg-indigo-600 text-white rounded-br-md' : 'bg-slate-100 dark:bg-slate-700 rounded-bl-md'}`}>
                                                    <p className={`text-[10px] font-bold mb-1 ${msg.senderRole === 'admin' && !msg.isEscalation ? 'text-indigo-200' : 'text-slate-500 dark:text-slate-400'}`}>{msg.senderName}</p>
                                                    <p className={`text-sm ${msg.senderRole === 'admin' && !msg.isEscalation ? 'text-white' : 'text-slate-900 dark:text-white'}`}>{msg.text}</p>
                                                    {msg.attachment && (
                                                        <div className="mt-2">
                                                            {msg.attachment.type.startsWith('image/') ? (
                                                                <img src={msg.attachment.data} alt={msg.attachment.name} className="max-w-full max-h-48 rounded-lg border border-white/20" />
                                                            ) : (
                                                                <a href={msg.attachment.data} download={msg.attachment.name} className={`text-xs underline ${msg.senderRole === 'admin' ? 'text-indigo-200' : 'text-indigo-600'}`}>📎 {msg.attachment.name}</a>
                                                            )}
                                                        </div>
                                                    )}
                                                    <p className={`text-[9px] mt-1 ${msg.senderRole === 'admin' && !msg.isEscalation ? 'text-indigo-300' : 'text-slate-400'}`}>{new Date(msg.timestamp).toLocaleTimeString()}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Message Input */}
                                    {activeDirectChat.status !== 'closed' && (
                                        <div className="p-4 border-t border-slate-100 dark:border-slate-700">
                                            {directChatAttachment && (
                                                <div className="mb-2 flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-900/50 rounded-xl text-xs">
                                                    <span className="text-slate-600 dark:text-slate-300">📎 {directChatAttachment.name}</span>
                                                    <button onClick={() => setDirectChatAttachment(null)} className="text-red-500 hover:underline text-[10px]">Remove</button>
                                                </div>
                                            )}
                                            <div className="flex items-center gap-2">
                                                <label className="p-2.5 bg-slate-100 dark:bg-slate-700 rounded-xl cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
                                                    <Upload size={18} className="text-slate-500" />
                                                    <input type="file" accept="image/*,.pdf,.doc,.docx,.zip" onChange={handleDirectChatFileUpload} className="hidden" />
                                                </label>
                                                <input
                                                    className="flex-1 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                                                    placeholder="Type a message..."
                                                    value={directChatMsg}
                                                    onChange={e => setDirectChatMsg(e.target.value)}
                                                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSendDirectMsg()}
                                                />
                                                <button onClick={handleSendDirectMsg} disabled={isSendingDirect || (!directChatMsg.trim() && !directChatAttachment)} className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all disabled:opacity-50 shadow-lg shadow-indigo-200 dark:shadow-none">
                                                    <Send size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
                                    <div className="text-center">
                                        <MessageCircle size={48} className="mx-auto mb-4 opacity-30" />
                                        <p className="font-bold">Select a conversation</p>
                                        <p className="text-xs mt-1">Choose a student chat from the left panel</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Escalation Modal */}
                {showEscalateModal && activeDirectChat && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                        <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-3xl p-6 shadow-2xl animate-in zoom-in duration-200">
                            <h3 className="text-lg font-black text-slate-900 dark:text-white mb-4">⚠️ Escalate Chat</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Escalating <strong>{activeDirectChat.studentName}</strong>'s chat to a Manager or Super Admin. Provide a reason below.</p>
                            <textarea
                                className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-amber-500 min-h-[80px] dark:text-white"
                                placeholder="Reason for escalation..."
                                value={escalateReason}
                                onChange={e => setEscalateReason(e.target.value)}
                            />
                            <div className="flex gap-3 mt-6">
                                <button onClick={() => { setShowEscalateModal(false); setEscalateReason(''); }} className="flex-1 py-3 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold rounded-xl">Cancel</button>
                                <button onClick={handleEscalateChat} disabled={!escalateReason.trim()} className="flex-[2] py-3 bg-amber-500 text-white font-bold rounded-xl hover:bg-amber-600 disabled:opacity-50">Escalate</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* AI CHATS TAB */}
                {activeTab === 'chats' && (
                    <div className="grid lg:grid-cols-3 gap-6 h-[calc(100vh-12rem)]">
                        <div className="bg-white dark:bg-slate-800 rounded-[2rem] border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col">
                            <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                                <h3 className="font-black text-slate-900 dark:text-white">Sessions</h3>
                                {isFetchingChats && <span className="text-[10px] bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded text-slate-500 animate-pulse">Syncing...</span>}
                            </div>
                            <div className="flex-1 overflow-y-auto custom-scrollbar">
                                {chatSessions.length === 0 ? (
                                    <div className="p-8 text-center text-slate-400 text-sm">No chats recorded.</div>
                                ) : (
                                    chatSessions.map(session => (
                                        <div key={session.id} className="relative group">
                                            <button
                                                onClick={() => setViewingChat(session)}
                                                className={`w-full p-4 text-left border-b border-slate-50 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${viewingChat?.id === session.id ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''}`}
                                            >
                                                <div className="flex justify-between items-start mb-1">
                                                    <span className="font-bold text-slate-700 dark:text-slate-200 text-sm">{session.visitorName || 'Visitor'}</span>
                                                    <span className="text-[10px] text-slate-400">{formatTime(session.lastMessageTime)}</span>
                                                </div>
                                                <p className="text-xs text-slate-500 truncate mr-6">
                                                    {(session.messages && session.messages.length > 0) ? (session.messages[session.messages.length - 1]?.text || 'No messages') : 'Empty Session'}
                                                </p>
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleDeleteChat(session.id); }}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-red-400 opacity-0 group-hover:opacity-100 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-all"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-[2rem] border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col relative">
                            {viewingChat ? (
                                <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                                    {(viewingChat.messages || []).map((msg, idx) => (
                                        <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-tl-none'}`}>
                                                {msg.text}
                                                <div className={`text-[9px] mt-1 text-right ${msg.role === 'user' ? 'text-indigo-200' : 'text-slate-400'}`}>
                                                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8">
                                    <MessageSquare size={48} className="mb-4 opacity-50" />
                                    <p>Select a chat session to view transcript</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* STUDENTS */}
                {activeTab === 'students' && (
                    <div>
                        {students.length === 0 ? (
                            <div className="text-center py-20 text-slate-400 flex flex-col items-center gap-4">
                                <Users size={48} />
                                <div className="font-bold">No students registered yet.</div>
                            </div>
                        ) : (
                            <div className={studentView === 'grid' ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4" : "space-y-3"}>
                                {sortedStudents.map(student => (
                                    <div
                                        key={student.id}
                                        className={`bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all cursor-pointer shadow-sm ${studentView === 'list' ? 'flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4' : 'flex flex-col'}`}
                                        onClick={() => setViewingStudent(student)}
                                    >
                                        <div className="flex items-center gap-4 w-full">
                                            <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-lg shrink-0 overflow-hidden">
                                                {student.avatar ? <img src={student.avatar} alt={student.name} className="w-full h-full object-cover" /> : (student.name || '?').charAt(0)}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <h4 className="font-bold text-slate-900 dark:text-white truncate">{student.name || 'Unknown User'}</h4>
                                                <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{student.email || 'No Email'}</div>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-[10px] bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-slate-500">{student.phone || 'No Phone'}</span>
                                                    {student.eligibilityResult && <span className="text-[10px] bg-green-100 dark:bg-green-900/30 text-green-700 px-1.5 py-0.5 rounded">Eligible Checked</span>}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* FEEDBACK HUB */}
                {activeTab === 'feedback_hub' && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm">
                                <div className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-1 flex justify-between">
                                    <span>Total Submissions</span>
                                    {isFetchingFeedback && <span className="text-[9px] bg-slate-100 px-2 rounded animate-pulse">Syncing</span>}
                                </div>
                                <div className="text-3xl font-black text-slate-900 dark:text-white">{platformFeedback.length}</div>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-slate-800 rounded-[2rem] border border-slate-200 dark:border-slate-700 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700">
                                        <tr>
                                            <th className="p-4 text-xs font-black text-slate-400 uppercase">ID / Time</th>
                                            <th className="p-4 text-xs font-black text-slate-400 uppercase">Message</th>
                                            <th className="p-4 text-xs font-black text-slate-400 uppercase text-right">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                                        {platformFeedback.length === 0 ? (
                                            <tr><td colSpan={3} className="p-8 text-center text-slate-400 text-sm">No feedback received yet.</td></tr>
                                        ) : (
                                            platformFeedback.map(fb => (
                                                <tr key={fb.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                                    <td className="p-4 align-top w-48">
                                                        <div className="font-bold text-slate-700 dark:text-slate-300 text-xs">public-{(fb.id || '').substring(0, 6)}</div>
                                                        <div className="text-[10px] text-slate-400 mt-1">{new Date(fb.timestamp).toLocaleString()}</div>
                                                        <div className="mt-2 inline-block px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-[9px] font-bold uppercase text-slate-500">{fb.feedbackType}</div>
                                                    </td>
                                                    <td className="p-4 align-top">
                                                        <p className="text-sm text-slate-700 dark:text-slate-300 font-medium leading-relaxed whitespace-pre-wrap">{fb.message}</p>
                                                        {fb.email && <div className="mt-1 text-xs text-indigo-500 font-bold">Contact: {fb.email}</div>}
                                                    </td>
                                                    <td className="p-4 align-top text-right w-32">
                                                        {fb.status === 'new' ? (
                                                            <button
                                                                onClick={() => handleMarkFeedbackReviewed(fb.id)}
                                                                className="px-3 py-1.5 bg-green-50 text-green-600 rounded-lg text-xs font-bold hover:bg-green-100 transition-colors flex items-center gap-1 ml-auto"
                                                            >
                                                                <CheckCircle size={14} /> Mark Read
                                                            </button>
                                                        ) : (
                                                            <span className="text-green-500 text-xs font-bold flex items-center justify-end gap-1"><CheckCircle size={14} /> Reviewed</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

            </main>

            {/* Reply Modal */}
            {replyingTo && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-lg rounded-2xl p-6 shadow-xl">
                        <h3 className="text-xl font-bold mb-4 dark:text-white">Reply</h3>
                        <textarea className="w-full p-3 border rounded-xl h-32 dark:bg-slate-700 dark:text-white" value={replyText} onChange={e => setReplyText(e.target.value)} />
                        <div className="flex justify-end gap-2 mt-4">
                            <button onClick={() => setReplyingTo(null)} className="px-4 py-2 rounded-lg bg-slate-200 dark:bg-slate-700 font-bold text-sm">Cancel</button>
                            <button onClick={handleSendReply} className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-bold text-sm">Send</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Admin Modal */}
            {editingAdmin && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-3xl p-8 shadow-2xl animate-in zoom-in duration-200">
                        <h3 className="text-xl font-black text-slate-900 dark:text-white mb-6">Edit Team Member</h3>
                        <div className="space-y-4">
                            <div><label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Name</label><input className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl" value={editingAdmin.name} onChange={e => setEditingAdmin({ ...editingAdmin, name: e.target.value })} /></div>
                            <div><label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Role</label><select className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl" value={editingAdmin.adminRole || 'support'} onChange={e => setEditingAdmin({ ...editingAdmin, adminRole: e.target.value as AdminRole })}>{Object.keys(PERMISSIONS).map(r => <option key={r} value={r}>{r}</option>)}</select></div>
                            <div><label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Reset Password</label><input type="password" className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl" placeholder="New Password" onChange={e => e.target.value && setEditingAdmin({ ...editingAdmin, password: e.target.value })} /></div>
                        </div>
                        <div className="flex gap-3 mt-8">
                            <button onClick={() => setEditingAdmin(null)} className="flex-1 py-3 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold rounded-xl">Cancel</button>
                            <button onClick={handleUpdateAdmin} className="flex-[2] py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700">Save Changes</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Team Card Modal */}
            {editingTeamCard && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setEditingTeamCard(null)}>
                    <div className="bg-white dark:bg-slate-800 w-full max-w-lg rounded-3xl p-6 md:p-8 shadow-2xl animate-in zoom-in duration-200 max-h-[90vh] overflow-y-auto custom-scrollbar" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-black text-slate-900 dark:text-white">Edit Team Card</h3>
                            <button onClick={() => setEditingTeamCard(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors"><X size={20} /></button>
                        </div>

                        {/* Profile Picture */}
                        <div className="flex flex-col items-center mb-6">
                            <div className="relative group">
                                <div className="w-28 h-28 rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/40 dark:to-purple-900/40 flex items-center justify-center text-5xl overflow-hidden border-2 border-indigo-200 dark:border-indigo-700 shadow-lg">
                                    {editingTeamCard.profileImage ? <img src={editingTeamCard.profileImage} alt="" className="w-full h-full object-cover" /> : editingTeamCard.emoji}
                                </div>
                                <label className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                    <Camera size={24} className="text-white" />
                                    <input type="file" accept="image/*" onChange={handleTeamCardImageUpload} className="hidden" />
                                </label>
                            </div>
                            <p className="text-xs text-slate-400 mt-2">Click to upload photo</p>
                            {editingTeamCard.profileImage && (
                                <button onClick={() => setEditingTeamCard({ ...editingTeamCard, profileImage: undefined })} className="text-xs text-red-500 hover:underline mt-1">Remove photo</button>
                            )}
                        </div>

                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Name</label>
                                    <input className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white" value={editingTeamCard.name} onChange={e => setEditingTeamCard({ ...editingTeamCard, name: e.target.value })} />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Emoji</label>
                                    <input className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white" value={editingTeamCard.emoji} onChange={e => setEditingTeamCard({ ...editingTeamCard, emoji: e.target.value })} placeholder="👤" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Role / Title</label>
                                    <input className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white" value={editingTeamCard.role} onChange={e => setEditingTeamCard({ ...editingTeamCard, role: e.target.value })} placeholder="e.g. Senior Mentor" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Specialization</label>
                                    <input className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white" value={editingTeamCard.specialization} onChange={e => setEditingTeamCard({ ...editingTeamCard, specialization: e.target.value })} placeholder="e.g. Admissions" />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Bio</label>
                                <textarea className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 resize-none min-h-[80px] dark:text-white" value={editingTeamCard.bio} onChange={e => setEditingTeamCard({ ...editingTeamCard, bio: e.target.value })} placeholder="Short bio..." />
                            </div>

                            {/* Social Links */}
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Social Links</label>
                                <div className="space-y-2">
                                    <input className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white" placeholder="WhatsApp URL" value={editingTeamCard.socials?.whatsapp || ''} onChange={e => setEditingTeamCard({ ...editingTeamCard, socials: { ...editingTeamCard.socials, whatsapp: e.target.value } })} />
                                    <input className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-pink-500 dark:text-white" placeholder="Instagram URL" value={editingTeamCard.socials?.instagram || ''} onChange={e => setEditingTeamCard({ ...editingTeamCard, socials: { ...editingTeamCard.socials, instagram: e.target.value } })} />
                                    <input className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-red-500 dark:text-white" placeholder="YouTube URL" value={editingTeamCard.socials?.youtube || ''} onChange={e => setEditingTeamCard({ ...editingTeamCard, socials: { ...editingTeamCard.socials, youtube: e.target.value } })} />
                                </div>
                            </div>

                            {/* Toggles */}
                            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-700">
                                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">⭐ Featured on Homepage</span>
                                <button onClick={() => setEditingTeamCard({ ...editingTeamCard, isFeatured: !editingTeamCard.isFeatured })} className={`w-12 h-6 rounded-full transition-colors relative ${editingTeamCard.isFeatured ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
                                    <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${editingTeamCard.isFeatured ? 'left-7' : 'left-1'}`}></div>
                                </button>
                            </div>

                            {/* Linked Email — super_admin only */}
                            {currentUser.adminRole === 'super_admin' && (
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Linked Admin Email</label>
                                    <input className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white" value={editingTeamCard.linkedEmail || ''} onChange={e => setEditingTeamCard({ ...editingTeamCard, linkedEmail: e.target.value })} placeholder="admin@example.com" />
                                    <p className="text-[10px] text-slate-400 mt-1 ml-1">Links this card to an admin's account so they can edit it</p>
                                </div>
                            )}
                        </div>

                        <div className="flex gap-3 mt-8">
                            <button onClick={() => setEditingTeamCard(null)} className="flex-1 py-3 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">Cancel</button>
                            <button onClick={() => handleSaveTeamCard(editingTeamCard)} disabled={isSavingTeamCard || !editingTeamCard.name} className="flex-[2] py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 dark:shadow-none disabled:opacity-50 flex items-center justify-center gap-2">
                                {isSavingTeamCard ? 'Saving...' : <><Save size={18} /> Save Card</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};