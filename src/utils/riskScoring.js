/**
 * Risk Scoring Utilities
 * Provides scoring functions for validated screening tools
 */

/**
 * Calculate PHQ-9 Depression Score
 * @param {object} responses - Object with q1-q9 responses (0-3 each)
 * @returns {object} - { totalScore, severity, interpretation, color, recommendations }
 */
export const calculatePHQ9Score = (responses) => {
    const questions = ['q1_interest', 'q2_depressed', 'q3_sleep', 'q4_energy',
        'q5_appetite', 'q6_self_worth', 'q7_concentration',
        'q8_movement', 'q9_self_harm'];

    let totalScore = 0;
    questions.forEach(q => {
        const value = parseInt(responses[q]) || 0;
        totalScore += value;
    });

    let severity, interpretation, color, recommendations;

    if (totalScore >= 0 && totalScore <= 4) {
        severity = 'Minimal Depression';
        interpretation = 'Minimal or no depression';
        color = '#10B981'; // Green
        recommendations = 'No treatment needed. Continue monitoring.';
    } else if (totalScore >= 5 && totalScore <= 9) {
        severity = 'Mild Depression';
        interpretation = 'Mild depression symptoms';
        color = '#F59E0B'; // Amber
        recommendations = 'Watchful waiting. Consider counseling. Repeat PHQ-9 in 2-4 weeks.';
    } else if (totalScore >= 10 && totalScore <= 14) {
        severity = 'Moderate Depression';
        interpretation = 'Moderate depression - treatment recommended';
        color = '#F97316'; // Orange
        recommendations = 'Counseling and/or medication. Refer to mental health professional.';
    } else if (totalScore >= 15 && totalScore <= 19) {
        severity = 'Moderately Severe Depression';
        interpretation = 'Moderately severe depression - active treatment needed';
        color = '#EF4444'; // Red
        recommendations = 'Active treatment with medication and psychotherapy. Close monitoring required.';
    } else {
        severity = 'Severe Depression';
        interpretation = 'Severe depression - immediate intervention required';
        color = '#DC2626'; // Dark Red
        recommendations = 'URGENT: Immediate psychiatric referral. Assess suicide risk. Consider hospitalization if needed.';
    }

    // Check for suicide risk (Q9)
    const suicideRisk = parseInt(responses['q9_self_harm']) || 0;
    if (suicideRisk >= 1) {
        recommendations += ' ⚠️ SUICIDE RISK DETECTED - Immediate safety assessment required!';
        color = '#DC2626';
    }

    return { totalScore, severity, interpretation, color, recommendations, suicideRisk: suicideRisk > 0 };
};

/**
 * Calculate GAD-7 Anxiety Score
 * @param {object} responses - Object with q1-q7 responses (0-3 each)
 * @returns {object} - { totalScore, severity, interpretation, color, recommendations }
 */
export const calculateGAD7Score = (responses) => {
    const questions = ['q1_nervous', 'q2_control_worry', 'q3_worry_much',
        'q4_relax', 'q5_restless', 'q6_irritable', 'q7_afraid'];

    let totalScore = 0;
    questions.forEach(q => {
        const value = parseInt(responses[q]) || 0;
        totalScore += value;
    });

    let severity, interpretation, color, recommendations;

    if (totalScore >= 0 && totalScore <= 4) {
        severity = 'Minimal Anxiety';
        interpretation = 'Minimal or no anxiety';
        color = '#10B981';
        recommendations = 'No treatment needed. Continue monitoring.';
    } else if (totalScore >= 5 && totalScore <= 9) {
        severity = 'Mild Anxiety';
        interpretation = 'Mild anxiety symptoms';
        color = '#F59E0B';
        recommendations = 'Watchful waiting. Relaxation techniques. Repeat GAD-7 in 2-4 weeks.';
    } else if (totalScore >= 10 && totalScore <= 14) {
        severity = 'Moderate Anxiety';
        interpretation = 'Moderate anxiety - treatment recommended';
        color = '#F97316';
        recommendations = 'Counseling (CBT recommended). Consider medication. Refer to mental health professional.';
    } else {
        severity = 'Severe Anxiety';
        interpretation = 'Severe anxiety - active treatment needed';
        color = '#EF4444';
        recommendations = 'Active treatment with medication and psychotherapy. Psychiatric referral recommended.';
    }

    return { totalScore, severity, interpretation, color, recommendations };
};

