import { useState, useEffect } from 'react';
import { supabase, SystemNotification, createSystemNotification, logAdminActivity } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Bell, 
  Plus, 
  Trash2, 
  Send, 
  Users, 
  Shield, 
  GraduationCap, 
  Mail, 
  Filter, 
  Search, 
  AlertTriangle, 
  CheckCircle, 
  Info, 
  Clock, 
  Download, 
  X, 
  ArrowUp, 
  ArrowDown, 
  RefreshCw,
  UserPlus,
  Settings
} from 'lucide-react';
import { NotificationForm } from './NotificationForm';
import { format, isAfter, isBefore, subDays } from 'date-fns';

// Define notification priority types
type NotificationPriority = 'critical' | 'high' | 'medium' | 'low';
type NotificationFilter = 'all' | 'unread' | 'read' | 'inquiries' | 'system' | 'critical';
type SortField = 'created_at' | 'priority' | 'type';
type SortDirection = 'asc' | 'desc';
type DateFilter = 'all' | 'today' | 'week' | 'month';

interface EnhancedNotification extends SystemNotification {
  priority: NotificationPriority;
  component?: string;
  actionItems?: string[];
}

export function SystemNotifications() {
  const [notifications, setNotifications] = useState<EnhancedNotification[]>([]);
  const [filteredNotifications, setFilteredNotifications] = useState<EnhancedNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<EnhancedNotification | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<NotificationFilter>('all');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [selectedNotifications, setSelectedNotifications] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    fetchNotifications();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [notifications, filter, searchQuery, sortField, sortDirection, dateFilter]);

  const fetchNotifications = async () => {
    try {
      setRefreshing(true);
      const { data, error } = await supabase
        .from('system_notifications')
        .select(`
          *,
          created_by_user:users!system_notifications_created_by_fkey(full_name, username),
          target_user:users!system_notifications_target_user_id_fkey(full_name, username, email)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Enhance notifications with priority and other metadata
      const enhancedData = (data || []).map(notification => enhanceNotification(notification));
      
      setNotifications(enhancedData);
      setRefreshing(false);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setRefreshing(false);
    } finally {
      setLoading(false);
    }
  };

  const enhanceNotification = (notification: SystemNotification): EnhancedNotification => {
    // Determine priority based on notification type and content
    let priority: NotificationPriority = 'medium';
    let component = '';
    let actionItems: string[] = [];
    
    // Determine priority based on notification type
    if (notification.notification_type === 'error') {
      priority = 'critical';
    } else if (notification.notification_type === 'warning') {
      priority = 'high';
    } else if (notification.notification_type === 'success') {
      priority = 'low';
    }
    
    // Check for specific keywords in title or message to adjust priority
    const content = (notification.title + ' ' + notification.message).toLowerCase();
    if (content.includes('critical') || content.includes('urgent') || content.includes('emergency')) {
      priority = 'critical';
    } else if (content.includes('important') || content.includes('attention')) {
      priority = 'high';
    }
    
    // Determine affected component
    if (content.includes('user') || content.includes('account')) {
      component = 'User Management';
      actionItems.push('Review user accounts');
    } else if (content.includes('exam') || content.includes('test')) {
      component = 'Examination System';
      actionItems.push('Check examination settings');
    } else if (content.includes('security') || content.includes('access')) {
      component = 'Security';
      priority = priority === 'medium' ? 'high' : priority;
      actionItems.push('Review security logs');
    } else if (content.includes('database') || content.includes('data')) {
      component = 'Database';
      actionItems.push('Check database status');
    } else if (content.includes('backup') || content.includes('restore')) {
      component = 'Backup System';
      actionItems.push('Verify backup integrity');
    } else if (content.includes('inquiry') || content.includes('contact')) {
      component = 'Contact System';
      actionItems.push('Respond to inquiry');
    }
    
    // For inquiries, set specific action items
    if (notification.title.startsWith('New Inquiry:')) {
      component = 'Contact System';
      actionItems = ['Review inquiry', 'Respond to sender'];
      priority = 'high'; // Inquiries are important
    }
    
    return {
      ...notification,
      priority,
      component,
      actionItems
    };
  };

  const applyFilters = () => {
    let result = [...notifications];
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(notification => 
        notification.title.toLowerCase().includes(query) || 
        notification.message.toLowerCase().includes(query) ||
        (notification.component && notification.component.toLowerCase().includes(query))
      );
    }
    
    // Apply type filter
    if (filter === 'unread') {
      result = result.filter(notification => !notification.is_read);
    } else if (filter === 'read') {
      result = result.filter(notification => notification.is_read);
    } else if (filter === 'inquiries') {
      result = result.filter(notification => notification.title.startsWith('New Inquiry:'));
    } else if (filter === 'system') {
      result = result.filter(notification => !notification.title.startsWith('New Inquiry:'));
    } else if (filter === 'critical') {
      result = result.filter(notification => notification.priority === 'critical');
    }
    
    // Apply date filter
    if (dateFilter === 'today') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      result = result.filter(notification => isAfter(new Date(notification.created_at), today));
    } else if (dateFilter === 'week') {
      result = result.filter(notification => 
        isAfter(new Date(notification.created_at), subDays(new Date(), 7))
      );
    } else if (dateFilter === 'month') {
      result = result.filter(notification => 
        isAfter(new Date(notification.created_at), subDays(new Date(), 30))
      );
    }
    
    // Apply sorting
    result.sort((a, b) => {
      if (sortField === 'created_at') {
        return sortDirection === 'desc' 
          ? new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          : new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      } else if (sortField === 'priority') {
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        return sortDirection === 'desc'
          ? priorityOrder[a.priority] - priorityOrder[b.priority]
          : priorityOrder[b.priority] - priorityOrder[a.priority];
      } else if (sortField === 'type') {
        return sortDirection === 'desc'
          ? b.notification_type.localeCompare(a.notification_type)
          : a.notification_type.localeCompare(b.notification_type);
      }
      return 0;
    });
    
    setFilteredNotifications(result);
  };

  const handleDelete = async (notification: EnhancedNotification) => {
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
            notification_type: notification.notification_type,
            priority: notification.priority
          }
        );
      }

      // Update local state
      setNotifications(prev => prev.filter(n => n.id !== notification.id));
      if (selectedNotification?.id === notification.id) {
        setSelectedNotification(null);
      }
      
      // Remove from selected notifications if it was selected
      if (selectedNotifications.includes(notification.id)) {
        setSelectedNotifications(prev => prev.filter(id => id !== notification.id));
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
      alert('Error deleting notification. Please try again.');
    }
  };

  const handleBatchDelete = async () => {
    if (selectedNotifications.length === 0) return;
    
    if (!confirm(`Are you sure you want to delete ${selectedNotifications.length} selected notification(s)?`)) return;

    try {
      const { error } = await supabase
        .from('system_notifications')
        .delete()
        .in('id', selectedNotifications);

      if (error) throw error;

      // Log the activity
      if (user) {
        await logAdminActivity(
          user.id,
          'batch_delete',
          'system_notifications',
          undefined,
          {
            count: selectedNotifications.length,
            notification_ids: selectedNotifications
          }
        );
      }

      // Update local state
      setNotifications(prev => prev.filter(n => !selectedNotifications.includes(n.id)));
      setSelectedNotifications([]);
      setSelectAll(false);
      setSelectedNotification(null);
    } catch (error) {
      console.error('Error deleting notifications:', error);
      alert('Error deleting notifications. Please try again.');
    }
  };

  const handleMarkAsRead = async (notification: EnhancedNotification) => {
    try {
      const { error } = await supabase
        .from('system_notifications')
        .update({ is_read: true })
        .eq('id', notification.id);

      if (error) throw error;

      // Update local state
      setNotifications(prev => prev.map(n => 
        n.id === notification.id ? { ...n, is_read: true } : n
      ));
      
      if (selectedNotification?.id === notification.id) {
        setSelectedNotification({ ...selectedNotification, is_read: true });
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleBatchMarkAsRead = async () => {
    if (selectedNotifications.length === 0) return;
    
    try {
      const { error } = await supabase
        .from('system_notifications')
        .update({ is_read: true })
        .in('id', selectedNotifications);

      if (error) throw error;

      // Update local state
      setNotifications(prev => prev.map(n => 
        selectedNotifications.includes(n.id) ? { ...n, is_read: true } : n
      ));
      
      if (selectedNotification && selectedNotifications.includes(selectedNotification.id)) {
        setSelectedNotification({ ...selectedNotification, is_read: true });
      }
    } catch (error) {
      console.error('Error marking notifications as read:', error);
      alert('Error updating notifications. Please try again.');
    }
  };

  const handleFormClose = () => {
    setShowForm(false);
    fetchNotifications();
  };

  const handleSelectNotification = (notification: EnhancedNotification) => {
    setSelectedNotification(notification);
    
    // If notification is unread, mark it as read
    if (!notification.is_read) {
      handleMarkAsRead(notification);
    }
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedNotifications([]);
    } else {
      setSelectedNotifications(filteredNotifications.map(n => n.id));
    }
    setSelectAll(!selectAll);
  };

  const handleToggleSelect = (id: string) => {
    if (selectedNotifications.includes(id)) {
      setSelectedNotifications(prev => prev.filter(notificationId => notificationId !== id));
    } else {
      setSelectedNotifications(prev => [...prev, id]);
    }
  };

  const handleExport = () => {
    const dataToExport = selectedNotifications.length > 0
      ? notifications.filter(n => selectedNotifications.includes(n.id))
      : notifications;
    
    const jsonData = JSON.stringify(dataToExport, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `system-notifications-${format(new Date(), 'yyyy-MM-dd')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    // Log the export activity
    if (user) {
      logAdminActivity(
        user.id,
        'export',
        'system_notifications',
        undefined,
        {
          count: dataToExport.length,
          export_type: 'json',
          selected_export: selectedNotifications.length > 0
        }
      ).catch(console.error);
    }
  };

  const handleRefresh = () => {
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

  const getNotificationTypeIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'error': return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default: return <Info className="h-4 w-4 text-blue-600" />;
    }
  };

  const getPriorityColor = (priority: NotificationPriority) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-300';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low': return 'bg-green-100 text-green-800 border-green-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getPriorityIcon = (priority: NotificationPriority) => {
    switch (priority) {
      case 'critical': return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'high': return <AlertTriangle className="h-4 w-4 text-orange-600" />;
      case 'medium': return <Info className="h-4 w-4 text-yellow-600" />;
      case 'low': return <Info className="h-4 w-4 text-green-600" />;
      default: return <Info className="h-4 w-4 text-gray-600" />;
    }
  };

  const getTargetIcon = (notification: EnhancedNotification) => {
    if (notification.title.startsWith('New Inquiry:')) {
      return <Mail className="h-4 w-4 text-blue-600" />;
    }
    
    if (notification.is_system_wide) {
      return <Users className="h-4 w-4 text-purple-600" />;
    }
    
    switch (notification.target_role) {
      case 'super_admin': return <Shield className="h-4 w-4 text-purple-600" />;
      case 'admin': return <Shield className="h-4 w-4 text-blue-600" />;
      case 'student': return <GraduationCap className="h-4 w-4 text-green-600" />;
      default: return <Users className="h-4 w-4 text-gray-600" />;
    }
  };

  const getTargetLabel = (notification: EnhancedNotification) => {
    if (notification.title.startsWith('New Inquiry:')) {
      return 'Inquiry from ' + notification.message.split('\n')[0].replace('Email: ', '');
    }
    
    if (notification.is_system_wide) return 'All Users';
    if (notification.target_role) {
      return notification.target_role === 'super_admin' ? 'Super Admin' : 
             notification.target_role === 'admin' ? 'Instructor' : 'Student';
    }
    if (notification.target_user_id) return notification.target_user?.full_name || 'Specific User';
    return 'Unknown';
  };

  const isInquiry = (notification: EnhancedNotification) => {
    return notification.title.startsWith('New Inquiry:');
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
          <Bell className="h-6 w-6 text-purple-600" />
          <h3 className="text-lg font-medium text-gray-900">System Notifications</h3>
          <div className="flex space-x-2">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800`}>
              Total: {notifications.length}
            </span>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800`}>
              Unread: {notifications.filter(n => !n.is_read).length}
            </span>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="text-gray-600 hover:text-gray-900 transition-colors disabled:opacity-50"
            title="Refresh notifications"
          >
            <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Create Notification</span>
          </button>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
          <div className="flex-1 flex items-center space-x-2">
            <Search className="h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notifications..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-purple-500 focus:border-purple-500"
            />
          </div>
          
          <div className="flex flex-wrap gap-2">
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as NotificationFilter)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="all">All Types</option>
                <option value="unread">Unread</option>
                <option value="read">Read</option>
                <option value="inquiries">Inquiries</option>
                <option value="system">System</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-gray-500" />
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value as DateFilter)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">Last 7 Days</option>
                <option value="month">Last 30 Days</option>
              </select>
            </div>
            
            <div className="flex items-center space-x-2">
              {sortField === 'created_at' ? (
                <Clock className="h-4 w-4 text-gray-500" />
              ) : sortField === 'priority' ? (
                <AlertTriangle className="h-4 w-4 text-gray-500" />
              ) : (
                <Info className="h-4 w-4 text-gray-500" />
              )}
              <select
                value={sortField}
                onChange={(e) => setSortField(e.target.value as SortField)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="created_at">Sort by Date</option>
                <option value="priority">Sort by Priority</option>
                <option value="type">Sort by Type</option>
              </select>
            </div>
            
            <button
              onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
              className="flex items-center space-x-1 px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              {sortDirection === 'asc' ? (
                <ArrowUp className="h-4 w-4" />
              ) : (
                <ArrowDown className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Batch Actions */}
      {selectedNotifications.length > 0 && (
        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-purple-800 font-medium">{selectedNotifications.length} notification(s) selected</span>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleBatchMarkAsRead}
              className="flex items-center space-x-1 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              <CheckCircle className="h-4 w-4" />
              <span>Mark as Read</span>
            </button>
            <button
              onClick={handleExport}
              className="flex items-center space-x-1 px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
            >
              <Download className="h-4 w-4" />
              <span>Export</span>
            </button>
            <button
              onClick={handleBatchDelete}
              className="flex items-center space-x-1 px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
              <span>Delete</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex flex-col lg:flex-row space-y-6 lg:space-y-0 lg:space-x-6">
        {/* Notifications List */}
        <div className="lg:w-1/2 space-y-4">
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
              <h4 className="font-medium text-gray-900 flex items-center space-x-2">
                <Bell className="h-4 w-4 text-purple-600" />
                <span>Notifications</span>
                <span className="text-sm text-gray-500">({filteredNotifications.length})</span>
              </h4>
              <div className="flex items-center">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectAll}
                    onChange={handleSelectAll}
                    className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                  />
                  <span className="text-sm text-gray-600">Select All</span>
                </label>
              </div>
            </div>
            
            <div className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
              {filteredNotifications.length > 0 ? (
                filteredNotifications.map((notification) => {
                  const isSelected = selectedNotifications.includes(notification.id);
                  const isActive = selectedNotification?.id === notification.id;
                  
                  return (
                    <div 
                      key={notification.id} 
                      className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                        isActive ? 'bg-purple-50 border-l-4 border-purple-500' : ''
                      } ${!notification.is_read ? 'bg-blue-50' : ''}`}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="flex items-center h-5">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelect(notification.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                          />
                        </div>
                        
                        <div 
                          className="flex-1 min-w-0"
                          onClick={() => handleSelectNotification(notification)}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center space-x-2">
                              {getPriorityIcon(notification.priority)}
                              <h5 className="text-sm font-medium text-gray-900 truncate">{notification.title}</h5>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getNotificationTypeColor(notification.notification_type)}`}>
                                {notification.notification_type}
                              </span>
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getPriorityColor(notification.priority)}`}>
                                {notification.priority}
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                            <div className="flex items-center space-x-2">
                              {getTargetIcon(notification)}
                              <span>{getTargetLabel(notification)}</span>
                            </div>
                            <span>{format(new Date(notification.created_at), 'MMM dd, HH:mm')}</span>
                          </div>
                          
                          <p className="text-sm text-gray-600 line-clamp-2">
                            {notification.message}
                          </p>
                          
                          {notification.component && (
                            <div className="mt-1 flex items-center space-x-2">
                              <Settings className="h-3 w-3 text-gray-400" />
                              <span className="text-xs text-gray-500">{notification.component}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center">
                  <Bell className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No notifications match your filters</p>
                </div>
              )}
            </div>
          </div>
          
          {/* Export All Button */}
          <div className="flex justify-end">
            <button
              onClick={handleExport}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
            >
              <Download className="h-4 w-4" />
              <span className="text-sm">Export All Notifications</span>
            </button>
          </div>
        </div>
        
        {/* Notification Detail View */}
        <div className="lg:w-1/2">
          {selectedNotification ? (
            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
              <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
                <h4 className="font-medium text-gray-900 flex items-center space-x-2">
                  {getNotificationTypeIcon(selectedNotification.notification_type)}
                  <span>Notification Details</span>
                </h4>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setSelectedNotification(null)}
                    className="text-gray-500 hover:text-gray-700"
                    title="Close details"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
              
              <div className="p-6 space-y-6">
                {/* Header */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-semibold text-gray-900">{selectedNotification.title}</h3>
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getNotificationTypeColor(selectedNotification.notification_type)}`}>
                        {selectedNotification.notification_type}
                      </span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(selectedNotification.priority)}`}>
                        {selectedNotification.priority}
                      </span>
                    </div>
                  </div>
                  
                  <div className={`p-3 rounded-md border ${getPriorityColor(selectedNotification.priority)}`}>
                    <div className="flex items-start space-x-2">
                      {getPriorityIcon(selectedNotification.priority)}
                      <div>
                        <p className="text-sm font-medium">
                          {selectedNotification.priority === 'critical' ? 'Critical Alert' : 
                           selectedNotification.priority === 'high' ? 'High Priority' :
                           selectedNotification.priority === 'medium' ? 'Medium Priority' : 'Low Priority'}
                        </p>
                        <p className="text-xs">
                          {selectedNotification.priority === 'critical' ? 'Immediate attention required' : 
                           selectedNotification.priority === 'high' ? 'Prompt action needed' :
                           selectedNotification.priority === 'medium' ? 'Review when possible' : 'For your information'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Content */}
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Message</h4>
                    <div className="bg-gray-50 p-4 rounded-md border whitespace-pre-wrap">
                      {selectedNotification.message}
                    </div>
                  </div>
                  
                  {/* Metadata */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-1">Source</h4>
                      <p className="text-sm text-gray-600">
                        {selectedNotification.created_by_user ? 
                          `${selectedNotification.created_by_user.full_name} (@${selectedNotification.created_by_user.username})` : 
                          'System Generated'}
                      </p>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-1">Target</h4>
                      <p className="text-sm text-gray-600 flex items-center space-x-1">
                        {getTargetIcon(selectedNotification)}
                        <span>{getTargetLabel(selectedNotification)}</span>
                      </p>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-1">Created</h4>
                      <p className="text-sm text-gray-600">
                        {format(new Date(selectedNotification.created_at), 'MMM dd, yyyy HH:mm:ss')}
                      </p>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-1">Expires</h4>
                      <p className="text-sm text-gray-600">
                        {selectedNotification.expires_at ? 
                          format(new Date(selectedNotification.expires_at), 'MMM dd, yyyy HH:mm:ss') : 
                          'Never'}
                      </p>
                    </div>
                    
                    {selectedNotification.component && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-1">Affected Component</h4>
                        <p className="text-sm text-gray-600">{selectedNotification.component}</p>
                      </div>
                    )}
                    
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-1">Status</h4>
                      <p className="text-sm text-gray-600">
                        {selectedNotification.is_read ? 'Read' : 'Unread'}
                      </p>
                    </div>
                  </div>
                  
                  {/* Action Items */}
                  {selectedNotification.actionItems && selectedNotification.actionItems.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Recommended Actions</h4>
                      <ul className="bg-blue-50 p-4 rounded-md border border-blue-200 space-y-2">
                        {selectedNotification.actionItems.map((action, index) => (
                          <li key={index} className="flex items-start space-x-2">
                            <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5" />
                            <span className="text-sm text-blue-800">{action}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {/* Inquiry-specific content */}
                  {isInquiry(selectedNotification) && (
                    <div className="bg-blue-50 p-4 rounded-md border border-blue-200">
                      <h4 className="text-sm font-medium text-blue-800 mb-2">Contact Information</h4>
                      <p className="text-sm text-blue-700">
                        <strong>Email:</strong> {selectedNotification.message.split('\n')[0].replace('Email: ', '')}
                      </p>
                      <div className="mt-3 pt-3 border-t border-blue-200">
                        <h4 className="text-sm font-medium text-blue-800 mb-2">Response Actions</h4>
                        <div className="flex items-center space-x-3">
                          <button className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition-colors flex items-center space-x-1">
                            <Mail className="h-3 w-3" />
                            <span>Compose Email</span>
                          </button>
                          <button className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 transition-colors flex items-center space-x-1">
                            <UserPlus className="h-3 w-3" />
                            <span>Create Account</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Actions */}
                <div className="flex justify-between pt-4 border-t">
                  <div>
                    {!selectedNotification.is_read && (
                      <button
                        onClick={() => handleMarkAsRead(selectedNotification)}
                        className="flex items-center space-x-2 text-blue-600 hover:text-blue-800"
                      >
                        <CheckCircle className="h-4 w-4" />
                        <span>Mark as Read</span>
                      </button>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => handleDelete(selectedNotification)}
                      className="flex items-center space-x-2 text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
              <Bell className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No notification selected</h3>
              <p className="text-gray-500 mb-4">Select a notification from the list to view details</p>
            </div>
          )}
        </div>
      </div>

      {/* Create Notification Form */}
      {showForm && (
        <NotificationForm onClose={handleFormClose} />
      )}
    </div>
  );
}