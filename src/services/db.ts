
import { FeedbackEntry, User, FeedbackReply, EligibilityData, ChatSession, PlatformFeedback, UserNotification, DocumentMetadata } from '../types';
import {
  saveFeedbackToUpstash,
  fetchFeedbackFromUpstash,
  saveUserToUpstash,
  fetchUsersFromUpstash,
  deleteFeedbackFromUpstash,
  deleteUserFromUpstash,
  fetchChatLogsFromUpstash,
  saveChatSessionToUpstash,
  fetchAdminsFromUpstash,
  saveAdminsToUpstash,
  savePlatformFeedbackToUpstash,
  fetchPlatformFeedbackFromUpstash,
  fetchTeamFromUpstash,
  saveTeamToUpstash
} from './kv';
import { TeamMember, TEAM_MEMBERS } from '../data/teamData';

// Re-export for components that need direct access to fresh data
export { fetchUsersFromUpstash, saveChatSessionToUpstash };

const FEEDBACK_KEY = 'med_russia_feedback_data';
const USERS_KEY = 'med_russia_users_data';

const getLocal = <T>(key: string): T[] => {
  const data = localStorage.getItem(key);
  if (!data) return [];
  try { return JSON.parse(data); } catch { return []; }
};

// --- HELPER: Get Admins (KV only) ---
const getAdminsSafe = async (): Promise<User[]> => {
  const admins = await fetchAdminsFromUpstash();
  return admins || [];
};

export const registerUser = async (user: Omit<User, 'id'>): Promise<User> => {
  // Determine target collection based on role
  const isTargetAdmin = user.role === 'admin';
  const collection = isTargetAdmin ? await getAdminsSafe() : await fetchUsersFromUpstash();

  if (collection.find((u: any) => u.email === user.email)) {
    throw new Error("Email already registered");
  }

  // Create User Object
  const newUser: User = {
    ...user,
    id: Math.random().toString(36).substr(2, 9),
    shortlistedUniversities: [],
    role: user.role || 'student',
    documents: {},
    notifications: [] // Initialize empty notifications
  };

  // Save to correct Cloud Store
  if (isTargetAdmin) {
    const updatedAdmins = [...collection, newUser];
    await saveAdminsToUpstash(updatedAdmins);
  } else {
    await saveUserToUpstash(newUser);
    // (Optional) Keep saving students to local storage as backup
    const localUsers = getLocal<User>(USERS_KEY);
    localUsers.push(newUser);
    localStorage.setItem(USERS_KEY, JSON.stringify(localUsers));
  }

  return newUser;
};

export const updateUser = async (user: User): Promise<void> => {
  if (user.role === 'admin') {
    const admins = await getAdminsSafe();
    const index = admins.findIndex(a => a.id === user.id);
    if (index !== -1) {
      admins[index] = user;
      await saveAdminsToUpstash(admins);
    }
  } else {
    // Update Local
    const localUsers = getLocal<User>(USERS_KEY);
    const index = localUsers.findIndex(u => u.id === user.id);
    if (index !== -1) {
      localUsers[index] = user;
    } else {
      localUsers.push(user);
    }
    localStorage.setItem(USERS_KEY, JSON.stringify(localUsers));

    // Update Cloud
    await saveUserToUpstash(user);
  }
};

export const sendNotificationToUser = async (userId: string, notification: Omit<UserNotification, 'id' | 'timestamp' | 'isRead'>): Promise<void> => {
  const users = await fetchUsersFromUpstash();
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
  await saveUserToUpstash(user);

  // Save Local (if current session matches)
  const localUsers = getLocal<User>(USERS_KEY);
  const localIdx = localUsers.findIndex(u => u.id === userId);
  if (localIdx !== -1) {
    localUsers[localIdx] = user;
    localStorage.setItem(USERS_KEY, JSON.stringify(localUsers));
  }
};

export const loginUser = async (email: string, password?: string): Promise<User | null> => {
  // 1. Check Admins (from KV)
  const admins = await getAdminsSafe();
  const adminMatch = admins.find(a => (a.email === email || a.name === email) && a.password === password);
  if (adminMatch) return adminMatch;

  // 2. Check Students (from KV)
  const students = await fetchUsersFromUpstash();
  const studentMatch = students.find((u: any) => (u.email === email || u.name === email) && u.password === password);

  return studentMatch || null;
};

