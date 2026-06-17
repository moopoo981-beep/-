// uiRenderer.js - Handles all UI rendering and updates for the game.
'use strict';

import { getGameState, PART_CATEGORIES, PRODUCT_BLUEPRINTS, PRODUCTION_CATEGORIES } from './gameState.js';
import { eventBus, GameEvents } from './eventBus.js';

// Callbacks for game logic functions, to be set by main.js
let _negotiatePurchaseCallback = null;
let _rejectOfferCallback = null;
let _assembleProductCallback = null;
let _negotiateContractCallback = null;

// --- DOM Elements Cache ---
export let elements = {}; // Initialize as empty object and export it

/**
 * Initializes the DOM elements cache. Must be called after DOMContentLoaded.
 */
function initDOMElements() {
    elements = {
        companyMoney: document.getElementById('company-money'),
        currentDay: document.getElementById('current-day'),
        reputationBar: document.getElementById('reputation-bar'),
        companyReputation: document.getElementById('company-reputation'),
        companyTechLevel: document.getElementById('company-tech-level'),
        storageCapacity: document.getElementById('storage-capacity'),
        eventLog: document.getElementById('event-log'),
        navButtons: document.querySelectorAll('.nav-button'),
        gameSections: document.querySelectorAll('.game-section'),
        supplierOffers: document.getElementById('supplier-offers'),
        warehouseInventory: document.getElementById('warehouse-inventory'),
        inventoryCount: document.getElementById('inventory-count'),
        maxInventory: document.getElementById('max-inventory'),
        productBlueprintSelect: document.getElementById('product-blueprint-select'),
        selectedBlueprintDetails: document.getElementById('selected-blueprint-details'),
        requiredPartsList: document.getElementById('required-parts-list'),
        assembleProductButton: document.getElementById('assemble-product-button'),
        assembledProductsList: document.getElementById('assembled-products-list'),
        countryContracts: document.getElementById('country-contracts'),
        // Intel Panel (Previously Modal)
        reportRevenue: document.getElementById('report-revenue'),
        reportExpenses: document.getElementById('report-expenses'),
        reportNetProfit: document.getElementById('report-net-profit'),
        reportCompanyCapital: document.getElementById('report-company-capital'),
        reportReputationChange: document.getElementById('report-reputation-change'),
        reportReputationCurrent: document.getElementById('report-reputation-current'),
        reportSteelIndex: document.getElementById('report-steel-index'),
        reportElectronicsIndex: document.getElementById('report-electronics-index'),
        reportGeopoliticalTension: document.getElementById('report-geopolitical-tension'),
        reportCompetitorActivity: document.getElementById('report-competitor-activity'),
        // New UI Elements
        notificationContainer: document.getElementById('notification-container'),
        loadingOverlay: document.getElementById('loading-overlay')
    };
}

/**
 * Initializes the UI Renderer by setting up callbacks for game logic functions.
 */
export function initializeUIRenderer(callbacks) {
    initDOMElements(); // Call to initialize elements after DOM is ready
    if (typeof callbacks !== 'object' || callbacks === null) {
        console.error('Invalid callbacks provided to initializeUIRenderer');
        return;
    }
    _negotiatePurchaseCallback = callbacks.negotiatePurchase;
    _rejectOfferCallback = callbacks.rejectOffer;
    _assembleProductCallback = callbacks.assembleProduct;
    _negotiateContractCallback = callbacks.negotiateContract;
}

/**
 * Helper function for safe image loading with a placeholder.
 */
function safeImageLoad(imgElement, src) {
    // With all images removed, this function becomes a no-op for actual image loading.
    // It will just clear the src to ensure no broken image icons appear.
    imgElement.src = ""; 
}

// --- Core UI Update Functions ---

export function updateDashboardUI() {
    const state = getGameState();
    if (elements.companyMoney) elements.companyMoney.textContent = state.company.money.toLocaleString();
    if (elements.currentDay) elements.currentDay.textContent = state.currentDay;
    if (elements.companyReputation) elements.companyReputation.textContent = state.company.reputation;
    if (elements.reputationBar) {
        elements.reputationBar.style.width = `${state.company.reputation}%`;
    }
    if (elements.companyTechLevel) elements.companyTechLevel.textContent = state.company.techLevel;
    if (elements.storageCapacity) elements.storageCapacity.textContent = state.company.storageCapacity;
    if (elements.maxInventory) elements.maxInventory.textContent = state.company.storageCapacity;
    if (elements.inventoryCount) elements.inventoryCount.textContent = state.inventory.length;
}

