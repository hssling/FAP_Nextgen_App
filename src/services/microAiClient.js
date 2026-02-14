const BASE_URL = import.meta.env.VITE_MICRO_AI_BASE_URL || 'http://localhost:8000';

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
