import { useState, useEffect } from 'react';
import { supabase, Examination, ExamFolder } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { X, Plus, Trash2, GripVertical } from 'lucide-react';
import { useForm } from 'react-hook-form';

interface ExaminationFormProps {
  examination?: Examination | null;
  onClose: () => void;
}

interface QuestionFormData {
  question_text: string;
  question_type: 'multiple_choice' | 'multiple_checkboxes' | 'essay';
  options: string[];
  correct_answer?: string;
  correct_answers?: string[]; // For multiple checkboxes
  points: number;
  is_required: boolean;
}

interface FormData {
  title: string;
  description: string;
  scheduled_start: string;
  scheduled_end: string;
  duration_minutes: number;
  is_active: boolean;
  folder_id: string;
}

export function ExaminationForm({ examination, onClose }: ExaminationFormProps) {
  const [questions, setQuestions] = useState<QuestionFormData[]>([]);
  const [folders, setFolders] = useState<ExamFolder[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      title: examination?.title || '',
      description: examination?.description || '',
      scheduled_start: examination?.scheduled_start ? 
        new Date(examination.scheduled_start).toISOString().slice(0, 16) : '',
      scheduled_end: examination?.scheduled_end ? 
        new Date(examination.scheduled_end).toISOString().slice(0, 16) : '',
      duration_minutes: examination?.duration_minutes || 60,
      is_active: examination?.is_active ?? true,
      folder_id: examination?.folder_id || '',
    }
  });

  useEffect(() => {
    fetchFolders();
    if (examination) {
      fetchQuestions();
    }
  }, [examination]);

  const fetchFolders = async () => {
    try {
      const { data, error } = await supabase
        .from('exam_folders')
        .select('*')
        .order('name');

      if (error) throw error;
      setFolders(data || []);
    } catch (error) {
      console.error('Error fetching folders:', error);
    }
  };

  const fetchQuestions = async () => {
    if (!examination) return;

    try {
      const { data, error } = await supabase
        .from('exam_questions')
        .select('*')
        .eq('exam_id', examination.id)
        .order('order_index');

      if (error) throw error;
      
      const formattedQuestions = data.map(q => ({
        question_text: q.question_text,
        question_type: q.question_type,
        options: q.options || [],
        correct_answer: q.correct_answer,
        correct_answers: q.correct_answers || [],
        points: q.points,
        is_required: q.is_required,
      }));
      
      setQuestions(formattedQuestions);
    } catch (error) {
      console.error('Error fetching questions:', error);
    }
  };

  const addQuestion = () => {
    setQuestions([...questions, {
      question_text: '',
      question_type: 'multiple_choice',
      options: ['', '', '', ''],
      correct_answer: '',
      correct_answers: [],
      points: 1,
      is_required: true,
    }]);
  };

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const updateQuestion = (index: number, field: keyof QuestionFormData, value: any) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], [field]: value };
    
    // Reset answers when question type changes
    if (field === 'question_type') {
      if (value === 'multiple_choice') {
        updated[index].correct_answer = '';
        updated[index].correct_answers = [];
        updated[index].options = ['', '', '', ''];
      } else if (value === 'multiple_checkboxes') {
        updated[index].correct_answer = '';
        updated[index].correct_answers = [];
        updated[index].options = ['', '', '', ''];
      } else if (value === 'essay') {
        updated[index].correct_answer = '';
        updated[index].correct_answers = [];
        updated[index].options = [];
      }
    }
    
    setQuestions(updated);
  };

  const updateOption = (questionIndex: number, optionIndex: number, value: string) => {
    const updated = [...questions];
    updated[questionIndex].options[optionIndex] = value;
    setQuestions(updated);
  };

  const addOption = (questionIndex: number) => {
    const updated = [...questions];
    updated[questionIndex].options.push('');
    setQuestions(updated);
  };

  const removeOption = (questionIndex: number, optionIndex: number) => {
    const updated = [...questions];
    updated[questionIndex].options = updated[questionIndex].options.filter((_, i) => i !== optionIndex);
    
    // Remove from correct answers if it was selected
    const removedOption = updated[questionIndex].options[optionIndex];
    if (updated[questionIndex].question_type === 'multiple_checkboxes') {
      updated[questionIndex].correct_answers = updated[questionIndex].correct_answers?.filter(
        answer => answer !== removedOption
      ) || [];
    } else if (updated[questionIndex].correct_answer === removedOption) {
      updated[questionIndex].correct_answer = '';
    }
    
    setQuestions(updated);
  };

  const handleCheckboxChange = (questionIndex: number, option: string, checked: boolean) => {
    const updated = [...questions];
    const question = updated[questionIndex];
    
    if (!question.correct_answers) {
      question.correct_answers = [];
    }
    
    if (checked) {
      if (!question.correct_answers.includes(option)) {
        question.correct_answers.push(option);
      }
    } else {
      question.correct_answers = question.correct_answers.filter(answer => answer !== option);
    }
    
    setQuestions(updated);
  };

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    
    try {
      let examId = examination?.id;

      if (examination) {
        // Update existing examination
        const { error } = await supabase
          .from('examinations')
          .update({
            title: data.title,
            description: data.description,
            scheduled_start: new Date(data.scheduled_start).toISOString(),
            scheduled_end: new Date(data.scheduled_end).toISOString(),
            duration_minutes: data.duration_minutes,
            is_active: data.is_active,
            folder_id: data.folder_id || null,
          })
          .eq('id', examination.id);

        if (error) throw error;
      } else {
        // Create new examination
        const { data: newExam, error } = await supabase
          .from('examinations')
          .insert({
            title: data.title,
            description: data.description,
            scheduled_start: new Date(data.scheduled_start).toISOString(),
            scheduled_end: new Date(data.scheduled_end).toISOString(),
            duration_minutes: data.duration_minutes,
            is_active: data.is_active,
            folder_id: data.folder_id || null,
            created_by: user?.id,
          })
          .select()
          .single();

        if (error) throw error;
        examId = newExam.id;
      }

      // Delete existing questions if updating
      if (examination) {
        await supabase
          .from('exam_questions')
          .delete()
          .eq('exam_id', examination.id);
      }

      // Insert questions
      if (questions.length > 0) {
        const questionsToInsert = questions.map((q, index) => {
          const baseQuestion = {
            exam_id: examId,
            question_text: q.question_text,
            question_type: q.question_type,
            points: q.points,
            is_required: q.is_required,
            order_index: index,
          };

          if (q.question_type === 'multiple_choice') {
            return {
              ...baseQuestion,
              options: q.options.filter(opt => opt.trim()),
              correct_answer: q.correct_answer,
              correct_answers: null,
            };
          } else if (q.question_type === 'multiple_checkboxes') {
            return {
              ...baseQuestion,
              options: q.options.filter(opt => opt.trim()),
              correct_answer: null,
              correct_answers: q.correct_answers || [],
            };
          } else {
            return {
              ...baseQuestion,
              options: [],
              correct_answer: null,
              correct_answers: null,
            };
          }
        });

        const { error: questionsError } = await supabase
          .from('exam_questions')
          .insert(questionsToInsert);

        if (questionsError) throw questionsError;
      }

      onClose();
    } catch (error) {
      console.error('Error saving examination:', error);
      alert('Error saving examination. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b">
          <h3 className="text-lg font-medium text-gray-900">
            {examination ? 'Edit Examination' : 'Create Examination'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h4 className="text-md font-medium text-gray-900">Basic Information</h4>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Title</label>
              <input
                {...register('title', { required: 'Title is required' })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
              {errors.title && <p className="text-red-600 text-sm mt-1">{errors.title.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                {...register('description')}
                rows={3}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Folder</label>
              <select
                {...register('folder_id')}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Unassigned</option>
                {folders.map((folder) => (
                  <option key={folder.id} value={folder.id}>
                    {folder.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Start Date & Time</label>
                <input
                  type="datetime-local"
                  {...register('scheduled_start', { required: 'Start date is required' })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
                {errors.scheduled_start && <p className="text-red-600 text-sm mt-1">{errors.scheduled_start.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">End Date & Time</label>
                <input
                  type="datetime-local"
                  {...register('scheduled_end', { required: 'End date is required' })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
                {errors.scheduled_end && <p className="text-red-600 text-sm mt-1">{errors.scheduled_end.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Duration (minutes)</label>
                <input
                  type="number"
                  min="1"
                  {...register('duration_minutes', { required: 'Duration is required', min: 1 })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
                {errors.duration_minutes && <p className="text-red-600 text-sm mt-1">{errors.duration_minutes.message}</p>}
              </div>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                {...register('is_active')}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label className="ml-2 block text-sm text-gray-900">
                Active (students can see and take this exam)
              </label>
            </div>
          </div>

          {/* Questions */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="text-md font-medium text-gray-900">Questions</h4>
              <button
                type="button"
                onClick={addQuestion}
                className="flex items-center space-x-2 bg-green-600 text-white px-3 py-1 rounded-md hover:bg-green-700 transition-colors text-sm"
              >
                <Plus className="h-4 w-4" />
                <span>Add Question</span>
              </button>
            </div>

            {questions.map((question, questionIndex) => (
              <div key={questionIndex} className="border border-gray-200 rounded-lg p-4 space-y-4">
                <div className="flex justify-between items-start">
                  <div className="flex items-center space-x-2">
                    <GripVertical className="h-4 w-4 text-gray-400" />
                    <span className="text-sm font-medium text-gray-700">Question {questionIndex + 1}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeQuestion(questionIndex)}
                    className="text-red-600 hover:text-red-800 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Question Text</label>
                  <textarea
                    value={question.question_text}
                    onChange={(e) => updateQuestion(questionIndex, 'question_text', e.target.value)}
                    rows={2}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter your question..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Question Type</label>
                    <select
                      value={question.question_type}
                      onChange={(e) => updateQuestion(questionIndex, 'question_type', e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="multiple_choice">Multiple Choice (Single Answer)</option>
                      <option value="multiple_checkboxes">Multiple Checkboxes (Multiple Answers)</option>
                      <option value="essay">Essay</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Points</label>
                    <input
                      type="number"
                      min="1"
                      value={question.points}
                      onChange={(e) => updateQuestion(questionIndex, 'points', parseInt(e.target.value))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div className="flex items-center pt-6">
                    <input
                      type="checkbox"
                      checked={question.is_required}
                      onChange={(e) => updateQuestion(questionIndex, 'is_required', e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label className="ml-2 block text-sm text-gray-900">Required</label>
                  </div>
                </div>

                {(question.question_type === 'multiple_choice' || question.question_type === 'multiple_checkboxes') && (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="block text-sm font-medium text-gray-700">Options</label>
                      <button
                        type="button"
                        onClick={() => addOption(questionIndex)}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        + Add Option
                      </button>
                    </div>
                    
                    {question.options.map((option, optionIndex) => (
                      <div key={optionIndex} className="flex items-center space-x-2">
                        {question.question_type === 'multiple_choice' ? (
                          <input
                            type="radio"
                            name={`correct_${questionIndex}`}
                            checked={question.correct_answer === option}
                            onChange={() => updateQuestion(questionIndex, 'correct_answer', option)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                          />
                        ) : (
                          <input
                            type="checkbox"
                            checked={question.correct_answers?.includes(option) || false}
                            onChange={(e) => handleCheckboxChange(questionIndex, option, e.target.checked)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                        )}
                        <input
                          type="text"
                          value={option}
                          onChange={(e) => updateOption(questionIndex, optionIndex, e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          placeholder={`Option ${optionIndex + 1}`}
                        />
                        {question.options.length > 2 && (
                          <button
                            type="button"
                            onClick={() => removeOption(questionIndex, optionIndex)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                    
                    <p className="text-xs text-gray-500">
                      {question.question_type === 'multiple_choice' 
                        ? 'Select the radio button next to the correct answer'
                        : 'Check all correct answers (students can select multiple options)'
                      }
                    </p>
                  </div>
                )}
              </div>
            ))}

            {questions.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <p>No questions added yet. Click "Add Question" to get started.</p>
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-6 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? 'Saving...' : examination ? 'Update Examination' : 'Create Examination'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}