// marketSystem.js - Manages global market indices and their daily fluctuations.
'use strict';

import { getGameState, updateMarket, addEventLogEntry } from './gameState.js';
import { showNotification } from './uiRenderer.js';

/**
 * Updates the global market indexes and geopolitical tension based on random fluctuations.
 */
export function updateMarketIndexes() {
    const currentState = getGameState(); // Get current immutable state
    const oldSteelIndex = currentState.market.steelIndex;
    const oldElectronicsIndex = currentState.market.electronicsIndex;
    const oldGeopoliticalTension = currentState.market.geopoliticalTension;

    // Steel Index: fluctuates +/- 5%
    const newSteelIndex = Math.max(0.5, oldSteelIndex * (1 + (Math.random() * 0.1 - 0.05)));
    // Electronics Index: fluctuates +/- 5%
    const newElectronicsIndex = Math.max(0.5, oldElectronicsIndex * (1 + (Math.random() * 0.1 - 0.05)));
    // Geopolitical Tension: fluctuates +/- 10% (clamped between 0.1 and 1.0)
    const newGeopoliticalTension = Math.max(0.1, Math.min(1.0, oldGeopoliticalTension + (Math.random() * 0.2 - 0.1)));

    // Update contract volume modifier based on tension (higher tension, more contracts potentially)
    const newContractVolumeModifier = 1 + (newGeopoliticalTension * 1.5);

    updateMarket({
        steelIndex: newSteelIndex,
        electronicsIndex: newElectronicsIndex,
        geopoliticalTension: newGeopoliticalTension,
        contractVolumeModifier: newContractVolumeModifier
    });

    // Add a simple notification for significant changes if desired
    if (Math.abs(newGeopoliticalTension - oldGeopoliticalTension) > 0.15) {
        showNotification(`GEOPOLITICAL TENSION ${newGeopoliticalTension > oldGeopoliticalTension ? 'INCREASED' : 'DECREASED'} TO ${newGeopoliticalTension.toFixed(2)}.`, 'alert');
    }
}
