import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  FileText, 
  Calendar,
  Award,
  Clock,
  Target,
  PieChart,
  Download,
  Filter,
  RefreshCw
} from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { ExamPerformanceChart } from './reports/ExamPerformanceChart';
import { StudentPerformanceChart } from './reports/StudentPerformanceChart';
import { ExamStatistics } from './reports/ExamStatistics';
import { StudentAnalytics } from './reports/StudentAnalytics';
import { TimeAnalytics } from './reports/TimeAnalytics';
import { GradeDistribution } from './reports/GradeDistribution';

interface ReportData {
  totalExams: number;
  totalStudents: number;
  totalSubmissions: number;
  averageScore: number;
  completionRate: number;
  activeExams: number;
  recentActivity: any[];
  examPerformance: any[];
  studentPerformance: any[];
  gradeDistribution: any[];
  timeAnalytics: any[];
}

type DateRange = '7d' | '30d' | '3m' | '6m' | '1y' | 'all';
type ReportTab = 'overview' | 'exams' | 'students' | 'performance' | 'time' | 'grades';

export function ReportsManager() {
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [activeTab, setActiveTab] = useState<ReportTab>('overview');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchReportData();
  }, [dateRange]);

  const getDateRangeFilter = () => {
    const now = new Date();
    switch (dateRange) {
      case '7d':
        return subDays(now, 7);
      case '30d':
        return subDays(now, 30);
      case '3m':
        return subDays(now, 90);
      case '6m':
        return subDays(now, 180);
      case '1y':
        return subDays(now, 365);
      default:
        return new Date('2020-01-01'); // All time
    }
  };

  const fetchReportData = async () => {
    try {
      setLoading(true);
      const startDate = getDateRangeFilter();

      // Fetch basic statistics
      const [
        examsResult,
        studentsResult,
        submissionsResult,
        examPerformanceResult,
        studentPerformanceResult,
        gradeDistributionResult,
        timeAnalyticsResult
      ] = await Promise.all([
        // Total exams
        supabase
          .from('examinations')
          .select('id, title, is_active, created_at')
          .gte('created_at', startDate.toISOString()),

        // Total students
        supabase
          .from('users')
          .select('id, full_name, created_at')
          .eq('role', 'student')
          .gte('created_at', startDate.toISOString()),

        // Submissions with details
        supabase
          .from('exam_submissions')
          .select(`
            *,
            student:users!exam_submissions_student_id_fkey(id, full_name, username),
            examination:examinations(id, title)
          `)
          .gte('created_at', startDate.toISOString()),

        // Exam performance data
        supabase
          .from('exam_submissions')
          .select(`
            exam_id,
            total_score,
            max_score,
            status,
            submitted_at,
            examination:examinations(title)
          `)
          .in('status', ['submitted', 'graded'])
          .gte('submitted_at', startDate.toISOString()),

        // Student performance data
        supabase
          .from('exam_submissions')
          .select(`
            student_id,
            total_score,
            max_score,
            status,
            submitted_at,
            student:users!exam_submissions_student_id_fkey(full_name, username)
          `)
          .in('status', ['submitted', 'graded'])
          .gte('submitted_at', startDate.toISOString()),

        // Grade distribution
        supabase
          .from('exam_submissions')
          .select('total_score, max_score, status')
          .in('status', ['submitted', 'graded'])
          .gte('submitted_at', startDate.toISOString()),

        // Time analytics
        supabase
          .from('exam_submissions')
          .select('started_at, submitted_at, status')
          .gte('started_at', startDate.toISOString())
      ]);

      // Process the data
      const exams = examsResult.data || [];
      const students = studentsResult.data || [];
      const submissions = submissionsResult.data || [];
      const examPerformance = examPerformanceResult.data || [];
      const studentPerformance = studentPerformanceResult.data || [];
      const gradeDistribution = gradeDistributionResult.data || [];
      const timeAnalytics = timeAnalyticsResult.data || [];

      // Calculate statistics
      const completedSubmissions = submissions.filter(s => s.status === 'submitted' || s.status === 'graded');
      const totalScore = completedSubmissions.reduce((sum, s) => sum + s.total_score, 0);
      const totalMaxScore = completedSubmissions.reduce((sum, s) => sum + s.max_score, 0);
      const averageScore = totalMaxScore > 0 ? (totalScore / totalMaxScore) * 100 : 0;
      
      const totalPossibleSubmissions = exams.length * students.length;
      const completionRate = totalPossibleSubmissions > 0 ? (completedSubmissions.length / totalPossibleSubmissions) * 100 : 0;

      // Process exam performance
      const examPerformanceMap = new Map();
      examPerformance.forEach(submission => {
        const examTitle = submission.examination?.title || 'Unknown Exam';
        if (!examPerformanceMap.has(examTitle)) {
          examPerformanceMap.set(examTitle, {
            examTitle,
            totalSubmissions: 0,
            totalScore: 0,
            totalMaxScore: 0,
            averageScore: 0
          });
        }
        const exam = examPerformanceMap.get(examTitle);
        exam.totalSubmissions++;
        exam.totalScore += submission.total_score;
        exam.totalMaxScore += submission.max_score;
        exam.averageScore = exam.totalMaxScore > 0 ? (exam.totalScore / exam.totalMaxScore) * 100 : 0;
      });

      // Process student performance
      const studentPerformanceMap = new Map();
      studentPerformance.forEach(submission => {
        const studentName = submission.student?.full_name || 'Unknown Student';
        if (!studentPerformanceMap.has(studentName)) {
          studentPerformanceMap.set(studentName, {
            studentName,
            username: submission.student?.username || '',
            totalSubmissions: 0,
            totalScore: 0,
            totalMaxScore: 0,
            averageScore: 0
          });
        }
        const student = studentPerformanceMap.get(studentName);
        student.totalSubmissions++;
        student.totalScore += submission.total_score;
        student.totalMaxScore += submission.max_score;
        student.averageScore = student.totalMaxScore > 0 ? (student.totalScore / student.totalMaxScore) * 100 : 0;
      });

      // Process grade distribution
      const gradeRanges = { A: 0, B: 0, C: 0, D: 0, F: 0 };
      gradeDistribution.forEach(submission => {
        if (submission.max_score > 0) {
          const percentage = (submission.total_score / submission.max_score) * 100;
          if (percentage >= 90) gradeRanges.A++;
          else if (percentage >= 80) gradeRanges.B++;
          else if (percentage >= 70) gradeRanges.C++;
          else if (percentage >= 60) gradeRanges.D++;
          else gradeRanges.F++;
        }
      });

      const gradeDistributionData = Object.entries(gradeRanges).map(([grade, count]) => ({
        grade,
        count,
        percentage: gradeDistribution.length > 0 ? (count / gradeDistribution.length) * 100 : 0
      }));

      // Process time analytics
      const timeAnalyticsData = timeAnalytics
        .filter(s => s.started_at && s.submitted_at)
        .map(submission => {
          const startTime = new Date(submission.started_at).getTime();
          const endTime = new Date(submission.submitted_at).getTime();
          const duration = (endTime - startTime) / (1000 * 60); // minutes
          return {
            date: format(new Date(submission.submitted_at), 'yyyy-MM-dd'),
            duration,
            status: submission.status
          };
        });

      setReportData({
        totalExams: exams.length,
        totalStudents: students.length,
        totalSubmissions: submissions.length,
        averageScore: Math.round(averageScore),
        completionRate: Math.round(completionRate),
        activeExams: exams.filter(e => e.is_active).length,
        recentActivity: submissions.slice(0, 10),
        examPerformance: Array.from(examPerformanceMap.values()),
        studentPerformance: Array.from(studentPerformanceMap.values()),
        gradeDistribution: gradeDistributionData,
        timeAnalytics: timeAnalyticsData
      });
    } catch (error) {
      console.error('Error fetching report data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchReportData();
    setRefreshing(false);
  };

  const exportData = () => {
    if (!reportData) return;
    
    const dataToExport = {
      generatedAt: new Date().toISOString(),
      dateRange,
      summary: {
        totalExams: reportData.totalExams,
        totalStudents: reportData.totalStudents,
        totalSubmissions: reportData.totalSubmissions,
        averageScore: reportData.averageScore,
        completionRate: reportData.completionRate
      },
      examPerformance: reportData.examPerformance,
      studentPerformance: reportData.studentPerformance,
      gradeDistribution: reportData.gradeDistribution
    };

    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `exam-reports-${format(new Date(), 'yyyy-MM-dd')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const tabs = [
    { id: 'overview' as ReportTab, label: 'Overview', icon: BarChart3 },
    { id: 'exams' as ReportTab, label: 'Exam Analytics', icon: FileText },
    { id: 'students' as ReportTab, label: 'Student Analytics', icon: Users },
    { id: 'performance' as ReportTab, label: 'Performance', icon: TrendingUp },
    { id: 'time' as ReportTab, label: 'Time Analytics', icon: Clock },
    { id: 'grades' as ReportTab, label: 'Grade Distribution', icon: Award },
  ];

  const dateRangeOptions = [
    { value: '7d' as DateRange, label: 'Last 7 days' },
    { value: '30d' as DateRange, label: 'Last 30 days' },
    { value: '3m' as DateRange, label: 'Last 3 months' },
    { value: '6m' as DateRange, label: 'Last 6 months' },
    { value: '1y' as DateRange, label: 'Last year' },
    { value: 'all' as DateRange, label: 'All time' },
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!reportData) {
    return (
      <div className="text-center py-8">
        <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Data Available</h3>
        <p className="text-gray-600">Unable to load report data. Please try again.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">Reports & Analytics</h3>
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as DateRange)}
              className="text-sm border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {dateRangeOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="text-sm">Refresh</span>
          </button>
          
          <button
            onClick={exportData}
            className="flex items-center space-x-2 bg-blue-600 text-white px-3 py-2 rounded-md hover:bg-blue-700 transition-colors text-sm"
          >
            <Download className="h-4 w-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

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
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <FileText className="h-8 w-8 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Total Exams</p>
                    <p className="text-2xl font-semibold text-gray-900">{reportData.totalExams}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Users className="h-8 w-8 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Total Students</p>
                    <p className="text-2xl font-semibold text-gray-900">{reportData.totalStudents}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Target className="h-8 w-8 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Average Score</p>
                    <p className="text-2xl font-semibold text-gray-900">{reportData.averageScore}%</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <TrendingUp className="h-8 w-8 text-orange-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Completion Rate</p>
                    <p className="text-2xl font-semibold text-gray-900">{reportData.completionRate}%</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h4 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h4>
              <div className="space-y-3">
                {reportData.recentActivity.length > 0 ? (
                  reportData.recentActivity.map((activity, index) => (
                    <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                      <div className="flex items-center space-x-3">
                        <div className={`w-2 h-2 rounded-full ${
                          activity.status === 'submitted' ? 'bg-green-500' :
                          activity.status === 'graded' ? 'bg-blue-500' :
                          'bg-yellow-500'
                        }`}></div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {activity.student?.full_name || 'Unknown Student'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {activity.examination?.title || 'Unknown Exam'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-900">
                          {activity.total_score}/{activity.max_score}
                        </p>
                        <p className="text-xs text-gray-500">
                          {activity.submitted_at ? format(new Date(activity.submitted_at), 'MMM dd, HH:mm') : 'In progress'}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-4">No recent activity</p>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'exams' && <ExamStatistics data={reportData.examPerformance} />}
        {activeTab === 'students' && <StudentAnalytics data={reportData.studentPerformance} />}
        {activeTab === 'performance' && (
          <div className="space-y-6">
            <ExamPerformanceChart data={reportData.examPerformance} />
            <StudentPerformanceChart data={reportData.studentPerformance} />
          </div>
        )}
        {activeTab === 'time' && <TimeAnalytics data={reportData.timeAnalytics} />}
        {activeTab === 'grades' && <GradeDistribution data={reportData.gradeDistribution} />}
      </div>
    </div>
  );
}