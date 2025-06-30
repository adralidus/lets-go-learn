import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types
export interface User {
  id: string;
  username: string;
  email: string;
  full_name: string;
  role: 'admin' | 'student';
  password_hash: string;
  last_login?: string;
  created_at: string;
  updated_at: string;
}

export interface ExamFolder {
  id: string;
  name: string;
  description: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Examination {
  id: string;
  title: string;
  description: string;
  scheduled_start: string;
  scheduled_end: string;
  duration_minutes: number;
  is_active: boolean;
  folder_id?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ExamQuestion {
  id: string;
  exam_id: string;
  question_text: string;
  question_type: 'multiple_choice' | 'multiple_checkboxes' | 'essay';
  options: string[];
  correct_answer?: string;
  correct_answers?: string[]; // For multiple checkboxes
  points: number;
  is_required: boolean;
  order_index: number;
  created_at: string;
}

export interface ExamSubmission {
  id: string;
  exam_id: string;
  student_id: string;
  started_at: string;
  submitted_at?: string;
  total_score: number;
  max_score: number;
  status: 'in_progress' | 'submitted' | 'graded';
  created_at: string;
}

export interface ExamAnswer {
  id: string;
  submission_id: string;
  question_id: string;
  answer_text: string;
  answer_array?: string[]; // For multiple checkboxes
  points_earned: number;
  created_at: string;
}

// Extended types for review functionality
export interface ExamSubmissionWithDetails extends ExamSubmission {
  student?: User;
  examination?: Examination;
}

export interface ExamAnswerWithQuestion extends ExamAnswer {
  question?: ExamQuestion;
}