import { get, set } from 'idb-keyval';
import { AI_KEY_STORE_KEY } from './aiProviders';

export const getAllSavedAiKeys = async () => {
    const keys = (await get(AI_KEY_STORE_KEY)) || {};
    return keys;
};

export const saveAiProviderKey = async (providerKey, apiKey) => {
    const keys = (await get(AI_KEY_STORE_KEY)) || {};
    const next = { ...keys };

    if (apiKey && apiKey.trim()) {
        next[providerKey] = apiKey.trim();
    } else {
        delete next[providerKey];
    }

    await set(AI_KEY_STORE_KEY, next);
    return next;
};

export const clearAiProviderKey = async (providerKey) => {
    return saveAiProviderKey(providerKey, '');
};
