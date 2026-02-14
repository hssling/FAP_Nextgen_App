import { callProviderChat } from './aiClient';
import { AI_PROVIDERS, DEFAULT_AI_PROVIDER, getConfiguredProviderKeys } from './aiProviders';

const SECTION_KEYS = [
    'description',
    'feelings',
    'evaluation',
    'analysis',
    'conclusion',
    'action_plan'
];

const MIN_SECTION_WORDS = 12;
const MIN_TOTAL_WORDS = 80;
const MAX_EXTRACTION_ATTEMPTS = 2;

const normalizeStageValue = (value) => {
    if (typeof value !== 'string') return '';
    return value.trim();
};

const countWords = (value) => {
    if (!value || typeof value !== 'string') return 0;
    return value
        .trim()
        .split(/\s+/)
        .filter(Boolean).length;
};

const parseStructuredResponse = (rawText) => {
    if (!rawText) throw new Error('Empty response from AI provider');

    const fencedMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const candidate = (fencedMatch?.[1] || rawText).trim();
    const jsonStart = candidate.indexOf('{');
    const jsonEnd = candidate.lastIndexOf('}');
    if (jsonStart < 0 || jsonEnd <= jsonStart) {
        throw new Error('AI response did not contain valid JSON');
    }

    return JSON.parse(candidate.slice(jsonStart, jsonEnd + 1));
};

const clamp01 = (value) => Math.min(1, Math.max(0, Number(value) || 0));

const isRecoverableProviderError = (error) => {
    const msg = String(error?.message || '').toLowerCase();
    return (
        msg.includes('provider returned error') ||
        msg.includes('temporarily unavailable') ||
        msg.includes('service unavailable') ||
        msg.includes('upstream error') ||
        msg.includes('bad gateway') ||
        msg.includes('timeout') ||
        msg.includes('429') ||
        msg.includes('rate limit')
    );
};

const normalizeSectionsFromParsed = (parsed) => {
    const sectionSource = parsed?.sections && typeof parsed.sections === 'object' ? parsed.sections : parsed;
    return {
        description: normalizeStageValue(sectionSource?.description),
        feelings: normalizeStageValue(sectionSource?.feelings),
        evaluation: normalizeStageValue(sectionSource?.evaluation),
        analysis: normalizeStageValue(sectionSource?.analysis),
        conclusion: normalizeStageValue(sectionSource?.conclusion),
        action_plan: normalizeStageValue(sectionSource?.action_plan || sectionSource?.actionPlan)
    };
};

const normalizeConfidenceFromParsed = (parsed) => ({
    description: clamp01(parsed?.confidence?.description),
    feelings: clamp01(parsed?.confidence?.feelings),
    evaluation: clamp01(parsed?.confidence?.evaluation),
    analysis: clamp01(parsed?.confidence?.analysis),
    conclusion: clamp01(parsed?.confidence?.conclusion),
    action_plan: clamp01(parsed?.confidence?.action_plan || parsed?.confidence?.actionPlan)
});

const buildProviderFallbackOrder = async (preferredProviderKey) => {
    const configured = await getConfiguredProviderKeys();
    if (!configured.length) return [];

    const order = [];
    const add = (key) => {
        if (configured.includes(key) && !order.includes(key)) order.push(key);
    };

    add(preferredProviderKey);
    add(DEFAULT_AI_PROVIDER);
    configured.forEach(add);

    return order;
};

const buildMissingSections = (sections) => {
    return SECTION_KEYS.filter((key) => !sections[key]);
};

const buildFlags = (sections, missingSections) => {
    const flags = [];
    const totalWords = SECTION_KEYS.reduce((sum, key) => sum + countWords(sections[key]), 0);

    if (totalWords < MIN_TOTAL_WORDS) {
        flags.push({
            code: 'LOW_TOTAL_WORDS',
            level: 'warning',
            message: `Reflection text appears brief (${totalWords} words).`
        });
    }

    missingSections.forEach((key) => {
        flags.push({
            code: `MISSING_${key.toUpperCase()}`,
            level: 'critical',
            message: `${key.replace('_', ' ')} section is missing.`
        });
    });

    SECTION_KEYS.forEach((key) => {
        const wordCount = countWords(sections[key]);
        if (sections[key] && wordCount < MIN_SECTION_WORDS) {
            flags.push({
                code: `SHORT_${key.toUpperCase()}`,
                level: 'warning',
                message: `${key.replace('_', ' ')} section may be too short (${wordCount} words).`
            });
        }
    });

    return flags;
};

const systemPrompt = `You are an expert medical education mentor. Extract only what is explicitly present in the learner text and map it to Gibbs Reflective Cycle.
Return strict JSON only with this schema:
{
  "description": "string",
  "feelings": "string",
  "evaluation": "string",
  "analysis": "string",
  "conclusion": "string",
  "action_plan": "string",
  "confidence": {
    "description": 0.0,
    "feelings": 0.0,
    "evaluation": 0.0,
    "analysis": 0.0,
    "conclusion": 0.0,
    "action_plan": 0.0
  }
}
Rules:
- Use only learner text.
- Do not invent facts.
- Keep wording close to original.
- Use empty string for missing stages.
- Confidence must be between 0 and 1.`;

export const extractGibbsFromText = async ({
    text,
    providerKey,
    selectedModelIndex = 0,
    controller
}) => {
    const cleanText = (text || '').trim();
    if (!cleanText) throw new Error('No text provided for Gibbs extraction');

    const providerOrder = await buildProviderFallbackOrder(providerKey);
    if (!providerOrder.length) {
        const noProviderError = new Error('NO_PROVIDER_KEYS');
        noProviderError.code = 'NO_PROVIDER_KEYS';
        throw noProviderError;
    }

    let lastError = null;

    for (let providerIndex = 0; providerIndex < providerOrder.length; providerIndex += 1) {
        const providerToUse = providerOrder[providerIndex];
        const modelIndexToUse = providerToUse === providerKey ? selectedModelIndex : 0;

        for (let attempt = 1; attempt <= MAX_EXTRACTION_ATTEMPTS; attempt += 1) {
            try {
                const rawResponse = await callProviderChat({
                    providerKey: providerToUse,
                    selectedModelIndex: modelIndexToUse,
                    controller,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        {
                            role: 'user',
                            content: `Student reflection text:\n\n${cleanText}`
                        }
                    ]
                });

                const parsed = parseStructuredResponse(rawResponse);
                const sections = normalizeSectionsFromParsed(parsed);
                const confidence = normalizeConfidenceFromParsed(parsed);
                const missingSections = buildMissingSections(sections);
                const flags = buildFlags(sections, missingSections);
                const provider = AI_PROVIDERS[providerToUse];
                const model = provider?.models?.[modelIndexToUse] || provider?.models?.[0];

                return {
                    sections,
                    confidence,
                    missingSections,
                    flags,
                    provider: provider?.name || providerToUse,
                    providerKey: providerToUse,
                    model: model?.id || 'unknown',
                    rawResponse
                };
            } catch (err) {
                lastError = err;
                const msg = String(err?.message || '');
                const isKeyError = msg === 'API_KEY_REQUIRED' || msg === 'API_KEY_INVALID';
                const canRetrySameProvider = attempt < MAX_EXTRACTION_ATTEMPTS && isRecoverableProviderError(err);
                const hasNextProvider = providerIndex < providerOrder.length - 1;

                if (isKeyError && hasNextProvider) break;
                if (canRetrySameProvider) continue;
                if (isRecoverableProviderError(err) && hasNextProvider) break;
                throw err;
            }
        }
    }

    throw lastError || new Error('Gibbs extraction failed');
};
