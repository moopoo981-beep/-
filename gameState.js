// gameState.js - Manages the central game state and core data definitions.
'use strict';

import { generateId, clamp, safeNumber } from './utils.js'; // Import utility functions

// --- Constants ---

/**
 * Defines the categories of products that can be manufactured.
 * Used for blueprint classification, country preferences, and competitor specialization.
 * @enum {string}
 */
export const PRODUCTION_CATEGORIES = {
    NAVAL: 'NAVAL',
    AIR: 'AIR',
    ARMORED: 'ARMORED',
};

/**
 * Defines the different strategies AI competitors can employ.
 * @enum {string}
 */
export const COMPETITOR_STRATEGIES = {
    LOW_COST: 'LOW_COST',
    HIGH_TECH: 'HIGH_TECH',
    BALANCED: 'BALANCED',
};

/**
 * Defines the categories of parts used in manufacturing.
 * @enum {string}
 */
export const PART_CATEGORIES = {
    HULL: 'Hull',
    ENGINE: 'Engine',
    RADAR: 'Radar',
    CONTROL: 'Control',
    DEFENSE: 'Defense',
    // New part categories for Air and Armored units
    AIRFRAME: 'Airframe',
    HEAVY_AIRFRAME: 'Heavy Airframe',
    PAYLOAD_SYSTEM: 'Payload System',
    CANNON: 'Cannon',
    ARMOR_PLATING: 'Armor Plating',
};

/**
 * Defines the blueprints for all manufacturable products.
 * Each blueprint specifies required parts, production time, tech level, costs, and unique properties.
 * @type {object}
 */
export const PRODUCT_BLUEPRINTS = {
    Frigate: {
        id: 'frigate_mk1',
        name: 'Frigate',
        category: PRODUCTION_CATEGORIES.NAVAL,
        requiredParts: {
            [PART_CATEGORIES.HULL]: 1,
            [PART_CATEGORIES.ENGINE]: 1,
            [PART_CATEGORIES.RADAR]: 1,
            [PART_CATEGORIES.CONTROL]: 1,
            [PART_CATEGORIES.DEFENSE]: 1,
        },
        productionTime: 2, // Days to assemble
        techRequirement: 1, // Minimum tech level to unlock
        baseAssemblyCost: 100000, // Cost to assemble beyond parts
        weight: 5000, // Example weight, might be used for transport/storage
        riskFactor: 0.1, // Base risk factor
        imagePath: '' // Base image for assembled product
    },
    Destroyer: {
        id: 'destroyer_mk1',
        name: 'Destroyer',
        category: PRODUCTION_CATEGORIES.NAVAL,
        requiredParts: {
            [PART_CATEGORIES.HULL]: 2,
            [PART_CATEGORIES.ENGINE]: 2,
            [PART_CATEGORIES.RADAR]: 1,
            [PART_CATEGORIES.CONTROL]: 2,
            [PART_CATEGORIES.DEFENSE]: 2,
        },
        productionTime: 4,
        techRequirement: 2,
        baseAssemblyCost: 250000,
        weight: 12000,
        riskFactor: 0.2,
        imagePath: '' // Base image for assembled product
    },
    FighterJet: {
        id: "fighter_mk1",
        name: "Fighter Jet",
        category: PRODUCTION_CATEGORIES.AIR,
        requiredParts: {
            [PART_CATEGORIES.ENGINE]: 1,
            [PART_CATEGORIES.RADAR]: 1,
            [PART_CATEGORIES.CONTROL]: 1,
            [PART_CATEGORIES.DEFENSE]: 1,
            [PART_CATEGORIES.AIRFRAME]: 1
        },
        productionTime: 3,
        techRequirement: 2,
        baseAssemblyCost: 250000,
        weight: 500, // Lighter than ships
        riskFactor: 0.3, // Higher risk in air combat
        imagePath: ''
    },
    Bomber: {
        id: "bomber_mk1",
        name: "Bomber",
        category: PRODUCTION_CATEGORIES.AIR,
        requiredParts: {
            [PART_CATEGORIES.ENGINE]: 2,
            [PART_CATEGORIES.RADAR]: 1,
            [PART_CATEGORIES.CONTROL]: 1,
            [PART_CATEGORIES.DEFENSE]: 1,
            [PART_CATEGORIES.HEAVY_AIRFRAME]: 1,
            [PART_CATEGORIES.PAYLOAD_SYSTEM]: 1
        },
        productionTime: 5,
        techRequirement: 3,
        baseAssemblyCost: 600000,
        weight: 5000, // Significant weight for payload
        riskFactor: 0.4, // Strategic assets are high risk
        imagePath: ''
    },
    Tank: {
        id: "tank_mk1",
        name: "Main Battle Tank",
        category: PRODUCTION_CATEGORIES.ARMORED,
        requiredParts: {
            [PART_CATEGORIES.HULL]: 1, // Hull in this context is the chassis base
            [PART_CATEGORIES.ENGINE]: 1,
            [PART_CATEGORIES.CONTROL]: 1,
            [PART_CATEGORIES.DEFENSE]: 1,
            [PART_CATEGORIES.CANNON]: 1,
            [PART_CATEGORIES.ARMOR_PLATING]: 1
        },
        productionTime: 3,
        techRequirement: 2,
        baseAssemblyCost: 180000,
        weight: 60000, // Very heavy
        riskFactor: 0.25,
        imagePath: ''
    },
};

