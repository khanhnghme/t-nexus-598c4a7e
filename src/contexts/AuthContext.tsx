import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { Profile, UserRole, AppRole } from '@/types/database';
import { initR2Storage } from '@/lib/r2Storage';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  roles: AppRole[];
  isLoading: boolean;
  isAdmin: boolean;
  isLeader: boolean;
  isApproved: boolean;
  mustChangePassword: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, studentId: string, fullName: string, institution?: string) => Promise<{ data: any; error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState('');
  const [maintenanceEndAt, setMaintenanceEndAt] = useState<string | null>(null);

  const fetchProfile = async (userId: string) => {
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    
    if (profileData) {
      setProfile(profileData as Profile);
    }

    const { data: rolesData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);
    
    if (rolesData) {
      setRoles(rolesData.map(r => r.role as AppRole));
    }
  };

  const saveDemoPassword = useCallback(async (userId: string, password: string) => {
    try {
      await supabase.functions.invoke('manage-users', {
        body: { action: 'save_demo_password', user_id: userId, password },
      });
    } catch (err) {
      console.warn('demo_passwords save via edge function failed:', err);
    }
  }, []);

  const fetchMaintenanceMode = async () => {
    try {
      const { data } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'maintenance_mode')
        .maybeSingle();

      if (data?.value) {
        const val = data.value as { enabled?: boolean; message?: string; start_at?: string; end_at?: string };
        
        let isActive = val.enabled ?? false;
        const endAt = val.end_at ?? null;
        
        // Auto-disable if end_at has passed
        if (isActive && endAt) {
          const endTime = new Date(endAt).getTime();
          if (endTime <= Date.now()) {
            isActive = false;
            // Auto-disable in DB
            await supabase
              .from('system_settings')
              .update({
                value: { ...val, enabled: false },
                updated_at: new Date().toISOString(),
              })
              .eq('key', 'maintenance_mode');
          }
        }
        
        setMaintenanceMode(isActive);
        setMaintenanceMessage(val.message ?? 'Hệ thống đang bảo trì, vui lòng quay lại sau.');
        setMaintenanceEndAt(isActive ? endAt : null);
      }
    } catch (err) {
      console.warn('Error fetching maintenance mode:', err);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  useEffect(() => {
    let isMounted = true;
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;
      
      if (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN') {
        setSession(session);
        setUser(session?.user ?? null);
        initR2Storage();
        
        if (session?.user) {
          setTimeout(() => {
            if (isMounted) fetchProfile(session.user.id);
          }, 0);
        }
      } else if (event === 'SIGNED_OUT') {
        setSession(null);
        setUser(null);
        setProfile(null);
        setRoles([]);
      }
      
      if (isMounted) setIsLoading(false);
    });

    const initSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (!isMounted) return;
        
        if (error) {
          console.warn('Session error:', error.message);
          setSession(null);
          setUser(null);
          setProfile(null);
          setRoles([]);
          setIsLoading(false);
          return;
        }
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await initR2Storage();
          await fetchProfile(session.user.id);
        }
      } catch (err) {
        console.warn('Auth initialization error:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    
    initSession();
    fetchMaintenanceMode();

    // Poll maintenance mode every 30 seconds
    const interval = setInterval(fetchMaintenanceMode, 30000);

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (!error && data?.user) {
      saveDemoPassword(data.user.id, password).catch(() => {});
    }

    return { error };
  };

  const signUp = async (email: string, password: string, studentId: string, fullName: string, institution?: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: {
          student_id: studentId,
          full_name: fullName,
          institution: institution || null,
        },
      },
    });
    return { data, error };
  };

  const signOut = async () => {
    setUser(null);
    setSession(null);
    setProfile(null);
    setRoles([]);
    
    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch (error) {
      console.warn('Sign out error:', error);
    }
  };

  const isAdmin = roles.includes('admin');
  const isLeader = roles.includes('leader') || isAdmin;
  const isApproved = profile?.is_approved ?? false;
  const mustChangePassword = profile?.must_change_password ?? false;

  // Check if user is suspended
  const isSuspended = profile?.suspended_until
    ? new Date(profile.suspended_until).getTime() > Date.now()
    : false;

  const handleUnlocked = useCallback(() => {
    refreshProfile();
  }, [user]);

  // Auto sign-out suspended/maintenance users and store reason in sessionStorage
  useEffect(() => {
    if (!user || !profile || isAdmin) return;
    const pathname = window.location.pathname;
    const isPublicAuthRoute = pathname === '/auth' || pathname.startsWith('/auth/') || pathname === '/reset-password';
    if (isPublicAuthRoute) return;

    if (maintenanceMode) {
      sessionStorage.setItem('t-nexus_auth_block', JSON.stringify({
        type: 'maintenance',
        message: maintenanceMessage,
        endAt: maintenanceEndAt,
      }));
      signOut().then(() => { window.location.href = '/auth'; });
    } else if (isSuspended) {
      sessionStorage.setItem('t-nexus_auth_block', JSON.stringify({
        type: 'suspended',
        until: profile.suspended_until,
        reason: profile.suspension_reason,
      }));
      signOut().then(() => { window.location.href = '/auth'; });
    }
  }, [user, profile, isAdmin, maintenanceMode, isSuspended]);

  const contextValue = {
    user, session, profile, roles, isLoading,
    isAdmin, isLeader, isApproved, mustChangePassword,
    signIn, signUp, signOut, refreshProfile,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
