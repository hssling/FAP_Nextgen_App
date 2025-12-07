import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '../services/supabaseClient';

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

    // Load user profile from database
    const loadUserProfile = async (userId) => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (error) {
                console.error('Error loading profile:', error);
                // Return dummy profile on error to prevent indefinite loading
                // This is a safety fallback during dev
                return null;
            }

            setProfile(data);
            return data;
        } catch (error) {
            console.error('Error loading profile:', error);
            return null;
        }
    };

    // Initialize auth state
    useEffect(() => {
        let mounted = true;

        const initAuth = async () => {
            try {
                // Set a safety timeout to force loading to false after 3 seconds
                // This prevents the "stuck on loading" screen forever
                const safetyTimeout = setTimeout(() => {
                    if (mounted && loading) {
                        console.warn("Auth check timed out - forcing app load");
                        setLoading(false);
                    }
                }, 3000);

                const { data: { session } } = await supabase.auth.getSession();

                if (!mounted) {
                    clearTimeout(safetyTimeout);
                    return;
                }

                setSession(session);
                setUser(session?.user ?? null);

                if (session?.user) {
                    await loadUserProfile(session.user.id);
                }

                clearTimeout(safetyTimeout);
                setLoading(false);
            } catch (error) {
                console.error('Auth check failed:', error);
                if (mounted) {
                    setLoading(false);
                }
            }
        };

        initAuth();

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (_event, session) => {
                if (!mounted) return;

                setSession(session);
                setUser(session?.user ?? null);

                if (session?.user) {
                    await loadUserProfile(session.user.id);
                } else {
                    setProfile(null);
                }

                setLoading(false);
            }
        );

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, []);

    // Sign in
    const signIn = async (username, password) => {
        try {
            const { data: userProfile, error: profileError } = await supabase
                .rpc('get_user_by_username', { p_username: username });

            if (profileError || !userProfile || userProfile.length === 0) {
                throw new Error('Invalid username or password');
            }

            const profile = userProfile[0];

            const { data, error } = await supabase.auth.signInWithPassword({
                email: profile.email,
                password: password,
            });

            if (error) throw error;

            return { data, profile };
        } catch (error) {
            throw error;
        }
    };

    // Sign out
    const signOut = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        setProfile(null);
        setUser(null);
        setSession(null);
    };

    const value = {
        user,
        profile,
        session,
        loading,
        signIn,
        signOut,
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