/**
 * Defines the base set of NPC suppliers in the game.
 * Each supplier specializes in a certain part category.
 * @type {Array<object>}
 */
export const BASE_SUPPLIERS = [
    { name: 'OmniSteel Industries', specialty: PART_CATEGORIES.HULL },
    { name: 'Quantum Propulsion Labs', specialty: PART_CATEGORIES.ENGINE },
    { name: 'Sentient Optics Systems', specialty: PART_CATEGORIES.RADAR },
    { name: 'NeuralNet Controls', specialty: PART_CATEGORIES.CONTROL },
    { name: 'Aegis Defense Solutions', specialty: PART_CATEGORIES.DEFENSE },
    // New suppliers for new part categories
    { name: 'SkyFrame Composites', specialty: PART_CATEGORIES.AIRFRAME },
    { name: 'Atlas Heavy Industries', specialty: PART_CATEGORIES.HEAVY_AIRFRAME },
    { name: 'Ordnance Tech', specialty: PART_CATEGORIES.PAYLOAD_SYSTEM },
    { name: 'Kinetic Weaponry Inc.', specialty: PART_CATEGORIES.CANNON },
    { name: 'Cerberus Armor', specialty: PART_CATEGORIES.ARMOR_PLATING },
];

/**
 * Defines the different personalities suppliers can have, influencing their pricing and negotiation.
 * @enum {string}
 */
export const SUPPLIER_PERSONALITIES = {
    AGGRESSIVE: 'AGGRESSIVE',
    CONSERVATIVE: 'CONSERVATIVE',
    DESPERATE: 'DESPERATE',
    PREMIUM: 'PREMIUM',
};

/**
 * Modifiers applied based on supplier personality.
 * @type {object}
 */
export const SUPPLIER_PERSONALITY_MODIFIERS = {
    [SUPPLIER_PERSONALITIES.AGGRESSIVE]: { price: 1.15, qualityBoost: 1.05, durabilityBoost: 1.05, negotiationDifficulty: 1.2, weight: 0.15 }, // Higher price, slight quality boost
    [SUPPLIER_PERSONALITIES.CONSERVATIVE]: { price: 1.0, qualityBoost: 1.0, durabilityBoost: 1.0, negotiationDifficulty: 1.0, weight: 0.4 }, // Standard
    [SUPPLIER_PERSONALITIES.DESPERATE]: { price: 0.75, qualityBoost: 0.9, durabilityBoost: 0.8, negotiationDifficulty: 0.7, weight: 0.2 }, // Lower price, lower quality/durability
    [SUPPLIER_PERSONALITIES.PREMIUM]: { price: 1.5, qualityBoost: 1.2, durabilityBoost: 1.2, negotiationDifficulty: 1.5, weight: 0.1 }, // Much higher price, significant quality/durability boost
    // Default/fallback personality for safety
    'DEFAULT': { price: 1.0, qualityBoost: 1.0, durabilityBoost: 1.0, negotiationDifficulty: 1.0, weight: 0.15 }
};

