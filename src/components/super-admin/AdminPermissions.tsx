import { useState, useEffect } from 'react';
import { supabase, AdminPermission, User, logAdminActivity } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Key, Plus, Trash2, Shield } from 'lucide-react';
import { PermissionForm } from './PermissionForm';

export function AdminPermissions() {
  const [permissions, setPermissions] = useState<AdminPermission[]>([]);
  const [instructors, setInstructors] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [permissionsResult, instructorsResult] = await Promise.all([
        supabase
          .from('admin_permissions')
          .select(`
            *,
            admin:users!admin_permissions_admin_id_fkey(full_name, username, role),
            granted_by_user:users!admin_permissions_granted_by_fkey(full_name, username)
          `)
          .order('created_at', { ascending: false }),
        
        supabase
          .from('users')
          .select('*')
          .in('role', ['admin', 'super_admin'])
          .order('full_name')
      ]);

      if (permissionsResult.error) throw permissionsResult.error;
      if (instructorsResult.error) throw instructorsResult.error;

      setPermissions(permissionsResult.data || []);
      setInstructors(instructorsResult.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (permission: AdminPermission) => {
    if (!confirm(`Are you sure you want to revoke this permission for ${permission.admin?.full_name}?`)) return;

    try {
      const { error } = await supabase
        .from('admin_permissions')
        .delete()
        .eq('id', permission.id);

      if (error) throw error;

      // Log the activity
      if (user) {
        await logAdminActivity(
          user.id,
          'delete',
          'instructor_permission',
          permission.id,
          {
            instructor_name: permission.admin?.full_name,
            permission_type: permission.permission_type,
            resource_type: permission.resource_type
          }
        );
      }

      fetchData();
    } catch (error) {
      console.error('Error deleting permission:', error);
      alert('Error deleting permission. Please try again.');
    }
  };

  const handleFormClose = () => {
    setShowForm(false);
    fetchData();
  };

  const getPermissionColor = (permission: AdminPermission) => {
    const hasFullAccess = permission.can_create && permission.can_read && permission.can_update && permission.can_delete;
    const hasNoAccess = !permission.can_create && !permission.can_read && !permission.can_update && !permission.can_delete;
    
    if (hasFullAccess) return 'bg-green-100 text-green-800';
    if (hasNoAccess) return 'bg-red-100 text-red-800';
    return 'bg-yellow-100 text-yellow-800';
  };

  const getPermissionLevel = (permission: AdminPermission) => {
    const permissions = [
      permission.can_create && 'Create',
      permission.can_read && 'Read',
      permission.can_update && 'Update',
      permission.can_delete && 'Delete'
    ].filter(Boolean);

    if (permissions.length === 4) return 'Full Access';
    if (permissions.length === 0) return 'No Access';
    return permissions.join(', ');
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
        <div className="flex items-center space-x-3">
          <Key className="h-6 w-6 text-purple-600" />
          <h3 className="text-lg font-medium text-gray-900">Instructor Permissions</h3>
        </div>
        
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Grant Permission</span>
        </button>
      </div>

      {/* Permissions Table */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Instructor
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Permission Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Resource
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Access Level
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Granted By
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {permissions.map((permission) => (
              <tr key={permission.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                        permission.admin?.role === 'super_admin' ? 'bg-purple-100' : 'bg-blue-100'
                      }`}>
                        <Shield className={`h-5 w-5 ${
                          permission.admin?.role === 'super_admin' ? 'text-purple-600' : 'text-blue-600'
                        }`} />
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        {permission.admin?.full_name || 'Unknown Instructor'}
                      </div>
                      <div className="text-sm text-gray-500">
                        @{permission.admin?.username || 'unknown'}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                    {permission.permission_type.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {permission.resource_type.replace('_', ' ')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPermissionColor(permission)}`}>
                    {getPermissionLevel(permission)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {permission.granted_by_user?.full_name || 'System'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => handleDelete(permission)}
                    className="text-red-600 hover:text-red-900 transition-colors"
                    title="Revoke Permission"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {permissions.length === 0 && (
          <div className="text-center py-12">
            <Key className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No permissions configured</h3>
            <p className="text-gray-600 mb-4">Grant specific permissions to instructors to control their access.</p>
            <button
              onClick={() => setShowForm(true)}
              className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors"
            >
              Grant Permission
            </button>
          </div>
        )}
      </div>

      {showForm && (
        <PermissionForm
          admins={instructors}
          onClose={handleFormClose}
        />
      )}
    </div>
  );
}