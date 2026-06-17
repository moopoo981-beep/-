// assemblySystem.js - Manages product assembly logic, including weighted engineering formulas.
'use strict';

import {
    getGameState, updateCompany, removeInventoryItem, addAssembledProduct, addEventLogEntry,
    PART_CATEGORIES, PRODUCT_BLUEPRINTS, PLACEHOLDER_IMAGE_PATH, PRODUCTION_CATEGORIES, TECH_LEVEL_MULTIPLIER
} from './gameState.js';
import { generateId, clamp } from './utils.js';
import { updateDashboardUI, renderWarehouse, renderAssembly, showNotification } from './uiRenderer.js';
import { eventBus, GameEvents } from './eventBus.js';

/**
 * Calculates the 'power' statistic for Naval products based on part qualities.
 * @param {object} parts - Object containing categorized parts used for assembly.
 * @returns {number} Calculated naval power.
 */
function calculateNavalPower(parts) {
    let power = 0;
    const hullQuality = parts[PART_CATEGORIES.HULL] ? parts[PART_CATEGORIES.HULL][0].quality : 0;
    const engineQuality = parts[PART_CATEGORIES.ENGINE] ? parts[PART_CATEGORIES.ENGINE][0].quality : 0;
    const radarQuality = parts[PART_CATEGORIES.RADAR] ? parts[PART_CATEGORIES.RADAR][0].quality : 0;
    const controlQuality = parts[PART_CATEGORIES.CONTROL] ? parts[PART_CATEGORIES.CONTROL][0].quality : 0;
    const defenseQuality = parts[PART_CATEGORIES.DEFENSE] ? parts[PART_CATEGORIES.DEFENSE][0].quality : 0;

    // Original formula, focused on all-around capability
    power = (hullQuality * 0.3) + (engineQuality * 0.3) + (radarQuality * 0.2) + (controlQuality * 0.1) + (defenseQuality * 0.1);
    return Math.round(power);
}

/**
 * Calculates the 'durability' statistic for Naval products based on part durabilities.
 * @param {object} parts - Object containing categorized parts used for assembly.
 * @returns {number} Calculated naval durability.
 */
function calculateNavalDurability(parts) {
    let durability = 0;
    const hullDurability = parts[PART_CATEGORIES.HULL] ? parts[PART_CATEGORIES.HULL][0].durability : 0;
    const engineDurability = parts[PART_CATEGORIES.ENGINE] ? parts[PART_CATEGORIES.ENGINE][0].durability : 0;
    const radarDurability = parts[PART_CATEGORIES.RADAR] ? parts[PART_CATEGORIES.RADAR][0].durability : 0;
    const controlDurability = parts[PART_CATEGORIES.CONTROL] ? parts[PART_CATEGORIES.CONTROL][0].durability : 0;
    const defenseDurability = parts[PART_CATEGORIES.DEFENSE] ? parts[PART_CATEGORIES.DEFENSE][0].durability : 0;
    
    // Focused on durability + defense
    durability = (hullDurability * 0.5) + (defenseDurability * 0.3) + (engineDurability * 0.1) + (controlDurability * 0.05) + (radarDurability * 0.05);
    return Math.round(durability);
}


/**
 * Calculates the 'airPower' statistic for Air products based on part qualities.
 * High risk if durability is low.
 * @param {object} parts - Object containing categorized parts used for assembly.
 * @returns {number} Calculated air power.
 */
function calculateAirPower(parts) {
    const engineQuality = parts[PART_CATEGORIES.ENGINE] ? parts[PART_CATEGORIES.ENGINE][0].quality : 0;
    const radarQuality = parts[PART_CATEGORIES.RADAR] ? parts[PART_CATEGORIES.RADAR][0].quality : 0;
    const controlQuality = parts[PART_CATEGORIES.CONTROL] ? parts[PART_CATEGORIES.CONTROL][0].quality : 0;
    const defenseQuality = parts[PART_CATEGORIES.DEFENSE] ? parts[PART_CATEGORIES.DEFENSE][0].quality : 0;
    // Airframe durability might influence risk, but not directly power stat
    
    let airPower = (engineQuality * 0.4) + (radarQuality * 0.2) + (controlQuality * 0.2) + (defenseQuality * 0.2);
    return Math.round(airPower);
}

