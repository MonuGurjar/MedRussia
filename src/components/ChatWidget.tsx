import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSettings } from '../services/settings';
import { AppSettings, ChatSession } from '../types';
import { getChatResponse } from '../services/gemini';
import { logChatSession } from '../services/db';

interface Message { id: number; text: string; sender: 'user' | 'bot'; isError?: boolean; }
interface ChatWidgetProps { isLifted?: boolean; }

const GUEST_MESSAGE_LIMIT = 5;
const FAB_POSITION_KEY = 'mr_chat_fab_pos';
const GUEST_MSG_COUNT_KEY = 'mr_guest_msg_count';

export const ChatWidget: React.FC<ChatWidgetProps> = ({ isLifted = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [guestMessageCount, setGuestMessageCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const sessionIdRef = useRef<string>('');
  const sessionStartTimeRef = useRef<number>(0);

  const [fabPosition, setFabPosition] = useState<{ x: number; y: number }>(() => {
    try { const saved = localStorage.getItem(FAB_POSITION_KEY); if (saved) return JSON.parse(saved); } catch (e) {}
    return { x: window.innerWidth - 80, y: window.innerHeight - 100 };
  });
  const isDragging = useRef(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const fabStartPos = useRef({ x: 0, y: 0 });
  const dragMoved = useRef(false);
  const fabRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    try { const storedUser = localStorage.getItem('mr_active_user'); if (storedUser) setIsAuthenticated(true); } catch (e) {}
    try { const count = sessionStorage.getItem(GUEST_MSG_COUNT_KEY); if (count) setGuestMessageCount(parseInt(count, 10)); } catch (e) {}
    if (!sessionIdRef.current) {
      const existingId = sessionStorage.getItem('mr_chat_session_id');
      if (existingId) { sessionIdRef.current = existingId; } else { sessionIdRef.current = Math.random().toString(36).substr(2, 9); sessionStorage.setItem('mr_chat_session_id', sessionIdRef.current); }
      sessionStartTimeRef.current = Date.now();
    }
    getSettings().then(data => { setSettings(data); if (data.chatBot?.welcomeMessage && messages.length === 0) setMessages([{ id: 0, text: data.chatBot.welcomeMessage, sender: 'bot' }]); });
  }, []);

  useEffect(() => { const hasUserMessage = messages.some(m => m.sender === 'user'); if (hasUserMessage) saveSessionToDB(); }, [messages]);
  useEffect(() => { try { localStorage.setItem(FAB_POSITION_KEY, JSON.stringify(fabPosition)); } catch (e) {} }, [fabPosition]);

  const constrainPosition = useCallback((x: number, y: number) => {
    const fabSize = 56;
    return { x: Math.max(8, Math.min(x, window.innerWidth - fabSize - 8)), y: Math.max(8, Math.min(y, window.innerHeight - fabSize - 8)) };
  }, []);

  const handleDragStart = useCallback((clientX: number, clientY: number) => {
    isDragging.current = true; dragMoved.current = false; dragStartPos.current = { x: clientX, y: clientY }; fabStartPos.current = { ...fabPosition };
  }, [fabPosition]);

  const handleDragMove = useCallback((clientX: number, clientY: number) => {
    if (!isDragging.current) return;
    const dx = clientX - dragStartPos.current.x; const dy = clientY - dragStartPos.current.y;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dragMoved.current = true;
    setFabPosition(constrainPosition(fabStartPos.current.x + dx, fabStartPos.current.y + dy));
  }, [constrainPosition]);

  const handleDragEnd = useCallback(() => { isDragging.current = false; }, []);

  const onMouseDown = useCallback((e: React.MouseEvent) => { e.preventDefault(); handleDragStart(e.clientX, e.clientY); }, [handleDragStart]);
  useEffect(() => { const m = (e: MouseEvent) => handleDragMove(e.clientX, e.clientY); const u = () => handleDragEnd(); window.addEventListener('mousemove', m); window.addEventListener('mouseup', u); return () => { window.removeEventListener('mousemove', m); window.removeEventListener('mouseup', u); }; }, [handleDragMove, handleDragEnd]);

  const onTouchStart = useCallback((e: React.TouchEvent) => { const t = e.touches[0]; handleDragStart(t.clientX, t.clientY); }, [handleDragStart]);
  useEffect(() => { const m = (e: TouchEvent) => { const t = e.touches[0]; handleDragMove(t.clientX, t.clientY); }; const u = () => handleDragEnd(); window.addEventListener('touchmove', m, { passive: false }); window.addEventListener('touchend', u); return () => { window.removeEventListener('touchmove', m); window.removeEventListener('touchend', u); }; }, [handleDragMove, handleDragEnd]);

  useEffect(() => { const onResize = () => setFabPosition(prev => constrainPosition(prev.x, prev.y)); window.addEventListener('resize', onResize); return () => window.removeEventListener('resize', onResize); }, [constrainPosition]);

  const saveSessionToDB = async () => {
    const chatMessages = messages.map(m => ({ role: m.sender === 'user' ? 'user' : 'model' as 'user' | 'model', text: m.text, timestamp: m.id }));
    let userDetails: any = {};
    try { const storedUser = localStorage.getItem('mr_active_user'); if (storedUser) { const u = JSON.parse(storedUser); userDetails = { userId: u.id, visitorName: u.name }; } } catch (e) {}
    const session: ChatSession = { id: sessionIdRef.current, startTime: sessionStartTimeRef.current, lastMessageTime: Date.now(), messages: chatMessages, messageCount: chatMessages.length, userId: userDetails.userId, visitorName: userDetails.visitorName || `Visitor-${sessionIdRef.current.substring(0, 4)}` };
    await logChatSession(session);
  };

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  useEffect(() => { scrollToBottom(); }, [messages, isOpen]);

  const isGuestLimitReached = !isAuthenticated && guestMessageCount >= GUEST_MESSAGE_LIMIT;

  const handleSend = async () => {
    if (!input.trim() || isGuestLimitReached) return;
    if (!isAuthenticated) { const newCount = guestMessageCount + 1; setGuestMessageCount(newCount); sessionStorage.setItem(GUEST_MSG_COUNT_KEY, String(newCount)); }
    const userMsg: Message = { id: Date.now(), text: input, sender: 'user' };
    setMessages(prev => [...prev, userMsg]); setInput(''); setIsTyping(true);
    try {
      const history = messages.filter(m => !m.isError).map(m => ({ role: m.sender === 'user' ? 'user' : 'model' as 'user' | 'model', text: m.text }));
      const responseText = await getChatResponse(userMsg.text, history);
      setMessages(prev => [...prev, { id: Date.now() + 1, text: responseText, sender: 'bot' }]);
    } catch (e) { setMessages(prev => [...prev, { id: Date.now() + 1, text: "Sorry, I encountered an error. Please try again.", sender: 'bot', isError: true }]); } finally { setIsTyping(false); }
  };

  const handleFabClick = () => { if (!dragMoved.current) setIsOpen(!isOpen); };

  if (!settings?.chatBot?.enabled) return null;

  const chatWindowStyle: React.CSSProperties = { position: 'fixed', zIndex: 61 };
  const chatHeight = 460; const chatWidth = 380;
  if (fabPosition.y > chatHeight + 40) { chatWindowStyle.bottom = window.innerHeight - fabPosition.y + 16; } else { chatWindowStyle.top = fabPosition.y + 72; }
  if (fabPosition.x + 28 > chatWidth) { chatWindowStyle.right = window.innerWidth - fabPosition.x - 56; } else { chatWindowStyle.left = fabPosition.x; }

  return (
    <>
      {isOpen && (
        <div style={chatWindowStyle} className="w-[340px] md:w-[380px] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden fade-in-up flex flex-col">
          <div className="relative bg-[#0f172a] p-4 flex justify-between items-center">
            <div className="flex items-center gap-3 z-10">
              <div className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center text-white border border-white/20">
                <span className="material-symbols-outlined">auto_awesome</span>
              </div>
              <div>
                <h3 className="font-bold text-white text-[15px]">{settings.chatBot.botName}</h3>
                <p className="text-[11px] text-slate-300 font-semibold flex items-center gap-1.5"><span className="w-1.5 h-1.5 bg-[#34d399] rounded-full animate-pulse" />Powered by AI</p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="z-10 w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors">
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          <div className="h-[320px] overflow-y-auto p-5 space-y-4 bg-slate-50 custom-scrollbar">
            {messages.map((msg, index) => (
              <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`} style={{ animationDelay: `${Math.min(index * 0.05, 0.3)}s` }}>
                {msg.sender === 'bot' && <div className="w-6 h-6 rounded-lg bg-blue-100 flex items-center justify-center mr-2 mt-1 shrink-0"><span className="material-symbols-outlined text-blue-600" style={{fontSize:'14px'}}>auto_awesome</span></div>}
                <div className={`max-w-[75%] px-4 py-3 text-[13px] font-medium leading-relaxed ${msg.sender === 'user' ? 'bg-[#0f172a] text-white rounded-2xl rounded-tr-sm shadow-sm' : msg.isError ? 'bg-red-50 text-red-700 rounded-2xl rounded-tl-sm border border-red-100' : 'bg-white text-slate-700 rounded-2xl rounded-tl-sm border border-slate-200 shadow-sm'}`}>{msg.text}</div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="w-6 h-6 rounded-lg bg-blue-100 flex items-center justify-center mr-2 mt-1 shrink-0"><span className="material-symbols-outlined text-blue-600" style={{fontSize:'14px'}}>auto_awesome</span></div>
                <div className="bg-white px-4 py-3 rounded-2xl rounded-tl-sm border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-2"><div className="flex gap-1"><span className="typing-dot w-1.5 h-1.5 bg-slate-400 rounded-full" /><span className="typing-dot w-1.5 h-1.5 bg-slate-400 rounded-full" /><span className="typing-dot w-1.5 h-1.5 bg-slate-400 rounded-full" /></div><span className="text-[10px] text-slate-500 font-bold ml-1">AI is thinking…</span></div>
                </div>
              </div>
            )}
            {isGuestLimitReached && (
              <div className="mx-auto my-2">
                <div className="bg-amber-50 rounded-xl p-5 border border-amber-200 text-center space-y-3">
                  <div className="w-10 h-10 mx-auto bg-white rounded-xl flex items-center justify-center shadow-sm"><span className="material-symbols-outlined text-amber-500">lock</span></div>
                  <p className="text-sm font-bold text-slate-800">You've used your {GUEST_MESSAGE_LIMIT} free messages!</p>
                  <p className="text-xs text-slate-600 font-medium leading-relaxed">Sign up to continue chatting with our AI assistant and unlock full features.</p>
                  <div className="flex gap-2 justify-center pt-2">
                    <button onClick={() => { setIsOpen(false); navigate('/auth'); }} className="px-4 py-2 bg-[#0f172a] text-white text-xs font-bold rounded-lg hover:bg-slate-800 transition-colors shadow-sm">Sign Up Free</button>
                    <button onClick={() => { setIsOpen(false); navigate('/auth'); }} className="px-4 py-2 bg-white text-slate-700 text-xs font-bold rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors shadow-sm">Sign In</button>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-3 bg-white border-t border-slate-200">
            {isGuestLimitReached ? (
              <div className="text-center py-2"><p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Chat limit reached — please sign in</p></div>
            ) : (
              <div className="flex gap-2 items-center">
                <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleSend()} placeholder="Ask about MBBS in Russia..." className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-[13px] font-medium outline-none focus:ring-1 focus:ring-[#0f172a] focus:border-[#0f172a] text-slate-800 placeholder:text-slate-400 transition-all" />
                <button onClick={handleSend} disabled={!input.trim() || isTyping} className="w-12 h-12 bg-[#fbbf24] text-amber-950 rounded-xl flex items-center justify-center font-bold hover:bg-[#f59e0b] shadow-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                  <span className="material-symbols-outlined text-[20px]">send</span>
                </button>
              </div>
            )}
            {!isAuthenticated && !isGuestLimitReached && <p className="text-[10px] text-slate-400 text-center mt-2 font-bold tracking-wide">{GUEST_MESSAGE_LIMIT - guestMessageCount} free message{GUEST_MESSAGE_LIMIT - guestMessageCount !== 1 ? 's' : ''} remaining</p>}
          </div>
        </div>
      )}

      <button ref={fabRef} onMouseDown={onMouseDown} onTouchStart={onTouchStart} onClick={handleFabClick} style={{ position: 'fixed', left: fabPosition.x, top: fabPosition.y, zIndex: 60 }} className={`fab-draggable w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center text-white shadow-xl transition-all duration-300 group ${isOpen ? 'bg-slate-900 rotate-0 scale-95' : 'bg-[#0f172a] hover:scale-105'}`}>
        <span className="material-symbols-outlined text-[24px] md:text-[28px]">{isOpen ? 'close' : 'chat'}</span>
        {!isOpen && <span className="absolute 0 right-0 w-4 h-4 bg-red-500 border-2 border-white rounded-full flex items-center justify-center shadow-sm"><span className="w-1.5 h-1.5 bg-white rounded-full animate-ping" /></span>}
      </button>
    </>
  );
};
