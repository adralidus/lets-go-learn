import { useState, useEffect } from 'react';
import { supabase, User, logAdminActivity } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Plus, Edit, Trash2, Shield, Eye, EyeOff, Key, RotateCcw } from 'lucide-react';
import { AdminForm } from './AdminForm';
import { format } from 'date-fns';

export function AdminManager() {
  const [instructors, setInstructors] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingInstructor, setEditingInstructor] = useState<User | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    fetchInstructors();
  }, []);

  const fetchInstructors = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .in('role', ['admin', 'super_admin'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInstructors(data || []);
    } catch (error) {
      console.error('Error fetching instructors:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (instructorToDelete: User) => {
    if (!confirm(`Are you sure you want to delete instructor "${instructorToDelete.full_name}"?`)) return;

    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', instructorToDelete.id);

      if (error) throw error;

      // Log the activity
      if (user) {
        await logAdminActivity(
          user.id,
          'delete',
          'instructor',
          instructorToDelete.id,
          { 
            deleted_instructor: instructorToDelete.full_name,
            deleted_role: instructorToDelete.role 
          }
        );
      }

      fetchInstructors();
    } catch (error) {
      console.error('Error deleting instructor:', error);
      alert('Error deleting instructor. Please try again.');
    }
  };

  const handleEdit = (instructor: User) => {
    setEditingInstructor(instructor);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingInstructor(null);
    fetchInstructors();
  };

  const handleToggleRole = async (instructor: User) => {
    const newRole = instructor.role === 'admin' ? 'super_admin' : 'admin';
    
    if (!confirm(`Are you sure you want to change ${instructor.full_name}'s role to ${newRole === 'super_admin' ? 'Super Admin' : 'Instructor'}?`)) return;

    try {
      const { error } = await supabase
        .from('users')
        .update({ role: newRole })
        .eq('id', instructor.id);

      if (error) throw error;

      // Log the activity
      if (user) {
        await logAdminActivity(
          user.id,
          'update',
          'instructor',
          instructor.id,
          { 
            instructor_name: instructor.full_name,
            old_role: instructor.role,
            new_role: newRole 
          }
        );
      }

      fetchInstructors();
    } catch (error) {
      console.error('Error updating instructor role:', error);
      alert('Error updating instructor role. Please try again.');
    }
  };

  const handleResetPassword = async (instructor: User) => {
    const newPassword = prompt(`Enter new password for ${instructor.full_name}:`);
    if (!newPassword) return;

    try {
      const { error } = await supabase
        .from('users')
        .update({ password_hash: newPassword })
        .eq('id', instructor.id);

      if (error) throw error;

      // Log the activity
      if (user) {
        await logAdminActivity(
          user.id,
          'update',
          'instructor',
          instructor.id,
          { 
            instructor_name: instructor.full_name,
            action: 'password_reset'
          }
        );
      }

      alert('Password updated successfully!');
    } catch (error) {
      console.error('Error resetting password:', error);
      alert('Error resetting password. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">Instructor Management</h3>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Create Instructor</span>
        </button>
      </div>

      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Instructor
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Last Login
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {instructors.map((instructor) => (
              <tr key={instructor.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                        instructor.role === 'super_admin' ? 'bg-purple-100' : 'bg-blue-100'
                      }`}>
                        <Shield className={`h-5 w-5 ${
                          instructor.role === 'super_admin' ? 'text-purple-600' : 'text-blue-600'
                        }`} />
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">{instructor.full_name}</div>
                      <div className="text-sm text-gray-500">{instructor.email}</div>
                      <div className="text-xs text-gray-400">@{instructor.username}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    instructor.role === 'super_admin' 
                      ? 'bg-purple-100 text-purple-800' 
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {instructor.role === 'super_admin' ? 'Super Admin' : 'Instructor'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {instructor.last_login ? (
                    format(new Date(instructor.last_login), 'MMM dd, yyyy HH:mm')
                  ) : (
                    <span className="text-gray-400">Never</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {format(new Date(instructor.created_at), 'MMM dd, yyyy')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex justify-end space-x-2">
                    {/* Toggle Role */}
                    <button
                      onClick={() => handleToggleRole(instructor)}
                      className="text-purple-600 hover:text-purple-900 transition-colors"
                      title={`Change to ${instructor.role === 'admin' ? 'Super Admin' : 'Instructor'}`}
                    >
                      {instructor.role === 'admin' ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </button>
                    
                    {/* Reset Password */}
                    <button
                      onClick={() => handleResetPassword(instructor)}
                      className="text-orange-600 hover:text-orange-900 transition-colors"
                      title="Reset Password"
                    >
                      <Key className="h-4 w-4" />
                    </button>
                    
                    {/* Edit */}
                    <button
                      onClick={() => handleEdit(instructor)}
                      className="text-blue-600 hover:text-blue-900 transition-colors"
                      title="Edit Instructor"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    
                    {/* Delete (only if not current user and not the only super admin) */}
                    {instructor.id !== user?.id && !(instructor.role === 'super_admin' && instructors.filter(a => a.role === 'super_admin').length === 1) && (
                      <button
                        onClick={() => handleDelete(instructor)}
                        className="text-red-600 hover:text-red-900 transition-colors"
                        title="Delete Instructor"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {instructors.length === 0 && (
          <div className="text-center py-12">
            <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No instructors found</h3>
            <p className="text-gray-600 mb-4">Create your first instructor account to get started.</p>
            <button
              onClick={() => setShowForm(true)}
              className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors"
            >
              Create Instructor
            </button>
          </div>
        )}
      </div>

      {showForm && (
        <AdminForm
          admin={editingInstructor}
          onClose={handleFormClose}
        />
      )}
    </div>
  );
}