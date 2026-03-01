import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../services/supabaseClient';
import { addToQueue } from '../services/offlineQueue';
import { get, set } from 'idb-keyval';

const CACHE_KEY_PREFIX = 'fap_families_cache_';
const NETWORK_TIMEOUT_MS = 12000;

const withTimeout = (promise, ms, label) => Promise.race([
    promise,
    new Promise((_, reject) => {
        setTimeout(() => reject(new Error(`${label}_timeout`)), ms);
    })
]);

const fetchFamilies = async (studentId) => {
    if (!studentId) return [];

    const cacheKey = `${CACHE_KEY_PREFIX}${studentId}`;
    const cachedData = await get(cacheKey);

    try {
        let { data, error } = await withTimeout(
            supabase
                .from('families')
                .select('*')
                .eq('student_id', studentId)
                .neq('is_deleted', true)
                .order('created_at', { ascending: false }),
            NETWORK_TIMEOUT_MS,
            'families_fetch'
        );

        // Backward-compatible fallback if is_deleted column is not yet deployed.
        if (error) {
            const fallback = await withTimeout(
                supabase
                    .from('families')
                    .select('*')
                    .eq('student_id', studentId)
                    .order('created_at', { ascending: false }),
                NETWORK_TIMEOUT_MS,
                'families_fetch_fallback'
            );
            data = fallback.data;
            error = fallback.error;
        }

        if (error) throw error;

        // Save to local cache for offline use
        if (data) {
            await set(cacheKey, data);
        }
        return data;
    } catch (error) {
        console.warn('[useFamilies] Fetch failed, trying cache:', error);
        // If fetch fails (offline), try to get from IndexedDB
        if (cachedData) {
            console.log('[useFamilies] Loading from local cache');
            return cachedData;
        }
        throw error;
    }
};

export const useFamilies = (studentId) => {
    const queryClient = useQueryClient();

    const query = useQuery({
        queryKey: ['families', studentId],
        queryFn: () => fetchFamilies(studentId),
        enabled: !!studentId, // Only fetch if studentId is present
    });

    const addFamilyMutation = useMutation({
        mutationFn: async (newFamilyData) => {
            // Offline Handling
            if (!navigator.onLine) {
                console.log('Offline: Queuing ADD_FAMILY action');
                const tempId = crypto.randomUUID();
                const offlinePayload = {
                    ...newFamilyData,
                    id: tempId,
                    created_at: new Date().toISOString(),
                    is_offline_sync: true,
                    synced_at: null
                };

                await addToQueue('ADD_FAMILY', offlinePayload);
                return offlinePayload;
            }

            // Online Handling
            const { data, error } = await supabase
                .from('families')
                .insert([newFamilyData])
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            // Invalidate and refetch families list
            queryClient.invalidateQueries({ queryKey: ['families', studentId] });
            // Also invalidate dashboard stats since family count changed
            queryClient.invalidateQueries({ queryKey: ['dashboardStats', studentId] });
        }
    });

    const updateFamilyMutation = useMutation({
        mutationFn: async ({ id, updates }) => {
            const { data, error } = await supabase
                .from('families')
                .update(updates)
                .eq('id', id)
                .select()
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['families', studentId] });
            queryClient.invalidateQueries({ queryKey: ['dashboardStats', studentId] });
        }
    });

    return {
        ...query,
        addFamily: addFamilyMutation.mutateAsync,
        updateFamily: updateFamilyMutation.mutateAsync,
        isAdding: addFamilyMutation.isPending,
        isUpdatingFamily: updateFamilyMutation.isPending
    };
};
