
import { FeedbackEntry, User, FeedbackReply, EligibilityData, ChatSession, PlatformFeedback, UserNotification, DocumentMetadata } from '../types';
import { supabase } from '../lib/supabase';
import {
  saveFeedbackToStore,
  fetchFeedbackFromStore,
  saveUserToStore,
  fetchUsersFromStore,
  deleteFeedbackFromStore,
  deleteUserFromStore,
  fetchChatLogsFromStore,
  saveChatSessionToStore,
  savePlatformFeedbackToStore,
  fetchPlatformFeedbackFromStore,
  fetchTeamFromStore,
  saveTeamToStore
} from './store';
import { TeamMember, TEAM_MEMBERS } from '../data/teamData';

// Re-export for components that need direct access to fresh data
export { fetchUsersFromStore, saveChatSessionToStore };

const FEEDBACK_KEY = 'med_russia_feedback_data';
const USERS_KEY = 'med_russia_users_data';

const getLocal = <T>(key: string): T[] => {
  const data = localStorage.getItem(key);
  if (!data) return [];
  try { return JSON.parse(data); } catch { return []; }
};


const authFetch = async (url: string, options: RequestInit = {}) => {
  const { data: { session } } = await supabase.auth.getSession();
  const headers = new Headers(options.headers);
  if (session?.access_token) {
    headers.set('Authorization', `Bearer ${session.access_token}`);
  }
  return fetch(url, { ...options, headers });
};

export const registerUser = async (user: Omit<User, 'id'>): Promise<User> => {
  const { data, error } = await supabase.auth.signUp({
    email: user.email,
    password: user.password!,
  });

  if (error || !data.user) {
    throw new Error(error?.message || 'Registration failed');
  }

  const newUser: User = {
    ...user,
    id: data.user.id,
    shortlistedUniversities: [],
    role: user.role || 'student',
    documents: {},
    notifications: [],
    password: undefined // Don't store password in MongoDB
  };

  const res = await authFetch('/api/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newUser)
  });

  if (!res.ok) throw new Error('Failed to create profile');

  return newUser;
};

export const updateUser = async (user: User): Promise<void> => {
  const res = await authFetch('/api/users', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(user)
  });
  if (!res.ok) throw new Error('Failed to update profile');
  
  const localUsers = getLocal<User>(USERS_KEY);
  const index = localUsers.findIndex(u => u.id === user.id);
  if (index !== -1) localUsers[index] = user;
  else localUsers.push(user);
  localStorage.setItem(USERS_KEY, JSON.stringify(localUsers));
};

export const sendNotificationToUser = async (userId: string, notification: Omit<UserNotification, 'id' | 'timestamp' | 'isRead'>): Promise<void> => {
  const users = await fetchUsersFromStore();
  const index = users.findIndex((u: any) => u.id === userId);

  if (index === -1) throw new Error("User not found");

  const user = users[index];
  if (!user.notifications) user.notifications = [];

  const newNotification: UserNotification = {
    ...notification,
    id: Math.random().toString(36).substr(2, 9),
    timestamp: Date.now(),
    isRead: false
  };

  // Add to beginning of list
  user.notifications.unshift(newNotification);

  // Save Cloud
  await saveUserToStore(user);

  // Save Local (if current session matches)
  const localUsers = getLocal<User>(USERS_KEY);
  const localIdx = localUsers.findIndex(u => u.id === userId);
  if (localIdx !== -1) {
    localUsers[localIdx] = user;
    localStorage.setItem(USERS_KEY, JSON.stringify(localUsers));
  }
};

export const loginUser = async (email: string, password?: string): Promise<User | null> => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: password || '',
  });

  if (error || !data.user) {
    throw new Error(error?.message || 'Login failed');
  }

  const res = await authFetch(`/api/users?id=${data.user.id}`);
  if (!res.ok) throw new Error('Profile not found');
  
  const profile = await res.json();
  
  return profile;
};

// --- PASSWORD RECOVERY ---

// Password recovery is now handled by Supabase in Login.tsx

// --- DOCUMENTS ---

export const updateUserDocuments = async (userId: string, docType: 'marksheet' | 'passport' | 'neetScoreCard', metadata: DocumentMetadata): Promise<User> => {
  const users = getLocal<User>(USERS_KEY);
  const userIndex = users.findIndex(u => u.id === userId);

  if (userIndex === -1) throw new Error("User not found");

  // 2. Update Document
  const user = users[userIndex];
  if (!user.documents) user.documents = {};

  user.documents[docType] = metadata;

  // Securely update the user via the authenticated API
  await updateUser(user);

  return user;
};