/**
 * Defines the base set of countries that can offer contracts.
 * @type {Array<object>}
 */
export const BASE_COUNTRIES = [
    { name: 'Federal Republic of Vorlag', budget: 1500000, techDemand: 60, relation: 70, baseRisk: 0.3, preferredCategory: PRODUCTION_CATEGORIES.ARMORED },
    { name: 'United Sol Hegemony', budget: 2000000, techDemand: 80, relation: 80, baseRisk: 0.1, preferredCategory: PRODUCTION_CATEGORIES.AIR },
    { name: 'Crimson Dynasties', budget: 800000, techDemand: 40, relation: 30, baseRisk: 0.7, preferredCategory: PRODUCTION_CATEGORIES.NAVAL },
    { name: 'Free Systems Alliance', budget: 1200000, techDemand: 50, relation: 50, baseRisk: 0.5, preferredCategory: PRODUCTION_CATEGORIES.AIR },
    { name: 'Neo-Terra Collective', budget: 1800000, techDemand: 75, relation: 65, baseRisk: 0.2, preferredCategory: PRODUCTION_CATEGORIES.NAVAL },
    { name: 'Ironclad Dominion', budget: 1000000, techDemand: 45, relation: 25, baseRisk: 0.6, preferredCategory: PRODUCTION_CATEGORIES.ARMORED },
];

// Modifier for techLevel in finalScore calculation
export const TECH_LEVEL_MULTIPLIER = 0.01; // E.g., techLevel 1 = 1.01x, techLevel 5 = 1.05x

/**
 * Modifiers related to geopolitical risk.
 * @type {object}
 */
export const GEOPOLITICAL_RISK_MODIFIER = {
    CRITICAL_THRESHOLD: 0.7, // Geopolitical tension above this is critical
    CONTRACT_VALUE_BOOST: 1.2, // Contracts worth more in high tension
    RISK_INCREASE: 0.15, // Additional risk for countries in high tension
    CANCELLATION_CHANCE_BOOST: 0.05, // Additional cancellation chance in high tension
    SUPPLIER_COST_BOOST: 1.1, // Supplier costs increase in high tension
};

/**
 * Defines various random events that can occur in the game,
 * affecting market conditions, part availability, or company stats.
 * @type {Array<object>}
 */