/**
 * Calculates the 'airDurability' statistic for Air products.
 * @param {object} parts - Object containing categorized parts used for assembly.
 * @returns {number} Calculated air durability.
 */
function calculateAirDurability(parts) {
    // Air durability primarily from airframe, secondary from defense
    const airframeDurability = parts[PART_CATEGORIES.AIRFRAME] ? parts[PART_CATEGORIES.AIRFRAME][0].durability : 0;
    const heavyAirframeDurability = parts[PART_CATEGORIES.HEAVY_AIRFRAME] ? parts[PART_CATEGORIES.HEAVY_AIRFRAME][0].durability : 0;
    const defenseDurability = parts[PART_CATEGORIES.DEFENSE] ? parts[PART_CATEGORIES.DEFENSE][0].durability : 0;

    let durability = (airframeDurability * 0.6) + (heavyAirframeDurability * 0.8) + (defenseDurability * 0.4); // Heavy airframe contributes more
    return Math.round(durability);
}

/**
 * Calculates the 'armorStrength' statistic for Armored products based on part qualities and durabilities.
 * @param {object} parts - Object containing categorized parts used for assembly.
 * @returns {number} Calculated armor strength.
 */
function calculateArmorStrength(parts) {
    const hullDurability = parts[PART_CATEGORIES.HULL] ? parts[PART_CATEGORIES.HULL][0].durability : 0;
    const armorPlatingQuality = parts[PART_CATEGORIES.ARMOR_PLATING] ? parts[PART_CATEGORIES.ARMOR_PLATING][0].quality : 0;
    const cannonQuality = parts[PART_CATEGORIES.CANNON] ? parts[PART_CATEGORIES.CANNON][0].quality : 0;
    const engineQuality = parts[PART_CATEGORIES.ENGINE] ? parts[PART_CATEGORIES.ENGINE][0].quality : 0;
    
    let armorStrength = (hullDurability * 0.3) + (armorPlatingQuality * 0.3) + (cannonQuality * 0.2) + (engineQuality * 0.2);
    return Math.round(armorStrength);
}

/**
 * Calculates the 'armoredDurability' statistic for Armored products.
 * @param {object} parts - Object containing categorized parts used for assembly.
 * @returns {number} Calculated armored durability.
 */
function calculateArmoredDurability(parts) {
    const hullDurability = parts[PART_CATEGORIES.HULL] ? parts[PART_CATEGORIES.HULL][0].durability : 0;
    const armorPlatingDurability = parts[PART_CATEGORIES.ARMOR_PLATING] ? parts[PART_CATEGORIES.ARMOR_PLATING][0].durability : 0;
    const defenseDurability = parts[PART_CATEGORIES.DEFENSE] ? parts[PART_CATEGORIES.DEFENSE][0].durability : 0;

    let durability = (hullDurability * 0.4) + (armorPlatingDurability * 0.4) + (defenseDurability * 0.2);
    return Math.round(durability);
}

/**
 * Helper to safely get engine parts from the selected map.
 * @param {object} selectedPartMap
 * @returns {Array<object>} An array of engine part objects.
 */
function getEngineParts(selectedPartMap) {
    return selectedPartMap[PART_CATEGORIES.ENGINE] || [];
}

/**
 * Assembles a product from selected parts, applying a weighted engineering formula based on product category.
 * @param {string} blueprintId The ID of the product blueprint.
 * @param {object} selectedPartMap A map of category to part objects, e.g., { "Hull": [part1], "Engine": [part2] }.
 */
