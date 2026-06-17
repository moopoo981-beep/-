// eventBus.js - Centralized event management for the game tutorial system.

/**
 * Defines the game events that the tutorial system will listen for.
 * These events should be emitted from the core game logic.
 */
export const GameEvents = {
  // UI/Navigation Events
  SUPPLIER_MARKET_OPENED: "SUPPLIER_MARKET_OPENED",
  WAREHOUSE_OPENED: "WAREHOUSE_OPENED",
  ASSEMBLY_OPENED: "ASSEMBLY_OPENED",
  GLOBAL_CONTRACTS_OPENED: "GLOBAL_CONTRACTS_OPENED",
  DASHBOARD_OPENED: "DASHBOARD_OPENED",

  // Core Game Actions
  SUPPLIER_ITEM_PURCHASED: "SUPPLIER_ITEM_PURCHASED",
  PRODUCT_ASSEMBLED: "PRODUCT_ASSEMBLED",
  CONTRACT_OFFERED: "CONTRACT_OFFERED", // When a contract is offered, not necessarily accepted
  CONTRACT_ACCEPTED: "CONTRACT_ACCEPTED",
  CONTRACT_REJECTED: "CONTRACT_REJECTED", // Not explicitly in prompt, but useful for tutorial
  NEXT_DAY_INITIATED: "NEXT_DAY_INITIATED", // When nextDay process begins
  NEXT_DAY_COMPLETED: "NEXT_DAY_COMPLETED", // After all day-end processing and UI updates

  // Tutorial Specific
  TUTORIAL_STARTED: "TUTORIAL_STARTED",
  TUTORIAL_SKIPPED: "TUTORIAL_SKIPPED",
  TUTORIAL_COMPLETED: "TUTORIAL_COMPLETED",
};

/**
 * Implements a simple publish/subscribe pattern for event management.
 */
class EventBus {
  constructor() {
    this.listeners = {};
  }

  /**
   * Registers an event handler for a specific event.
   * @param {string} event The name of the event to listen for.
   * @param {function} handler The function to call when the event is emitted.
   */
  on(event, handler) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(handler);
    // console.log(`EventBus: Registered handler for event: ${event}`);
  }

  /**
   * Unregisters an event handler for a specific event.
   * @param {string} event The name of the event to stop listening for.
   * @param {function} handler The handler function to remove.
   */
  off(event, handler) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(
        (listener) => listener !== handler
      );
      // console.log(`EventBus: Unregistered handler for event: ${event}`);
    }
  }

  /**
   * Emits an event, calling all registered handlers for that event.
   * @param {string} event The name of the event to emit.
   * @param {*} payload Optional data to pass to the handlers.
   */
  emit(event, payload) {
    // console.log(`EventBus: Emitting event: ${event}`, payload);
    if (this.listeners[event]) {
      // Create a shallow copy to prevent issues if handlers modify the listener array during iteration
      this.listeners[event].slice().forEach((handler) => {
        try {
          handler(payload);
        } catch (error) {
          console.error(`EventBus: Error in handler for event ${event}:`, error);
        }
      });
    }
  }
}

// Export a singleton instance of the EventBus
export const eventBus = new EventBus();
