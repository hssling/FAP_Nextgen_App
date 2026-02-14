import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// Helper to format date
const formatDate = () => {
    const d = new Date();
    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
};

const LOCALIZATION = {
    kn: {
        headingAdmin: 'FAP NextGen - ಸ್ಥಳೀಯ ಆರೋಗ್ಯ ವರದಿ',
        headingClass: 'FAP NextGen - ತರಗತಿ ಕಾರ್ಯಕ್ಷಮತಾ ವರದಿ',
        generatedOn: 'ರಚಿಸಿದ ದಿನಾಂಕ',
        confidentiality: 'ಅಧಿಕೃತ ಬಳಕೆಗೆ ಮಾತ್ರ',
        summary: 'ಸಂಕ್ಷಿಪ್ತ ವಿವರ',
        topStudents: 'ಉತ್ತಮ ವಿದ್ಯಾರ್ಥಿಗಳ ಪಟ್ಟಿ',
        metric: 'ಮಾಪಕ',
        count: 'ಸಂಖ್ಯೆ',
        totalStudents: 'ಒಟ್ಟು ವಿದ್ಯಾರ್ಥಿಗಳು',
        totalTeachers: 'ಒಟ್ಟು ಶಿಕ್ಷಕರು',
        familiesAdopted: 'ದತ್ತು ಪಡೆದ ಕುಟುಂಬಗಳು',
        reflectionsSubmitted: 'ಸಲ್ಲಿಸಿದ ಪ್ರತಿಫಲನಗಳು',
        reflectionsGraded: 'ಮೌಲ್ಯಮಾಪನಗೊಂಡ ಪ್ರತಿಫಲನಗಳು',
        pendingReview: 'ಬಾಕಿ ಮೌಲ್ಯಮಾಪನಗಳು',
        studentName: 'ವಿದ್ಯಾರ್ಥಿ ಹೆಸರು',
        regNo: 'ನೋಂದಣಿ ಸಂಖ್ಯೆ',
        families: 'ಕುಟುಂಬಗಳು',
        reflections: 'ಪ್ರತಿಫಲನಗಳು',
        graded: 'ಮೌಲ್ಯಮಾಪನಗೊಂಡವು',
        grade: 'ಗ್ರೇಡ್',
        score: 'ಅಂಕ',
        cohort: 'ಬ್ಯಾಚ್',
        note: 'ಸ್ಥಳೀಯ ಆರೋಗ್ಯ ಸಿಬ್ಬಂದಿ ಮತ್ತು ತರಬೇತಿ ಮೇಲ್ವಿಚಾರಣೆಗೆ ಸಂಕ್ಷಿಪ್ತ ವರದಿ'
    },
    hi: {
        headingAdmin: 'FAP NextGen - स्थानीय स्वास्थ्य रिपोर्ट',
        headingClass: 'FAP NextGen - कक्षा प्रदर्शन रिपोर्ट',
        generatedOn: 'रिपोर्ट तिथि',
        confidentiality: 'केवल आधिकारिक उपयोग हेतु',
        summary: 'संक्षिप्त सार',
        topStudents: 'शीर्ष छात्र सूची',
        metric: 'मापदंड',
        count: 'संख्या',
        totalStudents: 'कुल छात्र',
        totalTeachers: 'कुल शिक्षक',
        familiesAdopted: 'गोद लिए परिवार',
        reflectionsSubmitted: 'जमा किए गए रिफ्लेक्शन',
        reflectionsGraded: 'ग्रेडेड रिफ्लेक्शन',
        pendingReview: 'लंबित समीक्षा',
        studentName: 'छात्र नाम',
        regNo: 'पंजीकरण संख्या',
        families: 'परिवार',
        reflections: 'रिफ्लेक्शन',
        graded: 'ग्रेडेड',
        grade: 'ग्रेड',
        score: 'स्कोर',
        cohort: 'बैच',
        note: 'स्थानीय स्वास्थ्य कर्मचारियों और प्रशिक्षण पर्यवेक्षण के लिए संक्षिप्त रिपोर्ट'
    }
};

const downloadTextFile = (filename, content) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
};

/**
 * Generates a comprehensive Admin Report
 * @param {Object} stats - Dashboard stats (totalStudents, etc.)
 * @param {Array} topStudents - Array of top student objects
 */
