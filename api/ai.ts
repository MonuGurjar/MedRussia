
import { checkRateLimit } from './security/rateLimit';
import { createAuditLog } from './models/auditLog';
import { requireAuth } from './security/auth';
import { getClientIp, getUserAgent } from './lib/request';

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method Not Allowed' });
  }

  const auth = await requireAuth(request, response);
  if (!auth) return;

  const ip = getClientIp(request);
  const userAgent = getUserAgent(request);

  const limiter = await checkRateLimit(auth.userId || ip, 'ai');
  if (!limiter.allowed) {
    await createAuditLog({
      userId: auth.userId,
      userRole: auth.role,
      action: 'AI_CHAT_REQUEST',
      entityType: 'ai',
      entityId: 'chat-completions',
      description: 'AI request blocked by rate limiter',
      ip,
      userAgent,
      status: 'failed',
    });

    return response
      .status(429)
      .setHeader('Retry-After', String(limiter.retryAfterSeconds))
      .json({ error: 'Too many AI requests' });
  }

  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    return response.status(500).json({ error: 'Server Error: GROQ_API_KEY is not configured.' });
  }

  try {
    const { messages, model, jsonMode, temperature } = request.body;

    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages,
        model: model || 'llama-3.3-70b-versatile',
        response_format: jsonMode ? { type: 'json_object' } : undefined,
        temperature: temperature || 0.7,
      }),
    });

    if (!groqResponse.ok) {
      const errorText = await groqResponse.text();

      await createAuditLog({
        userId: auth.userId,
        userRole: auth.role,
        action: 'AI_CHAT_REQUEST',
        entityType: 'ai',
        entityId: 'chat-completions',
        description: `AI provider error: ${errorText.slice(0, 500)}`,
        ip,
        userAgent,
        status: 'failed',
      });

      return response.status(groqResponse.status).json({ error: errorText });
    }

    const data = await groqResponse.json();

    await createAuditLog({
      userId: auth.userId,
      userRole: auth.role,
      action: 'AI_CHAT_REQUEST',
      entityType: 'ai',
      entityId: 'chat-completions',
      description: 'AI request completed successfully',
      ip,
      userAgent,
      status: 'success',
    });

    return response.status(200).json(data);
  } catch (error) {
    await createAuditLog({
      userId: auth.userId,
      userRole: auth.role,
      action: 'AI_CHAT_REQUEST',
      entityType: 'ai',
      entityId: 'chat-completions',
      description: `AI proxy exception: ${error.message || 'unknown'}`,
      ip,
      userAgent,
      status: 'failed',
    });

    return response.status(500).json({ error: error.message });
  }
}
