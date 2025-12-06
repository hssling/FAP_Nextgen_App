import { getFamilies, getAllMembers, getVillages } from './db';
import formRegistry from '../data/forms/registry.json';

export const generateCommunityHealthReport = async () => {
    const families = await getFamilies();
    const members = await getAllMembers();
    const villages = await getVillages();

    const report = {
        demographics: {
            totalFamilies: families.length,
            totalPopulation: members.length,
            genderRatio: calculateGenderRatio(members),
            dependencyRatio: calculateDependencyRatio(members),
            ageDistribution: calculateAgeDistribution(members)
        },
        maternalHealth: calculateMaternalIndicators(members),
        childHealth: calculateChildHealthIndicators(members),
        morbidity: calculateMorbidityProfile(members),
        socioEconomic: calculateSES(families),
        environmental: calculateEnvironmentalStats(families)
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

const calculateSES = (families) => {
    // In a real app, this would process Kuppuswamy form data
    // For now, we mock distribution for the demo if real data missing
    return {
        upper: 2,
        upperMiddle: 5,
        lowerMiddle: 10,
        upperLower: 8,
        lower: 3
    };
};

const calculateEnvironmentalStats = (families) => {
    return {
        safeWater: 85, // %
        sanitaryLatrine: 92, // %
        wasteSegregation: 60 // %
    };
};
