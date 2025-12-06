import { supabase, isSupabaseConfigured, handleSupabaseError } from './supabaseClient';
import * as localDb from './db'; // Fallback to IndexedDB

// Helper to get current user ID
const getCurrentUserId = async () => {
    if (!supabase) return null;
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id;
};

// ==================== FAMILIES ====================

export const getFamilies = async () => {
    if (!isSupabaseConfigured()) {
        return localDb.getFamilies();
    }

    try {
        const userId = await getCurrentUserId();
        if (!userId) throw new Error('Not authenticated');

        const { data, error } = await supabase
            .from('families')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error fetching families:', handleSupabaseError(error));
        return [];
    }
};

export const getFamily = async (id) => {
    if (!isSupabaseConfigured()) {
        return localDb.getFamily(id);
    }

    try {
        const { data, error } = await supabase
            .from('families')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error fetching family:', handleSupabaseError(error));
        return null;
    }
};

export const addFamily = async (family) => {
    if (!isSupabaseConfigured()) {
        return localDb.addFamily(family);
    }

    try {
        const userId = await getCurrentUserId();
        if (!userId) throw new Error('Not authenticated');

        const { data, error } = await supabase
            .from('families')
            .insert([{ ...family, user_id: userId }])
            .select()
            .single();

        if (error) throw error;
        return data.id;
    } catch (error) {
        console.error('Error adding family:', handleSupabaseError(error));
        throw error;
    }
};

export const updateFamily = async (family) => {
    if (!isSupabaseConfigured()) {
        return localDb.updateFamily(family);
    }

    try {
        const { error } = await supabase
            .from('families')
            .update(family)
            .eq('id', family.id);

        if (error) throw error;
        return family.id;
    } catch (error) {
        console.error('Error updating family:', handleSupabaseError(error));
        throw error;
    }
};

// ==================== MEMBERS ====================

export const getMembers = async (familyId) => {
    if (!isSupabaseConfigured()) {
        return localDb.getMembers(familyId);
    }

    try {
        const { data, error } = await supabase
            .from('members')
            .select('*')
            .eq('family_id', familyId)
            .order('created_at', { ascending: true });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error fetching members:', handleSupabaseError(error));
        return [];
    }
};

export const getAllMembers = async () => {
    if (!isSupabaseConfigured()) {
        return localDb.getAllMembers();
    }

    try {
        const userId = await getCurrentUserId();
        if (!userId) throw new Error('Not authenticated');

        const { data, error } = await supabase
            .from('members')
            .select('*')
            .eq('user_id', userId);

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error fetching all members:', handleSupabaseError(error));
        return [];
    }
};

export const getMember = async (id) => {
    if (!isSupabaseConfigured()) {
        // IndexedDB version doesn't have getMember, so we'll get all and filter
        const members = await localDb.getAllMembers();
        return members.find(m => m.id === parseInt(id));
    }

    try {
        const { data, error } = await supabase
            .from('members')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error fetching member:', handleSupabaseError(error));
        return null;
    }
};

export const addMember = async (member) => {
    if (!isSupabaseConfigured()) {
        return localDb.addMember(member);
    }

    try {
        const userId = await getCurrentUserId();
        if (!userId) throw new Error('Not authenticated');

        const { data, error } = await supabase
            .from('members')
            .insert([{ ...member, user_id: userId }])
            .select()
            .single();

        if (error) throw error;
        return data.id;
    } catch (error) {
        console.error('Error adding member:', handleSupabaseError(error));
        throw error;
    }
};

export const updateMember = async (member) => {
    if (!isSupabaseConfigured()) {
        return localDb.updateMember(member);
    }

    try {
        const { error } = await supabase
            .from('members')
            .update(member)
            .eq('id', member.id);

        if (error) throw error;
        return member.id;
    } catch (error) {
        console.error('Error updating member:', handleSupabaseError(error));
        throw error;
    }
};

// ==================== VILLAGES ====================

