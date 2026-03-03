/**
 * A simple seeded random number generator (Mulberry32).
 * @param {number} seed - The seed value.
 * @returns {function} A function that returns a random number between 0 and 1.
 */
export const createSeededRandom = (seed) => {
    return () => {
        let t = seed += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
};

/**
 * Shuffles an array using a seeded random number generator.
 * @param {Array} array - The array to shuffle.
 * @param {number} seed - The seed value.
 * @returns {Array} A new shuffled array.
 */
export const seededShuffle = (array, seed) => {
    const random = createSeededRandom(seed);
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
};

/**
 * Gets a seed based on the current date (YYYY-MM-DD).
 * @returns {number} The numeric seed.
 */
export const getDailySeed = () => {
    const today = new Date().toISOString().split('T')[0]; // "YYYY-MM-DD"
    let hash = 0;
    for (let i = 0; i < today.length; i++) {
        const char = today.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0; // Convert to 32bit integer
    }
    return Math.abs(hash);
};
