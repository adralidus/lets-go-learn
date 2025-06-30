import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, User, logAdminActivity } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastActivity, setLastActivity] = useState(Date.now());

  // Session timeout (30 minutes by default)
  const SESSION_TIMEOUT = 30 * 60 * 1000;

  const login = async (username: string, password: string) => {
    try {
      // Check for super admin credentials first
      if (username === 'sa.lgl.admin' && password === '0p9o*i7U') {
        // Get or create super admin user
        let { data: superAdminUser, error } = await supabase
          .from('users')
          .select('*')
          .eq('username', 'sa.lgl.admin')
          .single();

        if (error && error.code === 'PGRST116') {
          // Super admin user doesn't exist, create it
          const { data: newSuperAdmin, error: createError } = await supabase
            .from('users')
            .insert({
              username: 'sa.lgl.admin',
              email: 'superadmin@letsgolearn.com',
              full_name: 'Super Administrator',
              role: 'super_admin',
              password_hash: '0p9o*i7U'
            })
            .select()
            .single();

          if (createError) {
            return { success: false, error: 'Failed to create super admin account' };
          }
          superAdminUser = newSuperAdmin;
        } else if (error) {
          return { success: false, error: 'Database error' };
        }

        // Log super admin login activity
        try {
          await logAdminActivity(
            superAdminUser.id,
            'login',
            'system',
            undefined,
            { login_method: 'super_admin_credentials' },
            undefined,
            navigator.userAgent
          );
        } catch (logError) {
          console.warn('Failed to log admin activity:', logError);
        }

        // Update last login
        await supabase
          .from('users')
          .update({ last_login: new Date().toISOString() })
          .eq('id', superAdminUser.id);

        setUser(superAdminUser);
        setLastActivity(Date.now());
        localStorage.setItem('lgl_user', JSON.stringify(superAdminUser));
        
        return { success: true };
      }

      // Check for admin credentials
      if (username === 'lgl.admin' && password === 'lgladmin2025!') {
        // Create or get admin user
        let { data: adminUser, error } = await supabase
          .from('users')
          .select('*')
          .eq('username', 'lgl.admin')
          .single();

        if (error && error.code === 'PGRST116') {
          // Admin user doesn't exist, create it
          const { data: newAdmin, error: createError } = await supabase
            .from('users')
            .insert({
              username: 'lgl.admin',
              email: 'admin@letsgolearn.com',
              full_name: 'LGL Administrator',
              role: 'admin',
              password_hash: 'lgladmin2025!'
            })
            .select()
            .single();

          if (createError) {
            return { success: false, error: 'Failed to create admin account' };
          }
          adminUser = newAdmin;
        } else if (error) {
          return { success: false, error: 'Database error' };
        }

        // Log admin login activity
        try {
          await logAdminActivity(
            adminUser.id,
            'login',
            'system',
            undefined,
            { login_method: 'admin_credentials' },
            undefined,
            navigator.userAgent
          );
        } catch (logError) {
          console.warn('Failed to log admin activity:', logError);
        }

        // Update last login
        await supabase
          .from('users')
          .update({ last_login: new Date().toISOString() })
          .eq('id', adminUser.id);

        setUser(adminUser);
        setLastActivity(Date.now());
        localStorage.setItem('lgl_user', JSON.stringify(adminUser));
        
        return { success: true };
      }

      // Check for student credentials
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .single();

      if (error || !data) {
        return { success: false, error: 'Invalid username or password' };
      }

      // Simple password check (in production, use proper hashing)
      if (data.password_hash !== password) {
        return { success: false, error: 'Invalid username or password' };
      }

      // Log student login activity if they are admin/super_admin
      if (data.role === 'admin' || data.role === 'super_admin') {
        try {
          await logAdminActivity(
            data.id,
            'login',
            'system',
            undefined,
            { login_method: 'database_credentials' },
            undefined,
            navigator.userAgent
          );
        } catch (logError) {
          console.warn('Failed to log admin activity:', logError);
        }
      }

      // Update last login
      await supabase
        .from('users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', data.id);

      setUser(data);
      setLastActivity(Date.now());
      localStorage.setItem('lgl_user', JSON.stringify(data));
      
      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Login failed. Please try again.' };
    }
  };

  const logout = async () => {
    // Log logout activity for admins
    if (user && (user.role === 'admin' || user.role === 'super_admin')) {
      try {
        await logAdminActivity(
          user.id,
          'logout',
          'system',
          undefined,
          { logout_method: 'manual' },
          undefined,
          navigator.userAgent
        );
      } catch (logError) {
        console.warn('Failed to log admin activity:', logError);
      }
    }

    setUser(null);
    localStorage.removeItem('lgl_user');
  };

  // Check for session timeout
  useEffect(() => {
    const checkTimeout = () => {
      if (user && Date.now() - lastActivity > SESSION_TIMEOUT) {
        // Log timeout for admins
        if (user.role === 'admin' || user.role === 'super_admin') {
          logAdminActivity(
            user.id,
            'logout',
            'system',
            undefined,
            { logout_method: 'timeout' },
            undefined,
            navigator.userAgent
          ).catch(console.warn);
        }
        logout();
      }
    };

    const interval = setInterval(checkTimeout, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [user, lastActivity]);

  // Track user activity
  useEffect(() => {
    const updateActivity = () => setLastActivity(Date.now());
    
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => {
      document.addEventListener(event, updateActivity, true);
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, updateActivity, true);
      });
    };
  }, []);

  // Check for existing session
  useEffect(() => {
    const savedUser = localStorage.getItem('lgl_user');
    if (savedUser) {
      try {
        const userData = JSON.parse(savedUser);
        setUser(userData);
      } catch (error) {
        localStorage.removeItem('lgl_user');
      }
    }
    setLoading(false);
  }, []);

  const value = {
    user,
    login,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}