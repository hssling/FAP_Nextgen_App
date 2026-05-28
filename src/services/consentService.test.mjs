import assert from 'node:assert/strict';
import {
    CONSENT_DOCUMENT_VERSION,
    CONSENT_NOTICE,
    buildConsentAcceptancePayload,
    getConsentSummaryItems,
} from './consentService.js';

assert.equal(CONSENT_DOCUMENT_VERSION, 'fap-dpdp-health-ai-v1-2026-05-28');
assert.ok(CONSENT_NOTICE.title.includes('FAP NextGen'));
assert.ok(CONSENT_NOTICE.sections.length >= 6);
assert.ok(getConsentSummaryItems().some((item) => item.includes('DPDP')));
assert.ok(getConsentSummaryItems().some((item) => item.includes('AI')));

const payload = buildConsentAcceptancePayload({
    userId: '00000000-0000-0000-0000-000000000001',
    source: 'signup',
    userAgent: 'unit-test',
    metadata: { role: 'student' },
});

assert.deepEqual(payload, {
    user_id: '00000000-0000-0000-0000-000000000001',
    consent_version: CONSENT_DOCUMENT_VERSION,
    acceptance_source: 'signup',
    user_agent: 'unit-test',
    metadata: { role: 'student' },
});

console.log('consentService tests passed');
