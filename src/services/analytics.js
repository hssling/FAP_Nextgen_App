import { supabase } from './supabaseClient';

export const generateCommunityHealthReport = async (studentId) => {
    let families = [];
    let members = [];
    let visits = [];
    let reflections = [];
    let normalizedAssessments = [];

    try {
        // Fetch Families with all details
        const { data: famData, error: famError } = await supabase
            .from('families')
            .select('*')
            .eq('student_id', studentId);

        if (famError) throw famError;
        families = famData || [];

        // Fetch Members and Visits if families exist
        if (families.length > 0) {
            const familyIds = families.map(f => f.id);

            const { data: memData } = await supabase
                .from('family_members')
                .select('*')
                .in('family_id', familyIds);
            members = memData || [];

            const { data: visData } = await supabase
                .from('family_visits')
                .select('*')
                .in('family_id', familyIds)
                .order('visit_date', { ascending: false });
            visits = visData || [];

            const memberIds = (memData || []).map(m => m.id);
            if (memberIds.length > 0) {
                const { data: normalizedData, error: normalizedError } = await supabase
                    .from('individual_assessments')
                    .select('id, member_id, form_id, assessment_date, payload, calculated_fields, legacy_assessment_id, visit_id')
                    .in('member_id', memberIds)
                    .eq('is_deleted', false)
                    .order('assessment_date', { ascending: false });

                if (!normalizedError) {
                    normalizedAssessments = normalizedData || [];
                } else {
                    console.warn('[Analytics] individual_assessments not available, falling back to health_data only:', normalizedError.message);
                }
            }
        }

        // Fetch ALL Reflections with feedback
        const { data: refData } = await supabase
            .from('reflections')
            .select('*')
            .eq('student_id', studentId)
            .order('created_at', { ascending: false });
        reflections = refData || [];

    } catch (error) {
        console.error("Analytics Error:", error);
    }

    console.log('[Analytics] Raw data fetched:', {
        families: families.length,
        members: members.length,
        visits: visits.length,
        reflections: reflections.length,
        sampleVisit: visits[0],
        sampleMember: members[0] ? { id: members[0].id, name: members[0].name, hasHealthData: !!members[0].health_data } : null
    });

    // Process Members: Combine health_data.assessments with visits for complete picture
    const membersWithAssessments = members.map(m => {
        const dbAssessments = normalizedAssessments
            .filter(a => a.member_id === m.id)
            .map(a => ({
                id: a.id,
                formId: a.form_id,
                date: a.assessment_date,
                data: a.payload || {},
                calculated_fields: a.calculated_fields || null,
                legacyId: a.legacy_assessment_id || null,
                visitId: a.visit_id || null,
                source: 'normalized'
            }));

        // Get assessments from health_data (new format)
        const healthAssessments = m.health_data?.assessments || [];
        const dbKeys = new Set(dbAssessments.map(a => `${a.formId}|${a.date}|${a.legacyId || ''}`));
        const dedupedHealthAssessments = healthAssessments
            .filter(a => !dbKeys.has(`${a.formId}|${a.date}|${a.id ? String(a.id) : ''}`))
            .map(a => ({ ...a, source: 'health_data' }));
        
        // Get assessments from visits (legacy format)
        const memberVisits = visits.filter(v => v.data?.member_id === m.id);
        const visitAssessments = memberVisits.map(v => ({
            formId: v.data.protocol,
            data: v.data,
            date: v.visit_date,
            source: 'visit'
        }));

        // Combine both sources
        const allAssessments = [
            ...dbAssessments,
            ...dedupedHealthAssessments,
            ...visitAssessments
        ].sort((a, b) => new Date(b.date) - new Date(a.date));

        const health = m.health_data || {};

        return {
            ...m,
            assessments: allAssessments,
            problems: health.problems || [],
            interventions: health.interventions || []
        };
    });

    // Calculate all metrics
    const assessmentIndex = new Map();
    const visitAssessmentIndex = new Map();
    normalizedAssessments.forEach((a) => {
        const key = `${a.member_id}|${a.assessment_date}`;
        assessmentIndex.set(key, (assessmentIndex.get(key) || 0) + 1);
        if (a.visit_id) {
            visitAssessmentIndex.set(a.visit_id, (visitAssessmentIndex.get(a.visit_id) || 0) + 1);
        }
    });

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
        
        // Enhanced logbook data
        logbook: {
            visits: visits.length,
            reflections: reflections.length,
            
            // Detailed visit log
            visitLog: visits.slice(0, 50).map(v => {
                const family = families.find(f => f.id === v.family_id);
                const member = members.find(m => m.id === v.data?.member_id);
                return {
                    id: v.id,
                    date: v.visit_date,
                    familyName: family?.head_name || 'Unknown',
                    memberName: member?.name || v.data?.member_name || null,
                    linkedAssessments: visitAssessmentIndex.get(v.id) || (member?.id ? (assessmentIndex.get(`${member.id}|${v.visit_date}`) || 0) : 0),
                    protocol: v.data?.protocol || 'General Visit',
                    notes: v.notes || v.data?.notes || '',
                    reflection: v.data?.reflection || null,
                    visitType: v.visit_type || 'Home Visit'
                };
            }),
            
            // Detailed reflection log with grading
            reflectionLog: reflections.map(r => ({
                id: r.id,
                date: r.created_at,
                phase: r.phase,
                familyId: r.family_id,
                type: r.reflection_type || 'structured',
                status: r.status,
                grade: r.grade || null,
                totalScore: r.total_score || null,
                mentorFeedback: r.mentor_feedback || null,
                
                // Gibbs cycle content
                description: r.gibbs_description || null,
                feelings: r.gibbs_feelings || null,
                evaluation: r.gibbs_evaluation || null,
                analysis: r.gibbs_analysis || null,
                conclusion: r.gibbs_conclusion || null,
                actionPlan: r.gibbs_action_plan || null,
                
                // File if uploaded
                fileName: r.file_name || null,
                fileUrl: r.file_url || null
            })),
            
            // Graded reflections summary
            gradingSummary: calculateGradingSummary(reflections)
        },

        // Family-wise detailed data
        familyDetails: families.map(f => {
            const famMembers = membersWithAssessments.filter(m => m.family_id === f.id);
            const famVisits = visits.filter(v => v.family_id === f.id);
            
            return {
                id: f.id,
                headName: f.head_name,
                address: f.address,
                phone: f.phone,
                memberCount: famMembers.length,
                totalVisits: famVisits.length,
                lastVisit: famVisits.length > 0 ? famVisits[0].visit_date : null,
                
                // Members with health summaries
                members: famMembers.map(m => ({
                    id: m.id,
                    name: m.name,
                    age: m.age,
                    gender: m.gender,
                    relationship: m.relationship,
                    
                    // Health metrics
                    assessmentCount: m.assessments.length,
                    problemCount: m.problems.length,
                    interventionCount: m.interventions.length,
                    
                    // Latest vitals
                    latestVitals: extractLatestVitals(m),
                    
                    // Health trajectory
                    trajectory: calculateHealthTrajectory(m)
                }))
            };
        }),

        // Assessment summary by type
        assessmentSummary: calculateAssessmentSummary(membersWithAssessments),

        // Intervention tracking
        interventionSummary: calculateInterventionSummary(membersWithAssessments)
    };

    return report;
};

