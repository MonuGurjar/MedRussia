/**
 * MedRussia Platform — Authoritative TypeScript Contract
 * Generated from OpenAPI v3.1.0 Contract
 */

export type UserRole = 'student' | 'counselor' | 'staff' | 'admin';

export type ApplicationStage =
  | 'DRAFT'
  | 'APPLIED'
  | 'UNDER_REVIEW'
  | 'DOCUMENTS_PENDING'
  | 'DOCUMENTS_VERIFIED'
  | 'APOSTILLE_IN_PROGRESS'
  | 'INVITATION_APPLIED'
  | 'INVITATION_ISSUED'
  | 'VISA_IN_PROGRESS'
  | 'VISA_STAMPED'
  | 'ARRIVED_AND_ENROLLED'
  | 'REJECTED'
  | 'WITHDRAWN';

export type DocumentType =
  | 'marksheet_10'
  | 'marksheet_12'
  | 'neet_scorecard'
  | 'passport_front'
  | 'passport_back'
  | 'admission_invitation_letter'
  | 'apostille_translation'
  | 'student_visa'
  | 'air_ticket'
  | 'medical_fitness_certificate'
  | 'other';

export type DocumentStatus =
  | 'pending_upload'
  | 'under_review'
  | 'verified'
  | 'rejected'
  | 'expired';

export type ThreadStatus = 'active' | 'resolved' | 'archived';

export interface ResponseMeta {
  timestamp: string;
  request_id?: string | null;
  version?: string;
}

export interface InvalidParam {
  name: string;
  reason: string;
  type?: string;
}

export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  code: string;
  invalid_params?: InvalidParam[] | null;
  request_id?: string | null;
}

export interface ResponseEnvelope<T> {
  success: boolean;
  data: T | null;
  error?: ProblemDetails | null;
  meta: ResponseMeta;
}

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
  full_name: string;
  phone?: string | null;
  role?: UserRole;
}

