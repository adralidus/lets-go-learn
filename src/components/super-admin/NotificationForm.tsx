import { useState } from 'react';
import { createSystemNotification, logAdminActivity } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { X, Send } from 'lucide-react';
import { useForm } from 'react-hook-form';

interface NotificationFormProps {
  onClose: () => void;
}

interface FormData {
  title: string;
  message: string;
  notification_type: 'info' | 'warning' | 'error' | 'success';
  target_type: 'system_wide' | 'role' | 'user';
  target_role?: 'super_admin' | 'admin' | 'student';
  target_user_id?: string;
  expires_at?: string;
}

export function NotificationForm({ onClose }: NotificationFormProps) {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  
  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      notification_type: 'info',
      target_type: 'system_wide'
    }
  });

  const targetType = watch('target_type');

  const onSubmit = async (data: FormData) => {
    if (!user) return;
    
    setLoading(true);
    
    try {
      const isSystemWide = data.target_type === 'system_wide';
      const targetRole = data.target_type === 'role' ? data.target_role : undefined;
      const targetUserId = data.target_type === 'user' ? data.target_user_id : undefined;
      const expiresAt = data.expires_at ? new Date(data.expires_at).toISOString() : undefined;

      await createSystemNotification(
        data.title,
        data.message,
        data.notification_type,
        targetRole,
        targetUserId,
        isSystemWide,
        user.id,
        expiresAt
      );

      // Log the activity
      await logAdminActivity(
        user.id,
        'create',
        'system_notification',
        undefined,
        {
          notification_title: data.title,
          notification_type: data.notification_type,
          target_type: data.target_type,
          target_role: targetRole,
          is_system_wide: isSystemWide
        }
      );

      onClose();
    } catch (error) {
      console.error('Error creating notification:', error);
      alert('Error creating notification. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="flex justify-between items-center p-6 border-b">
          <h3 className="text-lg font-medium text-gray-900">Create System Notification</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Title</label>
            <input
              {...register('title', { required: 'Title is required' })}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
              placeholder="Enter notification title"
            />
            {errors.title && <p className="text-red-600 text-sm mt-1">{errors.title.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Message</label>
            <textarea
              {...register('message', { required: 'Message is required' })}
              rows={4}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
              placeholder="Enter notification message"
            />
            {errors.message && <p className="text-red-600 text-sm mt-1">{errors.message.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Type</label>
            <select
              {...register('notification_type')}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="info">Information</option>
              <option value="success">Success</option>
              <option value="warning">Warning</option>
              <option value="error">Error</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Target Audience</label>
            <select
              {...register('target_type')}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="system_wide">All Users (System-wide)</option>
              <option value="role">Specific Role</option>
              <option value="user">Specific User</option>
            </select>
          </div>

          {targetType === 'role' && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Target Role</label>
              <select
                {...register('target_role', { required: targetType === 'role' ? 'Target role is required' : false })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="">Select a role</option>
                <option value="super_admin">Super Administrators</option>
                <option value="admin">Administrators</option>
                <option value="student">Students</option>
              </select>
              {errors.target_role && <p className="text-red-600 text-sm mt-1">{errors.target_role.message}</p>}
            </div>
          )}

          {targetType === 'user' && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Target User ID</label>
              <input
                {...register('target_user_id', { required: targetType === 'user' ? 'Target user ID is required' : false })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                placeholder="Enter user ID"
              />
              {errors.target_user_id && <p className="text-red-600 text-sm mt-1">{errors.target_user_id.message}</p>}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Expiration Date (Optional)
            </label>
            <input
              type="datetime-local"
              {...register('expires_at')}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
            />
            <p className="text-xs text-gray-500 mt-1">Leave blank for permanent notification</p>
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
                <Send className="h-4 w-4" />
              )}
              <span>{loading ? 'Sending...' : 'Send Notification'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}