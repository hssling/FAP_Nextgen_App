import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../services/supabaseClient';

/**
 * Hook to manage student competency progress
 */
export const useCompetencies = (studentId) => {
    const queryClient = useQueryClient();

    // Fetch progress
    const { data: progress = [], isLoading } = useQuery({
        queryKey: ['competencies', studentId],
        queryFn: async () => {
            if (!studentId) return [];
            const { data, error } = await supabase
                .from('student_competencies')
                .select('*')
                .eq('student_id', studentId);
            
            if (error) throw error;
            return data;
        },
        enabled: !!studentId
    });

    // Update progress mutation
    const updateCompetency = useMutation({
        mutationFn: async ({ code, status, evidenceType, evidenceId }) => {
            const { data, error } = await supabase
                .from('student_competencies')
                .upsert({
                    student_id: studentId,
                    competency_code: code,
                    status,
                    evidence_type: evidenceType,
                    evidence_id: evidenceId,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'student_id, competency_code' })
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['competencies', studentId]);
        }
    });

    return {
        progress,
        isLoading,
        updateCompetency: updateCompetency.mutateAsync,
        isUpdating: updateCompetency.isPending
    };
};