export const deleteUserDocument = async (userId: string, docType: 'marksheet' | 'passport' | 'neetScoreCard'): Promise<User> => {
  const users = getLocal<User>(USERS_KEY);
  const userIndex = users.findIndex(u => u.id === userId);

  if (userIndex === -1) throw new Error("User not found");

  const user = users[userIndex];
  if (user.documents && user.documents[docType]) {
    delete user.documents[docType];
    await updateUser(user);
    return user;
  }
  return user;
};

// New Function for Admin Verification
export const verifyUserDocument = async (userId: string, docType: 'marksheet' | 'passport' | 'neetScoreCard', status: 'verified' | 'rejected', remarks?: string): Promise<User> => {
  const users = await fetchUsersFromStore();
  const userIndex = users.findIndex((u: any) => u.id === userId);

  if (userIndex === -1) throw new Error("User not found in cloud");

  const user = users[userIndex];
  if (user.documents && user.documents[docType]) {
    user.documents[docType].status = status;
    if (remarks) user.documents[docType].remarks = remarks;

    await saveUserToStore(user);

    // Update Local if it's the current user (edge case, but good to handle)
    const localUsers = getLocal<User>(USERS_KEY);
    const localIdx = localUsers.findIndex(u => u.id === userId);
    if (localIdx !== -1) {
      localUsers[localIdx] = user;
      localStorage.setItem(USERS_KEY, JSON.stringify(localUsers));
    }

    return user;
  }
  throw new Error("Document not found");
}

export const updateUserEligibility = async (userId: string, data: EligibilityData, result: string): Promise<User> => {
  const users = getLocal<User>(USERS_KEY);
  const userIndex = users.findIndex(u => u.id === userId);

  if (userIndex === -1) throw new Error("User not found");

  const user = users[userIndex];
  user.eligibilityData = data;
  user.eligibilityResult = result;

  await updateUser(user);

  return user;
};

export const toggleShortlist = async (userId: string, uniName: string): Promise<string[]> => {
  const users = getLocal<User>(USERS_KEY);
  const userIdx = users.findIndex(u => u.id === userId);
  if (userIdx === -1) return [];

  const user = users[userIdx];
  const list = user.shortlistedUniversities || [];
  const exists = list.indexOf(uniName);

  if (exists > -1) {
    list.splice(exists, 1);
  } else {
    list.push(uniName);
  }

  user.shortlistedUniversities = list;
  await updateUser(user);
  return list;
};


// Changed to ASYNC to fetch ALL students from Cloud, not just local
export const getAllAdmins = async (): Promise<User[]> => {
  try {
    const list = await fetchUsersFromCloud();
    return list.filter(u => ['admin', 'super_admin', 'manager', 'staff'].includes(u.role || ''));
  } catch (e) {
    console.error("Failed to fetch admins:", e);
    return [];
  }
};

export const getAllStudents = async (): Promise<User[]> => {
  const users = await fetchUsersFromStore();
  return users.filter((u: any) => u.role === 'student');
};

export const syncUsers = async (): Promise<void> => {
  try {
    const cloudUsers = await fetchUsersFromStore();
    if (Array.isArray(cloudUsers) && cloudUsers.length > 0) {
      localStorage.setItem(USERS_KEY, JSON.stringify(cloudUsers));
    }
  } catch (e) {
    console.error("Failed to sync users", e);
  }
};

export const saveFeedback = async (entry: Omit<FeedbackEntry, 'id' | 'timestamp' | 'replies' | 'status'>): Promise<FeedbackEntry> => {
  const users = getLocal<User>(USERS_KEY);

  let userId = entry.userId;
  if (!userId) {
    const matchedUser = users.find(u =>
      u.role === 'student' &&
      (u.email.toLowerCase() === entry.email.toLowerCase() ||
        (u.phone && entry.phone && u.phone.replace(/\D/g, '') === entry.phone.replace(/\D/g, '')))
    );
    if (matchedUser) userId = matchedUser.id;
  }

  const newEntry: FeedbackEntry = {
    ...entry,
    userId: userId,
    id: Math.random().toString(36).substr(2, 9),
    timestamp: Date.now(),
    replies: [],
    status: 'pending'
  };

  const localEntries = getLocal<FeedbackEntry>(FEEDBACK_KEY);
  localEntries.push(newEntry);
  localStorage.setItem(FEEDBACK_KEY, JSON.stringify(localEntries));

  // Sync to Cloud
  await saveFeedbackToStore(newEntry);
  return newEntry;
};

