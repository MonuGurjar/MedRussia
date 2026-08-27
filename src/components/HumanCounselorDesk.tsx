import React, { useState } from 'react';

export const HumanCounselorDesk: React.FC = () => {
  const counselorPhone = import.meta.env.VITE_COUNSELOR_PHONE || '+917375017401';
  const counselorWhatsapp = import.meta.env.VITE_COUNSELOR_WHATSAPP || 'https://wa.me/917375017401';

  const [messages, setMessages] = useState([
    { id: '1', sender: 'counselor', text: 'Hello! I am Amit Gurjar, Senior Admissions Counselor at MedRussia. How can I assist you with your MBBS admission in Russia today?' }
  ]);
  const [input, setInput] = useState('');
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingConfirmed, setBookingConfirmed] = useState(false);
  const [studentName, setStudentName] = useState('');
  const [studentPhone, setStudentPhone] = useState('');
  const [timeSlot, setTimeSlot] = useState('Within 30 Minutes');

  const sendMessage = () => {
    if (!input.trim()) return;
    const userMsg = { id: Date.now().toString(), sender: 'user', text: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');

    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'counselor',
          text: 'Thank you for your message! Direct seat reservation for September 2026 intake is currently active. Would you like to reserve your seat or schedule a 1-on-1 consultation call?'
        }
      ]);
    }, 1000);
  };

  const handleBookCall = (e: React.FormEvent) => {
    e.preventDefault();
    setBookingConfirmed(true);
    setTimeout(() => {
      setShowBookingModal(false);
      setBookingConfirmed(false);
    }, 2000);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 font-sans">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden flex flex-col h-[650px]">
        {/* Header */}
        <div className="bg-slate-950 text-white p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-11 h-11 rounded-full bg-amber-500 flex items-center justify-center font-black text-slate-950 text-base shadow-sm">
                AG
              </div>
              <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-slate-950" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-white">Amit Gurjar</h3>
              <p className="text-[11px] text-slate-400 font-medium">Senior Admissions Consultant • MBBS in Russia</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={`tel:${counselorPhone}`}
              className="px-3.5 py-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors border border-slate-700"
            >
              <span className="material-symbols-outlined text-[16px] text-emerald-400">call</span>
              Call Desk
            </a>
            <a
              href={counselorWhatsapp}
              target="_blank"
              rel="noreferrer"
              className="px-3.5 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">chat</span>
              WhatsApp
            </a>
            <button
              onClick={() => setShowBookingModal(true)}
              className="px-3.5 py-1.5 rounded-full bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold transition-colors shadow-sm"
            >
              Book Call
            </button>
          </div>
        </div>

        {/* Chat Thread */}
        <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-slate-50">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[75%] p-3.5 rounded-2xl text-xs leading-relaxed font-medium ${
                  m.sender === 'user'
                    ? 'bg-slate-900 text-white rounded-br-none shadow-xs'
                    : 'bg-white text-slate-900 border border-slate-200 rounded-bl-none shadow-xs'
                }`}
              >
                {m.text}
              </div>
            </div>
          ))}
        </div>

        {/* Composer */}
        <div className="p-4 bg-white border-t border-slate-100 flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Ask counselor about admissions, visa, fees..."
            className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-900"
          />
          <button
            onClick={sendMessage}
            className="p-3 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl shadow-md transition-colors flex items-center justify-center font-bold"
          >
            <span className="material-symbols-outlined text-[18px]">send</span>
          </button>
        </div>
      </div>

      {/* Consultation Booking Modal */}
      {showBookingModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setShowBookingModal(false)}
              className="absolute top-5 right-5 w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-900"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>

            <h3 className="text-lg font-black text-slate-900 mb-1">Book 1-on-1 Call with Senior Consultant</h3>
            <p className="text-xs text-slate-500 font-medium mb-5">Amit Gurjar (+91 73750 17401) will call you at your chosen time.</p>

            {bookingConfirmed ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-2">
                <span className="material-symbols-outlined text-emerald-600 text-[36px]">check_circle</span>
                <p className="text-sm font-extrabold text-slate-900">Consultation Call Requested!</p>
                <p className="text-xs text-slate-600">Our Senior Admissions Counselor will call you at {timeSlot}.</p>
              </div>
            ) : (
              <form onSubmit={handleBookCall} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-900 mb-1">Student / Parent Name</label>
                  <input
                    type="text"
                    required
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-900 mb-1">Phone Number (WhatsApp)</label>
                  <input
                    type="tel"
                    required
                    value={studentPhone}
                    onChange={(e) => setStudentPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-900 mb-1">Preferred Time Slot</label>
                  <select
                    value={timeSlot}
                    onChange={(e) => setTimeSlot(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                  >
                    <option value="Within 30 Minutes">Within 30 Minutes (Urgent)</option>
                    <option value="Afternoon (2PM - 5PM)">Afternoon (2PM - 5PM)</option>
                    <option value="Evening (6PM - 9PM)">Evening (6PM - 9PM)</option>
                    <option value="Tomorrow Morning">Tomorrow Morning (10AM - 1PM)</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-extrabold py-3 rounded-xl shadow-md transition-all text-xs uppercase tracking-wider mt-2"
                >
                  Confirm Free Call Booking →
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
