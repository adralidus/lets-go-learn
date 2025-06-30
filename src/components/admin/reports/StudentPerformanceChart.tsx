import { Users, TrendingUp, TrendingDown } from 'lucide-react';

interface StudentPerformanceData {
  studentName: string;
  username: string;
  totalSubmissions: number;
  averageScore: number;
  totalScore: number;
  totalMaxScore: number;
}

interface StudentPerformanceChartProps {
  data: StudentPerformanceData[];
}

export function StudentPerformanceChart({ data }: StudentPerformanceChartProps) {
  // Sort students by average score (descending)
  const sortedData = [...data].sort((a, b) => b.averageScore - a.averageScore);
  const topPerformers = sortedData.slice(0, 10);
  
  const overallAverage = data.length > 0 
    ? data.reduce((sum, student) => sum + student.averageScore, 0) / data.length 
    : 0;

  const getPerformanceIcon = (score: number) => {
    if (score > overallAverage) {
      return <TrendingUp className="h-4 w-4 text-green-600" />;
    }
    return <TrendingDown className="h-4 w-4 text-red-600" />;
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 80) return 'text-blue-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBg = (score: number) => {
    if (score >= 90) return 'bg-green-100';
    if (score >= 80) return 'bg-blue-100';
    if (score >= 70) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <Users className="h-5 w-5 text-blue-600" />
          <h4 className="text-lg font-medium text-gray-900">Student Performance Rankings</h4>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-600">Class Average</p>
          <p className="text-lg font-semibold text-gray-900">{Math.round(overallAverage)}%</p>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">No student performance data available</p>
        </div>
      ) : (
        <div className="space-y-3">
          {topPerformers.map((student, index) => (
            <div key={index} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${getScoreBg(student.averageScore)}`}>
                    #{index + 1}
                  </div>
                </div>
                <div>
                  <h5 className="font-medium text-gray-900">{student.studentName}</h5>
                  <p className="text-sm text-gray-600">@{student.username}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="text-center">
                  <p className="text-sm text-gray-600">Submissions</p>
                  <p className="font-medium text-gray-900">{student.totalSubmissions}</p>
                </div>
                
                <div className="text-center">
                  <p className="text-sm text-gray-600">Total Points</p>
                  <p className="font-medium text-gray-900">{student.totalScore}/{student.totalMaxScore}</p>
                </div>
                
                <div className="flex items-center space-x-2">
                  {getPerformanceIcon(student.averageScore)}
                  <div className="text-right">
                    <p className={`text-lg font-semibold ${getScoreColor(student.averageScore)}`}>
                      {Math.round(student.averageScore)}%
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          {data.length > 10 && (
            <div className="text-center py-4 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                Showing top 10 of {data.length} students
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}