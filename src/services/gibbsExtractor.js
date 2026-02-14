import { callProviderChat } from './aiClient';
import { AI_PROVIDERS } from './aiProviders';

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

    const rawResponse = await callProviderChat({
        providerKey,
        selectedModelIndex,
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
    const sections = {
        description: normalizeStageValue(parsed.description),
        feelings: normalizeStageValue(parsed.feelings),
        evaluation: normalizeStageValue(parsed.evaluation),
        analysis: normalizeStageValue(parsed.analysis),
        conclusion: normalizeStageValue(parsed.conclusion),
        action_plan: normalizeStageValue(parsed.action_plan)
    };

    const confidence = {
        description: Number(parsed?.confidence?.description) || 0,
        feelings: Number(parsed?.confidence?.feelings) || 0,
        evaluation: Number(parsed?.confidence?.evaluation) || 0,
        analysis: Number(parsed?.confidence?.analysis) || 0,
        conclusion: Number(parsed?.confidence?.conclusion) || 0,
        action_plan: Number(parsed?.confidence?.action_plan) || 0
    };

    const missingSections = buildMissingSections(sections);
    const flags = buildFlags(sections, missingSections);
    const provider = AI_PROVIDERS[providerKey];
    const model = provider?.models?.[selectedModelIndex] || provider?.models?.[0];

    return {
        sections,
        confidence,
        missingSections,
        flags,
        provider: provider?.name || providerKey,
        model: model?.id || 'unknown',
        rawResponse
    };
};
