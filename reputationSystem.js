// reputationSystem.js - Manages company reputation.
'use strict';

import { getGameState, updateCompany } from './gameState.js';
import { showNotification } from './uiRenderer.js';

/**
 * Adjusts the company's reputation.
 * @param {number} amount The amount to change reputation by.
 */
export function updateReputation(amount) {
    if (typeof amount !== 'number') {
        console.error('Invalid amount provided to updateReputation');
        showNotification("SYSTEM ERROR: INVALID REPUTATION UPDATE ATTEMPT.", "error");
        return;
    }

    const currentState = getGameState();
    const oldReputation = currentState.company.reputation;
    const newReputation = Math.max(0, Math.min(100, oldReputation + amount));
    const reputationChange = newReputation - oldReputation; // Actual change applied

    updateCompany({
        reputation: newReputation,
        dailyReputationChange: currentState.company.dailyReputationChange + reputationChange
    });

    showNotification(`REPUTATION CHANGED BY ${reputationChange > 0 ? '+' : ''}${reputationChange}. CURRENT: ${newReputation}.`, reputationChange > 0 ? 'success' : 'warning');
}
