import React, { useCallback, useState, useEffect } from 'react';
import { Page, Text, View, Document, StyleSheet, PDFDownloadLink } from '@react-pdf/renderer';
import { supabase } from '../../services/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import { useFamilies } from '../../hooks/useFamilies';
import { get, set } from 'idb-keyval';
import formRegistry from '../../data/forms/registry.json';

const getFormTitle = (formId) => formRegistry.find((form) => form.form_id === formId)?.title || formId;

const normalizeLegacyAssessment = (member, assessment) => ({
    id: assessment.id ? String(assessment.id) : `${member.id}-${assessment.formId}-${assessment.date}`,
    member_id: member.id,
    memberName: member.name,
    formId: assessment.formId,
    title: getFormTitle(assessment.formId),
    date: assessment.date,
    source: 'Legacy',
    legacyId: assessment.id ? String(assessment.id) : ''
});

const normalizeDbAssessment = (memberMap, row) => {
    const member = memberMap[row.member_id] || {};
    return {
        id: row.id,
        member_id: row.member_id,
        memberName: member.name || 'Unknown',
        formId: row.form_id,
        title: getFormTitle(row.form_id),
        date: row.assessment_date,
        source: row.visit_id ? 'Assessment + Visit' : 'Assessment',
        legacyId: row.legacy_assessment_id || ''
    };
};

const mergeAssessmentRows = (members, normalizedRows) => {
    const memberMap = Object.fromEntries((members || []).map((member) => [member.id, member]));
    const normalized = (normalizedRows || []).map((row) => normalizeDbAssessment(memberMap, row));
    const normalizedKeys = new Set(
        normalized.map((row) => `${row.member_id}|${row.formId}|${row.date}|${row.legacyId || ''}`)
    );

    const legacy = (members || []).flatMap((member) => (
        member.health_data?.assessments || []
    ).map((assessment) => normalizeLegacyAssessment(member, assessment)));

    return [
        ...normalized,
        ...legacy.filter((row) => !normalizedKeys.has(`${row.member_id}|${row.formId}|${row.date}|${row.legacyId || ''}`))
    ].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
};

// PDF Styles
const styles = StyleSheet.create({
    page: { flexDirection: 'column', backgroundColor: '#ffffff', padding: 30 },
    header: { marginBottom: 20, paddingBottom: 10, borderBottom: '1px solid #e2e8f0' },
    title: { fontSize: 20, textAlign: 'center', color: '#1e293b', marginBottom: 5, fontWeight: 'bold' },
    subtitle: { fontSize: 16, marginTop: 15, marginBottom: 8, color: '#334155', borderBottom: '1px solid #f1f5f9', paddingBottom: 2, fontWeight: 'bold' },
    text: { fontSize: 10, marginBottom: 4, lineHeight: 1.4, color: '#475569' },
    label: { width: 120, fontSize: 10, color: '#64748b', fontWeight: 'bold' },
    row: { flexDirection: 'row', marginBottom: 4 },
    value: { fontSize: 10, color: '#0f172a', flex: 1 },
    tableHeader: { flexDirection: 'row', backgroundColor: '#f8fafc', padding: 5, borderBottom: '1px solid #e2e8f0' },
    tableRow: { flexDirection: 'row', padding: 5, borderBottom: '1px solid #f1f5f9' },
    col1: { width: '25%' },
    col2: { width: '40%' },
    col3: { width: '35%' },
    colDate: { width: '18%' },
    colMember: { width: '22%' },
    colAssessment: { width: '42%' },
    colSource: { width: '18%' },
    footer: { position: 'absolute', bottom: 30, left: 30, right: 30, fontSize: 8, textAlign: 'center', color: '#94a3b8' }
});

