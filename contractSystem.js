// contractSystem.js - Manages country contracts, sales negotiations, and political risk impacts.
'use strict';

import {
    getGameState, updateCompany, removeAssembledProduct, updateCountries, removeCountry, addEventLogEntry,
    BASE_COUNTRIES, PRODUCTION_CATEGORIES, incrementContractsCompleted // Import PRODUCTION_CATEGORIES
} from './gameState.js';
import { generateId } from './utils.js';
import { updateReputation } from './reputationSystem.js';
import { updateDashboardUI, renderGlobalContracts, renderAssembly, showNotification } from './uiRenderer.js';
import { eventBus, GameEvents } from './eventBus.js';

/**
 * Creates a new country with a contract offer, incorporating political risk.
 * @returns {object|null} A country object with contract details, or null if base countries are not defined.
 */
export function createCountry() {
    if (!Array.isArray(BASE_COUNTRIES) || BASE_COUNTRIES.length === 0) {
        console.error('BASE_COUNTRIES is not defined or empty.');
        addEventLogEntry({ message: 'SYSTEM ERROR: No base countries defined for contract creation.', type: 'error' });
        return null;
    }

    const currentState = getGameState();
    const baseCountry = BASE_COUNTRIES[Math.floor(Math.random() * BASE_COUNTRIES.length)];
    const minQualityRequired = Math.floor(Math.random() * 40) + 30; // 30-70
    let contractValue = Math.round(baseCountry.budget * (0.05 + Math.random() * 0.1)); // 5-15% of budget
    const techDemand = Math.min(100, baseCountry.techDemand + Math.floor(Math.random() * 20) - 10); // +/- 10 tech demand
    const relation = Math.min(100, baseCountry.relation + Math.floor(Math.random() * 10) - 5); // +/- 5 relation
    const politicalRisk = Math.min(1.0, baseCountry.baseRisk + (Math.random() * currentState.market.geopoliticalTension * 0.5)); // Base + Tension
    const paymentDelayChance = politicalRisk * 0.3; // 30% of political risk
    const contractCancellationChance = politicalRisk * 0.1; // 10% of political risk

    // Adjust contract value based on market tension and indexes
    contractValue *= (1 + (currentState.market.geopoliticalTension * 0.5)); // Higher tension means higher contract value
    contractValue *= (currentState.market.steelIndex + currentState.market.electronicsIndex) / 2; // Average of market indexes

    // Defensive check to ensure contractValue is always positive
    contractValue = Math.max(1000, contractValue); // Minimum contract value

    return {
        id: generateId(),
        name: baseCountry.name,
        budget: Math.round(contractValue / 100) * 100, // Round for cleaner numbers
        techDemand,
        relation,
        riskLevel: baseCountry.baseRisk, // Keeping original riskLevel for display for now
        minQualityRequired,
        politicalRisk,
        paymentDelayChance,
        contractCancellationChance,
        negotiationRound: 0,
        preferredCategory: baseCountry.preferredCategory || PRODUCTION_CATEGORIES.NAVAL, // Default to naval if not specified
    };
}

/**
 * Handles the player's attempt to sell an assembled product to a country.
 * @param {object} country The country offering the contract.
 * @param {object} product The assembled product to sell.
 * @param {number} offeredPrice The player's offered selling price.
 */
