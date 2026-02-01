import { useQuery } from '@tanstack/react-query';
import { supabase } from '../services/supabaseClient';

// Refined fetch function
const fetchOptimizedStats = async (studentId) => {
    if (!studentId) return null;

    // 1. Fetch Families
    const { data: families, error: famError } = await supabase
        .from('families')
        .select('id, head_name, created_at, village')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false });

    if (famError) throw famError;

    let membersCount = 0;
    let problemsCount = 0;

    // 2. Fetch Members only if there are families
    if (families.length > 0) {
        const familyIds = families.map(f => f.id);

        // Use .in() filter
        const { data: members, error: memError } = await supabase
            .from('family_members')
            .select('health_data')
            .in('family_id', familyIds);

        if (!memError && members) {
            membersCount = members.length;
            members.forEach(m => {
                if (m.health_data && m.health_data.problems) {
                    problemsCount += m.health_data.problems.length;
                }
            });
        }
    }

    return {
        families: families.length,
        members: membersCount,
        activeProblems: problemsCount,
        recentActivity: families.slice(0, 3).map(f => ({
            title: `Family Added: ${f.head_name}`,
            date: f.created_at ? new Date(f.created_at).toLocaleDateString() : 'Recently'
        }))
    };
};

export const useDashboardStats = (studentId) => {
    return useQuery({
        queryKey: ['dashboardStats', studentId],
        queryFn: () => fetchOptimizedStats(studentId),
        enabled: !!studentId,
        staleTime: 1000 * 60 * 5, // Stats don't change that often, 5m stale time is good
    });
};
