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

export async function askAiCounselor(prompt: string, history: { role: 'user' | 'model'; text: string }[] = []): Promise<string> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.GEMINI_API_KEY || '';

  const messages = [
    { role: 'system', content: SYSTEM_INSTRUCTION },
    ...history.map(h => ({
      role: h.role === 'model' ? 'assistant' : 'user',
      content: h.text
    })),
    { role: 'user', content: prompt }
  ];

  try {
    if (apiKey && apiKey.trim() !== '') {
      // Direct Gemini REST API fetch call
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: messages.filter(m => m.role !== 'system').map(m => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }]
          })),
          systemInstruction: {
            parts: [{ text: SYSTEM_INSTRUCTION }]
          }
        })
      });

      if (res.ok) {
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) return text;
      }
    }

    // Fallback: Internal AI endpoint / API proxy
    const response = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages,
        model: 'gemini-1.5-flash',
        systemInstruction: SYSTEM_INSTRUCTION
      })
    });

    if (response.ok) {
      const data = await response.json();
      return data.choices?.[0]?.message?.content || data.result || "I am available to answer your questions regarding MBBS in Russia!";
    }
  } catch (error) {
    console.error('Gemini AI counselor error:', error);
  }

  return "MedRussia Senior Counselor Desk is available. Contact Amit Gurjar (+91 73750 17401) for immediate assistance.";
}

export const askGeminiAI = (prompt: string, customInstruction?: string) => askAiCounselor(prompt, []);

