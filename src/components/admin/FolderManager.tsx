import { useState } from 'react';
import { ExamFolder } from '../../lib/supabase';
import { X, Folder, Plus, Edit, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';

interface FolderManagerProps {
  folders: ExamFolder[];
  onCreateFolder: (name: string, description: string) => Promise<void>;
  onUpdateFolder: (id: string, name: string, description: string) => Promise<void>;
  onDeleteFolder: (id: string) => Promise<void>;
  onClose: () => void;
}

interface FolderFormData {
  name: string;
  description: string;
}

export function FolderManager({ folders, onCreateFolder, onUpdateFolder, onDeleteFolder, onClose }: FolderManagerProps) {
  const [editingFolder, setEditingFolder] = useState<ExamFolder | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors }, reset } = useForm<FolderFormData>();

  const onSubmit = async (data: FolderFormData) => {
    setLoading(true);
    try {
      if (editingFolder) {
        await onUpdateFolder(editingFolder.id, data.name, data.description);
      } else {
        await onCreateFolder(data.name, data.description);
      }
      reset();
      setShowForm(false);
      setEditingFolder(null);
    } catch (error) {
      console.error('Error saving folder:', error);
      alert('Error saving folder. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (folder: ExamFolder) => {
    setEditingFolder(folder);
    reset({
      name: folder.name,
      description: folder.description
    });
    setShowForm(true);
  };

  const handleDelete = async (folder: ExamFolder) => {
    if (!confirm(`Are you sure you want to delete the folder "${folder.name}"? Exams in this folder will become unassigned.`)) {
      return;
    }
    
    try {
      await onDeleteFolder(folder.id);
    } catch (error) {
      console.error('Error deleting folder:', error);
      alert('Error deleting folder. Please try again.');
    }
  };

  const handleNewFolder = () => {
    setEditingFolder(null);
    reset({ name: '', description: '' });
    setShowForm(true);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b">
          <h3 className="text-lg font-medium text-gray-900">Manage Exam Folders</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h4 className="text-md font-medium text-gray-900">Folders</h4>
            <button
              onClick={handleNewFolder}
              className="flex items-center space-x-2 bg-blue-600 text-white px-3 py-2 rounded-md hover:bg-blue-700 transition-colors text-sm"
            >
              <Plus className="h-4 w-4" />
              <span>New Folder</span>
            </button>
          </div>

          {showForm && (
            <form onSubmit={handleSubmit(onSubmit)} className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h5 className="text-sm font-medium text-gray-900 mb-3">
                {editingFolder ? 'Edit Folder' : 'Create New Folder'}
              </h5>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Folder Name</label>
                  <input
                    {...register('name', { required: 'Folder name is required' })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                    placeholder="Enter folder name"
                  />
                  {errors.name && <p className="text-red-600 text-xs mt-1">{errors.name.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Description (Optional)</label>
                  <textarea
                    {...register('description')}
                    rows={2}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                    placeholder="Enter folder description"
                  />
                </div>

                <div className="flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setEditingFolder(null);
                      reset();
                    }}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-3 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                  >
                    {loading ? 'Saving...' : editingFolder ? 'Update' : 'Create'}
                  </button>
                </div>
              </div>
            </form>
          )}

          <div className="space-y-3">
            {folders.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Folder className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p>No folders created yet.</p>
                <p className="text-sm">Create your first folder to organize exams.</p>
              </div>
            ) : (
              folders.map((folder) => (
                <div key={folder.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                  <div className="flex items-center space-x-3">
                    <Folder className="h-5 w-5 text-blue-600" />
                    <div>
                      <h6 className="font-medium text-gray-900">{folder.name}</h6>
                      {folder.description && (
                        <p className="text-sm text-gray-600">{folder.description}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleEdit(folder)}
                      className="text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(folder)}
                      className="text-red-600 hover:text-red-800 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}