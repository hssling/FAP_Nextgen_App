import { createClient } from '@supabase/supabase-js';

// Get environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase credentials not found. Using IndexedDB fallback.');
}

/**
 * Custom storage adapter for mobile session persistence
 * Falls back gracefully: localStorage → sessionStorage → in-memory
 * This fixes issues with:
 * - Private/Incognito browsing
 * - In-app mobile browsers (WebView)
 * - PWA with aggressive cache clearing
 * - Safari on iOS with storage restrictions
 */
const createRobustStorage = () => {
    let inMemoryStorage = {};
    let preferredStorage = null;

    // Check storage availability ONCE at initialization
    if (typeof window !== 'undefined') {
        const isAvailable = (storage) => {
            try {
                const testKey = '__fap_storage_test__';
                storage.setItem(testKey, testKey);
                storage.removeItem(testKey);
                return true;
            } catch (e) {
                return false;
            }
        };

        if (isAvailable(window.localStorage)) preferredStorage = window.localStorage;
        else if (isAvailable(window.sessionStorage)) preferredStorage = window.sessionStorage;
    }

    if (!preferredStorage) {
        console.warn('Persistent storage not available, using in-memory fallback');
    }

    return {
        getItem: (key) => {
            try {
                if (preferredStorage) return preferredStorage.getItem(key);
                return inMemoryStorage[key] || null;
            } catch (e) {
                return inMemoryStorage[key] || null;
            }
        },
        setItem: (key, value) => {
            try {
                if (preferredStorage) preferredStorage.setItem(key, value);
                else inMemoryStorage[key] = value;
            } catch (e) {
                inMemoryStorage[key] = value;
            }
        },
        removeItem: (key) => {
            try {
                if (preferredStorage) preferredStorage.removeItem(key);
                delete inMemoryStorage[key];
            } catch (e) {
                delete inMemoryStorage[key];
            }
        }
    };
};

// Initialize Supabase Client with Robust Config
export const supabase = supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
            storage: createRobustStorage(),
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: true,
            storageKey: 'fap-nextgen-auth',
            flowType: 'pkce' // Vital for mobile stability
        }
    })
    : null;

// Check if Supabase is configured
export const isSupabaseConfigured = () => {
    return supabase !== null;
};

// Helper function to handle Supabase errors
export const handleSupabaseError = (error) => {
    console.error('Supabase error:', error);
    if (error.message) {
        return error.message;
    }
    return 'An error occurred with the database';
};

// Check if running on mobile or slow network
export const isMobileOrSlowNetwork = () => {
    if (typeof navigator === 'undefined') return false;
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    const isSlowNetwork = connection &&
        (connection.effectiveType === '2g' || connection.effectiveType === 'slow-2g' || connection.saveData);
    return isMobile || isSlowNetwork;
};

// Helper: Force session refresh
export const refreshSession = async () => {
    if (!supabase) return null;
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session) return null;
    const { data: { session: newSession }, error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError) {
        console.warn("Session refresh failed:", refreshError);
        return null;
    }
    return newSession;
};

export default supabase;
