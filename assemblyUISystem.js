// /home/enovo/eee/js/assemblyUISystem.js - Manages the UI and logic for part selection in the Assembly line.
'use strict';

import { getGameState, PRODUCT_BLUEPRINTS, PART_CATEGORIES } from './gameState.js';
import { assembleProduct } from './assemblySystem.js';
import { showNotification } from './uiRenderer.js'; // Assuming showNotification is globally available or imported
import { eventBus, GameEvents } from './eventBus.js'; // For future event integration

// --- DOM Elements Cache ---
// These will be initialized once the main DOM elements are available via initAssemblyUISystem
let assemblyElements = {
    assemblyPartSelection: null, // This will hold the #assembly-part-selection div
    assembleProductButton: null, // This will hold the assemble button
    requiredPartsList: null, // To ensure old display is handled
};

// Store current blueprint and selected parts
let currentSelectedBlueprint = null;
let currentSelectedParts = {}; // { category: { indexInRequired: partId, ... }, ... }

/**
 * Initializes this system by caching DOM elements and binding event listeners.
 * Should be called once after initial UI rendering (e.g., from main.js's bindUIEvents).
 */
export function initAssemblyUISystem() {
    try {
        assemblyElements.assemblyPartSelection = document.getElementById('assembly-part-selection');
        assemblyElements.assembleProductButton = document.getElementById('assemble-product-button');
        assemblyElements.requiredPartsList = document.getElementById('required-parts-list'); // Cache old required parts list to clear

        // Clear the old required parts list display area, if it exists
        if (assemblyElements.requiredPartsList) {
            assemblyElements.requiredPartsList.innerHTML = '';
        }

        if (!assemblyElements.assembleProductButton) {
            console.error("assemblyUISystem: Assemble Product Button not found!");
            return;
        }

        assemblyElements.assembleProductButton.addEventListener('click', handleAssembleButtonClick);
        
        // Ensure initial state is rendered (button disabled by default)
        updateAssembleButtonState();

    } catch (error) {
        console.error("assemblyUISystem: Error initializing system:", error.message);
        showNotification("SYSTEM ERROR: Assembly UI initialization failed.", "error");
    }
}


/**
 * Renders the part selection UI for the given blueprint.
 * This replaces the simple required parts list with interactive selection.
 * @param {object} blueprint The selected blueprint object.
 */
export function renderAssemblyPartSelection(blueprint) {
    try {
        const container = assemblyElements.assemblyPartSelection;
        if (!container) {
            console.error("assemblyUISystem: Assembly part selection container not found!");
            return;
        }
        container.innerHTML = ""; // Clear previous selections
        currentSelectedParts = {}; // Reset selections

        currentSelectedBlueprint = blueprint; // Store current blueprint

        if (!blueprint || !blueprint.requiredParts) {
            container.innerHTML = '<p class="text-dim">Select a blueprint to see required parts.</p>';
            updateAssembleButtonState();
            return;
        }

        const state = getGameState();

        // Create selection UI for each required part
        for (const partCategory in blueprint.requiredParts) {
            if (!Object.prototype.hasOwnProperty.call(blueprint.requiredParts, partCategory)) continue;

            const requiredQuantity = blueprint.requiredParts[partCategory];
            const ownedPartsInCategory = state.inventory.filter(part => part.category === partCategory);

            const categoryDiv = document.createElement('div');
            categoryDiv.className = 'required-part-selection-group';
            categoryDiv.innerHTML = `<h4 class="text-accent">${partCategory} x${requiredQuantity}</h4>`;

            for (let i = 0; i < requiredQuantity; i++) {
                const select = document.createElement('select');
                select.className = 'part-selector input-field';
                select.dataset.category = partCategory;
                select.dataset.index = i; // To uniquely identify selections within the required quantity

                // Add a default "Select Part" option
                const defaultOption = document.createElement('option');
                defaultOption.value = "";
                defaultOption.textContent = `-- Select ${partCategory} --`;
                select.appendChild(defaultOption);

                // Populate with owned parts
                ownedPartsInCategory.forEach(part => {
                    const option = document.createElement('option');
                    option.value = part.id;
                    option.textContent = `${part.name} (Q:${part.quality} D:${part.durability} C:$${part.cost.toLocaleString()})`;
                    select.appendChild(option);
                });

                select.addEventListener('change', handlePartSelectionChange);
                categoryDiv.appendChild(select);
            }
            container.appendChild(categoryDiv);
        }
        updateAssembleButtonState(); // Update button state after rendering
    } catch (error) {
        console.error("assemblyUISystem: Error rendering part selection:", error.message);
        showNotification("SYSTEM ERROR: Failed to render part selection.", "error");
    }
}

