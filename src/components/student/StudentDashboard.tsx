import { useState, useEffect } from 'react';
import { Layout } from '../Layout';
import { supabase, Examination, ExamSubmission } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Calendar, Clock, FileText, CheckCircle, XCircle, Play, Award, TrendingUp, Eye } from 'lucide-react';
import { format, isAfter, isBefore } from 'date-fns';
import { ExamTaking } from './ExamTaking';
import { ExamResults } from './ExamResults';

export function StudentDashboard() {
  const [examinations, setExaminations] = useState<Examination[]>([]);
  const [submissions, setSubmissions] = useState<ExamSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [takingExam, setTakingExam] = useState<Examination | null>(null);
  const [viewingResults, setViewingResults] = useState<ExamSubmission | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch active examinations
      const { data: examsData, error: examsError } = await supabase
        .from('examinations')
        .select('*')
        .eq('is_active', true)
        .order('scheduled_start', { ascending: true });

      if (examsError) throw examsError;

      // Fetch user's submissions
      const { data: submissionsData, error: submissionsError } = await supabase
        .from('exam_submissions')
        .select('*')
        .eq('student_id', user?.id)
        .order('created_at', { ascending: false });

      if (submissionsError) throw submissionsError;

      setExaminations(examsData || []);
      setSubmissions(submissionsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getExamStatus = (exam: Examination) => {
    const now = new Date();
    const start = new Date(exam.scheduled_start);
    const end = new Date(exam.scheduled_end);
    
    const submission = submissions.find(s => s.exam_id === exam.id);
    
    if (submission?.status === 'submitted') {
      return { status: 'completed', label: 'Completed', color: 'green' };
    }
    
    if (submission?.status === 'in_progress') {
      return { status: 'in_progress', label: 'In Progress', color: 'blue' };
    }
    
    if (isBefore(now, start)) {
      return { status: 'upcoming', label: 'Upcoming', color: 'yellow' };
    }
    
    if (isAfter(now, end)) {
      return { status: 'expired', label: 'Expired', color: 'red' };
    }
    
    return { status: 'available', label: 'Available', color: 'green' };
  };

  const canTakeExam = (exam: Examination) => {
    const now = new Date();
    const start = new Date(exam.scheduled_start);
    const end = new Date(exam.scheduled_end);
    const submission = submissions.find(s => s.exam_id === exam.id);
    
    return !submission && !isBefore(now, start) && !isAfter(now, end);
  };

  const canContinueExam = (exam: Examination) => {
    const submission = submissions.find(s => s.exam_id === exam.id);
    return submission?.status === 'in_progress';
  };

  const handleStartExam = (exam: Examination) => {
    setTakingExam(exam);
  };

  const handleExamComplete = () => {
    setTakingExam(null);
    fetchData();
  };

  const handleViewResults = (exam: Examination) => {
    const submission = submissions.find(s => s.exam_id === exam.id);
    if (submission) {
      setViewingResults(submission);
    }
  };

  const getLatestResults = () => {
    return submissions
      .filter(s => s.status === 'submitted' || s.status === 'graded')
      .slice(0, 3); // Show top 3 latest results
  };

  const getOverallStats = () => {
    const completedSubmissions = submissions.filter(s => s.status === 'submitted' || s.status === 'graded');
    const totalExams = completedSubmissions.length;
    
    if (totalExams === 0) {
      return { totalExams: 0, averageScore: 0, averagePercentage: 0 };
    }

    const totalScore = completedSubmissions.reduce((sum, s) => sum + s.total_score, 0);
    const totalMaxScore = completedSubmissions.reduce((sum, s) => sum + s.max_score, 0);
    
    const averageScore = totalScore / totalExams;
    const averagePercentage = totalMaxScore > 0 ? (totalScore / totalMaxScore) * 100 : 0;

    return { totalExams, averageScore, averagePercentage };
  };

  const getGradeColor = (percentage: number) => {
    if (percentage >= 90) return 'text-green-600';
    if (percentage >= 80) return 'text-blue-600';
    if (percentage >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getGradeLetter = (percentage: number) => {
    if (percentage >= 90) return 'A';
    if (percentage >= 80) return 'B';
    if (percentage >= 70) return 'C';
    if (percentage >= 60) return 'D';
    return 'F';
  };

  if (loading) {
    return (
      <Layout title="Student Dashboard">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  if (takingExam) {
    return <ExamTaking examination={takingExam} onComplete={handleExamComplete} />;
  }

  if (viewingResults) {
    return <ExamResults submission={viewingResults} onBack={() => setViewingResults(null)} />;
  }

  const latestResults = getLatestResults();
  const stats = getOverallStats();

  return (
    <Layout title="Student Dashboard">
      <div className="space-y-6">
        {/* Welcome Section */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Welcome back, {user?.full_name}!</h3>
          <p className="text-gray-600">Here are your available examinations and latest results.</p>
        </div>

        {/* Performance Overview */}
        {stats.totalExams > 0 && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-200">
            <div className="flex items-center space-x-2 mb-4">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-medium text-gray-900">Performance Overview</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{stats.totalExams}</div>
                <div className="text-sm text-gray-600">Exams Completed</div>
              </div>
              
              <div className="text-center">
                <div className={`text-2xl font-bold ${getGradeColor(stats.averagePercentage)}`}>
                  {Math.round(stats.averagePercentage)}%
                </div>
                <div className="text-sm text-gray-600">Average Score</div>
              </div>
              
              <div className="text-center">
                <div className={`text-2xl font-bold ${getGradeColor(stats.averagePercentage)}`}>
                  {getGradeLetter(stats.averagePercentage)}
                </div>
                <div className="text-sm text-gray-600">Average Grade</div>
              </div>
            </div>
          </div>
        )}

        {/* Latest Results */}
        {latestResults.length > 0 && (
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Award className="h-5 w-5 text-yellow-600" />
                <h3 className="text-lg font-medium text-gray-900">Latest Results</h3>
              </div>
              <span className="text-sm text-gray-500">Your most recent exam scores</span>
            </div>
            
            <div className="space-y-3">
              {latestResults.map((submission) => {
                const exam = examinations.find(e => e.id === submission.exam_id);
                const percentage = submission.max_score > 0 ? Math.round((submission.total_score / submission.max_score) * 100) : 0;
                
                return (
                  <div key={submission.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          percentage >= 70 ? 'bg-green-100' : 'bg-red-100'
                        }`}>
                          {percentage >= 70 ? (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-600" />
                          )}
                        </div>
                        
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{exam?.title || 'Unknown Exam'}</h4>
                          <p className="text-sm text-gray-600">
                            Submitted {submission.submitted_at ? format(new Date(submission.submitted_at), 'MMM dd, yyyy') : 'Unknown date'}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <div className={`text-lg font-bold ${getGradeColor(percentage)}`}>
                          {getGradeLetter(percentage)}
                        </div>
                        <div className="text-sm text-gray-600">
                          {submission.total_score}/{submission.max_score} ({percentage}%)
                        </div>
                      </div>
                      
                      <button
                        onClick={() => exam && handleViewResults(exam)}
                        className="flex items-center space-x-1 text-blue-600 hover:text-blue-800 transition-colors"
                      >
                        <Eye className="h-4 w-4" />
                        <span className="text-sm">View</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Available Examinations */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Available Examinations</h3>
          
          {examinations.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No examinations available</h3>
              <p className="text-gray-600">Check back later for new examinations from your instructors.</p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {examinations.map((exam) => {
                const status = getExamStatus(exam);
                const submission = submissions.find(s => s.exam_id === exam.id);
                
                return (
                  <div key={exam.id} className="bg-white p-6 rounded-lg shadow-sm border">
                    <div className="flex justify-between items-start mb-4">
                      <h4 className="text-lg font-medium text-gray-900 truncate">{exam.title}</h4>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        status.color === 'green' ? 'bg-green-100 text-green-800' :
                        status.color === 'blue' ? 'bg-blue-100 text-blue-800' :
                        status.color === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {status.label}
                      </span>
                    </div>

                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">{exam.description}</p>

                    <div className="space-y-2 text-sm mb-4">
                      <div className="flex items-center space-x-2 text-gray-600">
                        <Calendar className="h-4 w-4" />
                        <span>Start: {format(new Date(exam.scheduled_start), 'MMM dd, yyyy HH:mm')}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-gray-600">
                        <Calendar className="h-4 w-4" />
                        <span>End: {format(new Date(exam.scheduled_end), 'MMM dd, yyyy HH:mm')}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-gray-600">
                        <Clock className="h-4 w-4" />
                        <span>Duration: {exam.duration_minutes} minutes</span>
                      </div>
                    </div>

                    {submission && submission.status === 'submitted' && (
                      <div className="mb-4 p-3 bg-gray-50 rounded-md">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Score:</span>
                          <span className="font-medium">{submission.total_score}/{submission.max_score}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Percentage:</span>
                          <span className="font-medium">
                            {submission.max_score > 0 ? Math.round((submission.total_score / submission.max_score) * 100) : 0}%
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="flex space-x-2">
                      {canTakeExam(exam) && (
                        <button
                          onClick={() => handleStartExam(exam)}
                          className="flex-1 flex items-center justify-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                        >
                          <Play className="h-4 w-4" />
                          <span>Start Exam</span>
                        </button>
                      )}
                      
                      {canContinueExam(exam) && (
                        <button
                          onClick={() => handleStartExam(exam)}
                          className="flex-1 flex items-center justify-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
                        >
                          <Play className="h-4 w-4" />
                          <span>Continue</span>
                        </button>
                      )}
                      
                      {submission?.status === 'submitted' && (
                        <button
                          onClick={() => handleViewResults(exam)}
                          className="flex-1 flex items-center justify-center space-x-2 bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors"
                        >
                          <CheckCircle className="h-4 w-4" />
                          <span>View Results</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}