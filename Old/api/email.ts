
export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method Not Allowed' });
  }

  const { 
    // Preferred standardized variables
    student_name, 
    student_email, 
    counsellor_name, 
    university_name,
    neet_score,
    pcb_percentage,
    student_description,
    reply_message,
    
    // Legacy fallbacks (optional)
    to_email,
    admin_name
  } = request.body;
  
  const serviceId = process.env.EMAILJS_SERVICE_ID;
  const templateId = process.env.EMAILJS_TEMPLATE_ID;
  const publicKey = process.env.EMAILJS_PUBLIC_KEY;
  const privateKey = process.env.EMAILJS_PRIVATE_KEY;

  if (!serviceId || !templateId || !publicKey) {
    return response.status(500).json({ error: 'Email configuration missing on server' });
  }

  try {
    const url = 'https://api.emailjs.com/api/v1.0/email/send';
    
    // Map payload to the consistent variables requested for templates
    const template_params = {
      student_name: student_name || '',
      student_email: student_email || to_email || '',
      counsellor_name: counsellor_name || admin_name || 'MedRussia Team',
      university_name: university_name || '',
      neet_score: neet_score || 'N/A',
      pcb_percentage: pcb_percentage || 'N/A',
      student_description: student_description || '',
      reply_message: reply_message || ''
    };

    const payload = {
      service_id: serviceId,
      template_id: templateId,
      user_id: publicKey,
      accessToken: privateKey,
      template_params: template_params
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || 'EmailJS API Error');
    }

    return response.status(200).json({ success: true });

  } catch (error) {
    console.error('Email Send Error:', error);
    return response.status(500).json({ error: error.message });
  }
}