export const generateAdminReport = (stats, topStudents) => {
    const doc = new jsPDF();

    // Header
    doc.setFontSize(20);
    doc.setTextColor(15, 118, 110); // Teal color
    doc.text('FAP NextGen - Administrative Report', 14, 22);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated on: ${formatDate()}`, 14, 30);
    doc.text('Confidential - For Official Use Only', 14, 35);

    // Section 1: System Overview
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text('1. System Overview', 14, 50);

    const overviewData = [
        ['Metric', 'Count'],
        ['Total Students', stats.totalStudents],
        ['Total Teachers', stats.totalTeachers],
        ['Families Adopted', stats.totalFamilies],
        ['Reflections Submitted', stats.totalReflections],
        ['Reflections Graded', stats.gradedReflections],
        ['Pending Review', stats.pendingReflections]
    ];

    autoTable(doc, {
        startY: 55,
        head: [['Metric', 'Count']],
        body: overviewData.slice(1),
        theme: 'striped',
        headStyles: { fillColor: [15, 118, 110] }
    });

    // Section 2: Top Performers
    const finalY = doc.lastAutoTable.finalY + 20;
    doc.text('2. Top Performing Students', 14, finalY);

    const studentData = topStudents.map((s, index) => [
        index + 1,
        s.full_name,
        s.registration_number || 'N/A',
        s.familyCount,
        s.reflectionCount,
        s.avgScore
    ]);

    autoTable(doc, {
        startY: finalY + 5,
        head: [['Rank', 'Student Name', 'Reg. No', 'Families', 'Reflections', 'Avg Score']],
        body: studentData,
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246] } // Blue
    });

    // Footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.text(`Page ${i} of ${pageCount}`, 190, 290, { align: 'right' });
    }

    doc.save(`FAP_Admin_Report_${new Date().toISOString().split('T')[0]}.pdf`);
};

/**
 * Generates a Class Report for Teachers
 * @param {Array} students - Array of student objects with grades/stats
 * @param {string} className - Optional class identifier
 */
export const generateClassReport = (students, className = 'Assigned Class') => {
    const doc = new jsPDF();

    // Header
    doc.setFontSize(20);
    doc.setTextColor(15, 118, 110);
    doc.text(`FAP NextGen - Class Performance Report`, 14, 22);

    doc.setFontSize(12);
    doc.setTextColor(80);
    doc.text(`Cohort: ${className}`, 14, 32);

    doc.setFontSize(10);
    doc.text(`Date: ${formatDate()}`, 14, 38);

    // Table
    const tableData = students.map(s => [
        s.full_name,
        s.registration_number || '-',
        s.familyCount,
        s.reflectionCount,
        s.gradedCount,
        s.avgGrade || '-',
        s.avgScore || '-'
    ]);

    autoTable(doc, {
        startY: 45,
        head: [['Student Name', 'Reg. No', 'Families', 'Reflections', 'Graded', 'Grade', 'Score']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [44, 62, 80] },
        styles: { fontSize: 9 }
    });

    // Summary
    const finalY = doc.lastAutoTable.finalY + 15;
    doc.setFontSize(10);
    doc.text(`Total Students: ${students.length}`, 14, finalY);

    // Signature Area
    doc.text('Signature of Faculty Mentor:', 14, finalY + 20);
    doc.line(60, finalY + 20, 120, finalY + 20);

    doc.save(`FAP_Class_Report_${className.replace(/\s+/g, '_')}.pdf`);
};

export const generateAdminLocalStaffReport = (stats, topStudents, language = 'kn') => {
    const t = LOCALIZATION[language] || LOCALIZATION.kn;
    const lines = [
        t.headingAdmin,
        `${t.generatedOn}: ${formatDate()}`,
        `${t.confidentiality}`,
        '',
        `${t.summary}:`,
        `- ${t.totalStudents}: ${stats.totalStudents}`,
        `- ${t.totalTeachers}: ${stats.totalTeachers}`,
        `- ${t.familiesAdopted}: ${stats.totalFamilies}`,
        `- ${t.reflectionsSubmitted}: ${stats.totalReflections}`,
        `- ${t.reflectionsGraded}: ${stats.gradedReflections}`,
        `- ${t.pendingReview}: ${stats.pendingReflections}`,
        '',
        `${t.topStudents}:`
    ];

    topStudents.forEach((s, idx) => {
        lines.push(
            `${idx + 1}. ${t.studentName}: ${s.full_name || '-'} | ${t.regNo}: ${s.registration_number || '-'} | ${t.families}: ${s.familyCount || 0} | ${t.reflections}: ${s.reflectionCount || 0} | ${t.score}: ${s.avgScore || '-'}`
        );
    });

    lines.push('', t.note);
    const suffix = language === 'hi' ? 'Hindi' : 'Kannada';
    downloadTextFile(`FAP_Admin_Local_Staff_Report_${suffix}_${new Date().toISOString().split('T')[0]}.txt`, lines.join('\n'));
};

export const generateClassLocalStaffReport = (students, className = 'Assigned Class', language = 'kn') => {
    const t = LOCALIZATION[language] || LOCALIZATION.kn;
    const lines = [
        t.headingClass,
        `${t.cohort}: ${className}`,
        `${t.generatedOn}: ${formatDate()}`,
        `${t.confidentiality}`,
        '',
        `${t.summary}:`,
        `- ${t.totalStudents}: ${students.length}`,
        '',
        `${t.topStudents}:`
    ];

    students.forEach((s, idx) => {
        lines.push(
            `${idx + 1}. ${t.studentName}: ${s.full_name || '-'} | ${t.regNo}: ${s.registration_number || '-'} | ${t.families}: ${s.familyCount || 0} | ${t.reflections}: ${s.reflectionCount || 0} | ${t.graded}: ${s.gradedCount || 0} | ${t.grade}: ${s.avgGrade || '-'} | ${t.score}: ${s.avgScore || '-'}`
        );
    });

    lines.push('', t.note);
    const suffix = language === 'hi' ? 'Hindi' : 'Kannada';
    downloadTextFile(`FAP_Class_Local_Staff_Report_${suffix}_${new Date().toISOString().split('T')[0]}.txt`, lines.join('\n'));
};
