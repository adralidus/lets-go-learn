import { useState, useEffect } from 'react';
import { supabase, User, logAdminActivity } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Plus, Edit, Trash2, Shield, Eye, EyeOff, Key, RotateCcw } from 'lucide-react';
import { AdminForm } from './AdminForm';
import { format } from 'date-fns';

export function AdminManager() {
  const [admins, setAdmins] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<User | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .in('role', ['admin', 'super_admin'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAdmins(data || []);
    } catch (error) {
      console.error('Error fetching admins:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (adminToDelete: User) => {
    if (!confirm(`Are you sure you want to delete admin "${adminToDelete.full_name}"?`)) return;

    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', adminToDelete.id);

      if (error) throw error;

      // Log the activity
      if (user) {
        await logAdminActivity(
          user.id,
          'delete',
          'admin',
          adminToDelete.id,
          { 
            deleted_admin: adminToDelete.full_name,
            deleted_role: adminToDelete.role 
          }
        );
      }

      fetchAdmins();
    } catch (error) {
      console.error('Error deleting admin:', error);
      alert('Error deleting admin. Please try again.');
    }
  };

  const handleEdit = (admin: User) => {
    setEditingAdmin(admin);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingAdmin(null);
    fetchAdmins();
  };

  const handleToggleRole = async (admin: User) => {
    const newRole = admin.role === 'admin' ? 'super_admin' : 'admin';
    
    if (!confirm(`Are you sure you want to change ${admin.full_name}'s role to ${newRole.replace('_', ' ')}?`)) return;

    try {
      const { error } = await supabase
        .from('users')
        .update({ role: newRole })
        .eq('id', admin.id);

      if (error) throw error;

      // Log the activity
      if (user) {
        await logAdminActivity(
          user.id,
          'update',
          'admin',
          admin.id,
          { 
            admin_name: admin.full_name,
            old_role: admin.role,
            new_role: newRole 
          }
        );
      }

      fetchAdmins();
    } catch (error) {
      console.error('Error updating admin role:', error);
      alert('Error updating admin role. Please try again.');
    }
  };

  const handleResetPassword = async (admin: User) => {
    const newPassword = prompt(`Enter new password for ${admin.full_name}:`);
    if (!newPassword) return;

    try {
      const { error } = await supabase
        .from('users')
        .update({ password_hash: newPassword })
        .eq('id', admin.id);

      if (error) throw error;

      // Log the activity
      if (user) {
        await logAdminActivity(
          user.id,
          'update',
          'admin',
          admin.id,
          { 
            admin_name: admin.full_name,
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
        <h3 className="text-lg font-medium text-gray-900">Administrator Management</h3>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Create Administrator</span>
        </button>
      </div>

      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Administrator
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
            {admins.map((admin) => (
              <tr key={admin.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                        admin.role === 'super_admin' ? 'bg-purple-100' : 'bg-blue-100'
                      }`}>
                        <Shield className={`h-5 w-5 ${
                          admin.role === 'super_admin' ? 'text-purple-600' : 'text-blue-600'
                        }`} />
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">{admin.full_name}</div>
                      <div className="text-sm text-gray-500">{admin.email}</div>
                      <div className="text-xs text-gray-400">@{admin.username}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    admin.role === 'super_admin' 
                      ? 'bg-purple-100 text-purple-800' 
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {admin.role.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {admin.last_login ? (
                    format(new Date(admin.last_login), 'MMM dd, yyyy HH:mm')
                  ) : (
                    <span className="text-gray-400">Never</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {format(new Date(admin.created_at), 'MMM dd, yyyy')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex justify-end space-x-2">
                    {/* Toggle Role */}
                    <button
                      onClick={() => handleToggleRole(admin)}
                      className="text-purple-600 hover:text-purple-900 transition-colors"
                      title={`Change to ${admin.role === 'admin' ? 'Super Admin' : 'Admin'}`}
                    >
                      {admin.role === 'admin' ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </button>
                    
                    {/* Reset Password */}
                    <button
                      onClick={() => handleResetPassword(admin)}
                      className="text-orange-600 hover:text-orange-900 transition-colors"
                      title="Reset Password"
                    >
                      <Key className="h-4 w-4" />
                    </button>
                    
                    {/* Edit */}
                    <button
                      onClick={() => handleEdit(admin)}
                      className="text-blue-600 hover:text-blue-900 transition-colors"
                      title="Edit Admin"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    
                    {/* Delete (only if not current user and not the only super admin) */}
                    {admin.id !== user?.id && !(admin.role === 'super_admin' && admins.filter(a => a.role === 'super_admin').length === 1) && (
                      <button
                        onClick={() => handleDelete(admin)}
                        className="text-red-600 hover:text-red-900 transition-colors"
                        title="Delete Admin"
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

        {admins.length === 0 && (
          <div className="text-center py-12">
            <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No administrators found</h3>
            <p className="text-gray-600 mb-4">Create your first administrator account to get started.</p>
            <button
              onClick={() => setShowForm(true)}
              className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors"
            >
              Create Administrator
            </button>
          </div>
        )}
      </div>

      {showForm && (
        <AdminForm
          admin={editingAdmin}
          onClose={handleFormClose}
        />
      )}
    </div>
  );
}