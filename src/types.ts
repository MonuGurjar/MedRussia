
export type UserRole = 'student' | 'admin';
export type AdminRole = 'super_admin' | 'manager' | 'chat_officer' | 'editor' | 'support';

export interface EligibilityData {
  pcbPercentage: string;
  category: 'General' | 'Reserved';
  isPwd: boolean;
  neetScore: string;
  dob: string;
  medium: 'English' | 'Russian';
  knowsRussian: boolean;
  passportStatus: 'Have' | 'Applied' | 'Not Applied';
  medicalHistory: string;
}

export interface UserNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'alert' | 'recommendation';
  timestamp: number;
  isRead: boolean;
}

export interface DocumentMetadata {
  url: string;
  publicId?: string;
  status: 'pending' | 'uploaded' | 'verified' | 'rejected';
  uploadedAt: number;
  remarks?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  adminRole?: AdminRole; // Specific role for admins
  university?: string;
  phone?: string;
  shortlistedUniversities?: string[];
  avatar?: string;
  documents?: {
    marksheet?: DocumentMetadata;
    passport?: DocumentMetadata;
    neetScoreCard?: DocumentMetadata;
  };
  eligibilityData?: EligibilityData;
  eligibilityResult?: string; // The AI analysis text
  notifications?: UserNotification[];
  // Security
  recoveryQuestion?: string;
  recoveryAnswer?: string;
}

export interface FeedbackReply {
  id: string;
  adminName: string;
  message: string;
  timestamp: number;
}

export interface FeedbackEntry {
  id: string;
  userId?: string;
  name: string;
  email: string;
  phone: string;
  university: string;
  currentStatus: '12th Standard' | 'NEET Aspirant' | 'Dropper' | 'Currently in Russia' | 'Other';
  targetUniversity: string;
  budget: string;
  message: string;
  timestamp: number;
  replies: FeedbackReply[];
  status: 'pending' | 'replied' | 'closed';
}

export interface PlatformFeedback {
  id: string;
  feedbackType: 'Feature suggestion' | 'Missing information' | 'UI / UX' | 'Data accuracy' | 'Other';
  message: string;
  email?: string;
  timestamp: number;
  userRole: 'guest' | 'user';
  status: 'new' | 'reviewed';
}

export interface AIAnalysis {
  summary: string;
  sentiment: {
    positive: number;
    neutral: number;
    negative: number;
  };
  themes: {
    topic: string;
    count: number;
  }[];
  commonConcerns: string[];
  suggestedContentIdeas: string[];
  strategicInsight?: string; // New field for data-driven insight
}

// --- CHAT BOT TYPES ---

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export interface ChatSession {
  id: string;
  userId?: string; // Optional, if user is logged in
  visitorName?: string; // Auto-generated or from login
  startTime: number;
  lastMessageTime: number;
  messages: ChatMessage[];
  messageCount: number;
}

// --- DIRECT MESSAGING TYPES ---

export interface DirectMessageAttachment {
  name: string;
  type: string; // mime type
  data: string; // base64 data URL
}

export interface DirectMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: 'student' | 'admin';
  text: string;
  attachment?: DirectMessageAttachment;
  timestamp: number;
  isEscalation?: boolean;
  escalationNote?: string;
}

export interface DirectChat {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  assignedTo?: string; // admin user id
  assignedName?: string;
  status: 'open' | 'escalated' | 'closed';
  escalatedTo?: string; // role level e.g. 'manager'
  escalationReason?: string;
  messages: DirectMessage[];
  createdAt: number;
  lastMessageAt: number;
}

// --- SITE BUILDER TYPES ---

export interface SectionContent {
  id: string;
  type: 'hero' | 'stats' | 'features' | 'steps' | 'trust' | 'faq' | 'cta';
  isVisible: boolean;
  title: string;
  subtitle?: string;
  order: number;
  data?: any; // Flexible data for lists, cards, etc.
}

export interface ThemeConfig {
  primaryColor: string; // e.g., 'indigo'
  borderRadius: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  fontFamily: 'inter' | 'roboto' | 'poppins';
  mode: 'light' | 'dark' | 'system';
}

export interface FeatureFlags {
  eligibilityCheck: boolean;
  universityCompare: boolean;
  chatWidget: boolean;
  whatsappFab: boolean;
  studentLogin: boolean;
}

export interface AppSettings {
  currencyConverter: {
    enabled: boolean;
    apiKey: string;
  };
  groqAI: {
    enabled: boolean;
    apiKey: string;
    model: string;
  };
  emailJs: {
    enabled: boolean;
    serviceId: string;
    templateId: string;
    publicKey: string;
  };
  cloudinary: {
    cloudName: string;
    uploadPreset: string;
  };
  chatBot: {
    enabled: boolean;
    botName: string;
    welcomeMessage: string;
  };
  // New CMS Configs
  siteConfig?: {
    sections: SectionContent[];
  };
  themeConfig?: ThemeConfig;
  features?: FeatureFlags;
}
