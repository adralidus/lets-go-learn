import { useState, useEffect } from 'react';
import { supabase, Examination, ExamFolder } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Plus, Edit, Trash2, Calendar, Clock, Users, FileText, Folder, FolderOpen, Settings, Copy, RotateCcw, Power, PowerOff } from 'lucide-react';
import { ExaminationForm } from './ExaminationForm';
import { FolderManager } from './FolderManager';
import { DeleteConfirmationModal } from './DeleteConfirmationModal';
import { format } from 'date-fns';

export function ExaminationManager() {
  const [examinations, setExaminations] = useState<Examination[]>([]);
  const [folders, setFolders] = useState<ExamFolder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showFolderManager, setShowFolderManager] = useState(false);
  const [editingExam, setEditingExam] = useState<Examination | null>(null);
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    examination: Examination | null;
    loading: boolean;
  }>({
    isOpen: false,
    examination: null,
    loading: false
  });
  const { user } = useAuth();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch examinations
      const { data: examsData, error: examsError } = await supabase
        .from('examinations')
        .select('*')
        .order('created_at', { ascending: false });

      if (examsError) throw examsError;

      // Fetch folders
      const { data: foldersData, error: foldersError } = await supabase
        .from('exam_folders')
        .select('*')
        .order('name');

      if (foldersError) throw foldersError;

      setExaminations(examsData || []);
      setFolders(foldersData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (exam: Examination) => {
    setDeleteModal({
      isOpen: true,
      examination: exam,
      loading: false
    });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModal.examination) return;

    setDeleteModal(prev => ({ ...prev, loading: true }));

    try {
      const { error } = await supabase
        .from('examinations')
        .delete()
        .eq('id', deleteModal.examination.id);

      if (error) throw error;
      
      // Close modal and refresh data
      setDeleteModal({ isOpen: false, examination: null, loading: false });
      fetchData();
    } catch (error) {
      console.error('Error deleting examination:', error);
      alert('Error deleting examination. Please try again.');
      setDeleteModal(prev => ({ ...prev, loading: false }));
    }
  };

  const handleDeleteCancel = () => {
    if (deleteModal.loading) return; // Prevent closing while deleting
    setDeleteModal({ isOpen: false, examination: null, loading: false });
  };

  const handleEdit = (exam: Examination) => {
    setEditingExam(exam);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingExam(null);
    fetchData();
  };

  const handleCreateFolder = async (name: string, description: string) => {
    const { error } = await supabase
      .from('exam_folders')
      .insert({
        name,
        description,
        created_by: user?.id
      });

    if (error) throw error;
    fetchData();
  };

  const handleUpdateFolder = async (id: string, name: string, description: string) => {
    const { error } = await supabase
      .from('exam_folders')
      .update({ name, description })
      .eq('id', id);

    if (error) throw error;
    fetchData();
  };

  const handleDeleteFolder = async (id: string) => {
    const { error } = await supabase
      .from('exam_folders')
      .delete()
      .eq('id', id);

    if (error) throw error;
    fetchData();
  };

  const moveExamToFolder = async (examId: string, folderId: string | null) => {
    try {
      const { error } = await supabase
        .from('examinations')
        .update({ folder_id: folderId })
        .eq('id', examId);

      if (error) throw error;
      fetchData();
    } catch (error) {
      console.error('Error moving exam:', error);
    }
  };

  const handleToggleActive = async (exam: Examination) => {
    try {
      const { error } = await supabase
        .from('examinations')
        .update({ is_active: !exam.is_active })
        .eq('id', exam.id);

      if (error) throw error;
      fetchData();
    } catch (error) {
      console.error('Error toggling exam status:', error);
      alert('Error updating exam status. Please try again.');
    }
  };

  const handleReactivateExam = async (exam: Examination) => {
    if (!confirm('Are you sure you want to reactivate this examination? This will make it visible to students again.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('examinations')
        .update({ is_active: true })
        .eq('id', exam.id);

      if (error) throw error;
      fetchData();
    } catch (error) {
      console.error('Error reactivating exam:', error);
      alert('Error reactivating exam. Please try again.');
    }
  };

  const handleDuplicateExam = async (exam: Examination) => {
    try {
      // First, duplicate the examination
      const { data: newExam, error: examError } = await supabase
        .from('examinations')
        .insert({
          title: `${exam.title} (Copy)`,
          description: exam.description,
          scheduled_start: exam.scheduled_start,
          scheduled_end: exam.scheduled_end,
          duration_minutes: exam.duration_minutes,
          is_active: false, // Start as inactive
          folder_id: exam.folder_id,
          created_by: user?.id,
        })
        .select()
        .single();

      if (examError) throw examError;

      // Fetch the original exam's questions
      const { data: originalQuestions, error: questionsError } = await supabase
        .from('exam_questions')
        .select('*')
        .eq('exam_id', exam.id)
        .order('order_index');

      if (questionsError) throw questionsError;

      // Duplicate the questions
      if (originalQuestions && originalQuestions.length > 0) {
        const questionsToInsert = originalQuestions.map(q => ({
          exam_id: newExam.id,
          question_text: q.question_text,
          question_type: q.question_type,
          options: q.options,
          correct_answer: q.correct_answer,
          points: q.points,
          is_required: q.is_required,
          order_index: q.order_index,
        }));

        const { error: insertQuestionsError } = await supabase
          .from('exam_questions')
          .insert(questionsToInsert);

        if (insertQuestionsError) throw insertQuestionsError;
      }

      fetchData();
      alert('Examination duplicated successfully!');
    } catch (error) {
      console.error('Error duplicating exam:', error);
      alert('Error duplicating exam. Please try again.');
    }
  };

  const getFilteredExaminations = () => {
    if (selectedFolder === null) {
      return examinations.filter(exam => !exam.folder_id);
    }
    return examinations.filter(exam => exam.folder_id === selectedFolder);
  };

  const getFolderExamCount = (folderId: string) => {
    return examinations.filter(exam => exam.folder_id === folderId).length;
  };

  const getUnassignedExamCount = () => {
    return examinations.filter(exam => !exam.folder_id).length;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const filteredExaminations = getFilteredExaminations();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">Examinations</h3>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowFolderManager(true)}
            className="flex items-center space-x-2 bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors"
          >
            <Settings className="h-4 w-4" />
            <span>Manage Folders</span>
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Create Examination</span>
          </button>
        </div>
      </div>

      {/* Folder Navigation */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="flex items-center space-x-4 overflow-x-auto">
          <button
            onClick={() => setSelectedFolder(null)}
            className={`flex items-center space-x-2 px-3 py-2 rounded-md whitespace-nowrap transition-colors ${
              selectedFolder === null
                ? 'bg-blue-100 text-blue-800 border border-blue-200'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <FolderOpen className="h-4 w-4" />
            <span>Unassigned ({getUnassignedExamCount()})</span>
          </button>
          
          {folders.map((folder) => (
            <button
              key={folder.id}
              onClick={() => setSelectedFolder(folder.id)}
              className={`flex items-center space-x-2 px-3 py-2 rounded-md whitespace-nowrap transition-colors ${
                selectedFolder === folder.id
                  ? 'bg-blue-100 text-blue-800 border border-blue-200'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Folder className="h-4 w-4" />
              <span>{folder.name} ({getFolderExamCount(folder.id)})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Current Folder Info */}
      {selectedFolder && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <div className="flex items-center space-x-2">
            <Folder className="h-5 w-5 text-blue-600" />
            <div>
              <h4 className="font-medium text-blue-900">
                {folders.find(f => f.id === selectedFolder)?.name}
              </h4>
              {folders.find(f => f.id === selectedFolder)?.description && (
                <p className="text-blue-700 text-sm">
                  {folders.find(f => f.id === selectedFolder)?.description}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Examinations Grid */}
      {filteredExaminations.length === 0 ? (
        <div className="bg-white p-8 rounded-lg shadow-sm text-center">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {selectedFolder ? 'No examinations in this folder' : 'No unassigned examinations'}
          </h3>
          <p className="text-gray-600 mb-4">
            {selectedFolder 
              ? 'Move examinations to this folder or create new ones.'
              : 'Create your first examination or organize existing ones into folders.'
            }
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            Create Examination
          </button>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredExaminations.map((exam) => (
            <div key={exam.id} className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex justify-between items-start mb-4">
                <h4 className="text-lg font-medium text-gray-900 truncate">{exam.title}</h4>
                <div className="flex space-x-1">
                  {/* Toggle Active/Inactive */}
                  <button
                    onClick={() => handleToggleActive(exam)}
                    className={`p-1 rounded transition-colors ${
                      exam.is_active 
                        ? 'text-green-600 hover:text-green-800' 
                        : 'text-gray-400 hover:text-gray-600'
                    }`}
                    title={exam.is_active ? 'Disable exam' : 'Enable exam'}
                  >
                    {exam.is_active ? <Power className="h-4 w-4" /> : <PowerOff className="h-4 w-4" />}
                  </button>
                  
                  {/* Reactivate (only show if inactive) */}
                  {!exam.is_active && (
                    <button
                      onClick={() => handleReactivateExam(exam)}
                      className="text-blue-600 hover:text-blue-800 transition-colors"
                      title="Reactivate exam"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </button>
                  )}
                  
                  {/* Duplicate */}
                  <button
                    onClick={() => handleDuplicateExam(exam)}
                    className="text-purple-600 hover:text-purple-800 transition-colors"
                    title="Duplicate exam"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                  
                  {/* Edit */}
                  <button
                    onClick={() => handleEdit(exam)}
                    className="text-blue-600 hover:text-blue-800 transition-colors"
                    title="Edit exam"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  
                  {/* Delete */}
                  <button
                    onClick={() => handleDeleteClick(exam)}
                    className="text-red-600 hover:text-red-800 transition-colors"
                    title="Delete exam"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
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

              {/* Folder Assignment */}
              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-700 mb-1">Folder:</label>
                <select
                  value={exam.folder_id || ''}
                  onChange={(e) => moveExamToFolder(exam.id, e.target.value || null)}
                  className="w-full text-xs px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Unassigned</option>
                  {folders.map((folder) => (
                    <option key={folder.id} value={folder.id}>
                      {folder.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-between">
                <span className={`px-2 py-1 text-xs rounded-full ${
                  exam.is_active 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {exam.is_active ? 'Active' : 'Inactive'}
                </span>
                <div className="flex items-center space-x-1 text-gray-500 text-xs">
                  <Users className="h-3 w-3" />
                  <span>0 submissions</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Delete Examination"
        message="Are you sure you want to delete this examination? This action will permanently remove the examination and all associated data."
        itemName={deleteModal.examination?.title}
        loading={deleteModal.loading}
      />

      {showForm && (
        <ExaminationForm
          examination={editingExam}
          onClose={handleFormClose}
        />
      )}

      {showFolderManager && (
        <FolderManager
          folders={folders}
          onCreateFolder={handleCreateFolder}
          onUpdateFolder={handleUpdateFolder}
          onDeleteFolder={handleDeleteFolder}
          onClose={() => setShowFolderManager(false)}
        />
      )}
    </div>
  );
}