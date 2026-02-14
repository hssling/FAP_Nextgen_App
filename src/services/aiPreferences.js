import { get, set } from 'idb-keyval';

export const AI_FALLBACK_MODE_KEY = 'fap_ai_fallback_mode';
export const AI_MICRO_PIPELINE_ENABLED_KEY = 'fap_ai_micro_pipeline_enabled';

export const AI_FALLBACK_MODES = {
    preferredOnly: 'preferred_only',
    preferredThenDefault: 'preferred_then_default',
    allConfigured: 'all_configured'
};

export const getAiFallbackMode = async () => {
    const mode = await get(AI_FALLBACK_MODE_KEY);
    return mode || AI_FALLBACK_MODES.allConfigured;
};

export const setAiFallbackMode = async (mode) => {
    await set(AI_FALLBACK_MODE_KEY, mode);
    return mode;
};

export const getMicroPipelineEnabled = async () => {
    const value = await get(AI_MICRO_PIPELINE_ENABLED_KEY);
    if (typeof value === 'boolean') return value;
    return true;
};

export const setMicroPipelineEnabled = async (enabled) => {
    const next = Boolean(enabled);
    await set(AI_MICRO_PIPELINE_ENABLED_KEY, next);
    return next;
};
