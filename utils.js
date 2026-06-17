// utils.js - Contains helper utility functions.
'use strict';

/**
 * Generates a unique ID using a timestamp and random string.
 * @returns {string} A unique ID.
 */
export const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);

/**
 * Clamps a value between a minimum and maximum.
 * @param {number} value The value to clamp.
 * @param {number} min The minimum allowed value.
 * @param {number} max The maximum allowed value.
 * @returns {number} The clamped value.
 */
export function clamp(value, min, max) {
    if (typeof value !== 'number' || typeof min !== 'number' || typeof max !== 'number') {
        console.error('Invalid input for clamp function. All arguments must be numbers.');
        return safeNumber(value, min); // Return original value on error, but ensure it's a number
    }
    return Math.max(min, Math.min(value, max));
}

/**
 * Safely converts a value to a number, with a fallback.
 * @param {*} value The value to convert.
 * @param {number} [fallback=0] The fallback value if conversion fails.
 * @returns {number} The converted number or fallback.
 */
export function safeNumber(value, fallback = 0) {
    const num = Number(value);
    return isNaN(num) ? fallback : num;
}

/**
 * Selects an item from a list based on weighted probabilities.
 * @param {Array<{item: any, weight: number}>} weightedList An array of objects with 'item' and 'weight' properties.
 * @returns {any|null} A randomly selected item, or null if the list is invalid or empty.
 */
export function weightedRandom(weightedList) {
    if (!Array.isArray(weightedList) || weightedList.length === 0) {
        console.error('weightedRandom requires a non-empty array.');
        return null;
    }
    const totalWeight = weightedList.reduce((sum, entry) => sum + safeNumber(entry ? entry.weight : 0, 0), 0);
    if (totalWeight <= 0) {
        console.warn('Total weight for weightedRandom is zero or negative. Returning first item.');
        return weightedList[0] ? weightedList[0].item : null;
    }

    let random = Math.random() * totalWeight;
    for (const entry of weightedList) {
        if (!entry || typeof entry.weight === 'undefined') {
            console.warn('weightedRandom entry missing weight property:', entry);
            continue;
        }
        random -= safeNumber(entry.weight, 0);
        if (random <= 0) {
            return entry.item;
        }
    }
    return weightedList[weightedList.length - 1] ? weightedList[weightedList.length - 1].item : null; // Fallback to last item or null
}

