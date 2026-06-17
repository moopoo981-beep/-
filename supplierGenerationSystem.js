// /home/enovo/eee/js/supplierGenerationSystem.js - New module for dynamic supplier generation.
'use strict';

import { getGameState, updateSuppliers, addEventLogEntry, PART_CATEGORIES } from './gameState.js';
import { createSupplier as originalCreateSupplier, createPart } from './supplierSystem.js'; // Original function
import { generateId, clamp } from './utils.js'; // Assuming utils.js has generateId

// --- Configuration Constants ---

/**
 * Defines the rarity tiers for suppliers and their weights.
 */
const SUPPLIER_TIERS = {
    SMALL_WORKSHOP: { name: "Small Workshop", weight: 40, partQualityModifier: -10, priceModifier: 0.9, rarity: 1 },
    REGIONAL_CONTRACTOR: { name: "Regional Contractor", weight: 30, partQualityModifier: 0, priceModifier: 1.0, rarity: 2 },
    MILITARY_INDUSTRIAL_COMPLEX: { name: "Military Industrial Complex", weight: 20, partQualityModifier: 15, priceModifier: 1.1, rarity: 3 },
    BLACK_MARKET_DEALER: { name: "Black Market Dealer", weight: 10, partQualityModifier: 5, priceModifier: 0.7, rarity: 4 }, // Unique, might have risky parts
};

/**
 * Defines personality modifiers for suppliers.
 */
const SUPPLIER_PERSONALITIES_MODS = {
    GREEDY: { name: "Greedy", weight: 25, priceMultiplier: 1.2, durabilityMultiplier: 1.0, negotiationDifficulty: 1.3 },
    DESPERATE: { name: "Desperate", weight: 20, priceMultiplier: 0.8, durabilityMultiplier: 0.9, negotiationDifficulty: 0.7 },
    GOVERNMENT_BACKED: { name: "Government-Backed", weight: 15, priceMultiplier: 1.1, durabilityMultiplier: 1.1, negotiationDifficulty: 1.1 },
    RISKY: { name: "Risky", weight: 10, priceMultiplier: 0.95, durabilityMultiplier: 0.8, negotiationDifficulty: 0.8 }, // Might offer good deals on less reliable parts
    BALANCED: { name: "Balanced", weight: 30, priceMultiplier: 1.0, durabilityMultiplier: 1.0, negotiationDifficulty: 1.0 },
};

// --- Helper Functions ---

/**
 * Selects an item from a weighted list.
 * @param {object} weightedList Object with items and their 'weight' property.
 * @returns {object} The selected item.
 */
function selectWeightedRandom(weightedList) {
    let totalWeight = 0;
    for (const itemKey in weightedList) {
        if (Object.prototype.hasOwnProperty.call(weightedList, itemKey)) {
            totalWeight += weightedList[itemKey].weight;
        }
    }

    let randomNumber = Math.random() * totalWeight;
    for (const itemKey in weightedList) {
        if (Object.prototype.hasOwnProperty.call(weightedList, itemKey)) {
            randomNumber -= weightedList[itemKey].weight;
            if (randomNumber <= 0) {
                return weightedList[itemKey];
            }
        }
    }
    return weightedList[Object.keys(weightedList)[0]]; // Fallback
}

/**
 * Counts the total number of ENGINE parts across all suppliers in a list.
 * @param {Array<object>} suppliersList A list of supplier objects.
 * @returns {number} The total count of ENGINE parts.
 */
function countEngineParts(suppliersList) {
    try {
        if (!Array.isArray(suppliersList)) return 0;
        return suppliersList.reduce((total, supplier) => {
            if (!supplier || !Array.isArray(supplier.parts)) return total;
            return total + supplier.parts.filter(part => part && part.category === PART_CATEGORIES.ENGINE).length;
        }, 0);
    } catch (error) {
        console.warn("supplierGenerationSystem: Error counting ENGINE parts:", error.message);
        return 0; // Defensive
    }
}

/**
 * Generates a name for a supplier based on its tier.
 * @param {object} tier The supplier tier object.
 * @returns {string} A generated name.
 */
