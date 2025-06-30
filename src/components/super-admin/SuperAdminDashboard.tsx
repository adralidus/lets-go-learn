import { useState } from 'react';
import { Layout } from '../Layout';
import { AdminManager } from './AdminManager';
import { StudentManager } from './StudentManager';
import { SystemSettings } from './SystemSettings';
import { ActivityLogs } from './ActivityLogs';
import { UserSessions } from './UserSessions';
import { SystemNotifications } from './SystemNotifications';
import { AdminPermissions } from './AdminPermissions';
import { SystemOverview } from './SystemOverview';
import { 
  Shield, 
  Users, 
  GraduationCap, 
  Settings, 
  Activity, 
  Monitor, 
  Bell, 
  Key,
  BarChart3
} from 'lucide-react';

type TabType = 'overview' | 'admins' | 'students' | 'settings' | 'activity' | 'sessions' | 'notifications' | 'permissions';

export function SuperAdminDashboard() {
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  const tabs = [
    { id: 'overview' as TabType, label: 'System Overview', icon: BarChart3 },
    { id: 'admins' as TabType, label: 'Instructor Management', icon: Shield },
    { id: 'students' as TabType, label: 'Student Management', icon: GraduationCap },
    { id: 'permissions' as TabType, label: 'Instructor Permissions', icon: Key },
    { id: 'settings' as TabType, label: 'System Settings', icon: Settings },
    { id: 'activity' as TabType, label: 'Activity Logs', icon: Activity },
    { id: 'sessions' as TabType, label: 'User Sessions', icon: Monitor },
    { id: 'notifications' as TabType, label: 'Notifications', icon: Bell },
  ];

  return (
    <Layout title="Super Admin Dashboard">
      <div className="space-y-6">
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-6 rounded-lg shadow-lg">
          <div className="flex items-center space-x-3">
            <Shield className="h-8 w-8" />
            <div>
              <h2 className="text-2xl font-bold">Super Administrator Panel</h2>
              <p className="text-purple-100">Complete system control and oversight</p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-purple-500 text-purple-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="mt-6">
          {activeTab === 'overview' && <SystemOverview />}
          {activeTab === 'admins' && <AdminManager />}
          {activeTab === 'students' && <StudentManager />}
          {activeTab === 'permissions' && <AdminPermissions />}
          {activeTab === 'settings' && <SystemSettings />}
          {activeTab === 'activity' && <ActivityLogs />}
          {activeTab === 'sessions' && <UserSessions />}
          {activeTab === 'notifications' && <SystemNotifications />}
        </div>
      </div>
    </Layout>
  );
}