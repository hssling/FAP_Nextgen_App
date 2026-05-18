import { useQuery } from '@tanstack/react-query';
import { supabase } from '../services/supabaseClient';

// Refined fetch function
const fetchOptimizedStats = async (studentId) => {
    if (!studentId) return null;

    // 1. Fetch Families
    let { data: families, error: famError } = await supabase
        .from('families')
        .select('id, head_name, created_at, village, is_deleted')
        .eq('student_id', studentId)
        .neq('is_deleted', true)
        .order('created_at', { ascending: false });

    if (famError) {
        const fallback = await supabase
            .from('families')
            .select('id, head_name, created_at, village')
            .eq('student_id', studentId)
            .order('created_at', { ascending: false });
        families = fallback.data;
        famError = fallback.error;
    }

    if (famError) throw famError;

    let membersCount = 0;
    let problemsCount = 0;
    let assessmentsCount = 0;

    // 2. Fetch Members only if there are families
    if (families.length > 0) {
        const familyIds = families.map(f => f.id);

        // Use .in() filter
        let { data: members, error: memError } = await supabase
            .from('family_members')
            .select('id, health_data, is_deleted')
            .in('family_id', familyIds)
            .neq('is_deleted', true);

        if (memError) {
            const fallback = await supabase
                .from('family_members')
                .select('id, health_data')
                .in('family_id', familyIds);
            members = fallback.data;
            memError = fallback.error;
        }

        if (!memError && members) {
            membersCount = members.length;
            const memberIds = members.map((m) => m.id).filter(Boolean);
            members.forEach(m => {
                if (m.health_data && m.health_data.problems) {
                    problemsCount += m.health_data.problems.length;
                }
            });

            if (memberIds.length > 0) {
                const { data: normalizedRows, error: assessError } = await supabase
                    .from('individual_assessments')
                    .select('member_id, form_id, assessment_date, legacy_assessment_id')
                    .in('member_id', memberIds)
                    .eq('is_deleted', false);

                if (!assessError) {
                    const normalizedKeys = new Set(
                        (normalizedRows || []).map((a) => `${a.member_id}|${a.form_id}|${a.assessment_date}|${a.legacy_assessment_id || ''}`)
                    );
                    assessmentsCount = normalizedRows?.length || 0;
                    members.forEach((m) => {
                        (m.health_data?.assessments || []).forEach((a) => {
                            const key = `${m.id}|${a.formId || 'unknown'}|${a.date || ''}|${a.id ? String(a.id) : ''}`;
                            if (!normalizedKeys.has(key)) assessmentsCount++;
                        });
                    });
                } else {
                    members.forEach((m) => {
                        assessmentsCount += m.health_data?.assessments?.length || 0;
                    });
                }
            }
        }
    }

    return {
        families: families.length,
        members: membersCount,
        activeProblems: problemsCount,
        assessments: assessmentsCount,
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
