import { useMutation } from '@tanstack/react-query';
import { supabase } from '../services/supabaseClient';
import { addToQueue } from '../services/offlineQueue';
import { invalidateAnalyticsCache } from '../utils/cacheUtils';

export const useFamilyActions = (familyId, studentId) => {
    // Mutation action hooks

    // --- Add Member Mutation ---
    const addMemberMutation = useMutation({
        mutationFn: async (memberData) => {
            const isOffline = !navigator.onLine;
            const payload = { 
                ...memberData, 
                family_id: familyId,
                is_offline_sync: isOffline,
                synced_at: isOffline ? null : new Date().toISOString()
            };

            if (isOffline) {
                const tempId = crypto.randomUUID();
                const offlinePayload = { ...payload, id: tempId, created_at: new Date().toISOString() };
                await addToQueue('ADD_MEMBER', offlinePayload);
                return offlinePayload;
            }

            const { data, error } = await supabase
                .from('family_members')
                .insert([payload])
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            invalidateAnalyticsCache(studentId);
        }
    });

    // --- Add Visit Mutation ---
    const addVisitMutation = useMutation({
        mutationFn: async (visitData) => {
            const isOffline = !navigator.onLine;
            const payload = { 
                ...visitData, 
                family_id: familyId,
                is_offline_sync: isOffline,
                synced_at: isOffline ? null : new Date().toISOString()
            };

            if (isOffline) {
                const tempId = crypto.randomUUID();
                const offlinePayload = { ...payload, id: tempId, created_at: new Date().toISOString() };
                await addToQueue('ADD_VISIT', offlinePayload);
                return offlinePayload;
            }

            const { data, error } = await supabase
                .from('family_visits')
                .insert([payload])
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
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
