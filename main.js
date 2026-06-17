


import {
    getGameState, setGameState, resetGameState, updateCompany, updateSuppliers, updateCountries, setEndOfDayReport, addEventLogEntry, incrementDay, updateTutorial, setProcessingNextDay,
    PRODUCT_BLUEPRINTS // Import PRODUCT_BLUEPRINTS
} from './gameState.js';
import {
    updateDashboardUI, addEventLog as uiAddEventLog, showNotification, switchTab,
    renderSupplierMarket, renderWarehouse, renderAssembly, renderGlobalContracts,
    updateIntelPanel, initializeUIRenderer, toggleUIFreeze,
    renderBlueprintDetails, renderRequiredParts, elements // Import these for assembly UI logic
} from './uiRenderer.js';
import { renderDashboardPanels } from './dashboardSystem.js';
import { updateMarketIndexes } from './marketSystem.js';
import { createSupplier, negotiatePurchase } from './supplierSystem.js';
import { generateDailySuppliers } from './supplierGenerationSystem.js';
import { assembleProduct } from './assemblySystem.js';
import { renderAssemblyPartSelection, initAssemblyUISystem } from './assemblyUISystem.js';
import { createCountry, negotiateContract } from './contractSystem.js';
import { simulateCompetitorBids } from './competitorEngine.js';
import { triggerRandomEvent } from './eventSystem.js';
import { TutorialSystem } from './tutorialSystem.js';
import { eventBus, GameEvents } from './eventBus.js';

// --- Main Game Logic ---

function addEventLog(logEntry) {
    addEventLogEntry(logEntry);
    uiAddEventLog(logEntry);
}

function initGame() {
    // Attempt to load game from localStorage
    try {
        const savedStateString = localStorage.getItem('defenseIndustryCEO_saveGame');
        if (savedStateString) {
            const loadedState = JSON.parse(savedStateString);
            // Add validation for the tutorial object
            if (loadedState && loadedState.company && loadedState.tutorial) {
                // Ensure productionQueue is initialized for older saves
                if (!loadedState.productionQueue) {
                    loadedState.productionQueue = [];
                }
                setGameState(loadedState);
                showNotification('GAME LOADED SUCCESSFULLY!', 'success');
            } else {
                throw new Error("Save data is corrupt or outdated.");
            }
        } else {
             addEventLog({ message: "NO SAVED GAME FOUND. STARTING NEW MISSION.", type: "info" });
        }
    } catch (e) {
        console.error("Error loading game state:", e);
        showNotification(`ERROR: FAILED TO LOAD GAME. ${e.message}`, 'error');
        resetGameState(); // Fallback to new game
    }

    // Initialize systems
    // const tutorialSystem = new TutorialSystem();
    
    initializeUIRenderer({
        negotiatePurchase,
        assembleProduct,
        negotiateContract,
        toggleUIFreeze,
    });

    initAssemblyUISystem(); // Initialize assembly UI elements

    // Initial UI render
    const currentState = getGameState();
    if (currentState.currentDay === 1 && currentState.suppliers.length === 0) {
        // First time setup
        updateSuppliers(generateDailySuppliers());
        updateCountries(Array.from({ length: 2 }, createCountry));
        addEventLog({ message: "WELCOME, CEO. YOUR MISSION: BUILD A DEFENSE EMPIRE.", type: "info" });
    }

    updateDashboardUI();
    updateIntelPanel();
    switchTab('dashboard');
    renderAssembly(); // Render Assembly UI initially
    renderDashboardPanels(); // Render new dashboard panels initially
}

function saveGame() {
    try {
        localStorage.setItem('defenseIndustryCEO_saveGame', JSON.stringify(getGameState()));
        showNotification('GAME STATE SAVED.', 'success');
    } catch (e) {
        console.error("Error saving game state:", e);
        showNotification('SAVE FAILED. CHECK BROWSER STORAGE.', 'error');
    }
}

function loadGame() {
    // Reloading the page is the safest way to ensure all state is correctly re-initialized
    window.location.reload();
}

