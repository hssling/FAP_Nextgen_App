import { get } from 'idb-keyval';

export const AI_KEY_STORE_KEY = 'fap_ai_provider_keys';

export const AI_PROVIDERS = {
    openrouter: {
        name: 'OpenRouter',
        description: 'Many free and paid models in one place',
        apiKeyEnv: 'VITE_OPENROUTER_API_KEY',
        endpoint: 'https://openrouter.ai/api/v1/chat/completions',
        signupUrl: 'https://openrouter.ai/keys',
        instructions: 'Create an API key in OpenRouter dashboard',
        models: [
            { id: 'google/gemma-2-9b-it:free', name: 'Gemma 2 9B (Free)', speed: 'Fast' },
            { id: 'meta-llama/llama-3.2-3b-instruct:free', name: 'Llama 3.2 3B (Free)', speed: 'Very Fast' },
            { id: 'mistralai/mistral-7b-instruct:free', name: 'Mistral 7B (Free)', speed: 'Fast' },
            { id: 'qwen/qwen-2-7b-instruct:free', name: 'Qwen 2 7B (Free)', speed: 'Fast' },
            { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini', speed: 'Fast' }
        ]
    },
    google: {
        name: 'Google AI Studio',
        description: 'Gemini models (free tier available)',
        apiKeyEnv: 'VITE_GOOGLE_AI_KEY',
        endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent',
        signupUrl: 'https://aistudio.google.com/app/apikey',
        instructions: 'Generate API key in Google AI Studio',
        models: [
            { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', speed: 'Very Fast' },
            { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', speed: 'Fast' }
        ]
    },
    groq: {
        name: 'Groq',
        description: 'Very fast open models (free tier)',
        apiKeyEnv: 'VITE_GROQ_API_KEY',
        endpoint: 'https://api.groq.com/openai/v1/chat/completions',
        signupUrl: 'https://console.groq.com/keys',
        instructions: 'Create an API key in Groq Console',
        models: [
            { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B Instant', speed: 'Instant' },
            { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B', speed: 'Very Fast' }
        ]
    },
    xai: {
        name: 'xAI (Grok)',
        description: 'Grok models by xAI',
        apiKeyEnv: 'VITE_XAI_API_KEY',
        endpoint: 'https://api.x.ai/v1/chat/completions',
        signupUrl: 'https://console.x.ai/',
        instructions: 'Generate API key in xAI Console',
        models: [
            { id: 'grok-2-latest', name: 'Grok 2', speed: 'Fast' },
            { id: 'grok-beta', name: 'Grok Beta', speed: 'Fast' }
        ]
    },
    mistral: {
        name: 'Mistral AI',
        description: 'Native Mistral models',
        apiKeyEnv: 'VITE_MISTRAL_API_KEY',
        endpoint: 'https://api.mistral.ai/v1/chat/completions',
        signupUrl: 'https://console.mistral.ai/',
        instructions: 'Create key in Mistral La Plateforme',
        models: [
            { id: 'mistral-small-latest', name: 'Mistral Small', speed: 'Fast' },
            { id: 'mistral-medium-latest', name: 'Mistral Medium', speed: 'Fast' },
            { id: 'mistral-large-latest', name: 'Mistral Large', speed: 'Fast' }
        ]
    },
    cerebras: {
        name: 'Cerebras',
        description: 'Ultra-fast inference models',
        apiKeyEnv: 'VITE_CEREBRAS_API_KEY',
        endpoint: 'https://api.cerebras.ai/v1/chat/completions',
        signupUrl: 'https://cloud.cerebras.ai/',
        instructions: 'Create key in Cerebras Cloud',
        models: [
            { id: 'llama3.1-8b', name: 'Llama 3.1 8B', speed: 'Instant' },
            { id: 'llama3.1-70b', name: 'Llama 3.1 70B', speed: 'Very Fast' }
        ]
    },
    together: {
        name: 'Together AI',
        description: 'Open source models (free credits on signup)',
        apiKeyEnv: 'VITE_TOGETHER_API_KEY',
        endpoint: 'https://api.together.xyz/v1/chat/completions',
        signupUrl: 'https://api.together.xyz/settings/api-keys',
        instructions: 'Generate API key in Together dashboard',
        models: [
            { id: 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo', name: 'Llama 3.1 8B Turbo', speed: 'Fast' },
            { id: 'mistralai/Mixtral-8x7B-Instruct-v0.1', name: 'Mixtral 8x7B', speed: 'Fast' }
        ]
    },
    huggingface: {
        name: 'Hugging Face',
        description: 'Inference API and open models',
        apiKeyEnv: 'VITE_HUGGINGFACE_API_KEY',
        endpoint: 'https://api-inference.huggingface.co/v1/chat/completions',
        signupUrl: 'https://huggingface.co/settings/tokens',
        instructions: 'Create a token with inference permission',
        models: [
            { id: 'meta-llama/Llama-3.1-8B-Instruct', name: 'Llama 3.1 8B', speed: 'Medium' },
            { id: 'mistralai/Mistral-7B-Instruct-v0.3', name: 'Mistral 7B', speed: 'Medium' }
        ]
    },
    openai: {
        name: 'OpenAI',
        description: 'GPT models',
        apiKeyEnv: 'VITE_OPENAI_API_KEY',
        endpoint: 'https://api.openai.com/v1/chat/completions',
        signupUrl: 'https://platform.openai.com/api-keys',
        instructions: 'Generate secret key in OpenAI dashboard',
        models: [
            { id: 'gpt-4o-mini', name: 'GPT-4o Mini', speed: 'Fast' },
            { id: 'gpt-4.1-mini', name: 'GPT-4.1 Mini', speed: 'Fast' }
        ]
    },
    anthropic: {
        name: 'Anthropic',
        description: 'Claude models',
        apiKeyEnv: 'VITE_ANTHROPIC_API_KEY',
        endpoint: 'https://api.anthropic.com/v1/messages',
        signupUrl: 'https://console.anthropic.com/settings/keys',
        instructions: 'Create API key in Anthropic Console',
        models: [
            { id: 'claude-3-5-haiku-latest', name: 'Claude 3.5 Haiku', speed: 'Fast' },
            { id: 'claude-3-7-sonnet-latest', name: 'Claude 3.7 Sonnet', speed: 'Medium' }
        ]
    }
};

export const DEFAULT_AI_PROVIDER = 'openrouter';

export const getProviderApiKey = async (providerKey) => {
    const provider = AI_PROVIDERS[providerKey];
    if (!provider) return null;

    const store = (await get(AI_KEY_STORE_KEY)) || {};
    const savedKey = store[providerKey];
    if (savedKey && savedKey.trim().length > 10) {
        return savedKey.trim();
    }

    const envKeyName = provider.apiKeyEnv;
    let envValue = import.meta.env[envKeyName];
    if (!envValue && providerKey === 'xai') {
        envValue = import.meta.env.VITE_xAI_API_KEY;
    }
    if (envValue && envValue.trim().length > 10) {
        return envValue.trim();
    }

    return null;
};

export const getConfiguredProviderKeys = async () => {
    const entries = Object.entries(AI_PROVIDERS);
    const configured = [];

    for (let i = 0; i < entries.length; i += 1) {
        const [providerKey] = entries[i];
        const key = await getProviderApiKey(providerKey);
        if (key) configured.push(providerKey);
    }

    return configured;
};