export const RANDOM_EVENTS = [
    {
        name: "Supply Chain Disruption",
        description: "Global supply chains are disrupted, increasing part costs significantly for today.",
        effect: () => {
            const currentState = getGameState();
            const updatedSuppliers = currentState.suppliers.map(s => {
                const newParts = (Array.isArray(s.parts) ? s.parts : []).map(p => ({
                    ...p,
                    cost: safeNumber(p.cost, 0) * 1.3,
                    actualCost: safeNumber(p.actualCost, 0) * 1.3
                }));
                return { ...s, parts: newParts };
            });
            updateSuppliers(updatedSuppliers);
            addEventLogEntry({ message: "ALERT: Supply Chain Disruption - Part costs increased by 30%.", type: 'alert' });
        }
    },
    {
        name: "Defense Spending Boost",
        description: "Key nations approve increased defense budgets, leading to higher contract offers and more opportunities.",
        effect: () => {
            const currentState = getGameState();
            const updatedCountries = (Array.isArray(currentState.countries) ? currentState.countries : []).map(c => ({
                ...c,
                budget: safeNumber(c.budget, 0) * 1.25
            }));
            updateCountries(updatedCountries);
            updateMarket({ contractVolumeModifier: clamp(safeNumber(currentState.market.contractVolumeModifier, 1.0) + 0.5, 1.0, 2.5) });
            addEventLogEntry({ message: "EVENT: Defense Spending Boost - Contract offers higher, more contracts available.", type: 'event' });
        }
    },
    {
        name: "Market Correction",
        description: "A sudden market correction reduces both part costs and contract values by a moderate margin.",
        effect: () => {
            const currentState = getGameState();
            const updatedSuppliers = (Array.isArray(currentState.suppliers) ? currentState.suppliers : []).map(s => {
                const newParts = (Array.isArray(s.parts) ? s.parts : []).map(p => ({
                    ...p,
                    cost: safeNumber(p.cost, 0) * 0.85,
                    actualCost: safeNumber(p.actualCost, 0) * 0.85
                }));
                return { ...s, parts: newParts };
            });
            updateSuppliers(updatedSuppliers);
            const updatedCountries = (Array.isArray(currentState.countries) ? currentState.countries : []).map(c => ({
                ...c,
                budget: safeNumber(c.budget, 0) * 0.85
            }));
            updateCountries(updatedCountries);
            addEventLogEntry({ message: "EVENT: Market Correction - Part costs and contract values reduced by 15%.", type: 'event' });
        }
    },
    {
        name: "Technological Leap",
        description: "A breakthrough in materials science improves overall part durability. Your tech level increases slightly.",
        effect: () => {
            const currentState = getGameState();
            // This event modifies durability of parts currently offered by suppliers.
            const updatedSuppliers = (Array.isArray(currentState.suppliers) ? currentState.suppliers : []).map(s => ({
                ...s,
                parts: (Array.isArray(s.parts) ? s.parts : []).map(p => ({ ...p, durability: clamp(safeNumber(p.durability, 0) + 15, 0, 100) }))
            }));
            updateSuppliers(updatedSuppliers);
            updateCompany({ techLevel: clamp(safeNumber(currentState.company.techLevel, 1) + 1, 1, 5) }); // Cap tech level
            addEventLogEntry({ message: "EVENT: Technological Leap - Part durability improved, Tech Level increased.", type: 'event' });
        }
    },
    {
        name: "Geopolitical Instability Escalation",
        description: "Increased global tensions lead to higher political risk in many regions, but also higher demand.",
        effect: () => {
            const currentState = getGameState();
            updateMarket({ geopoliticalTension: clamp(safeNumber(currentState.market.geopoliticalTension, 0.5) + 0.2, 0.1, 1.0) });
            
            // For existing countries, update their politicalRisk based on current value + increase
            const updatedCountries = (Array.isArray(currentState.countries) ? currentState.countries : []).map(c => ({
                ...c,
                politicalRisk: clamp(safeNumber(c.politicalRisk, 0) + GEOPOLITICAL_RISK_MODIFIER.RISK_INCREASE, 0.0, 1.0)
            }));
            updateCountries(updatedCountries); // Update the state with new country risks

            updateMarket({ contractVolumeModifier: clamp(safeNumber(currentState.market.contractVolumeModifier, 1.0) + 0.3, 1.0, 2.5) });
            addEventLogEntry({ message: "ALERT: Geopolitical Instability Escalation - Political risk increases, but so does demand.", type: 'alert' });
        }
    }
];

// Example part image paths (for image system requirements)
export const PART_IMAGE_PATHS = {
    [PART_CATEGORIES.HULL]: [''],
    [PART_CATEGORIES.ENGINE]: [''],
    [PART_CATEGORIES.RADAR]: [''],
    [PART_CATEGORIES.CONTROL]: [''],
    [PART_CATEGORIES.DEFENSE]: [''],
    // New part categories
    [PART_CATEGORIES.AIRFRAME]: [''],
    [PART_CATEGORIES.HEAVY_AIRFRAME]: [''],
    [PART_CATEGORIES.PAYLOAD_SYSTEM]: [''],
    [PART_CATEGORIES.CANNON]: [''],
    [PART_CATEGORIES.ARMOR_PLATING]: [''],
};

// General placeholder image path
export const PLACEHOLDER_IMAGE_PATH = '';

