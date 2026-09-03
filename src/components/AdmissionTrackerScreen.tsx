import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { User } from '../types';
import { platformApplicationService } from '../services/platform/applicationService';
import { platformUniversityService } from '../services/platform/universityService';
import { tokenManager } from '../lib/tokenManager';
import { ApplicationResponse, UniversityDetailResponse } from '../types/platform';

interface AdmissionTrackerProps {
  currentUser?: User | null;
}

const MILESTONES = [
  {
    step: 1,
    stageKey: 'applied',
    title: 'Application Submitted & Registered',
    desc: 'Official candidate dossier created and verified by international admissions desk.',
    icon: 'assignment_turned_in'
  },
  {
    step: 2,
    stageKey: 'under_review',
    title: 'Academic & NEET Eligibility Review',
    desc: 'Candidate PCB marks and NEET scorecard verified against statutory NMC FMGL 2021 criteria.',
    icon: 'fact_check'
  },
  {
    step: 3,
    stageKey: 'invitation_applied',
    title: 'Ministry of Internal Affairs (MVD) Visa Invitation',
    desc: 'Electronic study invitation letter sanctioned by Russian Federal Migration Service.',
    icon: 'verified_user'
  },
  {
    step: 4,
    stageKey: 'visa_stamped',
    title: 'Russian Consulate Study Visa Stamped',
    desc: 'Original passport stamped with student visa for Russian Federation.',
    icon: 'flight_takeoff'
  },
  {
    step: 5,
    stageKey: 'arrived_and_enrolled',
    title: 'Departure Briefing & Campus Hostel Allotment',
    desc: 'Airport reception, hostel allotment & campus registration.',
    icon: 'hotel_class'
  }
];