// PDF Document Component
const FamilyReportDocument = ({ family, members, visits, assessments, studentName }) => (
    <Document>
        <Page size="A4" style={styles.page}>
            <View style={styles.header}>
                <Text style={styles.title}>Family Health Folder</Text>
                <Text style={{ fontSize: 10, textAlign: 'center', color: '#64748b' }}>Department of Community Medicine</Text>
            </View>

            <View style={{ marginBottom: 15 }}>
                <View style={styles.row}>
                    <Text style={styles.label}>Student Name:</Text>
                    <Text style={styles.value}>{studentName || 'Medical Student'}</Text>
                </View>
                <View style={styles.row}>
                    <Text style={styles.label}>Report Date:</Text>
                    <Text style={styles.value}>{new Date().toLocaleDateString()}</Text>
                </View>
            </View>

            <Text style={styles.subtitle}>Family Profile</Text>
            <View style={styles.row}>
                <Text style={styles.label}>Head of Family:</Text>
                <Text style={styles.value}>{family.head_name}</Text>
            </View>
            <View style={styles.row}>
                <Text style={styles.label}>Village/Location:</Text>
                <Text style={styles.value}>{family.village}</Text>
            </View>
            <View style={styles.row}>
                <Text style={styles.label}>Total Members:</Text>
                <Text style={styles.value}>{members.length}</Text>
            </View>
            {/* Note: SES Class would come from family.details if we implemented it */}

            <Text style={styles.subtitle}>Family Members</Text>
            <View style={styles.tableHeader}>
                <Text style={[styles.text, styles.col1, { fontWeight: 'bold' }]}>Name</Text>
                <Text style={[styles.text, styles.col1, { fontWeight: 'bold' }]}>Age/Gender</Text>
                <Text style={[styles.text, styles.col2, { fontWeight: 'bold' }]}>Relationship</Text>
            </View>
            {members.map((m, i) => (
                <View key={m.id || `${m.name}-${m.relationship}` || i} style={styles.tableRow}>
                    <Text style={[styles.text, styles.col1]}>{m.name}</Text>
                    <Text style={[styles.text, styles.col1]}>{m.age} / {m.gender}</Text>
                    <Text style={[styles.text, styles.col2]}>{m.relationship}</Text>
                </View>
            ))}

            <Text style={styles.subtitle}>Individual Assessments</Text>
            <View style={styles.tableHeader}>
                <Text style={[styles.text, styles.colDate, { fontWeight: 'bold' }]}>Date</Text>
                <Text style={[styles.text, styles.colMember, { fontWeight: 'bold' }]}>Member</Text>
                <Text style={[styles.text, styles.colAssessment, { fontWeight: 'bold' }]}>Assessment</Text>
                <Text style={[styles.text, styles.colSource, { fontWeight: 'bold' }]}>Source</Text>
            </View>
            {assessments.length === 0 ? (
                <Text style={[styles.text, { padding: 10, fontStyle: 'italic' }]}>No assessments recorded yet.</Text>
            ) : (
                assessments.map((assessment, i) => (
                    <View key={assessment.id || `${assessment.memberName}-${assessment.formId}-${assessment.date}` || i} style={styles.tableRow}>
                        <Text style={[styles.text, styles.colDate]}>{assessment.date || '-'}</Text>
                        <Text style={[styles.text, styles.colMember]}>{assessment.memberName || '-'}</Text>
                        <Text style={[styles.text, styles.colAssessment]}>{assessment.title || assessment.formId || '-'}</Text>
                        <Text style={[styles.text, styles.colSource]}>{assessment.source || '-'}</Text>
                    </View>
                ))
            )}

            <Text style={styles.subtitle}>Visit Logbook</Text>
            <View style={styles.tableHeader}>
                <Text style={[styles.text, styles.col1, { fontWeight: 'bold' }]}>Date</Text>
                <Text style={[styles.text, styles.col2, { fontWeight: 'bold' }]}>Activity</Text>
                <Text style={[styles.text, styles.col3, { fontWeight: 'bold' }]}>Notes</Text>
            </View>
            {visits.length === 0 ? (
                <Text style={[styles.text, { padding: 10, fontStyle: 'italic' }]}>No visits recorded yet.</Text>
            ) : (
                visits.map((v, i) => (
                    <View key={v.id || `${v.visit_date}-${v.activity_type}` || i} style={styles.tableRow}>
                        <Text style={[styles.text, styles.col1]}>{v.visit_date}</Text>
                        <Text style={[styles.text, styles.col2]}>{v.activity_type || 'General Visit'}</Text>
                        <Text style={[styles.text, styles.col3]}>{v.notes || '-'}</Text>
                    </View>
                ))
            )}

            <Text style={styles.footer}>
                Generated by FAP NextGen System | {new Date().getFullYear()}
            </Text>
        </Page>
    </Document>
);