// Internal state object, not directly exported for mutation
let _state = {
    company: {
        money: 10000000,
        reputation: 50,
        techLevel: 1, // Influences part quality and product stats, also techLevelModifier for power calculation
        storageCapacity: 20,
        totalRevenue: 0,
        totalExpenses: 0,
        netProfit: 0,
        dailyReputationChange: 0,
        contractsCompleted: 0, // New property for win/loss condition
    },
    inventory: [], // [{ id, name, category, quality, durability, baseCost, imagePath }]
    productionQueue: [],
    assembledProducts: [], // [{ id, name, power, durability, productionCost, marketValue, imagePath }]
    suppliers: [], // Daily refreshed list of available parts from NPCs
    countries: [], // Daily refreshed list of available contracts from countries
    competitors: [
        { id: 'comp1', name: 'Ares Dynamics', capital: 8000000, reputation: 60, strategy: COMPETITOR_STRATEGIES.HIGH_TECH, specializedCategory: PRODUCTION_CATEGORIES.AIR },
        { id: 'comp2', name: 'Spartan Corp', capital: 7000000, reputation: 45, strategy: COMPETITOR_STRATEGIES.LOW_COST, specializedCategory: PRODUCTION_CATEGORIES.NAVAL },
        { id: 'comp3', name: 'Titan Defense', capital: 9000000, reputation: 55, strategy: COMPETITOR_STRATEGIES.BALANCED, specializedCategory: PRODUCTION_CATEGORIES.ARMORED },
    ],
    market: {
        steelIndex: 1.0, // Base 1.0
        electronicsIndex: 1.0, // Base 1.0
        geopoliticalTension: 0.5, // 0.0 - 1.0, higher means more risk/demand for defense
        contractVolumeModifier: 1.0, // Influenced by tension, impacts number of contracts
    },
    currentDay: 1,
    isProcessingNextDay: false,
    eventLog: [],
    endOfDayReport: null,
    warehouse: { // New warehouse state
        level: 1,
        capacity: 20, // Initial capacity
        upgradeCost: 50000 // Cost to upgrade to level 2
    },
    tutorial: {
        active: true,
        currentDay: 1,
        currentStep: 0,
        completed: false
    }
};

// --- Immutable State Update Functions ---

/**
 * Returns a deep copy of the current game state, preventing external direct mutation.
 * @returns {object} A deep copy of the current game state.
 */
export function getGameState() {
    return JSON.parse(JSON.stringify(_state));
}

/**
 * Sets the entire game state. Used primarily for loading games or initial setup.
 * @param {object} newState The new state object.
 * @returns {boolean} True if state was set, false otherwise.
 */
export function setGameState(newState) {
    if (typeof newState !== 'object' || newState === null) {
        console.error('Invalid state provided to setGameState');
        addEventLogEntry({message: 'SYSTEM ERROR: Attempted to set state with invalid data.', type: 'error'});
        return false;
    }
    _state = JSON.parse(JSON.stringify(newState)); // Ensure deep copy
    return true;
}

/**
 * Updates properties of the company.
 * @param {object} updates An object containing company properties to update.
 */
export function updateCompany(updates) {
    if (typeof updates !== 'object' || updates === null) {
        console.error('Invalid updates provided to updateCompany');
        addEventLogEntry({message: 'SYSTEM ERROR: Invalid company updates provided.', type: 'error'});
        return;
    }
    const currentCompany = _state.company;
    const newCompany = { ...currentCompany, ...updates };

    // Clamp values defensively
    newCompany.money = safeNumber(newCompany.money, currentCompany.money);
    newCompany.reputation = clamp(safeNumber(newCompany.reputation, currentCompany.reputation), 0, 100);
    newCompany.techLevel = clamp(safeNumber(newCompany.techLevel, currentCompany.techLevel), 1, 5); // Assuming techLevel 1-5

    _state = {
        ..._state,
        company: newCompany
    };
}

/**
 * Increments the number of completed contracts for the company.
 */
export function incrementContractsCompleted() {
    _state = {
        ..._state,
        company: {
            ..._state.company,
            contractsCompleted: _state.company.contractsCompleted + 1
        }
    };
}

/**
 * Adds an item to the inventory.
 * @param {object} item The item to add. Must have an 'id'.
 * @returns {boolean} True if added, false if inventory is full or invalid item.
 */