export const getVillages = async () => {
    if (!isSupabaseConfigured()) {
        return localDb.getVillages();
    }

    try {
        const userId = await getCurrentUserId();
        if (!userId) throw new Error('Not authenticated');

        const { data, error } = await supabase
            .from('villages')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Transform profile_data JSONB to match IndexedDB structure
        return (data || []).map(v => ({
            id: v.id,
            ...v.profile_data,
            village_name: v.village_name,
            updatedAt: v.updated_at
        }));
    } catch (error) {
        console.error('Error fetching villages:', handleSupabaseError(error));
        return [];
    }
};

export const addVillage = async (village) => {
    if (!isSupabaseConfigured()) {
        return localDb.addVillage(village);
    }

    try {
        const userId = await getCurrentUserId();
        if (!userId) throw new Error('Not authenticated');

        const { village_name, ...profile_data } = village;

        const { data, error } = await supabase
            .from('villages')
            .insert([{
                user_id: userId,
                village_name,
                profile_data
            }])
            .select()
            .single();

        if (error) throw error;
        return data.id;
    } catch (error) {
        console.error('Error adding village:', handleSupabaseError(error));
        throw error;
    }
};

export const updateVillage = async (village) => {
    if (!isSupabaseConfigured()) {
        return localDb.updateVillage(village);
    }

    try {
        const { id, village_name, ...profile_data } = village;

        const { error } = await supabase
            .from('villages')
            .update({
                village_name,
                profile_data
            })
            .eq('id', id);

        if (error) throw error;
        return id;
    } catch (error) {
        console.error('Error updating village:', handleSupabaseError(error));
        throw error;
    }
};

// ==================== REFLECTIONS ====================

export const getReflections = async () => {
    if (!isSupabaseConfigured()) {
        return localDb.getReflections();
    }

    try {
        const userId = await getCurrentUserId();
        if (!userId) throw new Error('Not authenticated');

        const { data, error } = await supabase
            .from('reflections')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Transform to match IndexedDB structure
        return (data || []).map(r => ({
            ...r,
            createdAt: r.created_at
        }));
    } catch (error) {
        console.error('Error fetching reflections:', handleSupabaseError(error));
        return [];
    }
};

export const addReflection = async (reflection) => {
    if (!isSupabaseConfigured()) {
        return localDb.addReflection(reflection);
    }

    try {
        const userId = await getCurrentUserId();
        if (!userId) throw new Error('Not authenticated');

        const { data, error } = await supabase
            .from('reflections')
            .insert([{ ...reflection, user_id: userId }])
            .select()
            .single();

        if (error) throw error;
        return data.id;
    } catch (error) {
        console.error('Error adding reflection:', handleSupabaseError(error));
        throw error;
    }
};

// ==================== VISITS ====================

export const getVisits = async (familyId) => {
    if (!isSupabaseConfigured()) {
        // IndexedDB doesn't have getVisits, return empty for now
        return [];
    }

    try {
        const { data, error } = await supabase
            .from('visits')
            .select('*')
            .eq('family_id', familyId)
            .order('visit_date', { ascending: false });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error fetching visits:', handleSupabaseError(error));
        return [];
    }
};

export const addVisit = async (visit) => {
    if (!isSupabaseConfigured()) {
        // IndexedDB doesn't have addVisit, skip for now
        return null;
    }

    try {
        const userId = await getCurrentUserId();
        if (!userId) throw new Error('Not authenticated');

        const { data, error } = await supabase
            .from('visits')
            .insert([{ ...visit, user_id: userId }])
            .select()
            .single();

        if (error) throw error;
        return data.id;
    } catch (error) {
        console.error('Error adding visit:', handleSupabaseError(error));
        throw error;
    }
};

// ==================== INITIALIZATION ====================

export const initDB = async () => {
    if (!isSupabaseConfigured()) {
        return localDb.initDB();
    }

    // Supabase doesn't need initialization
    return Promise.resolve();
};

// Export all functions
export default {
    initDB,
    getFamilies,
    getFamily,
    addFamily,
    updateFamily,
    getMembers,
    getAllMembers,
    getMember,
    addMember,
    updateMember,
    getVillages,
    addVillage,
    updateVillage,
    getReflections,
    addReflection,
    getVisits,
    addVisit
};
