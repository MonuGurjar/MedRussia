import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { askGeminiAI } from '../services/geminiAi';
import { User } from '../types';

interface AiCounselorProps {
  currentUser?: User | null;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: number;
}

const PROMPT_CHIPS = [
  'Is NEET 2026 mandatory for Russia?',
  'NMC 54-Month English Medium Rule',
  'Bashkir vs Kazan Federal Medical University',
  'Total 6-Year MBBS Budget in INR',
  'Indian Mess & Food availability in Hostels'
];

export const AiCounselorChatScreen: React.FC<AiCounselorProps> = ({ currentUser }) => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'ai',
      text: `Hello ${currentUser?.name || 'Future Doctor'}! 👋 I am your AI Russian MBBS Admissions Advisor powered by MedRussia.\n\nI can answer all your questions regarding NMC FMGL 2021 regulations, university fees, hostel living, eligibility criteria, and 2026 intake batches. How can I assist you today?`,
      timestamp: Date.now()
    }
  ]);
  const [inputMsg, setInputMsg] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputMsg).trim();
    if (!query || isGenerating) return;

    const userMessage: ChatMessage = {
      id: `usr_${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMsg('');
    setIsGenerating(true);

    try {
      const response = await askGeminiAI(
        query,
        `You are the Senior Russian Medical University Admissions Advisor at MedRussia. Advise Indian medical aspirants on NMC compliance, fees, NEET cutoffs, and university selection with accurate 2026-27 session data. Keep responses structured, helpful, and concise.`
      );

      const aiMessage: ChatMessage = {
        id: `ai_${Date.now()}`,
        sender: 'ai',
        text: response,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, aiMessage]);
    } catch (e: any) {
      const errorMessage: ChatMessage = {
        id: `err_${Date.now()}`,
        sender: 'ai',
        text: "I am having trouble connecting to the admissions knowledge base. Please try asking again or reach out to our senior human counselor at +91 73750 17401.",
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8 flex flex-col justify-between">
      <div className="max-w-3xl w-full mx-auto flex-1 flex flex-col space-y-4">

        {/* Header */}
        <div className="bg-[#0f172a] text-white rounded-3xl p-6 shadow-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-xl">
              🩺
            </div>
            <div>
              <h1 className="font-extrabold text-base sm:text-lg text-white">AI Medical Advisor</h1>
              <p className="text-xs text-amber-400 font-semibold flex items-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                NMC FMGL Gazette 2021 Trained
              </p>
            </div>
          </div>
          <button 
            onClick={() => navigate('/apply')}
            className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs transition"
          >
            Apply Now
          </button>
        </div>

        {/* Quick Query Chips */}
        <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1">
          {PROMPT_CHIPS.map((chip, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(chip)}
              className="px-3 py-1.5 rounded-full bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold shrink-0 transition"
            >
              💡 {chip}
            </button>
          ))}
        </div>

        {/* Chat History */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 flex-1 min-h-[400px] max-h-[550px] overflow-y-auto space-y-4">
          {messages.map(msg => (
            <div
              key={msg.id}
              className={`flex items-start gap-3 ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${
                msg.sender === 'user' ? 'bg-slate-800 text-white' : 'bg-amber-100 text-amber-900'
              }`}>
                {msg.sender === 'user' ? 'You' : 'MD'}
              </div>
              <div className={`p-4 rounded-2xl max-w-[82%] text-xs sm:text-sm leading-relaxed whitespace-pre-wrap ${
                msg.sender === 'user' 
                  ? 'bg-[#0f172a] text-white rounded-tr-none' 
                  : 'bg-slate-50 border border-slate-200 text-slate-800 rounded-tl-none'
              }`}>
                {msg.text}
              </div>
            </div>
          ))}

          {isGenerating && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center text-xs font-bold">
                MD
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-500 text-xs flex items-center gap-2">
                <span className="animate-spin material-symbols-outlined text-[16px]">progress_activity</span>
                Consulting NMC admissions guidelines...
              </div>
            </div>
          )}
        </div>

        {/* Input Box */}
        <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Ask anything about fees, NMC rules, hostels, cities..."
            value={inputMsg}
            onChange={e => setInputMsg(e.target.value)}
            className="flex-1 p-4 bg-white border border-slate-200 rounded-2xl text-xs sm:text-sm text-slate-800 outline-none focus:ring-2 focus:ring-[#0f172a]"
          />
          <button
            type="submit"
            disabled={!inputMsg.trim() || isGenerating}
            className="p-4 rounded-2xl bg-[#0f172a] hover:bg-slate-800 text-white font-bold transition disabled:opacity-40"
          >
            <span className="material-symbols-outlined text-[20px]">send</span>
          </button>
        </form>

      </div>
    </div>
  );
};
