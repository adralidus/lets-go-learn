import { useState } from 'react';
import { supabase, User, logAdminActivity } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { X } from 'lucide-react';
import { useForm } from 'react-hook-form';

interface StudentFormProps {
  student?: User | null;
  onClose: () => void;
}

interface FormData {
  full_name: string;
  email: string;
  username: string;
  password: string;
}

export function StudentForm({ student, onClose }: StudentFormProps) {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      full_name: student?.full_name || '',
      email: student?.email || '',
      username: student?.username || '',
      password: '',
    }
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    
    try {
      if (student) {
        // Update existing student
        const updateData: any = {
          full_name: data.full_name,
          email: data.email,
          username: data.username,
        };

        // Only update password if provided
        if (data.password.trim()) {
          updateData.password_hash = data.password;
        }

        const { error } = await supabase
          .from('users')
          .update(updateData)
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
              student_name: data.full_name,
              updated_fields: Object.keys(updateData)
            }
          );
        }
      } else {
        // Create new student
        const { data: newStudent, error } = await supabase
          .from('users')
          .insert({
            full_name: data.full_name,
            email: data.email,
            username: data.username,
            password_hash: data.password,
            role: 'student',
          })
          .select()
          .single();

        if (error) throw error;

        // Log the activity
        if (user) {
          await logAdminActivity(
            user.id,
            'create',
            'student',
            newStudent.id,
            { 
              student_name: data.full_name,
              student_email: data.email
            }
          );
        }
      }

      onClose();
    } catch (error: any) {
      console.error('Error saving student:', error);
      if (error.code === '23505') {
        alert('Username or email already exists. Please choose different values.');
      } else {
        alert('Error saving student. Please try again.');
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
            {student ? 'Edit Student' : 'Create Student'}
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
              Password {student && <span className="text-gray-500">(leave blank to keep current)</span>}
            </label>
            <input
              type="password"
              {...register('password', { 
                required: !student ? 'Password is required' : false,
                minLength: {
                  value: 6,
                  message: 'Password must be at least 6 characters'
                }
              })}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
              placeholder={student ? "Enter new password (optional)" : "Enter password"}
            />
            {errors.password && <p className="text-red-600 text-sm mt-1">{errors.password.message}</p>}
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
              {loading ? 'Saving...' : student ? 'Update Student' : 'Create Student'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}