import { useMutation } from '@tanstack/react-query';
import { supabase } from '../services/supabaseClient';
import { addToQueue } from '../services/offlineQueue';
import { invalidateAnalyticsCache } from '../utils/cacheUtils';

const stripSyncFields = (obj = {}) => {
    const { is_offline_sync: _IS_OFFLINE_SYNC, synced_at: _SYNCED_AT, ...rest } = obj;
    return rest;
};

const isMissingSyncColumnError = (error) => {
    const msg = String(error?.message || '').toLowerCase();
    return msg.includes('column')
        && (msg.includes('is_offline_sync') || msg.includes('synced_at'));
};

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

            if (error && isMissingSyncColumnError(error)) {
                const fallback = await supabase
                    .from('family_members')
                    .insert([stripSyncFields(payload)])
                    .select()
                    .single();
                if (fallback.error) throw fallback.error;
                return fallback.data;
            }
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

    // --- Update Member Mutation ---
    const updateMemberMutation = useMutation({
        mutationFn: async ({ memberId, updates }) => {
            const isOffline = !navigator.onLine;
            const payload = {
                id: memberId,
                updates: {
                    ...updates,
                    is_offline_sync: isOffline,
                    synced_at: isOffline ? null : new Date().toISOString()
                }
            };

            if (isOffline) {
                await addToQueue('UPDATE_MEMBER', payload);
                return { id: memberId, ...payload.updates };
            }

            const { data, error } = await supabase
                .from('family_members')
                .update(payload.updates)
                .eq('id', memberId)
                .select()
                .single();

            if (error && isMissingSyncColumnError(error)) {
                const fallback = await supabase
                    .from('family_members')
                    .update(stripSyncFields(payload.updates))
                    .eq('id', memberId)
                    .select()
                    .single();
                if (fallback.error) throw fallback.error;
                return fallback.data;
            }
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            invalidateAnalyticsCache(studentId);
        }
    });

    // --- Archive Member Mutation (soft delete) ---
    const archiveMemberMutation = useMutation({
        mutationFn: async (memberId) => {
            const now = new Date().toISOString();
            const updates = {
                is_deleted: true,
                deleted_at: now,
                deleted_by: studentId,
                is_offline_sync: !navigator.onLine,
                synced_at: navigator.onLine ? now : null
            };

            const isOffline = !navigator.onLine;
            if (isOffline) {
                await addToQueue('ARCHIVE_MEMBER', { id: memberId, updates });
                return { id: memberId, ...updates };
            }

            const { data, error } = await supabase
                .from('family_members')
                .update(updates)
                .eq('id', memberId)
                .select()
                .single();

            if (error && isMissingSyncColumnError(error)) {
                const fallback = await supabase
                    .from('family_members')
                    .update(stripSyncFields(updates))
                    .eq('id', memberId)
                    .select()
                    .single();
                if (fallback.error) throw fallback.error;
                return fallback.data;
            }
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            invalidateAnalyticsCache(studentId);
        }
    });

    // --- Merge Members Mutation ---
    const mergeMembersMutation = useMutation({
        mutationFn: async ({ sourceMemberId, targetMemberId }) => {
            if (sourceMemberId === targetMemberId) {
                throw new Error('Source and target members cannot be same.');
            }

            const isOffline = !navigator.onLine;
            const payload = {
                sourceMemberId,
                targetMemberId,
                studentId
            };

            if (isOffline) {
                await addToQueue('MERGE_MEMBER', payload);
                return payload;
            }

            const { data: source, error: sourceError } = await supabase
                .from('family_members')
                .select('*')
                .eq('id', sourceMemberId)
                .single();
            if (sourceError) throw sourceError;

            const { data: target, error: targetError } = await supabase
                .from('family_members')
                .select('*')
                .eq('id', targetMemberId)
                .single();
            if (targetError) throw targetError;

            const sourceHealth = source.health_data || {};
            const targetHealth = target.health_data || {};

            const mergedHealth = {
                ...targetHealth,
                problems: [...(targetHealth.problems || []), ...(sourceHealth.problems || [])],
                interventions: [...(targetHealth.interventions || []), ...(sourceHealth.interventions || [])],
                assessments: [...(targetHealth.assessments || []), ...(sourceHealth.assessments || [])]
            };

            const { error: updateTargetError } = await supabase
                .from('family_members')
                .update({
                    health_data: mergedHealth,
                    is_offline_sync: false,
                    synced_at: new Date().toISOString()
                })
                .eq('id', targetMemberId);
            if (updateTargetError && isMissingSyncColumnError(updateTargetError)) {
                const fallbackTarget = await supabase
                    .from('family_members')
                    .update({
                        health_data: mergedHealth
                    })
                    .eq('id', targetMemberId);
                if (fallbackTarget.error) throw fallbackTarget.error;
            } else if (updateTargetError) {
                throw updateTargetError;
            }

            const { error: archiveSourceError } = await supabase
                .from('family_members')
                .update({
                    is_deleted: true,
                    deleted_at: new Date().toISOString(),
                    deleted_by: studentId,
                    merged_into_member_id: targetMemberId,
                    is_offline_sync: false,
                    synced_at: new Date().toISOString()
                })
                .eq('id', sourceMemberId);
            if (archiveSourceError && isMissingSyncColumnError(archiveSourceError)) {
                const fallbackSource = await supabase
                    .from('family_members')
                    .update({
                        is_deleted: true,
                        deleted_at: new Date().toISOString(),
                        deleted_by: studentId,
                        merged_into_member_id: targetMemberId
                    })
                    .eq('id', sourceMemberId);
                if (fallbackSource.error) throw fallbackSource.error;
            } else if (archiveSourceError) {
                throw archiveSourceError;
            }

            return payload;
        },
        onSuccess: () => {
            invalidateAnalyticsCache(studentId);
        }
    });

    return {
        addMember: addMemberMutation.mutateAsync,
        addVisit: addVisitMutation.mutateAsync,
        updateMember: updateMemberMutation.mutateAsync,
        archiveMember: archiveMemberMutation.mutateAsync,
        mergeMembers: mergeMembersMutation.mutateAsync,
        isAddingMember: addMemberMutation.isPending,
        isAddingVisit: addVisitMutation.isPending,
        isUpdatingMember: updateMemberMutation.isPending,
        isArchivingMember: archiveMemberMutation.isPending,
        isMergingMembers: mergeMembersMutation.isPending
    };
};
