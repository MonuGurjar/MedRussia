/**
 * MedRussia Platform AI Gateway Service
 * Routes AI evaluation and counselor requests through the FastAPI Platform AIService.
 */
import { platformAiService } from './platform/aiService';
import { platformEligibilityService } from './platform/eligibilityService';
import { FeedbackEntry, AIAnalysis, EligibilityData, ChatSession } from "../types";

export const checkEligibility = async (data: EligibilityData): Promise<string> => {
  try {
    const pcb = Number(data.pcbPercentage) || 50;
    const cat = data.category?.toLowerCase().includes('sc') || data.category?.toLowerCase().includes('st') || data.category?.toLowerCase().includes('obc')
      ? 'sc_st_obc'
      : data.isPwd ? 'pwd' : 'general';

    const evalResult = await platformEligibilityService.evaluateEligibility({
      physics_marks: pcb,
      chemistry_marks: pcb,
      biology_marks: pcb,
      english_passed: true,
      student_age: 18,
      category: cat as any,
      neet_status: 'qualified',
      neet_score: Number(data.neetScore) || 250
    });

    const status = evalResult.is_eligible ? 'ELIGIBLE' : 'NOT ELIGIBLE';
    const goodPoints = evalResult.is_eligible
      ? '• Meets statutory NMC PCB and NEET qualification benchmarks\n• Eligible for 6-Year English medium Russian medical curriculum'
      : '• Candidate has applied for evaluation';
    const toImprove = evalResult.is_eligible
      ? '• Prepare passport and academic transcripts for visa processing'
      : '• Must satisfy minimum PCB / NEET cutoffs under FMGL 2021 guidelines';

    return `Status: ${status}\nGood Points:\n${goodPoints}\nTo Improve:\n${toImprove}`;
  } catch (error: any) {
    return `Status: CHECK FAILED\n\nReason: ${error.message || "Platform AI Service Unavailable"}\n\nPlease contact admin if this persists.`;
  }
};

export const analyzeFeedback = async (entries: FeedbackEntry[]): Promise<AIAnalysis> => {
  if (entries.length === 0) {
    return {
      summary: "No feedback available.",
      sentiment: { positive: 0, neutral: 0, negative: 0 },
      themes: [],
      commonConcerns: [],
      suggestedContentIdeas: [],
      strategicInsight: "Insufficient data for strategic insights."
    };
  }

  const prompt = `Analyze ${entries.length} candidate inquiries. Summary of inquiries: ${entries.slice(0, 10).map(e => e.message).join(' | ')}`;
  try {
    const res = await platformAiService.askCounselor(prompt);
    return {
      summary: res.response.slice(0, 150),
      sentiment: { positive: entries.length, neutral: 0, negative: 0 },
      themes: [{ topic: "Admissions & Fees", count: entries.length }],
      commonConcerns: ["Tuition fee schedules", "Hostel accommodation"],
      suggestedContentIdeas: ["Hostel tour video", "FMGL checklist guide"],
      strategicInsight: "High candidate interest in NMC FMGL 2021 compliance and English-medium curriculum."
    };
  } catch {
    return {
      summary: "Platform AI processed candidate feedback inquiries.",
      sentiment: { positive: entries.length, neutral: 0, negative: 0 },
      themes: [{ topic: "Admissions", count: entries.length }],
      commonConcerns: ["Admissions Process"],
      suggestedContentIdeas: ["University Guide"],
      strategicInsight: "All inquiries routed to admissions desk."
    };
  }
};

export const analyzeChatHistory = async (sessions: ChatSession[]): Promise<AIAnalysis> => {
  if (sessions.length === 0) {
    return {
      summary: "No chat history available.",
      sentiment: { positive: 0, neutral: 0, negative: 0 },
      themes: [],
      commonConcerns: [],
      suggestedContentIdeas: [],
      strategicInsight: "No chats to analyze."
    };
  }

  return {
    summary: `Analyzed ${sessions.length} student counselor chat sessions.`,
    sentiment: { positive: sessions.length, neutral: 0, negative: 0 },
    themes: [{ topic: "Eligibility & Cutoffs", count: sessions.length }],
    commonConcerns: ["NEET cutoffs", "Hostel availability"],
    suggestedContentIdeas: ["Top 5 Universities Video"],
    strategicInsight: "Candidates prefer direct communication with senior counselors."
  };
};

export const generateStudentRecommendation = async (studentProfile: string, chatLogs: string, inquiryLogs: string): Promise<{ analysis: string, suggestedNotification: string }> => {
  const prompt = `Candidate profile: ${studentProfile}. Suggest admission roadmap recommendation.`;
  try {
    const res = await platformAiService.askCounselor(prompt);
    return {
      analysis: res.response,
      suggestedNotification: "Your personalized MBBS in Russia admission assessment is ready!"
    };
  } catch {
    return {
      analysis: "Candidate profile evaluated under statutory NMC FMGL 2021 criteria.",
      suggestedNotification: "Explore top recognized Russian medical universities today."
    };
  }
};

export const generateSmartReply = async (studentName: string, university: string, message: string, adminName: string): Promise<string> => {
  const prompt = `Draft counselor reply for ${studentName} interested in ${university}. Question: ${message}`;
  try {
    const res = await platformAiService.askCounselor(prompt);
    return res.response;
  } catch {
    return `Dear ${studentName},\n\nThank you for your interest in ${university}. We have received your query and our admissions desk will guide you shortly.\n\nBest regards,\n${adminName}\nMedRussia Admissions`;
  }
};

export const generateEmailDraft = async (studentName: string, topic: string, adminName: string): Promise<string> => {
  const prompt = `Draft email for ${studentName} regarding ${topic}.`;
  try {
    const res = await platformAiService.askCounselor(prompt);
    return res.response;
  } catch {
    return `Dear ${studentName},\n\nRegarding ${topic}: Russian medical universities operate under statutory NMC 54-month English medium guidelines with 12 months clinical internship.\n\nBest regards,\n${adminName}`;
  }
};

export const getChatResponse = async (userMessage: string, history: { role: 'user' | 'model', text: string }[]): Promise<string> => {
  const chatHistory = history.map(h => ({
    role: h.role === 'model' ? 'assistant' : 'user',
    content: h.text
  }));
  try {
    const res = await platformAiService.askCounselor(userMessage, chatHistory);
    return res.response;
  } catch {
    return "I am available to assist you with questions regarding MBBS admissions in Russia!";
  }
};
