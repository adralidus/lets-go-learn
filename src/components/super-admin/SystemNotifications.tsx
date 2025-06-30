import { useState, useEffect } from 'react';
import { supabase, SystemNotification, createSystemNotification, logAdminActivity } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Bell, Plus, Trash2, Send, Users, Shield, GraduationCap, Mail } from 'lucide-react';
import { NotificationForm } from './NotificationForm';
import { format } from 'date-fns';

export function SystemNotifications() {
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('system_notifications')
        .select(`
          *,
          created_by_user:users!system_notifications_created_by_fkey(full_name, username),
          target_user:users!system_notifications_target_user_id_fkey(full_name, username, email)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (notification: SystemNotification) => {
    if (!confirm('Are you sure you want to delete this notification?')) return;

    try {
      const { error } = await supabase
        .from('system_notifications')
        .delete()
        .eq('id', notification.id);

      if (error) throw error;

      // Log the activity
      if (user) {
        await logAdminActivity(
          user.id,
          'delete',
          'system_notification',
          notification.id,
          {
            notification_title: notification.title,
            notification_type: notification.notification_type
          }
        );
      }

      fetchNotifications();
    } catch (error) {
      console.error('Error deleting notification:', error);
      alert('Error deleting notification. Please try again.');
    }
  };

  const handleFormClose = () => {
    setShowForm(false);
    fetchNotifications();
  };

  const getNotificationTypeColor = (type: string) => {
    switch (type) {
      case 'success': return 'bg-green-100 text-green-800';
      case 'warning': return 'bg-yellow-100 text-yellow-800';
      case 'error': return 'bg-red-100 text-red-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  const getTargetIcon = (targetRole?: string, isSystemWide?: boolean, isInquiry?: boolean) => {
    if (isInquiry) return <Mail className="h-4 w-4 text-blue-600" />;
    if (isSystemWide) return <Users className="h-4 w-4" />;
    
    switch (targetRole) {
      case 'super_admin':
      case 'admin':
        return <Shield className="h-4 w-4" />;
      case 'student':
        return <GraduationCap className="h-4 w-4" />;
      default:
        return <Users className="h-4 w-4" />;
    }
  };

  const getTargetLabel = (notification: SystemNotification) => {
    // Check if it's an inquiry by looking at the title
    if (notification.title.startsWith('New Inquiry:')) {
      return 'Inquiry from ' + notification.message.split('\n')[0].replace('Email: ', '');
    }
    
    if (notification.is_system_wide) return 'All Users';
    if (notification.target_role) return notification.target_role === 'super_admin' ? 'Super Admin' : 
                                         notification.target_role === 'admin' ? 'Instructor' : 'Student';
    if (notification.target_user_id) return notification.target_user?.full_name || 'Specific User';
    return 'Unknown';
  };

  const isInquiry = (notification: SystemNotification) => {
    return notification.title.startsWith('New Inquiry:');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  // Separate inquiries from other notifications
  const inquiries = notifications.filter(n => isInquiry(n));
  const regularNotifications = notifications.filter(n => !isInquiry(n));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <Bell className="h-6 w-6 text-purple-600" />
          <h3 className="text-lg font-medium text-gray-900">System Notifications</h3>
        </div>
        
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Create Notification</span>
        </button>
      </div>

      {/* Inquiries Section */}
      {inquiries.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-lg font-medium text-gray-900 flex items-center space-x-2">
            <Mail className="h-5 w-5 text-blue-600" />
            <span>Contact Inquiries</span>
            <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full">
              {inquiries.length}
            </span>
          </h4>
          
          {inquiries.map((inquiry) => (
            <div key={inquiry.id} className="bg-blue-50 p-6 rounded-lg shadow-sm border border-blue-200">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h4 className="text-lg font-medium text-gray-900">{inquiry.title.replace('New Inquiry: ', '')}</h4>
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                      Inquiry
                    </span>
                  </div>
                  
                  <div className="bg-white p-4 rounded-md border border-blue-100 mb-4 whitespace-pre-wrap">
                    {inquiry.message}
                  </div>
                  
                  <div className="flex items-center space-x-6 text-sm text-gray-500">
                    <div className="flex items-center space-x-2">
                      <Mail className="h-4 w-4 text-blue-600" />
                      <span>From: {inquiry.message.split('\n')[0].replace('Email: ', '')}</span>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <span>Received: {format(new Date(inquiry.created_at), 'MMM dd, yyyy HH:mm')}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2 ml-4">
                  <button
                    onClick={() => handleDelete(inquiry)}
                    className="text-red-600 hover:text-red-900 transition-colors"
                    title="Delete Inquiry"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Regular Notifications */}
      <div className="space-y-4">
        <h4 className="text-lg font-medium text-gray-900">System Notifications</h4>
        
        {regularNotifications.length > 0 ? (
          regularNotifications.map((notification) => (
            <div key={notification.id} className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h4 className="text-lg font-medium text-gray-900">{notification.title}</h4>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getNotificationTypeColor(notification.notification_type)}`}>
                      {notification.notification_type}
                    </span>
                  </div>
                  
                  <p className="text-gray-700 mb-4">{notification.message}</p>
                  
                  <div className="flex items-center space-x-6 text-sm text-gray-500">
                    <div className="flex items-center space-x-2">
                      {getTargetIcon(notification.target_role || undefined, notification.is_system_wide)}
                      <span>Target: {getTargetLabel(notification)}</span>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <span>Created: {format(new Date(notification.created_at), 'MMM dd, yyyy HH:mm')}</span>
                    </div>
                    
                    {notification.created_by_user && (
                      <div className="flex items-center space-x-2">
                        <span>By: {notification.created_by_user.full_name}</span>
                      </div>
                    )}
                    
                    {notification.expires_at && (
                      <div className="flex items-center space-x-2">
                        <span>Expires: {format(new Date(notification.expires_at), 'MMM dd, yyyy HH:mm')}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center space-x-2 ml-4">
                  <button
                    onClick={() => handleDelete(notification)}
                    className="text-red-600 hover:text-red-900 transition-colors"
                    title="Delete Notification"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white p-8 rounded-lg shadow-sm text-center">
            <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No notifications</h3>
            <p className="text-gray-600 mb-4">Create your first system notification to communicate with users.</p>
            <button
              onClick={() => setShowForm(true)}
              className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors"
            >
              Create Notification
            </button>
          </div>
        )}
      </div>

      {notifications.length === 0 && (
        <div className="bg-white p-8 rounded-lg shadow-sm text-center">
          <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No notifications or inquiries</h3>
          <p className="text-gray-600 mb-4">Create your first system notification to communicate with users.</p>
          <button
            onClick={() => setShowForm(true)}
            className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors"
          >
            Create Notification
          </button>
        </div>
      )}

      {showForm && (
        <NotificationForm onClose={handleFormClose} />
      )}
    </div>
  );
}