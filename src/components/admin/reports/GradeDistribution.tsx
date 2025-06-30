import { Award, PieChart, TrendingUp } from 'lucide-react';

interface GradeDistributionData {
  grade: string;
  count: number;
  percentage: number;
}

interface GradeDistributionProps {
  data: GradeDistributionData[];
}

export function GradeDistribution({ data }: GradeDistributionProps) {
  const totalSubmissions = data.reduce((sum, item) => sum + item.count, 0);
  
  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A': return { bg: 'bg-green-500', text: 'text-green-600', light: 'bg-green-100' };
      case 'B': return { bg: 'bg-blue-500', text: 'text-blue-600', light: 'bg-blue-100' };
      case 'C': return { bg: 'bg-yellow-500', text: 'text-yellow-600', light: 'bg-yellow-100' };
      case 'D': return { bg: 'bg-orange-500', text: 'text-orange-600', light: 'bg-orange-100' };
      case 'F': return { bg: 'bg-red-500', text: 'text-red-600', light: 'bg-red-100' };
      default: return { bg: 'bg-gray-500', text: 'text-gray-600', light: 'bg-gray-100' };
    }
  };

  const getGradeDescription = (grade: string) => {
    switch (grade) {
      case 'A': return '90-100% (Excellent)';
      case 'B': return '80-89% (Good)';
      case 'C': return '70-79% (Average)';
      case 'D': return '60-69% (Below Average)';
      case 'F': return '0-59% (Failing)';
      default: return '';
    }
  };

  const passingRate = data
    .filter(item => ['A', 'B', 'C', 'D'].includes(item.grade))
    .reduce((sum, item) => sum + item.percentage, 0);

  const excellenceRate = data
    .filter(item => ['A', 'B'].includes(item.grade))
    .reduce((sum, item) => sum + item.percentage, 0);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <PieChart className="h-8 w-8 text-blue-600" />
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
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Passing Rate</p>
              <p className="text-2xl font-semibold text-gray-900">{Math.round(passingRate)}%</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Award className="h-8 w-8 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Excellence Rate</p>
              <p className="text-2xl font-semibold text-gray-900">{Math.round(excellenceRate)}%</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Award className="h-8 w-8 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Most Common Grade</p>
              <p className="text-2xl font-semibold text-gray-900">
                {data.reduce((max, current) => current.count > max.count ? current : max, data[0] || { grade: 'N/A' }).grade}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Grade Distribution Chart */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h4 className="text-lg font-medium text-gray-900 mb-6">Grade Distribution Overview</h4>
        
        <div className="space-y-4">
          {data.map((item, index) => {
            const colors = getGradeColor(item.grade);
            const maxCount = Math.max(...data.map(d => d.count));
            const barWidth = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
            
            return (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${colors.bg}`}>
                      {item.grade}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Grade {item.grade}</p>
                      <p className="text-xs text-gray-500">{getGradeDescription(item.grade)}</p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className="text-lg font-semibold text-gray-900">{item.count}</p>
                    <p className="text-sm text-gray-500">{Math.round(item.percentage)}%</p>
                  </div>
                </div>
                
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full transition-all duration-500 ${colors.bg}`}
                    style={{ width: `${barWidth}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Performance Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h4 className="text-lg font-medium text-gray-900 mb-4">Performance Insights</h4>
          <div className="space-y-4">
            <div className={`p-4 rounded-lg ${passingRate >= 80 ? 'bg-green-50' : passingRate >= 60 ? 'bg-yellow-50' : 'bg-red-50'}`}>
              <div className="flex items-center space-x-2">
                <TrendingUp className={`h-5 w-5 ${passingRate >= 80 ? 'text-green-600' : passingRate >= 60 ? 'text-yellow-600' : 'text-red-600'}`} />
                <p className={`font-medium ${passingRate >= 80 ? 'text-green-800' : passingRate >= 60 ? 'text-yellow-800' : 'text-red-800'}`}>
                  Passing Rate: {Math.round(passingRate)}%
                </p>
              </div>
              <p className={`text-sm mt-1 ${passingRate >= 80 ? 'text-green-700' : passingRate >= 60 ? 'text-yellow-700' : 'text-red-700'}`}>
                {passingRate >= 80 ? 'Excellent class performance!' :
                 passingRate >= 60 ? 'Good performance with room for improvement.' :
                 'Class may need additional support.'}
              </p>
            </div>
            
            <div className={`p-4 rounded-lg ${excellenceRate >= 50 ? 'bg-purple-50' : excellenceRate >= 25 ? 'bg-blue-50' : 'bg-gray-50'}`}>
              <div className="flex items-center space-x-2">
                <Award className={`h-5 w-5 ${excellenceRate >= 50 ? 'text-purple-600' : excellenceRate >= 25 ? 'text-blue-600' : 'text-gray-600'}`} />
                <p className={`font-medium ${excellenceRate >= 50 ? 'text-purple-800' : excellenceRate >= 25 ? 'text-blue-800' : 'text-gray-800'}`}>
                  Excellence Rate: {Math.round(excellenceRate)}%
                </p>
              </div>
              <p className={`text-sm mt-1 ${excellenceRate >= 50 ? 'text-purple-700' : excellenceRate >= 25 ? 'text-blue-700' : 'text-gray-700'}`}>
                {excellenceRate >= 50 ? 'Outstanding! Many students achieving excellence.' :
                 excellenceRate >= 25 ? 'Good number of high achievers.' :
                 'Consider strategies to help more students excel.'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h4 className="text-lg font-medium text-gray-900 mb-4">Grade Statistics</h4>
          <div className="space-y-3">
            {data.map((item, index) => {
              const colors = getGradeColor(item.grade);
              return (
                <div key={index} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-6 h-6 rounded-full ${colors.light} flex items-center justify-center`}>
                      <span className={`text-xs font-bold ${colors.text}`}>{item.grade}</span>
                    </div>
                    <span className="text-sm font-medium text-gray-700">Grade {item.grade}</span>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <span className="text-sm text-gray-600">{item.count} students</span>
                    <span className={`text-sm font-semibold ${colors.text}`}>
                      {Math.round(item.percentage)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}