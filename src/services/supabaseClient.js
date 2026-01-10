import { createClient } from '@supabase/supabase-js';

// Get environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase credentials not found. Using IndexedDB fallback.');
}

/**
 * ROBUST Storage Adapter for Session Persistence
 * 
 * FIXES:
 * 1. Caches storage availability check (only checks once on init)
 * 2. Uses a stable storage reference to avoid re-checking on every call
 * 3. Falls back gracefully: localStorage → sessionStorage → in-memory
 * 
 * This fixes issues with:
 * - Private/Incognito browsing
 * - In-app mobile browsers (WebView) 
 * - PWA with aggressive cache clearing
 * - Safari on iOS with storage restrictions
 */
const createRobustStorage = () => {
    let inMemoryStorage = {};
    let preferredStorage = null;
    let storageChecked = false;

    const isStorageAvailable = (storage) => {
        try {
            const testKey = '__fap_storage_test__';
            storage.setItem(testKey, testKey);
            const retrieved = storage.getItem(testKey);
            storage.removeItem(testKey);
            return retrieved === testKey;
        } catch (e) {
            return false;
        }
    };

    const initStorage = () => {
        if (storageChecked) return;
        storageChecked = true;

        if (typeof window === 'undefined') {
            console.log('[Storage] No window - using in-memory');
            return;
        }

        if (isStorageAvailable(window.localStorage)) {
            preferredStorage = window.localStorage;
            console.log('[Storage] Using localStorage');
        } else if (isStorageAvailable(window.sessionStorage)) {
            preferredStorage = window.sessionStorage;
            console.log('[Storage] Using sessionStorage (localStorage unavailable)');
        } else {
            console.warn('[Storage] No persistent storage available, using in-memory fallback');
        }
    };

    // Initialize immediately
    initStorage();

    return {
        getItem: (key) => {
            try {
                if (preferredStorage) {
                    return preferredStorage.getItem(key);
                }
                return inMemoryStorage[key] || null;
            } catch (e) {
                console.warn('[Storage] getItem failed:', e.message);
                return inMemoryStorage[key] || null;
            }
        },
        setItem: (key, value) => {
            try {
                if (preferredStorage) {
                    preferredStorage.setItem(key, value);
                } else {
                    inMemoryStorage[key] = value;
                }
            } catch (e) {
                console.warn('[Storage] setItem failed, using in-memory:', e.message);
                inMemoryStorage[key] = value;
            }
        },
        removeItem: (key) => {
            try {
                if (preferredStorage) {
                    preferredStorage.removeItem(key);
                }
                delete inMemoryStorage[key];
            } catch (e) {
                console.warn('[Storage] removeItem failed:', e.message);
                delete inMemoryStorage[key];
            }
        }
    };
};

// Create the robust storage instance
const robustStorage = createRobustStorage();

// Create Supabase client with enhanced session persistence
export const supabase = supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: true,
            storage: robustStorage,
            storageKey: 'fap-nextgen-auth', // Explicit key for clarity
            flowType: 'pkce' // Most secure and reliable for mobile
        },
        global: {
            headers: {
                'x-application-name': 'FAP-NextGen'
            }
        },
        // Increase timeouts for mobile/slow networks
        db: {
            schema: 'public',
        },
        realtime: {
            params: {
                eventsPerSecond: 2
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

/**
 * Force refresh the session token
 * Call this when the app comes back to foreground or after network reconnection
 */
export const refreshSession = async () => {
    if (!supabase) return null;

    try {
        console.log('[Session] Attempting refresh...');
        const { data, error } = await supabase.auth.refreshSession();

        if (error) {
            console.error('[Session] Refresh failed:', error.message);
            return null;
        }

        console.log('[Session] Refresh successful');
        return data.session;
    } catch (e) {
        console.error('[Session] Refresh error:', e);
        return null;
    }
};

export default supabase;
