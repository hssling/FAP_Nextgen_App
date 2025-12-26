import { supabase } from './supabaseClient';
import formRegistry from '../data/forms/registry.json';

export const generateCommunityHealthReport = async (studentId) => {
    let families = [];
    let members = [];
    let visits = [];

    try {
        // Fetch Families
        const { data: famData, error: famError } = await supabase
            .from('families')
            .select('*')
            .eq('student_id', studentId);

        if (famError) throw famError;
        families = famData || [];

        // Fetch Members and Visits if families exist
        if (families.length > 0) {
            const familyIds = families.map(f => f.id);

            const { data: memData } = await supabase.from('family_members').select('*').in('family_id', familyIds);
            members = memData || [];

            const { data: visData } = await supabase.from('family_visits').select('*').in('family_id', familyIds);
            visits = visData || [];
        }
    } catch (error) {
        console.error("Analytics Error:", error);
    }

    // Process Members to attach 'assessments' from visits (virtual join for backwards compatibility)
    // Actually, we pass 'visits' to new calculators, but old calculators (maternal/child) used 'member.assessments'.
    // We should map visits to member.assessments for compatibility OR update those functions.
    // Updating functions is cleaner but 'calculateMaternalIndicators' iterates members.
    // Let's attach assessments to members temporarily.

    const membersWithAssessments = members.map(m => {
        const memberVisits = visits.filter(v => v.data?.member_id === m.id);
        const assessments = memberVisits.map(v => ({
            formId: v.data.protocol,
            data: v.data,
            date: v.visit_date
        }));

        // Normalize health_data for legacy calculators
        const health = m.health_data || {};

        return {
            ...m,
            assessments,
            problems: health.problems || [],
            interventions: health.interventions || []
        };
    });

    // Fetch Reflections Count
    const { count: refCount } = await supabase
        .from('reflections')
        .select('*', { count: 'exact', head: true })
        .eq('student_id', studentId);

    const report = {
        demographics: {
            totalFamilies: families.length,
            totalPopulation: members.length,
            genderRatio: calculateGenderRatio(members),
            dependencyRatio: calculateDependencyRatio(members),
            ageDistribution: calculateAgeDistribution(members)
        },
        maternalHealth: calculateMaternalIndicators(membersWithAssessments),
        childHealth: calculateChildHealthIndicators(membersWithAssessments),
        morbidity: calculateMorbidityProfile(membersWithAssessments),
        socioEconomic: calculateSES(families, visits),
        environmental: calculateEnvironmentalStats(families, visits),
        logbook: {
            visits: visits.length,
            reflections: refCount || 0
        }
    };

    return report;
};

const calculateGenderRatio = (members) => {
    let m = 0, f = 0;
    members.forEach(p => {
        if (p.gender === 'Male') m++;
        if (p.gender === 'Female') f++;
    });
    return { male: m, female: f, ratio: f > 0 ? ((f / m) * 1000).toFixed(0) : 0 };
};

const calculateAgeDistribution = (members) => {
    const dist = { '0-5': 0, '6-18': 0, '19-60': 0, '60+': 0 };
    members.forEach(p => {
        const age = parseInt(p.age);
        if (age <= 5) dist['0-5']++;
        else if (age <= 18) dist['6-18']++;
        else if (age <= 60) dist['19-60']++;
        else dist['60+']++;
    });
    return dist;
};

const calculateDependencyRatio = (members) => {
    const pop = calculateAgeDistribution(members);
    const dependent = pop['0-5'] + pop['6-18'] + pop['60+'];
    const working = pop['19-60'];
    return working > 0 ? ((dependent / working) * 100).toFixed(1) : 0;
};

const calculateMaternalIndicators = (members) => {
    // Logic: Look for 'antenatal_care_v1' forms in member's assessments
    let totalANC = 0;
    let highRisk = 0;
    let registered = 0;

    members.forEach(m => {
        const ancForms = m.assessments?.filter(a => a.formId === 'antenatal_care_v1');
        if (ancForms && ancForms.length > 0) {
            registered++;
            // Check latest form for data
            const latest = ancForms[ancForms.length - 1].data;
            if (latest.risk_signs && latest.risk_signs.length > 2) highRisk++; // Simple heuristic
            if (latest.anc_visits) totalANC += parseInt(latest.anc_visits);
        }
    });

    return {
        registeredPregnancies: registered,
        highRiskPregnancies: highRisk,
        avgVisits: registered > 0 ? (totalANC / registered).toFixed(1) : 0
    };
};

