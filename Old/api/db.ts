
export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method Not Allowed' });
  }

  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;

  if (!url || !token) {
    return response.status(500).json({ error: 'Database configuration missing on server' });
  }

  try {
    const { command, args } = request.body;

    if (!command) {
        return response.status(400).json({ error: 'Command is required' });
    }

    // Proxy request to Upstash REST API
    const upstashResponse = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      // Upstash expects an array: ["COMMAND", "arg1", "arg2"...]
      body: JSON.stringify([command, ...(args || [])]),
    });

    if (!upstashResponse.ok) {
        const text = await upstashResponse.text();
        return response.status(upstashResponse.status).json({ error: text });
    }

    const data = await upstashResponse.json();
    return response.status(200).json(data);

  } catch (error) {
    console.error('DB Proxy Error:', error);
    return response.status(500).json({ error: error.message });
  }
}
