import { AI_PROVIDERS, getProviderApiKey } from './aiProviders';

const throwIfBadResponse = async (response, defaultPrefix) => {
    if (response.ok) return;
    const payload = await response.json().catch(() => ({}));
    const message = payload?.error?.message || payload?.message || `${defaultPrefix}: ${response.status}`;
    throw new Error(message);
};

const normalizeOpenAiStyleResponse = (data) => {
    return data?.choices?.[0]?.message?.content || data?.choices?.[0]?.text || null;
};

const callGoogle = async (apiKey, messages, controller, selectedModelIndex = 0) => {
    const provider = AI_PROVIDERS.google;
    const model = provider.models[selectedModelIndex] || provider.models[0];
    const contents = messages
        .filter((m) => m.role !== 'system')
        .map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }));

    const systemInstruction = messages.find((m) => m.role === 'system')?.content || '';

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model.id}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents,
            systemInstruction: { parts: [{ text: systemInstruction }] },
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 1000
            }
        }),
        signal: controller?.signal
    });

    await throwIfBadResponse(response, 'Google AI Error');
    const data = await response.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || 'No response received.';
};

const callAnthropic = async (apiKey, messages, controller, selectedModelIndex = 0) => {
    const provider = AI_PROVIDERS.anthropic;
    const model = provider.models[selectedModelIndex] || provider.models[0];
    const system = messages.find((m) => m.role === 'system')?.content || '';
    const chatMessages = messages
        .filter((m) => m.role !== 'system')
        .map((m) => ({
            role: m.role === 'assistant' ? 'assistant' : 'user',
            content: [{ type: 'text', text: m.content }]
        }));

    const response = await fetch(provider.endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
            model: model.id,
            system,
            max_tokens: 1000,
            temperature: 0.7,
            messages: chatMessages
        }),
        signal: controller?.signal
    });

    await throwIfBadResponse(response, 'Anthropic Error');
    const data = await response.json();
    return data?.content?.[0]?.text || 'No response received.';
};

const callOpenAiCompatible = async (providerKey, apiKey, messages, controller, selectedModelIndex = 0) => {
    const provider = AI_PROVIDERS[providerKey];
    if (!provider) throw new Error('Unsupported provider selected');

    const preferredModel = provider.models[selectedModelIndex] || provider.models[0];
    const fallbackModels = provider.models.filter((m) => m.id !== preferredModel.id);
    const modelsToTry = [preferredModel, ...fallbackModels];
    const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
    };

    if (providerKey === 'openrouter') {
        headers['HTTP-Referer'] = window.location.origin;
        headers['X-Title'] = 'FAP Medical Coach';
    }

    let lastError = null;
    for (let i = 0; i < modelsToTry.length; i += 1) {
        const model = modelsToTry[i];
        try {
            const response = await fetch(provider.endpoint, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    model: model.id,
                    messages,
                    temperature: 0.7,
                    max_tokens: 1000
                }),
                signal: controller?.signal
            });

            await throwIfBadResponse(response, `${provider.name} Error`);
            const data = await response.json();
            return normalizeOpenAiStyleResponse(data) || 'No response received.';
        } catch (err) {
            lastError = err;
            const msg = (err?.message || '').toLowerCase();
            const isRecoverable =
                msg.includes('no endpoints found') ||
                msg.includes('rate limit') ||
                msg.includes('429') ||
                msg.includes('temporarily unavailable');

            if (!isRecoverable || i === modelsToTry.length - 1) {
                throw err;
            }
        }
    }

    throw lastError || new Error(`${provider.name} Error`);
};

export const hasProviderKey = async (providerKey) => {
    const key = await getProviderApiKey(providerKey);
    return Boolean(key);
};

export const callProviderChat = async ({ providerKey, messages, controller, selectedModelIndex = 0 }) => {
    const apiKey = await getProviderApiKey(providerKey);
    if (!apiKey) throw new Error('API_KEY_REQUIRED');

    if (providerKey === 'google') {
        return callGoogle(apiKey, messages, controller, selectedModelIndex);
    }

    if (providerKey === 'anthropic') {
        return callAnthropic(apiKey, messages, controller, selectedModelIndex);
    }

    return callOpenAiCompatible(providerKey, apiKey, messages, controller, selectedModelIndex);
};
