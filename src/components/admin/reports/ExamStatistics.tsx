import { FileText, Target, Users, TrendingUp } from 'lucide-react';

interface ExamPerformanceData {
  examTitle: string;
  totalSubmissions: number;
  averageScore: number;
  totalScore: number;
  totalMaxScore: number;
}

interface ExamStatisticsProps {
  data: ExamPerformanceData[];
}

export function ExamStatistics({ data }: ExamStatisticsProps) {
  const totalSubmissions = data.reduce((sum, exam) => sum + exam.totalSubmissions, 0);
  const overallAverage = data.length > 0 
    ? data.reduce((sum, exam) => sum + exam.averageScore, 0) / data.length 
    : 0;
  
  const bestPerformingExam = data.reduce((best, current) => 
    current.averageScore > best.averageScore ? current : best, 
    data[0] || { examTitle: 'N/A', averageScore: 0 }
  );
  
  const worstPerformingExam = data.reduce((worst, current) => 
    current.averageScore < worst.averageScore ? current : worst, 
    data[0] || { examTitle: 'N/A', averageScore: 0 }
  );

  const getGradeDistribution = () => {
    const grades = { A: 0, B: 0, C: 0, D: 0, F: 0 };
    data.forEach(exam => {
      const score = exam.averageScore;
      if (score >= 90) grades.A++;
      else if (score >= 80) grades.B++;
      else if (score >= 70) grades.C++;
      else if (score >= 60) grades.D++;
      else grades.F++;
    });
    return grades;
  };

  const gradeDistribution = getGradeDistribution();

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <FileText className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Exams</p>
              <p className="text-2xl font-semibold text-gray-900">{data.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Users className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Submissions</p>
              <p className="text-2xl font-semibold text-gray-900">{totalSubmissions}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Target className="h-8 w-8 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Overall Average</p>
              <p className="text-2xl font-semibold text-gray-900">{Math.round(overallAverage)}%</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <TrendingUp className="h-8 w-8 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Avg Submissions/Exam</p>
              <p className="text-2xl font-semibold text-gray-900">
                {data.length > 0 ? Math.round(totalSubmissions / data.length) : 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h4 className="text-lg font-medium text-gray-900 mb-4">Performance Insights</h4>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-green-800">Best Performing Exam</p>
                <p className="text-xs text-green-600">{bestPerformingExam.examTitle}</p>
              </div>
              <p className="text-lg font-semibold text-green-700">
                {Math.round(bestPerformingExam.averageScore)}%
              </p>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-red-800">Needs Improvement</p>
                <p className="text-xs text-red-600">{worstPerformingExam.examTitle}</p>
              </div>
              <p className="text-lg font-semibold text-red-700">
                {Math.round(worstPerformingExam.averageScore)}%
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h4 className="text-lg font-medium text-gray-900 mb-4">Grade Distribution</h4>
          <div className="space-y-3">
            {Object.entries(gradeDistribution).map(([grade, count]) => (
              <div key={grade} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                    grade === 'A' ? 'bg-green-100 text-green-800' :
                    grade === 'B' ? 'bg-blue-100 text-blue-800' :
                    grade === 'C' ? 'bg-yellow-100 text-yellow-800' :
                    grade === 'D' ? 'bg-orange-100 text-orange-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {grade}
                  </span>
                  <span className="text-sm text-gray-700">Grade {grade}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-900">{count}</span>
                  <span className="text-xs text-gray-500">
                    ({data.length > 0 ? Math.round((count / data.length) * 100) : 0}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Detailed Exam List */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h4 className="text-lg font-medium text-gray-900 mb-4">Detailed Exam Performance</h4>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Exam Title
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
                  Performance
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.map((exam, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{exam.examTitle}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{exam.totalSubmissions}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`text-sm font-medium ${
                      exam.averageScore >= 90 ? 'text-green-600' :
                      exam.averageScore >= 80 ? 'text-blue-600' :
                      exam.averageScore >= 70 ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      {Math.round(exam.averageScore)}%
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {exam.totalScore}/{exam.totalMaxScore}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      exam.averageScore >= 90 ? 'bg-green-100 text-green-800' :
                      exam.averageScore >= 80 ? 'bg-blue-100 text-blue-800' :
                      exam.averageScore >= 70 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {exam.averageScore >= 90 ? 'Excellent' :
                       exam.averageScore >= 80 ? 'Good' :
                       exam.averageScore >= 70 ? 'Average' :
                       'Needs Improvement'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}