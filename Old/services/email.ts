
export interface EmailTemplateParams {
    student_name: string;
    student_email: string;
    counsellor_name: string;
    reply_message: string;
    university_name?: string;
    neet_score?: string;
    pcb_percentage?: string;
    student_description?: string;
}

export const sendReplyNotification = async (params: EmailTemplateParams): Promise<boolean> => {
  try {
    const response = await fetch('/api/email', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(params)
    });

    if (response.ok) {
        return true;
    } else {
        const data = await response.json();
        console.error("Email API Error:", data.error);
        return false;
    }
  } catch (error) {
    console.error("Email send network failed:", error);
    return false;
  }
};

export const sendDirectEmail = async (
    toEmail: string,
    studentName: string,
    message: string,
    counsellorName: string = "MedRussia Team",
    extras?: {
        university_name?: string;
        neet_score?: string;
        pcb_percentage?: string;
        student_description?: string;
    }
): Promise<boolean> => {
    return sendReplyNotification({
        student_name: studentName,
        student_email: toEmail,
        counsellor_name: counsellorName,
        reply_message: message,
        university_name: extras?.university_name || '',
        neet_score: extras?.neet_score || 'N/A',
        pcb_percentage: extras?.pcb_percentage || 'N/A',
        student_description: extras?.student_description || 'Direct Communication'
    });
};

export const sendTestEmail = async (toEmail: string): Promise<boolean> => {
    return sendReplyNotification({
        student_name: "Test User",
        student_email: toEmail,
        counsellor_name: "System Admin",
        reply_message: "This is a test message from MedRussia Admin Dashboard. All variables should populate if configured.",
        university_name: "Moscow State Medical University",
        neet_score: "450",
        pcb_percentage: "85",
        student_description: "Student is inquiring about admission fees."
    });
};
