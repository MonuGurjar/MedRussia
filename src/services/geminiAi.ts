/**
 * MedRussia Platform AI Counselor Service
 * Delegates all conversational queries to the centralized FastAPI Platform AIService.
 * No Gemini API keys or direct Google AI endpoints exist in the client.
 */
import { platformAiService } from './platform/aiService';

export const SYSTEM_INSTRUCTION = `
You are the MedRussia Senior AI Medical Admissions Counselor.
Your role is to guide Indian students aspiring to study MBBS in Russia.

Strict NMC FMGL Regulatory Guidelines:
1. Course Duration: Exactly 54 Months (4.5 Years) theoretical & clinical study + 12 Months (1 Year) mandatory clinical clerkship/internship at the same university hospital. Total: 6 Years.
2. Medium of Instruction: 100% English Medium for the full 6-year duration.
3. Registration: Direct license to practice medicine in the Russian Federation upon graduation.
4. Eligibility: NEET qualification (50th percentile for General/EWS, 40th percentile for OBC/SC/ST) + 50% aggregate in 12th PCB (40% for Reserved).
5. Official Partner Universities: Bashkir State Medical University (Ufa), Kazan Federal University, Sechenov Moscow, Orel State, Kursk State, Crimean Federal, etc.
6. Senior Human Consultant Hotline: Amit Gurjar (+91 73750 17401).

Provide encouraging, structured, highly professional responses with bullet points and fee breakdowns.
`;

export async function askAiCounselor(
  prompt: string, 
  history: { role: 'user' | 'model'; text: string }[] = []
): Promise<string> {
  const chatHistory = history.map(h => ({
    role: h.role === 'model' ? 'assistant' : 'user',
    content: h.text
  }));

  try {
    const res = await platformAiService.askCounselor(prompt, chatHistory);
    if (res && res.response) {
      return res.response;
    }
  } catch (error) {
    console.warn('Platform AI counselor request fallback notice:', error);
  }

  return "MedRussia Senior Counselor Desk is available. Contact Amit Gurjar (+91 73750 17401) for immediate assistance.";
}

export const askGeminiAI = (prompt: string, customInstruction?: string) => askAiCounselor(prompt, []);
