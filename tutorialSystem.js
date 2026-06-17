// eee/js/tutorialSystem.js - Disabled version
'use strict';

// Import necessary modules to avoid import errors, but the functionality is removed.
import { eventBus, GameEvents } from './eventBus.js';
import { getGameState, updateTutorial as updateGameStateTutorial } from './gameState.js';

/**
 * Disabled TutorialSystem class.
 * All functionality is removed, effectively making the tutorial a no-op.
 * This file is kept to prevent import errors in other modules.
 */
export class TutorialSystem {
    constructor() {
        console.log("TutorialSystem: Disabled.");
        // Ensure UI is unlocked if tutorial is implicitly disabled
        document.body.classList.remove('tutorial-locked');
        // Clear any old highlights if they somehow persisted
        document.querySelectorAll('.tutorial-highlight').forEach(el => el.classList.remove('tutorial-highlight'));
    }

    // All methods are now stubs
    initialize() {}
    _start() {}
    _createOverlay() {}
    _showMessage() {}
    _hideMessage() {}
    _highlight() {}
    _clearHighlights() {}
    _lockUI() {}
    _unlockUI() {}
    _registerListener() {}
    _unregisterAllListeners() {}
    _updateTutorialState() {}
    _handleContinue() {}
    _handleSkip() {}
    _completeTutorial() {}
    _goToStep() {}

    // Stubs for step handlers
    _step1_handleSupplierMarketOpened() {}
    _step2_handleItemPurchased() {}
    _step3_handleWarehouseOpened() {}
    _step4_handleNextDayInitiated() {}
    _step4_handleNextDayCompleted() {}
    _step5_handleAssemblyOpened() {}
    _step6_handleNextDayInitiated() {}
    _step6_handleNextDayCompleted() {}
    _step7_handleGlobalContractsOpened() {}
    _step8_handleContractOffered() {}
    _step9_handleNextDayInitiated() {}
    _step9_handleNextDayCompleted() {}
    _step10_handleNextDayInitiated() {}
    _step10_handleNextDayCompleted() {}
}