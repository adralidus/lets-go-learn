import { useState, useEffect } from 'react';
import { supabase, SystemNotification, logAdminActivity } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Mail, 
  Trash2, 
  Search, 
  Filter, 
  Download, 
  RefreshCw, 
  CheckCircle, 
  X, 
  Send, 
  UserPlus, 
  ExternalLink, 
  Clock, 
  ArrowUp, 
  ArrowDown
} from 'lucide-react';
import { format, subDays } from 'date-fns';

type SortField = 'created_at' | 'email' | 'subject';
type SortDirection = 'asc' | 'desc';
type DateFilter = 'all' | 'today' | 'week' | 'month';

interface Inquiry extends SystemNotification {
  email: string;
  subject: string;
  inquiryMessage: string;
}

export function InquiryManager() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [filteredInquiries, setFilteredInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [selectedInquiries, setSelectedInquiries] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    fetchInquiries();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [inquiries, searchQuery, dateFilter, sortField, sortDirection]);

  const fetchInquiries = async () => {
    try {
      setRefreshing(true);
      const { data, error } = await supabase
        .from('system_notifications')
        .select(`
          *,
          created_by_user:users!system_notifications_created_by_fkey(full_name, username)
        `)
        .like('title', 'New Inquiry:%')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Parse inquiry details from the notification
      const parsedInquiries = (data || []).map(notification => {
        const subject = notification.title.replace('New Inquiry: ', '');
        const messageLines = notification.message.split('\n\n');
        const email = messageLines[0].replace('Email: ', '');
        const inquiryMessage = messageLines[1]?.replace('Message: ', '') || '';
        
        return {
          ...notification,
          email,
          subject,
          inquiryMessage
        };
      });
      
      setInquiries(parsedInquiries);
      setRefreshing(false);
    } catch (error) {
      console.error('Error fetching inquiries:', error);
      setRefreshing(false);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let result = [...inquiries];
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(inquiry => 
        inquiry.email.toLowerCase().includes(query) || 
        inquiry.subject.toLowerCase().includes(query) || 
        inquiry.inquiryMessage.toLowerCase().includes(query)
      );
    }
    
    // Apply date filter
    if (dateFilter === 'today') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      result = result.filter(inquiry => new Date(inquiry.created_at) >= today);
    } else if (dateFilter === 'week') {
      result = result.filter(inquiry => 
        new Date(inquiry.created_at) >= subDays(new Date(), 7)
      );
    } else if (dateFilter === 'month') {
      result = result.filter(inquiry => 
        new Date(inquiry.created_at) >= subDays(new Date(), 30)
      );
    }
    
    // Apply sorting
    result.sort((a, b) => {
      if (sortField === 'created_at') {
        return sortDirection === 'desc' 
          ? new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          : new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      } else if (sortField === 'email') {
        return sortDirection === 'desc'
          ? b.email.localeCompare(a.email)
          : a.email.localeCompare(b.email);
      } else if (sortField === 'subject') {
        return sortDirection === 'desc'
          ? b.subject.localeCompare(a.subject)
          : a.subject.localeCompare(b.subject);
      }
      return 0;
    });
    
    setFilteredInquiries(result);
  };

  const handleDelete = async (inquiry: Inquiry) => {
    if (!confirm('Are you sure you want to delete this inquiry?')) return;

    try {
      const { error } = await supabase
        .from('system_notifications')
        .delete()
        .eq('id', inquiry.id);

      if (error) throw error;

      // Log the activity
      if (user) {
        await logAdminActivity(
          user.id,
          'delete',
          'inquiry',
          inquiry.id,
          {
            inquiry_email: inquiry.email,
            inquiry_subject: inquiry.subject
          }
        );
      }

      // Update local state
      setInquiries(prev => prev.filter(i => i.id !== inquiry.id));
      if (selectedInquiry?.id === inquiry.id) {
        setSelectedInquiry(null);
      }
      
      // Remove from selected inquiries if it was selected
      if (selectedInquiries.includes(inquiry.id)) {
        setSelectedInquiries(prev => prev.filter(id => id !== inquiry.id));
      }
    } catch (error) {
      console.error('Error deleting inquiry:', error);
      alert('Error deleting inquiry. Please try again.');
    }
  };

  const handleBatchDelete = async () => {
    if (selectedInquiries.length === 0) return;
    
    if (!confirm(`Are you sure you want to delete ${selectedInquiries.length} selected inquiry(s)?`)) return;

    try {
      const { error } = await supabase
        .from('system_notifications')
        .delete()
        .in('id', selectedInquiries);

      if (error) throw error;

      // Log the activity
      if (user) {
        await logAdminActivity(
          user.id,
          'batch_delete',
          'inquiries',
          undefined,
          {
            count: selectedInquiries.length,
            inquiry_ids: selectedInquiries
          }
        );
      }

      // Update local state
      setInquiries(prev => prev.filter(i => !selectedInquiries.includes(i.id)));
      setSelectedInquiries([]);
      setSelectAll(false);
      setSelectedInquiry(null);
    } catch (error) {
      console.error('Error deleting inquiries:', error);
      alert('Error deleting inquiries. Please try again.');
    }
  };

  const handleMarkAsRead = async (inquiry: Inquiry) => {
    try {
      const { error } = await supabase
        .from('system_notifications')
        .update({ is_read: true })
        .eq('id', inquiry.id);

      if (error) throw error;

      // Update local state
      setInquiries(prev => prev.map(i => 
        i.id === inquiry.id ? { ...i, is_read: true } : i
      ));
      
      if (selectedInquiry?.id === inquiry.id) {
        setSelectedInquiry({ ...selectedInquiry, is_read: true });
      }
    } catch (error) {
      console.error('Error marking inquiry as read:', error);
    }
  };

  const handleBatchMarkAsRead = async () => {
    if (selectedInquiries.length === 0) return;
    
    try {
      const { error } = await supabase
        .from('system_notifications')
        .update({ is_read: true })
        .in('id', selectedInquiries);

      if (error) throw error;

      // Update local state
      setInquiries(prev => prev.map(i => 
        selectedInquiries.includes(i.id) ? { ...i, is_read: true } : i
      ));
      
      if (selectedInquiry && selectedInquiries.includes(selectedInquiry.id)) {
        setSelectedInquiry({ ...selectedInquiry, is_read: true });
      }
    } catch (error) {
      console.error('Error marking inquiries as read:', error);
      alert('Error updating inquiries. Please try again.');
    }
  };

  const handleSelectInquiry = (inquiry: Inquiry) => {
    setSelectedInquiry(inquiry);
    
    // If inquiry is unread, mark it as read
    if (!inquiry.is_read) {
      handleMarkAsRead(inquiry);
    }
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedInquiries([]);
    } else {
      setSelectedInquiries(filteredInquiries.map(i => i.id));
    }
    setSelectAll(!selectAll);
  };

  const handleToggleSelect = (id: string) => {
    if (selectedInquiries.includes(id)) {
      setSelectedInquiries(prev => prev.filter(inquiryId => inquiryId !== id));
    } else {
      setSelectedInquiries(prev => [...prev, id]);
    }
  };

  const handleExport = () => {
    const dataToExport = selectedInquiries.length > 0
      ? inquiries.filter(i => selectedInquiries.includes(i.id))
      : inquiries;
    
    const csvContent = [
      ['Date', 'Email', 'Subject', 'Message', 'Status'].join(','),
      ...dataToExport.map(inquiry => [
        format(new Date(inquiry.created_at), 'yyyy-MM-dd HH:mm:ss'),
        inquiry.email,
        `"${inquiry.subject.replace(/"/g, '""')}"`,
        `"${inquiry.inquiryMessage.replace(/"/g, '""')}"`,
        inquiry.is_read ? 'Read' : 'Unread'
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inquiries-export-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    // Log the export activity
    if (user) {
      logAdminActivity(
        user.id,
        'export',
        'inquiries',
        undefined,
        {
          count: dataToExport.length,
          export_type: 'csv',
          selected_export: selectedInquiries.length > 0
        }
      ).catch(console.error);
    }
  };

  const handleRefresh = () => {
    fetchInquiries();
  };

  const handleComposeEmail = (email: string) => {
    window.open(`mailto:${email}`, '_blank');
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
          <Mail className="h-6 w-6 text-purple-600" />
          <h3 className="text-lg font-medium text-gray-900">Inquiries</h3>
          <div className="flex space-x-2">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800`}>
              Total: {inquiries.length}
            </span>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800`}>
              Unread: {inquiries.filter(i => !i.is_read).length}
            </span>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="text-gray-600 hover:text-gray-900 transition-colors disabled:opacity-50"
            title="Refresh inquiries"
          >
            <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
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
              placeholder="Search inquiries by email, subject, or content..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-purple-500 focus:border-purple-500"
            />
          </div>
          
          <div className="flex flex-wrap gap-2">
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
              <Filter className="h-4 w-4 text-gray-500" />
              <select
                value={sortField}
                onChange={(e) => setSortField(e.target.value as SortField)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="created_at">Sort by Date</option>
                <option value="email">Sort by Email</option>
                <option value="subject">Sort by Subject</option>
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
      {selectedInquiries.length > 0 && (
        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-purple-800 font-medium">{selectedInquiries.length} inquiry(s) selected</span>
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
        {/* Inquiries List */}
        <div className="lg:w-1/2 space-y-4">
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
              <h4 className="font-medium text-gray-900 flex items-center space-x-2">
                <Mail className="h-4 w-4 text-purple-600" />
                <span>Inquiries</span>
                <span className="text-sm text-gray-500">({filteredInquiries.length})</span>
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
              {filteredInquiries.length > 0 ? (
                filteredInquiries.map((inquiry) => {
                  const isSelected = selectedInquiries.includes(inquiry.id);
                  const isActive = selectedInquiry?.id === inquiry.id;
                  
                  return (
                    <div 
                      key={inquiry.id} 
                      className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                        isActive ? 'bg-purple-50 border-l-4 border-purple-500' : ''
                      } ${!inquiry.is_read ? 'bg-blue-50' : ''}`}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="flex items-center h-5">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelect(inquiry.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                          />
                        </div>
                        
                        <div 
                          className="flex-1 min-w-0"
                          onClick={() => handleSelectInquiry(inquiry)}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <h5 className="text-sm font-medium text-gray-900 truncate">{inquiry.subject}</h5>
                            <span className="text-xs text-gray-500">
                              {format(new Date(inquiry.created_at), 'MMM dd, HH:mm')}
                            </span>
                          </div>
                          
                          <div className="flex items-center text-xs text-gray-600 mb-1">
                            <Mail className="h-3 w-3 mr-1" />
                            <span className="truncate">{inquiry.email}</span>
                          </div>
                          
                          <p className="text-sm text-gray-600 line-clamp-2">
                            {inquiry.inquiryMessage}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center">
                  <Mail className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No inquiries match your filters</p>
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
              <span className="text-sm">Export All Inquiries</span>
            </button>
          </div>
        </div>
        
        {/* Inquiry Detail View */}
        <div className="lg:w-1/2">
          {selectedInquiry ? (
            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
              <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
                <h4 className="font-medium text-gray-900 flex items-center space-x-2">
                  <Mail className="h-4 w-4 text-purple-600" />
                  <span>Inquiry Details</span>
                </h4>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setSelectedInquiry(null)}
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
                    <h3 className="text-xl font-semibold text-gray-900">{selectedInquiry.subject}</h3>
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        selectedInquiry.is_read ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {selectedInquiry.is_read ? 'Read' : 'Unread'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="bg-blue-50 p-3 rounded-md border border-blue-200">
                    <div className="flex items-center space-x-2">
                      <Mail className="h-4 w-4 text-blue-600" />
                      <p className="text-sm font-medium text-blue-800">{selectedInquiry.email}</p>
                    </div>
                    <p className="text-xs text-blue-600 mt-1">
                      Received on {format(new Date(selectedInquiry.created_at), 'MMMM dd, yyyy HH:mm:ss')}
                    </p>
                  </div>
                </div>
                
                {/* Content */}
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Message</h4>
                    <div className="bg-gray-50 p-4 rounded-md border whitespace-pre-wrap">
                      {selectedInquiry.inquiryMessage}
                    </div>
                  </div>
                  
                  {/* Response Actions */}
                  <div className="bg-blue-50 p-4 rounded-md border border-blue-200">
                    <h4 className="text-sm font-medium text-blue-800 mb-3">Response Actions</h4>
                    <div className="flex flex-wrap gap-3">
                      <button 
                        onClick={() => handleComposeEmail(selectedInquiry.email)}
                        className="bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700 transition-colors flex items-center space-x-2"
                      >
                        <Send className="h-4 w-4" />
                        <span>Compose Email</span>
                      </button>
                      
                      <button className="bg-green-600 text-white px-3 py-2 rounded text-sm hover:bg-green-700 transition-colors flex items-center space-x-2">
                        <UserPlus className="h-4 w-4" />
                        <span>Create Account</span>
                      </button>
                      
                      <a 
                        href={`mailto:${selectedInquiry.email}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="bg-purple-600 text-white px-3 py-2 rounded text-sm hover:bg-purple-700 transition-colors flex items-center space-x-2"
                      >
                        <ExternalLink className="h-4 w-4" />
                        <span>Open in Email Client</span>
                      </a>
                    </div>
                  </div>
                </div>
                
                {/* Actions */}
                <div className="flex justify-between pt-4 border-t">
                  <div>
                    {!selectedInquiry.is_read && (
                      <button
                        onClick={() => handleMarkAsRead(selectedInquiry)}
                        className="flex items-center space-x-2 text-blue-600 hover:text-blue-800"
                      >
                        <CheckCircle className="h-4 w-4" />
                        <span>Mark as Read</span>
                      </button>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => handleDelete(selectedInquiry)}
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
              <Mail className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No inquiry selected</h3>
              <p className="text-gray-500 mb-4">Select an inquiry from the list to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}