export function assembleProduct(blueprintId, selectedPartMap) {
    if (typeof blueprintId !== 'string' || !blueprintId) {
        console.error('Invalid blueprintId provided to assembleProduct');
        showNotification("SYSTEM ERROR: INVALID BLUEPRINT SELECTED.", "error");
        return;
    }
    if (typeof selectedPartMap !== 'object' || selectedPartMap === null || Object.keys(selectedPartMap).length === 0) {
        console.error('Invalid selectedPartMap provided to assembleProduct');
        showNotification("SYSTEM ERROR: NO PARTS SELECTED FOR ASSEMBLY.", "error");
        return;
    }

    const currentState = getGameState();
    const blueprint = Object.values(PRODUCT_BLUEPRINTS).find(bp => bp.id === blueprintId);
    if (!blueprint) {
        showNotification("INVALID PRODUCT BLUEPRINT SELECTED.", "error");
        addEventLogEntry({ message: `ASSEMBLY ERROR: Blueprint '${blueprintId}' not found.`, type: 'error' });
        return;
    }

    // Convert selectedPartMap to a flat array of parts for easier processing
    const partsUsed = Object.values(selectedPartMap).flat().filter(p => p !== null);

    if (partsUsed.length === 0) {
        showNotification("NO PARTS SELECTED FOR ASSEMBLY.", "error");
        return;
    }

    // Defensive check: Ensure no duplicate part IDs are being used from inventory
    const usedPartIds = new Set(partsUsed.map(p => p.id));
    if (usedPartIds.size !== partsUsed.length) {
        showNotification("ERROR: DUPLICATE PARTS DETECTED IN ASSEMBLY SELECTION. PLEASE REVIEW.", "error");
        addEventLogEntry({ message: `ASSEMBLY ERROR: Duplicate parts in selection for ${blueprint.name}.`, type: 'error' });
        return;
    }

    // Defensive check: Ensure all required categories are present and count matches blueprint
    let allRequirementsMet = true;
    if (blueprint.requiredParts) { // Use blueprint.requiredParts
        for (const category in blueprint.requiredParts) {
            if (!Object.prototype.hasOwnProperty.call(blueprint.requiredParts, category)) continue;
            const requiredCount = blueprint.requiredParts[category];
            const selectedCount = (selectedPartMap[category] || []).length;
            if (selectedCount !== requiredCount) {
                allRequirementsMet = false;
                break;
            }
        }
    } else {
        allRequirementsMet = false; // No requiredParts defined in blueprint
    }
    
    if (!allRequirementsMet) {
        showNotification("ERROR: NOT ALL REQUIRED PARTS MET FOR BLUEPRINT.", "error");
        addEventLogEntry({ message: `ASSEMBLY ERROR: Requirements not met for blueprint ${blueprint.name}.`, type: 'error' });
        return;
    }

    let finalPower = 0;
    let finalDurability = 0;
    let finalRiskFactor = blueprint.riskFactor || 0; // Start with blueprint's base risk

    // --- NEW: AGGREGATE ENGINE STATS ---
    let totalEnginePower = 0;
    let totalFuelEfficiency = 0;
    let totalEngineWeight = 0;
    const engineParts = getEngineParts(selectedPartMap);
    if (Array.isArray(engineParts)) {
        engineParts.forEach(engine => {
            if (typeof engine.power === 'number') totalEnginePower += engine.power;
            if (typeof engine.fuelEfficiency === 'number') totalFuelEfficiency += engine.fuelEfficiency;
            if (typeof engine.weight === 'number') totalEngineWeight += engine.weight;
        });
        if (engineParts.length > 0) {
            totalFuelEfficiency /= engineParts.length; // Average fuel efficiency
        }
    }
    // --- END NEW ---

    // --- CATEGORY-SPECIFIC ENGINEERING FORMULAS ---
    switch (blueprint.category) {
        case PRODUCTION_CATEGORIES.NAVAL:
            finalPower = calculateNavalPower(selectedPartMap);
            // NEW: Add engine power contribution
            finalPower = Math.round(finalPower + (totalEnginePower * 0.15)); // 15% of total engine power
            finalDurability = calculateNavalDurability(selectedPartMap);
            break;
        case PRODUCTION_CATEGORIES.AIR:
            finalPower = calculateAirPower(selectedPartMap);
            // NEW: Add engine power contribution
            finalPower = Math.round(finalPower + (totalEnginePower * 0.4)); // Higher engine power contribution for air
            finalDurability = calculateAirDurability(selectedPartMap);
            // High risk if air durability is low
            if (finalDurability < 30) { // Arbitrary threshold for "low" durability
                finalRiskFactor = clamp(finalRiskFactor + 0.2, 0, 1);
            }
            break;
        case PRODUCTION_CATEGORIES.ARMORED:
            finalPower = calculateArmorStrength(selectedPartMap); // For armored, power is armor strength
            // NEW: Add engine power contribution (less significant for armored power)
            finalPower = Math.round(finalPower + (totalEnginePower * 0.05));
            finalDurability = calculateArmoredDurability(selectedPartMap);
            break;
        default:
            // Fallback for unexpected category or if category is not defined
            console.warn(`Unknown product category: ${blueprint.category}. Using default calculation.`);
            addEventLogEntry({ message: `ASSEMBLY WARNING: Unknown product category '${blueprint.category}'. Defaulting stats.`, type: 'warning' });
            finalPower = partsUsed.reduce((sum, part) => sum + part.quality, 0) / partsUsed.length;
            finalDurability = partsUsed.reduce((sum, part) => sum + part.durability, 0) / partsUsed.length;
            break;
    }

    // Apply company tech level multiplier to final power/score
    const techLevelMultiplier = 1 + (currentState.company.techLevel * TECH_LEVEL_MULTIPLIER);
    finalPower = Math.round(finalPower * techLevelMultiplier);
    finalDurability = Math.round(finalDurability); // Durability not directly affected by tech level for now

    // Production Cost is sum of all parts' purchase costs + base assembly cost from blueprint
    const partsCost = partsUsed.reduce((sum, part) => sum + part.cost, 0);
    const totalProductionCost = partsCost + (blueprint.baseAssemblyCost || 0);

    if (currentState.company.money < totalProductionCost) {
        showNotification("INSUFFICIENT FUNDS TO ASSEMBLE THIS PRODUCT!", "error");
        addEventLogEntry({ message: `ASSEMBLY ERROR: Insufficient funds to assemble ${blueprint.name}.`, type: 'error' });
        return;
    }

    const assembledProduct = {
        id: generateId(),
        name: blueprint.name,
        category: blueprint.category, // Attach category
        power: finalPower,
        durability: finalDurability,
        productionCost: totalProductionCost,
        marketValue: 0, // Market value will be calculated later in contract negotiation
        riskFactor: finalRiskFactor,
        imagePath: blueprint.imagePath || PLACEHOLDER_IMAGE_PATH,
        // NEW: Add aggregated engine stats
        totalEnginePower: typeof totalEnginePower === 'number' ? totalEnginePower : 0,
        totalFuelEfficiency: typeof totalFuelEfficiency === 'number' ? totalFuelEfficiency : 0,
        totalEngineWeight: typeof totalEngineWeight === 'number' ? totalEngineWeight : 0,
    };

    // Update company funds and expenses
    updateCompany({
        money: currentState.company.money - totalProductionCost,
        totalExpenses: currentState.company.totalExpenses + totalProductionCost
    });

    // Add assembled product
    addAssembledProduct(assembledProduct);

    // Emit event for tutorial/system
    eventBus.emit(GameEvents.PRODUCT_ASSEMBLED, assembledProduct);

    // Remove used parts from inventory
    let removalSuccess = true;
    for (const partToUse of partsUsed) {
        if (!removeInventoryItem(partToUse.id)) {
            addEventLogEntry({ message: `ASSEMBLY WARNING: Failed to remove part ${partToUse.name} (ID: ${partToUse.id}) from inventory.`, type: 'warning' });
            removalSuccess = false;
        }
    }
    if (!removalSuccess) {
        showNotification("WARNING: SOME PARTS COULD NOT BE SAFELY REMOVED FROM INVENTORY.", "warning");
    }

    showNotification(`SUCCESSFULLY ASSEMBLED A ${assembledProduct.name.toUpperCase()}!`, "success");
    updateDashboardUI();
    renderWarehouse(); // Update warehouse display since parts were used
    renderAssembly();  // Update assembly display to show new product
}
