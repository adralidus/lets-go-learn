import { useState, useEffect } from 'react';
import { supabase, Inquiry, logAdminActivity } from '../../lib/supabase';
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
  Archive,
  Star,
  Inbox,
  AlertCircle,
  CheckSquare,
  ArchiveIcon,
  Tag,
  MoreHorizontal,
  Calendar
} from 'lucide-react';
import { format, formatDistanceToNow, parseISO, subDays } from 'date-fns';

type SortField = 'created_at' | 'email' | 'subject';
type SortDirection = 'asc' | 'desc';
type DateFilter = 'all' | 'today' | 'week' | 'month';
type StatusFilter = 'all' | 'new' | 'read' | 'responded' | 'archived';

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
      console.log('Fetching inquiries...');
      
      const { data, error } = await supabase
        .from('inquiries')
        .select(`
          *,
          responder:responded_by(full_name, username)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching inquiries:', error);
        throw error;
      }
      
      console.log('Fetched inquiries:', data);
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
      {/* Header with stats */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Mail className="h-6 w-6 text-purple-600" />
            <h3 className="text-lg font-medium text-gray-900">Inquiries</h3>
          </div>
          
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="text-gray-600 hover:text-gray-900 transition-colors disabled:opacity-50"
            title="Refresh inquiries"
          >
            <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Inbox className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">Total</span>
            </div>
            <span className="text-xl font-bold text-blue-900">{inquiries.length}</span>
          </div>
          
          <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-100 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              <span className="text-sm font-medium text-yellow-800">New</span>
            </div>
            <span className="text-xl font-bold text-yellow-900">{inquiries.filter(i => i.status === 'new').length}</span>
          </div>
          
          <div className="bg-green-50 p-3 rounded-lg border border-green-100 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CheckSquare className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium text-green-800">Responded</span>
            </div>
            <span className="text-xl font-bold text-green-900">{inquiries.filter(i => i.status === 'responded').length}</span>
          </div>
          
          <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <ArchiveIcon className="h-5 w-5 text-gray-600" />
              <span className="text-sm font-medium text-gray-800">Archived</span>
            </div>
            <span className="text-xl font-bold text-gray-900">{inquiries.filter(i => i.status === 'archived').length}</span>
          </div>
        </div>
      </div>

      {/* Email-like Interface */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        {/* Toolbar */}
        <div className="bg-gray-50 p-3 border-b flex flex-wrap items-center justify-between gap-3">
          {/* Left side actions */}
          <div className="flex items-center space-x-2">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selectAll}
                onChange={handleSelectAll}
                className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
              />
              <span className="text-sm text-gray-600">Select All</span>
            </label>
            
            {selectedInquiries.length > 0 && (
              <div className="flex items-center space-x-2 ml-4">
                <button
                  onClick={handleBatchMarkAsRead}
                  className="p-1.5 rounded hover:bg-gray-200 text-gray-700"
                  title="Mark as Read"
                >
                  <CheckCircle className="h-4 w-4" />
                </button>
                <button
                  onClick={handleBatchArchive}
                  className="p-1.5 rounded hover:bg-gray-200 text-gray-700"
                  title="Archive"
                >
                  <Archive className="h-4 w-4" />
                </button>
                <button
                  onClick={handleBatchDelete}
                  className="p-1.5 rounded hover:bg-gray-200 text-red-600"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
          
          {/* Right side filters */}
          <div className="flex items-center space-x-2">
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search inquiries by email..."
                className="pl-9 pr-3 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 text-sm"
              />
            </div>
            
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="px-3 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 text-sm"
            >
              <option value="all">All Status</option>
              <option value="new">New</option>
              <option value="read">Read</option>
              <option value="responded">Responded</option>
              <option value="archived">Archived</option>
            </select>
            
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as DateFilter)}
              className="px-3 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 text-sm"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
            </select>
            
            <button
              onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
              className="p-1.5 rounded hover:bg-gray-200 text-gray-700"
              title={`Sort ${sortDirection === 'asc' ? 'Descending' : 'Ascending'}`}
            >
              {sortDirection === 'asc' ? (
                <ArrowUp className="h-4 w-4" />
              ) : (
                <ArrowDown className="h-4 w-4" />
              )}
            </button>
            
            <button
              onClick={handleExport}
              className="p-1.5 rounded hover:bg-gray-200 text-gray-700"
              title="Export All Inquiries"
            >
              <Download className="h-4 w-4" />
            </button>
          </div>
        </div>
        
        {/* Email List and Detail View */}
        <div className="flex h-[calc(100vh-300px)] min-h-[500px]">
          {/* Email List */}
          <div className="w-1/3 border-r overflow-y-auto">
            {filteredInquiries.length > 0 ? (
              filteredInquiries.map((inquiry) => {
                const isSelected = selectedInquiries.includes(inquiry.id);
                const isActive = selectedInquiry?.id === inquiry.id;
                const isUnread = inquiry.status === 'new';
                
                return (
                  <div 
                    key={inquiry.id} 
                    className={`border-b cursor-pointer transition-colors ${
                      isActive ? 'bg-purple-50' : isUnread ? 'bg-blue-50' : 'hover:bg-gray-50'
                    }`}
                    onClick={() => handleSelectInquiry(inquiry)}
                  >
                    <div className="p-3">
                      <div className="flex items-start space-x-3">
                        <div className="flex items-center h-5 pt-1">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelect(inquiry.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                          />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center space-x-2">
                              {isUnread && <div className="w-2 h-2 rounded-full bg-blue-600"></div>}
                              <h5 className={`text-sm ${isUnread ? 'font-bold' : 'font-medium'} text-gray-900 truncate`}>
                                {inquiry.email}
                              </h5>
                            </div>
                            <span className="text-xs text-gray-500">
                              {formatDistanceToNow(parseISO(inquiry.created_at), { addSuffix: true })}
                            </span>
                          </div>
                          
                          <h6 className={`text-sm ${isUnread ? 'font-semibold' : 'font-normal'} text-gray-800 truncate`}>
                            {inquiry.subject}
                          </h6>
                          
                          <p className="text-xs text-gray-500 truncate">
                            {inquiry.message.substring(0, 100)}
                            {inquiry.message.length > 100 ? '...' : ''}
                          </p>
                          
                          <div className="flex items-center mt-1 space-x-2">
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs ${getStatusColor(inquiry.status)}`}>
                              {inquiry.status}
                            </span>
                            
                            {inquiry.status === 'responded' && (
                              <span className="text-xs text-green-600 flex items-center">
                                <MessageSquare className="h-3 w-3 mr-1" />
                                <span>Replied</span>
                              </span>
                            )}
                          </div>
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
          
          {/* Email Detail View */}
          <div className="w-2/3 overflow-y-auto">
            {selectedInquiry ? (
              <div className="h-full flex flex-col">
                {/* Email Header */}
                <div className="p-4 border-b bg-gray-50">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="text-xl font-semibold text-gray-900">{selectedInquiry.subject}</h3>
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedInquiry.status)}`}>
                        {selectedInquiry.status}
                      </span>
                      <button
                        onClick={() => setSelectedInquiry(null)}
                        className="text-gray-500 hover:text-gray-700 p-1"
                        title="Close"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <span className="text-blue-800 font-bold">{selectedInquiry.email.charAt(0).toUpperCase()}</span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{selectedInquiry.email}</p>
                          <div className="flex items-center text-xs text-gray-500">
                            <Calendar className="h-3 w-3 mr-1" />
                            <span>{format(parseISO(selectedInquiry.created_at), 'MMMM dd, yyyy HH:mm')}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleComposeEmail(selectedInquiry.email)}
                        className="p-1.5 rounded hover:bg-gray-200 text-blue-600"
                        title="Reply via Email"
                      >
                        <Send className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleArchive(selectedInquiry)}
                        className="p-1.5 rounded hover:bg-gray-200 text-yellow-600"
                        title="Archive"
                      >
                        <Archive className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(selectedInquiry)}
                        className="p-1.5 rounded hover:bg-gray-200 text-red-600"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      <div className="relative">
                        <button
                          className="p-1.5 rounded hover:bg-gray-200 text-gray-600"
                          title="More Actions"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Email Body */}
                <div className="p-6 flex-grow">
                  <div className="bg-white rounded-lg mb-6">
                    <div className="whitespace-pre-wrap text-gray-800">
                      {selectedInquiry.message}
                    </div>
                  </div>
                  
                  {/* Response History */}
                  {selectedInquiry.status === 'responded' && (
                    <div className="mt-8 border-t pt-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-3">Response History</h4>
                      <div className="bg-gray-50 p-4 rounded-lg border">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                              <span className="text-green-800 font-bold">
                                {selectedInquiry.responder?.full_name.charAt(0).toUpperCase() || 'A'}
                              </span>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {selectedInquiry.responder?.full_name || 'Admin'}
                              </p>
                              <p className="text-xs text-gray-500">
                                {selectedInquiry.responded_at && format(parseISO(selectedInquiry.responded_at), 'MMMM dd, yyyy HH:mm')}
                              </p>
                            </div>
                          </div>
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                            Response
                          </span>
                        </div>
                        <div className="pl-10 whitespace-pre-wrap text-gray-800">
                          {selectedInquiry.response_message}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Response Form */}
                  {selectedInquiry.status !== 'responded' && (
                    <div className="mt-8 border-t pt-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-3">Compose Response</h4>
                      <div className="bg-gray-50 p-4 rounded-lg border">
                        <textarea
                          value={responseText}
                          onChange={(e) => setResponseText(e.target.value)}
                          rows={6}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 mb-3"
                          placeholder="Type your response here..."
                        ></textarea>
                        <div className="flex justify-between items-center">
                          <div className="flex items-center space-x-2 text-sm text-gray-600">
                            <span>Responding as {user?.full_name}</span>
                          </div>
                          <button
                            onClick={handleSendResponse}
                            disabled={!responseText.trim()}
                            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
                          >
                            <Send className="h-4 w-4" />
                            <span>Send Response</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Quick Actions Footer */}
                <div className="p-4 border-t bg-gray-50">
                  <div className="flex flex-wrap gap-2">
                    <button 
                      onClick={() => handleComposeEmail(selectedInquiry.email)}
                      className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm hover:bg-blue-700 transition-colors flex items-center space-x-2"
                    >
                      <Send className="h-4 w-4" />
                      <span>Compose Email</span>
                    </button>
                    
                    <button className="bg-green-600 text-white px-3 py-1.5 rounded text-sm hover:bg-green-700 transition-colors flex items-center space-x-2">
                      <UserPlus className="h-4 w-4" />
                      <span>Create Account</span>
                    </button>
                    
                    <a 
                      href={`mailto:${selectedInquiry.email}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="bg-purple-600 text-white px-3 py-1.5 rounded text-sm hover:bg-purple-700 transition-colors flex items-center space-x-2"
                    >
                      <ExternalLink className="h-4 w-4" />
                      <span>Open in Email Client</span>
                    </a>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center p-8">
                  <Mail className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-medium text-gray-900 mb-2">No inquiry selected</h3>
                  <p className="text-gray-500 max-w-md">
                    Select an inquiry from the list to view its details and respond to it.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}