// --- PASSWORD RECOVERY ---

export const getSecurityQuestion = async (email: string): Promise<string | null> => {
  const students = await fetchUsersFromUpstash();
  const user = students.find((u: any) => u.email === email);
  if (user && user.recoveryQuestion) {
    return user.recoveryQuestion;
  }

  // Also check admins
  const admins = await getAdminsSafe();
  const admin = admins.find(a => a.email === email);
  if (admin && admin.recoveryQuestion) {
    return admin.recoveryQuestion;
  }

  return null;
};

export const resetPassword = async (email: string, answer: string, newPassword: string): Promise<boolean> => {
  // Check students
  const students = await fetchUsersFromUpstash();
  const studentIndex = students.findIndex((u: any) => u.email === email);

  if (studentIndex !== -1) {
    const user = students[studentIndex];
    if (user.recoveryAnswer && user.recoveryAnswer.toLowerCase() === answer.toLowerCase().trim()) {
      user.password = newPassword;
      await saveUserToUpstash(user);
      return true;
    }
  }

  // Check admins
  const admins = await getAdminsSafe();
  const adminIndex = admins.findIndex((a: any) => a.email === email);
  if (adminIndex !== -1) {
    const admin = admins[adminIndex];
    if (admin.recoveryAnswer && admin.recoveryAnswer.toLowerCase() === answer.toLowerCase().trim()) {
      admin.password = newPassword;
      await saveAdminsToUpstash(admins); // Admins are saved as a block
      return true;
    }
  }

  return false;
};

// --- DOCUMENTS ---

export const updateUserDocuments = async (userId: string, docType: 'marksheet' | 'passport' | 'neetScoreCard', metadata: DocumentMetadata): Promise<User> => {
  const users = getLocal<User>(USERS_KEY);
  const userIndex = users.findIndex(u => u.id === userId);

  if (userIndex === -1) throw new Error("User not found");

  // 2. Update Document
  const user = users[userIndex];
  if (!user.documents) user.documents = {};

  user.documents[docType] = metadata;

  // 3. Save Local
  users[userIndex] = user;
  localStorage.setItem(USERS_KEY, JSON.stringify(users));

  // 4. Update Active Session
  const currentUser = JSON.parse(localStorage.getItem('mr_active_user') || '{}');
  if (currentUser.id === userId) {
    localStorage.setItem('mr_active_user', JSON.stringify(user));
  }

  await saveUserToUpstash(user);

  return user;
};

export const removeUserDocument = async (userId: string, docType: 'marksheet' | 'passport' | 'neetScoreCard'): Promise<User> => {
  const users = await fetchUsersFromUpstash();
  const userIndex = users.findIndex((u: any) => u.id === userId);

  if (userIndex === -1) throw new Error("User not found");

  const user = users[userIndex];
  if (user.documents && user.documents[docType]) {
    delete user.documents[docType];

    await saveUserToUpstash(user);

    // Sync Local
    const localUsers = getLocal<User>(USERS_KEY);
    const localIdx = localUsers.findIndex(u => u.id === userId);
    if (localIdx !== -1) {
      localUsers[localIdx] = user;
      localStorage.setItem(USERS_KEY, JSON.stringify(localUsers));
    }
    return user;
  }
  return user;
};

