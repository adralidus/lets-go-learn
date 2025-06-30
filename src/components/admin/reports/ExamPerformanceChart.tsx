import { BarChart3 } from 'lucide-react';

interface ExamPerformanceData {
  examTitle: string;
  totalSubmissions: number;
  averageScore: number;
  totalScore: number;
  totalMaxScore: number;
}

interface ExamPerformanceChartProps {
  data: ExamPerformanceData[];
}

export function ExamPerformanceChart({ data }: ExamPerformanceChartProps) {
  const maxScore = Math.max(...data.map(d => d.averageScore), 100);

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'bg-green-500';
    if (score >= 80) return 'bg-blue-500';
    if (score >= 70) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getScoreTextColor = (score: number) => {
    if (score >= 90) return 'text-green-700';
    if (score >= 80) return 'text-blue-700';
    if (score >= 70) return 'text-yellow-700';
    return 'text-red-700';
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border">
      <div className="flex items-center space-x-2 mb-6">
        <BarChart3 className="h-5 w-5 text-blue-600" />
        <h4 className="text-lg font-medium text-gray-900">Exam Performance Analysis</h4>
      </div>

      {data.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">No exam performance data available</p>
        </div>
      ) : (
        <div className="space-y-4">
          {data.map((exam, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex-1">
                  <h5 className="font-medium text-gray-900 truncate">{exam.examTitle}</h5>
                  <p className="text-sm text-gray-600">
                    {exam.totalSubmissions} submission{exam.totalSubmissions !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="text-right">
                  <p className={`text-lg font-semibold ${getScoreTextColor(exam.averageScore)}`}>
                    {Math.round(exam.averageScore)}%
                  </p>
                  <p className="text-sm text-gray-600">
                    {exam.totalScore}/{exam.totalMaxScore} pts
                  </p>
                </div>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all duration-300 ${getScoreColor(exam.averageScore)}`}
                  style={{ width: `${(exam.averageScore / maxScore) * 100}%` }}
                ></div>
              </div>
              
              <div className="mt-2 flex justify-between text-xs text-gray-500">
                <span>0%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}