// Helper: Extract latest vitals from assessments
const extractLatestVitals = (member) => {
    const assessments = member.assessments || [];
    
    let vitals = {
        bmi: null,
        bmiCategory: null,
        bp: null,
        rbs: null,
        hb: null,
        lastUpdated: null
    };

    // Get latest anthropometric data
    const latestAnthro = assessments.find(a => a.formId === 'anthropometric_assessment_v1');
    if (latestAnthro?.data) {
        const { height_cm, weight_kg } = latestAnthro.data;
        if (height_cm && weight_kg) {
            const heightM = parseFloat(height_cm) / 100;
            const wt = parseFloat(weight_kg);
            if (heightM > 0 && wt > 0) {
                vitals.bmi = (wt / (heightM * heightM)).toFixed(1);
                vitals.bmiCategory = getBMICategory(parseFloat(vitals.bmi));
            }
        }
        vitals.lastUpdated = latestAnthro.date;
    }

    // Get latest NCD screening
    const latestNCD = assessments.find(a => a.formId === 'ncd_screening_v1');
    if (latestNCD?.data) {
        if (latestNCD.data.bp_systolic && latestNCD.data.bp_diastolic) {
            vitals.bp = `${latestNCD.data.bp_systolic}/${latestNCD.data.bp_diastolic}`;
        }
        if (latestNCD.data.rbs) {
            vitals.rbs = latestNCD.data.rbs;
        }
        if (!vitals.lastUpdated || new Date(latestNCD.date) > new Date(vitals.lastUpdated)) {
            vitals.lastUpdated = latestNCD.date;
        }
    }

    // Get latest Hb from ANC
    const latestANC = assessments.find(a => a.formId === 'antenatal_care_v1');
    if (latestANC?.data?.haemoglobin) {
        vitals.hb = latestANC.data.haemoglobin;
    }

    return vitals;
};