export function addInventoryItem(item) {
    if (typeof item !== 'object' || item === null || typeof item.id !== 'string' || !item.id) {
        console.error('Invalid item provided to addInventoryItem:', item);
        addEventLogEntry({message: 'SYSTEM ERROR: Attempted to add invalid inventory item.', type: 'error'});
        return false;
    }
    if (_state.inventory.length >= _state.company.storageCapacity) {
        console.warn('Inventory is full. Cannot add item.');
        addEventLogEntry({message: 'INVENTORY FULL: Cannot add new part.', type: 'warning'});
        return false;
    }
    _state = {
        ..._state,
        inventory: [..._state.inventory, item]
    };
    return true;
}

/**
 * Removes an item from the inventory by its ID.
 * @param {string} itemId The ID of the item to remove.
 * @returns {boolean} True if removed, false if not found.
 */
export function removeInventoryItem(itemId) {
    if (typeof itemId !== 'string' || !itemId) {
        console.error('Invalid itemId provided to removeInventoryItem');
        addEventLogEntry({message: 'SYSTEM ERROR: Invalid inventory item ID for removal.', type: 'error'});
        return false;
    }
    const initialLength = _state.inventory.length;
    _state = {
        ..._state,
        inventory: _state.inventory.filter(item => item && item.id !== itemId)
    };
    return _state.inventory.length < initialLength;
}

/**
 * Adds an assembled product.
 * @param {object} product The product to add. Must have an 'id'.
 */
export function addAssembledProduct(product) {
    if (typeof product !== 'object' || product === null || typeof product.id !== 'string' || !product.id) {
        console.error('Invalid product provided to addAssembledProduct:', product);
        addEventLogEntry({message: 'SYSTEM ERROR: Attempted to add invalid assembled product.', type: 'error'});
        return;
    }
    _state = {
        ..._state,
        assembledProducts: [..._state.assembledProducts, product]
    };
}

/**
 * Removes an assembled product by its ID.
 * @param {string} productId The ID of the product to remove.
 * @returns {boolean} True if removed, false if not found.
 */
export function removeAssembledProduct(productId) {
    if (typeof productId !== 'string' || !productId) {
        console.error('Invalid productId provided to removeAssembledProduct');
        addEventLogEntry({message: 'SYSTEM ERROR: Invalid assembled product ID for removal.', type: 'error'});
        return false;
    }
    const initialLength = _state.assembledProducts.length;
    _state = {
        ..._state,
        assembledProducts: _state.assembledProducts.filter(p => p && p.id !== productId)
    };
    return _state.assembledProducts.length < initialLength;
}

/**
 * Adds an item to the production queue.
 * @param {object} item The item to add to the queue.
 */
export function addProductionQueueItem(item) {
    if (typeof item !== 'object' || item === null || !item.id) {
        console.error('Invalid item provided to addProductionQueueItem:', item);
        addEventLogEntry({message: 'SYSTEM ERROR: Attempted to add invalid item to production queue.', type: 'error'});
        return;
    }
    _state = {
        ..._state,
        productionQueue: [..._state.productionQueue, item]
    };
}

/**
 * Removes an item from the production queue by its ID.
 * @param {string} itemId The ID of the item to remove.
 * @returns {boolean} True if removed, false if not found.
 */
export function removeProductionQueueItem(itemId) {
    if (typeof itemId !== 'string' || !itemId) {
        console.error('Invalid itemId provided to removeProductionQueueItem');
        addEventLogEntry({message: 'SYSTEM ERROR: Invalid production queue item ID for removal.', type: 'error'});
        return false;
    }
    const initialLength = _state.productionQueue.length;
    _state = {
        ..._state,
        productionQueue: _state.productionQueue.filter(item => item && item.id !== itemId)
    };
    return _state.productionQueue.length < initialLength;
}

/**
 * Updates the list of current suppliers.
 * @param {Array<object>} newSuppliers The new array of suppliers.
 */
