export const CONSENT_DOCUMENT_VERSION = 'fap-dpdp-health-ai-v1-2026-05-28';

export const CONSENT_NOTICE = {
    version: CONSENT_DOCUMENT_VERSION,
    title: 'FAP NextGen Digital Consent, Privacy and Responsible Use Notice',
    effectiveDate: '2026-05-28',
    summary: [
        'I understand that FAP NextGen processes my profile, role, academic and Family Adoption Programme records for lawful educational, mentoring, reporting and approved research purposes.',
        'I understand that family, member, visit, health measurement and reflection data may include personal and health-related information and must be entered only for authorised FAP work.',
        'I agree to the use of role-based access, audit logs, DPDP-aligned privacy safeguards and institutional review processes for protecting this data.',
        'I understand that AI features are decision-support and learning-support tools only, not a substitute for qualified clinical judgement, diagnosis or emergency care.',
        'I understand that aggregated or anonymised data may be used for institutional quality improvement, public-health learning, grant reporting or ethics-approved research.',
        'I understand that app data may be stored in Supabase cloud databases, browser/device cache for offline use, protected logs, exports and approved backups according to institutional policy.',
        'I know that I may contact the institution/app administrator for access, correction, grievance, withdrawal or deletion requests subject to academic, legal and research-retention duties.',
    ],
    sections: [
        {
            heading: 'Purpose of data processing',
            body: 'FAP NextGen is used to digitise Family Adoption Programme workflows, mentor-student supervision, community diagnosis, logbook generation, competency-linked learning, reflective writing and programme analytics. Data is processed for lawful educational, administrative, quality-improvement and ethics-approved research purposes.',
        },
        {
            heading: 'Data categories',
            body: 'The system may process user profile details, academic role details, family and household records, family-member demographics, visit notes, health measurements, community profile data, reflective writing, mentor feedback, messages, AI metadata, audit logs and report/export metadata.',
        },
        {
            heading: 'Sensitive health and family information',
            body: 'Family and member data may include health-related information. Users must enter only accurate, authorised and necessary information, avoid unnecessary identifiers in free text, and follow institutional consent/guardian-consent processes for household and minor-related records.',
        },
        {
            heading: 'Access and security controls',
            body: 'The app uses authenticated access, role-based workflows, Supabase Row Level Security, mentor-student mapping, audit-friendly timestamps and controlled reports. Users must not share credentials, export data without authorisation, or use downloaded records outside approved academic or institutional purposes.',
        },
        {
            heading: 'Storage and hosting',
            body: 'Application data may be stored in the configured Supabase project database and storage services, deployment/runtime logs, approved backups and authorised report exports. Limited app data may also be stored in this browser or device through IndexedDB, local/session storage, React Query persistence and PWA cache to support low-connectivity field use.',
        },
        {
            heading: 'Local device and offline storage',
            body: 'Offline and cache features improve rural-field reliability but require device discipline. Users should keep devices locked, avoid shared/public devices for identifiable data, clear local cache when leaving a device, and immediately report lost devices or suspected unauthorised access.',
        },
        {
            heading: 'Retention and deletion',
            body: 'Records may be retained for academic supervision, audit, legal, grant, research, publication and institutional quality-assurance purposes. Deletion or withdrawal requests will be reviewed against these obligations. Where identifiable retention is not required, the institution should use de-identification, anonymisation or aggregate reporting.',
        },
        {
            heading: 'AI and automated assistance',
            body: 'AI features may help with reflection analysis, Gibbs-cycle segmentation, educational feedback, quality checks and community medicine learning prompts. AI output is decision support only, may be wrong or incomplete, and must be reviewed by students, mentors or qualified clinicians before use.',
        },
        {
            heading: 'AI provider and third-party processing',
            body: 'Depending on configuration, AI requests may be processed through approved providers or a server-side institutional pathway. Users should avoid entering unnecessary identifiers into AI prompts. Production deployments should prefer institution-controlled API keys, provider allowlists and de-identification rules where feasible.',
        },
        {
            heading: 'Exports, downloads and backups',
            body: 'Reports, logbooks, consent registers and backups may contain personal or health-related information. Downloaded files must be stored only on authorised devices, shared only with authorised faculty/admin/research teams, and protected according to institutional confidentiality rules.',
        },
        {
            heading: 'DPDP and user rights',
            body: 'The notice is designed around India’s Digital Personal Data Protection framework. Users may request access, correction, grievance review, consent withdrawal or deletion through institutional/app administrators, subject to academic, legal, safety, audit and ethics-approved research obligations.',
        },
        {
            heading: 'Security incident reporting',
            body: 'Users must promptly report suspected data loss, unauthorised access, wrong-recipient sharing, lost devices, exposed API keys, unusual account activity or other security incidents to the app/institution administrator so the institution can assess DPDP, CERT-In and local reporting obligations.',
        },
        {
            heading: 'Research, reporting and anonymisation',
            body: 'Identifiable data is restricted to authorised workflows. Aggregated, de-identified or anonymised outputs may be used for reports, ICMR grant documentation, publications, quality improvement, public-health learning or approved research after institutional and ethics review where required.',
        },
        {
            heading: 'User responsibility',
            body: 'By accepting, the user confirms that they will use FAP NextGen only for authorised FAP-related academic and institutional work, respect confidentiality, follow mentor/admin instructions, report suspected data incidents promptly and keep local device access secure.',
        },
    ],
    acknowledgementText:
        'I have read and understood the FAP NextGen Digital Consent, Privacy and Responsible Use Notice. I agree to use the app according to the above conditions and institutional policies.',
};

