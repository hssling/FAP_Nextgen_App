import competenciesData from '../data/competencies/nmc_competencies.json';

/**
 * Maps an activity type (from the FAP logbook) to NMC Competency codes
 * based on the nmc_competencies.json data.
 */
export const getCompetenciesForActivity = (activityName) => {
    const allYears = ['year_1', 'year_2', 'year_3'];
    const codes = new Set();

    allYears.forEach(year => {
        const activities = competenciesData[year]?.expected_activities || [];
        const match = activities.find(a => 
            a.activity.toLowerCase() === activityName.toLowerCase() ||
            activityName.toLowerCase().includes(a.activity.toLowerCase())
        );
        
        if (match) {
            match.competencies_addressed.forEach(code => codes.add(code));
        }
    });

    return Array.from(codes);
};

/**
 * Human readable status labels
 */
export const COMPETENCY_STATUS = {
    PENDING: 'pending',
    IN_PROGRESS: 'in_progress',
    ACHIEVED: 'achieved',
    VERIFIED: 'verified'
};
