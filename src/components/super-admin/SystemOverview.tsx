import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  Users, 
  Shield, 
  GraduationCap, 
  FileText, 
  Activity, 
  Monitor,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react';
import { format, subDays } from 'date-fns';

interface SystemStats {
  totalUsers: number;
  totalAdmins: number;
  totalStudents: number;
  totalExams: number;
  totalSubmissions: number;
  activeExams: number;
  recentActivity: number;
  activeSessions: number;
  systemHealth: 'healthy' | 'warning' | 'critical';
}

export function SystemOverview() {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSystemStats();
    fetchRecentActivities();
  }, []);

  const fetchSystemStats = async () => {
    try {
      const [
        usersResult,
        examsResult,
        submissionsResult,
        activitiesResult,
        sessionsResult
      ] = await Promise.all([
        supabase.from('users').select('id, role'),
        supabase.from('examinations').select('id, is_active'),
        supabase.from('exam_submissions').select('id, status'),
        supabase.from('admin_activity_logs').select('id').gte('created_at', subDays(new Date(), 7).toISOString()),
        supabase.from('user_sessions').select('id, is_active').eq('is_active', true)
      ]);

      const users = usersResult.data || [];
      const exams = examsResult.data || [];
      const submissions = submissionsResult.data || [];
      const activities = activitiesResult.data || [];
      const sessions = sessionsResult.data || [];

      const totalAdmins = users.filter(u => u.role === 'admin' || u.role === 'super_admin').length;
      const totalStudents = users.filter(u => u.role === 'student').length;
      const activeExams = exams.filter(e => e.is_active).length;

      // Determine system health
      let systemHealth: 'healthy' | 'warning' | 'critical' = 'healthy';
      if (sessions.length > users.length * 2) systemHealth = 'warning';
      if (activeExams === 0 && exams.length > 0) systemHealth = 'warning';
      if (totalAdmins === 0) systemHealth = 'critical';

      setStats({
        totalUsers: users.length,
        totalAdmins,
        totalStudents,
        totalExams: exams.length,
        totalSubmissions: submissions.length,
        activeExams,
        recentActivity: activities.length,
        activeSessions: sessions.length,
        systemHealth
      });
    } catch (error) {
      console.error('Error fetching system stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentActivities = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_activity_logs')
        .select(`
          *,
          admin:users!admin_activity_logs_admin_id_fkey(full_name, username, role)
        `)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setRecentActivities(data || []);
    } catch (error) {
      console.error('Error fetching recent activities:', error);
    }
  };

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'healthy': return 'text-green-600 bg-green-100';
      case 'warning': return 'text-yellow-600 bg-yellow-100';
      case 'critical': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getHealthIcon = (health: string) => {
    switch (health) {
      case 'healthy': return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'warning': return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'critical': return <AlertTriangle className="h-5 w-5 text-red-600" />;
      default: return <Clock className="h-5 w-5 text-gray-600" />;
    }
  };

  const getActionTypeColor = (actionType: string) => {
    switch (actionType.toLowerCase()) {
      case 'login': return 'bg-green-100 text-green-800';
      case 'logout': return 'bg-gray-100 text-gray-800';
      case 'create': return 'bg-blue-100 text-blue-800';
      case 'update': return 'bg-yellow-100 text-yellow-800';
      case 'delete': return 'bg-red-100 text-red-800';
      default: return 'bg-purple-100 text-purple-800';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* System Health Status */}
      {stats && (
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">System Health Status</h3>
            <div className={`flex items-center space-x-2 px-3 py-1 rounded-full ${getHealthColor(stats.systemHealth)}`}>
              {getHealthIcon(stats.systemHealth)}
              <span className="text-sm font-medium capitalize">{stats.systemHealth}</span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-blue-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-blue-600">Total Users</p>
                  <p className="text-2xl font-semibold text-blue-900">{stats.totalUsers}</p>
                </div>
              </div>
            </div>

            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="flex items-center">
                <Shield className="h-8 w-8 text-purple-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-purple-600">Administrators</p>
                  <p className="text-2xl font-semibold text-purple-900">{stats.totalAdmins}</p>
                </div>
              </div>
            </div>

            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center">
                <GraduationCap className="h-8 w-8 text-green-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-green-600">Students</p>
                  <p className="text-2xl font-semibold text-green-900">{stats.totalStudents}</p>
                </div>
              </div>
            </div>

            <div className="bg-orange-50 p-4 rounded-lg">
              <div className="flex items-center">
                <FileText className="h-8 w-8 text-orange-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-orange-600">Active Exams</p>
                  <p className="text-2xl font-semibold text-orange-900">{stats.activeExams}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Key Metrics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FileText className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Exams</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.totalExams}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Submissions</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.totalSubmissions}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Activity className="h-8 w-8 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Recent Activity (7d)</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.recentActivity}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Monitor className="h-8 w-8 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Active Sessions</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.activeSessions}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Admin Activities */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Admin Activities</h3>
        <div className="space-y-3">
          {recentActivities.length > 0 ? (
            recentActivities.map((activity, index) => (
              <div key={index} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
                <div className="flex items-center space-x-3">
                  <div className={`px-2 py-1 text-xs rounded-full ${getActionTypeColor(activity.action_type)}`}>
                    {activity.action_type}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {activity.admin?.full_name || 'Unknown Admin'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {activity.target_type} • @{activity.admin?.username}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">
                    {format(new Date(activity.created_at), 'MMM dd, HH:mm')}
                  </p>
                  <div className={`inline-flex px-2 py-1 text-xs rounded-full ${
                    activity.admin?.role === 'super_admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {activity.admin?.role?.replace('_', ' ') || 'Unknown'}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="text-gray-500 text-center py-4">No recent admin activities</p>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <button className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <Shield className="h-6 w-6 text-blue-600" />
            <div className="text-left">
              <p className="text-sm font-medium text-gray-900">Create Admin</p>
              <p className="text-xs text-gray-500">Add new administrator</p>
            </div>
          </button>

          <button className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <Settings className="h-6 w-6 text-green-600" />
            <div className="text-left">
              <p className="text-sm font-medium text-gray-900">System Settings</p>
              <p className="text-xs text-gray-500">Configure system</p>
            </div>
          </button>

          <button className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <Activity className="h-6 w-6 text-purple-600" />
            <div className="text-left">
              <p className="text-sm font-medium text-gray-900">View Logs</p>
              <p className="text-xs text-gray-500">Check activity logs</p>
            </div>
          </button>

          <button className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <Bell className="h-6 w-6 text-orange-600" />
            <div className="text-left">
              <p className="text-sm font-medium text-gray-900">Send Notification</p>
              <p className="text-xs text-gray-500">Broadcast message</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}