export function addEventLog(logEntry) {
    if (!elements.eventLog) return;
    const li = document.createElement('li');
    li.textContent = `[DAY ${logEntry.day || getGameState().currentDay}] ${logEntry.message}`;
    if (logEntry.type) li.classList.add(logEntry.type);
    elements.eventLog.prepend(li);
    while (elements.eventLog.children.length > 50) {
        elements.eventLog.removeChild(elements.eventLog.lastChild);
    }
}

export function showNotification(message, type = 'info') {
    if (!elements.notificationContainer) return;
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    elements.notificationContainer.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        notification.style.animation = 'fadeOut 0.5s ease forwards';
        setTimeout(() => notification.remove(), 500);
    }, 5000);
}

export function switchTab(targetSectionId) {
    elements.gameSections.forEach(section => section.classList.remove('active'));
    const targetSection = document.getElementById(targetSectionId);
    if (targetSection) targetSection.classList.add('active');

    elements.navButtons.forEach(button => {
        button.classList.remove('active');
        if (button.dataset.target === targetSectionId) {
            button.classList.add('active');
        }
    });

    // Re-render content for the newly active tab and emit events
    if (targetSectionId === 'supplier-market') {
        renderSupplierMarket();
        eventBus.emit(GameEvents.SUPPLIER_MARKET_OPENED);
    } else if (targetSectionId === 'warehouse') {
        renderWarehouse();
        eventBus.emit(GameEvents.WAREHOUSE_OPENED);
    } else if (targetSectionId === 'assembly') {
        renderAssembly();
        eventBus.emit(GameEvents.ASSEMBLY_OPENED);
    } else if (targetSectionId === 'global-contracts') {
        renderGlobalContracts();
        eventBus.emit(GameEvents.GLOBAL_CONTRACTS_OPENED);
    } else if (targetSectionId === 'dashboard') {
        updateDashboardUI();
        eventBus.emit(GameEvents.DASHBOARD_OPENED);
    }
}

export function toggleUIFreeze(freeze) {
    if (elements.loadingOverlay) {
        elements.loadingOverlay.style.display = freeze ? 'flex' : 'none';
    }
    // The old logic for disabling buttons can be removed if the overlay prevents clicks.
    // Keeping it for robustness.
    document.querySelectorAll('button, select, input').forEach(el => {
        el.disabled = freeze;
    });
}

// --- Specific Section Renderers ---

export function updateIntelPanel() {
    const state = getGameState();
    const report = state.endOfDayReport;
    if (!report) return;

    elements.reportRevenue.textContent = (report.revenue || 0).toLocaleString();
    elements.reportExpenses.textContent = (report.expenses || 0).toLocaleString();
    elements.reportNetProfit.textContent = (report.netProfit || 0).toLocaleString();
    elements.reportCompanyCapital.textContent = (state.company.money || 0).toLocaleString();
    
    elements.reportReputationChange.textContent = (report.reputationChange > 0 ? '↑' : '↓') + Math.abs(report.reputationChange || 0);
    elements.reportReputationCurrent.textContent = state.company.reputation || 0;

    elements.reportSteelIndex.textContent = (report.marketIndexes.steelIndex || 0).toFixed(2);
    elements.reportElectronicsIndex.textContent = (report.marketIndexes.electronicsIndex || 0).toFixed(2);
    elements.reportGeopoliticalTension.textContent = (report.marketIndexes.geopoliticalTension || 0).toFixed(2);

    elements.reportCompetitorActivity.innerHTML = '';
    if (report.competitorActivity && report.competitorActivity.length > 0) {
        report.competitorActivity.forEach(activity => {
            const li = document.createElement('li');
            li.textContent = activity;
            elements.reportCompetitorActivity.appendChild(li);
        });
    } else {
        elements.reportCompetitorActivity.innerHTML = '<li>No significant activity.</li>';
    }
}

// NOTE: The other render functions (renderSupplierMarket, renderWarehouse, etc.)
// are large and their core logic (creating elements) hasn't changed, only their
// CSS classes which are applied in the `innerHTML` strings.
// A full review would refactor these to use `document.createElement` for better
// security and maintainability, but for this step, we will assume they work
// with the new `index.html` structure. I will paste them here as-is.