function generateSupplierName(tier) {
    const prefixes = ["Global", "Advanced", "Apex", "Elite", "Prime", "Dynamic", "Omni", "Stealth", "Quantum", "Hyper"];
    const suffixes = ["Systems", "Dynamics", "Solutions", "Corp", "Industries", "Forge", "Labs", "Tech", "Ventures"];
    const baseNames = ["Defense", "Military", "Tactical", "Strategic", "Security", "Alliance"];

    let name = "";
    try {
        switch (tier.name) {
            case SUPPLIER_TIERS.SMALL_WORKSHOP.name:
                name = `${prefixes[Math.floor(Math.random() * prefixes.length)]} Workshop`;
                break;
            case SUPPLIER_TIERS.REGIONAL_CONTRACTOR.name:
                name = `${prefixes[Math.floor(Math.random() * prefixes.length)]} ${baseNames[Math.floor(Math.random() * baseNames.length)]} Contractors`;
                break;
            case SUPPLIER_TIERS.MILITARY_INDUSTRIAL_COMPLEX.name:
                name = `${prefixes[Math.floor(Math.random() * prefixes.length)]} ${baseNames[Math.floor(Math.random() * baseNames.length)]} ${suffixes[Math.floor(Math.random() * suffixes.length)]}`;
                break;
            case SUPPLIER_TIERS.BLACK_MARKET_DEALER.name:
                name = `ShadowNet ${suffixes[Math.floor(Math.random() * suffixes.length)]}`;
                break;
            default:
                name = `Generic ${suffixes[Math.floor(Math.random() * suffixes.length)]}`;
                break;
        }
    } catch (error) {
        console.warn("supplierGenerationSystem: Error generating supplier name:", error.message);
        name = "Unknown Vendor"; // Fallback name
    }
    return name;
}

// --- Main Generation Logic ---

/**
 * Generates a single dynamic supplier with a tier and personality.
 * This wraps the original createSupplier logic to apply modifiers.
 * @returns {object} A new supplier object.
 */
function generateDynamicSupplier() {
    try {
        const selectedTier = selectWeightedRandom(SUPPLIER_TIERS);
        const selectedPersonality = selectWeightedRandom(SUPPLIER_PERSONALITIES_MODS);

        const supplierName = generateSupplierName(selectedTier);
        const supplierId = generateId();

        // Call original createSupplier with the new name and ID
        // The originalCreateSupplier function will generate parts based on its internal logic.
        const originalSupplier = originalCreateSupplier();

        // Ensure originalSupplier and its parts array are valid
        if (!originalSupplier || !Array.isArray(originalSupplier.parts)) {
            console.warn("supplierGenerationSystem: originalCreateSupplier returned invalid data. Falling back.");
            return originalCreateSupplier();
        }

        // Apply tier and personality modifiers to parts
        const modifiedParts = originalSupplier.parts.map(part => {
            // Validate part properties before modification
            const baseQuality = typeof part.quality === 'number' ? part.quality : 50;
            const baseDurability = typeof part.durability === 'number' ? part.durability : 50;
            const baseCost = typeof part.cost === 'number' ? part.cost : 1000;

            let newQuality = clamp(baseQuality + selectedTier.partQualityModifier, 1, 100);
            let newDurability = clamp(baseDurability * selectedPersonality.durabilityMultiplier, 1, 100);
            let newCost = Math.round(baseCost * selectedTier.priceModifier * selectedPersonality.priceMultiplier);

            // Tier-specific adjustments
            if (selectedTier.name === SUPPLIER_TIERS.BLACK_MARKET_DEALER.name) {
                if (Math.random() < 0.2) { // 20% chance of a "faulty" part for black market
                    newDurability = Math.max(1, newDurability - (Math.random() * 20));
                    newCost = Math.round(newCost * 0.8); // Further discount
                    addEventLogEntry({ message: `SUPPLIER ALERT: ${supplierName} offered a potentially faulty part!`, type: 'warning' });
                }
            }
            
            // Personality-specific adjustments
            if (selectedPersonality.name === SUPPLIER_PERSONALITIES_MODS.RISKY.name) {
                if (Math.random() < 0.1) { // 10% chance of durability hit for risky personality
                    newDurability = Math.max(1, newDurability - (Math.random() * 10));
                    addEventLogEntry({ message: `SUPPLIER WARNING: ${supplierName} known for risky parts.`, type: 'warning' });
                }
            }

            return {
                ...part,
                quality: newQuality,
                durability: newDurability,
                cost: newCost,
                negotiationDifficulty: selectedPersonality.negotiationDifficulty // Attach for future negotiation logic
            };
        });

        return {
            ...originalSupplier,
            id: supplierId, // Ensure unique ID
            name: supplierName,
            tier: selectedTier.name,
            personality: selectedPersonality.name,
            parts: modifiedParts
        };
    } catch (error) {
        console.warn("supplierGenerationSystem: Error generating dynamic supplier:", error.message);
        addEventLogEntry({ message: `SYSTEM WARNING: Failed to generate a supplier. ${error.message}`, type: 'warning' });
        // Fallback to originalCreateSupplier without modifiers if error occurs
        return originalCreateSupplier("Fallback Supplier", generateId());
    }
}

