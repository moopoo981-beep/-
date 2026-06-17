// supplierSystem.js - Manages supplier generation, part creation, and purchase negotiations.
'use strict';

import {
    getGameState, updateCompany, addInventoryItem, removePartFromSupplier, updateSuppliers, addEventLogEntry,
    PART_CATEGORIES, BASE_SUPPLIERS, SUPPLIER_PERSONALITIES, SUPPLIER_PERSONALITY_MODIFIERS, GEOPOLITICAL_RISK_MODIFIER, PART_IMAGE_PATHS, PLACEHOLDER_IMAGE_PATH
} from './gameState.js';
import { generateId, clamp, safeNumber, weightedRandom } from './utils.js';
import { updateDashboardUI, renderSupplierMarket, showNotification } from './uiRenderer.js';
import { updateReputation } from './reputationSystem.js'; // For updating company reputation

/**
 * Creates a new part with random attributes for a given category and tech level.
 * @param {string} category The category of the part (e.g., PART_CATEGORIES.HULL, PART_CATEGORIES.AIRFRAME).
 * @param {number} techLevel The company's tech level, influences quality and durability.
 * @returns {object|null} A new part object with id, name, category, quality, durability, baseCost, imagePath, or null if category is invalid.
 */
export function createPart(category, techLevel) {
    if (!Object.values(PART_CATEGORIES).includes(category)) {
        console.error(`Invalid part category: ${category}`);
        addEventLogEntry({ message: `SYSTEM ERROR: Invalid part category requested: ${category}.`, type: 'error' });
        return null;
    }
    if (typeof techLevel !== 'number' || techLevel < 1) {
        console.error(`Invalid techLevel: ${techLevel}`);
        addEventLogEntry({ message: `SYSTEM ERROR: Invalid techLevel for part creation.`, type: 'error' });
        return null;
    }

    // Base quality and durability influenced by techLevel
    const quality = clamp(Math.floor(Math.random() * 60) + 20 + (techLevel * 2), 0, 100); // 20-80 base, +2 per tech level
    const durability = clamp(Math.floor(Math.random() * 50) + 30 + (techLevel * 1), 0, 100); // 30-80 base, +1 per tech level

    // Base cost, before market/personality modifiers
    const baseCost = clamp((quality * 100 + Math.floor(Math.random() * 500) - 250), 100, 100000); // Base cost between 100 and 100k
    // Part naming conventions
    const partNames = {
        [PART_CATEGORIES.HULL]: ['Reinforced Hull', 'Stealth Hull', 'Modular Hull', 'Heavy Plating'],
        [PART_CATEGORIES.ENGINE]: ['Fusion Engine', 'Warp Drive', 'Ion Thruster', 'Plasma Engine'],
        [PART_CATEGORIES.RADAR]: ['Long-Range Radar', 'Stealth Radar', 'Active Sonar', 'Tactical Scanner'],
        [PART_CATEGORIES.CONTROL]: ['AI Mainframe', 'Neural Network', 'Quantum Processor', 'Guidance System'],
        [PART_CATEGORIES.DEFENSE]: ['Energy Shield', 'Point Defense', 'Missile Interceptor', 'Cloaking Device'],
        // New part categories
        [PART_CATEGORIES.AIRFRAME]: ['Light Airframe', 'Stealth Airframe', 'Composite Airframe'],
        [PART_CATEGORIES.HEAVY_AIRFRAME]: ['Heavy Bomber Frame', 'Strategic Airframe', 'Payload Optimized Frame'],
        [PART_CATEGORIES.PAYLOAD_SYSTEM]: ['Precision Guidance', 'Cluster Bombs', 'Smart Munitions System'],
        [PART_CATEGORIES.CANNON]: ['Kinetic Cannon', 'Railgun', 'Plasma Cannon'],
        [PART_CATEGORIES.ARMOR_PLATING]: ['Reactive Armor', 'Chobham Armor', 'Ceramic Plating'],
    };

    const namePool = partNames[category]; // Re-inserted missing declaration
    const name = namePool && namePool.length > 0 ? namePool[Math.floor(Math.random() * namePool.length)] : `${category} Part`;

    const imageOptions = PART_IMAGE_PATHS[category];
    const imagePath = Array.isArray(imageOptions) && imageOptions.length > 0 ? imageOptions[Math.floor(Math.random() * imageOptions.length)] : PLACEHOLDER_IMAGE_PATH;
    const part = {
        id: generateId(),
        name,
        category,
        quality,
        durability,
        baseCost, // Keep baseCost for modifier calculations in createSupplier
        imagePath
    };

    // Add category-specific properties
    switch(category) {
        case PART_CATEGORIES.ENGINE:
            part.power = clamp(Math.floor(Math.random() * 50) + 30 + (techLevel * 3), 1, 150); // Engine power
            part.fuelEfficiency = clamp(Math.floor(Math.random() * 40) + 50 - (techLevel * 2), 1, 100); // Fuel Efficiency
            part.weight = clamp(Math.floor(Math.random() * 1000) + 500, 100, 2000); // Weight
            break;
        case PART_CATEGORIES.HULL:
        case PART_CATEGORIES.AIRFRAME:
        case PART_CATEGORIES.HEAVY_AIRFRAME:
        case PART_CATEGORIES.ARMOR_PLATING:
            part.weight = clamp(Math.floor(Math.random() * 5000) + 1000, 500, 10000); // Heavier parts
            break;
        // Other categories might have their own properties added here
    }

    return part;
}

