import React, { createContext, useContext, useState, useEffect } from 'react';
import { Profile } from '../types';
import { INITIAL_PROFILES } from '../lib/mockData';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useNotification } from './NotificationContext';

interface AuthContextType {
  user: Profile | null;
  isLoading: boolean;
  isAdmin: boolean;
  isCreator: boolean;
  isAuthenticated: boolean;
  isAgeVerified: boolean;
  verifyAge: () => void;
  signIn: (email: string, pass: string) => Promise<boolean>;
  signUp: (email: string, pass: string, username: string, displayName: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  switchDemoProfile: (profileId: string | null) => void;
  updateProfile: (data: Partial<Profile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Profile | null>(() => {
    // Default to Aria Chen (creator) so the platform is immediately interactive
    const saved = localStorage.getItem('streamsphere_current_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return INITIAL_PROFILES[1]; // Aria Chen
  });

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isAgeVerified, setIsAgeVerified] = useState<boolean>(() => {
    return localStorage.getItem('streamsphere_age_verified') === 'true';
  });

  const { showToast } = useNotification();

  // Watch Supabase auth if configured
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchSupabaseProfile(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        fetchSupabaseProfile(session.user.id);
      } else {
        // No session
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchSupabaseProfile(userId: string) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      if (!error && data) {
        setUser(data as Profile);
        localStorage.setItem('streamsphere_current_user', JSON.stringify(data));
      }
    } catch (e) {
      console.warn('Failed to fetch profile from Supabase:', e);
    }
  }

  const verifyAge = () => {
    setIsAgeVerified(true);
    localStorage.setItem('streamsphere_age_verified', 'true');
    showToast({
      type: 'success',
      title: 'Age Verified',
      message: 'You have confirmed you are 18+ to view restricted content.',
    });
  };

  const signIn = async (email: string, pass: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
        if (error) throw error;
        if (data.user) {
          await fetchSupabaseProfile(data.user.id);
          showToast({ type: 'success', title: 'Welcome back!', message: 'Signed in successfully.' });
          return true;
        }
      }

      // Demo fallback: Find matching or assign profile
      const found = INITIAL_PROFILES.find(p => p.username.toLowerCase() === email.toLowerCase()) || INITIAL_PROFILES[1];
      setUser(found);
      localStorage.setItem('streamsphere_current_user', JSON.stringify(found));
      showToast({ type: 'success', title: 'Signed In', message: `Welcome back, ${found.display_name}!` });
      return true;
    } catch (err: any) {
      showToast({ type: 'error', title: 'Authentication Error', message: err.message || 'Invalid credentials' });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (email: string, pass: string, username: string, displayName: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password: pass,
          options: {
            data: { username, display_name: displayName },
          },
        });
        if (error) throw error;
        if (data.user) {
          showToast({ type: 'success', title: 'Account Created', message: 'Please check your email to confirm registration.' });
          return true;
        }
      }

      // Demo fallback
      const newProfile: Profile = {
        id: 'usr_' + Math.random().toString(36).substring(2, 9),
        username: username.toLowerCase().trim(),
        display_name: displayName.trim(),
        role: 'creator',
        is_verified: false,
        is_suspended: false,
        subscriber_count: 0,
        total_views: 0,
        avatar_url: `https://api.dicebear.com/7.x/bottts/svg?seed=${username}`,
        bio: 'New creator on StreamSphere',
        created_at: new Date().toISOString(),
      };

      setUser(newProfile);
      localStorage.setItem('streamsphere_current_user', JSON.stringify(newProfile));
      showToast({ type: 'success', title: 'Account Created', message: `Welcome to StreamSphere, ${displayName}!` });
      return true;
    } catch (err: any) {
      showToast({ type: 'error', title: 'Registration Failed', message: err.message || 'Could not create account.' });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
    setUser(null);
    localStorage.removeItem('streamsphere_current_user');
    showToast({ type: 'info', title: 'Signed Out', message: 'You have been signed out.' });
  };

  const switchDemoProfile = (profileId: string | null) => {
    if (!profileId) {
      setUser(null);
      localStorage.removeItem('streamsphere_current_user');
      showToast({ type: 'info', title: 'Viewing as Guest', message: 'Unauthenticated preview mode.' });
      return;
    }
    const p = INITIAL_PROFILES.find(prof => prof.id === profileId);
    if (p) {
      setUser(p);
      localStorage.setItem('streamsphere_current_user', JSON.stringify(p));
      showToast({
        type: 'success',
        title: `Switched to ${p.display_name}`,
        message: `Role: ${p.role.toUpperCase()}`,
      });
    }
  };

  const updateProfile = async (data: Partial<Profile>) => {
    if (!user) return;
    const updated = { ...user, ...data, updated_at: new Date().toISOString() };
    setUser(updated);
    localStorage.setItem('streamsphere_current_user', JSON.stringify(updated));

    if (isSupabaseConfigured) {
      try {
        await supabase.from('profiles').update(data).eq('id', user.id);
      } catch (e) {
        console.warn('Supabase profile update failed:', e);
      }
    }

    showToast({ type: 'success', title: 'Profile Updated', message: 'Your changes have been saved.' });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAdmin: user?.role === 'admin' || user?.role === 'moderator',
        isCreator: user?.role === 'creator' || user?.role === 'admin',
        isAuthenticated: Boolean(user),
        isAgeVerified,
        verifyAge,
        signIn,
        signUp,
        signOut,
        switchDemoProfile,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
