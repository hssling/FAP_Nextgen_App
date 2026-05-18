import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const formatDate = () => {
    const d = new Date();
    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
};

const formatFileDate = () => new Date().toISOString().split('T')[0];

const LOCALIZATION = {
    kn: {
        headingAdmin: 'FAP NextGen - ಸ್ಥಳೀಯ ಆರೋಗ್ಯ ವರದಿ',
        headingClass: 'FAP NextGen - ತರಗತಿ ಕಾರ್ಯಕ್ಷಮತೆ ವರದಿ',
        generatedOn: 'ರಚಿಸಿದ ದಿನಾಂಕ',
        confidentiality: 'ಅಧಿಕೃತ ಬಳಕೆಗೆ ಮಾತ್ರ',
        summary: 'ಸಂಕ್ಷಿಪ್ತ ವಿವರ',
        topStudents: 'ಉತ್ತಮ ವಿದ್ಯಾರ್ಥಿಗಳ ಪಟ್ಟಿ',
        registeredStudents: 'ನೋಂದಾಯಿತ ವಿದ್ಯಾರ್ಥಿಗಳ ಪಟ್ಟಿ',
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
        registeredStudents: 'पंजीकृत छात्र सूची',
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

const downloadBlobFile = (filename, blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
};

const downloadTextFile = (filename, content) => {
    // UTF-8 BOM ensures Hindi/Kannada render correctly in Windows editors.
    const blob = new Blob(['\uFEFF', content], { type: 'text/plain;charset=utf-8' });
    downloadBlobFile(filename, blob);
};

const escapeXml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

const excelCell = (value, styleId) => {
    const isNumber = typeof value === 'number' && Number.isFinite(value);
    const style = styleId ? ` ss:StyleID="${styleId}"` : '';
    return `<Cell${style}><Data ss:Type="${isNumber ? 'Number' : 'String'}">${escapeXml(value)}</Data></Cell>`;
};

const excelRow = (cells, styleId) => `<Row>${cells.map(cell => excelCell(cell, styleId)).join('')}</Row>`;

const excelWorksheet = (name, rows, columnWidths = []) => `
    <Worksheet ss:Name="${escapeXml(name)}">
        <Table>
            ${columnWidths.map(width => `<Column ss:Width="${width}"/>`).join('')}
            ${rows.join('')}
        </Table>
    </Worksheet>`;

export const generateAdminReport = (stats, students) => {
    const doc = new jsPDF();

    doc.setFontSize(20);
    doc.setTextColor(15, 118, 110);
    doc.text('FAP NextGen - Administrative Report', 14, 22);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated on: ${formatDate()}`, 14, 30);
    doc.text('Confidential - For Official Use Only', 14, 35);

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

    const finalY = doc.lastAutoTable.finalY + 20;
    doc.text('2. Registered Students Work Summary', 14, finalY);

    const studentData = students.map((s, index) => [
        index + 1,
        s.full_name,
        s.registration_number || 'N/A',
        s.familyCount,
        s.reflectionCount,
        s.gradedCount || 0,
        s.avgScore
    ]);

    autoTable(doc, {
        startY: finalY + 5,
        head: [['Rank', 'Student Name', 'Reg. No', 'Families', 'Submitted', 'Mentor Verified', 'Avg Score']],
        body: studentData.length > 0
            ? studentData
            : [['-', 'No active students found', '-', '-', '-', '-', '-']],
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246] }
    });

    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i += 1) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.text(`Page ${i} of ${pageCount}`, 190, 290, { align: 'right' });
    }

    doc.save(`FAP_Admin_Report_${formatFileDate()}.pdf`);
};

export const generateAdminExcelReport = (stats, students) => {
    const overviewRows = [
        ['FAP NextGen - Administrative Report', ''],
        ['Generated on', formatDate()],
        ['Confidentiality', 'Confidential - For Official Use Only'],
        [],
        ['Metric', 'Count'],
        ['Total Students', stats.totalStudents || 0],
        ['Total Teachers', stats.totalTeachers || 0],
        ['Families Adopted', stats.totalFamilies || 0],
        ['Reflections Submitted', stats.totalReflections || 0],
        ['Reflections Graded', stats.gradedReflections || 0],
        ['Pending Review', stats.pendingReflections || 0]
    ];

    const studentHeaders = [
        'Rank',
        'Student Name',
        'Registration Number',
        'Email',
        'Year',
        'Year of Joining',
        'Mentor',
        'Families',
        'Submitted Reflections',
        'Mentor Verified',
        'Avg Score'
    ];

    const studentRows = students.length > 0
        ? students.map((s, index) => [
            index + 1,
            s.full_name || '-',
            s.registration_number || 'N/A',
            s.email || '-',
            s.year || '-',
            s.year_of_joining || '-',
            s.mentor?.full_name || '-',
            s.familyCount || 0,
            s.reflectionCount || 0,
            s.gradedCount || 0,
            s.avgScore || '-'
        ])
        : [['-', 'No active students found', '-', '-', '-', '-', '-', '-', '-', '-', '-']];

    const overviewSheetRows = overviewRows.map((row, idx) => {
        if (idx === 0) return excelRow(row, 'Title');
        if (idx === 4) return excelRow(row, 'Header');
        return excelRow(row);
    });

    const studentSheetRows = [
        excelRow(studentHeaders, 'Header'),
        ...studentRows.map(row => excelRow(row))
    ];

    const workbookXml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
    xmlns:o="urn:schemas-microsoft-com:office:office"
    xmlns:x="urn:schemas-microsoft-com:office:excel"
    xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
    <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
        <Title>FAP NextGen Administrative Report</Title>
        <Subject>Registered Students Work Summary</Subject>
        <Author>FAP NextGen</Author>
        <Created>${new Date().toISOString()}</Created>
    </DocumentProperties>
    <Styles>
        <Style ss:ID="Title">
            <Font ss:Bold="1" ss:Size="14" ss:Color="#0F766E"/>
        </Style>
        <Style ss:ID="Header">
            <Font ss:Bold="1" ss:Color="#FFFFFF"/>
            <Interior ss:Color="#0F766E" ss:Pattern="Solid"/>
        </Style>
    </Styles>
    ${excelWorksheet('Overview', overviewSheetRows, [190, 130])}
    ${excelWorksheet('Registered Students', studentSheetRows, [55, 190, 135, 210, 80, 105, 190, 75, 130, 110, 85])}
</Workbook>`;

    const blob = new Blob(['\uFEFF', workbookXml], { type: 'application/vnd.ms-excel;charset=utf-8' });
    downloadBlobFile(`FAP_Admin_Report_${formatFileDate()}.xls`, blob);
};

export const generateClassReport = (students, className = 'Assigned Class') => {
    const doc = new jsPDF();

    doc.setFontSize(20);
    doc.setTextColor(15, 118, 110);
    doc.text('FAP NextGen - Class Performance Report', 14, 22);

    doc.setFontSize(12);
    doc.setTextColor(80);
    doc.text(`Cohort: ${className}`, 14, 32);

    doc.setFontSize(10);
    doc.text(`Date: ${formatDate()}`, 14, 38);

    const tableData = students.map((s) => [
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

    const finalY = doc.lastAutoTable.finalY + 15;
    doc.setFontSize(10);
    doc.text(`Total Students: ${students.length}`, 14, finalY);

    doc.text('Signature of Faculty Mentor:', 14, finalY + 20);
    doc.line(60, finalY + 20, 120, finalY + 20);

    doc.save(`FAP_Class_Report_${className.replace(/\s+/g, '_')}.pdf`);
};

export const generateAdminLocalStaffReport = (stats, students, language = 'kn') => {
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
        `${t.registeredStudents}:`
    ];

    students.forEach((s, idx) => {
        lines.push(
            `${idx + 1}. ${t.studentName}: ${s.full_name || '-'} | ${t.regNo}: ${s.registration_number || '-'} | ${t.families}: ${s.familyCount || 0} | ${t.reflections}: ${s.reflectionCount || 0} | ${t.graded}: ${s.gradedCount || 0} | ${t.score}: ${s.avgScore || '-'}`
        );
    });

    lines.push('', t.note);
    const suffix = language === 'hi' ? 'Hindi' : 'Kannada';
    downloadTextFile(`FAP_Admin_Local_Staff_Report_${suffix}_${formatFileDate()}.txt`, lines.join('\n'));
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
    downloadTextFile(`FAP_Class_Local_Staff_Report_${suffix}_${formatFileDate()}.txt`, lines.join('\n'));
};
