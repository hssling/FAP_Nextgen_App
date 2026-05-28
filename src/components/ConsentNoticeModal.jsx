import React, { useMemo, useState } from 'react';
import { CheckCircle2, Download, ShieldCheck, X } from 'lucide-react';
import {
    CONSENT_NOTICE,
    consentNoticeToPlainText,
    downloadTextFile,
    getConsentSummaryItems,
} from '../services/consentService';

const ConsentNoticeModal = ({
    open,
    onClose,
    onAccept,
    acceptedRecord,
    accepting = false,
}) => {
    const [checked, setChecked] = useState(false);
    const summaryItems = useMemo(() => getConsentSummaryItems(), []);

    if (!open) return null;

    const handleDownload = () => {
        downloadTextFile(
            `FAP_NextGen_Digital_Consent_${CONSENT_NOTICE.version}.txt`,
            consentNoticeToPlainText()
        );
    };

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="consent-modal-title"
            style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(15, 23, 42, 0.58)',
                zIndex: 1000,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '1rem'
            }}
        >
            <div
                style={{
                    width: 'min(920px, 100%)',
                    maxHeight: '92vh',
                    background: '#FFFFFF',
                    borderRadius: '14px',
                    boxShadow: '0 24px 80px rgba(15, 23, 42, 0.35)',
                    display: 'grid',
                    gridTemplateRows: 'auto 1fr auto',
                    overflow: 'hidden'
                }}
            >
                <header
                    style={{
                        padding: '1.25rem 1.5rem',
                        borderBottom: '1px solid #E5E7EB',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        gap: '1rem'
                    }}
                >
                    <div>
                        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', marginBottom: '0.35rem' }}>
                            <ShieldCheck size={22} color="#0F766E" />
                            <span style={{ color: '#0F766E', fontSize: '0.78rem', fontWeight: 800, letterSpacing: '0.04em' }}>
                                DIGITAL CONSENT NOTICE
                            </span>
                        </div>
                        <h2 id="consent-modal-title" style={{ margin: 0, fontSize: '1.35rem', color: '#111827' }}>
                            {CONSENT_NOTICE.title}
                        </h2>
                        <p style={{ margin: '0.35rem 0 0', color: '#6B7280', fontSize: '0.85rem' }}>
                            Version {CONSENT_NOTICE.version} | Effective {CONSENT_NOTICE.effectiveDate}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close consent notice"
                        style={{ padding: '0.35rem', borderRadius: '8px', color: '#64748B' }}
                    >
                        <X size={22} />
                    </button>
                </header>

                <main style={{ padding: '1.25rem 1.5rem', overflowY: 'auto' }}>
                    {acceptedRecord && (
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.65rem',
                                padding: '0.85rem 1rem',
                                borderRadius: '10px',
                                background: '#ECFDF5',
                                border: '1px solid #A7F3D0',
                                color: '#065F46',
                                marginBottom: '1rem'
                            }}
                        >
                            <CheckCircle2 size={20} />
                            <div>
                                <strong>Accepted</strong>
                                <div style={{ fontSize: '0.82rem' }}>
                                    {new Date(acceptedRecord.accepted_at).toLocaleString()} via {acceptedRecord.acceptance_source}
                                </div>
                            </div>
                        </div>
                    )}

                    <section style={{ marginBottom: '1rem' }}>
                        <h3 style={{ fontSize: '1rem', margin: '0 0 0.65rem', color: '#111827' }}>What you are agreeing to</h3>
                        <div style={{ display: 'grid', gap: '0.55rem' }}>
                            {summaryItems.map((item) => (
                                <div key={item} style={{ display: 'grid', gridTemplateColumns: '22px 1fr', gap: '0.5rem' }}>
                                    <CheckCircle2 size={17} color="#0F766E" style={{ marginTop: '0.12rem' }} />
                                    <p style={{ margin: 0, color: '#374151', fontSize: '0.92rem', lineHeight: 1.5 }}>{item}</p>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section style={{ display: 'grid', gap: '0.75rem' }}>
                        {CONSENT_NOTICE.sections.map((section) => (
                            <div
                                key={section.heading}
                                style={{
                                    border: '1px solid #E5E7EB',
                                    borderRadius: '10px',
                                    padding: '0.85rem 1rem',
                                    background: '#FAFAFA'
                                }}
                            >
                                <h4 style={{ margin: '0 0 0.35rem', fontSize: '0.95rem', color: '#0F766E' }}>{section.heading}</h4>
                                <p style={{ margin: 0, color: '#374151', fontSize: '0.88rem', lineHeight: 1.55 }}>{section.body}</p>
                            </div>
                        ))}
                    </section>
                </main>

                <footer style={{ padding: '1rem 1.5rem', borderTop: '1px solid #E5E7EB', background: '#F8FAFC' }}>
                    {!acceptedRecord && (
                        <label style={{ display: 'flex', gap: '0.65rem', alignItems: 'flex-start', marginBottom: '1rem', color: '#111827' }}>
                            <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => setChecked(e.target.checked)}
                                style={{ marginTop: '0.25rem' }}
                            />
                            <span style={{ fontSize: '0.9rem', lineHeight: 1.45 }}>
                                {CONSENT_NOTICE.acknowledgementText}
                            </span>
                        </label>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <button
                            type="button"
                            className="btn btn-outline"
                            onClick={handleDownload}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                        >
                            <Download size={16} /> Download consent form
                        </button>
                        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                            <button type="button" className="btn btn-outline" onClick={onClose}>
                                Close
                            </button>
                            {!acceptedRecord && (
                                <button
                                    type="button"
                                    className="btn btn-primary"
                                    disabled={!checked || accepting}
                                    onClick={() => onAccept?.()}
                                    style={{ opacity: !checked || accepting ? 0.65 : 1 }}
                                >
                                    {accepting ? 'Recording...' : 'Accept and continue'}
                                </button>
                            )}
                        </div>
                    </div>
                </footer>
            </div>
        </div>
    );
};

export default ConsentNoticeModal;