export interface LoginRequest {
  identifier: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  token_type?: string;
  expires_in_seconds?: number;
  refresh_token: string;
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirm {
  token: string;
  new_password: string;
}

export interface MessageResponse {
  message: string;
}

export interface UserProfileResponse {
  id: string;
  email: string;
  username: string;
  full_name: string;
  phone?: string | null;
  role: UserRole;
  avatar_url?: string | null;
  is_email_verified?: boolean;
  is_phone_verified?: boolean;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface UserUpdateRequest {
  full_name?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
}

export interface UniversitySummaryResponse {
  id: string;
  code: string;
  name: string;
  city: string;
  ranking_russia?: number | null;
  ranking_world?: number | null;
  is_nmc_compliant?: boolean;
  has_indian_mess?: boolean;
  hero_image_url?: string | null;
  fmge_passing_rate?: number | null;
}

export interface FeeScheduleResponse {
  id: string;
  academic_year: string;
  annual_tuition_rub: number;
  annual_hostel_rub: number;
  mandatory_insurance_rub?: number | null;
  one_time_registration_rub?: number | null;
  is_active?: boolean;
}

export interface UniversityDetailResponse {
  id: string;
  code: string;
  name: string;
  city: string;
  region?: string | null;
  established_year?: number | null;
  ranking_world?: number | null;
  ranking_russia?: number | null;
  course_duration_months?: number;
  is_nmc_compliant?: boolean;
  is_who_recognized?: boolean;
  has_indian_mess?: boolean;
  indian_mess_annual_fee_inr?: number | null;
  total_hospital_beds?: number | null;
  fmge_passing_rate?: number | null;
  hero_image_url?: string | null;
  gallery_image_urls?: string[] | null;
  website_url?: string | null;
  description?: string | null;
  fee_schedules?: FeeScheduleResponse[] | null;
}

export interface EligibilityInputDto {
  physics_marks: number;
  chemistry_marks: number;
  biology_marks: number;
  english_passed?: boolean;
  student_age: number;
  category?: string;
  neet_status: string;
  neet_score?: number | null;
  target_university_id?: string | null;
}

export interface EligibilityReportResponse {
  is_eligible: boolean;
  is_provisional?: boolean;
  pcb_percentage: number;
  pcb_cutoff_required: number;
  pcb_passed: boolean;
  age_passed: boolean;
  neet_passed: boolean;
  english_passed: boolean;
  summary: string;
  warnings?: string[] | null;
  recommendations?: string[] | null;
}

export interface AnnualCostBreakdown {
  year: number;
  tuition_fee: number;
  hostel_fee: number;
  mess_fee: number;
  insurance_and_visa: number;
  living_stipend: number;
  one_time_charges: number;
  total_year_inr: number;
  total_year_rub: number;
}

export interface BudgetEstimateRequest {
  university_id: string;
  meal_plan?: string;
  living_tier?: string;
  include_flight_budget?: boolean;
}

export interface BudgetEstimateResponse {
  university_id: string;
  university_name: string;
  hedged_forex_rate: number;
  total_6_year_inr: number;
  total_6_year_rub: number;
  total_6_year_usd: number;
  savings_vs_indian_private_inr: number;
  annual_breakdown: AnnualCostBreakdown[];
}

export interface ApplicationCreateDto {
  university_id: string;
  student_name: string;
  dob: string;
  gender: string;
  phone: string;
  whatsapp?: string | null;
  email: string;
  guardian_name: string;
  guardian_phone: string;
  city_state: string;
  board_12th: string;
  physics_marks: number;
  chemistry_marks: number;
  biology_marks: number;
  neet_status: string;
  neet_score?: number | null;
  neet_exam_year?: number | null;
  category?: string;
  intake_batch?: string | null;
  hostel_room_type?: string | null;
  indian_mess_opted?: boolean | null;
}

export interface ApplicationResponse {
  id: string;
  dossier_number: string;
  user_id: string;
  university_id: string;
  student_name: string;
  dob: string;
  gender: string;
  phone: string;
  email: string;
  pcb_percentage: number;
  neet_status: string;
  neet_score?: number | null;
  category: string;
  current_stage: ApplicationStage;
  current_step_number: number;
  admin_remarks?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface DocumentUploadResponse {
  id: string;
  user_id: string;
  application_id?: string | null;
  doc_type: DocumentType;
  file_name: string;
  file_size_bytes: number;
  mime_type: string;
  status: DocumentStatus;
  is_issued_by_admin?: boolean;
  created_at: string;
}

export interface SignedUrlResponse {
  document_id: string;
  signed_url: string;
  expires_in_seconds?: number;
}

export interface CreateThreadDto {
  subject?: string | null;
}

export interface ChatThreadResponse {
  id: string;
  student_id: string;
  assigned_staff_id?: string | null;
  status: ThreadStatus;
  subject: string;
  last_message_at: string;
  messages?: ChatMessageResponse[] | null;
}

export interface ChatMessageCreateDto {
  message_text: string;
  attachments?: any[] | null;
  client_message_id?: string | null;
}

export interface ChatMessageResponse {
  id: string;
  thread_id: string;
  sender_id: string;
  sender_role: UserRole;
  message_text: string;
  attachments?: any[] | null;
  is_read?: boolean;
  read_at?: string | null;
  created_at: string;
}

export interface InquiryCreateDto {
  name: string;
  email: string;
  phone: string;
  target_university_id?: string | null;
  message: string;
  budget_range?: string | null;
}

export interface InquiryResponse {
  id: string;
  user_id?: string | null;
  name: string;
  email: string;
  phone: string;
  target_university_id?: string | null;
  message: string;
  budget_range?: string | null;
  status: string;
  replies?: InquiryReplyResponse[] | null;
  created_at: string;
  updated_at?: string | null;
}

export interface InquiryReplyResponse {
  id: string;
  inquiry_id: string;
  counselor_user_id: string;
  reply_text: string;
  created_at: string;
}

export interface CallBookingCreateDto {
  student_name: string;
  student_phone: string;
  preferred_slot: string;
}

export interface CallBookingResponse {
  id: string;
  user_id?: string | null;
  student_name: string;
  student_phone: string;
  preferred_slot: string;
  status: string;
  counselor_notes?: string | null;
  created_at: string;
}

export interface PlatformFeedbackCreateDto {
  feedback_type: string;
  rating?: number | null;
  message: string;
  device_info?: string | null;
}

export interface PlatformFeedbackResponse {
  id: string;
  user_id?: string | null;
  rating?: number | null;
  feedback_type: string;
  message: string;
  device_info?: string | null;
  created_at: string;
}

export interface AICounselorRequest {
  prompt: string;
  chat_history?: Array<{ role: string; content: string }> | null;
  target_university_id?: string | null;
}

export interface AICounselorResponse {
  response: string;
  model?: string;
  grounded_context_applied?: boolean;
  sources?: string[] | null;
}

export interface PaginatedData<T> {
  items: T[];
  total_count: number;
  page: number;
  page_size: number;
  total_pages: number;
}