/**
 * Calculate AUDIT Alcohol Score
 * @param {object} responses - Object with q1-q3 responses (simplified 3-question version)
 * @returns {object} - { totalScore, riskLevel, interpretation, color, recommendations }
 */
export const calculateAUDITScore = (responses) => {
    const q1 = parseInt(responses['q1_frequency']) || 0;
    const q2 = parseInt(responses['q2_quantity']) || 0;
    const q3 = parseInt(responses['q3_binge']) || 0;

    const totalScore = q1 + q2 + q3;

    let riskLevel, interpretation, color, recommendations;

    if (totalScore === 0) {
        riskLevel = 'Abstinent';
        interpretation = 'No alcohol consumption';
        color = '#10B981';
        recommendations = 'Continue abstinence. Reinforce healthy lifestyle.';
    } else if (totalScore >= 1 && totalScore <= 3) {
        riskLevel = 'Low Risk';
        interpretation = 'Low-risk drinking';
        color = '#10B981';
        recommendations = 'Alcohol education. Encourage moderation.';
    } else if (totalScore >= 4 && totalScore <= 7) {
        riskLevel = 'Hazardous Use';
        interpretation = 'Hazardous alcohol use';
        color = '#F59E0B';
        recommendations = 'Brief intervention. Counseling on reducing consumption. Monitor regularly.';
    } else if (totalScore >= 8 && totalScore <= 10) {
        riskLevel = 'Harmful Use';
        interpretation = 'Harmful alcohol use - health consequences likely';
        color = '#EF4444';
        recommendations = 'Brief intervention + counseling. Consider referral to de-addiction services.';
    } else {
        riskLevel = 'Possible Dependence';
        interpretation = 'Possible alcohol dependence - specialist assessment needed';
        color = '#DC2626';
        recommendations = 'URGENT: Refer to de-addiction specialist. Complete AUDIT-10 assessment. Consider detoxification.';
    }

    return { totalScore, riskLevel, interpretation, color, recommendations };
};

/**
 * Calculate CAGE Score (Simple alcohol screening)
 * @param {object} responses - Object with 4 yes/no questions
 * @returns {object} - { totalScore, riskLevel, interpretation, color }
 */
export const calculateCAGEScore = (responses) => {
    const questions = ['cut_down', 'annoyed', 'guilty', 'eye_opener'];
    let totalScore = 0;

    questions.forEach(q => {
        if (responses[q] === true || responses[q] === 'yes') {
            totalScore += 1;
        }
    });

    let riskLevel, interpretation, color;

    if (totalScore === 0) {
        riskLevel = 'Low Risk';
        interpretation = 'Low probability of alcohol problem';
        color = '#10B981';
    } else if (totalScore === 1) {
        riskLevel = 'Possible Problem';
        interpretation = 'Possible alcohol problem - further assessment needed';
        color = '#F59E0B';
    } else {
        riskLevel = 'Probable Alcohol Problem';
        interpretation = 'Probable alcohol problem - detailed assessment and intervention needed';
        color = '#EF4444';
    }

    return { totalScore, riskLevel, interpretation, color };
};

/**
 * Calculate MMSE Score (Mini-Mental State Examination)
 * @param {object} responses - Object with MMSE component scores
 * @returns {object} - { totalScore, category, interpretation, color }
 */
