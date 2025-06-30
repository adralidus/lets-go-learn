import { useState } from 'react';
import { supabase, User, logAdminActivity } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { X } from 'lucide-react';
import { useForm } from 'react-hook-form';

interface AdminFormProps {
  admin?: User | null;
  onClose: () => void;
}

interface FormData {
  full_name: string;
  email: string;
  username: string;
  password: string;
  role: 'admin' | 'super_admin';
}

export function AdminForm({ admin, onClose }: AdminFormProps) {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      full_name: admin?.full_name || '',
      email: admin?.email || '',
      username: admin?.username || '',
      password: '',
      role: admin?.role as 'admin' | 'super_admin' || 'admin',
    }
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    
    try {
      if (admin) {
        // Update existing admin
        const updateData: any = {
          full_name: data.full_name,
          email: data.email,
          username: data.username,
          role: data.role,
        };

        // Only update password if provided
        if (data.password.trim()) {
          updateData.password_hash = data.password;
        }

        const { error } = await supabase
          .from('users')
          .update(updateData)
          .eq('id', admin.id);

        if (error) throw error;

        // Log the activity
        if (user) {
          await logAdminActivity(
            user.id,
            'update',
            'instructor',
            admin.id,
            { 
              instructor_name: data.full_name,
              updated_fields: Object.keys(updateData),
              old_role: admin.role,
              new_role: data.role
            }
          );
        }
      } else {
        // Create new admin
        const { data: newAdmin, error } = await supabase
          .from('users')
          .insert({
            full_name: data.full_name,
            email: data.email,
            username: data.username,
            password_hash: data.password,
            role: data.role,
          })
          .select()
          .single();

        if (error) throw error;

        // Log the activity
        if (user) {
          await logAdminActivity(
            user.id,
            'create',
            'instructor',
            newAdmin.id,
            { 
              instructor_name: data.full_name,
              instructor_role: data.role,
              instructor_email: data.email
            }
          );
        }
      }

      onClose();
    } catch (error: any) {
      console.error('Error saving instructor:', error);
      if (error.code === '23505') {
        alert('Username or email already exists. Please choose different values.');
      } else {
        alert('Error saving instructor. Please try again.');
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
            {admin ? 'Edit Instructor' : 'Create Instructor'}
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
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
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
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
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
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
              placeholder="Enter username"
            />
            {errors.username && <p className="text-red-600 text-sm mt-1">{errors.username.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Password {admin && <span className="text-gray-500">(leave blank to keep current)</span>}
            </label>
            <input
              type="password"
              {...register('password', { 
                required: !admin ? 'Password is required' : false,
                minLength: {
                  value: 6,
                  message: 'Password must be at least 6 characters'
                }
              })}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
              placeholder={admin ? "Enter new password (optional)" : "Enter password"}
            />
            {errors.password && <p className="text-red-600 text-sm mt-1">{errors.password.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Role</label>
            <select
              {...register('role')}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="admin">Instructor</option>
              <option value="super_admin">Super Administrator</option>
            </select>
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
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50"
            >
              {loading ? 'Saving...' : admin ? 'Update Instructor' : 'Create Instructor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}