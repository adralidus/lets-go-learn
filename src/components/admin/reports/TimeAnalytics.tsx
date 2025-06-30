import { Clock, Calendar, TrendingUp } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface TimeAnalyticsData {
  date: string;
  duration: number;
  status: string;
}

interface TimeAnalyticsProps {
  data: TimeAnalyticsData[];
}

export function TimeAnalytics({ data }: TimeAnalyticsProps) {
  const averageDuration = data.length > 0 
    ? data.reduce((sum, item) => sum + item.duration, 0) / data.length 
    : 0;

  const longestSession = data.reduce((longest, current) => 
    current.duration > longest.duration ? current : longest, 
    data[0] || { duration: 0, date: '' }
  );

  const shortestSession = data.reduce((shortest, current) => 
    current.duration < shortest.duration ? current : shortest, 
    data[0] || { duration: 0, date: '' }
  );

  // Group by date for daily analytics
  const dailyData = data.reduce((acc, item) => {
    const date = item.date;
    if (!acc[date]) {
      acc[date] = { date, totalDuration: 0, count: 0, sessions: [] };
    }
    acc[date].totalDuration += item.duration;
    acc[date].count++;
    acc[date].sessions.push(item);
    return acc;
  }, {} as Record<string, any>);

  const dailyAnalytics = Object.values(dailyData).map((day: any) => ({
    ...day,
    averageDuration: day.totalDuration / day.count
  })).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const getDurationColor = (duration: number) => {
    if (duration > averageDuration * 1.5) return 'text-red-600';
    if (duration > averageDuration) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getDurationBg = (duration: number) => {
    if (duration > averageDuration * 1.5) return 'bg-red-100';
    if (duration > averageDuration) return 'bg-yellow-100';
    return 'bg-green-100';
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Clock className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Average Duration</p>
              <p className="text-2xl font-semibold text-gray-900">{formatDuration(averageDuration)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Sessions</p>
              <p className="text-2xl font-semibold text-gray-900">{data.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Clock className="h-8 w-8 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Longest Session</p>
              <p className="text-2xl font-semibold text-gray-900">{formatDuration(longestSession.duration)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Clock className="h-8 w-8 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Shortest Session</p>
              <p className="text-2xl font-semibold text-gray-900">{formatDuration(shortestSession.duration)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Duration Distribution */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h4 className="text-lg font-medium text-gray-900 mb-4">Session Duration Distribution</h4>
        <div className="space-y-3">
          {data.length > 0 ? (
            data.slice(0, 20).map((session, index) => (
              <div key={index} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${getDurationBg(session.duration)}`}></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      Session {index + 1}
                    </p>
                    <p className="text-xs text-gray-500">
                      {format(parseISO(session.date), 'MMM dd, yyyy')}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    session.status === 'submitted' ? 'bg-green-100 text-green-800' :
                    session.status === 'graded' ? 'bg-blue-100 text-blue-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {session.status}
                  </span>
                  
                  <p className={`text-sm font-semibold ${getDurationColor(session.duration)}`}>
                    {formatDuration(session.duration)}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-gray-500 text-center py-4">No session data available</p>
          )}
        </div>
      </div>

      {/* Daily Analytics */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h4 className="text-lg font-medium text-gray-900 mb-4">Daily Session Analytics</h4>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sessions
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Duration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Average Duration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Activity Level
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {dailyAnalytics.slice(0, 10).map((day, index) => {
                const activityLevel = day.count > 5 ? 'High' : day.count > 2 ? 'Medium' : 'Low';
                return (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {format(parseISO(day.date), 'MMM dd, yyyy')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{day.count}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{formatDuration(day.totalDuration)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm font-medium ${getDurationColor(day.averageDuration)}`}>
                        {formatDuration(day.averageDuration)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        activityLevel === 'High' ? 'bg-green-100 text-green-800' :
                        activityLevel === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {activityLevel}
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