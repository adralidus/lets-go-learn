import { useState } from 'react';
import { supabase, User, logAdminActivity } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { X, Key } from 'lucide-react';
import { useForm } from 'react-hook-form';

interface PermissionFormProps {
  admins: User[];
  onClose: () => void;
}

interface FormData {
  admin_id: string;
  permission_type: string;
  resource_type: string;
  can_create: boolean;
  can_read: boolean;
  can_update: boolean;
  can_delete: boolean;
}

export function PermissionForm({ admins, onClose }: PermissionFormProps) {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      can_read: true
    }
  });

  const permissionTypes = [
    'system_admin',
    'user_management',
    'exam_management',
    'content_management',
    'reporting',
    'settings_management'
  ];

  const resourceTypes = [
    'users',
    'examinations',
    'exam_questions',
    'exam_submissions',
    'system_settings',
    'activity_logs',
    'notifications'
  ];

  const onSubmit = async (data: FormData) => {
    if (!user) return;
    
    setLoading(true);
    
    try {
      const { data: newPermission, error } = await supabase
        .from('admin_permissions')
        .insert({
          admin_id: data.admin_id,
          permission_type: data.permission_type,
          resource_type: data.resource_type,
          can_create: data.can_create,
          can_read: data.can_read,
          can_update: data.can_update,
          can_delete: data.can_delete,
          granted_by: user.id
        })
        .select()
        .single();

      if (error) throw error;

      // Log the activity
      const selectedAdmin = admins.find(a => a.id === data.admin_id);
      await logAdminActivity(
        user.id,
        'create',
        'admin_permission',
        newPermission.id,
        {
          admin_name: selectedAdmin?.full_name,
          permission_type: data.permission_type,
          resource_type: data.resource_type,
          permissions: {
            create: data.can_create,
            read: data.can_read,
            update: data.can_update,
            delete: data.can_delete
          }
        }
      );

      onClose();
    } catch (error: any) {
      console.error('Error creating permission:', error);
      if (error.code === '23505') {
        alert('This permission already exists for the selected administrator.');
      } else {
        alert('Error creating permission. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="flex justify-between items-center p-6 border-b">
          <h3 className="text-lg font-medium text-gray-900">Grant Admin Permission</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Administrator</label>
            <select
              {...register('admin_id', { required: 'Administrator is required' })}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="">Select an administrator</option>
              {admins.map((admin) => (
                <option key={admin.id} value={admin.id}>
                  {admin.full_name} (@{admin.username}) - {admin.role.replace('_', ' ')}
                </option>
              ))}
            </select>
            {errors.admin_id && <p className="text-red-600 text-sm mt-1">{errors.admin_id.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Permission Type</label>
            <select
              {...register('permission_type', { required: 'Permission type is required' })}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="">Select permission type</option>
              {permissionTypes.map((type) => (
                <option key={type} value={type}>
                  {type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </option>
              ))}
            </select>
            {errors.permission_type && <p className="text-red-600 text-sm mt-1">{errors.permission_type.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Resource Type</label>
            <select
              {...register('resource_type', { required: 'Resource type is required' })}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="">Select resource type</option>
              {resourceTypes.map((type) => (
                <option key={type} value={type}>
                  {type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </option>
              ))}
            </select>
            {errors.resource_type && <p className="text-red-600 text-sm mt-1">{errors.resource_type.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Permissions</label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  {...register('can_create')}
                  className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">Create</span>
              </label>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  {...register('can_read')}
                  className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">Read</span>
              </label>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  {...register('can_update')}
                  className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">Update</span>
              </label>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  {...register('can_delete')}
                  className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">Delete</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center space-x-2 px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <Key className="h-4 w-4" />
              )}
              <span>{loading ? 'Granting...' : 'Grant Permission'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}