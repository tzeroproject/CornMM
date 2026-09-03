import React, { createContext, useContext, useState, useEffect } from 'react';
import { Profile } from '../types';
import { supabase, isSupabaseConfigured, isSchemaReady, handleSupabaseError } from '../lib/supabase';
import { useNotification } from './NotificationContext';

export const CADMIN_ACCOUNT = {
  username: 'Cadmin',
  email: 'cadmin@streamsphere.tv',
  password: 'Cadmin@123',
  profile: {
    id: '00000000-0000-0000-0000-000000000001',
    username: 'Cadmin',
    display_name: 'Chief Administrator (Cadmin)',
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=160&auto=format&fit=crop&q=80',
    role: 'admin' as const,
    is_verified: true,
    is_suspended: false,
    subscriber_count: 52400,
    total_views: 1250000,
    bio: 'Platform System Administrator & Content Moderation Lead. Full RBAC clearance.',
    created_at: '2024-01-01T00:00:00Z',
  },
};

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
  updateProfile: (data: Partial<Profile>) => Promise<void>;
  updateUserProfile: (data: Partial<Profile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Profile | null>(() => {
    try {
      const saved = localStorage.getItem('streamsphere_production_user_v2');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return null;
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAgeVerified, setIsAgeVerified] = useState<boolean>(() => {
    return localStorage.getItem('streamsphere_age_verified') === 'true';
  });

  const { showToast } = useNotification();

  useEffect(() => {
    let isMounted = true;

    async function initAuth() {
      if (isSupabaseConfigured) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user && isMounted) {
            await fetchSupabaseProfile(session.user.id);
          } else if (isMounted) {
            setIsLoading(false);
          }
        } catch (err) {
          console.warn('Supabase getSession failed:', err);
          if (isMounted) setIsLoading(false);
        }

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
          if (session?.user) {
            await fetchSupabaseProfile(session.user.id);
          } else {
            setUser(null);
            localStorage.removeItem('streamsphere_production_user_v2');
            setIsLoading(false);
          }
        });

        return () => subscription.unsubscribe();
      } else {
        setIsLoading(false);
      }
    }

    initAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  async function fetchSupabaseProfile(userId: string) {
    if (!isSchemaReady()) {
      setIsLoading(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (!error && data) {
        setUser(data as Profile);
        localStorage.setItem('streamsphere_production_user_v2', JSON.stringify(data));
      } else if (error) {
        handleSupabaseError(error, 'fetchSupabaseProfile');
      }
    } catch (e) {
      handleSupabaseError(e, 'fetchSupabaseProfile catch');
    } finally {
      setIsLoading(false);
    }
  }

  const verifyAge = () => {
    setIsAgeVerified(true);
    localStorage.setItem('streamsphere_age_verified', 'true');
    showToast({
      type: 'success',
      title: 'Age Verified',
      message: 'You have verified you are 18+ to view restricted content.',
    });
  };

  const signIn = async (identifier: string, pass: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      let cleanIdentifier = identifier.trim().toLowerCase();

      // Map 'cadmin' to the actual email for Supabase auth
      if (
        cleanIdentifier === 'cadmin' ||
        cleanIdentifier === 'cadmin@streamsphere.tv' ||
        cleanIdentifier === 'cadmin@admin.com'
      ) {
        cleanIdentifier = 'cadmin@streamsphere.tv';
        // If Supabase is NOT configured, allow bypass. Otherwise, fall through to Supabase auth
        if (!isSupabaseConfigured) {
          if (pass === CADMIN_ACCOUNT.password) {
            setUser(CADMIN_ACCOUNT.profile);
            localStorage.setItem('streamsphere_production_user_v2', JSON.stringify(CADMIN_ACCOUNT.profile));
            showToast({
              type: 'success',
              title: 'Administrator Access Granted',
              message: 'Signed in as Administrator Cadmin. Full moderation clearance active.',
            });
            return true;
          } else {
            showToast({ type: 'error', title: 'Authentication Failed', message: 'Incorrect password.' });
            return false;
          }
        }
      }

      if (isSupabaseConfigured) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanIdentifier,
          password: pass,
        });
        if (error) throw error;
        if (data.user) {
          await fetchSupabaseProfile(data.user.id);
          showToast({ type: 'success', title: 'Welcome back!', message: 'Signed in successfully.' });
          return true;
        }
      } else {
        // Safe offline account matching
        let localUser: Profile;
        try {
          const registry = JSON.parse(localStorage.getItem('streamsphere_accounts_registry_v2') || '[]');
          const match = registry.find(
            (a: any) =>
              a.username?.toLowerCase() === cleanIdentifier ||
              a.email?.toLowerCase() === cleanIdentifier
          );
          if (match) {
            if (match.password && match.password !== pass) {
              showToast({ type: 'error', title: 'Authentication Failed', message: 'Invalid password.' });
              return false;
            }
            localUser = match.profile;
          } else {
            localUser = {
              id: 'usr_' + Math.random().toString(36).substring(2, 9),
              username: cleanIdentifier.includes('@')
                ? cleanIdentifier.split('@')[0].replace(/[^a-z0-9_]/g, '')
                : cleanIdentifier.replace(/[^a-z0-9_]/g, ''),
              display_name: cleanIdentifier.includes('@') ? cleanIdentifier.split('@')[0] : identifier.trim(),
              role: 'creator',
              is_verified: false,
              is_suspended: false,
              subscriber_count: 0,
              total_views: 0,
              avatar_url: `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanIdentifier}`,
              bio: 'Creator on StreamSphere',
              created_at: new Date().toISOString(),
            };
          }
        } catch {
          localUser = {
            id: 'usr_' + Math.random().toString(36).substring(2, 9),
            username: cleanIdentifier.includes('@')
              ? cleanIdentifier.split('@')[0].replace(/[^a-z0-9_]/g, '')
              : cleanIdentifier.replace(/[^a-z0-9_]/g, ''),
            display_name: cleanIdentifier.includes('@') ? cleanIdentifier.split('@')[0] : identifier.trim(),
            role: 'creator',
            is_verified: false,
            is_suspended: false,
            subscriber_count: 0,
            total_views: 0,
            avatar_url: `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanIdentifier}`,
            bio: 'Creator on StreamSphere',
            created_at: new Date().toISOString(),
          };
        }

        setUser(localUser);
        localStorage.setItem('streamsphere_production_user_v2', JSON.stringify(localUser));
        showToast({ type: 'success', title: 'Signed In', message: `Welcome, ${localUser.display_name}!` });
        return true;
      }
      return false;
    } catch (err: any) {
      showToast({ type: 'error', title: 'Authentication Failed', message: err.message || 'Invalid credentials' });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (email: string, pass: string, param3: string, param4: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      // Determine username vs displayName robustly regardless of caller parameter ordering
      let usernameCandidate = param3;
      let displayNameCandidate = param4;
      if (param4 && !param4.includes(' ') && param3.includes(' ')) {
        usernameCandidate = param4;
        displayNameCandidate = param3;
      }

      const cleanUsername = (usernameCandidate || 'user').toLowerCase().trim().replace(/[^a-z0-9_]/g, '');
      const cleanDisplayName = (displayNameCandidate || cleanUsername).trim();

      if (isSupabaseConfigured) {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password: pass,
          options: {
            data: {
              username: cleanUsername,
              display_name: cleanDisplayName,
              avatar_url: `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanUsername}`,
              role: 'creator',
            },
          },
        });
        if (error) throw error;

        if (data.user) {
          if (data.session) {
            await fetchSupabaseProfile(data.user.id);
            showToast({ type: 'success', title: 'Account Created', message: 'Welcome to StreamSphere!' });
          } else {
            showToast({
              type: 'info',
              title: 'Confirmation Email Sent',
              message: 'Please verify your email address to complete registration.',
            });
          }
          return true;
        }
      } else {
        const newProfile: Profile = {
          id: 'usr_' + Math.random().toString(36).substring(2, 9),
          username: cleanUsername,
          display_name: cleanDisplayName,
          role: 'creator',
          is_verified: false,
          is_suspended: false,
          subscriber_count: 0,
          total_views: 0,
          avatar_url: `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanUsername}`,
          bio: 'Creator on StreamSphere',
          created_at: new Date().toISOString(),
        };

        try {
          const registry = JSON.parse(localStorage.getItem('streamsphere_accounts_registry_v2') || '[]');
          registry.push({
            username: cleanUsername,
            email: email.toLowerCase().trim(),
            password: pass,
            profile: newProfile,
          });
          localStorage.setItem('streamsphere_accounts_registry_v2', JSON.stringify(registry));
        } catch {}

        setUser(newProfile);
        localStorage.setItem('streamsphere_production_user_v2', JSON.stringify(newProfile));
        showToast({ type: 'success', title: 'Account Created', message: `Welcome to StreamSphere, ${cleanDisplayName}!` });
        return true;
      }
      return false;
    } catch (err: any) {
      showToast({ type: 'error', title: 'Registration Failed', message: err.message || 'Could not register account.' });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    if (isSupabaseConfigured) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.warn('Sign out error:', err);
      }
    }
    setUser(null);
    localStorage.removeItem('streamsphere_production_user_v2');
    showToast({ type: 'info', title: 'Signed Out', message: 'You have been signed out of your account.' });
  };

  const updateProfile = async (data: Partial<Profile>) => {
    if (!user) return;
    const updatedAt = new Date().toISOString();
    const updated = { ...user, ...data, updated_at: updatedAt };
    setUser(updated);
    localStorage.setItem('streamsphere_production_user_v2', JSON.stringify(updated));

    if (isSupabaseConfigured && isSchemaReady()) {
      try {
        const { error } = await supabase.from('profiles').update({ ...data, updated_at: updatedAt }).eq('id', user.id);
        if (error) handleSupabaseError(error, 'updateProfile');
      } catch (e) {
        handleSupabaseError(e, 'updateProfile catch');
      }
    }

    showToast({ type: 'success', title: 'Profile Updated', message: 'Your channel settings have been saved.' });
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
        updateProfile,
        updateUserProfile: updateProfile,
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
