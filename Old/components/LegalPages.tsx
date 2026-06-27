
import React from 'react';
import { Shield, FileText, AlertCircle, X } from 'lucide-react';

export type LegalPageType = 'privacy' | 'terms' | 'disclaimer';

interface LegalModalProps {
  page: LegalPageType;
  onClose: () => void;
}

export const LegalModal: React.FC<LegalModalProps> = ({ page, onClose }) => {
  const renderContent = () => {
    switch (page) {
      case 'privacy':
        return (
          <>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl text-blue-600 dark:text-blue-400">
                <Shield size={24} />
              </div>
              <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white">Privacy Policy</h1>
            </div>
            <div className="prose dark:prose-invert max-w-none text-slate-600 dark:text-slate-300 text-sm leading-relaxed space-y-4">
              <p><strong>Last Updated: {new Date().getFullYear()}</strong></p>
              <p>At MedRussia, we value your trust and are committed to protecting your personal information. This Privacy Policy outlines how we collect, use, and safeguard your data.</p>

              <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-6">1. Information We Collect</h3>
              <p>We collect information you provide directly to us, such as when you fill out an inquiry form, create an account, or communicate with us via WhatsApp. This includes:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Name, email address, and phone number.</li>
                <li>Academic details (NEET score, current education level).</li>
                <li>Preferences for universities and budget.</li>
              </ul>

              <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-6">2. How We Use Your Information</h3>
              <p>We use your data to:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Provide personalized counseling for MBBS admission in Russia.</li>
                <li>Connect you with university representatives (with your consent).</li>
                <li>Send updates regarding admission deadlines and requirements.</li>
              </ul>

              <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-6">3. Data Security</h3>
              <p>We implement industry-standard security measures to protect your data. However, no method of transmission over the internet is 100% secure.</p>

              <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-6">4. Third-Party Sharing</h3>
              <p>We do not sell or rent your personal data. Information may be shared with partner universities only with your explicit consent and solely for the purpose of processing your application.</p>

              <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-6">5. Your Rights</h3>
              <p>You have the right to access, correct, or delete your personal data at any time by contacting our support team. You may also opt out of marketing communications.</p>

              <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-6">6. Cookies & Analytics</h3>
              <p>Our website uses cookies and analytics tools to improve your browsing experience. You can manage cookie preferences in your browser settings.</p>
            </div>
          </>
        );
      case 'terms':
        return (
          <>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl text-indigo-600 dark:text-indigo-400">
                <FileText size={24} />
              </div>
              <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white">Terms & Conditions</h1>
            </div>
            <div className="prose dark:prose-invert max-w-none text-slate-600 dark:text-slate-300 text-sm leading-relaxed space-y-4">
              <p><strong>Welcome to MedRussia.</strong> By accessing our website and services, you agree to be bound by the following terms and conditions.</p>

              <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-6">1. Services Provided</h3>
              <p>MedRussia acts as an educational consultancy platform connecting Indian students with medical universities in Russia. We provide guidance, information, and application assistance.</p>

              <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-6">2. Accuracy of Information</h3>
              <p>While we strive to provide accurate and up-to-date information regarding fees, rankings, and admission criteria, university policies may change without notice. MedRussia is not liable for discrepancies in third-party data.</p>

              <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-6">3. Admission Decisions</h3>
              <p>Final admission decisions rest solely with the respective university authorities. MedRussia cannot guarantee admission.</p>

              <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-6">4. Payment & Refund Policy</h3>
              <p>All fees quoted are subject to change based on university policies and currency fluctuations. Refund eligibility depends on the university's refund policy and the stage of application processing.</p>

              <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-6">5. User Conduct</h3>
              <p>Users agree to provide accurate information and not to misuse the platform. Any fraudulent activity will result in immediate account termination.</p>

              <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-6">6. Limitation of Liability</h3>
              <p>MedRussia shall not be liable for any indirect, incidental, or consequential damages arising from the use of our services or reliance on the information provided.</p>
            </div>
          </>
        );
      case 'disclaimer':
        return (
          <>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-xl text-orange-600 dark:text-orange-400">
                <AlertCircle size={24} />
              </div>
              <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white">Disclaimer</h1>
            </div>
            <div className="prose dark:prose-invert max-w-none text-slate-600 dark:text-slate-300 text-sm leading-relaxed space-y-4">
              <p>The information provided on MedRussia is for general informational purposes only. All information on the site is provided in good faith, however, we make no representation or warranty of any kind, express or implied, regarding the accuracy, adequacy, validity, reliability, availability, or completeness of any information on the site.</p>

              <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-6">Not an Official Government Entity</h3>
              <p>MedRussia is a private consultancy and is not affiliated with the Government of India, the National Medical Commission (NMC), or the Russian Ministry of Health unless explicitly stated.</p>

              <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-6">Financial Advice</h3>
              <p>Currency exchange rates and tuition fees are subject to market fluctuations. Students are advised to verify official fees directly with the university before making payments.</p>

              <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-6">External Links</h3>
              <p>Our website may contain links to third-party websites. MedRussia is not responsible for the content, privacy policies, or practices of any third-party sites.</p>

              <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-6">Medical Information</h3>
              <p>Any medical education information provided is for guidance only and does not constitute professional medical or legal advice. Students should independently verify all claims with the relevant authorities.</p>
            </div>
          </>
        );
      default:
        return <div>Page not found</div>;
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative w-full max-w-2xl max-h-[85vh] bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300 flex flex-col">
        {/* Header Bar */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${page === 'privacy' ? 'bg-blue-500' : page === 'terms' ? 'bg-indigo-500' : 'bg-orange-500'
              }`} />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              {page === 'privacy' ? 'Privacy Policy' : page === 'terms' ? 'Terms & Conditions' : 'Disclaimer'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white transition-all"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto p-6 md:p-8 chat-scrollbar">
          {renderContent()}

          <div className="mt-10 pt-6 border-t border-slate-100 dark:border-slate-700 text-center">
            <p className="text-xs text-slate-400">
              For any legal queries, please contact us at <span className="font-bold text-slate-600 dark:text-slate-300">legal@medrussia.com</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
