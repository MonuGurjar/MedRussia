import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { DETAILED_UNIVERSITIES } from '../constants/universities';
import { User } from '../types';

interface AdmissionTrackerProps {
  currentUser?: User | null;
}

interface ApplicationData {
  id: string;
  student_name: string;
  email: string;
  phone: string;
  selected_university_id: string;
  intake_batch: string;
  application_status: string;
  current_step: number;
  total_steps: number;
  created_at: string;
  updated_at: string;
}

const MILESTONES = [
  {
    step: 1,
    key: 'APPLIED',
    title: 'Application Submitted & Registered',
    desc: 'Official candidate dossier created and forwarded to university international admissions office.',
    icon: 'assignment_turned_in'
  },
  {
    step: 2,
    key: 'LETTER_ISSUED',
    title: 'University Provisional Admission Letter Issued',
    desc: 'Official Ministry-accredited Russian medical university admission letter generated.',
    icon: 'mark_email_read'
  },
  {
    step: 3,
    key: 'MINISTRY_INVITATION',
    title: 'Ministry of Internal Affairs (MVD) Visa Invitation',
    desc: 'Electronic study invitation letter sanctioned by Russian Federal Migration Service.',
    icon: 'verified_user'
  },
  {
    step: 4,
    key: 'VISA_STAMPED',
    title: 'Russian Consulate Study Visa Stamped',
    desc: 'Original passport stamped with single/multi-entry student visa for Russian Federation.',
    icon: 'flight_takeoff'
  },
  {
    step: 5,
    key: 'DEPARTURE_READY',
    title: 'Departure Briefing & Campus Hostel Allotment',
    desc: 'Group flight escort from Delhi, airport pickup, hostel check-in & campus registration.',
    icon: 'hotel_class'
  }
];

export const AdmissionTrackerScreen: React.FC<AdmissionTrackerProps> = ({ currentUser }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const appIdParam = searchParams.get('appId');

  const [loading, setLoading] = useState(true);
  const [application, setApplication] = useState<ApplicationData | null>(null);

  useEffect(() => {
    const fetchApplication = async () => {
      setLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const authUserId = session?.user?.id || currentUser?.id;

        let query = supabase.from('applications').select('*');
        if (appIdParam) {
          query = query.eq('id', appIdParam);
        } else if (authUserId) {
          query = query.eq('user_id', authUserId);
        }

        const { data, error } = await query.order('created_at', { ascending: false }).limit(1).maybeSingle();
        if (data) {
          setApplication(data as ApplicationData);
        }
      } catch (e) {
        console.warn('Failed to load tracker data:', e);
      } finally {
        setLoading(false);
      }
    };

    fetchApplication();
  }, [appIdParam, currentUser]);

  const activeStep = application?.current_step || 2;
  const activeUni = DETAILED_UNIVERSITIES.find(
    u => String(u.id).toLowerCase() === application?.selected_university_id?.toLowerCase() ||
         u.name.toLowerCase().includes(application?.selected_university_id?.toLowerCase() || '')
  ) || DETAILED_UNIVERSITIES[0];

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Top Header Card */}
        <div className="bg-[#0f172a] text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <button 
              onClick={() => navigate(-1)} 
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-slate-200 flex items-center gap-1 transition"
            >
              <span className="material-symbols-outlined text-[16px]">arrow_back</span>
              Back
            </button>
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Live Admission Tracker
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-4">
            {application?.student_name || currentUser?.name || 'Student'} Admission Dossier
          </h1>
          <p className="text-slate-300 text-xs sm:text-sm mt-1">
            Application ID: <span className="font-mono text-amber-400 font-bold">{application?.id || 'APP-2026-PENDING'}</span>
          </p>

          {/* Target Uni Banner */}
          <div className="mt-6 p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Allotted Russian University</p>
              <h3 className="font-extrabold text-sm sm:text-base text-white mt-0.5">{activeUni.name}</h3>
              <p className="text-xs text-slate-300">📍 {activeUni.location} • Intake: {application?.intake_batch || 'September 2026'}</p>
            </div>
            <div className="text-right shrink-0">
              <span className="px-3 py-1 bg-amber-500/20 border border-amber-500/30 text-amber-300 font-bold text-xs rounded-xl">
                Step {activeStep} of 5
              </span>
            </div>
          </div>
        </div>

        {/* Timeline Milestones Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200">
          <h2 className="text-base sm:text-lg font-extrabold text-slate-900 mb-6 flex items-center gap-2">
            <span className="material-symbols-outlined text-amber-500">timeline</span>
            5-Stage Official Admission Timeline
          </h2>

          <div className="space-y-6 relative before:absolute before:left-5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
            {MILESTONES.map((m) => {
              const isCompleted = activeStep > m.step;
              const isCurrent = activeStep === m.step;
              const isPending = activeStep < m.step;

              return (
                <div key={m.step} className="relative flex items-start gap-4 pl-1">
                  {/* Step Icon Badge */}
                  <div className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 z-10 transition-all duration-300 ${
                    isCompleted ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20' :
                    isCurrent ? 'bg-[#0f172a] text-amber-400 ring-4 ring-amber-400/20 shadow-lg' :
                    'bg-slate-100 text-slate-400 border border-slate-200'
                  }`}>
                    {isCompleted ? (
                      <span className="material-symbols-outlined text-[20px]">check</span>
                    ) : (
                      <span className="material-symbols-outlined text-[18px]">{m.icon}</span>
                    )}
                  </div>

                  {/* Step Details */}
                  <div className={`flex-1 p-4 rounded-2xl border transition ${
                    isCurrent ? 'bg-amber-50/40 border-amber-300 shadow-sm' :
                    isCompleted ? 'bg-slate-50 border-slate-200' :
                    'bg-white border-slate-100 opacity-60'
                  }`}>
                    <div className="flex items-center justify-between gap-2">
                      <h4 className={`font-bold text-xs sm:text-sm ${
                        isCurrent ? 'text-slate-900 font-extrabold' :
                        isCompleted ? 'text-slate-800' : 'text-slate-500'
                      }`}>
                        {m.step}. {m.title}
                      </h4>
                      {isCurrent && (
                        <span className="px-2.5 py-0.5 bg-amber-500 text-slate-950 text-[10px] font-black rounded-full uppercase tracking-wider animate-pulse">
                          In Progress
                        </span>
                      )}
                      {isCompleted && (
                        <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full">
                          Completed
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">{m.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Action CTAs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <a
            href="https://wa.me/917375017401?text=Hello%20MedRussia%20Admission%20Desk,%20I%20want%20an%20update%20on%20my%20MBBS%20Application."
            target="_blank"
            rel="noopener noreferrer"
            className="p-4 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-900 transition"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
              <span className="material-symbols-outlined text-[20px]">chat</span>
            </div>
            <div>
              <h4 className="font-bold text-xs sm:text-sm">WhatsApp Counselor Desk</h4>
              <p className="text-[11px] text-emerald-700">Get instant status update from Amit Gurjar</p>
            </div>
          </a>

          <a
            href="tel:+917375017401"
            className="p-4 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-2xl flex items-center gap-3 text-blue-900 transition"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
              <span className="material-symbols-outlined text-[20px]">call</span>
            </div>
            <div>
              <h4 className="font-bold text-xs sm:text-sm">Direct Admission Hotline</h4>
              <p className="text-[11px] text-blue-700">+91 73750 17401 • Toll-Free Helpdesk</p>
            </div>
          </a>
        </div>

      </div>
    </div>
  );
};
