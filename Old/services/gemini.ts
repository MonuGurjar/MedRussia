
import { getSettings } from './settings';
import { FeedbackEntry, AIAnalysis, EligibilityData, ChatSession } from "../types";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

/**
 * centralized function to call AI.
 */
const callGroq = async (messages: any[], jsonMode = false, temperature = 0.7) => {
    try {
        const settings = await getSettings();
        const userApiKey = settings.groqAI?.apiKey;
        const model = settings.groqAI?.model || "llama-3.3-70b-versatile";

        let response;

        if (userApiKey && userApiKey.trim() !== "") {
            const body: any = {
                model,
                messages,
                temperature
            };
            if (jsonMode) {
                body.response_format = { type: "json_object" };
            }

            response = await fetch(GROQ_API_URL, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${userApiKey}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(body)
            });
        } else {
            response = await fetch('/api/ai', {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    messages,
                    model,
                    jsonMode,
                    temperature
                })
            });
        }

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`AI Service Error (${response.status}): ${errText}`);
        }

        const data = await response.json();
        return data.choices?.[0]?.message?.content || "";
    } catch (e: any) {
        console.error("AI Call Failed:", e);
        throw e;
    }
};

export const checkEligibility = async (data: EligibilityData): Promise<string> => {
    const currentYear = new Date().getFullYear();
    const prompt = `
        You are an expert admission counselor for MBBS in Russia. Evaluate this student's eligibility.

        STUDENT DATA:
        - 12th PCB Percentage: ${data.pcbPercentage}%
        - Category: ${data.category}
        - PwD Status: ${data.isPwd ? 'Yes' : 'No'}
        - NEET Score: ${data.neetScore}
        - Date of Birth: ${data.dob} (Current Year: ${currentYear})
        - Medical History/Issues: ${data.medicalHistory || 'None'}
        - Preferred Medium: ${data.medium}
        - Knows Russian: ${data.knowsRussian ? 'Yes' : 'No'}
        - Passport Status: ${data.passportStatus}

        RULES:
        1. 12th PCB: General >= 50%, Reserved/PwD >= 40%.
        2. NEET: General ~137+, Reserved ~107+. If failed, NOT ELIGIBLE.
        3. Age: 17 by 31 Dec ${currentYear}.

        Provide a structured response:
        Status: [ELIGIBLE / NOT ELIGIBLE / CONDITIONALLY ELIGIBLE]
        Reason: [Brief explanation]
        Advice: [Next steps]
    `;

    try {
        return await callGroq([{ role: "user", content: prompt }]);
    } catch (error: any) {
        return `Status: CHECK FAILED\n\nReason: ${error.message || "AI Service Unavailable"}\n\nPlease contact admin if this persists.`;
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

  const recentEntries = entries.slice(0, 50);

  const prompt = `
    Analyze these ${recentEntries.length} student inquiries for MBBS in Russia.
    
    Data:
    ${recentEntries.map(e => `Budget: ${e.budget || 'Unknown'}, Uni: ${e.targetUniversity || 'General'}, Query: "${e.message}"`).join('\n')}

    Output purely valid JSON with this EXACT structure:
    {
        "summary": "Brief summary",
        "sentiment": { "positive": 10, "neutral": 5, "negative": 2 },
        "themes": [{ "topic": "Tuition Fees", "count": 12 }, { "topic": "Safety", "count": 8 }],
        "commonConcerns": ["Concern 1", "Concern 2"],
        "suggestedContentIdeas": ["Video idea 1", "Blog topic 2"],
        "strategicInsight": "A 1-sentence analytical observation derived strictly from the data."
    }
    Ensure sentiment numbers add up to ${recentEntries.length} roughly.
  `;

  try {
    const jsonStr = await callGroq([
        { role: "system", content: "You are a data analyst. Output only valid JSON." },
        { role: "user", content: prompt }
    ], true);
    
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("Analysis Error:", error);
    throw new Error("Failed to generate analysis.");
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
  
    const recentSessions = sessions.slice(0, 20);
    const simplifiedData = recentSessions.map(s => {
        const userMsgs = s.messages.filter(m => m.role === 'user').map(m => m.text).join(' | ');
        return `Visitor (${s.visitorName}): ${userMsgs}`;
    }).join('\n---\n');
  
    const prompt = `
      Analyze these ${recentSessions.length} chat sessions between visitors and the AI bot regarding MBBS in Russia.
      
      Transcript Data:
      ${simplifiedData}
  
      Output purely valid JSON with this EXACT structure:
      {
          "summary": "Brief summary",
          "sentiment": { "positive": 5, "neutral": 2, "negative": 1 },
          "themes": [{ "topic": "Eligibility", "count": 5 }],
          "commonConcerns": ["Concern 1"],
          "suggestedContentIdeas": ["Idea 1"],
          "strategicInsight": "A 1-sentence strategic insight."
      }
    `;
  
    try {
      const jsonStr = await callGroq([
          { role: "system", content: "You are a conversation analyst. Output only valid JSON." },
          { role: "user", content: prompt }
      ], true);
      
      return JSON.parse(jsonStr);
    } catch (error) {
      console.error("Chat Analysis Error:", error);
      throw new Error("Failed to analyze chats.");
    }
  };

// ... (Other functions remain mostly the same, minor improvements)
export const generateStudentRecommendation = async (studentProfile: string, chatLogs: string, inquiryLogs: string): Promise<{ analysis: string, suggestedNotification: string }> => {
    const prompt = `
        You are an expert academic counselor for MedRussia. Analyze this specific student's activity.
        PROFILE: ${studentProfile}
        CHATS: ${chatLogs}
        INQUIRIES: ${inquiryLogs}
        OUTPUT JSON: { "analysis": "Insight for admin...", "suggestedNotification": "Short message for student..." }
    `;
    try {
        const jsonStr = await callGroq([
            { role: "system", content: "Output valid JSON." },
            { role: "user", content: prompt }
        ], true);
        return JSON.parse(jsonStr);
    } catch (e: any) {
        throw new Error(e.message || "Failed to generate recommendation");
    }
};

export const generateSmartReply = async (studentName: string, university: string, message: string, adminName: string): Promise<string> => {
    const prompt = `
        You are ${adminName}, a counselor for MedRussia.
        Student: ${studentName}, Interest: ${university}, Query: "${message}"
        Draft a polite email reply body only.
    `;
    try {
        const text = await callGroq([{ role: "user", content: prompt }]);
        return text.replace(/^"(.*)"$/, '$1'); 
    } catch (error: any) { throw new Error(error.message); }
};

export const generateEmailDraft = async (studentName: string, topic: string, adminName: string): Promise<string> => {
    const prompt = `You are ${adminName} from MedRussia. Draft email body for ${studentName} about "${topic}". Tone: Professional.`;
    try {
        const text = await callGroq([{ role: "user", content: prompt }]);
        return text.replace(/^"(.*)"$/, '$1'); 
    } catch (error: any) { throw new Error(error.message); }
};

export const getChatResponse = async (userMessage: string, history: { role: 'user' | 'model', text: string }[]): Promise<string> => {
  try {
    const messages = [
        { role: "system", content: "You are Dr. MedRussia, a helpful assistant for Indian students regarding MBBS in Russia. Be concise and polite." },
        ...history.map(h => ({ role: h.role === 'model' ? 'assistant' : 'user', content: h.text })),
        { role: "user", content: userMessage }
    ];
    return await callGroq(messages);
  } catch (error: any) {
    return "I'm having trouble connecting to the server.";
  }
};