export function negotiateContract(country, product, offeredPrice) {
    if (!country || typeof country.id !== 'string' || !product || typeof product.id !== 'string' || typeof offeredPrice !== 'number' || offeredPrice < 0) {
        console.error('Invalid input for negotiateContract:', { country, product, offeredPrice });
        showNotification("SYSTEM ERROR: INVALID CONTRACT NEGOTIATION ATTEMPT.", "error");
        addEventLogEntry({ message: "SYSTEM ERROR: Invalid input for contract negotiation.", type: 'error' });
        return;
    }

    const currentState = getGameState();

    // Defensive check: Ensure product still exists in assembledProducts
    if (!currentState.assembledProducts.some(p => p.id === product.id)) {
        showNotification("ERROR: SELECTED PRODUCT NOT FOUND IN ASSEMBLED INVENTORY.", "error");
        addEventLogEntry({ message: `CONTRACT ERROR: Product ${product.name} (ID: ${product.id}) not found for sale.`, type: 'error' });
        return;
    }
    // Defensive check: Ensure country still exists in contracts
    if (!currentState.countries.some(c => c.id === country.id)) {
        showNotification("ERROR: CONTRACT NOT FOUND OR ALREADY CONCLUDED.", "error");
        addEventLogEntry({ message: `CONTRACT ERROR: Contract with ${country.name} (ID: ${country.id}) not found.`, type: 'error' });
        return;
    }


    if (product.power < country.minQualityRequired) {
        showNotification(`${country.name.toUpperCase()} REJECTS YOUR ${product.name.toUpperCase()} DUE TO INSUFFICIENT QUALITY (REQUIRED: ${country.minQualityRequired}, OFFERED: ${product.power}).`, "error");
        addEventLogEntry({ message: `CONTRACT REJECTED: ${country.name} rejected ${product.name} (Quality: ${product.power}) due to low quality.`, type: 'error' });
        return;
    }
    if (offeredPrice < product.productionCost) {
        showNotification(`YOU CANNOT SELL ${product.name.toUpperCase()} FOR LESS THAN ITS PRODUCTION COST ($${product.productionCost.toLocaleString()})!`, "error");
        addEventLogEntry({ message: `CONTRACT REJECTED: Offered price ($${offeredPrice}) below production cost for ${product.name}.`, type: 'error' });
        return;
    }

    // Update negotiation round immutably for the country
    const updatedCountries = currentState.countries.map(c => {
        if (c.id === country.id) {
            return { ...c, negotiationRound: (c.negotiationRound || 0) + 1 };
        }
        return c;
    });
    updateCountries(updatedCountries);

    let responseMessage = '';
    let success = false;
    let baseAcceptanceChance = country.relation * 0.5 + (100 - Math.abs(product.power - country.techDemand)) * 0.5;

    // --- NEW: CATEGORY MATCHING MODIFIER ---
    if (product.category && country.preferredCategory && product.category === country.preferredCategory) {
        baseAcceptanceChance += 15; // Significant boost for matching preferred category
        addEventLogEntry({ message: `NEGOTIATION BONUS: ${country.name} prefers ${product.category} products!`, type: 'info' });
    }
    // --- END NEW ---

    if (offeredPrice <= country.budget) {
        baseAcceptanceChance += 30;
    } else if (offeredPrice <= country.budget * 1.1) {
        baseAcceptanceChance += 15 - ((offeredPrice - country.budget) / country.budget * 150);
    } else {
        baseAcceptanceChance -= 50;
    }
    baseAcceptanceChance = Math.max(10, Math.min(90, baseAcceptanceChance));

    // Reputation impact
    const qualityDifference = product.power - country.minQualityRequired;
    if (qualityDifference < -10) {
        updateReputation(-10);
    } else if (qualityDifference < 0) {
        updateReputation(-5);
    } else if (qualityDifference > 10) {
        updateReputation(5);
    }

    if (Math.random() * 100 < baseAcceptanceChance) {
        // Contract accepted!
        updateCompany({
            money: currentState.company.money + offeredPrice,
            totalRevenue: currentState.company.totalRevenue + offeredPrice
        });
        removeAssembledProduct(product.id); // Remove product from inventory
        removeCountry(country.id); // Remove contract
        responseMessage = `${country.name.toUpperCase()} ACCEPTS YOUR OFFER OF $${offeredPrice.toLocaleString()} FOR ${product.name.toUpperCase()}!`;
        success = true;
        updateReputation(5);
        incrementContractsCompleted(); // Increment contracts completed count
        addEventLogEntry({ message: `CONTRACT ACCEPTED: ${country.name} purchased ${product.name} for $${offeredPrice.toLocaleString()}.`, type: 'success' });
        eventBus.emit(GameEvents.CONTRACT_ACCEPTED, { country, product, offeredPrice }); // Emit event
    } else {
        responseMessage = `${country.name.toUpperCase()} REJECTS YOUR OFFER OF $${offeredPrice.toLocaleString()} FOR ${product.name.toUpperCase()}. THEIR BUDGET MAY BE LIMITED OR EXPECTATIONS NOT MET.`;
        updateReputation(-2);
        addEventLogEntry({ message: `CONTRACT REJECTED: ${country.name} rejected offer for ${product.name} ($${offeredPrice.toLocaleString()}).`, type: 'error' });
        eventBus.emit(GameEvents.CONTRACT_REJECTED, { country, product, offeredPrice }); // Emit event
    }

    showNotification(responseMessage, success ? 'success' : 'info');
    updateDashboardUI();
    renderGlobalContracts();
    renderAssembly(); // Update assembled products list
}