export function updateSuppliers(newSuppliers) {
    if (!Array.isArray(newSuppliers)) {
        console.error('Invalid suppliers provided to updateSuppliers');
        addEventLogEntry({message: 'SYSTEM ERROR: Invalid suppliers array provided.', type: 'error'});
        return;
    }
    _state = {
        ..._state,
        suppliers: newSuppliers.filter(s => s !== null && typeof s === 'object') // Filter out any null/invalid suppliers
    };
}

/**
 * Removes a specific part from a specific supplier's offers.
 * @param {string} supplierId The ID of the supplier.
 * @param {string} partId The ID of the part to remove.
 * @returns {boolean} True if part was found and removed, false otherwise.
 */
export function removePartFromSupplier(supplierId, partId) {
    if (typeof supplierId !== 'string' || !supplierId || typeof partId !== 'string' || !partId) {
        console.error('Invalid supplierId or partId provided to removePartFromSupplier');
        addEventLogEntry({message: 'SYSTEM ERROR: Invalid IDs for part removal from supplier.', type: 'error'});
        return false;
    }
    let supplierFound = false;
    const updatedSuppliers = _state.suppliers.map(supplier => {
        if (supplier && supplier.id === supplierId) {
            supplierFound = true;
            return {
                ...supplier,
                parts: (Array.isArray(supplier.parts) ? supplier.parts.filter(part => part && part.id !== partId) : [])
            };
        }
        return supplier;
    }).filter(s => s !== null && typeof s === 'object'); // Filter out any null/invalid suppliers that might appear

    if (!supplierFound) {
        console.warn(`Supplier with ID ${supplierId} not found for part removal.`);
        addEventLogEntry({message: `WARNING: Supplier ID ${supplierId} not found for part removal.`, type: 'warning'});
        return false;
    }

    // Filter out suppliers with no parts left
    const filteredSuppliers = updatedSuppliers.filter(supplier => supplier && Array.isArray(supplier.parts) && supplier.parts.length > 0);
    _state = {
        ..._state,
        suppliers: filteredSuppliers
    };
    return true;
}

/**
 * Updates the list of current countries.
 * @param {Array<object>} newCountries The new array of countries.
 */
export function updateCountries(newCountries) {
    if (!Array.isArray(newCountries)) {
        console.error('Invalid countries provided to updateCountries');
        addEventLogEntry({message: 'SYSTEM ERROR: Invalid countries array provided.', type: 'error'});
        return;
    }
    _state = {
        ..._state,
        countries: newCountries.filter(c => c !== null && typeof c === 'object') // Filter out any null/invalid countries
    };
}

/**
 * Removes a country (contract) by its ID.
 * @param {string} countryId The ID of the country to remove.
 * @returns {boolean} True if removed, false if not found.
 */
export function removeCountry(countryId) {
    if (typeof countryId !== 'string' || !countryId) {
        console.error('Invalid countryId provided to removeCountry');
        addEventLogEntry({message: 'SYSTEM ERROR: Invalid country ID for removal.', type: 'error'});
        return false;
    }
    const initialLength = _state.countries.length;
    _state = {
        ..._state,
        countries: _state.countries.filter(country => country && country.id !== countryId)
    };
    return _state.countries.length < initialLength;
}

/**
 * Updates the market data.
 * @param {object} updates An object containing market properties to update.
 */
export function updateMarket(updates) {
    if (typeof updates !== 'object' || updates === null) {
        console.error('Invalid updates provided to updateMarket');
        addEventLogEntry({message: 'SYSTEM ERROR: Invalid market updates provided.', type: 'error'});
        return;
    }
    const currentMarket = _state.market;
    const newMarket = { ...currentMarket, ...updates };

    // Clamp values defensively
    newMarket.steelIndex = clamp(safeNumber(newMarket.steelIndex, currentMarket.steelIndex), 0.5, 2.0);
    newMarket.electronicsIndex = clamp(safeNumber(newMarket.electronicsIndex, currentMarket.electronicsIndex), 0.5, 2.0);
    newMarket.geopoliticalTension = clamp(safeNumber(newMarket.geopoliticalTension, currentMarket.geopoliticalTension), 0.1, 1.0);
    newMarket.contractVolumeModifier = clamp(safeNumber(newMarket.contractVolumeModifier, currentMarket.contractVolumeModifier), 0.5, 3.0);

    _state = {
        ..._state,
        market: newMarket
    };
}

