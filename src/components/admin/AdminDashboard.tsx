import { useState } from 'react';
import { Layout } from '../Layout';
import { ExaminationManager } from './ExaminationManager';
import { UserManager } from './UserManager';
import { ExamReviewManager } from './ExamReviewManager';
import { ReportsManager } from './ReportsManager';
import { Users, FileText, BarChart3, ClipboardCheck } from 'lucide-react';

type TabType = 'examinations' | 'users' | 'reviews' | 'reports';

export function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<TabType>('examinations');

  const tabs = [
    { id: 'examinations' as TabType, label: 'Examinations', icon: FileText },
    { id: 'users' as TabType, label: 'Users', icon: Users },
    { id: 'reviews' as TabType, label: 'Exam Reviews', icon: ClipboardCheck },
    { id: 'reports' as TabType, label: 'Reports & Analytics', icon: BarChart3 },
  ];

  return (
    <Layout title="Admin Dashboard">
      <div className="space-y-6">
        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
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
          {activeTab === 'examinations' && <ExaminationManager />}
          {activeTab === 'users' && <UserManager />}
          {activeTab === 'reviews' && <ExamReviewManager onBack={() => setActiveTab('examinations')} />}
          {activeTab === 'reports' && <ReportsManager />}
        </div>
      </div>
    </Layout>
  );
}