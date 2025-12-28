// Cache Management Utility
// Use this to invalidate analytics cache when data changes

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
