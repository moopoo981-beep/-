// eventSystem.js - Manages random game events.
'use strict';

import { getGameState, addEventLogEntry, updateCompany, updateMarket, RANDOM_EVENTS } from './gameState.js';
import { showNotification } from './uiRenderer.js';

/**
 * Triggers a random event and applies its effect to the game state.
 */
export function triggerRandomEvent() {
    const currentState = getGameState();
    if (!Array.isArray(RANDOM_EVENTS) || RANDOM_EVENTS.length === 0) {
        addEventLogEntry({ message: "SYSTEM ERROR: No random events defined.", type: 'error' });
        return;
    }

    const event = RANDOM_EVENTS[Math.floor(Math.random() * RANDOM_EVENTS.length)];
    if (!event || typeof event.effect !== 'function') {
        addEventLogEntry({ message: `SYSTEM ERROR: Invalid event object encountered.`, type: 'error' });
        return;
    }

    // Event effects are designed to call immutable updates on their own.
    // We pass currentState as a reference, but event effects should then use
    // the immutable update functions (updateCompany, updateMarket, addEventLogEntry)
    // from gameState.js internally.
    event.effect(currentState);
    showNotification(`CRITICAL ALERT: ${event.name.toUpperCase()} - ${event.description}`, 'alert');
}
