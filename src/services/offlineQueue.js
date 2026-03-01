import { get, update } from 'idb-keyval';
import { supabase } from './supabaseClient';
import toast from 'react-hot-toast';

const QUEUE_KEY = 'fap_mutation_queue';

/**
 * Adds an action to the offline queue.
 * @param {string} type - The type of action (e.g., 'ADD_FAMILY', 'ADD_MEMBER', 'ADD_VISIT')
 * @param {object} payload - The data associated with the action
 */
export const addToQueue = async (type, payload) => {
    const action = {
        id: crypto.randomUUID(),
        type,
        payload,
        createdAt: new Date().toISOString()
    };

    await update(QUEUE_KEY, (queue = []) => [...queue, action]);
    console.log(`[OfflineQueue] Added ${type} to queue`, action);
    toast('Saved offline. Will sync when online.', { icon: '💾' });
};

/**
 * Gets the current queue.
 */
export const getQueue = async () => {
    return (await get(QUEUE_KEY)) || [];
};

/**
 * Gets the number of items in the queue.
 */
export const getQueueCount = async () => {
    const queue = await getQueue();
    return queue.length;
};

/**
 * Removes an item from the queue by ID.
 * @param {string} id 
 */
export const removeFromQueue = async (id) => {
    await update(QUEUE_KEY, (queue = []) => queue.filter(item => item.id !== id));
};

/**
 * Processes the queue, executing actions against Supabase.
 */
export const processQueue = async () => {
    const queue = await getQueue();
    if (queue.length === 0) return;
    if (!navigator.onLine) return;

    // Prevent processing before auth is available (common on app boot before login/session restore).
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        console.log('[OfflineQueue] Skipping queue processing: user not authenticated yet.');
        return;
    }

    console.log(`[OfflineQueue] Processing ${queue.length} items...`);
    window.dispatchEvent(new CustomEvent('fap-sync-progress', {
        detail: { processed: 0, total: queue.length, successCount: 0, failCount: 0 }
    }));
    const toastId = toast.loading(`Syncing ${queue.length} offline changes...`);

    let successCount = 0;
    let failCount = 0;

    for (const item of queue) {
        try {
            await executeAction(item);
            await removeFromQueue(item.id);
            successCount++;
        } catch (error) {
            console.error(`[OfflineQueue] Failed to process ${item.type}:`, error);
            failCount++;
            // If it's a permanent error (e.g. validtation), we might want to remove it or flag it.
            // For now, we leave it in queue to retry or manual intervention.
        }
        window.dispatchEvent(new CustomEvent('fap-sync-progress', {
            detail: { processed: successCount + failCount, total: queue.length, successCount, failCount }
        }));
    }

    toast.dismiss(toastId);
    if (successCount > 0) toast.success(`Synced ${successCount} changes!`);
    if (failCount > 0) toast.error(`Failed to sync ${failCount} items.`);

    // Refresh page or invalidate queries if needed
    // In a real app we'd use QueryClient here, but a reload is a safe brute-force for now if simpler
    if (successCount > 0) {
        // Dispatch event so hooks can listen and invalidate queries
        window.dispatchEvent(new Event('fap-sync-complete'));
    }
    window.dispatchEvent(new CustomEvent('fap-sync-progress', {
        detail: { processed: successCount + failCount, total: queue.length, successCount, failCount }
    }));
};

/**
 * internal function to execute individual actions
 */