const calculateChildHealthIndicators = (members) => {
    // Logic: Look for 'under_5_assessment_v1'
    let totalU5 = 0;
    let immunized = 0;
    let malnutrition = 0;

    members.forEach(m => {
        if (parseInt(m.age) <= 5) {
            totalU5++;
            const u5form = m.assessments?.find(a => a.formId === 'under_5_assessment_v1');
            if (u5form) {
                if (u5form.data.immunization_status === 'Up-to-date') immunized++;
                if (u5form.data.weight_tracking !== 'Green (Normal)') malnutrition++;
            }
        }
    });

    return {
        totalUnder5: totalU5,
        fullyImmunized: immunized,
        malnutritionCases: malnutrition
    };
};

const calculateMorbidityProfile = (members) => {
    const diseases = {};
    members.forEach(m => {
        // From Problem List
        if (m.problems) {
            m.problems.forEach(p => {
                const lower = p.title.toLowerCase();
                let category = 'Other';
                if (lower.includes('diabetes') || lower.includes('sugar')) category = 'Diabetes';
                else if (lower.includes('bp') || lower.includes('hyper')) category = 'Hypertension';
                else if (lower.includes('copd') || lower.includes('asthma')) category = 'Respiratory';
                else if (lower.includes('anemia')) category = 'Anemia';

                diseases[category] = (diseases[category] || 0) + 1;
            });
        }

        // From NCD Screening Forms
        const ncdForm = m.assessments?.find(a => a.formId === 'ncd_screening_v1');
        if (ncdForm) {
            if (ncdForm.data.bp_systolic > 140) diseases['Hypertension (Screened)'] = (diseases['Hypertension (Screened)'] || 0) + 1;
            if (ncdForm.data.rbs > 200) diseases['Diabetes (Screened)'] = (diseases['Diabetes (Screened)'] || 0) + 1;
        }
    });
    return diseases;
};

const calculateSES = (families, visits) => {
    const classes = { upper: 0, upperMiddle: 0, lowerMiddle: 0, upperLower: 0, lower: 0 };

    families.forEach(f => {
        // Find latest SES visit for this family
        const famVisits = visits.filter(v => v.family_id === f.id && v.data?.protocol === 'socio_economic_v1');
        if (famVisits.length > 0) {
            // Sort by date desc
            famVisits.sort((a, b) => new Date(b.visit_date) - new Date(a.visit_date));
            const latest = famVisits[0].data;
            const income = parseFloat(latest.monthly_income || 0);

            // Simple Kuppuswamy Logic (Income based approx for 2024)
            if (income > 80000) classes.upper++;
            else if (income > 40000) classes.upperMiddle++;
            else if (income > 25000) classes.lowerMiddle++;
            else if (income > 10000) classes.upperLower++;
            else classes.lower++;
        }
    });
    return classes;
};

const calculateEnvironmentalStats = (families, visits) => {
    let total = 0;
    let safeWater = 0;
    let sanitaryLatrine = 0;
    let wasteSegregation = 0;

    families.forEach(f => {
        const famVisits = visits.filter(v => v.family_id === f.id && v.data?.protocol === 'environment_sanitation_v1');
        if (famVisits.length > 0) {
            total++;
            famVisits.sort((a, b) => new Date(b.visit_date) - new Date(a.visit_date));
            const data = famVisits[0].data;

            if (['Piped Water', 'RO System'].includes(data.water_source)) safeWater++;
            if (data.latrine_available === 'Yes') sanitaryLatrine++;
            if (data.waste_disposal === 'Segregated') wasteSegregation++;
        }
    });

    return {
        safeWater: total > 0 ? ((safeWater / total) * 100).toFixed(0) : 0,
        sanitaryLatrine: total > 0 ? ((sanitaryLatrine / total) * 100).toFixed(0) : 0,
        wasteSegregation: total > 0 ? ((wasteSegregation / total) * 100).toFixed(0) : 0
    };
};
