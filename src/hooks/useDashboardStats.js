import { useQuery } from '@tanstack/react-query';
import { supabase } from '../services/supabaseClient';

const fetchDashboardStats = async (studentId) => {
    if (!studentId) return null;

    // Run queries in parallel for better performance
    const [familiesResult, membersResult] = await Promise.all([
        // 1. Get Families (ordered by date for "Recent Activity")
        supabase
            .from('families')
            .select('id, head_name, created_at, village')
            .eq('student_id', studentId)
            .order('created_at', { ascending: false }),

        // 2. Get All Members (optimized: only select health_data)
        // Note: For large datasets, we should use .count() or a database function,
        // but for <100 families, fetching this light payload is fine.
        supabase
            .from('family_members')
            .select('family_id, health_data')
        // No easy way to filter by student_id directly on members without a join,
        // so we fetch all members for this student's families
        // Optimization: Just get all members linked to families owned by this student
        // WE NEED TO DO A JOIN OR TWO-STEP. 
        // In the original code, it fetched families first, then members WHERE family_id IN IDs.
        // Let's replicate that efficiently.
    ]);
};

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
