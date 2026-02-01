# ABDM Integration Plan (Direct Gateway) — HIP + HIU, User-Initiated Linking

Status: Planning document (no credentials yet).

This plan covers:
- ABHA linking only (no ABHA creation inside the app).
- Direct ABDM Gateway integration.
- HIP + HIU roles.
- User‑initiated discovery/linking.
- Care contexts at both Family and Visit level.

## 1) Prerequisites
1. Obtain ABDM sandbox credentials (client_id/client_secret, gateway base URL).
2. Register facility in HFR and obtain HIP ID.
3. Confirm gateway technical docs (Swagger/PDF) and security requirements.
4. Decide data format (FHIR bundle variants and HI types supported).

## 2) Core Concepts Mapped to FAP
Care context types:
- Family care context: stable longitudinal record for a family.
- Visit care context: each visit/assessment as a separate context.

Internal mapping:
- patient_ref: FAP member or student‑assigned family/member identity.
- care_context_ref: family_id or visit_id.

## 3) Minimal Data Model Additions
Suggested table: abdm_links
- id (uuid)
- patient_ref (string/uuid; links to your internal patient/member)
- abha_address (string)
- abha_number (string, optional)
- hip_id (string)
- care_context_ref (string)
- care_context_type (enum: family|visit)
- link_status (enum: pending|linked|revoked)
- linked_at (timestamp)
- updated_at (timestamp)

Suggested table: abdm_consents
- id (uuid)
- consent_artifact_id (string)
- patient_ref
- hip_id
- hiu_id (if relevant)
- status (active|revoked|expired)
- valid_from / valid_to
- data_push_status (pending|success|failed)

## 4) HIP Responsibilities (User-Initiated)
1. Discovery request handler (care context discovery).
2. Discovery response with unlinked care contexts (family + visit).
3. Link init (OTP request).
4. Link confirm (OTP verify + link creation).
5. Store link mapping for future data sharing.

## 5) HIP Data Sharing (Consent-Based)
1. Receive consent artifact.
2. Validate consent scope and validity.
3. Prepare data bundle for requested HI types.
4. Push data to HIU as per gateway spec.
5. Record push status and notify consent manager if required.

## 6) HIU Responsibilities
1. Create consent request (scope, date range, HI types).
2. Receive consent artifact.
3. Request data from HIPs (gateway flow).
4. Receive and store data (securely).

## 7) Endpoint Checklist (Placeholders)
NOTE: Exact paths + payloads will be filled once gateway docs/credentials are available.

HIP:
- POST /discover
- POST /link/init
- POST /link/confirm
- POST /consent/notify
- POST /data/push

HIU:
- POST /consent/request
- POST /consent/notify
- POST /data/request
- POST /data/push (receiver)

## 8) Implementation Order (Safe & Staged)
Phase 1: Schema + minimal storage
- Add abdm_links and abdm_consents tables.
- Add server-side secrets management (env vars).

Phase 2: HIP discovery + linking
- Implement discovery handler.
- Implement link init/confirm with OTP flow.
- Store care_context links.

Phase 3: HIP consent + data push
- Accept consent artifact.
- Build data export (family + visit bundles).
- Implement data push + audit trail.

Phase 4: HIU consent + data pull
- Build consent request UI.
- Implement data request and receive.
- Store/visualize external records.

Phase 5: Monitoring + audit
- Logs, retries, reconciliation.
- Consent expiry handling.

## 9) Security & Compliance Checklist
- Encrypt secrets at rest (CI/CD + hosting).
- Validate ABHA input (format + checksum rules).
- Audit trail for linking + data push.
- Consent expiry enforcement.
- PHI access controls for students/roles.

## 10) What Is Needed From the Client
- Sandbox credentials + gateway base URL.
- HIP ID + HFR registration.
- Gateway documentation (Swagger/PDF).
- Approved HI types + data format expectations.