// Helper: Calculate health trajectory over time
const calculateHealthTrajectory = (member) => {
    const assessments = member.assessments || [];
    
    // Group BMI measurements by date
    const bmiData = [];
    const bpData = [];
    
    assessments.forEach(a => {
        if (a.formId === 'anthropometric_assessment_v1' && a.data?.height_cm && a.data?.weight_kg) {
            const heightM = parseFloat(a.data.height_cm) / 100;
            const wt = parseFloat(a.data.weight_kg);
            if (heightM > 0 && wt > 0) {
                bmiData.push({
                    date: a.date,
                    value: parseFloat((wt / (heightM * heightM)).toFixed(1))
                });
            }
        }
        
        if (a.formId === 'ncd_screening_v1' && a.data?.bp_systolic) {
            bpData.push({
                date: a.date,
                systolic: parseInt(a.data.bp_systolic),
                diastolic: parseInt(a.data.bp_diastolic)
            });
        }
    });

    return {
        bmi: bmiData.sort((a, b) => new Date(a.date) - new Date(b.date)),
        bp: bpData.sort((a, b) => new Date(a.date) - new Date(b.date)),
        trend: calculateTrend(bmiData)
    };
};

// Helper: Calculate trend (improving, stable, worsening)
const calculateTrend = (data) => {
    if (data.length < 2) return 'insufficient_data';
    
    const sortedData = [...data].sort((a, b) => new Date(a.date) - new Date(b.date));
    const first = sortedData[0].value;
    const last = sortedData[sortedData.length - 1].value;
    
    const change = ((last - first) / first) * 100;
    
    if (Math.abs(change) < 5) return 'stable';
    if (change > 0) return 'increasing';
    return 'decreasing';
};

// Helper: Get BMI category
const getBMICategory = (bmi) => {
    if (bmi < 18.5) return 'Underweight';
    if (bmi < 23) return 'Normal';
    if (bmi < 25) return 'Overweight';
    if (bmi < 30) return 'Obese I';
    return 'Obese II';
};

// Helper: Calculate grading summary
const calculateGradingSummary = (reflections) => {
    const graded = reflections.filter(r => r.status === 'Graded' && r.total_score != null);
    
    if (graded.length === 0) return { totalGraded: 0, avgScore: null, gradeDistribution: {} };
    
    const total = graded.reduce((sum, r) => sum + r.total_score, 0);
    const avg = total / graded.length;
    
    const distribution = { A: 0, B: 0, C: 0, D: 0, F: 0 };
    graded.forEach(r => {
        const key = r.grade?.charAt(0);
        if (key && Object.prototype.hasOwnProperty.call(distribution, key)) {
            distribution[key]++;
        }
    });
    
    return {
        totalGraded: graded.length,
        avgScore: avg.toFixed(1),
        gradeDistribution: distribution
    };
};

