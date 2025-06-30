import { useState, useEffect } from 'react';
import { supabase, logAdminActivity } from '../../lib/supabase';
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
  ArrowDown,
  MessageSquare,
  Archive
} from 'lucide-react';
import { format, subDays, parseISO } from 'date-fns';

type SortField = 'created_at' | 'email' | 'subject';
type SortDirection = 'asc' | 'desc';
type DateFilter = 'all' | 'today' | 'week' | 'month';
type StatusFilter = 'all' | 'new' | 'read' | 'responded' | 'archived';

interface Inquiry {
  id: string;
  email: string;
  subject: string;
  message: string;
  status: 'new' | 'read' | 'responded' | 'archived';
  is_read: boolean;
  created_at: string;
  updated_at: string;
  responded_at?: string;
  responded_by?: string;
  response_message?: string;
  responder?: {
    full_name: string;
    username: string;
  };
}

export function InquiryManager() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [filteredInquiries, setFilteredInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [selectedInquiries, setSelectedInquiries] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [responseText, setResponseText] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    fetchInquiries();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [inquiries, searchQuery, dateFilter, statusFilter, sortField, sortDirection]);

  const fetchInquiries = async () => {
    try {
      setRefreshing(true);
      const { data, error } = await supabase
        .from('inquiries')
        .select(`
          *,
          responder:responded_by(full_name, username)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setInquiries(data || []);
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
        inquiry.message.toLowerCase().includes(query)
      );
    }
    
    // Apply status filter
    if (statusFilter !== 'all') {
      result = result.filter(inquiry => inquiry.status === statusFilter);
    }
    
    // Apply date filter
    if (dateFilter === 'today') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      result = result.filter(inquiry => parseISO(inquiry.created_at) >= today);
    } else if (dateFilter === 'week') {
      result = result.filter(inquiry => 
        parseISO(inquiry.created_at) >= subDays(new Date(), 7)
      );
    } else if (dateFilter === 'month') {
      result = result.filter(inquiry => 
        parseISO(inquiry.created_at) >= subDays(new Date(), 30)
      );
    }
    
    // Apply sorting
    result.sort((a, b) => {
      if (sortField === 'created_at') {
        return sortDirection === 'desc' 
          ? parseISO(b.created_at).getTime() - parseISO(a.created_at).getTime()
          : parseISO(a.created_at).getTime() - parseISO(b.created_at).getTime();
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
        .from('inquiries')
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
        .from('inquiries')
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
      const { error } = await supabase.rpc('update_inquiry_status', {
        p_inquiry_id: inquiry.id,
        p_status: 'read',
        p_is_read: true
      });

      if (error) throw error;

      // Update local state
      setInquiries(prev => prev.map(i => 
        i.id === inquiry.id ? { ...i, status: 'read', is_read: true } : i
      ));
      
      if (selectedInquiry?.id === inquiry.id) {
        setSelectedInquiry({ ...selectedInquiry, status: 'read', is_read: true });
      }
    } catch (error) {
      console.error('Error marking inquiry as read:', error);
    }
  };

  const handleBatchMarkAsRead = async () => {
    if (selectedInquiries.length === 0) return;
    
    try {
      // We need to update each inquiry individually
      const updatePromises = selectedInquiries.map(id => 
        supabase.rpc('update_inquiry_status', {
          p_inquiry_id: id,
          p_status: 'read',
          p_is_read: true
        })
      );
      
      await Promise.all(updatePromises);

      // Update local state
      setInquiries(prev => prev.map(i => 
        selectedInquiries.includes(i.id) ? { ...i, status: 'read', is_read: true } : i
      ));
      
      if (selectedInquiry && selectedInquiries.includes(selectedInquiry.id)) {
        setSelectedInquiry({ ...selectedInquiry, status: 'read', is_read: true });
      }
    } catch (error) {
      console.error('Error marking inquiries as read:', error);
      alert('Error updating inquiries. Please try again.');
    }
  };

  const handleArchive = async (inquiry: Inquiry) => {
    try {
      const { error } = await supabase.rpc('update_inquiry_status', {
        p_inquiry_id: inquiry.id,
        p_status: 'archived',
        p_is_read: true
      });

      if (error) throw error;

      // Update local state
      setInquiries(prev => prev.map(i => 
        i.id === inquiry.id ? { ...i, status: 'archived', is_read: true } : i
      ));
      
      if (selectedInquiry?.id === inquiry.id) {
        setSelectedInquiry({ ...selectedInquiry, status: 'archived', is_read: true });
      }
    } catch (error) {
      console.error('Error archiving inquiry:', error);
      alert('Error archiving inquiry. Please try again.');
    }
  };

  const handleBatchArchive = async () => {
    if (selectedInquiries.length === 0) return;
    
    try {
      // We need to update each inquiry individually
      const updatePromises = selectedInquiries.map(id => 
        supabase.rpc('update_inquiry_status', {
          p_inquiry_id: id,
          p_status: 'archived',
          p_is_read: true
        })
      );
      
      await Promise.all(updatePromises);

      // Update local state
      setInquiries(prev => prev.map(i => 
        selectedInquiries.includes(i.id) ? { ...i, status: 'archived', is_read: true } : i
      ));
      
      if (selectedInquiry && selectedInquiries.includes(selectedInquiry.id)) {
        setSelectedInquiry({ ...selectedInquiry, status: 'archived', is_read: true });
      }
    } catch (error) {
      console.error('Error archiving inquiries:', error);
      alert('Error archiving inquiries. Please try again.');
    }
  };

  const handleSendResponse = async () => {
    if (!selectedInquiry || !responseText.trim() || !user) return;
    
    try {
      const { error } = await supabase.rpc('update_inquiry_status', {
        p_inquiry_id: selectedInquiry.id,
        p_status: 'responded',
        p_is_read: true,
        p_response_message: responseText,
        p_responded_by: user.id
      });

      if (error) throw error;

      // Log the activity
      await logAdminActivity(
        user.id,
        'respond',
        'inquiry',
        selectedInquiry.id,
        {
          inquiry_email: selectedInquiry.email,
          inquiry_subject: selectedInquiry.subject
        }
      );

      // Update local state
      const updatedInquiry = {
        ...selectedInquiry,
        status: 'responded',
        is_read: true,
        response_message: responseText,
        responded_at: new Date().toISOString(),
        responded_by: user.id,
        responder: {
          full_name: user.full_name,
          username: user.username
        }
      };
      
      setInquiries(prev => prev.map(i => 
        i.id === selectedInquiry.id ? updatedInquiry : i
      ));
      
      setSelectedInquiry(updatedInquiry);
      setResponseText('');
      
      // Open email client with pre-filled response
      window.open(`mailto:${selectedInquiry.email}?subject=Re: ${selectedInquiry.subject}&body=${encodeURIComponent(responseText)}`, '_blank');
      
    } catch (error) {
      console.error('Error sending response:', error);
      alert('Error sending response. Please try again.');
    }
  };

  const handleSelectInquiry = (inquiry: Inquiry) => {
    setSelectedInquiry(inquiry);
    
    // If inquiry is new, mark it as read
    if (inquiry.status === 'new' && !inquiry.is_read) {
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
      ['Date', 'Email', 'Subject', 'Message', 'Status', 'Response', 'Responded By', 'Responded At'].join(','),
      ...dataToExport.map(inquiry => [
        format(parseISO(inquiry.created_at), 'yyyy-MM-dd HH:mm:ss'),
        inquiry.email,
        `"${inquiry.subject.replace(/"/g, '""')}"`,
        `"${inquiry.message.replace(/"/g, '""')}"`,
        inquiry.status,
        inquiry.response_message ? `"${inquiry.response_message.replace(/"/g, '""')}"` : '',
        inquiry.responder?.full_name || '',
        inquiry.responded_at ? format(parseISO(inquiry.responded_at), 'yyyy-MM-dd HH:mm:ss') : ''
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-800';
      case 'read': return 'bg-yellow-100 text-yellow-800';
      case 'responded': return 'bg-green-100 text-green-800';
      case 'archived': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'new': return <Mail className="h-4 w-4 text-blue-600" />;
      case 'read': return <CheckCircle className="h-4 w-4 text-yellow-600" />;
      case 'responded': return <MessageSquare className="h-4 w-4 text-green-600" />;
      case 'archived': return <Archive className="h-4 w-4 text-gray-600" />;
      default: return <Mail className="h-4 w-4 text-gray-600" />;
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
        <div className="flex items-center space-x-3">
          <Mail className="h-6 w-6 text-purple-600" />
          <h3 className="text-lg font-medium text-gray-900">Inquiries</h3>
          <div className="flex space-x-2">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800`}>
              Total: {inquiries.length}
            </span>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800`}>
              New: {inquiries.filter(i => i.status === 'new').length}
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
              <Filter className="h-4 w-4 text-gray-500" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="all">All Status</option>
                <option value="new">New</option>
                <option value="read">Read</option>
                <option value="responded">Responded</option>
                <option value="archived">Archived</option>
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
              onClick={handleBatchArchive}
              className="flex items-center space-x-1 px-3 py-1 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors"
            >
              <Archive className="h-4 w-4" />
              <span>Archive</span>
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
                      } ${inquiry.status === 'new' ? 'bg-blue-50' : ''}`}
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
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(inquiry.status)}`}>
                              {inquiry.status}
                            </span>
                          </div>
                          
                          <div className="flex items-center text-xs text-gray-600 mb-1">
                            <Mail className="h-3 w-3 mr-1" />
                            <span className="truncate">{inquiry.email}</span>
                          </div>
                          
                          <p className="text-sm text-gray-600 line-clamp-2">
                            {inquiry.message}
                          </p>
                          
                          <div className="flex justify-between items-center mt-2 text-xs text-gray-500">
                            <span>{format(parseISO(inquiry.created_at), 'MMM dd, yyyy HH:mm')}</span>
                            {inquiry.status === 'responded' && (
                              <span className="flex items-center">
                                <MessageSquare className="h-3 w-3 mr-1 text-green-500" />
                                <span>Responded</span>
                              </span>
                            )}
                          </div>
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
                  {getStatusIcon(selectedInquiry.status)}
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
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedInquiry.status)}`}>
                        {selectedInquiry.status}
                      </span>
                    </div>
                  </div>
                  
                  <div className="bg-blue-50 p-3 rounded-md border border-blue-200">
                    <div className="flex items-center space-x-2">
                      <Mail className="h-4 w-4 text-blue-600" />
                      <p className="text-sm font-medium text-blue-800">{selectedInquiry.email}</p>
                    </div>
                    <p className="text-xs text-blue-600 mt-1">
                      Received on {format(parseISO(selectedInquiry.created_at), 'MMMM dd, yyyy HH:mm:ss')}
                    </p>
                  </div>
                </div>
                
                {/* Content */}
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Message</h4>
                    <div className="bg-gray-50 p-4 rounded-md border whitespace-pre-wrap">
                      {selectedInquiry.message}
                    </div>
                  </div>
                  
                  {/* Response Section */}
                  {selectedInquiry.status === 'responded' ? (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Response</h4>
                      <div className="bg-green-50 p-4 rounded-md border border-green-200">
                        <div className="mb-2 pb-2 border-b border-green-200">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <MessageSquare className="h-4 w-4 text-green-600" />
                              <span className="text-sm font-medium text-green-800">
                                Responded by {selectedInquiry.responder?.full_name || 'Unknown'}
                              </span>
                            </div>
                            <span className="text-xs text-green-600">
                              {selectedInquiry.responded_at && format(parseISO(selectedInquiry.responded_at), 'MMM dd, yyyy HH:mm')}
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-green-800 whitespace-pre-wrap">
                          {selectedInquiry.response_message}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Compose Response</h4>
                      <textarea
                        value={responseText}
                        onChange={(e) => setResponseText(e.target.value)}
                        rows={5}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                        placeholder="Type your response here..."
                      ></textarea>
                      <div className="flex justify-end mt-2">
                        <button
                          onClick={handleSendResponse}
                          disabled={!responseText.trim()}
                          className="flex items-center space-x-2 bg-green-600 text-white px-3 py-2 rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
                        >
                          <Send className="h-4 w-4" />
                          <span>Send Response</span>
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {/* Quick Actions */}
                  <div className="bg-blue-50 p-4 rounded-md border border-blue-200">
                    <h4 className="text-sm font-medium text-blue-800 mb-3">Quick Actions</h4>
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
                  <div className="flex space-x-3">
                    {selectedInquiry.status === 'new' && (
                      <button
                        onClick={() => handleMarkAsRead(selectedInquiry)}
                        className="flex items-center space-x-2 text-blue-600 hover:text-blue-800"
                      >
                        <CheckCircle className="h-4 w-4" />
                        <span>Mark as Read</span>
                      </button>
                    )}
                    
                    {selectedInquiry.status !== 'archived' && (
                      <button
                        onClick={() => handleArchive(selectedInquiry)}
                        className="flex items-center space-x-2 text-yellow-600 hover:text-yellow-800"
                      >
                        <Archive className="h-4 w-4" />
                        <span>Archive</span>
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