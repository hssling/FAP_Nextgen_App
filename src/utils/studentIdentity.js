const isValidYearOfJoining = (value) => {
    const num = Number(value);
    return Number.isInteger(num) && num >= 2000 && num <= 2100;
};

// Academic progression rolls over in December.
// Example: 2025 batch remains Year 1 until November 2026.
const ACADEMIC_ROLLOVER_MONTH_INDEX = 11; // December (0-based)

const getAcademicCycleYear = (now = new Date()) => {
    const year = now.getFullYear();
    const month = now.getMonth();
    return month >= ACADEMIC_ROLLOVER_MONTH_INDEX ? year : year - 1;
};

export const getYearOfJoining = (student) => {
    if (!student) return null;
    const raw = student.year_of_joining;
    if (isValidYearOfJoining(raw)) return Number(raw);
    return null;
};

export const getCurrentStudyYear = (student, now = new Date()) => {
    const joiningYear = getYearOfJoining(student);
    if (joiningYear) {
        const academicCycleYear = getAcademicCycleYear(now);
        const yearDiff = academicCycleYear - joiningYear + 1;
        return Math.min(3, Math.max(1, yearDiff));
    }

    const legacyYear = Number(student?.year);
    if (Number.isInteger(legacyYear) && legacyYear >= 1 && legacyYear <= 3) {
        return legacyYear;
    }
    return null;
};

export const formatStudentIdentifiers = (student) => {
    const rollNumber = (student?.registration_number || '').toString().trim()
        || (student?.username || '').toString().trim()
        || 'No Roll No.';
    const joiningYear = getYearOfJoining(student);
    const currentYear = getCurrentStudyYear(student);

    const details = [rollNumber];
    if (joiningYear) details.push(`Batch ${joiningYear}`);
    if (currentYear) details.push(`Year ${currentYear}`);

    return details.join(' • ');
};

