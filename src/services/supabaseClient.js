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

    const isStorageAvailable = (storage) => {
        try {
            const testKey = '__fap_storage_test__';
            storage.setItem(testKey, testKey);
            storage.removeItem(testKey);
            return true;
        } catch (e) {
            console.warn('Storage not available:', e.message);
            return false;
        }
    };

    const getPreferredStorage = () => {
        if (typeof window === 'undefined') return null;
        if (isStorageAvailable(window.localStorage)) return window.localStorage;
        if (isStorageAvailable(window.sessionStorage)) return window.sessionStorage;
        console.warn('No persistent storage available, using in-memory fallback');
        return null;
    };

    return {
        getItem: (key) => {
            try {
                const storage = getPreferredStorage();
                if (storage) return storage.getItem(key);
                return inMemoryStorage[key] || null;
            } catch (e) {
                console.warn('Storage getItem failed:', e);
                return inMemoryStorage[key] || null;
            }
        },
        setItem: (key, value) => {
            try {
                const storage = getPreferredStorage();
                if (storage) {
                    storage.setItem(key, value);
                } else {
                    inMemoryStorage[key] = value;
                }
            } catch (e) {
                console.warn('Storage setItem failed, using in-memory:', e);
                inMemoryStorage[key] = value;
            }
        },
        removeItem: (key) => {
            try {
                const storage = getPreferredStorage();
                if (storage) storage.removeItem(key);
                delete inMemoryStorage[key];
            } catch (e) {
                console.warn('Storage removeItem failed:', e);
                delete inMemoryStorage[key];
            }
        }
    };
};

// Create the robust storage instance
const robustStorage = createRobustStorage();

// Create Supabase client with enhanced mobile support
export const supabase = supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: true,
            storage: robustStorage,           // Custom storage for mobile reliability
            storageKey: 'fap-auth-session',   // Consistent key across app
            flowType: 'pkce'                  // More secure for mobile/PWA
        },
        global: {
            headers: {
                'x-application-name': 'FAP-NextGen'
            }
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

export default supabase;
