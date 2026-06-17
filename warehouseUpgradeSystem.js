// /home/enovo/eee/js/warehouseUpgradeSystem.js - Manages warehouse upgrades.
'use strict';

import { getGameState, updateCompany, updateWarehouse, addEventLogEntry } from './gameState.js';
import { showNotification } from './uiRenderer.js';
import { eventBus, GameEvents } from './eventBus.js'; // For future event integration

// --- Configuration Constants ---
const BASE_UPGRADE_COST = 50000;
const COST_MULTIPLIER_PER_LEVEL = 1.5;
const CAPACITY_INCREASE_PER_LEVEL = 10;
const MAX_WAREHOUSE_LEVEL = 10;

// --- Helper Functions ---

/**
 * Calculates the upgrade cost for the next warehouse level.
 * @param {number} currentLevel The current warehouse level.
 * @returns {number} The cost to upgrade to the next level.
 */
export function calculateUpgradeCost(currentLevel) {
    try {
        if (typeof currentLevel !== 'number' || currentLevel < 1) {
            console.warn("warehouseUpgradeSystem: Invalid currentLevel for calculateUpgradeCost. Defaulting to 1.");
            currentLevel = 1;
        }
        if (currentLevel >= MAX_WAREHOUSE_LEVEL) {
            return Infinity; // Cannot upgrade further
        }
        return Math.round(BASE_UPGRADE_COST * Math.pow(COST_MULTIPLIER_PER_LEVEL, currentLevel - 1));
    } catch (error) {
        console.error("warehouseUpgradeSystem: Error calculating upgrade cost:", error.message);
        addEventLogEntry({ message: `SYSTEM ERROR: Failed to calculate upgrade cost. ${error.message}`, type: 'error' });
        return Infinity; // Prevent accidental upgrades on error
    }
}

/**
 * Calculates the capacity for a given warehouse level.
 * @param {number} level The warehouse level.
 * @returns {number} The total capacity at that level.
 */
function calculateCapacity(level) {
    try {
        if (typeof level !== 'number' || level < 1) {
            console.warn("warehouseUpgradeSystem: Invalid level for calculateCapacity. Defaulting to 1.");
            level = 1;
        }
        return 20 + (CAPACITY_INCREASE_PER_LEVEL * (level - 1)); // Base 20 + 10 per level
    } catch (error) {
        console.error("warehouseUpgradeSystem: Error calculating capacity:", error.message);
        addEventLogEntry({ message: `SYSTEM ERROR: Failed to calculate warehouse capacity. ${error.message}`, type: 'error' });
        return 20; // Fallback to base capacity
    }
}

// --- Main Upgrade Logic ---

/**
 * Attempts to upgrade the warehouse to the next level.
 * @returns {boolean} True if upgrade was successful, false otherwise.
 */
export function upgradeWarehouse() {
    try {
        const currentState = getGameState();
        const warehouse = currentState.warehouse;
        const companyMoney = currentState.company.money;

        if (!warehouse || typeof warehouse.level !== 'number' || typeof warehouse.capacity !== 'number' || typeof warehouse.upgradeCost !== 'number') {
            console.error("warehouseUpgradeSystem: Invalid warehouse state detected. Cannot upgrade.");
            showNotification("SYSTEM ERROR: WAREHOUSE STATE CORRUPT. CANNOT UPGRADE.", "error");
            addEventLogEntry({ message: "SYSTEM ERROR: Warehouse state corrupt. Cannot upgrade.", type: 'error' });
            return false;
        }

        if (warehouse.level >= MAX_WAREHOUSE_LEVEL) {
            showNotification("WAREHOUSE IS ALREADY AT MAX LEVEL!", "warning");
            addEventLogEntry({ message: "WAREHOUSE: Already at max level.", type: 'info' });
            return false;
        }

        const cost = calculateUpgradeCost(warehouse.level);
        if (companyMoney < cost) {
            showNotification(`INSUFFICIENT FUNDS! NEED $${cost.toLocaleString()} TO UPGRADE.`, "error");
            addEventLogEntry({ message: `WAREHOUSE: Insufficient funds to upgrade (needed $${cost.toLocaleString()}).`, type: 'warning' });
            return false;
        }

        // Perform upgrade
        const newLevel = warehouse.level + 1;
        const newCapacity = calculateCapacity(newLevel);
        const newUpgradeCost = calculateUpgradeCost(newLevel);

        // Update company money and expenses
        updateCompany({
            money: companyMoney - cost,
            totalExpenses: currentState.company.totalExpenses + cost,
        });

        // Update company's storage capacity directly (this is where current UI displays it)
        // This is safe as updateCompany handles it immutably
        updateCompany({ storageCapacity: newCapacity });

        // Update warehouse state (level, capacity, next upgrade cost)
        updateWarehouse({
            level: newLevel,
            capacity: newCapacity,
            upgradeCost: newUpgradeCost
        });

        showNotification(`WAREHOUSE UPGRADED TO LEVEL ${newLevel}! CAPACITY: ${newCapacity}.`, "success");
        addEventLogEntry({ message: `WAREHOUSE: Upgraded to Level ${newLevel}. New capacity: ${newCapacity}.`, type: 'success' });
        eventBus.emit(GameEvents.WAREHOUSE_UPGRADED, { newLevel, newCapacity, cost });
        return true;

    } catch (error) {
        console.error("warehouseUpgradeSystem: Critical error during warehouse upgrade:", error.message);
        showNotification("SYSTEM ERROR: FAILED TO UPGRADE WAREHOUSE. CHECK CONSOLE.", "error");
        addEventLogEntry({ message: `SYSTEM ERROR: Failed to upgrade warehouse. ${error.message}`, type: 'error' });
        return false;
    }
}
