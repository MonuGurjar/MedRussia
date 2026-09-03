import { platformApi } from '../../lib/platformApi';
import { AICounselorRequest, AICounselorResponse } from '../../types/platform';

export const platformAiService = {
  async askCounselor(
    prompt: string,
    chatHistory?: Array<{ role: string; content: string }>,
    targetUniversityId?: string
  ): Promise<AICounselorResponse> {
    const payload: AICounselorRequest = {
      prompt,
      chat_history: chatHistory || null,
      target_university_id: targetUniversityId || null
    };

    return platformApi.request<AICounselorResponse>(
      '/api/v1/ai/counselor',
      {
        method: 'POST',
        body: JSON.stringify(payload)
      },
      false
    );
  }
};