function ensurePartCategory(suppliersList, category, minCount, maxAttempts) {
    const countParts = (list) => {
        if (!Array.isArray(list)) return 0;
        return list.reduce((total, supplier) => {
            if (!supplier || !Array.isArray(supplier.parts)) return total;
            return total + supplier.parts.filter(part => part && part.category === category).length;
        }, 0);
    };

    let currentCount = countParts(suppliersList);
    let attempts = 0;

    while (currentCount < minCount && attempts < maxAttempts) {
        const additionalSupplier = generateDynamicSupplier();
        const hasPart = additionalSupplier && Array.isArray(additionalSupplier.parts) &&
            additionalSupplier.parts.some(part => part && part.category === category);

        if (hasPart) {
            suppliersList.push(additionalSupplier);
            addEventLogEntry({ message: `MARKET UPDATE: Added supplier to meet ${category} part quota.`, type: 'info' });
        }
        currentCount = countParts(suppliersList);
        attempts++;
    }

    let forceAttempts = 0;
    const MAX_FORCE_ATTEMPTS = 50;
    while (currentCount < minCount && forceAttempts < MAX_FORCE_ATTEMPTS) {
        try {
            let supplierFound = false;
            while (!supplierFound && forceAttempts < MAX_FORCE_ATTEMPTS) {
                const forcedAdditionalSupplier = generateDynamicSupplier();
                if (forcedAdditionalSupplier && Array.isArray(forcedAdditionalSupplier.parts) &&
                    forcedAdditionalSupplier.parts.some(part => part && part.category === category)) {
                    suppliersList.push(forcedAdditionalSupplier);
                    addEventLogEntry({ message: `MARKET UPDATE: Forcibly added a ${category} supplier to meet quota.`, type: 'info' });
                    supplierFound = true;
                }
                forceAttempts++;
            }
            if (!supplierFound) {
                console.error(`supplierGenerationSystem: CRITICAL: Failed to force-generate ${category} supplier after max force attempts.`);
                addEventLogEntry({ message: `SYSTEM ERROR: Failed to guarantee ${category} part quota.`, type: 'error' });
                break;
            }
        } catch (error) {
            console.error(`supplierGenerationSystem: Error in fallback ${category} generation:`, error.message);
            addEventLogEntry({ message: `SYSTEM ERROR: Error forcing ${category} part generation. ${error.message}`, type: 'error' });
            break;
        }
        currentCount = countParts(suppliersList);
    }
    return currentCount;
}

/**
 * Generates the daily list of suppliers (3-6 per day).
 * @returns {Array<object>} An array of generated supplier objects.
 */
export function generateDailySuppliers() {
    try {
        let suppliersList = []; // Initialize as empty array

        // Generate initial 5 suppliers to ensure "ของจะต้องครบ" (items must be complete)
        for (let i = 0; i < 20; i++) {
            suppliersList.push(generateDynamicSupplier());
        }

        const engineCount = ensurePartCategory(suppliersList, PART_CATEGORIES.ENGINE, 2, 20);
        const controlCount = ensurePartCategory(suppliersList, PART_CATEGORIES.CONTROL, 3, 20);
        const radarCount = ensurePartCategory(suppliersList, PART_CATEGORIES.RADAR, 2, 20);
        const armorPlatingCount = ensurePartCategory(suppliersList, PART_CATEGORIES.ARMOR_PLATING, 2, 20);
        const payloadSystemCount = ensurePartCategory(suppliersList, PART_CATEGORIES.PAYLOAD_SYSTEM, 2, 20);

        addEventLogEntry({ message: `MARKET UPDATE: ${suppliersList.length} suppliers entered the market (Total ENGINE parts: ${engineCount}, Total CONTROL parts: ${controlCount}, Total RADAR parts: ${radarCount}, Total ARMOR_PLATING parts: ${armorPlatingCount}, Total PAYLOAD_SYSTEM parts: ${payloadSystemCount}).`, type: 'info' });
        return suppliersList;
    } catch (error) {
        console.error("supplierGenerationSystem: Critical error in generateDailySuppliers:", error.message);
        addEventLogEntry({ message: `SYSTEM ERROR: Failed to generate daily suppliers. ${error.message}`, type: 'error' });
        return []; // Return empty array on critical failure
    }
}
