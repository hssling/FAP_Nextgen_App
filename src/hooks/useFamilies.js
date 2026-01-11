import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../services/supabaseClient';

const fetchFamilies = async (studentId) => {
    if (!studentId) return [];

    const { data, error } = await supabase
        .from('families')
        .select('*')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
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

    return {
        ...query,
        addFamily: addFamilyMutation.mutateAsync,
        isAdding: addFamilyMutation.isPending
    };
};