export function renderSupplierMarket() {
    console.log('renderSupplierMarket called.');
    if (!elements.supplierOffers) {
        console.error('elements.supplierOffers is null or undefined.');
        return;
    }

    const currentState = getGameState();
    console.log('Suppliers in state:', currentState.suppliers);
    elements.supplierOffers.innerHTML = ''; // Clear existing
    
    if (!currentState.suppliers || currentState.suppliers.length === 0) {
        elements.supplierOffers.innerHTML = '<p class="text-dim">NO SUPPLIERS AVAILABLE TODAY.</p>';
        return;
    }
    
    currentState.suppliers.forEach(supplier => {
        if (!supplier || !supplier.parts) return;
        supplier.parts.forEach(part => {
            const offerElement = document.createElement('div');
            offerElement.className = 'card supplier-card';
            // This can be further broken down into smaller components
            offerElement.innerHTML = `
                <div class="card-content">
                    <h4>${part.name}</h4>
                    <p>FROM: ${supplier.name}</p>
                    <p>Q: ${part.quality} | D: ${part.durability}</p>
                    <p>PRICE: <span class="text-accent">$${part.cost.toLocaleString()}</span></p>
                </div>
                <div class="card-actions">
                    <input type="number" id="offer-input-${part.id}" placeholder="YOUR OFFER" min="0" class="input-field">
                    <button class="btn primary" data-tutorial="offer-button" data-part-id="${part.id}" data-supplier-id="${supplier.id}">OFFER</button>
                </div>
            `;
            elements.supplierOffers.appendChild(offerElement);
            // Attach listener directly after appending
            offerElement.querySelector('.btn.primary')?.addEventListener('click', handleSupplierOfferClick);
        });
    });
} // Correctly close renderSupplierMarket

function handleSupplierOfferClick(event) {
    const partId = event.currentTarget.dataset.partId;
    const supplierId = event.currentTarget.dataset.supplierId;
    const offerInput = document.getElementById(`offer-input-${partId}`);
    const offer = parseInt(offerInput.value);

    if (!partId || !supplierId || isNaN(offer) || offer < 0) {
        showNotification("Invalid offer.", "error");
        return;
    }
    if (_negotiatePurchaseCallback) {
        const supplier = getGameState().suppliers.find(s => s.id === supplierId);
        const part = supplier?.parts.find(p => p.id === partId);
        if (supplier && part) {
            _negotiatePurchaseCallback(supplier, part, offer);
            eventBus.emit(GameEvents.SUPPLIER_ITEM_PURCHASED, { supplier, part, offer });
        }
    }
}

export function renderWarehouse() {
    if (!elements.warehouseInventory) return;
    const state = getGameState();
    elements.warehouseInventory.innerHTML = '';
    if (!state.inventory || state.inventory.length === 0) {
        elements.warehouseInventory.innerHTML = '<p class="text-dim">WAREHOUSE IS EMPTY.</p>';
        return;
    }
    state.inventory.forEach(part => {
        const itemElement = document.createElement('div');
        itemElement.className = 'card warehouse-item';
        itemElement.innerHTML = `
            <h4>${part.name}</h4>
            <p>CATEGORY: ${part.category}</p>
            <p>Q: ${part.quality} | D: ${part.durability}</p>
            <p>COST: $${part.cost.toLocaleString()}</p>
        `;
        elements.warehouseInventory.appendChild(itemElement);
    });
}

export function renderAssembly() {
    // This function needs a more significant rewrite to work with the new layout,
    // but the core logic of populating selects and lists remains.
    // For now, ensuring it doesn't crash.
    if (!elements.productBlueprintSelect) return;
    renderProductBlueprints();
    
    // Handle initial state if a blueprint is already selected (e.g., after loading game)
    const initialBlueprintId = elements.productBlueprintSelect.value;
    if (initialBlueprintId) {
        const initialBlueprint = Object.values(PRODUCT_BLUEPRINTS).find(b => b.id === initialBlueprintId);
        if (initialBlueprint) {
            renderBlueprintDetails(initialBlueprint);
            renderRequiredParts(initialBlueprint);
        }
    } else {
        // Render empty state if no blueprint is initially selected
        renderBlueprintDetails(null);
        renderRequiredParts(null);
    }
    // Render assembled products
    const state = getGameState();
    elements.assembledProductsList.innerHTML = '';
    if (state.assembledProducts && state.assembledProducts.length > 0) {
        state.assembledProducts.forEach(product => {
            const productElement = document.createElement('div');
            productElement.className = 'card';
            productElement.innerHTML = `<h4>${product.name}</h4><p>POWER: ${product.power}</p><p>COST: $${product.productionCost.toLocaleString()}</p>`;
            elements.assembledProductsList.appendChild(productElement);
        });
    }
}

// Placeholder for the original complex functions
function renderProductBlueprints() {
    if (!elements.productBlueprintSelect) return;
    elements.productBlueprintSelect.innerHTML = ''; // Clear existing options

    const defaultOption = document.createElement('option');
    defaultOption.value = "";
    defaultOption.textContent = "SELECT BLUEPRINT";
    elements.productBlueprintSelect.appendChild(defaultOption);

    Object.values(PRODUCT_BLUEPRINTS).forEach(bp => {
        const option = document.createElement('option');
        option.value = bp.id;
        option.textContent = bp.name;
        elements.productBlueprintSelect.appendChild(option);
    });
}
/**
 * Renders the details of the selected blueprint.
 * @param {object} blueprint The selected blueprint object.
 */
