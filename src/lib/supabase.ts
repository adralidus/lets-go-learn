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
  role: 'super_admin' | 'admin' | 'student';
  password_hash: string;
  assigned_admin_id?: string; // New field for student-admin assignment
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

// Super Admin specific types
export interface AdminActivityLog {
  id: string;
  admin_id: string;
  action_type: string;
  target_type: string;
  target_id?: string;
  details: any;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
  admin?: User;
}

export interface SystemSetting {
  id: string;
  setting_key: string;
  setting_value: any;
  description?: string;
  category: string;
  is_public: boolean;
  created_by?: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;
}

export interface UserSession {
  id: string;
  user_id: string;
  session_token: string;
  ip_address?: string;
  user_agent?: string;
  is_active: boolean;
  last_activity: string;
  expires_at: string;
  created_at: string;
  user?: User;
}

export interface AdminPermission {
  id: string;
  admin_id: string;
  permission_type: string;
  resource_type: string;
  can_create: boolean;
  can_read: boolean;
  can_update: boolean;
  can_delete: boolean;
  granted_by?: string;
  created_at: string;
  admin?: User;
  granted_by_user?: User;
}

export interface SystemNotification {
  id: string;
  title: string;
  message: string;
  notification_type: 'info' | 'warning' | 'error' | 'success';
  target_role?: 'super_admin' | 'admin' | 'student';
  target_user_id?: string;
  is_read: boolean;
  is_system_wide: boolean;
  created_by?: string;
  created_at: string;
  expires_at?: string;
  created_by_user?: User;
}

// Student-Admin assignment types
export interface StudentAssignment {
  student_id: string;
  admin_id: string;
  assigned_by: string;
  assigned_at: string;
}

export interface AdminAssignmentStats {
  admin_id: string;
  admin_name: string;
  admin_username: string;
  assigned_students_count: number;
  total_students: number;
}

// Super Admin utility functions
export const logAdminActivity = async (
  adminId: string,
  actionType: string,
  targetType: string,
  targetId?: string,
  details?: any,
  ipAddress?: string,
  userAgent?: string
) => {
  const { data, error } = await supabase.rpc('log_admin_activity', {
    p_admin_id: adminId,
    p_action_type: actionType,
    p_target_type: targetType,
    p_target_id: targetId,
    p_details: details || {},
    p_ip_address: ipAddress,
    p_user_agent: userAgent
  });

  if (error) throw error;
  return data;
};

export const createSystemNotification = async (
  title: string,
  message: string,
  notificationType: 'info' | 'warning' | 'error' | 'success' = 'info',
  targetRole?: 'super_admin' | 'admin' | 'student',
  targetUserId?: string,
  isSystemWide: boolean = false,
  createdBy?: string,
  expiresAt?: string
) => {
  const { data, error } = await supabase.rpc('create_system_notification', {
    p_title: title,
    p_message: message,
    p_notification_type: notificationType,
    p_target_role: targetRole,
    p_target_user_id: targetUserId,
    p_is_system_wide: isSystemWide,
    p_created_by: createdBy,
    p_expires_at: expiresAt
  });

  if (error) throw error;
  return data;
};

export const getSystemSetting = async (settingKey: string) => {
  const { data, error } = await supabase.rpc('get_system_setting', {
    p_setting_key: settingKey
  });

  if (error) throw error;
  return data;
};

export const updateSystemSetting = async (
  settingKey: string,
  settingValue: any,
  updatedBy: string
) => {
  const { data, error } = await supabase.rpc('update_system_setting', {
    p_setting_key: settingKey,
    p_setting_value: settingValue,
    p_updated_by: updatedBy
  });

  if (error) throw error;
  return data;
};

// Student-Admin assignment functions
export const assignStudentToAdmin = async (
  studentId: string,
  adminId: string,
  assignedBy: string
) => {
  const { data, error } = await supabase.rpc('assign_student_to_admin', {
    student_user_id: studentId,
    admin_user_id: adminId,
    assigned_by_user_id: assignedBy
  });

  if (error) throw error;
  return data;
};

export const getAssignedStudents = async (adminId: string) => {
  const { data, error } = await supabase.rpc('get_assigned_students', {
    admin_user_id: adminId
  });

  if (error) throw error;
  return data;
};

export const getAdminAssignmentStats = async () => {
  const { data, error } = await supabase.rpc('get_admin_assignment_stats');

  if (error) throw error;
  return data;
};