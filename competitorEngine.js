// competitorEngine.js - Manages AI competitor behavior, strategies, and market interactions.
'use strict';

import { getGameState, updateCompetitors, removeCountry, addEventLogEntry, COMPETITOR_STRATEGIES } from './gameState.js';
import { showNotification } from './uiRenderer.js';
import { clamp, safeNumber } from './utils.js'; // Import utility functions

/**
 * Simulates AI competitor bidding behavior on available contracts.
 * Competitors specialize in 'AIR', 'NAVAL', or 'ARMORED' production categories
 * and adjust their bidding strategy (LOW_COST, HIGH_TECH, BALANCED).
 * @returns {Array<string>} A list of activity messages for the end-of-day report.
 */
export function simulateCompetitorBids() {
    const competitorActivity = [];
    const currentState = getGameState();
    let availableContracts = [...currentState.countries]; // Create a mutable copy to track contracts. These are country objects.

    if (availableContracts.length === 0) {
        return ["NO CONTRACTS AVAILABLE FOR COMPETITORS TO BID ON."];
    }

    const updatedCompetitors = [...currentState.competitors]; // Create mutable copy for updates

    updatedCompetitors.forEach((comp, compIndex) => {
        if (!comp || !comp.id || typeof comp.capital !== 'number' || typeof comp.reputation !== 'number' || !comp.strategy || !comp.specializedCategory) { // Defensive check
            console.error("Invalid competitor object encountered:", comp);
            addEventLogEntry({message: "SYSTEM ERROR: Invalid competitor data for simulation.", type: 'error'});
            return;
        }
        if (availableContracts.length === 0) return; // No contracts left for this competitor to bid on

        // Competitors have a chance to bid, influenced by their strategy and current market conditions
        let biddingChance = 0.7; // Base 70% chance

        // Adjust bidding chance based on geopolitical tension (more tension = more bidding)
        biddingChance += currentState.market.geopoliticalTension * 0.1;
        biddingChance = clamp(biddingChance, 0.1, 1.0); // Clamp bidding chance

        if (Math.random() < biddingChance) {
            // Competitor prioritizes contracts matching their specialized category
            const preferredContracts = availableContracts.filter(contract => contract.preferredCategory === comp.specializedCategory);
            let targetContract = null;

            if (preferredContracts.length > 0) {
                targetContract = preferredContracts[Math.floor(Math.random() * preferredContracts.length)];
            } else {
                // If no preferred, pick a random available contract
                targetContract = availableContracts[Math.floor(Math.random() * availableContracts.length)];
            }
            
            if (!targetContract || !targetContract.id) { // Defensive check
                console.error("Invalid target contract object encountered for competitor:", comp.name);
                addEventLogEntry({message: `SYSTEM ERROR: Competitor ${comp.name} failed to find valid target contract.`, type: 'error'});
                return;
            }

            let bidAmount = 0;
            let productQuality = 0; // Simulated product quality for competitor

            // Adjust bid based on competitor's capital, reputation, and strategy
            let baseBidFactor = (comp.reputation / 100); // Competitor reputation influences bid
            baseBidFactor = clamp(baseBidFactor, 0.5, 1.5); // Ensure reasonable range

            switch (comp.strategy) {
                case COMPETITOR_STRATEGIES.LOW_COST:
                    // Focus on undercutting
                    bidAmount = targetContract.budget * clamp(0.6 + Math.random() * 0.2 - (baseBidFactor * 0.1), 0.5, 0.9); // 50-90% of budget, lower with better rep
                    productQuality = targetContract.minQualityRequired + clamp(Math.random() * 10 - 5, -10, 10); // Meet minimum reqs, maybe slightly less
                    break;
                case COMPETITOR_STRATEGIES.HIGH_TECH:
                    // Focus on high quality, higher price
                    bidAmount = targetContract.budget * clamp(1.0 + Math.random() * 0.3 + (baseBidFactor * 0.1), 1.0, 1.5); // 100-150% of budget, higher with better rep
                    productQuality = clamp(targetContract.minQualityRequired + 20 + (Math.random() * 10), 0, 100); // High quality
                    break;
                case COMPETITOR_STRATEGIES.BALANCED:
                default:
                    bidAmount = targetContract.budget * clamp(0.8 + Math.random() * 0.4, 0.7, 1.3); // 70-130% of budget
                    productQuality = targetContract.minQualityRequired + clamp(Math.random() * 15 - 5, -10, 15); // Slightly above minimum
                    break;
            }

            bidAmount = safeNumber(Math.round(bidAmount), 0);
            productQuality = safeNumber(Math.round(productQuality), 0);
            
            // Ensure bid amount doesn't exceed competitor capital (simple check)
            bidAmount = Math.min(bidAmount, comp.capital * 0.5); // Can bid up to 50% of capital for one contract

            // Simulate acceptance (more complex model than player for AI)
            let acceptanceScore = targetContract.relation * 0.01; // Country relation to competitor
            acceptanceScore += (productQuality / 100); // Higher quality is better
            acceptanceScore -= (bidAmount / targetContract.budget); // High bid reduces chance
            acceptanceScore += (comp.reputation / 100); // Competitor's reputation matters

            if (Math.random() < acceptanceScore && productQuality >= targetContract.minQualityRequired) {
                // Competitor wins the contract!
                const newCapital = comp.capital + bidAmount; // Capital increases on winning
                const newReputation = clamp(comp.reputation + 2, 0, 100); // Rep goes up

                updatedCompetitors[compIndex] = {
                    ...comp,
                    capital: newCapital,
                    reputation: newReputation
                };

                competitorActivity.push(`${comp.name} (${comp.strategy}, ${comp.specializedCategory}) WON contract for ${targetContract.name} for $${bidAmount.toLocaleString()} (Quality: ${productQuality}).`);
                
                // Remove the contract from available contracts for the player AND other competitors
                removeCountry(targetContract.id); // This modifies the global state.countries
                // We need to remove it from availableContracts local array too to prevent other competitors from bidding on it this turn
                availableContracts = availableContracts.filter(contract => contract.id !== targetContract.id);
                
                showNotification(`COMPETITOR ALERT: ${comp.name} WON CONTRACT WITH ${targetContract.name}. PLAYER OPPORTUNITY LOST.`, 'alert');
            } else {
                competitorActivity.push(`${comp.name} (${comp.strategy}, ${comp.specializedCategory}) BID for ${targetContract.name} with $${bidAmount.toLocaleString()} (Quality: ${productQuality}), but did NOT win.`);
            }
        }
    });
    updateCompetitors(updatedCompetitors); // Save updated competitor states
    return competitorActivity;
}
