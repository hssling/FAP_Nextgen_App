export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const withRetry = async (operation, options = {}) => {
    const {
        retries = 2,
        delayMs = 350,
        backoffMultiplier = 2,
        shouldRetry = () => true
    } = options;

    let attempt = 0;
    let currentDelay = delayMs;
    let lastError;

    while (attempt <= retries) {
        try {
            return await operation();
        } catch (error) {
            lastError = error;
            if (attempt >= retries || !shouldRetry(error)) break;
            await sleep(currentDelay);
            currentDelay *= backoffMultiplier;
            attempt += 1;
        }
    }

    throw lastError;
};
