import { useState } from 'react';
import { createSystemNotification, logAdminActivity } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { X, Send, AlertTriangle, Info, CheckCircle, Bell } from 'lucide-react';
import { useForm } from 'react-hook-form';

interface NotificationFormProps {
  onClose: () => void;
}

interface FormData {
  title: string;
  message: string;
  notification_type: 'info' | 'warning' | 'error' | 'success';
  priority: 'low' | 'medium' | 'high' | 'critical';
  target_type: 'system_wide' | 'role' | 'user';
  target_role?: 'super_admin' | 'admin' | 'student';
  target_user_id?: string;
  component?: string;
  expires_at?: string;
  action_required: boolean;
  action_description?: string;
}

export function NotificationForm({ onClose }: NotificationFormProps) {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  
  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      notification_type: 'info',
      priority: 'medium',
      target_type: 'system_wide',
      action_required: false
    }
  });

  const targetType = watch('target_type');
  const notificationType = watch('notification_type');
  const priority = watch('priority');
  const actionRequired = watch('action_required');

  const onSubmit = async (data: FormData) => {
    if (!user) return;
    
    setLoading(true);
    
    try {
      const isSystemWide = data.target_type === 'system_wide';
      const targetRole = data.target_type === 'role' ? data.target_role : undefined;
      const targetUserId = data.target_type === 'user' ? data.target_user_id : undefined;
      const expiresAt = data.expires_at ? new Date(data.expires_at).toISOString() : undefined;
      
      // Enhance message with action information if required
      let enhancedMessage = data.message;
      if (data.action_required && data.action_description) {
        enhancedMessage += `\n\nACTION REQUIRED: ${data.action_description}`;
      }
      
      // Add component information if provided
      if (data.component) {
        enhancedMessage += `\n\nAffected Component: ${data.component}`;
      }
      
      // Add priority information
      enhancedMessage += `\n\nPriority: ${data.priority.toUpperCase()}`;

      await createSystemNotification(
        data.title,
        enhancedMessage,
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
          priority: data.priority,
          target_type: data.target_type,
          target_role: targetRole,
          is_system_wide: isSystemWide,
          component: data.component,
          action_required: data.action_required
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

  const getTypeIcon = () => {
    switch (notificationType) {
      case 'success': return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'warning': return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'error': return <AlertTriangle className="h-5 w-5 text-red-600" />;
      default: return <Info className="h-5 w-5 text-blue-600" />;
    }
  };

  const getTypeColor = () => {
    switch (notificationType) {
      case 'success': return 'bg-green-50 border-green-200 text-green-800';
      case 'warning': return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'error': return 'bg-red-50 border-red-200 text-red-800';
      default: return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  const getPriorityColor = () => {
    switch (priority) {
      case 'critical': return 'bg-red-50 border-red-200 text-red-800';
      case 'high': return 'bg-orange-50 border-orange-200 text-orange-800';
      case 'medium': return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'low': return 'bg-green-50 border-green-200 text-green-800';
      default: return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b">
          <h3 className="text-lg font-medium text-gray-900 flex items-center space-x-2">
            <Bell className="h-5 w-5 text-purple-600" />
            <span>Create System Notification</span>
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          {/* Preview */}
          <div className={`p-4 rounded-md border ${getTypeColor()}`}>
            <div className="flex items-start space-x-3">
              {getTypeIcon()}
              <div>
                <h4 className="font-medium">Notification Preview</h4>
                <p className="text-sm mt-1">This is how your notification will appear to recipients</p>
              </div>
            </div>
          </div>

          {/* Basic Information */}
          <div className="space-y-4">
            <h4 className="text-md font-medium text-gray-900 flex items-center space-x-2">
              <Info className="h-4 w-4 text-purple-600" />
              <span>Basic Information</span>
            </h4>
            
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <label className="block text-sm font-medium text-gray-700">Priority</label>
                <select
                  {...register('priority')}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>
          </div>

          {/* Target Information */}
          <div className="space-y-4">
            <h4 className="text-md font-medium text-gray-900 flex items-center space-x-2">
              <Users className="h-4 w-4 text-purple-600" />
              <span>Target Audience</span>
            </h4>

            <div>
              <label className="block text-sm font-medium text-gray-700">Target Type</label>
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
                  <option value="admin">Instructors</option>
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
          </div>

          {/* Additional Information */}
          <div className="space-y-4">
            <h4 className="text-md font-medium text-gray-900 flex items-center space-x-2">
              <Settings className="h-4 w-4 text-purple-600" />
              <span>Additional Information</span>
            </h4>

            <div>
              <label className="block text-sm font-medium text-gray-700">Affected Component</label>
              <input
                {...register('component')}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                placeholder="e.g., User Management, Examination System, etc."
              />
              <p className="text-xs text-gray-500 mt-1">Specify which system component this notification relates to</p>
            </div>

            <div>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  {...register('action_required')}
                  className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                />
                <span className="text-sm font-medium text-gray-700">Action Required</span>
              </label>
              <p className="text-xs text-gray-500 mt-1 ml-6">Check this if the notification requires action from the recipient</p>
            </div>

            {actionRequired && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Action Description</label>
                <textarea
                  {...register('action_description', { 
                    required: actionRequired ? 'Action description is required' : false 
                  })}
                  rows={2}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                  placeholder="Describe the action that needs to be taken"
                />
                {errors.action_description && <p className="text-red-600 text-sm mt-1">{errors.action_description.message}</p>}
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
          </div>

          {/* Priority Warning for Critical Notifications */}
          {priority === 'critical' && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-red-800">Critical Priority Selected</h4>
                  <p className="text-sm text-red-700 mt-1">
                    Critical notifications should only be used for urgent system-wide issues that require immediate attention.
                    These will be highlighted prominently for all recipients.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4 border-t">
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