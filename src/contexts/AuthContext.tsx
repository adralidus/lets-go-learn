import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, User } from '../lib/supabase';

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

  // Session timeout (5 minutes)
  const SESSION_TIMEOUT = 5 * 60 * 1000;

  const login = async (username: string, password: string) => {
    try {
      // Check for admin credentials first
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
              password_hash: 'lgladmin2025!' // In production, this should be properly hashed
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

  const logout = () => {
    setUser(null);
    localStorage.removeItem('lgl_user');
  };

  // Check for session timeout
  useEffect(() => {
    const checkTimeout = () => {
      if (user && Date.now() - lastActivity > SESSION_TIMEOUT) {
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