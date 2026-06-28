import { Resend } from 'resend';
import { strictLimiter, checkRateLimit } from './ratelimit';
import { withAuth, AuthUser } from '../src/lib/apiAuth';

function escapeHtml(unsafe: string) {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function emailHandler(request: any, response: any, user: AuthUser) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method Not Allowed' });
  }

  const rateLimitResult = await checkRateLimit(request, strictLimiter);
  if (!rateLimitResult.success) {
    return response.status(429).json({ error: 'Too many requests, please try again later.' });
  }

  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    return response.status(500).json({ error: 'Email configuration missing on server' });
  }

  const resend = new Resend(apiKey);
  
  if (user.role !== 'admin') {
    return response.status(403).json({ error: 'Admin access required' });
  }

  const { 
    student_name, 
    student_email, 
    counsellor_name, 
    university_name,
    neet_score,
    pcb_percentage,
    student_description,
    reply_message,
    to_email,
    subject
  } = request.body;

  const targetEmail = student_email || to_email;

  if (!targetEmail || !reply_message) {
    return response.status(400).json({ error: 'Missing required fields' });
  }

  // Sanitize user inputs to prevent HTML injection
  const safeStudentName = escapeHtml(student_name || 'Student');
  const safeReplyMessage = escapeHtml(reply_message).replace(/\n/g, '<br>');
  const safeCounsellorName = escapeHtml(counsellor_name || 'MedRussia Admissions');
  const safeUniversityName = escapeHtml(university_name || '');
  const safeStudentDescription = escapeHtml(student_description || '');

  try {
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #0f172a;">Hello ${safeStudentName},</h2>
        <div style="color: #334155; line-height: 1.6; font-size: 16px;">
          <p>${safeReplyMessage}</p>
        </div>
        ${safeUniversityName ? `<p>Regarding University: ${safeUniversityName}</p>` : ''}
        ${neet_score && neet_score !== 'N/A' ? `<p>NEET Score: ${escapeHtml(neet_score)}</p>` : ''}
        ${pcb_percentage && pcb_percentage !== 'N/A' ? `<p>PCB Percentage: ${escapeHtml(pcb_percentage)}</p>` : ''}
        ${safeStudentDescription ? `<p>Details: ${safeStudentDescription}</p>` : ''}
        <div style="margin-top: 40px; color: #64748b; font-size: 14px; border-top: 1px solid #e2e8f0; padding-top: 20px;">
          <p>Best regards,<br/><strong>${safeCounsellorName}</strong><br/>MedRussia Admissions Team</p>
        </div>
      </div>
    `;

    const { data, error } = await resend.emails.send({
      from: 'MedRussia <admissions@medrussia.in>',
      to: [targetEmail],
      subject: subject || 'Message from MedRussia',
      html: htmlContent,
    });

    if (error) {
      return response.status(400).json({ error });
    }

    return response.status(200).json({ success: true, data });

  } catch (error: any) {
    console.error('Email API Error:', error);
    return response.status(500).json({ error: 'Internal server error' });
  }
}

export default withAuth(emailHandler);
