
import { FeedbackEntry, AppSettings, ChatSession, PlatformFeedback, User, DirectChat } from '../types';
import { TeamMember } from '../data/teamData';

// Keys for Redis
const KEY_FEEDBACK = 'med_russia:feedback';
const KEY_USERS = 'med_russia:users';
const KEY_SETTINGS = 'med_russia:settings';
const KEY_CHAT_LOGS = 'med_russia:chat_logs';
const KEY_ADMINS = 'admin.json';
const KEY_PLATFORM_FEEDBACK = 'med_russia:platform_feedback';
const KEY_TEAM = 'med_russia:team';
const KEY_DIRECT_CHATS = 'med_russia:direct_chats';

// Helper to interact with Vercel Serverless Function proxy
const upstashFetch = async (command: string, ...args: any[]) => {
    try {
        const response = await fetch('/api/db', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ command, args }),
        });

        if (!response.ok) {
            console.warn(`DB Proxy Error: ${response.status}`);
            return null;
        }

        const data = await response.json();
        return data.result;
    } catch (error) {
        console.error(`DB ${command} failed:`, error);
        return null;
    }
};

export const isUpstashConfigured = () => {
    return true;
};

// --- GENERIC HELPERS ---

const getJSON = async <T>(key: string, defaultValue: T): Promise<T> => {
    try {
        const result = await upstashFetch('GET', key);
        if (!result) return defaultValue;
        return typeof result === 'string' ? JSON.parse(result) : result;
    } catch (e) {
        return defaultValue;
    }
};

const setJSON = async (key: string, value: any) => {
    return await upstashFetch('SET', key, JSON.stringify(value));
};

// --- FEEDBACK ---

export const fetchFeedbackFromUpstash = async (): Promise<{ entries: FeedbackEntry[], error?: string }> => {
    try {
        const entries = await getJSON<FeedbackEntry[]>(KEY_FEEDBACK, []);
        if (!Array.isArray(entries)) return { entries: [] };
        return { entries };
    } catch (e: any) {
        return { entries: [], error: e.message };
    }
};

export const saveFeedbackToUpstash = async (newEntry: FeedbackEntry): Promise<boolean> => {
    try {
        const { entries } = await fetchFeedbackFromUpstash();
        const index = entries.findIndex(e => e.id === newEntry.id);
        const updatedEntries = [...entries];

        if (index !== -1) {
            updatedEntries[index] = newEntry;
        } else {
            updatedEntries.push(newEntry);
        }

        await setJSON(KEY_FEEDBACK, updatedEntries);
        return true;
    } catch (e) {
        return false;
    }
};

export const deleteFeedbackFromUpstash = async (id: string): Promise<boolean> => {
    try {
        const { entries } = await fetchFeedbackFromUpstash();
        const updatedEntries = entries.filter(e => e.id !== id);
        await setJSON(KEY_FEEDBACK, updatedEntries);
        return true;
    } catch (e) {
        return false;
    }
};

// --- PLATFORM FEEDBACK (The Hub) ---

export const fetchPlatformFeedbackFromUpstash = async (): Promise<PlatformFeedback[]> => {
    try {
        const items = await getJSON<PlatformFeedback[]>(KEY_PLATFORM_FEEDBACK, []);
        return Array.isArray(items) ? items : [];
    } catch (e) {
        return [];
    }
};

export const savePlatformFeedbackToUpstash = async (item: PlatformFeedback): Promise<boolean> => {
    try {
        const items = await fetchPlatformFeedbackFromUpstash();
        const index = items.findIndex(i => i.id === item.id);

        if (index !== -1) {
            items[index] = item;
        } else {
            items.push(item);
        }

        await setJSON(KEY_PLATFORM_FEEDBACK, items);
        return true;
    } catch (e) {
        return false;
    }
};

// --- USERS ---

export const fetchUsersFromUpstash = async (): Promise<any[]> => {
    const users = await getJSON<any[]>(KEY_USERS, []);
    return Array.isArray(users) ? users : [];
};

export const saveUserToUpstash = async (user: any): Promise<boolean> => {
    try {
        const users = await fetchUsersFromUpstash();
        const index = users.findIndex((u: any) => u.id === user.id);

        if (index !== -1) {
            users[index] = user;
        } else {
            users.push(user);
        }

        await setJSON(KEY_USERS, users);
        return true;
    } catch (e) {
        return false;
    }
};