/**
 * Creates a new NPC supplier offer, including part generation and personality assignment.
 * @returns {object|null} A supplier object with parts and personality, or null if part creation fails.
 */
export function createSupplier() {
    const currentState = getGameState();
    if (!Array.isArray(BASE_SUPPLIERS) || BASE_SUPPLIERS.length === 0) {
        console.error('BASE_SUPPLIERS is not defined or empty.');
        addEventLogEntry({ message: 'SYSTEM ERROR: No base suppliers defined.', type: 'error' });
        return null;
    }
    const baseSupplier = BASE_SUPPLIERS[Math.floor(Math.random() * BASE_SUPPLIERS.length)];
    let part = createPart(baseSupplier.specialty, currentState.company.techLevel);

    if (!part) {
        return null; // Part creation failed defensively
    }

    // Assign a random personality to the supplier, weighted by personality modifiers
    const weightedPersonalities = Object.keys(SUPPLIER_PERSONALITIES).map(key => ({
        item: SUPPLIER_PERSONALITIES[key],
        weight: SUPPLIER_PERSONALITY_MODIFIERS[SUPPLIER_PERSONALITIES[key]] ? SUPPLIER_PERSONALITY_MODIFIERS[SUPPLIER_PERSONALITIES[key]].weight : 0.1 // Default weight
    }));
    const personality = weightedRandom(weightedPersonalities) || SUPPLIER_PERSONALITIES.CONSERVATIVE; // Fallback to conservative
    const personalityModifier = SUPPLIER_PERSONALITY_MODIFIERS[personality] || SUPPLIER_PERSONALITY_MODIFIERS.DEFAULT;

    // Calculate final cost and actual cost based on market, personality, and geopolitical factors
    const steelFactor = (part.category === PART_CATEGORIES.HULL || part.category === PART_CATEGORIES.ENGINE || part.category === PART_CATEGORIES.ARMOR_PLATING) ? currentState.market.steelIndex : 1.0;
    const electronicsFactor = (part.category === PART_CATEGORIES.RADAR || part.category === PART_CATEGORIES.CONTROL) ? currentState.market.electronicsIndex : 1.0;
    const generalMarketFactor = (steelFactor + electronicsFactor) / 2;

    const geopoliticalCostModifier = currentState.market.geopoliticalTension > GEOPOLITICAL_RISK_MODIFIER.CRITICAL_THRESHOLD ? GEOPOLITICAL_RISK_MODIFIER.SUPPLIER_COST_BOOST : 1.0;

    let finalCost = part.baseCost * generalMarketFactor * personalityModifier.price * geopoliticalCostModifier;
    finalCost = clamp(finalCost, 1, Infinity); // Clamp finalCost not to be less than 1
    part.cost = safeNumber(Math.round(finalCost / 10) * 10, 100); // Round to nearest 10, min 100
    part.actualCost = safeNumber(Math.round(part.cost * (0.8 + Math.random() * 0.4)), part.cost); // Actual cost is 80-120% of asking

    // Adjust quality/durability based on personality (for the part offered)
    part.quality = clamp(safeNumber(part.quality) * personalityModifier.qualityBoost, 0, 100);
    part.durability = clamp(safeNumber(part.durability) * personalityModifier.durabilityBoost, 0, 100);

    return {
        id: generateId(),
        name: baseSupplier.name,
        parts: [part],
        negotiationRound: 0,
        personality: personality,
    };
}

