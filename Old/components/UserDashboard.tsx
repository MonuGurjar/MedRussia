import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, FeedbackEntry, AppSettings, EligibilityData, DocumentMetadata } from '../types';
import { getUserFeedback, saveFeedback, toggleShortlist, updateUserDocuments, updateUserEligibility, fetchUsersFromUpstash, updateUser } from '../services/db';
import { getSettings } from '../services/settings';
import { uploadFileToCloudinary } from '../services/storage';
import { checkEligibility } from '../services/gemini';
import { CurrencyConverter } from './CurrencyConverter';
import { BudgetCalculator } from './BudgetCalculator';
import { SocialFab } from './SocialFab';
import { PlatformFeedbackModal } from './PlatformFeedbackModal';
import { RUSSIAN_UNIVERSITIES, getUniversityData } from '../constants/universities';
import { getStudentChats, createDirectChat, sendDirectMessage } from '../services/directChat';
import { DirectChat, DirectMessageAttachment } from '../types';
import {
    LayoutDashboard, Compass, Calculator, ClipboardCheck, User as UserIcon, FolderOpen, HelpCircle,
    Settings, LogOut, Menu, X, Home, Search, Lock, Bell, Globe, ShieldCheck, Sun, Moon, Send, Upload,
    CheckCircle, AlertCircle, ExternalLink, Heart, Clock, FileText, MessageSquarePlus, XCircle, Mail, Key, MessageCircle, Paperclip
} from 'lucide-react';

interface UserDashboardProps {
    user: User;
    onLogout: () => void;
    onInquirySubmitted?: () => void;
    initialView?: 'inquiries' | 'explorer' | 'budget' | 'profile' | 'settings' | 'help' | 'documents' | 'eligibility';
    onFabToggle?: (isOpen: boolean) => void;
    theme?: 'light' | 'dark';
    toggleTheme?: () => void;
    onToggleCurrency?: () => void;
}

const ALL_TABS = [
    { id: 'inquiries', label: 'Inquiries', icon: <LayoutDashboard size={20} /> },
    { id: 'chats', label: 'Chat', icon: <MessageCircle size={20} /> },
    { id: 'explorer', label: 'Uni Explorer', icon: <Compass size={20} /> },
    { id: 'budget', label: 'Budget Calc', icon: <Calculator size={20} /> },
    { id: 'eligibility', label: 'Eligibility', icon: <ClipboardCheck size={20} /> },
    { id: 'profile', label: 'Profile', icon: <UserIcon size={20} /> },
    { id: 'documents', label: 'Checklist', icon: <FolderOpen size={20} /> },
    { id: 'help', label: 'Help', icon: <HelpCircle size={20} /> },
    { id: 'settings', label: 'Settings', icon: <Settings size={20} /> }
] as const;

const MOBILE_TABS = [
    { id: 'inquiries', label: 'Home', icon: <Home size={20} /> },
    { id: 'chats', label: 'Chat', icon: <MessageCircle size={20} /> },
    { id: 'explorer', label: 'Search', icon: <Compass size={20} /> },
    { id: 'eligibility', label: 'Check', icon: <ClipboardCheck size={20} /> },
];

const SECURITY_QUESTIONS = [
    "What is the name of your first pet?",
    "What city were you born in?",
    "What is your mother's maiden name?",
    "What is the name of your favorite teacher?"
];

