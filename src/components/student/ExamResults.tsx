import { useState, useEffect } from 'react';
import { supabase, ExamSubmission, Examination, ExamQuestion, ExamAnswer } from '../../lib/supabase';
import { ArrowLeft, CheckCircle, XCircle, Clock, Award } from 'lucide-react';
import { format } from 'date-fns';

interface ExamResultsProps {
  submission: ExamSubmission;
  onBack: () => void;
}

export function ExamResults({ submission, onBack }: ExamResultsProps) {
  const [examination, setExamination] = useState<Examination | null>(null);
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [answers, setAnswers] = useState<ExamAnswer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchResultsData();
  }, []);

  const fetchResultsData = async () => {
    try {
      // Fetch examination details
      const { data: examData, error: examError } = await supabase
        .from('examinations')
        .select('*')
        .eq('id', submission.exam_id)
        .single();

      if (examError) throw examError;

      // Fetch questions
      const { data: questionsData, error: questionsError } = await supabase
        .from('exam_questions')
        .select('*')
        .eq('exam_id', submission.exam_id)
        .order('order_index');

      if (questionsError) throw questionsError;

      // Fetch answers
      const { data: answersData, error: answersError } = await supabase
        .from('exam_answers')
        .select('*')
        .eq('submission_id', submission.id);

      if (answersError) throw answersError;

      setExamination(examData);
      setQuestions(questionsData);
      setAnswers(answersData);
    } catch (error) {
      console.error('Error fetching results data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAnswerForQuestion = (questionId: string) => {
    return answers.find(a => a.question_id === questionId);
  };

  const getPercentage = () => {
    if (submission.max_score === 0) return 0;
    return Math.round((submission.total_score / submission.max_score) * 100);
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const percentage = getPercentage();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <button
              onClick={onBack}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Dashboard</span>
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Results Summary */}
        <div className="bg-white p-6 rounded-lg shadow-sm border mb-8">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <div className={`w-20 h-20 rounded-full flex items-center justify-center ${
                percentage >= 70 ? 'bg-green-100' : 'bg-red-100'
              }`}>
                {percentage >= 70 ? (
                  <Award className={`h-10 w-10 ${getGradeColor(percentage)}`} />
                ) : (
                  <XCircle className="h-10 w-10 text-red-600" />
                )}
              </div>
            </div>
            
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{examination?.title}</h1>
            <p className="text-gray-600 mb-6">Examination Results</p>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className={`text-3xl font-bold ${getGradeColor(percentage)}`}>
                  {getGradeLetter(percentage)}
                </div>
                <div className="text-sm text-gray-600">Grade</div>
              </div>
              
              <div className="text-center">
                <div className={`text-3xl font-bold ${getGradeColor(percentage)}`}>
                  {percentage}%
                </div>
                <div className="text-sm text-gray-600">Percentage</div>
              </div>
              
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900">
                  {submission.total_score}/{submission.max_score}
                </div>
                <div className="text-sm text-gray-600">Points</div>
              </div>
              
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900">
                  {questions.length}
                </div>
                <div className="text-sm text-gray-600">Questions</div>
              </div>
            </div>
          </div>
        </div>

        {/* Exam Details */}
        <div className="bg-white p-6 rounded-lg shadow-sm border mb-8">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Exam Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-gray-400" />
              <span className="text-gray-600">Started:</span>
              <span className="font-medium">{format(new Date(submission.started_at), 'MMM dd, yyyy HH:mm')}</span>
            </div>
            
            {submission.submitted_at && (
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-gray-400" />
                <span className="text-gray-600">Submitted:</span>
                <span className="font-medium">{format(new Date(submission.submitted_at), 'MMM dd, yyyy HH:mm')}</span>
              </div>
            )}
          </div>
        </div>

        {/* Question Results */}
        <div className="space-y-6">
          <h3 className="text-lg font-medium text-gray-900">Question Results</h3>
          
          {questions.map((question, index) => {
            const answer = getAnswerForQuestion(question.id);
            const isCorrect = question.question_type === 'multiple_choice' && 
                             answer?.answer_text === question.correct_answer;
            const pointsEarned = answer?.points_earned || 0;
            
            return (
              <div key={question.id} className="bg-white p-6 rounded-lg shadow-sm border">
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
                    <h4 className="text-lg font-medium text-gray-900 mb-4">{question.question_text}</h4>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-lg font-bold text-gray-900">
                      {pointsEarned}/{question.points}
                    </div>
                    <div className="text-xs text-gray-500">points</div>
                  </div>
                </div>

                {question.question_type === 'multiple_choice' ? (
                  <div className="space-y-3">
                    {question.options.map((option, optionIndex) => {
                      const isUserAnswer = answer?.answer_text === option;
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
                              <span className="text-xs font-medium text-gray-600">Your answer</span>
                            )}
                            {isCorrectAnswer && (
                              <span className="text-xs font-medium text-green-600">Correct answer</span>
                            )}
                          </div>
                          <span className="text-gray-900">{option}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Your Answer:</label>
                      <div className="bg-gray-50 p-4 rounded-md border min-h-[100px]">
                        <p className="text-gray-900 whitespace-pre-wrap break-words">
                          {answer?.answer_text || 'No answer provided'}
                        </p>
                      </div>
                    </div>
                    
                    {question.question_type === 'essay' && (
                      <div className="text-sm text-gray-600">
                        <p>Essay questions require manual grading by your instructor.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Back Button */}
        <div className="mt-8 text-center">
          <button
            onClick={onBack}
            className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}