// Helper: Calculate assessment summary by type
const calculateAssessmentSummary = (members) => {
    const summary = {};
    
    members.forEach(m => {
        (m.assessments || []).forEach(a => {
            const formId = a.formId || 'unknown';
            if (!summary[formId]) {
                summary[formId] = { count: 0, members: new Set() };
            }
            summary[formId].count++;
            summary[formId].members.add(m.id);
        });
    });
    
    // Convert Sets to counts
    Object.keys(summary).forEach(key => {
        summary[key].uniqueMembers = summary[key].members.size;
        delete summary[key].members;
    });
    
    return summary;
};

// Helper: Calculate intervention summary
const calculateInterventionSummary = (members) => {
    const summary = {
        total: 0,
        completed: 0,
        pending: 0,
        byType: {}
    };
    
    members.forEach(m => {
        (m.interventions || []).forEach(i => {
            summary.total++;
            
            if (i.status === 'Completed') summary.completed++;
            else summary.pending++;
            
            const type = i.type || 'Other';
            summary.byType[type] = (summary.byType[type] || 0) + 1;
        });
    });
    
    return summary;
};

// Existing helper functions
const calculateGenderRatio = (members) => {
    let m = 0, f = 0;
    members.forEach(p => {
        if (p.gender === 'Male') m++;
        if (p.gender === 'Female') f++;
    });
    return { male: m, female: f, ratio: m > 0 ? ((f / m) * 1000).toFixed(0) : 0 };
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
    let totalANC = 0;
    let highRisk = 0;
    let registered = 0;

    members.forEach(m => {
        const ancForms = m.assessments?.filter(a => a.formId === 'antenatal_care_v1');
        if (ancForms && ancForms.length > 0) {
            registered++;
            const latest = ancForms[0].data;
            if (latest?.risk_signs && latest.risk_signs.length > 2) highRisk++;
            if (latest?.anc_visits) totalANC += parseInt(latest.anc_visits);
        }
    });

    return {
        registeredPregnancies: registered,
        highRiskPregnancies: highRisk,
        avgVisits: registered > 0 ? (totalANC / registered).toFixed(1) : 0
    };
};

const calculateChildHealthIndicators = (members) => {
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
                const lower = (p.title || '').toLowerCase();
                let category = 'Other';
                if (lower.includes('diabetes') || lower.includes('sugar')) category = 'Diabetes';
                else if (lower.includes('bp') || lower.includes('hyper')) category = 'Hypertension';
                else if (lower.includes('copd') || lower.includes('asthma')) category = 'Respiratory';
                else if (lower.includes('anemia')) category = 'Anemia';
                else if (lower.includes('thyroid')) category = 'Thyroid';
                else if (lower.includes('heart')) category = 'Cardiac';

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
        const famVisits = visits.filter(v => v.family_id === f.id && v.data?.protocol === 'socio_economic_v1');
        if (famVisits.length > 0) {
            famVisits.sort((a, b) => new Date(b.visit_date) - new Date(a.visit_date));
            const latest = famVisits[0].data;
            const income = parseFloat(latest.monthly_income || 0);

            if (income > 80000) classes.upper++;
            else if (income > 40000) classes.upperMiddle++;
            else if (income > 25000) classes.lowerMiddle++;
            else if (income > 10000) classes.upperLower++;
            else classes.lower++;
        }
    });
    
    const total = Object.values(classes).reduce((a, b) => a + b, 0);
    if (total === 0) return classes;
    
    // Convert to percentages
    return {
        upper: Math.round((classes.upper / total) * 100),
        upperMiddle: Math.round((classes.upperMiddle / total) * 100),
        lowerMiddle: Math.round((classes.lowerMiddle / total) * 100),
        upperLower: Math.round((classes.upperLower / total) * 100),
        lower: Math.round((classes.lower / total) * 100)
    };
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

            if (['Piped Water', 'RO System', 'Filtered'].includes(data.water_source)) safeWater++;
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
