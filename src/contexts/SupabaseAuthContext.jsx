import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';

const SupabaseAuthContext = createContext({});

export const useSupabaseAuth = () => {
    const context = useContext(SupabaseAuthContext);
    if (!context) {
        throw new Error('useSupabaseAuth must be used within SupabaseAuthProvider');
    }
    return context;
};

export const SupabaseAuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [session, setSession] = useState(null);

    useEffect(() => {
        // Check if Supabase is configured
        if (!isSupabaseConfigured()) {
            setLoading(false);
            return;
        }

        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) {
                loadProfile(session.user.id);
            } else {
                setLoading(false);
            }
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) {
                loadProfile(session.user.id);
            } else {
                setProfile(null);
                setLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    // Session health check - validates and refreshes session periodically
    // This helps prevent mobile session loss due to background app suspension
    useEffect(() => {
        if (!isSupabaseConfigured()) return;

        const checkSessionHealth = async () => {
            try {
                const { data: { session: currentSession }, error } = await supabase.auth.getSession();

                if (error) {
                    console.warn('[Session Health] Error getting session:', error.message);
                    return;
                }

                if (!currentSession && user) {
                    // Session lost but we think we're logged in - attempt refresh
                    console.warn('[Session Health] Session missing, attempting refresh...');
                    const { data, error: refreshError } = await supabase.auth.refreshSession();

                    if (refreshError) {
                        console.error('[Session Health] Refresh failed:', refreshError.message);
                        // Clear stale state
                        setUser(null);
                        setSession(null);
                        setProfile(null);
                    } else if (data.session) {
                        console.log('[Session Health] Session refreshed successfully');
                        setSession(data.session);
                        setUser(data.session.user);
                    }
                } else if (currentSession) {
                    // Check if token is expiring soon (within 5 minutes)
                    const expiresAt = currentSession.expires_at;
                    const now = Math.floor(Date.now() / 1000);
                    const fiveMinutes = 5 * 60;

                    if (expiresAt && (expiresAt - now) < fiveMinutes) {
                        console.log('[Session Health] Token expiring soon, refreshing...');
                        await supabase.auth.refreshSession();
                    }
                }
            } catch (e) {
                console.error('[Session Health] Check failed:', e);
            }
        };

        // Check immediately on mount
        checkSessionHealth();

        // Check every 5 minutes
        const interval = setInterval(checkSessionHealth, 5 * 60 * 1000);

        // Also check when app returns from background (mobile)
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                console.log('[Session Health] App became visible, checking session...');
                checkSessionHealth();
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            clearInterval(interval);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [user]);

    const loadProfile = async (userId) => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (error && error.code !== 'PGRST116') { // PGRST116 = not found
                throw error;
            }

            if (data) {
                setProfile(data);
            }
        } catch (error) {
            console.error('Error loading profile:', error);
        } finally {
            setLoading(false);
        }
    };

    const signUp = async (email, password, metadata = {}) => {
        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: metadata
                }
            });

            if (error) throw error;

            // Create profile
            if (data.user) {
                const { error: profileError } = await supabase
                    .from('profiles')
                    .insert([{
                        id: data.user.id,
                        email: data.user.email,
                        full_name: metadata.full_name || '',
                        role: metadata.role || 'student',
                        institution: metadata.institution || ''
                    }]);

                if (profileError) {
                    console.error('Error creating profile:', profileError);
                }
            }

            return { data, error: null };
        } catch (error) {
            return { data: null, error };
        }
    };

    const signIn = async (email, password) => {
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return { data: null, error };
        }
    };

    const signOut = async () => {
        try {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
            setUser(null);
            setProfile(null);
            return { error: null };
        } catch (error) {
            return { error };
        }
    };

    const updateProfile = async (updates) => {
        try {
            if (!user) throw new Error('No user logged in');

            const { error } = await supabase
                .from('profiles')
                .update(updates)
                .eq('id', user.id);

            if (error) throw error;

            // Reload profile
            await loadProfile(user.id);
            return { error: null };
        } catch (error) {
            return { error };
        }
    };

    const resetPassword = async (email) => {
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password`,
            });

            if (error) throw error;
            return { error: null };
        } catch (error) {
            return { error };
        }
    };

    const value = {
        user,
        profile,
        session,
        loading,
        signUp,
        signIn,
        signOut,
        updateProfile,
        resetPassword,
        isAuthenticated: !!user,
        isSupabaseEnabled: isSupabaseConfigured()
    };

    return (
        <SupabaseAuthContext.Provider value={value}>
            {children}
        </SupabaseAuthContext.Provider>
    );
};

export default SupabaseAuthContext;
