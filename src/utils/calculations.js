/**
 * Health Calculations Utility
 * Provides functions for calculating health metrics like BMI, WHR, risk scores, etc.
 */

/**
 * Calculate BMI (Body Mass Index)
 * @param {number} weightKg - Weight in kilograms
 * @param {number} heightCm - Height in centimeters
 * @returns {object} - { bmi, category, interpretation }
 */
export const calculateBMI = (weightKg, heightCm) => {
    if (!weightKg || !heightCm || weightKg <= 0 || heightCm <= 0) {
        return { bmi: null, category: 'Invalid', interpretation: 'Invalid input' };
    }

    const heightM = heightCm / 100;
    const bmi = (weightKg / (heightM * heightM)).toFixed(2);

    let category, interpretation, color;

    if (bmi < 18.5) {
        category = 'Underweight';
        interpretation = 'Below normal weight - nutritional intervention needed';
        color = '#F59E0B'; // Amber
    } else if (bmi >= 18.5 && bmi < 23) {
        category = 'Normal';
        interpretation = 'Healthy weight range';
        color = '#10B981'; // Green
    } else if (bmi >= 23 && bmi < 25) {
        category = 'Overweight';
        interpretation = 'Above normal - lifestyle modification recommended';
        color = '#F59E0B'; // Amber
    } else if (bmi >= 25 && bmi < 30) {
        category = 'Obese Class I';
        interpretation = 'Obesity - medical evaluation and intervention needed';
        color = '#EF4444'; // Red
    } else {
        category = 'Obese Class II';
        interpretation = 'Severe obesity - urgent medical intervention required';
        color = '#DC2626'; // Dark Red
    }

    return { bmi: parseFloat(bmi), category, interpretation, color };
};

/**
 * Calculate WHR (Waist-Hip Ratio)
 * @param {number} waistCm - Waist circumference in cm
 * @param {number} hipCm - Hip circumference in cm
 * @param {string} gender - 'male' or 'female'
 * @returns {object} - { whr, risk, interpretation }
 */
export const calculateWHR = (waistCm, hipCm, gender) => {
    if (!waistCm || !hipCm || waistCm <= 0 || hipCm <= 0) {
        return { whr: null, risk: 'Invalid', interpretation: 'Invalid input' };
    }

    const whr = (waistCm / hipCm).toFixed(2);
    let risk, interpretation, color;

    if (gender === 'male' || gender === 'Male') {
        if (whr < 0.90) {
            risk = 'Low';
            interpretation = 'Low cardiovascular risk';
            color = '#10B981';
        } else if (whr >= 0.90 && whr < 1.0) {
            risk = 'Moderate';
            interpretation = 'Moderate cardiovascular risk';
            color = '#F59E0B';
        } else {
            risk = 'High';
            interpretation = 'High cardiovascular risk';
            color = '#EF4444';
        }
    } else {
        // Female
        if (whr < 0.80) {
            risk = 'Low';
            interpretation = 'Low cardiovascular risk';
            color = '#10B981';
        } else if (whr >= 0.80 && whr < 0.85) {
            risk = 'Moderate';
            interpretation = 'Moderate cardiovascular risk';
            color = '#F59E0B';
        } else {
            risk = 'High';
            interpretation = 'High cardiovascular risk';
            color = '#EF4444';
        }
    }

    return { whr: parseFloat(whr), risk, interpretation, color };
};

/**
 * Calculate Ideal Body Weight (IBW) using Devine formula
 * @param {number} heightCm - Height in cm
 * @param {string} gender - 'male' or 'female'
 * @returns {number} - Ideal body weight in kg
 */
export const calculateIBW = (heightCm, gender) => {
    if (!heightCm || heightCm <= 0) return null;

    const heightInches = heightCm / 2.54;

    if (gender === 'male' || gender === 'Male') {
        return (50 + 2.3 * (heightInches - 60)).toFixed(1);
    } else {
        return (45.5 + 2.3 * (heightInches - 60)).toFixed(1);
    }
};

/**
 * Classify Blood Pressure
 * @param {number} systolic - Systolic BP in mmHg
 * @param {number} diastolic - Diastolic BP in mmHg
 * @returns {object} - { category, interpretation, color }
 */
export const classifyBloodPressure = (systolic, diastolic) => {
    if (!systolic || !diastolic) {
        return { category: 'Invalid', interpretation: 'Invalid input', color: '#6B7280' };
    }

    let category, interpretation, color;

    if (systolic < 120 && diastolic < 80) {
        category = 'Normal';
        interpretation = 'Blood pressure is within normal range';
        color = '#10B981';
    } else if (systolic >= 120 && systolic < 130 && diastolic < 80) {
        category = 'Elevated';
        interpretation = 'Elevated BP - lifestyle modifications recommended';
        color = '#F59E0B';
    } else if ((systolic >= 130 && systolic < 140) || (diastolic >= 80 && diastolic < 90)) {
        category = 'Hypertension Stage 1';
        interpretation = 'Stage 1 Hypertension - medical evaluation needed';
        color = '#F97316';
    } else if (systolic >= 140 || diastolic >= 90) {
        category = 'Hypertension Stage 2';
        interpretation = 'Stage 2 Hypertension - urgent medical intervention required';
        color = '#EF4444';
    } else if (systolic >= 180 || diastolic >= 120) {
        category = 'Hypertensive Crisis';
        interpretation = 'EMERGENCY - Immediate medical attention required';
        color = '#DC2626';
    }

    return { category, interpretation, color };
};

