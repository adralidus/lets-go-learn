import { useState, useEffect } from 'react';
import { supabase, UserSession, logAdminActivity } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Monitor, X, RefreshCw, AlertTriangle } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

export function UserSessions() {
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const { data, error } = await supabase
        .from('user_sessions')
        .select(`
          *,
          user:users!user_sessions_user_id_fkey(full_name, username, role, email)
        `)
        .order('last_activity', { ascending: false });

      if (error) throw error;
      setSessions(data || []);
    } catch (error) {
      console.error('Error fetching user sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchSessions();
    setRefreshing(false);
  };

  const handleTerminateSession = async (session: UserSession) => {
    if (!confirm(`Are you sure you want to terminate ${session.user?.full_name}'s session?`)) return;

    try {
      const { error } = await supabase
        .from('user_sessions')
        .update({ is_active: false })
        .eq('id', session.id);

      if (error) throw error;

      // Log the activity
      if (user) {
        await logAdminActivity(
          user.id,
          'terminate',
          'user_session',
          session.id,
          {
            terminated_user: session.user?.full_name,
            session_duration: formatDistanceToNow(new Date(session.created_at))
          }
        );
      }

      fetchSessions();
    } catch (error) {
      console.error('Error terminating session:', error);
      alert('Error terminating session. Please try again.');
    }
  };

  const handleTerminateAllSessions = async () => {
    if (!confirm('Are you sure you want to terminate ALL active sessions? This will log out all users.')) return;

    try {
      const activeSessions = sessions.filter(s => s.is_active);
      
      const { error } = await supabase
        .from('user_sessions')
        .update({ is_active: false })
        .eq('is_active', true);

      if (error) throw error;

      // Log the activity
      if (user) {
        await logAdminActivity(
          user.id,
          'terminate_all',
          'user_sessions',
          undefined,
          {
            terminated_count: activeSessions.length,
            action: 'mass_logout'
          }
        );
      }

      fetchSessions();
      alert(`Successfully terminated ${activeSessions.length} active sessions.`);
    } catch (error) {
      console.error('Error terminating all sessions:', error);
      alert('Error terminating sessions. Please try again.');
    }
  };

  const getSessionStatus = (session: UserSession) => {
    if (!session.is_active) return { status: 'Terminated', color: 'bg-red-100 text-red-800' };
    
    const now = new Date();
    const lastActivity = new Date(session.last_activity);
    const expiresAt = new Date(session.expires_at);
    
    if (now > expiresAt) return { status: 'Expired', color: 'bg-yellow-100 text-yellow-800' };
    
    const minutesSinceActivity = (now.getTime() - lastActivity.getTime()) / (1000 * 60);
    if (minutesSinceActivity > 30) return { status: 'Idle', color: 'bg-orange-100 text-orange-800' };
    
    return { status: 'Active', color: 'bg-green-100 text-green-800' };
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'super_admin': return 'bg-purple-100 text-purple-800';
      case 'admin': return 'bg-blue-100 text-blue-800';
      case 'student': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const activeSessions = sessions.filter(s => s.is_active);
  const totalSessions = sessions.length;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <Monitor className="h-6 w-6 text-purple-600" />
          <h3 className="text-lg font-medium text-gray-900">User Sessions</h3>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="text-sm">Refresh</span>
          </button>
          
          {activeSessions.length > 0 && (
            <button
              onClick={handleTerminateAllSessions}
              className="flex items-center space-x-2 bg-red-600 text-white px-3 py-2 rounded-md hover:bg-red-700 transition-colors text-sm"
            >
              <AlertTriangle className="h-4 w-4" />
              <span>Terminate All</span>
            </button>
          )}
        </div>
      </div>

      {/* Session Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Monitor className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Sessions</p>
              <p className="text-2xl font-semibold text-gray-900">{totalSessions}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Monitor className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Active Sessions</p>
              <p className="text-2xl font-semibold text-gray-900">{activeSessions.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Monitor className="h-8 w-8 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Admin Sessions</p>
              <p className="text-2xl font-semibold text-gray-900">
                {activeSessions.filter(s => s.user?.role === 'admin' || s.user?.role === 'super_admin').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Monitor className="h-8 w-8 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Student Sessions</p>
              <p className="text-2xl font-semibold text-gray-900">
                {activeSessions.filter(s => s.user?.role === 'student').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Sessions Table */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3  text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Activity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Session Info
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sessions.map((session) => {
                const sessionStatus = getSessionStatus(session);
                
                return (
                  <tr key={session.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                            session.user?.role === 'super_admin' ? 'bg-purple-100' :
                            session.user?.role === 'admin' ? 'bg-blue-100' : 'bg-green-100'
                          }`}>
                            <Monitor className={`h-5 w-5 ${
                              session.user?.role === 'super_admin' ? 'text-purple-600' :
                              session.user?.role === 'admin' ? 'text-blue-600' : 'text-green-600'
                            }`} />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {session.user?.full_name || 'Unknown User'}
                          </div>
                          <div className="text-sm text-gray-500">
                            @{session.user?.username || 'unknown'}
                          </div>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(session.user?.role || 'unknown')}`}>
                            {session.user?.role?.replace('_', ' ') || 'Unknown'}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${sessionStatus.color}`}>
                        {sessionStatus.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div>
                        <div>{format(new Date(session.last_activity), 'MMM dd, yyyy HH:mm')}</div>
                        <div className="text-xs text-gray-400">
                          {formatDistanceToNow(new Date(session.last_activity), { addSuffix: true })}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      <div className="space-y-1">
                        <div>
                          <span className="font-medium">Created:</span> {format(new Date(session.created_at), 'MMM dd, HH:mm')}
                        </div>
                        <div>
                          <span className="font-medium">Expires:</span> {format(new Date(session.expires_at), 'MMM dd, HH:mm')}
                        </div>
                        {session.ip_address && (
                          <div>
                            <span className="font-medium">IP:</span> {session.ip_address}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {session.is_active && (
                        <button
                          onClick={() => handleTerminateSession(session)}
                          className="text-red-600 hover:text-red-900 transition-colors"
                          title="Terminate Session"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {sessions.length === 0 && (
            <div className="text-center py-12">
              <Monitor className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No user sessions found</h3>
              <p className="text-gray-600">User sessions will appear here when users log in.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}