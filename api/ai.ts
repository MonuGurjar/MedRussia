
export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method Not Allowed' });
  }

  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    return response.status(500).json({ error: 'Server Error: GROQ_API_KEY is not configured.' });
  }

  try {
    const { messages, model, jsonMode, temperature } = request.body;

    const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messages,
        model: model || "llama-3.3-70b-versatile",
        response_format: jsonMode ? { type: "json_object" } : undefined,
        temperature: temperature || 0.7
      })
    });

    if (!groqResponse.ok) {
        const errorText = await groqResponse.text();
        return response.status(groqResponse.status).json({ error: errorText });
    }

    const data = await groqResponse.json();
    return response.status(200).json(data);

  } catch (error) {
    console.error('AI Proxy Error:', error);
    return response.status(500).json({ error: error.message });
  }
}