export const getConsentSummaryItems = () => CONSENT_NOTICE.summary;

export const buildConsentAcceptancePayload = ({
    userId,
    source,
    userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
    metadata = {},
}) => ({
    user_id: userId,
    consent_version: CONSENT_DOCUMENT_VERSION,
    acceptance_source: source,
    user_agent: userAgent,
    metadata,
});

export const recordConsentAcceptance = async (supabase, options) => {
    if (!supabase) throw new Error('Supabase client is not available.');

    const payload = buildConsentAcceptancePayload(options);
    const { data, error } = await supabase
        .from('user_consent_acceptances')
        .insert([payload])
        .select()
        .single();

    if (error) throw error;
    return data;
};

export const getCurrentConsentAcceptance = async (supabase, userId) => {
    if (!supabase || !userId) return null;

    const { data, error } = await supabase
        .from('user_consent_acceptances')
        .select('*')
        .eq('user_id', userId)
        .eq('consent_version', CONSENT_DOCUMENT_VERSION)
        .order('accepted_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error) throw error;
    return data;
};

export const listConsentAcceptances = async (supabase) => {
    if (!supabase) return [];

    const { data, error } = await supabase
        .from('user_consent_acceptances')
        .select('*')
        .order('accepted_at', { ascending: false });

    if (error) throw error;
    return data || [];
};

export const consentNoticeToPlainText = () => {
    const lines = [
        CONSENT_NOTICE.title,
        `Version: ${CONSENT_NOTICE.version}`,
        `Effective date: ${CONSENT_NOTICE.effectiveDate}`,
        '',
        'Summary',
        ...CONSENT_NOTICE.summary.map((item, index) => `${index + 1}. ${item}`),
        '',
        'Detailed notice',
        ...CONSENT_NOTICE.sections.flatMap((section, index) => [
            `${index + 1}. ${section.heading}`,
            section.body,
            '',
        ]),
        'Acknowledgement',
        CONSENT_NOTICE.acknowledgementText,
    ];
    return lines.join('\n');
};

export const downloadTextFile = (filename, text, type = 'text/plain') => {
    const blob = new Blob([text], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
};