export const AdmissionTrackerScreen: React.FC<AdmissionTrackerProps> = ({ currentUser }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const appIdParam = searchParams.get('appId');

  const [loading, setLoading] = useState(true);
  const [application, setApplication] = useState<ApplicationResponse | null>(null);
  const [university, setUniversity] = useState<UniversityDetailResponse | null>(null);
  const isAuthenticated = tokenManager.isAuthenticated();

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    const fetchApplication = async () => {
      setLoading(true);
      try {
        let appResponse: ApplicationResponse | null = null;
        if (appIdParam) {
          appResponse = await platformApplicationService.getApplicationById(appIdParam);
        } else {
          appResponse = await platformApplicationService.getMyDossier();
        }

        if (appResponse && appResponse.id && isMounted) {
          setApplication(appResponse);
          if (appResponse.university_id) {
            try {
              const uni = await platformUniversityService.getUniversityById(appResponse.university_id);
              if (isMounted) setUniversity(uni);
            } catch (_) {}
          }
        } else if (isMounted) {
          setApplication(null);
        }
      } catch (e: any) {
        // No dossier or 404
        if (isMounted) setApplication(null);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchApplication();
    return () => { isMounted = false; };
  }, [appIdParam, isAuthenticated, currentUser]);

  // 1. Unauthenticated State
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 py-16 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200 shadow-xl text-center space-y-5">
          <div className="w-16 h-16 bg-amber-100 text-amber-800 rounded-2xl flex items-center justify-center mx-auto">
            <span className="material-symbols-outlined text-3xl">lock</span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900">Student Sign In Required</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            Please log in to your student account to track your official Russian MBBS Admission Dossier.
          </p>
          <button
            type="button"
            onClick={() => navigate('/auth')}
            className="w-full py-3 px-4 bg-slate-950 hover:bg-slate-900 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-md"
          >
            Log In / Register
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </button>
        </div>
      </div>
    );
  }

  // 2. Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 py-16 px-4 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs font-bold text-slate-600">Retrieving official application dossier...</p>
        </div>
      </div>
    );
  }

  // 3. Truthful Empty State (Logged in but no application)
  if (!application || !application.id) {
    return (
      <div className="min-h-screen bg-slate-50 py-16 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200 shadow-xl text-center space-y-5">
          <div className="w-16 h-16 bg-slate-100 text-slate-500 rounded-2xl flex items-center justify-center mx-auto">
            <span className="material-symbols-outlined text-3xl">assignment_late</span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900">No Active Application</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            You have not submitted an MBBS admission application yet. Apply directly to NMC & WHO-recognized Russian medical universities.
          </p>
          <button
            type="button"
            onClick={() => navigate('/apply')}
            className="w-full py-3.5 px-4 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-md"
          >
            Start Admission Application
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </button>
        </div>
      </div>
    );
  }

  // 4. Real Application Live Tracker
  const activeStepNumber = application.current_step_number || 1;
  const stageDisplay = (application.current_stage || (application as any).stage || 'APPLICATION_SUBMITTED').replace(/_/g, ' ');

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Top Header Card */}
        <div className="bg-[#0f172a] text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <button 
              onClick={() => navigate(-1)} 
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-slate-200 flex items-center gap-1 transition cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">arrow_back</span>
              Back
            </button>
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Live Admission Dossier
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-4">
            {application.student_name || currentUser?.name || 'Student'} Admission Dossier
          </h1>
          <p className="text-slate-300 text-xs sm:text-sm mt-1">
            Dossier Number: <span className="font-mono text-amber-400 font-bold">{application.dossier_number || 'Pending'}</span>
          </p>

          {/* Target Uni Banner */}
          <div className="mt-6 p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Target Russian University</p>
              <h3 className="font-extrabold text-sm sm:text-base text-white mt-0.5">
                {university?.name || 'Russian State Medical University'}
              </h3>
              <p className="text-xs text-slate-300">📍 {university?.city || 'Russia'} • Intake: {application.intake_batch || 'September 2026'}</p>
            </div>
            <div className="text-right shrink-0">
              <span className="px-3 py-1 bg-amber-500/20 border border-amber-500/30 text-amber-300 font-bold text-xs rounded-xl uppercase">
                {stageDisplay}
              </span>
            </div>
          </div>
        </div>

        {/* Milestone Tracker Cards */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h2 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-600">verified</span>
              Admission Milestones
            </h2>
            <span className="text-xs font-bold text-slate-500">
              Stage {activeStepNumber} of {MILESTONES.length}
            </span>
          </div>

          <div className="relative pl-6 sm:pl-8 space-y-8 before:absolute before:left-3 sm:before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
            {MILESTONES.map((m) => {
              const isCompleted = activeStepNumber > m.step;
              const isCurrent = activeStepNumber === m.step;

              return (
                <div key={m.step} className="relative">
                  {/* Step Dot Icon */}
                  <div className={`absolute -left-6 sm:-left-8 top-0.5 w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all shadow-xs ${
                    isCompleted 
                      ? 'bg-emerald-500 text-white' 
                      : isCurrent 
                      ? 'bg-amber-500 text-slate-950 ring-4 ring-amber-100 animate-bounce' 
                      : 'bg-slate-100 text-slate-400 border border-slate-200'
                  }`}>
                    {isCompleted ? (
                      <span className="material-symbols-outlined text-[16px]">check</span>
                    ) : (
                      m.step
                    )}
                  </div>

                  {/* Step Details */}
                  <div className={`p-4 rounded-2xl border transition-all ${
                    isCurrent 
                      ? 'bg-amber-50/50 border-amber-200 shadow-xs' 
                      : isCompleted 
                      ? 'bg-slate-50/50 border-slate-200' 
                      : 'bg-white border-slate-100 opacity-60'
                  }`}>
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="font-bold text-xs sm:text-sm text-slate-900">{m.title}</h4>
                      {isCurrent && (
                        <span className="px-2 py-0.5 rounded-md bg-amber-500 text-slate-950 font-extrabold text-[10px] uppercase tracking-wider">
                          Current Stage
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{m.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
};
