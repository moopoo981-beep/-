// winLoseSystem.js
'use strict';

import { getGameState } from './gameState.js';
import { showNotification, toggleUIFreeze } from './uiRenderer.js';
import { eventBus, GameEvents } from './eventBus.js';

const WIN_CONDITIONS = {
    money: 10000000,
    reputation: 85
};

const LOSE_CONDITIONS = {
    money: 0,
    reputation: 5
};

let gameEnded = false;

function checkConditions() {
    if (gameEnded) return;

    const state = getGameState();
    const { money, reputation } = state.company;

    // 💀 LOSE
    if (money <= LOSE_CONDITIONS.money || reputation <= LOSE_CONDITIONS.reputation) {
        endGame(false);
        return;
    }

    // 🏆 WIN
    if (money >= WIN_CONDITIONS.money && reputation >= WIN_CONDITIONS.reputation) {
        endGame(true);
    }
}

function endGame(isWin) {
    gameEnded = true;

    toggleUIFreeze(true);

    if (isWin) {
        showNotification("🏆 GLOBAL DEFENSE EMPIRE ACHIEVED!", "success");
        alert("🏆 VICTORY!\n\nYou now dominate the global defense market.");
    } else {
        showNotification("💀 COMPANY COLLAPSED.", "error");
        alert("💀 GAME OVER!\n\nYour company has failed.");
    }
}

/* 
   Hook เข้ากับระบบโดยไม่แก้โค้ดเดิม
   ใช้ EventBus ที่มีอยู่แล้ว
*/
eventBus.on(GameEvents.NEXT_DAY_COMPLETED, () => {
    checkConditions();
});