/**
 * Handles the player's attempt to purchase a part from a supplier.
 * @param {object} supplier The supplier NPC object.
 * @param {object} part The part object being offered.
 * @param {number} offer The player's offered price.
 */
export function negotiatePurchase(supplier, part, offer) {
    if (!supplier || typeof supplier.id !== 'string' || !part || typeof part.id !== 'string' || typeof offer !== 'number' || offer < 0) {
        console.error('Invalid input for negotiatePurchase:', { supplier, part, offer });
        showNotification("SYSTEM ERROR: INVALID NEGOTIATION ATTEMPT. CHECK CONSOLE.", "error");
        addEventLogEntry({ message: "SYSTEM ERROR: Invalid input for purchase negotiation.", type: 'error' });
        return;
    }

    const currentState = getGameState();
    if (currentState.inventory.length >= currentState.company.storageCapacity) {
        showNotification("WAREHOUSE IS FULL! CANNOT PURCHASE MORE PARTS.", "error");
        addEventLogEntry({ message: "PURCHASE FAILED: Warehouse is full.", type: 'warning' });
        return;
    }
    if (currentState.company.money < offer) {
        showNotification("INSUFFICIENT FUNDS FOR THAT OFFER!", "error");
        addEventLogEntry({ message: "PURCHASE FAILED: Insufficient funds.", type: 'warning' });
        return;
    }

    const actualPrice = safeNumber(part.actualCost, part.cost);
    const offerRatio = offer / actualPrice;
    const personalityModifier = SUPPLIER_PERSONALITY_MODIFIERS[supplier.personality] || SUPPLIER_PERSONALITY_MODIFIERS.DEFAULT;
    const negotiationDifficulty = safeNumber(personalityModifier.negotiationDifficulty, 1.0);

    // Update negotiation round immutably
    const updatedSuppliers = currentState.suppliers.map(s => {
        if (s && s.id === supplier.id) {
            return { ...s, negotiationRound: safeNumber(s.negotiationRound, 0) + 1 };
        }
        return s;
    }).filter(s => s !== null); // Filter out any null suppliers

    updateSuppliers(updatedSuppliers);

    let responseMessage = '';
    let negotiationConcluded = false;
    let counterOfferValue = 0;

    // Dynamic negotiation logic based on personality and negotiationDifficulty
    if (offerRatio * negotiationDifficulty >= 0.95) { // Adjusted acceptance threshold
        negotiationConcluded = true; // Accepted
    } else if (offerRatio * negotiationDifficulty < 0.5) { // Adjusted rejection threshold
        responseMessage = `${supplier.name} finds your offer of $${offer.toLocaleString()} insulting and leaves immediately!`;
        negotiationConcluded = true; // Supplier leaves
        updateReputation(-5); // Larger rep hit for insulting offer
    } else {
        // Counter offer logic
        counterOfferValue = Math.round(actualPrice * (0.8 + (Math.random() * 0.3 * negotiationDifficulty))); // Counter between 80-110% of actual
        counterOfferValue = clamp(counterOfferValue, 100, Infinity); // Min counter offer
    }

    if (negotiationConcluded) {
        if (offerRatio * negotiationDifficulty >= 0.95) { // Final check for acceptance
            const newMoney = currentState.company.money - offer;
            const newTotalExpenses = currentState.company.totalExpenses + offer;
            updateCompany({ money: newMoney, totalExpenses: newTotalExpenses });

            if (addInventoryItem({ ...part, cost: offer })) { // Store part with actual purchase cost
                responseMessage = `${supplier.name} accepts your offer of $${offer.toLocaleString()} for ${part.name.toUpperCase()}!`;
                removePartFromSupplier(supplier.id, part.id);
                showNotification(responseMessage, 'success');
                addEventLogEntry({ message: `PURCHASE: Bought ${part.name} from ${supplier.name} for $${offer.toLocaleString()}.`, type: 'success' });
            } else {
                // Should be prevented earlier by inventory check, but defensive if it gets here.
                showNotification("ERROR: INVENTORY FULL AFTER NEGOTIATION. TRANSACTION REVERTED.", "error");
                addEventLogEntry({ message: "PURCHASE ERROR: Inventory full, transaction reverted.", type: 'error' });
                // Revert money change (since addInventoryItem failed)
                updateCompany({ money: currentState.company.money, totalExpenses: currentState.company.totalExpenses });
            }
        } else {
            showNotification(responseMessage, 'warning'); // Message for supplier leaving
            addEventLogEntry({ message: responseMessage, type: 'warning' });
            removePartFromSupplier(supplier.id, part.id); // Supplier left, so part is no longer available
        }
    } else if (counterOfferValue > 0) {
        const newSuppliers = currentState.suppliers.map(s => {
            if (s && s.id === supplier.id) {
                return {
                    ...s,
                    parts: (Array.isArray(s.parts) ? s.parts : []).map(p => p && p.id === part.id ? { ...p, cost: counterOfferValue } : p)
                };
            }
            return s;
        }).filter(s => s !== null);
        updateSuppliers(newSuppliers);
        responseMessage = `${supplier.name} counters your offer of $${offer.toLocaleString()} with $${counterOfferValue.toLocaleString()} for ${part.name.toUpperCase()}.`;
        showNotification(responseMessage, 'info');
        addEventLogEntry({ message: `NEGOTIATION: ${supplier.name} countered your offer for ${part.name}.`, type: 'info' });
    } else {
        // Fallback for unexpected negotiation state
        showNotification("NEGOTIATION RESULT UNDETERMINED. PLEASE TRY AGAIN.", "warning");
        addEventLogEntry({ message: "NEGOTIATION WARNING: Result undetermined, please retry.", type: 'warning' });
    }

    updateDashboardUI();
    renderSupplierMarket(); // Re-render to update offers or remove bought part
}