/**
 * Updates the list of competitors.
 * @param {Array<object>} newCompetitors The new array of competitors.
 */
export function updateCompetitors(newCompetitors) {
    if (!Array.isArray(newCompetitors)) {
        console.error('Invalid competitors provided to updateCompetitors');
        addEventLogEntry({message: 'SYSTEM ERROR: Invalid competitors array provided.', type: 'error'});
        return;
    }
    _state = {
        ..._state,
        competitors: newCompetitors.filter(c => c !== null && typeof c === 'object') // Filter out any null/invalid competitors
    };
}

/**
 * Increments the current day.
 */
export function incrementDay() {
    _state = {
        ..._state,
        currentDay: safeNumber(_state.currentDay, 1) + 1
    };
}

/**
 * Adds an entry to the event log.
 * @param {object} logEntry The log entry object { message: string, type: string }.
 */
export function addEventLogEntry(logEntry) {
    if (typeof logEntry !== 'object' || logEntry === null || typeof logEntry.message !== 'string') {
        console.error('Invalid log entry provided to addEventLogEntry');
        return;
    }
    const newLogEntry = { ...logEntry, day: safeNumber(_state.currentDay, 1) };
    _state = {
        ..._state,
        eventLog: [newLogEntry, ..._state.eventLog].slice(0, 50) // Prepend new log entry and keep max 50
    };
}

/**
 * Clears the event log.
 */
export function clearEventLog() {
    _state = {
        ..._state,
        eventLog: []
    };
}

/**
 * Sets the end-of-day report.
 * @param {object|null} report The report object, or null to clear.
 * @returns {boolean} True if report was set successfully, false otherwise.
 */
export function setEndOfDayReport(report) {
    if (report !== null && typeof report !== 'object') {
        console.error('Invalid report provided to setEndOfDayReport');
        addEventLogEntry({message: 'SYSTEM ERROR: Invalid end of day report provided.', type: 'error'});
        return false;
    }
    _state = {
        ..._state,
        endOfDayReport: report
    };
    return true;
}

/**
 * Sets the processing status for the next day action.
 * @param {boolean} isProcessing - Whether the next day action is currently processing.
 */
export function setProcessingNextDay(isProcessing) {
    _state = {
        ..._state,
        isProcessingNextDay: isProcessing
    };
}


/**
 * Updates the tutorial state.
 * @param {object} updates An object containing tutorial properties to update.
 */
export function updateTutorial(updates) {
    if (typeof updates !== 'object' || updates === null) {
        console.error('Invalid updates provided to updateTutorial');
        return;
    }
    const currentTutorial = _state.tutorial || { active: false, currentDay: 1, currentStep: 0, completed: true };
    const newTutorial = { ...currentTutorial, ...updates };

    _state = {
        ..._state,
        tutorial: newTutorial
    };
}

/**
 * Updates properties of the warehouse.
 * @param {object} updates An object containing warehouse properties to update.
 */
export function updateWarehouse(updates) {
    if (typeof updates !== 'object' || updates === null) {
        console.error('Invalid updates provided to updateWarehouse');
        addEventLogEntry({message: 'SYSTEM ERROR: Invalid warehouse updates provided.', type: 'error'});
        return;
    }
    const currentWarehouse = _state.warehouse;
    const newWarehouse = { ...currentWarehouse, ...updates };

    _state = {
        ..._state,
        warehouse: newWarehouse
    };
}

// Store the default initial state to allow clean resets
const DEFAULT_INITIAL_STATE = JSON.parse(JSON.stringify(_state));
/**
 * Resets the game state to its initial values (deep copy of default).
 */
export function resetGameState() {
    setGameState(DEFAULT_INITIAL_STATE);
    // After reset, need to ensure UI is updated if called outside of initGame
    // This part is handled by main.js in initGame/loadGame flow.
}
