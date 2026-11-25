// ============================================================
// API Types — Employee Attendance System
// Semua tipe sesuai kontrak API bagian 8 project_FE.md
// Tidak ada `any` — TypeScript strict
// ============================================================

// ── Health ──────────────────────────────────────────────────

export interface HealthModels {
  yolo: boolean;
  landmarks: boolean;
  facenet: boolean;
}

export interface HealthResponse {
  status: string;
  models: HealthModels;
  registered_employees: number;
}

// ── Auth ────────────────────────────────────────────────────

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface AuthMeResponse {
  id: number;
  username: string;
}

// ── Employee ─────────────────────────────────────────────────

export interface Employee {
  id: number;
  employee_code: string;
  full_name: string;
  position: string;
  is_active: boolean;
  face_registered: boolean;
  face_samples: number;
}

export interface CreateEmployeeRequest {
  employee_code: string;
  full_name: string;
  position?: string;
}

export interface UpdateEmployeeRequest {
  employee_code?: string;
  full_name?: string;
  position?: string;
  is_active?: boolean;
}

// ── Face Registration ────────────────────────────────────────

/** Alasan per gambar: NO_FACE | MULTIPLE_FACES | FACE_TOO_SMALL | IMAGE_BLURRY */
export type FaceResultReason =
  | 'NO_FACE'
  | 'MULTIPLE_FACES'
  | 'FACE_TOO_SMALL'
  | 'IMAGE_BLURRY';

export interface FaceRegistrationResult {
  pose: string;
  ok: boolean;
  reason?: FaceResultReason;
}

export interface RegisterFaceResponse {
  registered: boolean;
  valid_count: number;
  results: FaceRegistrationResult[];
}

export interface FaceInfoResponse {
  count: number;
  updated_at: string;
  poses: string[];
}

// ── Attendance / Challenge ───────────────────────────────────

export interface ChallengeRequest {
  type: 'check_in' | 'check_out';
  force_kind?: 'blink' | 'turn';
}

export interface ChallengeResponse {
  challenge_id: string;
  kind: 'blink' | 'turn';
  sequence: ['left', 'right'] | ['right', 'left'] | null;
  instruction: string;
  window_seconds: number;
  expires_at: string;
}

export interface AttendanceEmployee {
  id: number;
  full_name: string;
  employee_code: string;
}

export interface AttendanceRecord {
  type: 'check_in' | 'check_out';
  at: string;
  work_date: string;
}

/** reason kode — lihat REASON_MESSAGES di constants/messages.ts */
export type AttendanceReason =
  | 'LIVENESS_FAILED'
  | 'FACE_NOT_REGISTERED'
  | 'NO_FACE'
  | 'MULTIPLE_FACES'
  | 'FACE_INCONSISTENT'
  | 'CHALLENGE_EXPIRED'
  | 'VIDEO_INVALID'
  | 'ALREADY_CHECKED_IN'
  | 'ALREADY_CHECKED_OUT'
  | 'NOT_CHECKED_IN';

export interface VerifyResponse {
  status: 'accepted' | 'rejected';
  reason: AttendanceReason | null;
  message: string;
  employee: AttendanceEmployee | null;
  attendance: AttendanceRecord | null;
  debug: Record<string, unknown> | null;
}

export interface TodayAttendance {
  check_in_at: string | null;
  check_out_at: string | null;
  work_date: string;
}

// ── Reports ──────────────────────────────────────────────────

export interface MonthlyReportItem {
  employee_id: number;
  full_name: string;
  days_present: number;
  days_with_checkout: number;
  total_work_minutes: number;
}

export interface AttendanceReportItem {
  work_date: string;
  employee_id: number;
  full_name: string;
  check_in_at: string | null;
  check_out_at: string | null;
  duration_minutes: number | null;
}

// ── Evaluation ───────────────────────────────────────────────

export type EvaluationScenario = 'REAL' | 'PRINT' | 'SCREEN';
export type EvaluationVariant =
  | 'REPEAT_1'
  | 'REPEAT_2'
  | '4R'
  | 'A4'
  | 'PHOTO'
  | 'VIDEO';
export type EvaluationLighting = 'BRIGHT' | 'DIM';
export type EvaluationDistance = 50 | 100;

export interface EvaluationTrialConfig {
  scenario: EvaluationScenario;
  variant: EvaluationVariant;
  lighting: EvaluationLighting;
  distance_cm: EvaluationDistance;
  subject_employee_id: number;
  note?: string;
}

export interface EvaluationTrial {
  id: number;
  scenario: EvaluationScenario;
  variant: EvaluationVariant;
  lighting: EvaluationLighting;
  distance_cm: EvaluationDistance;
  subject_employee_id: number;
  note?: string;
  status: 'accepted' | 'rejected';
  reason: AttendanceReason | null;
  created_at: string;
}

export interface ScenarioSummary {
  total: number;
  accepted: number;
  rejected: number;
  far_percent: number;
  frr_percent: number;
  attack_rejection_rate_percent: number;
  liveness_rejected: number;
}

export interface EvaluationSummary {
  target_per_scenario: number;
  scenarios: {
    REAL: ScenarioSummary;
    PRINT: ScenarioSummary;
    SCREEN: ScenarioSummary;
  };
  breakdown: Record<string, unknown>;
}

// ── Error ────────────────────────────────────────────────────

export interface ApiError {
  detail: string;
  code: string;
}
