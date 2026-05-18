/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useState, useEffect, useContext } from 'react';
import { ensureActiveSession, supabase } from '../services/supabaseClient';
import { get, set, del } from 'idb-keyval';
import { getCurrentStudyYear } from '../utils/studentIdentity';

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
        const cacheKey = `fap_profile_persistent_${userId}`;
        try {
            // 1. Try fetching fresh data from Supabase
            await ensureActiveSession({ minValiditySeconds: 180 });
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (error) {
                console.warn('Error loading profile (network?):', error);

                // 2. Fallback: Try loading from local storage/IndexedDB
                const cachedProfile = await get(cacheKey);
                if (cachedProfile) {
                    console.log('Using cached profile from IDB');
                    setProfile(cachedProfile);
                    return cachedProfile;
                }

                return null;
            }

            let resolvedProfile = data;

            // Auto-sync legacy `year` from `year_of_joining` for student progression.
            if (data?.role === 'student' && data?.year_of_joining) {
                const computedYear = getCurrentStudyYear(data);
                if (computedYear && data.year !== computedYear) {
                    const { error: syncError } = await supabase
                        .from('profiles')
                        .update({ year: computedYear })
                        .eq('id', userId);

                    if (!syncError) {
                        resolvedProfile = { ...data, year: computedYear };
                    } else {
                        console.warn('Could not auto-sync study year from joining year:', syncError);
                    }
                }
            }

            // 3. Success: Update state and cache
            setProfile(resolvedProfile);
            await set(cacheKey, resolvedProfile);
            return resolvedProfile;
        } catch (error) {
            console.error('Error loading profile:', error);

            const cachedProfile = await get(cacheKey);
            if (cachedProfile) {
                setProfile(cachedProfile);
                return cachedProfile;
            }
            return null;
        }
    };

    // Initialize auth state
    useEffect(() => {
        let mounted = true;

        const initAuth = async () => {
            try {
                // Set a safety timeout to force loading to false
                const safetyTimeout = setTimeout(() => {
                    if (mounted) {
                        console.warn("Auth check timed out - forcing app load");
                        setLoading(false);
                    }
                }, 5000);

                const currentSession = await ensureActiveSession({ minValiditySeconds: 300 });

                if (!mounted) {
                    clearTimeout(safetyTimeout);
                    return;
                }

                if (currentSession) {
                    setSession(currentSession);
                    setUser(currentSession.user);
                    await loadUserProfile(currentSession.user.id);
                    
                    // Cache session metadata for offline re-entry
                    await set('fap_cached_session', {
                        user: currentSession.user,
                        expires_at: currentSession.expires_at,
                        timestamp: Date.now()
                    });
                } else if (!navigator.onLine) {
                    // OFFLINE RE-ENTRY
                    console.log("📱 [OFFLINE] Attempting re-entry with cached session...");
                    const cachedSession = await get('fap_cached_session');
                    if (cachedSession && mounted) {
                        setUser(cachedSession.user);
                        await loadUserProfile(cachedSession.user.id);
                        console.log("📱 [OFFLINE] Re-entry successful");
                    }
                }

                clearTimeout(safetyTimeout);
                setLoading(false);
            } catch (error) {
                console.error('Auth check failed:', error);
                if (mounted) setLoading(false);
            }
        };

        initAuth();

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (_event, session) => {
                if (!mounted) return;

                setSession(session);
                setUser(session?.user ?? null);

                if (session?.user) {
                    // Supabase warns against awaiting other Supabase calls inside
                    // onAuthStateChange; doing so can block sign-in on some clients.
                    setTimeout(async () => {
                        if (!mounted) return;
                        await loadUserProfile(session.user.id);
                        await set('fap_cached_session', {
                            user: session.user,
                            expires_at: session.expires_at,
                            timestamp: Date.now()
                        });
                    }, 0);
                } else {
                    setProfile(null);
                }

                setLoading(false);
            }
        );

        // Check session status periodically, but rely on auto-refresh for the heavy lifting
        // REMOVED manual interval to avoid fighting with Supabase auto-refresh
        /*
        const checkSessionInterval = setInterval(async () => {
             ...
        }, 5 * 60 * 1000); 
        */

        return () => {
            mounted = false;
            // Check if subscription exists before unsubscribing
            if (subscription && typeof subscription.unsubscribe === 'function') {
                subscription.unsubscribe();
            }
            // clearInterval(checkSessionInterval);
        };
    }, []);

    // Sign in
    const signIn = async (username, password) => {
        // Normalize username to lowercase for case-insensitive lookup
        const normalizedUsername = username.trim().toLowerCase();
        
        const { data: userProfile, error: profileError } = await supabase
            .rpc('get_user_by_username', { p_username: normalizedUsername });

        if (profileError) {
            console.error('RPC error:', profileError);
            throw new Error('Unable to verify username. Please try again.');
        }
        
        if (!userProfile || userProfile.length === 0) {
            throw new Error('Invalid username or password');
        }

        const profile = userProfile[0];
        
        // Validate email exists
        if (!profile.email) {
            throw new Error('Account configuration error. Contact admin.');
        }

        const { data, error } = await supabase.auth.signInWithPassword({
            email: profile.email,
            password: password,
        });

        if (error) throw error;
        await ensureActiveSession({ minValiditySeconds: 300 });

        return { data, profile };
    };

    // Sign out
    const signOut = async () => {
        const userId = user?.id;
        setProfile(null);
        setUser(null);
        setSession(null);
        
        // Clear all persistent caches on logout
        try {
            await del('fap_cached_session');
            if (userId) await del(`fap_profile_persistent_${userId}`);
            await supabase.auth.signOut();
        } catch (error) {
            console.error("Error signing out:", error);
        }
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
