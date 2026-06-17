// /home/enovo/eee/js/dashboardSystem.js - New module for rendering extended dashboard panels.
'use strict';

import { getGameState } from './gameState.js';
import { eventBus, GameEvents } from './eventBus.js'; // Assuming eventBus might be useful for future updates


// --- Panel Rendering Functions ---

/**
 * Renders the Market Trend mini chart panel.
 * @param {HTMLElement} container The DOM element to render into.
 */
function renderMarketTrendChart(container) {
    try {
        if (!container) throw new Error("Market Trend container is undefined.");
        const state = getGameState();
        // Placeholder for actual chart rendering logic
        container.innerHTML = `
            <div class="panel-card market-trend">
                <h3>MARKET TRENDS</h3>
                <p>Steel Index: ${state.market.steelIndex.toFixed(2)}</p>
                <p>Electronics Index: ${state.market.electronicsIndex.toFixed(2)}</p>
                <!-- Mini chart placeholder -->
                <div style="height: 50px; background-color: #0d2235;">[Chart Placeholder]</div>
            </div>
        `;
    } catch (error) {
        console.warn("dashboardSystem: Error rendering Market Trend chart:", error.message);
    }
}

/**
 * Renders the Active Contracts summary panel.
 * @param {HTMLElement} container The DOM element to render into.
 */
function renderActiveContractsSummary(container) {
    try {
        if (!container) throw new Error("Active Contracts container is undefined.");
        const state = getGameState();
        const activeContractsCount = state.countries.length; // Assuming 'countries' list active contracts
        container.innerHTML = `
            <div class="panel-card active-contracts">
                <h3>ACTIVE CONTRACTS</h3>
                <p>Count: ${activeContractsCount}</p>
                <!-- List top 3 contracts? -->
            </div>
        `;
    } catch (error) {
        console.warn("dashboardSystem: Error rendering Active Contracts summary:", error.message);
    }
}

/**
 * Renders the Production Queue display panel.
 * @param {HTMLElement} container The DOM element to render into.
 */
function renderProductionQueue(container) {
    try {
        if (!container) throw new Error("Production Queue container is undefined.");
        const state = getGameState();
        // Assuming there's a 'productionQueue' in gameState (need to add later if not)
        const productionQueueCount = state.productionQueue.length;
        container.innerHTML = `
            <div class="panel-card production-queue">
                <h3>PRODUCTION QUEUE</h3>
                <p>Items: ${productionQueueCount}</p>
                <!-- List items in queue -->
            </div>
        `;
    } catch (error) {
        console.warn("dashboardSystem: Error rendering Production Queue:", error.message);
    }
}

/**
 * Renders the Competitor Activity monitor panel.
 * @param {HTMLElement} container The DOM element to render into.
 */
function renderCompetitorActivityMonitor(container) {
    try {
        if (!container) throw new Error("Competitor Activity container is undefined.");
        const state = getGameState();
        const latestActivity = state.endOfDayReport?.competitorActivity || ["No recent activity."];
        container.innerHTML = `
            <div class="panel-card competitor-activity">
                <h3>COMPETITOR ACTIVITY</h3>
                <ul>
                    ${latestActivity.slice(0, 3).map(activity => `<li>${activity}</li>`).join('')}
                </ul>
            </div>
        `;
    } catch (error) {
        console.warn("dashboardSystem: Error rendering Competitor Activity monitor:", error.message);
    }
}

/**
 * Renders the Political Risk meter panel.
 * @param {HTMLElement} container The DOM element to render into.
 */
function renderPoliticalRiskMeter(container) {
    try {
        if (!container) throw new Error("Political Risk container is undefined.");
        const state = getGameState();
        container.innerHTML = `
            <div class="panel-card political-risk">
                <h3>POLITICAL RISK</h3>
                <p>Global Tension: ${state.market.geopoliticalTension.toFixed(2)}</p>
                <!-- Visual indicator for risk -->
            </div>
        `;
    } catch (error) {
        console.warn("dashboardSystem: Error rendering Political Risk meter:", error.message);
    }
}

/**
 * Renders the Daily Expense breakdown panel.
 * @param {HTMLElement} container The DOM element to render into.
 */
function renderDailyExpenseBreakdown(container) {
    try {
        if (!container) throw new Error("Daily Expense container is undefined.");
        const state = getGameState();
        const dailyExpenses = state.endOfDayReport?.expenses || 0; // Assuming expenses are part of daily report
        container.innerHTML = `
            <div class="panel-card daily-expenses">
                <h3>DAILY EXPENSES</h3>
                <p>Today: $${dailyExpenses.toLocaleString()}</p>
                <!-- Breakdown chart? -->
            </div>
        `;
    } catch (error) {
        console.warn("dashboardSystem: Error rendering Daily Expense breakdown:", error.message);
    }
}


// --- Main Dashboard Rendering Function ---

/**
 * Renders all new dashboard panels into their respective containers.
 * This function should be called when the dashboard UI needs to be updated.
 */
export function renderDashboardPanels() {
    try {
        // Validate if elements are present before attempting to render
        const marketTrendContainer = document.getElementById('market-trend-panel');
        const activeContractsContainer = document.getElementById('active-contracts-panel');
        const productionQueueContainer = document.getElementById('production-queue-panel');
        const competitorActivityContainer = document.getElementById('competitor-activity-panel');
        const politicalRiskContainer = document.getElementById('political-risk-panel');
        const dailyExpenseContainer = document.getElementById('daily-expense-panel');

        renderMarketTrendChart(marketTrendContainer);
        renderActiveContractsSummary(activeContractsContainer);
        renderProductionQueue(productionQueueContainer);
        renderCompetitorActivityMonitor(competitorActivityContainer);
        renderPoliticalRiskMeter(politicalRiskContainer);
        renderDailyExpenseBreakdown(dailyExpenseContainer);

    } catch (error) {
        console.error("dashboardSystem: Critical error in renderDashboardPanels:", error.message);
    }
}