export const deleteUserFromUpstash = async (email: string): Promise<boolean> => {
    try {
        const users = await fetchUsersFromUpstash();
        const updatedUsers = users.filter((u: any) => u.email !== email);
        await setJSON(KEY_USERS, updatedUsers);
        return true;
    } catch (e) {
        return false;
    }
};

// --- ADMINS (admin.json) ---

export const fetchAdminsFromUpstash = async (): Promise<User[]> => {
    try {
        const admins = await getJSON<User[]>(KEY_ADMINS, []);
        return Array.isArray(admins) ? admins : [];
    } catch (e) {
        return [];
    }
};

export const saveAdminsToUpstash = async (admins: User[]): Promise<boolean> => {
    try {
        await setJSON(KEY_ADMINS, admins);
        return true;
    } catch (e) {
        return false;
    }
};

// --- SETTINGS ---

const DEFAULT_SETTINGS: AppSettings = {
    currencyConverter: { enabled: true, apiKey: '' },
    groqAI: { enabled: false, apiKey: '', model: 'llama-3.3-70b-versatile' },
    emailJs: { enabled: false, serviceId: '', templateId: '', publicKey: '' },
    cloudinary: { cloudName: '', uploadPreset: '' },
    chatBot: {
        enabled: false,
        botName: 'Dr. MedRussia',
        welcomeMessage: 'Hello! I can help you with questions about MBBS fees, universities, and admission. Ask me anything!'
    },
    features: {
        eligibilityCheck: true,
        universityCompare: true,
        chatWidget: true,
        whatsappFab: true,
        studentLogin: true
    }
};

export const fetchSettingsFromUpstash = async (): Promise<AppSettings> => {
    const settings = await getJSON<AppSettings>(KEY_SETTINGS, DEFAULT_SETTINGS);

    return {
        ...DEFAULT_SETTINGS,
        ...settings,
        features: { ...DEFAULT_SETTINGS.features, ...(settings.features || {}) }
    };
};

export const saveSettingsToUpstash = async (settings: AppSettings): Promise<boolean> => {
    try {
        await setJSON(KEY_SETTINGS, settings);
        return true;
    } catch (e) {
        return false;
    }
};

// --- CHAT LOGS ---

export const fetchChatLogsFromUpstash = async (): Promise<ChatSession[]> => {
    try {
        const logs = await getJSON<ChatSession[]>(KEY_CHAT_LOGS, []);
        return Array.isArray(logs) ? logs : [];
    } catch (e) {
        return [];
    }
};

export const saveChatSessionToUpstash = async (session: ChatSession | ChatSession[]): Promise<boolean> => {
    try {
        // Overload: if array passed, replace whole log (for deletion)
        if (Array.isArray(session)) {
            await setJSON(KEY_CHAT_LOGS, session);
            return true;
        }

        const sessions = await fetchChatLogsFromUpstash();
        const index = sessions.findIndex(s => s.id === session.id);

        if (index !== -1) {
            sessions[index] = session;
        } else {
            sessions.push(session);
        }

        const limitedSessions = sessions.sort((a, b) => b.lastMessageTime - a.lastMessageTime).slice(0, 100);

        await setJSON(KEY_CHAT_LOGS, limitedSessions);
        return true;
    } catch (e) {
        return false;
    }
};

// --- TEAM MEMBERS ---

export const fetchTeamFromUpstash = async (): Promise<TeamMember[]> => {
    try {
        const team = await getJSON<TeamMember[]>(KEY_TEAM, []);
        return Array.isArray(team) ? team : [];
    } catch (e) {
        return [];
    }
};

export const saveTeamToUpstash = async (team: TeamMember[]): Promise<boolean> => {
    try {
        await setJSON(KEY_TEAM, team);
        return true;
    } catch (e) {
        return false;
    }
};

// --- DIRECT CHATS ---

export const fetchDirectChatsFromUpstash = async (): Promise<DirectChat[]> => {
    try {
        const chats = await getJSON<DirectChat[]>(KEY_DIRECT_CHATS, []);
        return Array.isArray(chats) ? chats : [];
    } catch (e) {
        return [];
    }
};

export const saveDirectChatsToUpstash = async (chats: DirectChat[]): Promise<boolean> => {
    try {
        await setJSON(KEY_DIRECT_CHATS, chats);
        return true;
    } catch (e) {
        return false;
    }
};
