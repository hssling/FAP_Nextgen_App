import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../services/supabaseClient';
import { addToQueue } from '../services/offlineQueue';
import { invalidateAnalyticsCache } from '../utils/cacheUtils';

export const useFamilyActions = (familyId, studentId) => {
    const queryClient = useQueryClient();

    // --- Add Member Mutation ---
    const addMemberMutation = useMutation({
        mutationFn: async (memberData) => {
            if (!navigator.onLine) {
                const tempId = crypto.randomUUID();
                const payload = { ...memberData, id: tempId, family_id: familyId, created_at: new Date().toISOString() };
                await addToQueue('ADD_MEMBER', payload);
                return payload;
            }

            const { data, error } = await supabase
                .from('family_members')
                .insert([{ ...memberData, family_id: familyId }])
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['family_members', familyId] }); // Ensure FamilyDetails uses this key?
            // Actually FamilyDetails might fetch manually in useEffect. 
            // Phase 5 Refactor: Ideally FamilyDetails calls invalidateQueries using the same keys if it used hooks.
            // Since FamilyDetails uses MANUAL fetch, we need to trigger a re-fetch manually or force reload.
            // However, React Query's cache won't help the manual fetch. 
            // FIX: We rely on the component reloading data when it sees a mutation success, OR we switch it to useQuery.
            // For now, let's keep it simple: the Hook returns the promise, the Component awaits it, then Component updates its local state.

            invalidateAnalyticsCache(studentId);
        }
    });

    // --- Add Visit Mutation ---
    const addVisitMutation = useMutation({
        mutationFn: async (visitData) => {
            if (!navigator.onLine) {
                const tempId = crypto.randomUUID();
                const payload = { ...visitData, id: tempId, family_id: familyId, created_at: new Date().toISOString() };
                await addToQueue('ADD_VISIT', payload);
                return payload;
            }

            const { data, error } = await supabase
                .from('family_visits')
                .insert([{ ...visitData, family_id: familyId }])
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            // Note: Same issue with cache keys if not using useQuery.
            invalidateAnalyticsCache(studentId);
        }
    });

    return {
        addMember: addMemberMutation.mutateAsync,
        addVisit: addVisitMutation.mutateAsync,
        isAddingMember: addMemberMutation.isPending,
        isAddingVisit: addVisitMutation.isPending
    };
};
