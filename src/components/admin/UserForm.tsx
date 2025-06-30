import { useState, useEffect } from 'react';
import { supabase, User } from '../../lib/supabase';
import { X, UserCheck } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../contexts/AuthContext';

interface UserFormProps {
  user?: User | null;
  onClose: () => void;
}

interface FormData {
  full_name: string;
  email: string;
  username: string;
  password: string;
  role: 'admin' | 'student';
  assigned_admin_id?: string;
}

export function UserForm({ user: editUser, onClose }: UserFormProps) {
  const [loading, setLoading] = useState(false);
  const [admins, setAdmins] = useState<User[]>([]);
  const [loadingAdmins, setLoadingAdmins] = useState(true);
  const { user: currentUser } = useAuth();
  
  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      full_name: editUser?.full_name || '',
      email: editUser?.email || '',
      username: editUser?.username || '',
      password: '',
      role: editUser?.role as 'admin' | 'student' || 'student',
      assigned_admin_id: editUser?.assigned_admin_id || '',
    }
  });

  const selectedRole = watch('role');

  useEffect(() => {
    if (selectedRole === 'student') {
      fetchAdmins();
    } else {
      setLoadingAdmins(false);
    }
  }, [selectedRole]);

  const fetchAdmins = async () => {
    try {
      setLoadingAdmins(true);
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, username, email, role')
        .in('role', ['admin', 'super_admin'])
        .order('full_name');

      if (error) throw error;
      setAdmins(data || []);
    } catch (error) {
      console.error('Error fetching admins:', error);
    } finally {
      setLoadingAdmins(false);
    }
  };

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    
    try {
      if (editUser) {
        // Update existing user
        const updateData: any = {
          full_name: data.full_name,
          email: data.email,
          username: data.username,
          role: data.role,
        };

        // Only update password if provided
        if (data.password.trim()) {
          updateData.password_hash = data.password; // In production, hash this properly
        }

        // Handle admin assignment for students
        if (data.role === 'student') {
          updateData.assigned_admin_id = data.assigned_admin_id || null;
        } else {
          updateData.assigned_admin_id = null; // Clear assignment for non-students
        }

        const { error } = await supabase
          .from('users')
          .update(updateData)
          .eq('id', editUser.id);

        if (error) throw error;
      } else {
        // Create new user
        const insertData: any = {
          full_name: data.full_name,
          email: data.email,
          username: data.username,
          password_hash: data.password, // In production, hash this properly
          role: data.role,
        };

        // Handle admin assignment for students
        if (data.role === 'student') {
          insertData.assigned_admin_id = data.assigned_admin_id || null;
        }

        const { error } = await supabase
          .from('users')
          .insert(insertData);

        if (error) throw error;
      }

      onClose();
    } catch (error: any) {
      console.error('Error saving user:', error);
      if (error.code === '23505') {
        alert('Username or email already exists. Please choose different values.');
      } else {
        alert('Error saving user. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="flex justify-between items-center p-6 border-b">
          <h3 className="text-lg font-medium text-gray-900">
            {editUser ? 'Edit User' : 'Create Student Account'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Full Name</label>
            <input
              {...register('full_name', { required: 'Full name is required' })}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter full name"
            />
            {errors.full_name && <p className="text-red-600 text-sm mt-1">{errors.full_name.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Email Address</label>
            <input
              type="email"
              {...register('email', { 
                required: 'Email is required',
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: 'Invalid email address'
                }
              })}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter email address"
            />
            {errors.email && <p className="text-red-600 text-sm mt-1">{errors.email.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Username</label>
            <input
              {...register('username', { 
                required: 'Username is required',
                minLength: {
                  value: 3,
                  message: 'Username must be at least 3 characters'
                }
              })}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter username"
            />
            {errors.username && <p className="text-red-600 text-sm mt-1">{errors.username.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Password {editUser && <span className="text-gray-500">(leave blank to keep current)</span>}
            </label>
            <input
              type="password"
              {...register('password', { 
                required: !editUser ? 'Password is required' : false,
                minLength: {
                  value: 6,
                  message: 'Password must be at least 6 characters'
                }
              })}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder={editUser ? "Enter new password (optional)" : "Enter password"}
            />
            {errors.password && <p className="text-red-600 text-sm mt-1">{errors.password.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Role</label>
            <select
              {...register('role')}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="student">Student</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          {selectedRole === 'student' && (
            <div>
              <label className="block text-sm font-medium text-gray-700">
                <div className="flex items-center space-x-2">
                  <UserCheck className="h-4 w-4 text-blue-600" />
                  <span>Assign to Administrator</span>
                  {currentUser?.role === 'super_admin' && <span className="text-red-500">*</span>}
                </div>
              </label>
              {loadingAdmins ? (
                <div className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50">
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    <span className="text-gray-500">Loading administrators...</span>
                  </div>
                </div>
              ) : (
                <select
                  {...register('assigned_admin_id', { 
                    required: currentUser?.role === 'super_admin' ? 'Administrator assignment is required' : false
                  })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">
                    {currentUser?.role === 'super_admin' ? 'Select an administrator' : 'No assignment (optional)'}
                  </option>
                  {admins.map((admin) => (
                    <option key={admin.id} value={admin.id}>
                      {admin.full_name} (@{admin.username}) - {admin.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                    </option>
                  ))}
                </select>
              )}
              {errors.assigned_admin_id && <p className="text-red-600 text-sm mt-1">{errors.assigned_admin_id.message}</p>}
              {currentUser?.role === 'super_admin' && (
                <p className="text-xs text-gray-500 mt-1">
                  This student will be assigned to the selected administrator for management and oversight.
                </p>
              )}
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || (selectedRole === 'student' && loadingAdmins)}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? 'Saving...' : editUser ? 'Update User' : 'Create Student'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}