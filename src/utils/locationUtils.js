/**
 * Utility to get current GPS location with high accuracy
 */
export const getCurrentLocation = () => {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error("Geolocation is not supported by your browser"));
            return;
        }

        const options = {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        };

        navigator.geolocation.getCurrentPosition(
            (position) => {
                resolve({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    accuracy: position.coords.accuracy,
                    timestamp: position.timestamp
                });
            },
            (error) => {
                let errorMsg = "Failed to get location";
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        errorMsg = "Location permission denied";
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMsg = "Location information is unavailable";
                        break;
                    case error.TIMEOUT:
                        errorMsg = "Location request timed out";
                        break;
                }
                reject(new Error(errorMsg));
            },
            options
        );
    });
};

/**
 * Checks if location permission is granted
 */
export const checkLocationPermission = async () => {
    if (!navigator.permissions) return 'unknown';
    try {
        const result = await navigator.permissions.query({ name: 'geolocation' });
        return result.state; // 'granted', 'prompt', 'denied'
    } catch {
        return 'unknown';
    }
};
