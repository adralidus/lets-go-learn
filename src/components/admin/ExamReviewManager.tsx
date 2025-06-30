import { useState, useEffect } from 'react';
import { supabase, ExamSubmissionWithDetails, ExamAnswerWithQuestion, User } from '../../lib/supabase';
import { ArrowLeft, User as UserIcon, Clock, FileText, CheckCircle, XCircle, Edit3, Users } from 'lucide-react';
import { format } from 'date-fns';

interface ExamReviewManagerProps {
  onBack: () => void;
}

export function ExamReviewManager({ onBack }: ExamReviewManagerProps) {
  const [submissions, setSubmissions] = useState<ExamSubmissionWithDetails[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [selectedSubmission, setSelectedSubmission] = useState<ExamSubmissionWithDetails | null>(null);
  const [submissionAnswers, setSubmissionAnswers] = useState<ExamAnswerWithQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewLoading, setReviewLoading] = useState(false);

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    try {
      // Fetch all submissions with student and exam details
      const { data: submissionsData, error: submissionsError } = await supabase
        .from('exam_submissions')
        .select(`
          *,
          student:users!exam_submissions_student_id_fkey(*),
          examination:examinations(*)
        `)
        .order('submitted_at', { ascending: false });

      if (submissionsError) throw submissionsError;

      // Fetch all students who have submissions
      const { data: studentsData, error: studentsError } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'student')
        .order('full_name');

      if (studentsError) throw studentsError;

      // Filter students to only include those with submissions
      const studentsWithSubmissions = studentsData?.filter(student => 
        submissionsData?.some(submission => submission.student_id === student.id)
      ) || [];

      setSubmissions(submissionsData || []);
      setStudents(studentsWithSubmissions);
    } catch (error) {
      console.error('Error fetching submissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubmissionDetails = async (submission: ExamSubmissionWithDetails) => {
    setReviewLoading(true);
    try {
      // Fetch answers with question details
      const { data: answersData, error: answersError } = await supabase
        .from('exam_answers')
        .select(`
          *,
          question:exam_questions(*)
        `)
        .eq('submission_id', submission.id);

      if (answersError) throw answersError;

      // Sort the answers by question order_index on the client side
      const sortedAnswers = (answersData || []).sort((a, b) => {
        const orderA = a.question?.order_index || 0;
        const orderB = b.question?.order_index || 0;
        return orderA - orderB;
      });

      setSubmissionAnswers(sortedAnswers);
      setSelectedSubmission(submission);
    } catch (error) {
      console.error('Error fetching submission details:', error);
    } finally {
      setReviewLoading(false);
    }
  };

  const updateAnswerScore = async (answerId: string, newScore: number) => {
    try {
      const { error } = await supabase
        .from('exam_answers')
        .update({ points_earned: newScore })
        .eq('id', answerId);

      if (error) throw error;

      // Update local state
      setSubmissionAnswers(prev => 
        prev.map(answer => 
          answer.id === answerId 
            ? { ...answer, points_earned: newScore }
            : answer
        )
      );

      // Recalculate total score
      const updatedAnswers = submissionAnswers.map(answer => 
        answer.id === answerId 
          ? { ...answer, points_earned: newScore }
          : answer
      );
      
      const newTotalScore = updatedAnswers.reduce((sum, answer) => sum + (answer.points_earned || 0), 0);

      // Update submission total score
      const { error: submissionError } = await supabase
        .from('exam_submissions')
        .update({ 
          total_score: newTotalScore,
          status: 'graded'
        })
        .eq('id', selectedSubmission?.id);

      if (submissionError) throw submissionError;

      // Update local submission state
      if (selectedSubmission) {
        setSelectedSubmission({
          ...selectedSubmission,
          total_score: newTotalScore,
          status: 'graded'
        });
      }

      // Update submissions list
      setSubmissions(prev => 
        prev.map(sub => 
          sub.id === selectedSubmission?.id 
            ? { ...sub, total_score: newTotalScore, status: 'graded' as const }
            : sub
        )
      );

    } catch (error) {
      console.error('Error updating answer score:', error);
      alert('Error updating score. Please try again.');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'submitted': return 'bg-yellow-100 text-yellow-800';
      case 'graded': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPercentage = (submission: ExamSubmissionWithDetails) => {
    if (submission.max_score === 0) return 0;
    return Math.round((submission.total_score / submission.max_score) * 100);
  };

  const getFilteredSubmissions = () => {
    if (selectedStudent === null) {
      return submissions;
    }
    return submissions.filter(submission => submission.student_id === selectedStudent);
  };

  const getStudentSubmissionCount = (studentId: string) => {
    return submissions.filter(submission => submission.student_id === studentId).length;
  };

  const getStudentAverageScore = (studentId: string) => {
    const studentSubmissions = submissions.filter(
      submission => submission.student_id === studentId && 
      (submission.status === 'submitted' || submission.status === 'graded')
    );
    
    if (studentSubmissions.length === 0) return 0;
    
    const totalScore = studentSubmissions.reduce((sum, sub) => sum + sub.total_score, 0);
    const totalMaxScore = studentSubmissions.reduce((sum, sub) => sum + sub.max_score, 0);
    
    return totalMaxScore > 0 ? Math.round((totalScore / totalMaxScore) * 100) : 0;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (selectedSubmission) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setSelectedSubmission(null)}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Submissions</span>
          </button>
          <div className="flex-1">
            <h3 className="text-lg font-medium text-gray-900">
              Review Submission - {selectedSubmission.examination?.title}
            </h3>
            <p className="text-gray-600">
              Student: {selectedSubmission.student?.full_name} (@{selectedSubmission.student?.username})
            </p>
          </div>
        </div>

        {reviewLoading ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            {/* Submission Summary */}
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">
                    {selectedSubmission.total_score}/{selectedSubmission.max_score}
                  </div>
                  <div className="text-sm text-gray-600">Points</div>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">
                    {getPercentage(selectedSubmission)}%
                  </div>
                  <div className="text-sm text-gray-600">Percentage</div>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">
                    {submissionAnswers.length}
                  </div>
                  <div className="text-sm text-gray-600">Questions</div>
                </div>
                
                <div className="text-center">
                  <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(selectedSubmission.status)}`}>
                    {selectedSubmission.status.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600">Started:</span>
                  <span className="font-medium">{format(new Date(selectedSubmission.started_at), 'MMM dd, yyyy HH:mm')}</span>
                </div>
                
                {selectedSubmission.submitted_at && (
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-600">Submitted:</span>
                    <span className="font-medium">{format(new Date(selectedSubmission.submitted_at), 'MMM dd, yyyy HH:mm')}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Questions and Answers */}
            <div className="space-y-6">
              <h4 className="text-lg font-medium text-gray-900">Questions & Answers</h4>
              
              {submissionAnswers.map((answer, index) => {
                const question = answer.question;
                if (!question) return null;

                const isCorrect = question.question_type === 'multiple_choice' && 
                                 answer.answer_text === question.correct_answer;
                
                return (
                  <div key={answer.id} className="bg-white p-6 rounded-lg shadow-sm border">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="text-sm font-medium text-gray-500">Question {index + 1}</span>
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                            {question.points} point{question.points !== 1 ? 's' : ''}
                          </span>
                          {question.question_type === 'multiple_choice' && (
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {isCorrect ? 'Correct' : 'Incorrect'}
                            </span>
                          )}
                        </div>
                        <h5 className="text-lg font-medium text-gray-900 mb-4">{question.question_text}</h5>
                      </div>
                      
                      <div className="text-right ml-4">
                        <div className="flex items-center space-x-2">
                          <input
                            type="number"
                            min="0"
                            max={question.points}
                            value={answer.points_earned || 0}
                            onChange={(e) => updateAnswerScore(answer.id, parseInt(e.target.value) || 0)}
                            className="w-16 px-2 py-1 border border-gray-300 rounded text-sm text-center"
                          />
                          <span className="text-sm text-gray-500">/ {question.points}</span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">points</div>
                      </div>
                    </div>

                    {question.question_type === 'multiple_choice' ? (
                      <div className="space-y-3">
                        {question.options && question.options.length > 0 ? (
                          question.options.map((option, optionIndex) => {
                            const isUserAnswer = answer.answer_text === option;
                            const isCorrectAnswer = option === question.correct_answer;
                            
                            return (
                              <div
                                key={optionIndex}
                                className={`flex items-center space-x-3 p-3 rounded-md ${
                                  isCorrectAnswer ? 'bg-green-50 border border-green-200' :
                                  isUserAnswer && !isCorrectAnswer ? 'bg-red-50 border border-red-200' :
                                  'bg-gray-50'
                                }`}
                              >
                                <div className="flex items-center space-x-2">
                                  {isCorrectAnswer && <CheckCircle className="h-4 w-4 text-green-600" />}
                                  {isUserAnswer && !isCorrectAnswer && <XCircle className="h-4 w-4 text-red-600" />}
                                  {isUserAnswer && (
                                    <span className="text-xs font-medium text-gray-600">Student's answer</span>
                                  )}
                                  {isCorrectAnswer && (
                                    <span className="text-xs font-medium text-green-600">Correct answer</span>
                                  )}
                                </div>
                                <span className="text-gray-900">{option}</span>
                              </div>
                            );
                          })
                        ) : (
                          <p className="text-red-600">No options available for this question.</p>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Student's Answer:</label>
                          <div className="bg-gray-50 p-4 rounded-md border min-h-[100px]">
                            <p className="text-gray-900 whitespace-pre-wrap break-words">
                              {answer.answer_text || 'No answer provided'}
                            </p>
                          </div>
                        </div>
                        
                        <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-md">
                          <div className="flex items-center space-x-2">
                            <Edit3 className="h-4 w-4 text-blue-600" />
                            <span className="font-medium">Grading Instructions:</span>
                          </div>
                          <p className="mt-1">
                            This is an essay question. Please review the student's answer and assign points 
                            using the input field above. Consider content accuracy, completeness, and clarity.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    );
  }

  const filteredSubmissions = getFilteredSubmissions();

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <button
          onClick={onBack}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Dashboard</span>
        </button>
        <h3 className="text-lg font-medium text-gray-900">Exam Submissions Review</h3>
      </div>

      {/* Student Navigation */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="flex items-center space-x-4 overflow-x-auto">
          <button
            onClick={() => setSelectedStudent(null)}
            className={`flex items-center space-x-2 px-3 py-2 rounded-md whitespace-nowrap transition-colors ${
              selectedStudent === null
                ? 'bg-blue-100 text-blue-800 border border-blue-200'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Users className="h-4 w-4" />
            <span>All Students ({submissions.length})</span>
          </button>
          
          {students.map((student) => {
            const submissionCount = getStudentSubmissionCount(student.id);
            const averageScore = getStudentAverageScore(student.id);
            
            return (
              <button
                key={student.id}
                onClick={() => setSelectedStudent(student.id)}
                className={`flex items-center space-x-2 px-3 py-2 rounded-md whitespace-nowrap transition-colors ${
                  selectedStudent === student.id
                    ? 'bg-blue-100 text-blue-800 border border-blue-200'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <UserIcon className="h-4 w-4" />
                <div className="text-left">
                  <div className="font-medium">{student.full_name}</div>
                  <div className="text-xs">
                    {submissionCount} submission{submissionCount !== 1 ? 's' : ''} • {averageScore}% avg
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Current Student Info */}
      {selectedStudent && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <div className="flex items-center space-x-2">
            <UserIcon className="h-5 w-5 text-blue-600" />
            <div>
              <h4 className="font-medium text-blue-900">
                {students.find(s => s.id === selectedStudent)?.full_name}
              </h4>
              <p className="text-blue-700 text-sm">
                @{students.find(s => s.id === selectedStudent)?.username} • 
                {getStudentSubmissionCount(selectedStudent)} submission{getStudentSubmissionCount(selectedStudent) !== 1 ? 's' : ''} • 
                {getStudentAverageScore(selectedStudent)}% average score
              </p>
            </div>
          </div>
        </div>
      )}

      {filteredSubmissions.length === 0 ? (
        <div className="bg-white p-8 rounded-lg shadow-sm text-center">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {selectedStudent ? 'No submissions from this student' : 'No submissions yet'}
          </h3>
          <p className="text-gray-600">
            {selectedStudent 
              ? 'This student has not submitted any exams yet.'
              : 'Student exam submissions will appear here for review.'
            }
          </p>
        </div>
      ) : (
        <div className="bg-white shadow-sm rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Student
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Examination
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Score
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Submitted
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredSubmissions.map((submission) => (
                <tr key={submission.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-8 w-8">
                        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                          <UserIcon className="h-4 w-4 text-blue-600" />
                        </div>
                      </div>
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900">
                          {submission.student?.full_name}
                        </div>
                        <div className="text-sm text-gray-500">
                          @{submission.student?.username}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">
                      {submission.examination?.title}
                    </div>
                    <div className="text-sm text-gray-500">
                      {submission.examination?.description}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {submission.total_score}/{submission.max_score}
                    </div>
                    <div className="text-sm text-gray-500">
                      {getPercentage(submission)}%
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(submission.status)}`}>
                      {submission.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {submission.submitted_at ? (
                      format(new Date(submission.submitted_at), 'MMM dd, yyyy HH:mm')
                    ) : (
                      <span className="text-gray-400">Not submitted</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => fetchSubmissionDetails(submission)}
                      className="text-blue-600 hover:text-blue-900 transition-colors"
                    >
                      Review
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}