// New Function for Admin Verification
export const verifyUserDocument = async (userId: string, docType: 'marksheet' | 'passport' | 'neetScoreCard', status: 'verified' | 'rejected', remarks?: string): Promise<User> => {
  const users = await fetchUsersFromUpstash();
  const userIndex = users.findIndex((u: any) => u.id === userId);

  if (userIndex === -1) throw new Error("User not found in cloud");

  const user = users[userIndex];
  if (user.documents && user.documents[docType]) {
    user.documents[docType].status = status;
    if (remarks) user.documents[docType].remarks = remarks;

    await saveUserToUpstash(user);

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

  users[userIndex] = user;
  localStorage.setItem(USERS_KEY, JSON.stringify(users));

  const currentUser = JSON.parse(localStorage.getItem('mr_active_user') || '{}');
  if (currentUser.id === userId) {
    localStorage.setItem('mr_active_user', JSON.stringify(user));
  }

  await saveUserToUpstash(user);
  return user;
};

export const toggleShortlist = (userId: string, uniName: string): string[] => {
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
  users[userIdx] = user;
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
  return list;
};

// Changed to ASYNC to support fetching from KV
export const getAllAdmins = async (): Promise<User[]> => {
  return await getAdminsSafe();
};

// Changed to ASYNC to fetch ALL students from Cloud, not just local
export const getAllStudents = async (): Promise<User[]> => {
  const users = await fetchUsersFromUpstash();
  return users.filter((u: any) => u.role === 'student');
};

export const syncUsers = async (): Promise<void> => {
  try {
    const cloudUsers = await fetchUsersFromUpstash();
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
  await saveFeedbackToUpstash(newEntry);
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
    await saveFeedbackToUpstash(entries[index]);
  }
};

export const getUserFeedback = async (userId: string): Promise<FeedbackEntry[]> => {
  const all = await getAllFeedback();
  return all.filter(f => f.userId === userId);
};

export const getAllFeedback = async (): Promise<FeedbackEntry[]> => {
  const { entries: remoteEntries } = await fetchFeedbackFromUpstash();
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
  await deleteFeedbackFromUpstash(id);
};

export const deleteUser = async (email: string): Promise<void> => {
  // Check if it's an admin first
  const admins = await getAdminsSafe();
  const adminIndex = admins.findIndex(a => a.email === email);

  if (adminIndex !== -1) {
    const updatedAdmins = admins.filter(a => a.email !== email);
    await saveAdminsToUpstash(updatedAdmins);
    return;
  }

  // 1. Delete from Local Storage
  const users = getLocal<User>(USERS_KEY);
  const newUsers = users.filter(u => u.email !== email);
  localStorage.setItem(USERS_KEY, JSON.stringify(newUsers));

  // 2. Delete from Cloud
  await deleteUserFromUpstash(email);
};

// --- CHAT LOGGING ---

export const logChatSession = async (session: ChatSession): Promise<void> => {
  // Only save to Cloud to save local storage space, as these are logs
  await saveChatSessionToUpstash(session);
};

export const getChatHistory = async (): Promise<ChatSession[]> => {
  return await fetchChatLogsFromUpstash();
};

export const deleteChatSession = async (id: string): Promise<void> => {
  const sessions = await fetchChatLogsFromUpstash();
  const newSessions = sessions.filter(s => s.id !== id);
  // Use the KV helper to save the filtered array (implemented as overload in KV)
  await saveChatSessionToUpstash(newSessions);
};

// --- PLATFORM FEEDBACK (HUB) ---

export const savePlatformFeedback = async (feedback: Omit<PlatformFeedback, 'id' | 'timestamp' | 'status'>): Promise<PlatformFeedback> => {
  const newFeedback: PlatformFeedback = {
    ...feedback,
    id: Math.random().toString(36).substr(2, 9),
    timestamp: Date.now(),
    status: 'new'
  };
  await savePlatformFeedbackToUpstash(newFeedback);
  return newFeedback;
};

export const getAllPlatformFeedback = async (): Promise<PlatformFeedback[]> => {
  const feedback = await fetchPlatformFeedbackFromUpstash();
  return feedback.sort((a, b) => b.timestamp - a.timestamp);
};

export const updatePlatformFeedbackStatus = async (id: string, status: 'new' | 'reviewed'): Promise<void> => {
  const all = await fetchPlatformFeedbackFromUpstash();
  const item = all.find(f => f.id === id);
  if (item) {
    item.status = status;
    await savePlatformFeedbackToUpstash(item);
  }
};

// --- TEAM MEMBERS ---

export const getTeamMembers = async (): Promise<TeamMember[]> => {
  const cloudTeam = await fetchTeamFromUpstash();
  if (cloudTeam && cloudTeam.length > 0) return cloudTeam;
  // Fallback to static defaults if KV is empty (first-time setup)
  return TEAM_MEMBERS;
};

export const saveTeamMembers = async (team: TeamMember[]): Promise<void> => {
  await saveTeamToUpstash(team);
};
