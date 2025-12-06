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
