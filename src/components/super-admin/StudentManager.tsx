import { useState, useEffect } from 'react';
import { supabase, User, logAdminActivity, getAdminAssignmentStats, AdminAssignmentStats } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Plus, Edit, Trash2, GraduationCap, Key, Download, Upload, UserCheck, Users, BarChart3 } from 'lucide-react';
import { StudentForm } from './StudentForm';
import { format } from 'date-fns';

export function StudentManager() {
  const [students, setStudents] = useState<User[]>([]);
  const [admins, setAdmins] = useState<User[]>([]);
  const [assignmentStats, setAssignmentStats] = useState<AdminAssignmentStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingStudent, setEditingStudent] = useState<User | null>(null);
  const [selectedAdmin, setSelectedAdmin] = useState<string>('all');
  const { user } = useAuth();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [studentsResult, adminsResult, statsResult] = await Promise.all([
        supabase
          .from('users')
          .select(`
            *,
            assigned_admin:assigned_admin_id(id, full_name, username, role)
          `)
          .eq('role', 'student')
          .order('created_at', { ascending: false }),
        
        supabase
          .from('users')
          .select('id, full_name, username, role')
          .in('role', ['admin', 'super_admin'])
          .order('full_name'),
        
        getAdminAssignmentStats()
      ]);

      if (studentsResult.error) throw studentsResult.error;
      if (adminsResult.error) throw adminsResult.error;

      setStudents(studentsResult.data || []);
      setAdmins(adminsResult.data || []);
      setAssignmentStats(statsResult || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (studentToDelete: User) => {
    if (!confirm(`Are you sure you want to delete student "${studentToDelete.full_name}"?`)) return;

    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', studentToDelete.id);

      if (error) throw error;

      // Log the activity
      if (user) {
        await logAdminActivity(
          user.id,
          'delete',
          'student',
          studentToDelete.id,
          { 
            deleted_student: studentToDelete.full_name,
            deleted_email: studentToDelete.email,
            was_assigned_to: studentToDelete.assigned_admin_id
          }
        );
      }

      fetchData();
    } catch (error) {
      console.error('Error deleting student:', error);
      alert('Error deleting student. Please try again.');
    }
  };

  const handleEdit = (student: User) => {
    setEditingStudent(student);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingStudent(null);
    fetchData();
  };

  const handleResetPassword = async (student: User) => {
    const newPassword = prompt(`Enter new password for ${student.full_name}:`);
    if (!newPassword) return;

    try {
      const { error } = await supabase
        .from('users')
        .update({ password_hash: newPassword })
        .eq('id', student.id);

      if (error) throw error;

      // Log the activity
      if (user) {
        await logAdminActivity(
          user.id,
          'update',
          'student',
          student.id,
          { 
            student_name: student.full_name,
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

  const handleBulkExport = () => {
    const csvContent = [
      ['Full Name', 'Username', 'Email', 'Assigned Admin', 'Admin Username', 'Created At', 'Last Login'].join(','),
      ...students.map(student => [
        student.full_name,
        student.username,
        student.email,
        student.assigned_admin?.full_name || 'Unassigned',
        student.assigned_admin?.username || 'N/A',
        format(new Date(student.created_at), 'yyyy-MM-dd HH:mm:ss'),
        student.last_login ? format(new Date(student.last_login), 'yyyy-MM-dd HH:mm:ss') : 'Never'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `students-export-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // Log the activity
    if (user) {
      logAdminActivity(
        user.id,
        'export',
        'students',
        undefined,
        { export_count: students.length }
      ).catch(console.warn);
    }
  };

  const handleBulkImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const text = await file.text();
      const lines = text.split('\n');
      const headers = lines[0].split(',');
      
      if (!headers.includes('full_name') || !headers.includes('username') || !headers.includes('email')) {
        alert('CSV must contain columns: full_name, username, email, assigned_admin_id (optional)');
        return;
      }

      const studentsToImport = lines.slice(1)
        .filter(line => line.trim())
        .map(line => {
          const values = line.split(',');
          return {
            full_name: values[headers.indexOf('full_name')],
            username: values[headers.indexOf('username')],
            email: values[headers.indexOf('email')],
            password_hash: values[headers.indexOf('password')] || 'defaultpassword123',
            role: 'student',
            assigned_admin_id: values[headers.indexOf('assigned_admin_id')] || null
          };
        });

      try {
        const { error } = await supabase
          .from('users')
          .insert(studentsToImport);

        if (error) throw error;

        // Log the activity
        if (user) {
          await logAdminActivity(
            user.id,
            'import',
            'students',
            undefined,
            { import_count: studentsToImport.length }
          );
        }

        alert(`Successfully imported ${studentsToImport.length} students!`);
        fetchData();
      } catch (error) {
        console.error('Error importing students:', error);
        alert('Error importing students. Please check the CSV format.');
      }
    };
    input.click();
  };

  const getFilteredStudents = () => {
    if (selectedAdmin === 'all') return students;
    if (selectedAdmin === 'unassigned') return students.filter(s => !s.assigned_admin_id);
    return students.filter(s => s.assigned_admin_id === selectedAdmin);
  };

  const getAssignmentStatusColor = (student: User) => {
    if (student.assigned_admin_id) {
      return 'bg-green-100 text-green-800';
    }
    return 'bg-yellow-100 text-yellow-800';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  const filteredStudents = getFilteredStudents();
  const unassignedCount = students.filter(s => !s.assigned_admin_id).length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">Student Management</h3>
        <div className="flex space-x-3">
          <button
            onClick={handleBulkImport}
            className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
          >
            <Upload className="h-4 w-4" />
            <span>Import CSV</span>
          </button>
          <button
            onClick={handleBulkExport}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            <Download className="h-4 w-4" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Create Student</span>
          </button>
        </div>
      </div>

      {/* Assignment Statistics */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex items-center space-x-2 mb-4">
          <BarChart3 className="h-5 w-5 text-purple-600" />
          <h4 className="text-lg font-medium text-gray-900">Assignment Statistics</h4>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-blue-600">Total Students</p>
                <p className="text-2xl font-semibold text-blue-900">{students.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center">
              <UserCheck className="h-8 w-8 text-green-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-green-600">Assigned</p>
                <p className="text-2xl font-semibold text-green-900">{students.length - unassignedCount}</p>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 p-4 rounded-lg">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-yellow-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-yellow-600">Unassigned</p>
                <p className="text-2xl font-semibold text-yellow-900">{unassignedCount}</p>
              </div>
            </div>
          </div>

          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="flex items-center">
              <GraduationCap className="h-8 w-8 text-purple-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-purple-600">Administrators</p>
                <p className="text-2xl font-semibold text-purple-900">{admins.length}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {assignmentStats.map((stat) => (
            <div key={stat.admin_id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h5 className="font-medium text-gray-900">{stat.admin_name}</h5>
                <span className="text-sm text-gray-500">@{stat.admin_username}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Assigned Students:</span>
                <span className="font-semibold text-purple-600">{stat.assigned_students_count}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Filter Controls */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="flex items-center space-x-4">
          <label className="text-sm font-medium text-gray-700">Filter by Administrator:</label>
          <select
            value={selectedAdmin}
            onChange={(e) => setSelectedAdmin(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-purple-500 focus:border-purple-500"
          >
            <option value="all">All Students ({students.length})</option>
            <option value="unassigned">Unassigned ({unassignedCount})</option>
            {admins.map((admin) => {
              const count = students.filter(s => s.assigned_admin_id === admin.id).length;
              return (
                <option key={admin.id} value={admin.id}>
                  {admin.full_name} ({count})
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Student
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Assigned Administrator
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
            {filteredStudents.map((student) => (
              <tr key={student.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10">
                      <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                        <GraduationCap className="h-5 w-5 text-green-600" />
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">{student.full_name}</div>
                      <div className="text-sm text-gray-500">{student.email}</div>
                      <div className="text-xs text-gray-400">@{student.username}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {student.assigned_admin_id ? (
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {student.assigned_admin?.full_name}
                      </div>
                      <div className="text-sm text-gray-500">
                        @{student.assigned_admin?.username}
                      </div>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getAssignmentStatusColor(student)}`}>
                        Assigned
                      </span>
                    </div>
                  ) : (
                    <div>
                      <div className="text-sm text-gray-500">Not assigned</div>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getAssignmentStatusColor(student)}`}>
                        Unassigned
                      </span>
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {student.last_login ? (
                    format(new Date(student.last_login), 'MMM dd, yyyy HH:mm')
                  ) : (
                    <span className="text-gray-400">Never</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {format(new Date(student.created_at), 'MMM dd, yyyy')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex justify-end space-x-2">
                    {/* Reset Password */}
                    <button
                      onClick={() => handleResetPassword(student)}
                      className="text-orange-600 hover:text-orange-900 transition-colors"
                      title="Reset Password"
                    >
                      <Key className="h-4 w-4" />
                    </button>
                    
                    {/* Edit */}
                    <button
                      onClick={() => handleEdit(student)}
                      className="text-blue-600 hover:text-blue-900 transition-colors"
                      title="Edit Student"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    
                    {/* Delete */}
                    <button
                      onClick={() => handleDelete(student)}
                      className="text-red-600 hover:text-red-900 transition-colors"
                      title="Delete Student"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredStudents.length === 0 && (
          <div className="text-center py-12">
            <GraduationCap className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {selectedAdmin === 'all' ? 'No students found' : 
               selectedAdmin === 'unassigned' ? 'No unassigned students' :
               'No students assigned to this administrator'}
            </h3>
            <p className="text-gray-600 mb-4">
              {selectedAdmin === 'all' ? 'Create your first student account to get started.' :
               selectedAdmin === 'unassigned' ? 'All students have been assigned to administrators.' :
               'This administrator has no students assigned yet.'}
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors"
            >
              Create Student
            </button>
          </div>
        )}
      </div>

      {showForm && (
        <StudentForm
          student={editingStudent}
          onClose={handleFormClose}
        />
      )}
    </div>
  );
}