export function renderBlueprintDetails(blueprint) {
  const container = elements.selectedBlueprintDetails;
  if (!container) return;

  if (!blueprint) {
    container.innerHTML = 'Select a blueprint to see details.';
    return;
  }

  container.innerHTML = `
    <h3>${blueprint.name}</h3>
    <p>Category: ${blueprint.category}</p>
    <p>Production Time: ${blueprint.productionTime} days</p>
    <p>Tech Requirement: ${blueprint.techRequirement}</p>
    <p>Base Assembly Cost: $${blueprint.baseAssemblyCost.toLocaleString()}</p>
  `;
}

/**
 * Renders the required parts for the selected blueprint.
 * @param {object} blueprint The selected blueprint object.
 */
export function renderRequiredParts(blueprint) {
  const container = elements.requiredPartsList;
  if (!container) return;
  container.innerHTML = "";

  if (!blueprint || !blueprint.requiredParts) {
    container.innerHTML = '<p>Select a blueprint to see required parts.</p>';
    return;
  }

  // Iterate over the requiredParts object
  for (const partCategory in blueprint.requiredParts) {
    if (!Object.prototype.hasOwnProperty.call(blueprint.requiredParts, partCategory)) continue;

    const requiredQuantity = blueprint.requiredParts[partCategory];
    const ownedQuantity = getPartCount(partCategory);

    const div = document.createElement("div");
    div.textContent = `${partCategory} x${requiredQuantity}`;
    
    if (ownedQuantity < requiredQuantity) {
       div.style.color = "red"; // Highlight in red if not enough parts
       div.title = `Missing ${requiredQuantity - ownedQuantity} ${partCategory}`;
    } else {
       div.title = `Owned: ${ownedQuantity}`;
    }
    container.appendChild(div);
  }
} // ADDED MISSING BRACE FOR renderRequiredParts

export function renderGlobalContracts() {
    if (!elements.countryContracts) return;
    const state = getGameState();
    elements.countryContracts.innerHTML = '';
    if (!state.countries || state.countries.length === 0) {
        elements.countryContracts.innerHTML = '<p class="text-dim">NO GLOBAL CONTRACTS AVAILABLE.</p>';
        return;
    }
    state.countries.forEach(country => {
        const contractElement = document.createElement('div');
        contractElement.className = 'card contract-offer';
        contractElement.innerHTML = `
            <h4>${country.name}</h4>
            <p>BUDGET: $${country.budget.toLocaleString()}</p>
            <p>REQ. QUALITY: ${country.minQualityRequired}</p>
            <div class="card-actions">
                <select class="product-select" data-country-id="${country.id}"><option value="">SELECT PRODUCT</option></select>
                <input type="number" class="offer-price-input" placeholder="OFFER PRICE">
                <button class="btn primary" data-tutorial="contract-offer-button" data-country-id="${country.id}">OFFER</button>
            </div>
        `;
        // Populate select
        const select = contractElement.querySelector('.product-select');
        state.assembledProducts.forEach(p => {
            select.innerHTML += `<option value="${p.id}">${p.name} (P:${p.power})</option>`;
        });
        elements.countryContracts.appendChild(contractElement);
        // Attach listener directly after appending
        contractElement.querySelector('.btn.primary')?.addEventListener('click', handleOfferContractClick);
    });
}

function handleOfferContractClick(event) {
    const countryId = event.currentTarget.dataset.countryId;
    const container = event.currentTarget.closest('.contract-offer');
    const productId = container.querySelector('.product-select').value;
    const offeredPrice = parseInt(container.querySelector('.offer-price-input').value);

    if (!countryId || !productId || isNaN(offeredPrice)) {
        showNotification("Invalid contract offer.", "error");
        return;
    }

    if (_negotiateContractCallback) {
        // Emit event before calling the actual negotiation logic
        eventBus.emit(GameEvents.CONTRACT_OFFERED, { countryId, productId, offeredPrice });
        const country = getGameState().countries.find(c => c.id === countryId);
        const product = getGameState().assembledProducts.find(p => p.id === productId);
        if(country && product) {
            _negotiateContractCallback(country, product, offeredPrice);
        }
    }
}

// Dummy functions to avoid breaking from copy-paste
// function handleProductSelectChange() {} // Removed as it's not needed with direct event listener
// function handleOfferInputChange() {} // Removed as it's not needed with direct event listener

/**
 * Helper function to count how many parts of a specific category the company owns.
 * @param {string} partCategory The category of the part (e.g., PART_CATEGORIES.HULL).
 * @returns {number} The count of owned parts in that category.
 */
function getPartCount(partCategory) {
    const state = getGameState();
    return state.inventory.filter(part => part.category === partCategory).length;
}