export const calculateMMSEScore = (responses) => {
    const components = [
        'orientation_time',      // 0-5
        'orientation_place',     // 0-5
        'registration',          // 0-3
        'attention_calculation', // 0-5
        'recall',               // 0-3
        'naming',               // 0-2
        'repetition',           // 0-1
        'comprehension',        // 0-3
        'reading',              // 0-1
        'writing',              // 0-1
        'drawing'               // 0-1
    ];

    let totalScore = 0;
    components.forEach(comp => {
        totalScore += parseInt(responses[comp]) || 0;
    });

    let category, interpretation, color;

    if (totalScore >= 24 && totalScore <= 30) {
        category = 'Normal Cognition';
        interpretation = 'No cognitive impairment';
        color = '#10B981';
    } else if (totalScore >= 18 && totalScore <= 23) {
        category = 'Mild Cognitive Impairment';
        interpretation = 'Mild cognitive impairment - monitor and reassess';
        color = '#F59E0B';
    } else if (totalScore >= 10 && totalScore <= 17) {
        category = 'Moderate Cognitive Impairment';
        interpretation = 'Moderate cognitive impairment - further evaluation needed';
        color = '#F97316';
    } else {
        category = 'Severe Cognitive Impairment';
        interpretation = 'Severe cognitive impairment - specialist referral required';
        color = '#EF4444';
    }

    return { totalScore, category, interpretation, color };
};

/**
 * Calculate Barthel Index (ADL for elderly)
 * @param {object} responses - Object with 10 ADL items
 * @returns {object} - { totalScore, dependency, interpretation, color }
 */
export const calculateBarthelIndex = (responses) => {
    const items = [
        'feeding', 'bathing', 'grooming', 'dressing', 'bowels',
        'bladder', 'toilet_use', 'transfers', 'mobility', 'stairs'
    ];

    let totalScore = 0;
    items.forEach(item => {
        totalScore += parseInt(responses[item]) || 0;
    });

    let dependency, interpretation, color;

    if (totalScore >= 90 && totalScore <= 100) {
        dependency = 'Independent';
        interpretation = 'Fully independent in ADLs';
        color = '#10B981';
    } else if (totalScore >= 60 && totalScore <= 89) {
        dependency = 'Slightly Dependent';
        interpretation = 'Slightly dependent - minimal assistance needed';
        color = '#F59E0B';
    } else if (totalScore >= 40 && totalScore <= 59) {
        dependency = 'Moderately Dependent';
        interpretation = 'Moderately dependent - regular assistance required';
        color = '#F97316';
    } else if (totalScore >= 20 && totalScore <= 39) {
        dependency = 'Severely Dependent';
        interpretation = 'Severely dependent - extensive care needed';
        color = '#EF4444';
    } else {
        dependency = 'Totally Dependent';
        interpretation = 'Totally dependent - full-time care required';
        color = '#DC2626';
    }

    return { totalScore, dependency, interpretation, color };
};

/**
 * Auto-calculate based on form type
 * @param {string} formId - Form identifier
 * @param {object} data - Form data
 * @param {object} memberData - Additional member data (age, gender, etc.)
 * @returns {object} - Calculated fields
 */
export const autoCalculate = (formId, data, memberData = {}) => {
    const calculations = {};

    switch (formId) {
        case 'phq9_depression_screening_v1':
            Object.assign(calculations, calculatePHQ9Score(data));
            break;

        case 'gad7_anxiety_screening_v1':
            Object.assign(calculations, calculateGAD7Score(data));
            break;

        case 'audit_alcohol_screening_v1':
            Object.assign(calculations, calculateAUDITScore(data));
            break;

        case 'cage_alcohol_screening_v1':
            Object.assign(calculations, calculateCAGEScore(data));
            break;

        case 'mmse_cognitive_v1':
            Object.assign(calculations, calculateMMSEScore(data));
            break;

        case 'barthel_index_v1':
            Object.assign(calculations, calculateBarthelIndex(data));
            break;

        default:
            break;
    }

    return calculations;
};

export default {
    calculatePHQ9Score,
    calculateGAD7Score,
    calculateAUDITScore,
    calculateCAGEScore,
    calculateMMSEScore,
    calculateBarthelIndex,
    autoCalculate
};