export const addReply = async (feedbackId: string, reply: Omit<FeedbackReply, 'id' | 'timestamp'>): Promise<void> => {
  const entries = await getAllFeedback();
  const index = entries.findIndex(e => e.id === feedbackId);

  if (index !== -1) {
    const newReply: FeedbackReply = {
      ...reply,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now()
    };
    entries[index].replies.push(newReply);
    entries[index].status = 'replied';

    localStorage.setItem(FEEDBACK_KEY, JSON.stringify(entries));
    await saveFeedbackToStore(entries[index]);
  }
};

export const getUserFeedback = async (userId: string): Promise<FeedbackEntry[]> => {
  const all = await getAllFeedback();
  return all.filter(f => f.userId === userId);
};

export const getAllFeedback = async (): Promise<FeedbackEntry[]> => {
  const { entries: remoteEntries } = await fetchFeedbackFromStore();
  const localEntries = getLocal<FeedbackEntry>(FEEDBACK_KEY);

  if (remoteEntries.length === 0) return localEntries;

  const merged = [...remoteEntries];
  localEntries.forEach(local => {
    if (!merged.find(remote => remote.id === local.id)) {
      merged.push(local);
    }
  });

  return merged.sort((a, b) => b.timestamp - a.timestamp);
};

export const deleteFeedback = async (id: string): Promise<void> => {
  // 1. Delete from Local Storage (Instant UI update)
  const entries = getLocal<FeedbackEntry>(FEEDBACK_KEY);
  const newEntries = entries.filter(e => e.id !== id);
  localStorage.setItem(FEEDBACK_KEY, JSON.stringify(newEntries));

  // 2. Delete from Cloud
  await deleteFeedbackFromStore(id);
};

export const deleteUser = async (email: string): Promise<void> => {
  // 1. Delete from Local Storage
  const users = getLocal<User>(USERS_KEY);
  const newUsers = users.filter(u => u.email !== email);
  localStorage.setItem(USERS_KEY, JSON.stringify(newUsers));

  // 2. Delete from Cloud
  await deleteUserFromStore(email);
};

// --- CHAT LOGGING ---

export const logChatSession = async (session: ChatSession): Promise<void> => {
  // Only save to Cloud to save local storage space, as these are logs
  await saveChatSessionToStore(session);
};

export const getChatHistory = async (): Promise<ChatSession[]> => {
  return await fetchChatLogsFromStore();
};

export const deleteChatSession = async (id: string): Promise<void> => {
  const sessions = await fetchChatLogsFromStore();
  const newSessions = sessions.filter(s => s.id !== id);
  // Use the KV helper to save the filtered array (implemented as overload in KV)
  await saveChatSessionToStore(newSessions);
};

// --- PLATFORM FEEDBACK (HUB) ---

export const savePlatformFeedback = async (feedback: Omit<PlatformFeedback, 'id' | 'timestamp' | 'status'>): Promise<PlatformFeedback> => {
  const newFeedback: PlatformFeedback = {
    ...feedback,
    id: Math.random().toString(36).substr(2, 9),
    timestamp: Date.now(),
    status: 'new'
  };
  await savePlatformFeedbackToStore(newFeedback);
  return newFeedback;
};

export const getAllPlatformFeedback = async (): Promise<PlatformFeedback[]> => {
  const feedback = await fetchPlatformFeedbackFromStore();
  return feedback.sort((a, b) => b.timestamp - a.timestamp);
};

export const updatePlatformFeedbackStatus = async (id: string, status: 'new' | 'reviewed'): Promise<void> => {
  const all = await fetchPlatformFeedbackFromStore();
  const item = all.find(f => f.id === id);
  if (item) {
    item.status = status;
    await savePlatformFeedbackToStore(item);
  }
};

// --- TEAM MEMBERS ---

export const getTeamMembers = async (): Promise<TeamMember[]> => {
  const cloudTeam = await fetchTeamFromStore();
  if (cloudTeam && cloudTeam.length > 0) return cloudTeam;
  // Fallback to static defaults if KV is empty (first-time setup)
  return TEAM_MEMBERS;
};

export const saveTeamMembers = async (team: TeamMember[]): Promise<void> => {
  await saveTeamToStore(team);
};
