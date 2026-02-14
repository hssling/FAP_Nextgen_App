const BASE_URL = import.meta.env.VITE_MICRO_AI_BASE_URL || 'http://localhost:8000';
const MICRO_AI_TIMEOUT_MS = 120000;
const MICRO_AI_POLL_MS = 2000;

export const isMicroAiConfigured = () => {
    return Boolean(import.meta.env.VITE_MICRO_AI_BASE_URL);
};

export const ingestMicroAiFile = async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${BASE_URL}/v1/ingest`, {
        method: 'POST',
        body: formData
    });

    if (!response.ok) {
        const message = await response.text();
        throw new Error(message || `Ingest failed: ${response.status}`);
    }

    return response.json();
};

export const getMicroAiJob = async (jobId) => {
    const response = await fetch(`${BASE_URL}/v1/job/${jobId}`);
    if (!response.ok) {
        const message = await response.text();
        throw new Error(message || `Job fetch failed: ${response.status}`);
    }
    return response.json();
};

export const getMicroAiResult = async (jobId) => {
    const response = await fetch(`${BASE_URL}/v1/result/${jobId}`);
    if (!response.ok) {
        const message = await response.text();
        throw new Error(message || `Result fetch failed: ${response.status}`);
    }
    return response.json();
};

const normalizeMicroAiResult = (result) => {
    const payload = result?.payload || result?.data || result || {};
    const gibbs = payload?.gibbs || payload?.sections || payload?.result?.gibbs || null;
    if (!gibbs) throw new Error('Micro-AI returned no Gibbs payload');

    const stage = (key, alt) =>
        gibbs?.[key]?.text ||
        gibbs?.[key] ||
        gibbs?.[alt]?.text ||
        gibbs?.[alt] ||
        '';

    return {
        sections: {
            description: stage('description'),
            feelings: stage('feelings'),
            evaluation: stage('evaluation'),
            analysis: stage('analysis'),
            conclusion: stage('conclusion'),
            action_plan: stage('action_plan', 'actionPlan')
        },
        gibbs: payload?.gibbs || null,
        confidence: payload?.confidence || result?.confidence || null,
        quality_checks: payload?.quality_checks || result?.quality_checks || null,
        disclaimer: payload?.disclaimer || result?.disclaimer || null,
        provider: result?.provider || payload?.provider || 'Micro-AI Service',
        model: result?.model || payload?.model || 'remote-pipeline'
    };
};

export const runMicroAiGibbsPipeline = async ({ file, timeoutMs = MICRO_AI_TIMEOUT_MS }) => {
    if (!file) throw new Error('File required for Micro-AI ingestion');
    const ingest = await ingestMicroAiFile(file);
    const jobId = ingest?.job_id || ingest?.id;
    if (!jobId) throw new Error('Micro-AI ingest did not return a job id');

    const startedAt = Date.now();
    while (Date.now() - startedAt < timeoutMs) {
        const job = await getMicroAiJob(jobId);
        const status = String(job?.status || '').toLowerCase();

        if (status === 'completed' || status === 'succeeded' || status === 'done') {
            const result = await getMicroAiResult(jobId);
            const normalized = normalizeMicroAiResult(result);
            return {
                jobId,
                status: 'completed',
                ...normalized,
                telemetry: {
                    source: 'micro_ai_service',
                    elapsedMs: Date.now() - startedAt
                }
            };
        }

        if (status === 'failed' || status === 'error') {
            throw new Error(job?.error_message || 'Micro-AI job failed');
        }

        await new Promise((resolve) => setTimeout(resolve, MICRO_AI_POLL_MS));
    }

    throw new Error('Micro-AI job timed out');
};
