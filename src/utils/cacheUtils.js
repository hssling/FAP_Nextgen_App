// Cache Management Utility
// Use this to invalidate analytics cache when data changes
import { del, keys } from 'idb-keyval';

export const invalidateAnalyticsCache = (profileId) => {
    const cacheKey = `analytics_${profileId}`;
    sessionStorage.removeItem(cacheKey);
    console.log('[Cache] Analytics cache invalidated for profile:', profileId);
};

export const invalidateReflectionsCache = (profileId) => {
    const cacheKey = `reflections_cache_${profileId}`;
    sessionStorage.removeItem(cacheKey);
    console.log('[Cache] Reflections cache invalidated for profile:', profileId);
};

export const clearAllCaches = (profileId) => {
    invalidateAnalyticsCache(profileId);
    invalidateReflectionsCache(profileId);
    console.log('[Cache] All caches cleared for profile:', profileId);
};

export const clearClientCaches = async () => {
    const sessionPrefixes = [
        'analytics_',
        'reflections_cache_',
        'fap_villages_session_',
        'teacher_classroom_session_',
        'teacher_student_drawer_session_',
        'admin_dashboard_session_'
    ];

    const idbPrefixes = [
        'analytics_persistent_',
        'fap_reflections_full_',
        'fap_family_',
        'fap_members_',
        'fap_visits_',
        'fap_villages_',
        'teacher_classroom_',
        'teacher_student_drawer_',
        'admin_dashboard_',
        'reactQuery'
    ];

    let sessionRemoved = 0;
    for (let i = sessionStorage.length - 1; i >= 0; i -= 1) {
        const key = sessionStorage.key(i);
        if (key && sessionPrefixes.some((prefix) => key.startsWith(prefix))) {
            sessionStorage.removeItem(key);
            sessionRemoved += 1;
        }
    }

    let idbRemoved = 0;
    const idbKeys = await keys();
    await Promise.all(idbKeys.map(async (key) => {
        if (typeof key === 'string' && idbPrefixes.some((prefix) => key.startsWith(prefix))) {
            await del(key);
            idbRemoved += 1;
        }
    }));

    return { sessionRemoved, idbRemoved };
};