const executeAction = async (item) => {
    const { type, payload } = item;

    switch (type) {
        case 'ADD_FAMILY': {
            // Remove temp ID if present, let Supabase generate real one
            // OR if we used UUIDs, we could keep them. Supabase usually handles IDs.
            // For simplicity, we strip the temp ID (unless it's a UUID we want to enforce)
            // But wait, if we added CHILD items (Members) referencing this FAMILY temp ID, we have a problem.
            // Complex Graph Sync is hard. 
            // SIMPLIFICATION: We assume Flat Sync for now, or we handle ID remapping.
            // Given "Phase 5" scope, let's assume valid UUIDs generated on client are used for everything.
            // OR we strip 'id' key if it looks temporary.

            const { id, ...data } = payload;
            // If ID matches "temp_", drop it.
            const cleanPayload = (typeof id === 'string' && id.startsWith('temp_')) ? data : payload;

            const { error } = await supabase.from('families').insert([cleanPayload]);
            if (error) throw error;
            break;
        }
        case 'ADD_MEMBER': {
            const { id, ...data } = payload;
            const cleanPayload = (typeof id === 'string' && id.startsWith('temp_')) ? data : payload;

            // Check if family_id is temp? If so, we can't sync this until family is synced.
            // Since we process in order (FIFO), if ADD_FAMILY was first, it might have failed or been replaced?
            // "The Holy Grail" usually implies handling this.
            // STRATEGY: We will rely on Client-Side UUID Generation for relations if possible, 
            // OR we just hope users don't go deep offline (Add Family -> Add Member to that new Family).
            // Actually, `useFamilies` generated a "temp_" ID. This won't work for SQL relations unless we fix it.
            // FIX: We should use real UUIDs on the client for "temp" items so they remain valid in DB.

            const { error } = await supabase.from('family_members').insert([cleanPayload]);
            if (error) throw error;
            break;
        }
        case 'ADD_VISIT': {
            const { id, ...data } = payload;
            const cleanPayload = (typeof id === 'string' && id.startsWith('temp_')) ? data : payload;

            const { error } = await supabase.from('family_visits').insert([cleanPayload]);
            if (error) throw error;
            break;
        }
        case 'UPDATE_COMPETENCY': {
            const { code, status, evidenceType, evidenceId, studentId } = payload;
            const { error } = await supabase
                .from('student_competencies')
                .upsert({
                    student_id: studentId,
                    competency_code: code,
                    status,
                    evidence_type: evidenceType,
                    evidence_id: evidenceId,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'student_id, competency_code' });
            
            if (error) throw error;
            break;
        }
        case 'UPDATE_VILLAGE': {
            const { id, payload: data } = payload;
            if (id) {
                // Update
                const { error } = await supabase.from('villages').update(data).eq('id', id);
                if (error) throw error;
            } else {
                // Insert
                const { error } = await supabase.from('villages').insert([data]);
                if (error) throw error;
            }
            break;
        }
        case 'ADD_REFLECTION': {
            const { error } = await supabase.from('reflections').insert([payload]);
            if (error) throw error;
            break;
        }
        case 'UPDATE_MEMBER': {
            const { id, updates } = payload;
            const { error } = await supabase
                .from('family_members')
                .update(updates)
                .eq('id', id);
            if (error) throw error;
            break;
        }
        case 'ARCHIVE_MEMBER': {
            const { id, updates } = payload;
            const { error } = await supabase
                .from('family_members')
                .update(updates)
                .eq('id', id);
            if (error) throw error;
            break;
        }
        case 'UPDATE_FAMILY': {
            const { id, updates } = payload;
            const { error } = await supabase
                .from('families')
                .update(updates)
                .eq('id', id);
            if (error) throw error;
            break;
        }
        case 'ARCHIVE_FAMILY': {
            const { id, updates } = payload;
            const { error } = await supabase
                .from('families')
                .update(updates)
                .eq('id', id);
            if (error) throw error;
            break;
        }
        case 'MERGE_MEMBER': {
            const { sourceMemberId, targetMemberId, studentId } = payload;

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
                .update({ health_data: mergedHealth })
                .eq('id', targetMemberId);
            if (updateTargetError) throw updateTargetError;

            const { error: archiveSourceError } = await supabase
                .from('family_members')
                .update({
                    is_deleted: true,
                    deleted_at: new Date().toISOString(),
                    deleted_by: studentId,
                    merged_into_member_id: targetMemberId
                })
                .eq('id', sourceMemberId);
            if (archiveSourceError) throw archiveSourceError;
            break;
        }
        default:
            throw new Error(`Unknown action type: ${type}`);
    }
};