const FamilyReportGenerator = () => {
    const { profile } = useAuth();
    const [selectedFamilyId, setSelectedFamilyId] = useState('');
    const [reportData, setReportData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [isOffline, setIsOffline] = useState(!navigator.onLine);

    // Sync offline status
    useEffect(() => {
        const handleStatus = () => setIsOffline(!navigator.onLine);
        window.addEventListener('online', handleStatus);
        window.addEventListener('offline', handleStatus);
        return () => {
            window.removeEventListener('online', handleStatus);
            window.removeEventListener('offline', handleStatus);
        };
    }, []);

    // Use cached families hook
    const { data: families = [] } = useFamilies(profile?.id);

    const prepareReport = useCallback(async (famId) => {
        setLoading(true);
        try {
            const family = families.find(f => f.id === famId);
            if (!family) throw new Error("Family not found");

            let members = [];
            let visits = [];
            let assessments = [];

            if (!isOffline) {
                // Fetch fresh data
                let { data: mData, error: mError } = await supabase.from('family_members').select('*').eq('family_id', famId).neq('is_deleted', true);
                if (mError) {
                    const fallbackMembers = await supabase.from('family_members').select('*').eq('family_id', famId);
                    mData = fallbackMembers.data;
                }
                const { data: vData } = await supabase.from('family_visits').select('*').eq('family_id', famId).order('visit_date', { ascending: false });
                members = mData || [];
                visits = vData || [];

                const memberIds = members.map((member) => member.id).filter(Boolean);
                let normalizedAssessments = [];
                if (memberIds.length > 0) {
                    const { data: aData, error: aError } = await supabase
                        .from('individual_assessments')
                        .select('id, member_id, form_id, assessment_date, legacy_assessment_id, visit_id')
                        .in('member_id', memberIds)
                        .eq('is_deleted', false)
                        .order('assessment_date', { ascending: false });
                    if (!aError) normalizedAssessments = aData || [];
                }
                assessments = mergeAssessmentRows(members, normalizedAssessments);
                
                // Cache for offline use
                await set(`fap_report_cache_${famId}`, { members, visits, assessments });
            } else {
                // Try to load from cache
                const cached = await get(`fap_report_cache_${famId}`);
                if (cached) {
                    members = cached.members;
                    visits = cached.visits;
                    assessments = cached.assessments || mergeAssessmentRows(cached.members || [], []);
                }
            }

            setReportData({
                family,
                members,
                visits,
                assessments,
                studentName: profile?.full_name || profile?.email
            });
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [families, isOffline, profile?.email, profile?.full_name]);

    useEffect(() => {
        if (selectedFamilyId) {
            prepareReport(selectedFamilyId);
        } else {
            setReportData(null);
        }
    }, [prepareReport, selectedFamilyId]);

    return (
        <div className='tool-card'>
            <h3>Generate Reports</h3>
            <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '1rem' }}>
                Download standardized PDF reports for your logbook or department submission.
            </p>

            <div style={{ marginBottom: '1rem' }}>
                <select
                    className="form-control"
                    value={selectedFamilyId}
                    onChange={e => setSelectedFamilyId(e.target.value)}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                >
                    <option value="">Select Family for Report...</option>
                    {families.map(f => (
                        <option key={f.id} value={f.id}>{f.head_name} - {f.village}</option>
                    ))}
                </select>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
                {selectedFamilyId && reportData && !loading ? (
                    <div style={{ width: '100%' }}>
                        <PDFDownloadLink
                            document={<FamilyReportDocument {...reportData} />}
                            fileName={`FAP_Report_${reportData.family.head_name.replace(/\s+/g, '_')}.pdf`}
                            style={{ textDecoration: 'none' }}
                        >
                            {({ loading: pdfLoading }) =>
                                <button style={{ ...btnStyle, width: '100%' }} disabled={pdfLoading}>
                                    {pdfLoading ? 'Building PDF...' : `Download ${reportData.family.head_name}'s Record`}
                                </button>
                            }
                        </PDFDownloadLink>
                        {isOffline && (
                            <div style={{ fontSize: '0.75rem', color: '#C2410C', marginTop: '0.5rem', textAlign: 'center' }}>
                                ⚠️ Offline Mode: Record generated from local cache
                            </div>
                        )}
                    </div>
                ) : (
                    <button style={{ ...btnStyle, opacity: 0.5, cursor: 'not-allowed', width: '100%' }} disabled>
                        {loading ? 'Crunching Numbers...' : 'Select a Family to Generate'}
                    </button>
                )}
            </div>
        </div>
    );
};

const btnStyle = {
    backgroundColor: 'var(--color-primary)',
    color: 'white',
    padding: '0.75rem 1rem',
    border: 'none',
    borderRadius: '0.5rem',
    cursor: 'pointer',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.95rem'
};

export default FamilyReportGenerator;
