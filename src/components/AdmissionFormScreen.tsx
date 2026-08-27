import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { RUSSIAN_UNIVERSITIES, getUniversityData, DETAILED_UNIVERSITIES } from '../constants/universities';
import { User } from '../types';

interface AdmissionFormProps {
  currentUser?: User | null;
  onSuccess?: () => void;
}

const DAYS_LIST = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'));
const MONTHS_LIST = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const YEARS_LIST = Array.from({ length: 13 }, (_, i) => String(2010 - i));
const GENDER_OPTIONS = ['Male', 'Female', 'Other'];
const BOARD_OPTIONS = ['CBSE', 'ICSE / ISC', 'State Board', 'NIOS (Open School)', 'Other'];
const CATEGORY_OPTIONS = ['General / UR', 'OBC-NCL', 'SC', 'ST', 'EWS'];
const NEET_STATUS_OPTIONS = [
  'Qualified (NEET 2025)',
  'Qualified (NEET 2024)',
  'NEET 2026 (Appearing / Registered)'
];
const BATCH_OPTIONS = ['September 2026 Batch', 'October 2026 Batch'];
const HOSTEL_OPTIONS = ['2-Sharing (Standard)', '3-Sharing (Standard)', 'Single Studio'];

export const AdmissionFormScreen: React.FC<AdmissionFormProps> = ({ currentUser, onSuccess }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialUni = searchParams.get('uni') || 'bashkir';

  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [uniSearch, setUniSearch] = useState('');
  const [showUniModal, setShowUniModal] = useState(false);

  // Form State matching Android AdmissionApplicationData exactly
  const [formData, setFormData] = useState({
    // Step 1: Personal & Contact
    studentName: currentUser?.name || '',
    dobDay: '15',
    dobMonth: 'Aug',
    dobYear: '2007',
    gender: 'Male',
    phone: currentUser?.phone || '',
    whatsapp: currentUser?.phone || '',
    email: currentUser?.email || '',
    guardianName: '',
    guardianPhone: '',
    cityState: '',

    // Step 2: Academic & NEET
    board12th: 'CBSE',
    pcbPercentage: currentUser?.eligibilityData?.twelfthMarks ? String(currentUser.eligibilityData.twelfthMarks) : '65',
    category: 'General / UR',
    neetStatus: 'Qualified (NEET 2025)',
    neetScore: currentUser?.eligibilityData?.neetScore ? String(currentUser.eligibilityData.neetScore) : '380',

    // Step 3: University & Intake Preferences
    selectedUniversityId: initialUni,
    intakeBatch: 'September 2026 Batch',
    hostelSharing: '2-Sharing (Standard)',
    indianMessOptIn: true,
    termsAccepted: false
  });

  // Load existing application if any
  useEffect(() => {
    const loadApplication = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const authUserId = session?.user?.id || currentUser?.id;
      if (!authUserId) return;

      try {
        const { data, error } = await supabase
          .from('applications')
          .select('*')
          .eq('user_id', authUserId)
          .maybeSingle();

        if (data) {
          setFormData(prev => ({
            ...prev,
            studentName: data.student_name || prev.studentName,
            email: data.email || prev.email,
            phone: data.phone || prev.phone,
            whatsapp: data.phone || prev.whatsapp,
            guardianName: data.parent_name || prev.guardianName,
            guardianPhone: data.parent_phone || prev.guardianPhone,
            cityState: data.address || prev.cityState,
            pcbPercentage: data.pcb_percentage || prev.pcbPercentage,
            category: data.category || prev.category,
            neetScore: data.neet_score || prev.neetScore,
            neetStatus: data.neet_status || prev.neetStatus,
            selectedUniversityId: data.selected_university_id || prev.selectedUniversityId,
            intakeBatch: data.intake_batch || prev.intakeBatch,
            indianMessOptIn: data.needs_indian_mess !== false
          }));
        }
      } catch (e) {}
    };
    loadApplication();
  }, [currentUser]);

  const selectedUniData = DETAILED_UNIVERSITIES.find(
    u => String(u.id).toLowerCase() === formData.selectedUniversityId.toLowerCase() || 
         u.name.toLowerCase().includes(formData.selectedUniversityId.toLowerCase())
  ) || DETAILED_UNIVERSITIES[0];

  const filteredUnis = DETAILED_UNIVERSITIES.filter(u => 
    u.name.toLowerCase().includes(uniSearch.toLowerCase()) || 
    u.location.toLowerCase().includes(uniSearch.toLowerCase())
  );

  const validateStep = (step: number) => {
    setErrorMsg('');
    if (step === 1) {
      if (!formData.studentName.trim()) { setErrorMsg('Please enter candidate full name'); return false; }
      if (!formData.email.trim() || !formData.email.includes('@')) { setErrorMsg('Please enter a valid email address'); return false; }
      if (!formData.phone.trim() || formData.phone.length < 10) { setErrorMsg('Please enter a valid 10-digit mobile number'); return false; }
      if (!formData.guardianName.trim()) { setErrorMsg('Please enter parent/guardian full name'); return false; }
      if (!formData.guardianPhone.trim()) { setErrorMsg('Please enter parent/guardian mobile number'); return false; }
      if (!formData.cityState.trim()) { setErrorMsg('Please enter your City and State'); return false; }
    } else if (step === 2) {
      const pcb = parseFloat(formData.pcbPercentage);
      if (isNaN(pcb) || pcb < 40 || pcb > 100) { setErrorMsg('Please enter valid 12th PCB percentage (min 40%)'); return false; }
      const neet = parseInt(formData.neetScore, 10);
      if (isNaN(neet) || neet < 0 || neet > 720) { setErrorMsg('Please enter valid NEET Score (0-720)'); return false; }
    } else if (step === 4) {
      if (!formData.termsAccepted) { setErrorMsg('You must accept the NMC & MedRussia admission declaration to proceed'); return false; }
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      navigate(-1);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep(4)) return;

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const authUserId = session?.user?.id || currentUser?.id;
      const appId = `APP_2026_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      const payload = {
        id: appId,
        user_id: authUserId || null,
        student_id: authUserId || appId,
        student_name: formData.studentName.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        parent_name: formData.guardianName.trim(),
        parent_phone: formData.guardianPhone.trim(),
        address: formData.cityState.trim(),
        pcb_percentage: formData.pcbPercentage,
        category: formData.category,
        neet_score: formData.neetScore,
        neet_status: formData.neetStatus,
        neet_year: '2026',
        selected_university_id: formData.selectedUniversityId,
        intake_batch: formData.intakeBatch,
        needs_hostel: true,
        needs_indian_mess: formData.indianMessOptIn,
        application_status: 'APPLIED',
        current_step: 2,
        total_steps: 5,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase.from('applications').upsert(payload);
      if (error) throw error;

      if (onSuccess) onSuccess();
      navigate('/tracker?appId=' + appId);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit admission application. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        
        {/* Header Title Card */}
        <div className="bg-[#0f172a] text-white rounded-3xl p-6 sm:p-8 shadow-xl mb-6 relative overflow-hidden">
          <div className="absolute right-0 top-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <button 
              type="button"
              onClick={handleBack} 
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-slate-200 flex items-center gap-1 transition"
            >
              <span className="material-symbols-outlined text-[16px]">arrow_back</span>
              Back
            </button>
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
              Session 2026-27
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-4">
            Official MBBS Admission Application
          </h1>
          <p className="text-slate-300 text-xs sm:text-sm mt-1">
            Government Russian Medical Universities • Direct NMC & WHO Accredited Admission
          </p>

          {/* Stepper Indicator */}
          <div className="grid grid-cols-4 gap-2 mt-6 pt-6 border-t border-slate-800">
            {[
              { num: 1, label: 'Identity' },
              { num: 2, label: 'Academic & NEET' },
              { num: 3, label: 'University' },
              { num: 4, label: 'Review & Submit' }
            ].map(s => (
              <div key={s.num} className="text-center">
                <div className={`h-2 rounded-full transition-all duration-300 ${
                  currentStep >= s.num ? 'bg-amber-400' : 'bg-slate-700'
                }`} />
                <p className={`text-[10px] font-bold mt-1.5 truncate ${
                  currentStep === s.num ? 'text-amber-400' : 'text-slate-400'
                }`}>
                  {s.num}. {s.label}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm flex items-center gap-2">
            <span className="material-symbols-outlined text-rose-600 shrink-0">error</span>
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form Container */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200">

          {/* STEP 1: CANDIDATE IDENTITY & CONTACT */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-black">1</span>
                  Candidate Identity & Guardian Contact
                </h2>
                <p className="text-xs text-slate-500 mt-1">Enter candidate details exactly as printed on 10th/12th certificate & Passport.</p>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">Candidate Full Name *</label>
                <input 
                  type="text" 
                  placeholder="e.g. Rahul Sharma"
                  value={formData.studentName}
                  onChange={e => setFormData({ ...formData, studentName: e.target.value })}
                  className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:bg-white focus:ring-2 focus:ring-[#0f172a] outline-none"
                />
              </div>

              {/* DOB & Gender */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">Date of Birth *</label>
                  <div className="grid grid-cols-3 gap-2">
                    <select 
                      value={formData.dobDay} 
                      onChange={e => setFormData({ ...formData, dobDay: e.target.value })}
                      className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none"
                    >
                      {DAYS_LIST.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <select 
                      value={formData.dobMonth} 
                      onChange={e => setFormData({ ...formData, dobMonth: e.target.value })}
                      className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none"
                    >
                      {MONTHS_LIST.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <select 
                      value={formData.dobYear} 
                      onChange={e => setFormData({ ...formData, dobYear: e.target.value })}
                      className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none"
                    >
                      {YEARS_LIST.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">Gender *</label>
                  <select 
                    value={formData.gender}
                    onChange={e => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none"
                  >
                    {GENDER_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
              </div>

              {/* Email & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">Email Address *</label>
                  <input 
                    type="email" 
                    placeholder="student@example.com"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:bg-white focus:ring-2 focus:ring-[#0f172a] outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">Candidate Mobile / WhatsApp *</label>
                  <input 
                    type="tel" 
                    placeholder="+91 98765 43210"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value, whatsapp: e.target.value })}
                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:bg-white focus:ring-2 focus:ring-[#0f172a] outline-none"
                  />
                </div>
              </div>

              {/* Guardian Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">Parent / Guardian Full Name *</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Ramesh Sharma"
                    value={formData.guardianName}
                    onChange={e => setFormData({ ...formData, guardianName: e.target.value })}
                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:bg-white focus:ring-2 focus:ring-[#0f172a] outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">Parent Mobile Number *</label>
                  <input 
                    type="tel" 
                    placeholder="+91 98765 00000"
                    value={formData.guardianPhone}
                    onChange={e => setFormData({ ...formData, guardianPhone: e.target.value })}
                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:bg-white focus:ring-2 focus:ring-[#0f172a] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">Residential City & State *</label>
                <input 
                  type="text" 
                  placeholder="e.g. Jaipur, Rajasthan"
                  value={formData.cityState}
                  onChange={e => setFormData({ ...formData, cityState: e.target.value })}
                  className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:bg-white focus:ring-2 focus:ring-[#0f172a] outline-none"
                />
              </div>
            </div>
          )}

          {/* STEP 2: ACADEMIC MARKS & NEET QUALIFICATION */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-black">2</span>
                  Academic & NEET Qualification
                </h2>
                <p className="text-xs text-slate-500 mt-1">NMC Eligibility: 50% PCB for General, 40% for Reserved Category.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">12th Education Board *</label>
                  <select 
                    value={formData.board12th}
                    onChange={e => setFormData({ ...formData, board12th: e.target.value })}
                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none"
                  >
                    {BOARD_OPTIONS.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">12th PCB Aggregate (%) *</label>
                  <input 
                    type="number" 
                    placeholder="e.g. 68"
                    min="40"
                    max="100"
                    value={formData.pcbPercentage}
                    onChange={e => setFormData({ ...formData, pcbPercentage: e.target.value })}
                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:bg-white focus:ring-2 focus:ring-[#0f172a] outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">Category *</label>
                  <select 
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none"
                  >
                    {CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">NEET Status *</label>
                  <select 
                    value={formData.neetStatus}
                    onChange={e => setFormData({ ...formData, neetStatus: e.target.value })}
                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none"
                  >
                    {NEET_STATUS_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">NEET Score (out of 720) *</label>
                <input 
                  type="number" 
                  placeholder="e.g. 380"
                  min="0"
                  max="720"
                  value={formData.neetScore}
                  onChange={e => setFormData({ ...formData, neetScore: e.target.value })}
                  className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:bg-white focus:ring-2 focus:ring-[#0f172a] outline-none"
                />
              </div>

              {/* NMC Validation Callout */}
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-start gap-3">
                <span className="material-symbols-outlined text-emerald-600 text-[20px] shrink-0 mt-0.5">verified</span>
                <div>
                  <p className="font-bold text-xs">NMC FMGL Gazette Compliant</p>
                  <p className="text-[11px] text-emerald-700 mt-0.5">
                    Your profile meets the 54-month English medium coursework + 12-month clinical internship prerequisite for NExT eligibility.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: UNIVERSITY & INTAKE PREFERENCES */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center text-xs font-black">3</span>
                  University & Campus Preferences
                </h2>
                <p className="text-xs text-slate-500 mt-1">Select your preferred Russian Medical University and accommodation tier.</p>
              </div>

              {/* University Selector Card */}
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">Target Russian University *</label>
                <div 
                  onClick={() => setShowUniModal(true)}
                  className="p-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl cursor-pointer flex items-center justify-between transition"
                >
                  <div className="min-w-0">
                    <h3 className="font-extrabold text-sm text-slate-900 truncate">{selectedUniData.name}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">📍 {selectedUniData.location} • ₹{(selectedUniData.tuition_fee_rub * 0.95 / 100000).toFixed(1)} Lakhs/Yr</p>
                  </div>
                  <button type="button" className="px-3 py-1.5 bg-[#0f172a] text-white text-xs font-bold rounded-xl shrink-0">
                    Change
                  </button>
                </div>
              </div>

              {/* Batch & Hostel */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">Intake Batch *</label>
                  <select 
                    value={formData.intakeBatch}
                    onChange={e => setFormData({ ...formData, intakeBatch: e.target.value })}
                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none"
                  >
                    {BATCH_OPTIONS.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">Hostel Sharing *</label>
                  <select 
                    value={formData.hostelSharing}
                    onChange={e => setFormData({ ...formData, hostelSharing: e.target.value })}
                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none"
                  >
                    {HOSTEL_OPTIONS.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              </div>

              {/* Indian Mess Opt-in */}
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-lg">🍛</div>
                  <div>
                    <h4 className="font-bold text-xs sm:text-sm text-slate-900">Indian Food & Mess Facility</h4>
                    <p className="text-[11px] text-slate-600">North & South Indian vegetarian / non-veg meals cooked by Indian chefs.</p>
                  </div>
                </div>
                <input 
                  type="checkbox"
                  checked={formData.indianMessOptIn}
                  onChange={e => setFormData({ ...formData, indianMessOptIn: e.target.checked })}
                  className="w-5 h-5 accent-amber-500 rounded cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* STEP 4: REVIEW & LEGAL DECLARATION */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-800 flex items-center justify-center text-xs font-black">4</span>
                  Review Application & Legal Declaration
                </h2>
                <p className="text-xs text-slate-500 mt-1">Review all submitted details before dispatching to university registrar.</p>
              </div>

              {/* Applicant Summary Card */}
              <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <div>
                    <h3 className="font-extrabold text-base text-slate-900">{formData.studentName}</h3>
                    <p className="text-xs text-slate-500">{formData.email} • {formData.phone}</p>
                  </div>
                  <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold">
                    NEET: {formData.neetScore}/720
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div><span className="text-slate-400 block text-[10px]">DOB</span><span className="font-bold text-slate-700">{formData.dobDay} {formData.dobMonth} {formData.dobYear}</span></div>
                  <div><span className="text-slate-400 block text-[10px]">12th PCB</span><span className="font-bold text-slate-700">{formData.pcbPercentage}%</span></div>
                  <div><span className="text-slate-400 block text-[10px]">Category</span><span className="font-bold text-slate-700">{formData.category}</span></div>
                  <div><span className="text-slate-400 block text-[10px]">Guardian</span><span className="font-bold text-slate-700">{formData.guardianName}</span></div>
                  <div><span className="text-slate-400 block text-[10px]">Target Uni</span><span className="font-bold text-slate-700">{selectedUniData.name}</span></div>
                  <div><span className="text-slate-400 block text-[10px]">Intake Batch</span><span className="font-bold text-slate-700">{formData.intakeBatch}</span></div>
                </div>
              </div>

              {/* Declaration Checkbox */}
              <label className="flex items-start gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200 cursor-pointer">
                <input 
                  type="checkbox"
                  checked={formData.termsAccepted}
                  onChange={e => setFormData({ ...formData, termsAccepted: e.target.checked })}
                  className="w-5 h-5 accent-[#0f172a] rounded mt-0.5 shrink-0 cursor-pointer"
                />
                <div className="text-xs text-slate-700 leading-relaxed">
                  I hereby declare that all academic credentials and personal details provided are authentic. I agree to comply with the official university admission regulations, Ministry of Education (Russia) policies, and the National Medical Commission (NMC) guidelines.
                </div>
              </label>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-6 mt-6 border-t border-slate-100">
            <button
              type="button"
              onClick={handleBack}
              className="px-5 py-3 rounded-2xl border border-slate-200 font-bold text-xs text-slate-700 hover:bg-slate-50 transition"
            >
              {currentStep === 1 ? 'Cancel' : 'Previous Step'}
            </button>

            {currentStep < 4 ? (
              <button
                type="button"
                onClick={handleNext}
                className="px-6 py-3 rounded-2xl bg-[#0f172a] hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-2 shadow-md transition"
              >
                Continue to Step {currentStep + 1}
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-8 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg hover:shadow-amber-500/20 transition disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <span className="animate-spin material-symbols-outlined text-[18px]">progress_activity</span>
                    Submitting Application...
                  </>
                ) : (
                  <>
                    <span>Submit Official Application</span>
                    <span className="material-symbols-outlined text-[18px]">send</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* University Selector Modal */}
        {showUniModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-lg text-slate-900">Select Russian University</h3>
                  <p className="text-xs text-slate-500">40 Recognized Medical Institutes</p>
                </div>
                <button onClick={() => setShowUniModal(false)} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600">✕</button>
              </div>

              <div className="p-4 border-b border-slate-100">
                <input 
                  type="text" 
                  placeholder="Search by university name or city..."
                  value={uniSearch}
                  onChange={e => setUniSearch(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#0f172a]"
                />
              </div>

              <div className="overflow-y-auto p-4 space-y-2 flex-1">
                {filteredUnis.map(u => (
                  <div 
                    key={u.id}
                    onClick={() => {
                      setFormData({ ...formData, selectedUniversityId: String(u.id) });
                      setShowUniModal(false);
                    }}
                    className={`p-3.5 rounded-2xl border transition cursor-pointer flex items-center justify-between ${
                      formData.selectedUniversityId === String(u.id)
                        ? 'border-amber-500 bg-amber-50/50'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <h4 className="font-bold text-xs text-slate-900">{u.name}</h4>
                      <p className="text-[11px] text-slate-500">📍 {u.location} • ₹{(u.tuition_fee_rub * 0.95 / 100000).toFixed(1)} Lakhs/Yr</p>
                    </div>
                    {formData.selectedUniversityId === String(u.id) && (
                      <span className="material-symbols-outlined text-amber-600 text-[20px]">check_circle</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