/**
 * Handles the rejection of a supplier's offer.
 * @param {string} supplierId The ID of the supplier.
 * @param {string} partId The ID of the part being rejected.
 */
export function rejectOffer(supplierId, partId) {
    if (typeof supplierId !== 'string' || !supplierId || typeof partId !== 'string' || !partId) {
        console.error('Invalid supplierId or partId for rejectOffer');
        showNotification("SYSTEM ERROR: INVALID REJECTION ATTEMPT.", "error");
        addEventLogEntry({ message: "SYSTEM ERROR: Invalid input for offer rejection.", type: 'error' });
        return;
    }

    const currentState = getGameState();
    const supplier = currentState.suppliers.find(s => s && s.id === supplierId);
    if (!supplier) {
        showNotification("SUPPLIER NOT FOUND FOR REJECTION.", "error");
        addEventLogEntry({ message: `REJECTION FAILED: Supplier ID ${supplierId} not found.`, type: 'error' });
        return;
    }

    if (removePartFromSupplier(supplierId, partId)) {
        showNotification(`${supplier.name.toUpperCase()}'S OFFER FOR A PART WAS REJECTED.`, 'info');
        addEventLogEntry({ message: `REJECTION: Offer for part ${partId} from ${supplier.name} was rejected.`, type: 'info' });
    } else {
        showNotification("COULD NOT FIND PART TO REJECT FROM SUPPLIER.", "warning");
        addEventLogEntry({ message: `REJECTION WARNING: Part ID ${partId} not found with supplier ${supplier.name}.`, type: 'warning' });
    }

    updateDashboardUI();
    renderSupplierMarket();
}