async function nextDay() {
    eventBus.emit(GameEvents.NEXT_DAY_INITIATED); // Signal day start
    if (getGameState().isProcessingNextDay) {
        showNotification("OPERATION IN PROGRESS...", "info");
        return;
    }

    setProcessingNextDay(true);
    
    
    try {
        // 1. Core Day-End Operations
        incrementDay();
        updateCompany({ totalRevenue: 0, totalExpenses: 0, netProfit: 0, dailyReputationChange: 0 });
        addEventLog({ message: "--- NEW OPERATION CYCLE BEGINS ---", type: "info" });

        // 2. Market & AI
        updateMarketIndexes();
        const competitorActivity = simulateCompetitorBids();

        // 3. Generate new opportunities
        updateSuppliers(generateDailySuppliers());
        const market = getGameState().market;
        const numContracts = Math.max(5, Math.floor((Math.random() * 2) + market.contractVolumeModifier * market.geopoliticalTension));
        updateCountries(Array.from({ length: numContracts }, createCountry));
        
        // 4. Random Event
        if (Math.random() < 0.25) {
            triggerRandomEvent();
        }

        // 5. Calculate daily expenses and check for bankruptcy
        const state = getGameState();
        const dailyMaintenance = state.inventory.length * 75 + state.assembledProducts.length * 150;
        updateCompany({
            money: state.company.money - dailyMaintenance,
            totalExpenses: state.company.totalExpenses + dailyMaintenance
        });
        addEventLog({ message: `Daily overhead: $${dailyMaintenance.toLocaleString()}`, type: 'warning' });

        if (getGameState().company.money < 0) {
            showNotification("CRITICAL FAILURE: COMPANY BANKRUPTCY.", "error");
            // Game over logic would go here
            setProcessingNextDay(false); // Ensure state is reset even on game over
            return;
        }

        // 6. Finalize report
        const finalState = getGameState();
        setEndOfDayReport({
            day: finalState.currentDay - 1,
            revenue: finalState.company.totalRevenue,
            expenses: finalState.company.totalExpenses,
            netProfit: finalState.company.totalRevenue - finalState.company.totalExpenses,
            reputationChange: finalState.company.dailyReputationChange,
            marketIndexes: finalState.market,
            competitorActivity: competitorActivity,
            politicalRiskAlerts: [], // Placeholder
        });
        
    } catch (error) {
        console.error("Error during nextDay processing:", error);
        addEventLog({ message: `CRITICAL SYSTEM ERROR: ${error.message}`, type: 'error' });
    } finally {
        // 7. Update all UI components
        updateDashboardUI();
        updateIntelPanel();
        renderSupplierMarket();
        renderGlobalContracts();
        renderWarehouse();
        renderAssembly();
        renderDashboardPanels(); // Refresh new dashboard panels daily
        if (checkGameEndConditions()) { // Check for win/loss conditions
            return; // Stop further processing if game ended
        }
        setProcessingNextDay(false);
        eventBus.emit(GameEvents.NEXT_DAY_COMPLETED); // Signal day completion
    }
}

/**
 * Checks for win or loss conditions and ends the game if met.
 * @returns {boolean} True if the game ended (win or loss), false otherwise.
 */
function checkGameEndConditions() {
    const state = getGameState();
    const company = state.company;

    // Win Conditions
    const WIN_MONEY = 10000000; // 500 Million
    const WIN_REPUTATION = 80;
    const WIN_CONTRACTS = 2;

    if (company.money >= WIN_MONEY && company.reputation >= WIN_REPUTATION && company.contractsCompleted >= WIN_CONTRACTS) {
        showNotification("CONGRATULATIONS! YOU HAVE BUILT A DEFENSE EMPIRE!", "success");
        addEventLog({ message: "GAME OVER: VICTORY!", type: "success" });
        toggleUIFreeze(true); // Freeze UI on win
        return true;
    }

    // Loss Conditions
    const LOSS_MONEY = -250000; // -250K
    const LOSS_REPUTATION = 10;

    if (company.money <= LOSS_MONEY) {
        showNotification("GAME OVER: BANKRUPTCY! YOUR COMPANY HAS FAILED.", "error");
        addEventLog({ message: "GAME OVER: BANKRUPTCY!", type: "error" });
        toggleUIFreeze(true); // Freeze UI on loss
        return true;
    }

    if (company.reputation <= LOSS_REPUTATION) {
        showNotification("GAME OVER: REPUTATION LOST! NO ONE TRUSTS YOUR COMPANY ANYMORE.", "error");
        addEventLog({ message: "GAME OVER: REPUTATION FAILURE!", type: "error" });
        toggleUIFreeze(true); // Freeze UI on loss
        return true;
    }

    return false; // Game continues
}

// --- Event Listeners ---
function bindUIEvents() {
    document.getElementById("next-day-button")?.addEventListener("click", nextDay);
    document.getElementById("save-game-button")?.addEventListener("click", saveGame);
    document.getElementById("load-game-button")?.addEventListener("click", loadGame);
    
    document.querySelectorAll(".nav-button").forEach(button => {
        button.addEventListener("click", (event) => {
            const target = event.currentTarget.dataset.target;
            if (target) switchTab(target);
        });
    });

            // Attach blueprint select change listener
        elements.productBlueprintSelect?.addEventListener("change", (e) => {
            const blueprintId = e.target.value;
            const blueprint = Object.values(PRODUCT_BLUEPRINTS).find(
                b => b.id === blueprintId
            );
    
            if (!blueprint) {
                renderBlueprintDetails(null);
                renderRequiredParts(null);
                renderAssemblyPartSelection(null); // Clear assembly part selection if no blueprint
                return;
            }
    
            renderBlueprintDetails(blueprint);
            renderRequiredParts(blueprint);
            renderAssemblyPartSelection(blueprint); // Crucial call to update interactive part selection
        });}

document.addEventListener("DOMContentLoaded", () => {
    initGame();
    bindUIEvents();
});