const getStatusLabel = (status: string) => {
    switch (status) {
        case 'pending': return { label: 'New', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' };
        case 'replied': return { label: 'Replied', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' };
        case 'closed': return { label: 'Closed', color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400' };
        default: return { label: status, color: 'bg-slate-100 text-slate-700' };
    }
};

const getDocStatusStyle = (status: string) => {
    switch (status) {
        case 'verified': return 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400';
        case 'rejected': return 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400';
        case 'uploaded': return 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400';
        default: return 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400';
    }
}

const getEligibilityStatus = (result: string) => {
    if (!result) return 'unknown';
    const lower = result.toLowerCase();
    if (lower.includes('not eligible')) return 'not_eligible';
    if (lower.includes('conditionally') || lower.includes('borderline')) return 'borderline';
    if (lower.includes('eligible')) return 'eligible';
    return 'unknown';
};

export const UserDashboard: React.FC<UserDashboardProps> = ({
    user,
    onLogout,
    onInquirySubmitted,
    initialView = 'inquiries',
    onFabToggle,
    theme,
    toggleTheme,
    onToggleCurrency
}) => {
    const navigate = useNavigate();
    const [entries, setEntries] = useState<FeedbackEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [showInquiryForm, setShowInquiryForm] = useState(false);
    const [activeView, setActiveView] = useState(initialView);

    // Notification State
    const [showNotifications, setShowNotifications] = useState(false);
    const [notifications, setNotifications] = useState<{ id: string, text: string, type: 'info' | 'success' | 'alert' | 'recommendation', time: string }[]>([]);

    // Mobile Menu State
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Settings State
    const [settings, setSettings] = useState<AppSettings | null>(null);
    const [passData, setPassData] = useState({ current: '', new: '', confirm: '' });
    const [savingSettings, setSavingSettings] = useState(false);

    // Profile State
    const [profileData, setProfileData] = useState({
        name: user.name,
        phone: user.phone || '',
        university: user.university || ''
    });
    const [avatar, setAvatar] = useState<string | null>(user.avatar || null);
    const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

    // Documents State
    const [uploadingDoc, setUploadingDoc] = useState<'marksheet' | 'passport' | 'neetScoreCard' | null>(null);

    // Eligibility State
    const [eligibilityForm, setEligibilityForm] = useState<EligibilityData>(user.eligibilityData || {
        pcbPercentage: '',
        category: 'General',
        isPwd: false,
        neetScore: '',
        dob: '',
        medium: 'English',
        knowsRussian: false,
        passportStatus: 'Have',
        medicalHistory: ''
    });
    const [eligibilityResult, setEligibilityResult] = useState<string | null>(user.eligibilityResult || null);
    const [checkingEligibility, setCheckingEligibility] = useState(false);

    // Search and Filter
    const [uniSearch, setUniSearch] = useState('');
    const [shortlist, setShortlist] = useState<string[]>(user.shortlistedUniversities || []);

    const [newInquiry, setNewInquiry] = useState({
        targetUniversity: '',
        message: '',
        budget: '',
        currentStatus: 'NEET Aspirant' as any
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [eligibilityDataFound, setEligibilityDataFound] = useState<string | null>(null);

    // Direct Chat State
    const [studentChats, setStudentChats] = useState<DirectChat[]>([]);
    const [activeStudentChat, setActiveStudentChat] = useState<DirectChat | null>(null);
    const [studentChatMsg, setStudentChatMsg] = useState('');
    const [studentChatAttachment, setStudentChatAttachment] = useState<DirectMessageAttachment | null>(null);
    const [isSendingChat, setIsSendingChat] = useState(false);
    const [isLoadingChats, setIsLoadingChats] = useState(false);

    // Security Question Modal
    const [showSecurityPrompt, setShowSecurityPrompt] = useState(false);
    const [recoveryData, setRecoveryData] = useState({ question: SECURITY_QUESTIONS[0], answer: '' });

    useEffect(() => {
        setActiveView(initialView);
    }, [initialView]);

    // Check for Security Question on Mount
    useEffect(() => {
        if (!user.recoveryQuestion && !user.recoveryAnswer) {
            setShowSecurityPrompt(true);
        }
    }, [user]);

    // Fetch chats when Chat tab is active
    useEffect(() => {
        if (activeView === 'chats') {
            setIsLoadingChats(true);
            getStudentChats(user.id).then(chats => {
                setStudentChats(chats);
                if (chats.length > 0 && !activeStudentChat) setActiveStudentChat(chats[0]);
            }).catch(console.error).finally(() => setIsLoadingChats(false));
        }
    }, [activeView]);

    const fetchFeedbackAndNotifications = async () => {
        setLoading(true);
        const data = await getUserFeedback(user.id);
        setEntries(data);
        setLoading(false);

        // Notifications Logic
        const newNotifs = [];
        try {
            const users = await fetchUsersFromUpstash();
            const freshUser = users.find((u: any) => u.id === user.id);
            if (freshUser && freshUser.notifications) {
                freshUser.notifications.forEach((n: any) => {
                    newNotifs.push({
                        id: n.id,
                        text: n.message,
                        type: n.type,
                        time: new Date(n.timestamp).toLocaleDateString()
                    });
                });
            }
        } catch (e) { console.error(e); }

        const repliedEntries = data.filter(e => e.status === 'replied');
        if (repliedEntries.length > 0) {
            newNotifs.push({
                id: 'reply-' + repliedEntries[0].id,
                text: `Admin replied to your inquiry about ${repliedEntries[0].targetUniversity}`,
                type: 'success' as const,
                time: 'Recent'
            });
        }
        setNotifications(newNotifs);
    };

    useEffect(() => {
        fetchFeedbackAndNotifications();
        getSettings().then(data => { setSettings(data); });

        const pendingScore = localStorage.getItem('mr_neet_score');
        if (pendingScore) {
            setEligibilityDataFound(pendingScore);
            setEligibilityForm(prev => ({ ...prev, neetScore: pendingScore }));
            setNewInquiry(prev => ({
                ...prev,
                currentStatus: 'NEET Aspirant',
                message: `Eligibility Check: My NEET Score is ${pendingScore}. What are my chances?`,
                budget: 'Not sure yet'
            }));
            setActiveView('eligibility');
            localStorage.removeItem('mr_neet_score');
        }
    }, [user.id]);

    const handleToggleShortlist = (uni: string) => {
        const newList = toggleShortlist(user.id, uni);
        setShortlist([...newList]);
    };

    const handleSubmitInquiry = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await saveFeedback({
                userId: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone || 'N/A',
                university: user.university || 'N/A',
                ...newInquiry
            });
            setShowInquiryForm(false);
            setNewInquiry({ targetUniversity: '', message: '', budget: '', currentStatus: 'NEET Aspirant' });
            fetchFeedbackAndNotifications();
            if (onInquirySubmitted) onInquirySubmitted();
        } catch (err) {
            alert('Failed to submit inquiry');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSaveSecurityQuestion = async () => {
        if (!recoveryData.answer.trim()) return;
        try {
            const updatedUser = { ...user, recoveryQuestion: recoveryData.question, recoveryAnswer: recoveryData.answer };
            await updateUser(updatedUser);

            // Update local storage to reflect immediately
            localStorage.setItem('mr_active_user', JSON.stringify(updatedUser));

            setShowSecurityPrompt(false);
            alert("Recovery question saved!");
        } catch (e) {
            alert("Failed to save security question.");
        }
    };

    // ... (Other handlers: CheckEligibility, Avatar, Profile, Settings, FileUpload - No changes needed) ...
    const handleCheckEligibility = async () => {
        setCheckingEligibility(true);
        try {
            const result = await checkEligibility(eligibilityForm);
            setEligibilityResult(result);
            await updateUserEligibility(user.id, eligibilityForm, result);
        } catch (e) { alert("Failed check"); } finally { setCheckingEligibility(false); }
    };

    const handleProfileUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsUpdatingProfile(true);
        await new Promise(r => setTimeout(r, 600));
        try {
            const updatedUser = { ...user, ...profileData, avatar };
            await updateUser(updatedUser);
            localStorage.setItem('mr_active_user', JSON.stringify(updatedUser));
            setIsUpdatingProfile(false);
            alert('Profile updated!');
        } catch (e) { setIsUpdatingProfile(false); }
    };

    const handleSettingsSave = async () => {
        setSavingSettings(true);
        await new Promise(r => setTimeout(r, 800));
        if (passData.new && passData.new !== passData.confirm) {
            alert("Passwords do not match!"); setSavingSettings(false); return;
        }
        setPassData({ current: '', new: '', confirm: '' });
        setSavingSettings(false);
        alert("Settings updated!");
    };

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) { alert("Image too large"); return; }
            const reader = new FileReader();
            reader.onloadend = () => setAvatar(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: any) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) { alert("Max 5MB"); return; }
        setUploadingDoc(type);
        try {
            const uploadData = await uploadFileToCloudinary(file);
            const metaData: DocumentMetadata = { url: uploadData.secure_url, publicId: uploadData.public_id, status: 'uploaded', uploadedAt: Date.now() };
            await updateUserDocuments(user.id, type, metaData);
            if (!user.documents) user.documents = {}; user.documents[type] = metaData;
            alert(`Uploaded!`);
        } catch (err: any) { alert(`Failed: ${err.message}`); } finally { setUploadingDoc(null); }
    };

    // Direct Chat Handlers
    const handleStartNewChat = async () => {
        if (!studentChatMsg.trim() && !studentChatAttachment) return;
        setIsSendingChat(true);
        try {
            const newChat = await createDirectChat(user.id, user.name, user.email, studentChatMsg.trim(), studentChatAttachment || undefined);
            setStudentChats(prev => [newChat, ...prev]);
            setActiveStudentChat(newChat);
            setStudentChatMsg('');
            setStudentChatAttachment(null);
        } catch (e) { alert('Failed to start chat'); }
        finally { setIsSendingChat(false); }
    };

    const handleSendStudentMsg = async () => {
        if (!activeStudentChat || (!studentChatMsg.trim() && !studentChatAttachment)) return;
        setIsSendingChat(true);
        try {
            const updated = await sendDirectMessage(
                activeStudentChat.id, user.id, user.name, 'student',
                studentChatMsg.trim(), studentChatAttachment || undefined
            );
            if (updated) {
                setStudentChats(prev => prev.map(c => c.id === updated.id ? updated : c));
                setActiveStudentChat(updated);
            }
            setStudentChatMsg('');
            setStudentChatAttachment(null);
        } catch (e) { alert('Failed to send'); }
        finally { setIsSendingChat(false); }
    };

    const handleStudentChatFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) { alert('Max 5MB'); return; }
        const reader = new FileReader();
        reader.onloadend = () => {
            setStudentChatAttachment({ name: file.name, type: file.type, data: reader.result as string });
        };
        reader.readAsDataURL(file);
    };

    return (
        <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
            {/* ... Sidebar and Mobile Nav (Same as before) ... */}
            <aside className="hidden md:flex fixed top-0 left-0 z-40 h-screen w-64 bg-white dark:bg-slate-800 border-r border-slate-100 dark:border-slate-700 flex-col overflow-y-auto transition-colors duration-300">
                <div className="h-20 flex items-center px-6 border-b border-slate-100 dark:border-slate-700 shrink-0 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors" onClick={() => navigate('/')}>
                    <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center text-white font-black text-xs mr-3 shadow-[0_3px_0_rgb(49,46,129)] border border-indigo-400">MR</div>
                    <span className="font-black text-xl text-slate-900 dark:text-white tracking-tight">MedRussia</span>
                </div>
                <div className="p-4 space-y-2 flex-1">
                    {ALL_TABS.map(tab => (
                        <button key={tab.id} onClick={() => setActiveView(tab.id as any)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeView === tab.id ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                            {tab.icon} {tab.label}
                        </button>
                    ))}
                </div>
                <div className="p-4 border-t border-slate-100 dark:border-slate-700">
                    <div className="mb-4"><PlatformFeedbackModal trigger={<button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/50 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all border border-slate-100 dark:border-slate-700/50"><MessageSquarePlus size={18} /> Help Improve MedRussia</button>} /></div>
                    <button onClick={onLogout} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all border border-transparent hover:border-red-100 dark:hover:border-red-900/30"><LogOut size={18} /> Sign Out</button>
                </div>
            </aside>

            <nav className="md:hidden fixed bottom-0 left-0 z-50 w-full bg-white dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700 pb-safe">
                <div className="flex justify-between items-center px-2 h-14">
                    {MOBILE_TABS.map(tab => (
                        <button key={tab.id} onClick={() => setActiveView(tab.id as any)} className={`flex-1 flex flex-col items-center justify-center gap-0.5 ${activeView === tab.id ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`}>
                            {React.cloneElement(tab.icon as any, { size: 20 })} <span className="text-[9px] font-bold">{tab.label}</span>
                        </button>
                    ))}
                    <button onClick={() => setIsMobileMenuOpen(true)} className="flex-1 flex flex-col items-center justify-center gap-0.5 text-slate-400"><Menu size={20} /><span className="text-[9px] font-bold">More</span></button>
                </div>
            </nav>

            {isMobileMenuOpen && (
                <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm md:hidden" onClick={() => setIsMobileMenuOpen(false)}>
                    <div className="absolute bottom-0 left-0 w-full bg-white dark:bg-slate-800 rounded-t-3xl p-6 space-y-2 animate-in slide-in-from-bottom-full duration-300">
                        <div className="w-12 h-1 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-6"></div>
                        {ALL_TABS.slice(4).map(tab => (
                            <button key={tab.id} onClick={() => { setActiveView(tab.id as any); setIsMobileMenuOpen(false); }} className="w-full flex items-center gap-4 p-4 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 font-bold">
                                {tab.icon} {tab.label}
                            </button>
                        ))}
                        <button onClick={onLogout} className="w-full flex items-center gap-4 p-4 rounded-xl text-red-500 font-bold hover:bg-red-50 dark:hover:bg-red-900/20"><LogOut size={20} /> Sign Out</button>
                    </div>
                </div>
            )}

            <div className="flex-1 md:ml-64 p-3 pb-20 md:p-8 overflow-x-hidden relative">
                {/* Notification Bell (Same) */}
                <div className="fixed top-3 right-3 z-50 md:absolute md:top-4 md:right-4 md:z-30">
                    <button onClick={() => setShowNotifications(!showNotifications)} className="relative p-2 bg-white dark:bg-slate-800 rounded-full border border-slate-200 dark:border-slate-700 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                        <Bell size={18} className="text-slate-600 dark:text-slate-300" />
                        {notifications.length > 0 && <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-slate-800"></span>}
                    </button>
                    {showNotifications && (
                        <div className="absolute top-12 right-0 w-72 md:w-80 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-in zoom-in-95 origin-top-right z-[60]">
                            <div className="p-3 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50"><h4 className="font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider">Notifications</h4></div>
                            <div className="max-h-64 overflow-y-auto">
                                {notifications.length > 0 ? notifications.map(n => (
                                    <div key={n.id} className={`p-3 md:p-4 border-b border-slate-50 dark:border-slate-700 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${n.type === 'recommendation' ? 'bg-indigo-50/50 dark:bg-indigo-900/10' : ''}`}>
                                        <div className="flex gap-3">
                                            <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${n.type === 'success' ? 'bg-green-500' : n.type === 'alert' ? 'bg-amber-500' : n.type === 'recommendation' ? 'bg-indigo-500' : 'bg-blue-500'}`}></div>
                                            <div><p className="text-xs font-medium text-slate-700 dark:text-slate-200 leading-snug">{n.text}</p><p className="text-[10px] text-slate-400 mt-1">{n.time}</p></div>
                                        </div>
                                    </div>
                                )) : <div className="p-8 text-center text-slate-400 text-xs">No new notifications</div>}
                            </div>
                        </div>
                    )}
                </div>

                {/* INQUIRIES TAB - UPDATED DROPDOWN */}
                {activeView === 'inquiries' && (
                    <div className="max-w-4xl mx-auto space-y-6 md:space-y-8 animate-in fade-in duration-300 mt-6 md:mt-8">
                        <div className="flex justify-between items-center">
                            <div><h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white">Welcome, {user.name.split(' ')[0]}</h2><p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 font-medium">Manage your applications and queries.</p></div>
                            <button onClick={() => setShowInquiryForm(!showInquiryForm)} className="bg-indigo-600 text-white px-3 py-2 md:px-4 md:py-2 rounded-xl text-xs md:text-sm font-bold shadow-lg shadow-indigo-200 dark:shadow-none hover:bg-indigo-700 transition-all flex items-center gap-2">
                                {showInquiryForm ? <X size={14} /> : <Send size={14} />} {showInquiryForm ? 'Cancel' : 'New Inquiry'}
                            </button>
                        </div>

                        {showInquiryForm && (
                            <div className="bg-white dark:bg-slate-800 p-4 md:p-6 rounded-2xl md:rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-sm animate-in fade-in slide-in-from-top-4">
                                <h3 className="font-bold text-slate-900 dark:text-white mb-4 text-sm md:text-base">Submit New Query</h3>
                                <form onSubmit={handleSubmitInquiry} className="space-y-4">
                                    <div>
                                        <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Target University</label>
                                        <select
                                            className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm appearance-none"
                                            value={newInquiry.targetUniversity}
                                            onChange={e => setNewInquiry({ ...newInquiry, targetUniversity: e.target.value })}
                                            required
                                        >
                                            <option value="">-- Select University --</option>
                                            {RUSSIAN_UNIVERSITIES.map(u => (
                                                <option key={u} value={u}>{u}</option>
                                            ))}
                                            <option value="General Query">Other / General Query</option>
                                        </select>
                                    </div>
                                    <textarea className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 min-h-[100px] text-sm" placeholder="Type your question here..." value={newInquiry.message} onChange={e => setNewInquiry({ ...newInquiry, message: e.target.value })} required />
                                    <div className="flex justify-end"><button type="submit" disabled={isSubmitting} className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 text-sm">{isSubmitting ? 'Sending...' : 'Submit'}</button></div>
                                </form>
                            </div>
                        )}

                        <div className="space-y-4">
                            {loading ? <div className="text-center py-20 text-slate-400 text-sm">Loading your history...</div> : entries.length === 0 ? (
                                <div className="text-center py-16 md:py-20 bg-white dark:bg-slate-800 rounded-2xl md:rounded-[2rem] border border-slate-100 dark:border-slate-700">
                                    <div className="w-12 h-12 md:w-16 md:h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl md:text-3xl">📭</div>
                                    <h3 className="font-bold text-slate-900 dark:text-white text-sm md:text-base">No Inquiries Yet</h3>
                                    <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">Start by asking your first question.</p>
                                </div>
                            ) : (
                                entries.map(entry => (
                                    <div key={entry.id} className="bg-white dark:bg-slate-800 p-4 md:p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm transition-all hover:shadow-md">
                                        <div className="flex justify-between items-start mb-3 md:mb-4">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1"><span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${getStatusLabel(entry.status).color}`}>{getStatusLabel(entry.status).label}</span><span className="text-[10px] md:text-xs text-slate-400 font-medium">#{entry.id.substring(0, 4)}</span></div>
                                                <h4 className="font-bold text-slate-900 dark:text-white text-xs md:text-sm">{entry.targetUniversity || 'General Query'}</h4>
                                            </div>
                                            <div className="text-[10px] text-slate-400 font-medium">{new Date(entry.timestamp).toLocaleDateString()}</div>
                                        </div>
                                        <p className="text-xs md:text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl mb-4 italic">"{entry.message}"</p>
                                        {entry.replies && entry.replies.length > 0 && (
                                            <div className="space-y-3 pl-3 md:pl-4 border-l-2 border-indigo-100 dark:border-indigo-900">
                                                {entry.replies.map(reply => (
                                                    <div key={reply.id} className="relative">
                                                        <div className="text-[10px] md:text-xs font-bold text-indigo-600 dark:text-indigo-400 mb-1 flex items-center gap-1"><div className="w-3 h-3 md:w-4 md:h-4 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-[8px]">👨‍💼</div>{reply.adminName} (MedRussia)</div>
                                                        <p className="text-xs md:text-sm text-slate-700 dark:text-slate-200">{reply.message}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {/* CHAT TAB */}
                {activeView === 'chats' && (
                    <div className="max-w-5xl mx-auto mt-6 md:mt-8 animate-in fade-in duration-300">
                        <div className="flex justify-between items-center mb-6">
                            <div><h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white">Chat with Our Team</h2><p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 font-medium">Send messages, images, and files to our counselors.</p></div>
                            {isLoadingChats && <span className="text-[10px] bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded text-slate-500 animate-pulse">Loading...</span>}
                        </div>

                        <div className="grid md:grid-cols-3 gap-6 h-[calc(100vh-16rem)]">
                            {/* Chat List */}
                            <div className="bg-white dark:bg-slate-800 rounded-2xl md:rounded-[2rem] border border-slate-100 dark:border-slate-700 overflow-hidden flex flex-col">
                                <div className="p-4 border-b border-slate-100 dark:border-slate-700">
                                    <button onClick={() => setActiveStudentChat(null)} className="w-full py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 dark:shadow-none">
                                        <MessageCircle size={16} /> New Chat
                                    </button>
                                </div>
                                <div className="flex-1 overflow-y-auto custom-scrollbar">
                                    {studentChats.length === 0 ? (
                                        <div className="text-center py-12 text-slate-400 text-xs px-4">No conversations yet. Click "New Chat" to start one!</div>
                                    ) : studentChats.map(chat => (
                                        <div key={chat.id} onClick={() => setActiveStudentChat(chat)} className={`p-4 border-b border-slate-100 dark:border-slate-700 cursor-pointer transition-all hover:bg-slate-50 dark:hover:bg-slate-900/50 ${activeStudentChat?.id === chat.id ? 'bg-indigo-50 dark:bg-indigo-900/20 border-l-4 border-l-indigo-500' : ''}`}>
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-xs font-bold text-slate-900 dark:text-white truncate">Chat #{chat.id.substring(0, 4)}</span>
                                                <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${chat.status === 'open' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600' : chat.status === 'escalated' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'}`}>{chat.status}</span>
                                            </div>
                                            <p className="text-[11px] text-slate-500 truncate">{chat.messages[chat.messages.length - 1]?.text || 'No messages'}</p>
                                            <p className="text-[9px] text-slate-400 mt-1">{new Date(chat.lastMessageAt).toLocaleDateString()}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Chat View */}
                            <div className="md:col-span-2 bg-white dark:bg-slate-800 rounded-2xl md:rounded-[2rem] border border-slate-100 dark:border-slate-700 overflow-hidden flex flex-col">
                                {activeStudentChat ? (
                                    <>
                                        {/* Chat Header */}
                                        <div className="p-4 border-b border-slate-100 dark:border-slate-700">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center text-sm font-bold text-indigo-600">🏥</div>
                                                <div>
                                                    <h4 className="font-bold text-slate-900 dark:text-white text-sm">MedRussia Support</h4>
                                                    <p className="text-[10px] text-slate-500">Chat #{activeStudentChat.id.substring(0, 4)} · {activeStudentChat.messages.length} messages</p>
                                                </div>
                                            </div>
                                        </div>

                                        {activeStudentChat.status === 'closed' && (
                                            <div className="px-4 py-2 bg-slate-50 dark:bg-slate-900/30 border-b text-center text-xs text-slate-500 font-bold">This conversation has been closed. Start a new one to continue.</div>
                                        )}

                                        {/* Messages */}
                                        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                                            {activeStudentChat.messages.map(msg => (
                                                <div key={msg.id} className={`flex ${msg.senderRole === 'student' ? 'justify-end' : 'justify-start'}`}>
                                                    <div className={`max-w-[75%] p-3 rounded-2xl ${msg.isEscalation ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800' : msg.senderRole === 'student' ? 'bg-indigo-600 text-white rounded-br-md' : 'bg-slate-100 dark:bg-slate-700 rounded-bl-md'}`}>
                                                        <p className={`text-[10px] font-bold mb-1 ${msg.senderRole === 'student' && !msg.isEscalation ? 'text-indigo-200' : 'text-slate-500 dark:text-slate-400'}`}>{msg.senderRole === 'admin' ? `${msg.senderName} (Team)` : 'You'}</p>
                                                        <p className={`text-sm ${msg.senderRole === 'student' && !msg.isEscalation ? 'text-white' : 'text-slate-900 dark:text-white'}`}>{msg.text}</p>
                                                        {msg.attachment && (
                                                            <div className="mt-2">
                                                                {msg.attachment.type.startsWith('image/') ? (
                                                                    <img src={msg.attachment.data} alt={msg.attachment.name} className="max-w-full max-h-48 rounded-lg border border-white/20" />
                                                                ) : (
                                                                    <a href={msg.attachment.data} download={msg.attachment.name} className={`text-xs underline ${msg.senderRole === 'student' ? 'text-indigo-200' : 'text-indigo-600'}`}>📎 {msg.attachment.name}</a>
                                                                )}
                                                            </div>
                                                        )}
                                                        <p className={`text-[9px] mt-1 ${msg.senderRole === 'student' && !msg.isEscalation ? 'text-indigo-300' : 'text-slate-400'}`}>{new Date(msg.timestamp).toLocaleTimeString()}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Message Input */}
                                        {activeStudentChat.status !== 'closed' && (
                                            <div className="p-4 border-t border-slate-100 dark:border-slate-700">
                                                {studentChatAttachment && (
                                                    <div className="mb-2 flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-900/50 rounded-xl text-xs">
                                                        <span className="text-slate-600 dark:text-slate-300">📎 {studentChatAttachment.name}</span>
                                                        <button onClick={() => setStudentChatAttachment(null)} className="text-red-500 hover:underline text-[10px]">Remove</button>
                                                    </div>
                                                )}
                                                <div className="flex items-center gap-2">
                                                    <label className="p-2.5 bg-slate-100 dark:bg-slate-700 rounded-xl cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
                                                        <Paperclip size={18} className="text-slate-500" />
                                                        <input type="file" accept="image/*,.pdf,.doc,.docx,.zip" onChange={handleStudentChatFileUpload} className="hidden" />
                                                    </label>
                                                    <input
                                                        className="flex-1 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                                                        placeholder="Type a message..."
                                                        value={studentChatMsg}
                                                        onChange={e => setStudentChatMsg(e.target.value)}
                                                        onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSendStudentMsg()}
                                                    />
                                                    <button onClick={handleSendStudentMsg} disabled={isSendingChat || (!studentChatMsg.trim() && !studentChatAttachment)} className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all disabled:opacity-50 shadow-lg shadow-indigo-200 dark:shadow-none">
                                                        <Send size={18} />
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    /* New Chat Interface */
                                    <div className="flex-1 flex flex-col">
                                        <div className="flex-1 flex items-center justify-center p-6">
                                            <div className="text-center max-w-sm">
                                                <div className="w-20 h-20 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">💬</div>
                                                <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2">Start a New Conversation</h3>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">Send a message to our team. You can ask questions, share documents, or request help with your application.</p>
                                            </div>
                                        </div>
                                        <div className="p-4 border-t border-slate-100 dark:border-slate-700">
                                            {studentChatAttachment && (
                                                <div className="mb-2 flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-900/50 rounded-xl text-xs">
                                                    <span className="text-slate-600 dark:text-slate-300">📎 {studentChatAttachment.name}</span>
                                                    <button onClick={() => setStudentChatAttachment(null)} className="text-red-500 hover:underline text-[10px]">Remove</button>
                                                </div>
                                            )}
                                            <div className="flex items-center gap-2">
                                                <label className="p-2.5 bg-slate-100 dark:bg-slate-700 rounded-xl cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
                                                    <Paperclip size={18} className="text-slate-500" />
                                                    <input type="file" accept="image/*,.pdf,.doc,.docx,.zip" onChange={handleStudentChatFileUpload} className="hidden" />
                                                </label>
                                                <input
                                                    className="flex-1 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                                                    placeholder="Type your first message..."
                                                    value={studentChatMsg}
                                                    onChange={e => setStudentChatMsg(e.target.value)}
                                                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleStartNewChat()}
                                                />
                                                <button onClick={handleStartNewChat} disabled={isSendingChat || (!studentChatMsg.trim() && !studentChatAttachment)} className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all disabled:opacity-50 shadow-lg shadow-indigo-200 dark:shadow-none">
                                                    <Send size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Other Views... (Condensed for brevity, no major logic changes here) */}
                {activeView === 'explorer' && <div className="max-w-5xl mx-auto mt-6 md:mt-8"><div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4 mb-6"><div><h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white">University Explorer</h2><p className="text-xs md:text-sm text-slate-500">Discover and shortlist your dream college</p></div>{shortlist.length > 0 && <button onClick={() => navigate('/compare')} className="px-4 py-2 md:px-5 md:py-2.5 bg-pink-500 text-white rounded-xl text-xs font-black uppercase tracking-wide hover:bg-pink-600 transition-colors shadow-lg shadow-pink-200 dark:shadow-none flex items-center gap-2"><Heart size={14} fill="currentColor" /> Compare Saved ({shortlist.length})</button>}</div><input className="w-full p-3 md:p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl md:rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm mb-6 text-sm" placeholder="Search by name, city..." value={uniSearch} onChange={e => setUniSearch(e.target.value)} /><div className="grid md:grid-cols-2 gap-4">{RUSSIAN_UNIVERSITIES.filter(u => u.toLowerCase().includes(uniSearch.toLowerCase())).map((uniName, idx) => { const data = getUniversityData(uniName); const isShortlisted = shortlist.includes(uniName); return (<div key={idx} className="bg-white dark:bg-slate-800 p-4 md:p-5 rounded-2xl border border-slate-100 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all group"><div className="flex justify-between items-start"><div><h4 className="font-bold text-slate-900 dark:text-white text-xs md:text-sm mb-1">{data.name}</h4><div className="flex items-center gap-2 text-[10px] md:text-xs text-slate-500 dark:text-slate-400 mb-3"><span>📍 {data.location}</span><span>•</span><span className="text-indigo-600 dark:text-indigo-400 font-bold">{data.ranking}</span></div></div><button onClick={() => handleToggleShortlist(uniName)} className={`w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center transition-all ${isShortlisted ? 'bg-pink-100 text-pink-500' : 'bg-slate-100 text-slate-400 hover:bg-pink-50 hover:text-pink-400'}`}><Heart size={14} fill={isShortlisted ? "currentColor" : "none"} /></button></div><div className="grid grid-cols-2 gap-2 text-[10px] md:text-xs mb-4"><div className="bg-slate-50 dark:bg-slate-900/50 p-2 rounded-lg"><div className="text-slate-400">Tuition</div><div className="font-bold text-slate-700 dark:text-slate-200">₽ {data.tuition_fee_rub.toLocaleString()}</div></div><div className="bg-slate-50 dark:bg-slate-900/50 p-2 rounded-lg"><div className="text-slate-400">Total/Yr</div><div className="font-bold text-emerald-600 dark:text-emerald-400">₽ {data.total_fee_rub.toLocaleString()}</div></div></div><div className="flex gap-2"><button onClick={() => { setNewInquiry({ ...newInquiry, targetUniversity: uniName }); setActiveView('inquiries'); setShowInquiryForm(true); }} className="flex-1 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg text-xs font-bold uppercase hover:bg-indigo-100 transition-colors">Inquire</button></div></div>); })}</div></div>}
                {activeView === 'budget' && <div className="max-w-4xl mx-auto mt-6 md:mt-8"><BudgetCalculator apiKey={settings?.currencyConverter?.apiKey} /></div>}
                {activeView === 'eligibility' && (
                    <div className="max-w-2xl mx-auto animate-in fade-in duration-300 mt-6 md:mt-8">
                        <div className="bg-white dark:bg-slate-800 rounded-3xl md:rounded-[2.5rem] p-6 md:p-8 shadow-sm border border-slate-200 dark:border-slate-700">
                            <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white mb-4 md:mb-6">Eligibility Check</h2>
                            {eligibilityResult ? <div className="space-y-4 md:space-y-6 animate-in fade-in zoom-in"><div className="bg-slate-900 dark:bg-black p-5 md:p-6 rounded-2xl text-white"><h3 className="font-bold text-base md:text-lg mb-4 flex items-center gap-2"><span className="text-xl md:text-2xl">🤖</span> AI Analysis Result</h3><div className="prose prose-invert text-xs md:text-sm leading-relaxed whitespace-pre-wrap mb-4">{eligibilityResult}</div>{(() => { const status = getEligibilityStatus(eligibilityResult); if (status === 'eligible') { return <a href="https://wa.me/917375017401?text=Hi,%20I%20am%20eligible%20for%20MBBS%20in%20Russia.%20I%20want%20to%20discuss%20admission." target="_blank" className="block w-full py-2.5 md:py-3 bg-green-600 text-white font-bold rounded-xl text-center hover:bg-green-700 transition-colors mt-4 text-xs md:text-sm uppercase tracking-wide">Talk to a Counselor</a>; } if (status === 'borderline') { return <button onClick={() => setActiveView('explorer')} className="block w-full py-2.5 md:py-3 bg-amber-500 text-white font-bold rounded-xl text-center hover:bg-amber-600 transition-colors mt-4 text-xs md:text-sm uppercase tracking-wide">Explore Safer Options</button>; } if (status === 'not_eligible') { return <a href="https://wa.me/917375017401?text=Hi,%20I%20might%20not%20be%20eligible%20via%20NEET.%20What%20are%20my%20alternatives?" target="_blank" className="block w-full py-2.5 md:py-3 bg-indigo-600 text-white font-bold rounded-xl text-center hover:bg-indigo-700 transition-colors mt-4 text-xs md:text-sm uppercase tracking-wide">Understand Alternatives</a>; } return null; })()}</div><button onClick={() => setEligibilityResult(null)} className="w-full py-3 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold rounded-xl text-sm">Check Another Student</button></div> : <div className="space-y-4"><div className="grid grid-cols-2 gap-4"><div><label className="text-[10px] md:text-xs font-bold text-slate-400 uppercase mb-1 block">NEET Score</label><input type="number" className="w-full p-2.5 md:p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm" value={eligibilityForm.neetScore} onChange={e => setEligibilityForm({ ...eligibilityForm, neetScore: e.target.value })} placeholder="e.g. 450" /></div><div><label className="text-[10px] md:text-xs font-bold text-slate-400 uppercase mb-1 block">12th PCB %</label><input type="number" className="w-full p-2.5 md:p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm" value={eligibilityForm.pcbPercentage} onChange={e => setEligibilityForm({ ...eligibilityForm, pcbPercentage: e.target.value })} placeholder="e.g. 85" /></div></div><div className="grid grid-cols-2 gap-4"><div><label className="text-[10px] md:text-xs font-bold text-slate-400 uppercase mb-1 block">Category</label><select className="w-full p-2.5 md:p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm" value={eligibilityForm.category} onChange={e => setEligibilityForm({ ...eligibilityForm, category: e.target.value as any })}><option>General</option><option>Reserved</option></select></div><div className="flex items-center gap-2 pt-5 md:pt-6"><input type="checkbox" id="pwd" checked={eligibilityForm.isPwd} onChange={e => setEligibilityForm({ ...eligibilityForm, isPwd: e.target.checked })} className="w-4 h-4 md:w-5 md:h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" /><label htmlFor="pwd" className="text-xs md:text-sm font-bold text-slate-700 dark:text-slate-300">PwD Candidate?</label></div></div><div><label className="text-[10px] md:text-xs font-bold text-slate-400 uppercase mb-1 block">Date of Birth</label><input type="date" className="w-full p-2.5 md:p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm" value={eligibilityForm.dob} onChange={e => setEligibilityForm({ ...eligibilityForm, dob: e.target.value })} /></div><button onClick={handleCheckEligibility} disabled={checkingEligibility || !eligibilityForm.neetScore} className="w-full py-3 md:py-4 bg-indigo-600 text-white font-black rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 dark:shadow-none disabled:opacity-50 mt-4 text-sm md:text-base">{checkingEligibility ? 'Analyzing...' : 'Analyze Eligibility'}</button></div>}
                        </div>
                    </div>
                )}
                {activeView === 'documents' && <div className="max-w-3xl mx-auto space-y-4 md:space-y-6 animate-in fade-in duration-300 mt-6 md:mt-8"><h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white mb-1 md:mb-2">Document Readiness Checklist</h2><p className="text-xs md:text-sm text-slate-500 mb-4 md:mb-6">Upload clear scans of your documents. Our team will verify them for admission.</p><div className="bg-white dark:bg-slate-800 rounded-2xl md:rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">{[{ id: 'passport', label: 'Original Passport', doc: user.documents?.passport, desc: 'Front & Back pages scan' }, { id: 'marksheet', label: '12th Marksheet', doc: user.documents?.marksheet, desc: 'Official Board Marksheet' }, { id: 'neetScoreCard', label: 'NEET Scorecard', doc: user.documents?.neetScoreCard, desc: 'Valid Scorecard for current year' }].map((item, idx) => (<div key={item.id} className={`p-4 md:p-6 flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 dark:border-slate-700 last:border-0 gap-4 ${item.doc?.url ? 'bg-slate-50/50 dark:bg-slate-900/10' : ''}`}><div className="flex items-start gap-3 md:gap-4"><div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center text-lg shrink-0 ${item.doc?.status === 'verified' ? 'bg-green-100 text-green-600' : item.doc?.status === 'rejected' ? 'bg-red-100 text-red-600' : item.doc?.status === 'uploaded' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>{item.doc?.status === 'verified' ? <CheckCircle size={18} /> : item.doc?.status === 'rejected' ? <XCircle size={18} /> : item.doc?.url ? <FileText size={18} /> : <Clock size={18} />}</div><div><h4 className={`font-bold text-xs md:text-sm ${item.doc?.url ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-300'}`}>{item.label}</h4><p className="text-[10px] md:text-xs text-slate-400">{item.desc}</p><div className="flex gap-2 mt-1"><span className={`text-[9px] md:text-[10px] font-black uppercase px-2 py-0.5 rounded ${getDocStatusStyle(item.doc?.status || 'pending')}`}>{item.doc?.status === 'verified' ? 'Verified' : item.doc?.status === 'rejected' ? 'Rejected' : item.doc?.status === 'uploaded' ? 'Under Review' : 'Pending'}</span></div>{item.doc?.remarks && item.doc.status === 'rejected' && (<p className="text-[10px] text-red-500 mt-1 font-medium bg-red-50 dark:bg-red-900/20 p-1 rounded">Note: {item.doc.remarks}</p>)}</div></div><div className="flex items-center gap-2 md:justify-end w-full md:w-auto">{item.doc?.url && (<a href={item.doc.url} target="_blank" className="px-3 py-1.5 md:px-4 md:py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-bold hover:text-indigo-600 dark:hover:text-white transition-colors flex items-center gap-2"><ExternalLink size={14} /> View</a>)} {(item.doc?.status !== 'verified' || !item.doc?.url) && (<label className={`cursor-pointer px-3 py-1.5 md:px-4 md:py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 md:gap-2 ${uploadingDoc === item.id ? 'bg-indigo-100 text-indigo-400 cursor-wait' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md'}`}><span>{uploadingDoc === item.id ? 'Uploading...' : (item.doc?.url ? 'Re-upload' : 'Upload')}</span>{!uploadingDoc && <Upload size={14} />}<input type="file" className="hidden" accept="image/*,.pdf" onChange={(e) => handleFileUpload(e, item.id as any)} disabled={!!uploadingDoc} /></label>)}</div></div>))}</div><div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl flex gap-3 text-xs md:text-sm text-blue-800 dark:text-blue-300 border border-blue-100 dark:border-blue-900/30"><AlertCircle className="shrink-0" size={16} /><p>Your documents are stored securely. Once verified, you cannot change them without admin approval.</p></div></div>}
                {activeView === 'profile' && (
                    <div className="max-w-2xl mx-auto animate-in fade-in duration-300 mt-6 md:mt-8">
                        <div className="bg-white dark:bg-slate-800 rounded-3xl md:rounded-[2.5rem] p-6 md:p-8 shadow-sm border border-slate-200 dark:border-slate-700">
                            <div className="flex items-center gap-4 md:gap-6 mb-6 md:mb-8"><div className="relative group"><div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-indigo-100 dark:bg-slate-700 flex items-center justify-center text-3xl md:text-4xl overflow-hidden border-4 border-white dark:border-slate-800 shadow-lg">{avatar ? (<img src={avatar} className="w-full h-full object-cover" alt="Profile" />) : (<span className="font-black text-indigo-500 dark:text-indigo-400">{user.name.charAt(0)}</span>)}</div><label className="absolute bottom-0 right-0 p-1.5 bg-indigo-600 rounded-full text-white cursor-pointer shadow-md hover:bg-indigo-700 transition-colors"><div className="w-4 h-4"><Upload size={16} /></div><input type="file" className="hidden" accept="image/*" onChange={handleAvatarChange} /></label></div><div><h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white">{user.name}</h2><p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">{user.email}</p></div></div>
                            <form onSubmit={handleProfileUpdate} className="space-y-4 md:space-y-6">
                                <div className="grid md:grid-cols-2 gap-4 md:gap-6"><div><label className="text-[10px] md:text-xs font-bold text-slate-400 uppercase mb-1.5 block">Full Name</label><input type="text" className="w-full p-3 md:p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-700 dark:text-slate-200 text-sm" value={profileData.name} onChange={e => setProfileData({ ...profileData, name: e.target.value })} /></div><div><label className="text-[10px] md:text-xs font-bold text-slate-400 uppercase mb-1.5 block">Phone Number</label><input type="tel" className="w-full p-3 md:p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-700 dark:text-slate-200 text-sm" value={profileData.phone} onChange={e => setProfileData({ ...profileData, phone: e.target.value })} /></div></div><div><label className="text-[10px] md:text-xs font-bold text-slate-400 uppercase mb-1.5 block">Current University / School</label><input type="text" className="w-full p-3 md:p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-700 dark:text-slate-200 text-sm" value={profileData.university} onChange={e => setProfileData({ ...profileData, university: e.target.value })} /></div>
                                <div className="flex justify-end pt-2"><button type="submit" disabled={isUpdatingProfile} className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 dark:shadow-none disabled:opacity-50 text-sm">{isUpdatingProfile ? 'Saving...' : 'Save Changes'}</button></div>
                            </form>
                        </div>
                    </div>
                )}
                {activeView === 'settings' && <div className="max-w-2xl mx-auto animate-in fade-in duration-300 mt-6 md:mt-8"><div className="bg-white dark:bg-slate-800 rounded-3xl md:rounded-[2.5rem] p-6 md:p-8 shadow-sm border border-slate-200 dark:border-slate-700"><h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white mb-6 md:mb-8">Account Settings</h2><div className="space-y-6 md:space-y-8"><div><h4 className="text-sm font-bold text-slate-900 dark:text-white mb-4">Preferences</h4><div className="space-y-3"><div className="flex items-center justify-between p-3 md:p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-700"><div className="flex items-center gap-3">{theme === 'dark' ? <Moon size={20} className="text-indigo-500" /> : <Sun size={20} className="text-amber-500" />}<span className="text-sm font-bold text-slate-700 dark:text-slate-200">Dark Mode</span></div><button onClick={toggleTheme} className={`w-12 h-6 rounded-full transition-colors relative ${theme === 'dark' ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'}`}><div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${theme === 'dark' ? 'left-7' : 'left-1'}`}></div></button></div>{onToggleCurrency && <div className="flex items-center justify-between p-3 md:p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-700"><div className="flex items-center gap-3"><span className="text-emerald-500 font-black text-lg">₹</span><span className="text-sm font-bold text-slate-700 dark:text-slate-200">Currency Tool</span></div><button onClick={onToggleCurrency} className="px-3 py-1.5 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-bold border border-slate-200 dark:border-slate-600 hover:border-indigo-300 transition-colors">Open</button></div>}</div></div><div><h4 className="text-sm font-bold text-slate-900 dark:text-white mb-4">Security</h4><div className="space-y-4"><div className="relative"><Lock size={16} className="absolute top-4 left-4 text-slate-400" /><input type="password" className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-bold" placeholder="Current Password" value={passData.current} onChange={e => setPassData({ ...passData, current: e.target.value })} /></div><div className="grid md:grid-cols-2 gap-4"><input type="password" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-bold" placeholder="New Password" value={passData.new} onChange={e => setPassData({ ...passData, new: e.target.value })} /><input type="password" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-bold" placeholder="Confirm Password" value={passData.confirm} onChange={e => setPassData({ ...passData, confirm: e.target.value })} /></div><div className="flex justify-end"><button onClick={handleSettingsSave} disabled={savingSettings || !passData.current} className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 dark:shadow-none disabled:opacity-50 text-sm">{savingSettings ? 'Updating...' : 'Update Password'}</button></div></div></div></div></div></div>}
                {activeView === 'help' && <div className="max-w-2xl mx-auto animate-in fade-in duration-300 mt-6 md:mt-8"><div className="bg-white dark:bg-slate-800 rounded-3xl md:rounded-[2.5rem] p-6 md:p-8 shadow-sm border border-slate-100 dark:border-slate-700 text-center"><div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mx-auto mb-4 text-indigo-600 dark:text-indigo-400"><HelpCircle size={32} /></div><h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white mb-2">Help & Support</h2><p className="text-slate-500 dark:text-slate-400 text-sm mb-6">Need assistance? Our support team is here to help you.</p><div className="space-y-4"><a href="https://wa.me/917375017401" target="_blank" className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors group"><div className="flex items-center gap-4"><div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white"><MessageSquarePlus size={20} /></div><div className="text-left"><div className="font-bold text-slate-900 dark:text-white text-sm">WhatsApp Chat</div><div className="text-xs text-slate-500 dark:text-slate-400">Instant support from counselors</div></div></div><div className="text-indigo-600 dark:text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity">→</div></a><a href="mailto:support@medrussia.com" className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors group"><div className="flex items-center gap-4"><div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white"><Mail size={20} /></div><div className="text-left"><div className="font-bold text-slate-900 dark:text-white text-sm">Email Support</div><div className="text-xs text-slate-500 dark:text-slate-400">Get a reply within 24 hours</div></div></div><div className="text-indigo-600 dark:text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity">→</div></a></div></div></div>}
            </div>

            {/* Security Prompt Modal */}
            {showSecurityPrompt && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-3xl p-8 shadow-2xl relative border border-slate-200 dark:border-slate-700 animate-in zoom-in-95 duration-300">
                        <div className="text-center mb-6">
                            <div className="w-14 h-14 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
                                <Key size={24} />
                            </div>
                            <h3 className="text-xl font-black text-slate-900 dark:text-white">Secure Your Account</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Set a recovery question to reset your password if you forget it.</p>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase mb-1.5 block">Select Question</label>
                                <select
                                    className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                                    value={recoveryData.question}
                                    onChange={e => setRecoveryData({ ...recoveryData, question: e.target.value })}
                                >
                                    {SECURITY_QUESTIONS.map(q => <option key={q} value={q}>{q}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase mb-1.5 block">Your Answer</label>
                                <input
                                    type="text"
                                    className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-bold"
                                    placeholder="Answer..."
                                    value={recoveryData.answer}
                                    onChange={e => setRecoveryData({ ...recoveryData, answer: e.target.value })}
                                />
                            </div>
                            <button
                                onClick={handleSaveSecurityQuestion}
                                className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg active:scale-95 text-sm"
                            >
                                Save & Continue
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};