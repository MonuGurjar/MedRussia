
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSettings } from '../services/settings';
import { AppSettings, ChatSession } from '../types';
import { getChatResponse } from '../services/gemini';
import { logChatSession } from '../services/db';

interface Message {
  id: number;
  text: string;
  sender: 'user' | 'bot';
  isError?: boolean;
}

interface ChatWidgetProps {
  isLifted?: boolean;
}

const GUEST_MESSAGE_LIMIT = 5;
const FAB_POSITION_KEY = 'mr_chat_fab_pos';
const GUEST_MSG_COUNT_KEY = 'mr_guest_msg_count';

// SVG Icons
const SparkleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path fillRule="evenodd" d="M9 4.5a.75.75 0 01.721.544l.813 2.846a3.75 3.75 0 002.576 2.576l2.846.813a.75.75 0 010 1.442l-2.846.813a3.75 3.75 0 00-2.576 2.576l-.813 2.846a.75.75 0 01-1.442 0l-.813-2.846a3.75 3.75 0 00-2.576-2.576l-2.846-.813a.75.75 0 010-1.442l2.846-.813A3.75 3.75 0 007.466 7.89l.813-2.846A.75.75 0 019 4.5zM18 1.5a.48.48 0 01.463.349l.465 1.628a2.4 2.4 0 001.595 1.595l1.628.465a.48.48 0 010 .926l-1.628.465a2.4 2.4 0 00-1.595 1.595l-.465 1.628a.48.48 0 01-.926 0l-.465-1.628a2.4 2.4 0 00-1.595-1.595l-1.628-.465a.48.48 0 010-.926l1.628-.465a2.4 2.4 0 001.595-1.595l.465-1.628A.48.48 0 0118 1.5z" clipRule="evenodd" />
  </svg>
);

const SendIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
    <path d="M3.478 2.404a.75.75 0 00-.926.941l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.404z" />
  </svg>
);

const ChatIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7">
    <path fillRule="evenodd" d="M4.848 2.771A49.144 49.144 0 0112 2.25c2.43 0 4.817.178 7.152.52 1.978.292 3.348 2.024 3.348 3.97v6.02c0 1.946-1.37 3.678-3.348 3.97a48.901 48.901 0 01-3.476.383.39.39 0 00-.297.17l-2.755 4.133a.75.75 0 01-1.248 0l-2.755-4.133a.39.39 0 00-.297-.17 48.9 48.9 0 01-3.476-.384c-1.978-.29-3.348-2.024-3.348-3.97V6.741c0-1.946 1.37-3.68 3.348-3.97zM6.75 8.25a.75.75 0 01.75-.75h9a.75.75 0 010 1.5h-9a.75.75 0 01-.75-.75zm.75 2.25a.75.75 0 000 1.5H12a.75.75 0 000-1.5H7.5z" clipRule="evenodd" />
  </svg>
);

const CloseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
    <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z" clipRule="evenodd" />
  </svg>
);

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

  // Session tracking
  const sessionIdRef = useRef<string>('');
  const sessionStartTimeRef = useRef<number>(0);

  // Draggable FAB state
  const [fabPosition, setFabPosition] = useState<{ x: number; y: number }>(() => {
    try {
      const saved = localStorage.getItem(FAB_POSITION_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return { x: window.innerWidth - 80, y: window.innerHeight - 100 };
  });
  const isDragging = useRef(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const fabStartPos = useRef({ x: 0, y: 0 });
  const dragMoved = useRef(false);
  const fabRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // Check auth
    try {
      const storedUser = localStorage.getItem('mr_active_user');
      if (storedUser) setIsAuthenticated(true);
    } catch (e) {}

    // Restore guest msg count
    try {
      const count = sessionStorage.getItem(GUEST_MSG_COUNT_KEY);
      if (count) setGuestMessageCount(parseInt(count, 10));
    } catch (e) {}

    // Initialize Session ID
    if (!sessionIdRef.current) {
      const existingId = sessionStorage.getItem('mr_chat_session_id');
      if (existingId) {
        sessionIdRef.current = existingId;
      } else {
        sessionIdRef.current = Math.random().toString(36).substr(2, 9);
        sessionStorage.setItem('mr_chat_session_id', sessionIdRef.current);
      }
      sessionStartTimeRef.current = Date.now();
    }

    getSettings().then(data => {
      setSettings(data);
      if (data.chatBot?.welcomeMessage && messages.length === 0) {
        setMessages([{ id: 0, text: data.chatBot.welcomeMessage, sender: 'bot' }]);
      }
    });
  }, []);

  // Persist chat logs on message change
  useEffect(() => {
    const hasUserMessage = messages.some(m => m.sender === 'user');
    if (hasUserMessage) saveSessionToDB();
  }, [messages]);

  // Save FAB position to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(FAB_POSITION_KEY, JSON.stringify(fabPosition));
    } catch (e) {}
  }, [fabPosition]);

  // ---- Drag logic ----
  const constrainPosition = useCallback((x: number, y: number) => {
    const fabSize = 56;
    return {
      x: Math.max(8, Math.min(x, window.innerWidth - fabSize - 8)),
      y: Math.max(8, Math.min(y, window.innerHeight - fabSize - 8)),
    };
  }, []);

  const handleDragStart = useCallback((clientX: number, clientY: number) => {
    isDragging.current = true;
    dragMoved.current = false;
    dragStartPos.current = { x: clientX, y: clientY };
    fabStartPos.current = { ...fabPosition };
  }, [fabPosition]);

  const handleDragMove = useCallback((clientX: number, clientY: number) => {
    if (!isDragging.current) return;
    const dx = clientX - dragStartPos.current.x;
    const dy = clientY - dragStartPos.current.y;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dragMoved.current = true;
    const newPos = constrainPosition(fabStartPos.current.x + dx, fabStartPos.current.y + dy);
    setFabPosition(newPos);
  }, [constrainPosition]);

  const handleDragEnd = useCallback(() => {
    isDragging.current = false;
  }, []);

  // Mouse events
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    handleDragStart(e.clientX, e.clientY);
  }, [handleDragStart]);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => handleDragMove(e.clientX, e.clientY);
    const onMouseUp = () => handleDragEnd();
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [handleDragMove, handleDragEnd]);

  // Touch events
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    handleDragStart(touch.clientX, touch.clientY);
  }, [handleDragStart]);

  useEffect(() => {
    const onTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      handleDragMove(touch.clientX, touch.clientY);
    };
    const onTouchEnd = () => handleDragEnd();
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);
    return () => {
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [handleDragMove, handleDragEnd]);

  // Reposition on resize
  useEffect(() => {
    const onResize = () => {
      setFabPosition(prev => constrainPosition(prev.x, prev.y));
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [constrainPosition]);

  const saveSessionToDB = async () => {
    const chatMessages = messages.map(m => ({
      role: m.sender === 'user' ? 'user' : 'model' as 'user' | 'model',
      text: m.text,
      timestamp: m.id
    }));

    let userDetails: any = {};
    try {
      const storedUser = localStorage.getItem('mr_active_user');
      if (storedUser) {
        const u = JSON.parse(storedUser);
        userDetails = { userId: u.id, visitorName: u.name };
      }
    } catch (e) {}

    const session: ChatSession = {
      id: sessionIdRef.current,
      startTime: sessionStartTimeRef.current,
      lastMessageTime: Date.now(),
      messages: chatMessages,
      messageCount: chatMessages.length,
      userId: userDetails.userId,
      visitorName: userDetails.visitorName || `Visitor-${sessionIdRef.current.substring(0, 4)}`
    };

    await logChatSession(session);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const isGuestLimitReached = !isAuthenticated && guestMessageCount >= GUEST_MESSAGE_LIMIT;

  const handleSend = async () => {
    if (!input.trim()) return;
    if (isGuestLimitReached) return;

    // Increment guest counter
    if (!isAuthenticated) {
      const newCount = guestMessageCount + 1;
      setGuestMessageCount(newCount);
      sessionStorage.setItem(GUEST_MSG_COUNT_KEY, String(newCount));
    }

    const userMsg: Message = { id: Date.now(), text: input, sender: 'user' };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      const history = messages
        .filter(m => !m.isError)
        .map(m => ({
          role: m.sender === 'user' ? 'user' : 'model' as 'user' | 'model',
          text: m.text
        }));

      const responseText = await getChatResponse(userMsg.text, history);
      setMessages(prev => [...prev, { id: Date.now() + 1, text: responseText, sender: 'bot' }]);
    } catch (e) {
      console.error("Chat Error", e);
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        text: "Sorry, I encountered an error. Please try again.",
        sender: 'bot',
        isError: true
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleFabClick = () => {
    if (!dragMoved.current) {
      setIsOpen(!isOpen);
    }
  };

  if (!settings?.chatBot?.enabled) return null;

  // Calculate chat window position relative to FAB
  const chatWindowStyle: React.CSSProperties = {
    position: 'fixed',
    zIndex: 61,
  };
  const fabCenterX = fabPosition.x + 28;
  const fabCenterY = fabPosition.y;
  // Try to open above the FAB; if too close to top, open below
  const chatHeight = 460;
  const chatWidth = 380;
  if (fabCenterY > chatHeight + 40) {
    chatWindowStyle.bottom = window.innerHeight - fabPosition.y + 16;
  } else {
    chatWindowStyle.top = fabPosition.y + 72;
  }
  // Align horizontally
  if (fabCenterX > chatWidth) {
    chatWindowStyle.right = window.innerWidth - fabPosition.x - 56;
  } else {
    chatWindowStyle.left = fabPosition.x;
  }

  return (
    <>
      {/* Chat Window */}
      {isOpen && (
        <div
          style={chatWindowStyle}
          className="w-[340px] md:w-[380px] bg-white dark:bg-slate-800 rounded-3xl shadow-2xl shadow-indigo-500/10 dark:shadow-black/30 border border-slate-200/60 dark:border-slate-700/60 overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300 flex flex-col"
        >
          {/* Header — Gradient + Glassmorphism */}
          <div className="relative bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 p-4 flex justify-between items-center overflow-hidden">
            <div className="absolute inset-0 bg-white/5 backdrop-blur-sm" />
            <div className="relative flex items-center gap-3 z-10">
              <div className="w-10 h-10 bg-white/15 backdrop-blur-md rounded-2xl flex items-center justify-center text-white border border-white/20 shadow-inner">
                <SparkleIcon />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm tracking-tight">{settings.chatBot.botName}</h3>
                <p className="text-[10px] text-white/70 font-semibold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                  Powered by AI
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="relative z-10 w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white flex items-center justify-center transition-all"
            >
              <CloseIcon />
            </button>
          </div>

          {/* Messages Area */}
          <div className="h-[300px] overflow-y-auto p-4 space-y-3 bg-slate-50/80 dark:bg-slate-900/60 chat-scrollbar">
            {messages.map((msg, index) => (
              <div
                key={msg.id}
                className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} chat-msg-enter`}
                style={{ animationDelay: `${Math.min(index * 0.05, 0.3)}s` }}
              >
                {msg.sender === 'bot' && (
                  <div className="w-6 h-6 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center mr-2 mt-1 shrink-0">
                    <SparkleIcon />
                  </div>
                )}
                <div className={`max-w-[75%] px-3.5 py-2.5 text-[13px] font-medium leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-gradient-to-br from-indigo-500 to-violet-600 text-white rounded-2xl rounded-tr-md shadow-md shadow-indigo-200/40 dark:shadow-none'
                    : msg.isError
                      ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-800/30 rounded-2xl rounded-tl-md'
                      : 'bg-white dark:bg-slate-700/80 text-slate-700 dark:text-slate-200 rounded-2xl rounded-tl-md border border-slate-100 dark:border-slate-600/50 shadow-sm'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}

            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex justify-start chat-msg-enter">
                <div className="w-6 h-6 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center mr-2 mt-1 shrink-0">
                  <SparkleIcon />
                </div>
                <div className="bg-white dark:bg-slate-700/80 px-4 py-3 rounded-2xl rounded-tl-md border border-slate-100 dark:border-slate-600/50 shadow-sm">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <span className="typing-dot w-1.5 h-1.5 bg-indigo-400 rounded-full" />
                      <span className="typing-dot w-1.5 h-1.5 bg-indigo-400 rounded-full" />
                      <span className="typing-dot w-1.5 h-1.5 bg-indigo-400 rounded-full" />
                    </div>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium ml-1">AI is thinking…</span>
                  </div>
                </div>
              </div>
            )}

            {/* Guest Limit Reached */}
            {isGuestLimitReached && (
              <div className="chat-msg-enter mx-auto my-2">
                <div className="bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-900/30 dark:to-violet-900/30 rounded-2xl p-4 border border-indigo-100 dark:border-indigo-800/40 text-center space-y-3">
                  <div className="w-10 h-10 mx-auto bg-indigo-100 dark:bg-indigo-800/40 rounded-xl flex items-center justify-center">
                    <span className="text-lg">🔒</span>
                  </div>
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    You've used your {GUEST_MESSAGE_LIMIT} free messages!
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                    Sign up to continue chatting with our AI assistant.
                  </p>
                  <div className="flex gap-2 justify-center pt-1">
                    <button
                      onClick={() => { setIsOpen(false); navigate('/auth'); }}
                      className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-violet-600 text-white text-xs font-bold rounded-xl hover:opacity-90 transition-all shadow-md shadow-indigo-200 dark:shadow-none"
                    >
                      Sign Up Free
                    </button>
                    <button
                      onClick={() => { setIsOpen(false); navigate('/auth'); }}
                      className="px-4 py-2 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 transition-all"
                    >
                      Sign In
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-3 bg-white dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700/50">
            {isGuestLimitReached ? (
              <div className="text-center py-2">
                <p className="text-[11px] text-slate-400 font-medium">Chat limit reached — please sign in to continue</p>
              </div>
            ) : (
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Ask about MBBS in Russia..."
                  className="flex-1 bg-slate-100/80 dark:bg-slate-700/50 border border-slate-200/60 dark:border-slate-600/40 rounded-xl px-4 py-2.5 text-[13px] font-medium outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-300 dark:focus:border-indigo-600 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isTyping}
                  className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-violet-600 text-white rounded-xl flex items-center justify-center hover:shadow-lg hover:shadow-indigo-300/30 dark:hover:shadow-indigo-900/30 hover:-translate-y-0.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none"
                >
                  <SendIcon />
                </button>
              </div>
            )}
            {!isAuthenticated && !isGuestLimitReached && (
              <p className="text-[10px] text-slate-400 dark:text-slate-500 text-center mt-1.5 font-medium">
                {GUEST_MESSAGE_LIMIT - guestMessageCount} free message{GUEST_MESSAGE_LIMIT - guestMessageCount !== 1 ? 's' : ''} remaining
              </p>
            )}
          </div>
        </div>
      )}

      {/* Floating Draggable Button */}
      <button
        ref={fabRef}
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
        onClick={handleFabClick}
        style={{
          position: 'fixed',
          left: fabPosition.x,
          top: fabPosition.y,
          zIndex: 60,
        }}
        className={`fab-draggable w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-2xl transition-all duration-200 group ${
          isOpen
            ? 'bg-slate-800 dark:bg-slate-700 rotate-0 shadow-slate-300/30 dark:shadow-black/30'
            : 'bg-gradient-to-br from-indigo-500 to-violet-600 chat-fab-glow shadow-indigo-300/40 dark:shadow-indigo-900/40'
        }`}
      >
        {isOpen ? <CloseIcon /> : <ChatIcon />}
        {!isOpen && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 border-2 border-white dark:border-slate-900 rounded-full flex items-center justify-center">
            <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
          </span>
        )}
      </button>
    </>
  );
};
