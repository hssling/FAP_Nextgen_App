import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Helper to format date
const formatDate = () => {
    const d = new Date();
    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
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

    doc.autoTable({
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

    doc.autoTable({
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

    doc.autoTable({
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
