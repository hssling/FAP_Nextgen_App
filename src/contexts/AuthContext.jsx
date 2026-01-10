import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import { supabase, refreshSession } from '../services/supabaseClient';

const AuthContext = createContext({});

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [session, setSession] = useState(null);
    const refreshIntervalRef = useRef(null);
    const visibilityHandlerRef = useRef(null);

    // Load user profile from database
    const loadUserProfile = async (userId) => {
        try {
            console.log('[Auth] Loading profile for:', userId);
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (error) {
                console.error('[Auth] Error loading profile:', error);
                return null;
            }

            console.log('[Auth] Profile loaded:', data?.full_name);
            setProfile(data);
            return data;
        } catch (error) {
            console.error('[Auth] Error loading profile:', error);
            return null;
        }
    };

    // Handle visibility change (refresh session when app comes to foreground)
    const handleVisibilityChange = async () => {
        if (document.visibilityState === 'visible' && session) {
            console.log('[Auth] App visible - checking session...');

            // Check if token is about to expire (within 5 minutes)
            const expiresAt = session?.expires_at;
            if (expiresAt) {
                const expiresAtMs = expiresAt * 1000;
                const fiveMinutesMs = 5 * 60 * 1000;
                const now = Date.now();

                if (expiresAtMs - now < fiveMinutesMs) {
                    console.log('[Auth] Token expiring soon, refreshing...');
                    const newSession = await refreshSession();
                    if (newSession) {
                        setSession(newSession);
                        setUser(newSession.user);
                    }
                } else {
                    console.log('[Auth] Session still valid');
                }
            }
        }
    };

    // Initialize auth state
    useEffect(() => {
        let mounted = true;

        const initAuth = async () => {
            try {
                console.log('[Auth] Initializing...');

                // Set a safety timeout to force loading to false after 5 seconds
                const safetyTimeout = setTimeout(() => {
                    if (mounted && loading) {
                        console.warn("[Auth] Check timed out - forcing app load");
                        setLoading(false);
                    }
                }, 5000);

                const { data: { session: currentSession }, error } = await supabase.auth.getSession();

                if (error) {
                    console.error('[Auth] getSession error:', error);
                }

                if (!mounted) {
                    clearTimeout(safetyTimeout);
                    return;
                }

                console.log('[Auth] Session exists:', !!currentSession);

                setSession(currentSession);
                setUser(currentSession?.user ?? null);

                if (currentSession?.user) {
                    await loadUserProfile(currentSession.user.id);
                }

                clearTimeout(safetyTimeout);
                setLoading(false);
            } catch (error) {
                console.error('[Auth] Init failed:', error);
                if (mounted) {
                    setLoading(false);
                }
            }
        };

        initAuth();

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, newSession) => {
                if (!mounted) return;

                console.log('[Auth] State change:', event, !!newSession);

                setSession(newSession);
                setUser(newSession?.user ?? null);

                if (newSession?.user) {
                    await loadUserProfile(newSession.user.id);
                } else {
                    setProfile(null);
                }

                setLoading(false);
            }
        );

        // Set up visibility change listener for session refresh
        visibilityHandlerRef.current = handleVisibilityChange;
        document.addEventListener('visibilitychange', handleVisibilityChange);

        // Set up periodic session refresh (every 10 minutes)
        refreshIntervalRef.current = setInterval(async () => {
            if (session) {
                console.log('[Auth] Periodic refresh check...');
                const newSession = await refreshSession();
                if (newSession && mounted) {
                    setSession(newSession);
                    setUser(newSession.user);
                }
            }
        }, 10 * 60 * 1000); // 10 minutes

        return () => {
            mounted = false;
            subscription.unsubscribe();
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            if (refreshIntervalRef.current) {
                clearInterval(refreshIntervalRef.current);
            }
        };
    }, []);

    // Sign in
    const signIn = async (username, password) => {
        try {
            console.log('[Auth] Signing in:', username);

            const { data: userProfile, error: profileError } = await supabase
                .rpc('get_user_by_username', { p_username: username });

            if (profileError || !userProfile || userProfile.length === 0) {
                throw new Error('Invalid username or password');
            }

            const profileData = userProfile[0];

            const { data, error } = await supabase.auth.signInWithPassword({
                email: profileData.email,
                password: password,
            });

            if (error) throw error;

            console.log('[Auth] Sign in successful');
            return { data, profile: profileData };
        } catch (error) {
            console.error('[Auth] Sign in error:', error);
            throw error;
        }
    };

    // Sign out
    const signOut = async () => {
        console.log('[Auth] Signing out...');

        // Clear interval and visibility handler
        if (refreshIntervalRef.current) {
            clearInterval(refreshIntervalRef.current);
        }

        // Optimistically clear state immediately
        setProfile(null);
        setUser(null);
        setSession(null);

        try {
            await supabase.auth.signOut();
            console.log('[Auth] Sign out complete');
        } catch (error) {
            console.error("[Auth] Sign out error:", error);
        }
    };

    // Manual session refresh (can be called from components)
    const forceRefreshSession = async () => {
        console.log('[Auth] Force refresh requested');
        const newSession = await refreshSession();
        if (newSession) {
            setSession(newSession);
            setUser(newSession.user);
            await loadUserProfile(newSession.user.id);
            return true;
        }
        return false;
    };

    const value = {
        user,
        profile,
        session,
        loading,
        signIn,
        signOut,
        forceRefreshSession,
        isAuthenticated: !!user,
        isStudent: profile?.role === 'student',
        isTeacher: profile?.role === 'teacher',
        isAdmin: profile?.role === 'admin',
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthContext;