/**
 * Handles changes in part selection dropdowns.
 * @param {Event} e The change event.
 */
function handlePartSelectionChange(e) {
    try {
        const category = e.target.dataset.category;
        const partId = e.target.value;
        const index = parseInt(e.target.dataset.index);

        if (!currentSelectedParts[category]) {
            currentSelectedParts[category] = {};
        }

        // Check for duplicate part IDs across all selections *for the current blueprint*
        // Flatten all current selections first
        const allCurrentlySelectedIds = Object.values(currentSelectedParts).map(catSelections => {
            return Object.values(catSelections);
        }).flat().filter(id => id !== null && id !== undefined && id !== "");

        // If the newly selected partId is already in another selection (and it's not the empty option)
        if (partId && allCurrentlySelectedIds.includes(partId)) {
            showNotification("DUPLICATE PART SELECTED! Please choose a unique part for each slot.", "warning");
            e.target.value = ""; // Reset dropdown to default
            currentSelectedParts[category][index] = null; // Clear this specific slot's selection
        } else {
            currentSelectedParts[category][index] = partId || null;
        }
        updateAssembleButtonState();
    } catch (error) {
        console.error("assemblyUISystem: Error handling part selection change:", error.message);
        showNotification("SYSTEM ERROR: Part selection update failed.", "error");
    }
}

/**
 * Updates the state (enabled/disabled) of the Assemble Product button.
 */
function updateAssembleButtonState() {
    try {
        if (!assemblyElements.assembleProductButton) return;

        let allRequirementsMet = true;
        if (currentSelectedBlueprint && currentSelectedBlueprint.requiredParts) {
            for (const category in currentSelectedBlueprint.requiredParts) {
                if (!Object.prototype.hasOwnProperty.call(currentSelectedBlueprint.requiredParts, category)) continue;
                const required = currentSelectedBlueprint.requiredParts[category];
                // Count how many valid selections there are for this category
                const selected = Object.values(currentSelectedParts[category] || {}).filter(id => id !== null && id !== "").length;
                if (selected !== required) {
                    allRequirementsMet = false;
                    break;
                }
            }
        } else {
            allRequirementsMet = false; // No blueprint or required parts
        }

        assemblyElements.assembleProductButton.disabled = !allRequirementsMet;
    } catch (error) {
        console.error("assemblyUISystem: Error updating assemble button state:", error.message);
    }
}


/**
 * Handles the click event for the Assemble Product button.
 */
function handleAssembleButtonClick() {
    try {
        if (!currentSelectedBlueprint) {
            showNotification("Please select a blueprint first.", "warning");
            return;
        }

        const state = getGameState();
        const assembledPartMap = {};

        // Convert currentSelectedParts (object of index:partId) into expected selectedPartMap (object of part objects)
        for (const category in currentSelectedParts) {
            if (currentSelectedParts[category]) {
                const partIdsInCat = Object.values(currentSelectedParts[category]).filter(id => id !== null && id !== "");
                if (partIdsInCat.length > 0) {
                    assembledPartMap[category] = partIdsInCat
                        .map(partId => state.inventory.find(p => p.id === partId))
                        .filter(p => p !== undefined); // Filter out any parts not found (shouldn't happen if UI accurate)
                }
            }
        }

        // Final validation: ensure all required parts were actually found in inventory and match blueprint
        let finalValidationPassed = true;
        if (currentSelectedBlueprint && currentSelectedBlueprint.requiredParts) {
            for (const category in currentSelectedBlueprint.requiredParts) {
                if (!Object.prototype.hasOwnProperty.call(currentSelectedBlueprint.requiredParts, category)) continue;
                const required = currentSelectedBlueprint.requiredParts[category];
                const selected = (assembledPartMap[category] || []).length;
                if (selected !== required) {
                    finalValidationPassed = false;
                    break;
                }
            }
        } else {
            finalValidationPassed = false; // No blueprint or required parts
        }

        if (!finalValidationPassed) {
            showNotification("Critical error: Mismatch in selected parts. Please re-select and ensure all required parts are in inventory.", "error");
            return;
        }
        
        // Call the core assembly logic
        assembleProduct(currentSelectedBlueprint.id, assembledPartMap);

        // After successful assembly, re-render assembly UI to reflect changes
        renderAssemblyPartSelection(currentSelectedBlueprint); // Reset selection UI, will update button state
        eventBus.emit(GameEvents.PRODUCT_ASSEMBLED); // Emit event for other systems if needed

    } catch (error) {
        console.error("assemblyUISystem: Error during assemble button click:", error.message);
        showNotification("SYSTEM ERROR: Assembly process failed.", "error");
    }
}
