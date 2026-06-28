import React from 'react';

export type LegalPageType = 'privacy' | 'terms' | 'disclaimer';

const LEGAL_CONTENT: Record<LegalPageType, { title: string; content: string[] }> = {
  privacy: {
    title: 'Privacy Policy',
    content: [
      'MBBS Russia ("we", "us", "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our platform.',
      'Information We Collect: We may collect personal information that you voluntarily provide, including but not limited to: name, email address, phone number, academic records, and any queries you submit through our forms.',
      'How We Use Your Information: To facilitate your MBBS admission inquiries, to respond to your questions, to improve our platform, and to send you relevant updates about admissions (only with your consent).',
      'Data Storage: Your data is securely stored using industry-standard encryption. We use Upstash (Redis) for cloud data storage and Cloudinary for document uploads.',
      'Third-Party Services: We may use third-party services like EmailJS for email notifications and Groq AI for chatbot functionality. These services have their own privacy policies.',
      'Your Rights: You may request access to, correction of, or deletion of your personal data at any time by contacting us.',
      'Contact: For any privacy-related questions, contact us at support@medrussia.in'
    ]
  },
  terms: {
    title: 'Terms of Service',
    content: [
      'Welcome to MBBS Russia. By accessing or using our platform, you agree to be bound by these Terms of Service.',
      'Platform Purpose: MBBS Russia provides informational and advisory services related to MBBS admissions in Russia. We are not a university, and we do not guarantee admission to any institution.',
      'Accuracy of Information: While we strive to provide accurate and up-to-date information about Russian medical universities, fees, and admission requirements, we cannot guarantee the absolute accuracy of all details. Always verify critical information with the respective universities.',
      'User Accounts: You are responsible for maintaining the confidentiality of your account credentials. You agree to notify us immediately of any unauthorized use of your account.',
      'Acceptable Use: You agree not to misuse the platform, submit false information, or attempt to gain unauthorized access to any part of the system.',
      'Limitation of Liability: MBBS Russia shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of our platform.',
      'Modifications: We reserve the right to modify these terms at any time. Continued use of the platform after modifications constitutes acceptance of the updated terms.'
    ]
  },
  disclaimer: {
    title: 'Disclaimer',
    content: [
      'The information provided on MBBS Russia is for general informational purposes only and should not be construed as professional academic or legal advice.',
      'Fee Information: Tuition fees, hostel fees, and other costs mentioned on our platform are approximate and subject to change based on university policies, exchange rates, and government regulations.',
      'Admission Decisions: We do not make admission decisions. All admission decisions are made by the respective Russian medical universities based on their own criteria.',
      'NEET & NMC Requirements: Students are advised to verify the latest NEET requirements and NMC (National Medical Commission) recognition status of universities independently.',
      'No Guarantees: We do not guarantee admission, visa approval, or any specific outcome related to your medical education journey.',
      'Exchange Rates: Currency conversions displayed on our platform are indicative and may differ from actual bank rates at the time of transaction.',
      'External Links: Our platform may contain links to third-party websites. We are not responsible for the content or privacy practices of those sites.'
    ]
  }
};

export const LegalModal: React.FC<{ page: LegalPageType; onClose: () => void }> = ({ page, onClose }) => {
  const content = LEGAL_CONTENT[page];
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 fade-in-up">
      <div className="bg-surface-container-lowest border border-outline-variant w-full max-w-2xl max-h-[85vh] overflow-y-auto custom-scrollbar rounded-xl shadow-xl">
        <div className="sticky top-0 bg-surface-container-lowest border-b border-outline-variant p-6 flex items-center justify-between z-10">
          <h2 className="text-headline-md text-on-surface">{content.title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-surface-container rounded-full transition-colors"><span className="material-symbols-outlined text-on-surface-variant">close</span></button>
        </div>
        <div className="p-6 space-y-4">
          {content.content.map((paragraph, index) => (
            <p key={index} className="text-body-md text-on-surface-variant leading-relaxed">{paragraph}</p>
          ))}
          <p className="text-label-sm text-outline mt-6 pt-4 border-t border-outline-variant">Last updated: January 2025</p>
        </div>
      </div>
    </div>
  );
};

export const LegalPage: React.FC<{ page: LegalPageType }> = ({ page }) => {
  const content = LEGAL_CONTENT[page];
  return (
    <div className="pt-28 pb-20 max-w-4xl mx-auto px-6 min-h-[60vh]">
      <h1 className="text-4xl font-bold text-slate-900 mb-8">{content.title}</h1>
      <div className="space-y-6">
        {content.content.map((paragraph, index) => (
          <p key={index} className="text-lg text-slate-600 leading-relaxed">{paragraph}</p>
        ))}
        <p className="text-sm text-slate-400 mt-12 pt-6 border-t border-slate-200">Last updated: January 2025</p>
      </div>
    </div>
  );
};
