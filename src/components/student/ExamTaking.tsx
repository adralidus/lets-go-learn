import { useState, useEffect, useCallback } from 'react';
import { supabase, Examination, ExamQuestion, ExamSubmission } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Clock, AlertTriangle, CheckCircle } from 'lucide-react';

interface ExamTakingProps {
  examination: Examination;
  onComplete: () => void;
}

export function ExamTaking({ examination, onComplete }: ExamTakingProps) {
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submission, setSubmission] = useState<ExamSubmission | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [savingAnswers, setSavingAnswers] = useState<Record<string, boolean>>({});
  const [saveTimeouts, setSaveTimeouts] = useState<Record<string, NodeJS.Timeout>>({});
  const { user } = useAuth();

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      Object.values(saveTimeouts).forEach(timeout => clearTimeout(timeout));
    };
  }, [saveTimeouts]);

  useEffect(() => {
    initializeExam();
  }, []);

  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && submission && !submitting) {
      handleSubmit();
    }
  }, [timeLeft, submission, submitting]);

  const getOrCreateSubmission = async (questionsData: ExamQuestion[]) => {
    if (!user?.id) {
      throw new Error('User not authenticated');
    }

    const maxScore = questionsData.reduce((sum, q) => sum + q.points, 0);
    
    // Use upsert to handle the race condition atomically
    const { data: submissionData, error } = await supabase
      .from('exam_submissions')
      .upsert({
        exam_id: examination.id,
        student_id: user.id,
        max_score: maxScore,
        status: 'in_progress'
      }, {
        onConflict: 'exam_id,student_id'
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return submissionData;
  };

  const initializeExam = async () => {
    try {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      // Fetch questions
      const { data: questionsData, error: questionsError } = await supabase
        .from('exam_questions')
        .select('*')
        .eq('exam_id', examination.id)
        .order('order_index');

      if (questionsError) throw questionsError;

      if (!questionsData || questionsData.length === 0) {
        throw new Error('No questions found for this exam');
      }

      // Get or create submission with proper race condition handling
      const submissionData = await getOrCreateSubmission(questionsData);

      // Fetch existing answers if any
      const { data: answersData, error: answersError } = await supabase
        .from('exam_answers')
        .select('*')
        .eq('submission_id', submissionData.id);

      if (answersError) throw answersError;

      // Convert answers to state format
      const answersMap: Record<string, string> = {};
      if (answersData) {
        answersData.forEach(answer => {
          answersMap[answer.question_id] = answer.answer_text || '';
        });
      }

      // Calculate time left
      const startTime = new Date(submissionData.started_at).getTime();
      const durationMs = examination.duration_minutes * 60 * 1000;
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, Math.floor((durationMs - elapsed) / 1000));

      setQuestions(questionsData);
      setAnswers(answersMap);
      setSubmission(submissionData);
      setTimeLeft(remaining);
    } catch (error) {
      console.error('Error initializing exam:', error);
      alert(`Error loading exam: ${error instanceof Error ? error.message : 'Please try again.'}`);
      onComplete();
    } finally {
      setLoading(false);
    }
  };

  const saveAnswerToDatabase = useCallback(async (questionId: string, answer: string, submissionId: string) => {
    try {
      const { error } = await supabase
        .from('exam_answers')
        .upsert({
          submission_id: submissionId,
          question_id: questionId,
          answer_text: answer,
        }, {
          onConflict: 'submission_id,question_id'
        });

      if (error) {
        console.error('Error saving answer:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error saving answer:', error);
      // Could add toast notification here
      throw error;
    }
  }, []);

  const handleAnswerChange = useCallback((questionId: string, answer: string) => {
    // Update local state immediately for responsive UI
    setAnswers(prev => ({ ...prev, [questionId]: answer }));

    // Clear existing timeout for this question
    if (saveTimeouts[questionId]) {
      clearTimeout(saveTimeouts[questionId]);
    }

    // Debounce the database save to avoid too many requests
    if (submission?.id) {
      setSavingAnswers(prev => ({ ...prev, [questionId]: true }));
      
      const timeout = setTimeout(async () => {
        try {
          await saveAnswerToDatabase(questionId, answer, submission.id);
        } catch (error) {
          console.error('Failed to save answer:', error);
        } finally {
          setSavingAnswers(prev => ({ ...prev, [questionId]: false }));
          setSaveTimeouts(prev => {
            const newTimeouts = { ...prev };
            delete newTimeouts[questionId];
            return newTimeouts;
          });
        }
      }, 1000); // 1 second debounce

      setSaveTimeouts(prev => ({ ...prev, [questionId]: timeout }));
    }
  }, [submission?.id, saveTimeouts, saveAnswerToDatabase]);

  const calculateScore = useCallback(() => {
    let totalScore = 0;
    
    questions.forEach(question => {
      const userAnswer = answers[question.id];
      if (question.question_type === 'multiple_choice' && userAnswer === question.correct_answer) {
        totalScore += question.points;
      }
      // Essay questions would need manual grading
    });

    return totalScore;
  }, [questions, answers]);

  const handleSubmit = async () => {
    if (submitting || !submission?.id) return;
    setSubmitting(true);

    try {
      // Clear any pending save timeouts
      Object.values(saveTimeouts).forEach(timeout => clearTimeout(timeout));
      setSaveTimeouts({});

      // Save any pending answers immediately
      const savePromises = Object.entries(answers).map(([questionId, answer]) => 
        saveAnswerToDatabase(questionId, answer, submission.id)
      );
      
      await Promise.all(savePromises);

      const totalScore = calculateScore();

      // Update submission
      const { error: submissionError } = await supabase
        .from('exam_submissions')
        .update({
          submitted_at: new Date().toISOString(),
          total_score: totalScore,
          status: 'submitted'
        })
        .eq('id', submission.id);

      if (submissionError) throw submissionError;

      // Update answer scores for multiple choice questions
      const scoreUpdatePromises = questions.map(async (question) => {
        if (question.question_type === 'multiple_choice') {
          const userAnswer = answers[question.id];
          const pointsEarned = userAnswer === question.correct_answer ? question.points : 0;
          
          const { error } = await supabase
            .from('exam_answers')
            .update({ points_earned: pointsEarned })
            .eq('submission_id', submission.id)
            .eq('question_id', question.id);

          if (error) throw error;
        }
      });

      await Promise.all(scoreUpdatePromises);

      onComplete();
    } catch (error) {
      console.error('Error submitting exam:', error);
      alert(`Error submitting exam: ${error instanceof Error ? error.message : 'Please try again.'}`);
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getRequiredUnanswered = () => {
    return questions.filter(q => q.is_required && !answers[q.id]?.trim()).length;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Exam</h2>
          <p className="text-gray-600 mb-4">Unable to initialize exam submission.</p>
          <button
            onClick={onComplete}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const requiredUnanswered = getRequiredUnanswered();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">{examination.title}</h1>
              <p className="text-sm text-gray-600">Examination in Progress</p>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className={`flex items-center space-x-2 px-3 py-1 rounded-full ${
                timeLeft < 300 ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
              }`}>
                <Clock className="h-4 w-4" />
                <span className="font-medium">{formatTime(timeLeft)}</span>
              </div>
              
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Submit Exam'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {requiredUnanswered > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-6">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <p className="text-yellow-800">
                You have {requiredUnanswered} required question{requiredUnanswered !== 1 ? 's' : ''} unanswered.
              </p>
            </div>
          </div>
        )}

        <div className="space-y-8">
          {questions.map((question, index) => (
            <div key={question.id} className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="text-sm font-medium text-gray-500">Question {index + 1}</span>
                    {question.is_required && (
                      <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">Required</span>
                    )}
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                      {question.points} point{question.points !== 1 ? 's' : ''}
                    </span>
                    {savingAnswers[question.id] && (
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full flex items-center space-x-1">
                        <div className="animate-spin rounded-full h-3 w-3 border-b border-gray-600"></div>
                        <span>Saving...</span>
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">{question.question_text}</h3>
                </div>
                
                {answers[question.id]?.trim() && (
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-1" />
                )}
              </div>

              {question.question_type === 'multiple_choice' ? (
                <div className="space-y-3">
                  {question.options && question.options.length > 0 ? (
                    question.options.map((option, optionIndex) => (
                      <label key={optionIndex} className="flex items-center space-x-3 cursor-pointer">
                        <input
                          type="radio"
                          name={`question_${question.id}`}
                          value={option}
                          checked={answers[question.id] === option}
                          onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                        />
                        <span className="text-gray-900">{option}</span>
                      </label>
                    ))
                  ) : (
                    <p className="text-red-600">No options available for this question.</p>
                  )}
                </div>
              ) : (
                <div className="relative">
                  <textarea
                    value={answers[question.id] || ''}
                    onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 resize-vertical"
                    placeholder="Type your answer here..."
                  />
                  <div className="absolute bottom-2 right-2 text-xs text-gray-400">
                    {(answers[question.id] || '').length} characters
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Submit Section */}
        <div className="mt-8 bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900">Ready to submit?</h3>
              <p className="text-gray-600">
                Make sure you've answered all questions before submitting.
                {requiredUnanswered > 0 && (
                  <span className="text-red-600 font-medium">
                    {' '}You still have {requiredUnanswered} required question{requiredUnanswered !== 1 ? 's' : ''} to answer.
                  </span>
                )}
              </p>
            </div>
            
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="bg-green-600 text-white px-6 py-3 rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 font-medium"
            >
              {submitting ? 'Submitting...' : 'Submit Exam'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}