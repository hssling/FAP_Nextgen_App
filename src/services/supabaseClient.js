import { createClient } from '@supabase/supabase-js';

// Get environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase credentials not found. Using IndexedDB fallback.');
}

// Create Supabase client
export const supabase = supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: false, // Disable this to prevent potential hangs
            storage: window.localStorage, // Explicitly use localStorage
            storageKey: 'fap-auth-token', // Custom storage key
            flowType: 'pkce' // More secure auth flow
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

export default supabase;
