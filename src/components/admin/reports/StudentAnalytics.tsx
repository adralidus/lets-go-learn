import { Users, Award, TrendingUp, AlertTriangle } from 'lucide-react';

interface StudentPerformanceData {
  studentName: string;
  username: string;
  totalSubmissions: number;
  averageScore: number;
  totalScore: number;
  totalMaxScore: number;
}

interface StudentAnalyticsProps {
  data: StudentPerformanceData[];
}

export function StudentAnalytics({ data }: StudentAnalyticsProps) {
  const totalStudents = data.length;
  const overallAverage = data.length > 0 
    ? data.reduce((sum, student) => sum + student.averageScore, 0) / data.length 
    : 0;
  
  const topPerformer = data.reduce((best, current) => 
    current.averageScore > best.averageScore ? current : best, 
    data[0] || { studentName: 'N/A', averageScore: 0 }
  );
  
  const strugglingStudents = data.filter(student => student.averageScore < 70);
  const excellentStudents = data.filter(student => student.averageScore >= 90);

  const getEngagementLevel = (submissions: number) => {
    const avgSubmissions = data.length > 0 
      ? data.reduce((sum, s) => sum + s.totalSubmissions, 0) / data.length 
      : 0;
    
    if (submissions >= avgSubmissions * 1.2) return 'High';
    if (submissions >= avgSubmissions * 0.8) return 'Medium';
    return 'Low';
  };

  const getEngagementColor = (level: string) => {
    switch (level) {
      case 'High': return 'text-green-600 bg-green-100';
      case 'Medium': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-red-600 bg-red-100';
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Users className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Students</p>
              <p className="text-2xl font-semibold text-gray-900">{totalStudents}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Award className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Excellent Students</p>
              <p className="text-2xl font-semibold text-gray-900">{excellentStudents.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Class Average</p>
              <p className="text-2xl font-semibold text-gray-900">{Math.round(overallAverage)}%</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Need Support</p>
              <p className="text-2xl font-semibold text-gray-900">{strugglingStudents.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h4 className="text-lg font-medium text-gray-900 mb-4">Top Performer</h4>
          {topPerformer.studentName !== 'N/A' ? (
            <div className="flex items-center space-x-4 p-4 bg-green-50 rounded-lg">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <Award className="h-6 w-6 text-green-600" />
                </div>
              </div>
              <div className="flex-1">
                <h5 className="font-medium text-green-900">{topPerformer.studentName}</h5>
                <p className="text-sm text-green-700">@{topPerformer.username}</p>
                <p className="text-xs text-green-600">
                  {topPerformer.totalSubmissions} submissions
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-green-700">
                  {Math.round(topPerformer.averageScore)}%
                </p>
              </div>
            </div>
          ) : (
            <p className="text-gray-500">No student data available</p>
          )}
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h4 className="text-lg font-medium text-gray-900 mb-4">Students Needing Support</h4>
          {strugglingStudents.length > 0 ? (
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {strugglingStudents.slice(0, 5).map((student, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-red-50 rounded">
                  <div>
                    <p className="text-sm font-medium text-red-900">{student.studentName}</p>
                    <p className="text-xs text-red-600">@{student.username}</p>
                  </div>
                  <p className="text-sm font-semibold text-red-700">
                    {Math.round(student.averageScore)}%
                  </p>
                </div>
              ))}
              {strugglingStudents.length > 5 && (
                <p className="text-xs text-gray-500 text-center">
                  +{strugglingStudents.length - 5} more students
                </p>
              )}
            </div>
          ) : (
            <p className="text-green-600">All students performing well!</p>
          )}
        </div>
      </div>

      {/* Detailed Student List */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h4 className="text-lg font-medium text-gray-900 mb-4">Student Performance Details</h4>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Student
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Submissions
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Average Score
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Points
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Engagement
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.map((student, index) => {
                const engagementLevel = getEngagementLevel(student.totalSubmissions);
                return (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{student.studentName}</div>
                        <div className="text-sm text-gray-500">@{student.username}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{student.totalSubmissions}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm font-medium ${
                        student.averageScore >= 90 ? 'text-green-600' :
                        student.averageScore >= 80 ? 'text-blue-600' :
                        student.averageScore >= 70 ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>
                        {Math.round(student.averageScore)}%
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {student.totalScore}/{student.totalMaxScore}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getEngagementColor(engagementLevel)}`}>
                        {engagementLevel}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        student.averageScore >= 90 ? 'bg-green-100 text-green-800' :
                        student.averageScore >= 80 ? 'bg-blue-100 text-blue-800' :
                        student.averageScore >= 70 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {student.averageScore >= 90 ? 'Excellent' :
                         student.averageScore >= 80 ? 'Good' :
                         student.averageScore >= 70 ? 'Average' :
                         'Needs Support'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}