/**
 * Classify Blood Sugar (Random)
 * @param {number} rbs - Random blood sugar in mg/dL
 * @returns {object} - { category, interpretation, color }
 */
export const classifyBloodSugar = (rbs) => {
    if (!rbs || rbs <= 0) {
        return { category: 'Invalid', interpretation: 'Invalid input', color: '#6B7280' };
    }

    let category, interpretation, color;

    if (rbs < 140) {
        category = 'Normal';
        interpretation = 'Blood sugar within normal range';
        color = '#10B981';
    } else if (rbs >= 140 && rbs < 200) {
        category = 'Pre-Diabetic';
        interpretation = 'Elevated blood sugar - diabetes screening recommended';
        color = '#F59E0B';
    } else {
        category = 'Diabetic Range';
        interpretation = 'High blood sugar - medical evaluation required';
        color = '#EF4444';
    }

    return { category, interpretation, color };
};

/**
 * Calculate age from date of birth
 * @param {string} dob - Date of birth in YYYY-MM-DD format
 * @returns {number} - Age in years
 */
export const calculateAge = (dob) => {
    if (!dob) return null;
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
};

/**
 * Get life cycle stage based on age
 * @param {number} age - Age in years
 * @returns {string} - Life cycle stage
 */
export const getLifeCycleStage = (age) => {
    if (age < 1) return 'infant';
    if (age >= 1 && age < 6) return 'child';
    if (age >= 6 && age < 13) return 'school_age';
    if (age >= 13 && age < 20) return 'adolescent';
    if (age >= 20 && age < 60) return 'adult';
    return 'elderly';
};

/**
 * Calculate MUAC category for children (6-59 months)
 * @param {number} muacCm - Mid-Upper Arm Circumference in cm
 * @returns {object} - { category, interpretation, color }
 */
export const classifyMUAC = (muacCm) => {
    if (!muacCm || muacCm <= 0) {
        return { category: 'Invalid', interpretation: 'Invalid input', color: '#6B7280' };
    }

    let category, interpretation, color;

    if (muacCm < 11.5) {
        category = 'Severe Acute Malnutrition (SAM)';
        interpretation = 'URGENT - Immediate nutritional intervention required';
        color = '#DC2626';
    } else if (muacCm >= 11.5 && muacCm < 12.5) {
        category = 'Moderate Acute Malnutrition (MAM)';
        interpretation = 'Moderate malnutrition - nutritional support needed';
        color = '#F59E0B';
    } else if (muacCm >= 12.5 && muacCm < 13.5) {
        category = 'At Risk';
        interpretation = 'At risk of malnutrition - monitor closely';
        color = '#F59E0B';
    } else {
        category = 'Normal';
        interpretation = 'Adequate nutritional status';
        color = '#10B981';
    }

    return { category, interpretation, color };
};

/**
 * Calculate Kuppuswamy Socioeconomic Score
 * @param {number} educationScore - Education score (1-7)
 * @param {number} occupationScore - Occupation score (1-10)
 * @param {number} incomeScore - Income score (1-12)
 * @returns {object} - { totalScore, class, interpretation }
 */
export const calculateKuppuswamyScore = (educationScore, occupationScore, incomeScore) => {
    const totalScore = educationScore + occupationScore + incomeScore;

    let sesClass, interpretation, color;

    if (totalScore >= 26) {
        sesClass = 'Upper Class (I)';
        interpretation = 'High socioeconomic status';
        color = '#10B981';
    } else if (totalScore >= 16 && totalScore <= 25) {
        sesClass = 'Upper Middle Class (II)';
        interpretation = 'Upper middle socioeconomic status';
        color = '#10B981';
    } else if (totalScore >= 11 && totalScore <= 15) {
        sesClass = 'Lower Middle Class (III)';
        interpretation = 'Lower middle socioeconomic status';
        color = '#F59E0B';
    } else if (totalScore >= 5 && totalScore <= 10) {
        sesClass = 'Upper Lower Class (IV)';
        interpretation = 'Upper lower socioeconomic status';
        color = '#F97316';
    } else {
        sesClass = 'Lower Class (V)';
        interpretation = 'Low socioeconomic status - social support needed';
        color = '#EF4444';
    }

    return { totalScore, class: sesClass, interpretation, color };
};

export default {
    calculateBMI,
    calculateWHR,
    calculateIBW,
    classifyBloodPressure,
    classifyBloodSugar,
    calculateAge,
    getLifeCycleStage,
    classifyMUAC,
    calculateKuppuswamyScore
};
