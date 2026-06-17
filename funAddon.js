/* Sleepinglight Fun Add-on
   วางไฟล์นี้ไว้ที่ js/funAddon.js แล้วเพิ่ม <script src="js/funAddon.js"></script> ก่อน </body>
   ทำงานแบบไม่พึ่งไลบรารีภายนอก เหมาะกับ GitHub Pages
*/
(function () {
  'use strict';

  const STORE_KEY = 'sleepinglight_fun_addon_v1';
  const GAME_SAVE_KEY = 'sleepinglight_fun_autosave_v1';
  const VERSION = '1.0.0';
  const missionTemplates = [
    {
      id: 'assemble_5',
      title: 'ภารกิจประกอบยุทโธปกรณ์',
      desc: 'กดปุ่มที่เกี่ยวกับ ประกอบ / ผลิต / Assembly ให้ครบ 5 ครั้ง',
      stat: 'assembleClicks',
      goal: 5,
      rewardXp: 90,
      rewardCoins: 120
    },
    {
      id: 'supplier_4',
      title: 'ติดต่อซัพพลายเออร์',
      desc: 'กดปุ่ม ซื้อ / Supplier / Parts / Stock ให้ครบ 4 ครั้ง',
      stat: 'supplierClicks',
      goal: 4,
      rewardXp: 70,
      rewardCoins: 90
    },
    {
      id: 'contract_3',
      title: 'ปิดดีลงานด่วน',
      desc: 'กดปุ่ม สัญญา / ส่งงาน / Contract / Sell ให้ครบ 3 ครั้ง',
      stat: 'contractClicks',
      goal: 3,
      rewardXp: 100,
      rewardCoins: 140
    }
  ];

  const achievements = [
    { id: 'first_click', title: 'เริ่มบัญชาการ', desc: 'กดคำสั่งแรกสำเร็จ', test: s => s.stats.totalClicks >= 1, xp: 25 },
    { id: 'busy_commander', title: 'ผู้บัญชาการมือไว', desc: 'กดคำสั่งครบ 25 ครั้ง', test: s => s.stats.totalClicks >= 25, xp: 90 },
    { id: 'builder', title: 'สายผลิตตัวจริง', desc: 'ประกอบ/ผลิตครบ 10 ครั้ง', test: s => s.stats.assembleClicks >= 10, xp: 110 },
    { id: 'deal_maker', title: 'นักเจรจาสัญญา', desc: 'ปิดดีล/ส่งงานครบ 8 ครั้ง', test: s => s.stats.contractClicks >= 8, xp: 130 },
    { id: 'event_survivor', title: 'รับมือวิกฤตได้', desc: 'ผ่านเหตุการณ์สุ่มครบ 3 ครั้ง', test: s => s.stats.eventsSolved >= 3, xp: 150 },
    { id: 'level_5', title: 'ฐานทัพระดับ 5', desc: 'เลเวลเสริมถึง 5', test: s => s.level >= 5, xp: 180 }
  ];

  const randomEvents = [
    {
      title: 'คำสั่งซื้อด่วนจากแนวหน้า',
      body: 'ลูกค้าต้องการงานเร็วขึ้น ถ้ารับจะได้ชื่อเสียงและ XP เสริม แต่ต้องรีบจัดการงานในเกมต่อทันที',
      accept: 'รับงานด่วน',
      decline: 'ขอเวลาเตรียมคลัง',
      reward: { xp: 80, coins: 100, reputation: 2, score: 30 },
      declineReward: { xp: 20, coins: 20 }
    },
    {
      title: 'วัตถุดิบขาดตลาด',
      body: 'ตลาดผันผวน ซัพพลายเออร์ขึ้นราคา เลือกเจรจาเพื่อลดความเสียหายและลุ้นโบนัส',
      accept: 'เจรจาซัพพลายเออร์',
      decline: 'รอดูสถานการณ์',
      reward: { xp: 65, coins: 75, money: 150 },
      declineReward: { xp: 15 }
    },
    {
      title: 'ตรวจคุณภาพฉุกเฉิน',
      body: 'หน่วยตรวจเข้ามาเช็กคลังสินค้า ถ้าผ่านจะได้บัฟ “งานคุณภาพ” ชั่วคราว',
      accept: 'จัดทีมตรวจคุณภาพ',
      decline: 'ตรวจแบบพื้นฐาน',
      reward: { xp: 90, coins: 90, reputation: 3, qualityBuff: true },
      declineReward: { xp: 25, coins: 10 }
    },
    {
      title: 'คู่แข่งตัดราคา',
      body: 'คู่แข่งเสนอราคาต่ำกว่า เลือกทำแคมเปญเพื่อดึงลูกค้ากลับมา',
      accept: 'ทำแคมเปญสวนกลับ',
      decline: 'รักษากำไรไว้ก่อน',
      reward: { xp: 75, coins: 80, reputation: 2, score: 25 },
      declineReward: { xp: 20, coins: 20 }
    }
  ];

  const defaultState = () => ({
    version: VERSION,
    xp: 0,
    level: 1,
    coins: 0,
    combo: 0,
    hardcore: false,
    lastDaily: todayKey(),
    nextEventAt: Date.now() + 45000,
    activeBuffs: [],
    completedMissions: {},
    unlockedAchievements: {},
    stats: {
      totalClicks: 0,
      assembleClicks: 0,
      supplierClicks: 0,
      contractClicks: 0,
      eventsSolved: 0,
      autosaves: 0
    }
  });

  let state = loadState();
  let panelOpen = false;
  let eventOpen = false;
  let dom = {};

  boot();

  function boot() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  }

  function init() {
    resetDailyIfNeeded();
    injectUI();
    bindGlobalClicks();
    bindKeyboard();
    startTicker();
    updateUI();
    toast('ติดตั้งโหมดสนุกแล้ว: กด M ดูภารกิจ / R เรียกเหตุการณ์สุ่ม / H เปิดคู่มือ', 'success');
  }

  function todayKey() {
    return new Date().toISOString().slice(0, 10);
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return defaultState();
      const parsed = JSON.parse(raw);
      return merge(defaultState(), parsed);
    } catch (err) {
      console.warn('[Sleepinglight Add-on] โหลดข้อมูลเสริมไม่ได้', err);
      return defaultState();
    }
  }

  function merge(base, saved) {
    Object.keys(saved || {}).forEach(key => {
      if (saved[key] && typeof saved[key] === 'object' && !Array.isArray(saved[key])) {
        base[key] = merge(base[key] || {}, saved[key]);
      } else {
        base[key] = saved[key];
      }
    });
    return base;
  }

  function saveState() {
    localStorage.setItem(STORE_KEY, JSON.stringify(state));
  }

  function resetDailyIfNeeded() {
    const today = todayKey();
    if (state.lastDaily !== today) {
      state.lastDaily = today;
      state.combo = 0;
      state.completedMissions = {};
      state.nextEventAt = Date.now() + 30000;
      saveState();
    }
  }

  function injectUI() {
    const root = document.createElement('section');
    root.id = 'sl-fun-addon';
    root.innerHTML = `
      <button class="sl-fab" type="button" aria-label="เปิดโหมดสนุก">🎮</button>
      <div class="sl-widget" aria-live="polite">
        <div class="sl-widget-head">
          <div>
            <strong>Sleepinglight FUN+</strong>
            <small>ภารกิจ • เหตุการณ์สุ่ม • Achievement</small>
          </div>
          <button class="sl-close" type="button" aria-label="ปิดแผง">×</button>
        </div>
        <div class="sl-stats">
          <div><span>LV</span><b data-sl="level">1</b></div>
          <div><span>XP</span><b data-sl="xp">0</b></div>
          <div><span>เหรียญ</span><b data-sl="coins">0</b></div>
          <div><span>Combo</span><b data-sl="combo">0</b></div>
        </div>
        <div class="sl-xpbar"><i data-sl="xpbar"></i></div>
        <div class="sl-actions">
          <button type="button" data-sl-action="event">สุ่มเหตุการณ์</button>
          <button type="button" data-sl-action="autosave">เซฟเกม</button>
          <button type="button" data-sl-action="hardcore">โหมดท้าทาย</button>
          <button type="button" data-sl-action="help">คู่มือ</button>
        </div>
        <div class="sl-buffs" data-sl="buffs"></div>
        <h3>ภารกิจวันนี้</h3>
        <div class="sl-missions" data-sl="missions"></div>
        <h3>Achievement</h3>
        <div class="sl-achievements" data-sl="achievements"></div>
      </div>
      <div class="sl-toast-wrap" data-sl="toasts"></div>
      <div class="sl-event-modal" data-sl="eventModal" hidden></div>
      <div class="sl-help-modal" data-sl="helpModal" hidden>
        <article>
          <button class="sl-help-close" type="button">×</button>
          <h2>คู่มือโหมดสนุก</h2>
          <p>แพ็กนี้เพิ่มระบบเสริมให้เกมเดิมโดยไม่ต้องใช้เซิร์ฟเวอร์ เหมาะสำหรับอัปขึ้น GitHub Pages</p>
          <ul>
            <li><b>M</b> เปิด/ปิดภารกิจ</li>
            <li><b>R</b> เรียกเหตุการณ์สุ่ม</li>
            <li><b>S</b> เซฟข้อมูลเสริมและลองเซฟสถานะเกม</li>
            <li><b>H</b> เปิดหน้านี้</li>
          </ul>
          <p>ระบบจะจับปุ่มในเกม เช่น ประกอบ/ผลิต/ซื้อ/สัญญา แล้วนับเป็นภารกิจให้อัตโนมัติ</p>
        </article>
      </div>
    `;
    document.body.appendChild(root);

    dom.root = root;
    dom.fab = root.querySelector('.sl-fab');
    dom.widget = root.querySelector('.sl-widget');
    dom.close = root.querySelector('.sl-close');
    dom.level = root.querySelector('[data-sl="level"]');
    dom.xp = root.querySelector('[data-sl="xp"]');
    dom.coins = root.querySelector('[data-sl="coins"]');
    dom.combo = root.querySelector('[data-sl="combo"]');
    dom.xpbar = root.querySelector('[data-sl="xpbar"]');
    dom.missions = root.querySelector('[data-sl="missions"]');
    dom.achievements = root.querySelector('[data-sl="achievements"]');
    dom.buffs = root.querySelector('[data-sl="buffs"]');
    dom.toasts = root.querySelector('[data-sl="toasts"]');
    dom.eventModal = root.querySelector('[data-sl="eventModal"]');
    dom.helpModal = root.querySelector('[data-sl="helpModal"]');

    dom.fab.addEventListener('click', togglePanel);
    dom.close.addEventListener('click', togglePanel);
    root.querySelector('[data-sl-action="event"]').addEventListener('click', showRandomEvent);
    root.querySelector('[data-sl-action="autosave"]').addEventListener('click', autosaveGame);
    root.querySelector('[data-sl-action="hardcore"]').addEventListener('click', toggleHardcore);
    root.querySelector('[data-sl-action="help"]').addEventListener('click', toggleHelp);
    root.querySelector('.sl-help-close').addEventListener('click', toggleHelp);
    dom.helpModal.addEventListener('click', event => {
      if (event.target === dom.helpModal) toggleHelp();
    });
  }

  function togglePanel() {
    panelOpen = !panelOpen;
    dom.root.classList.toggle('sl-open', panelOpen);
  }

  function toggleHelp() {
    dom.helpModal.hidden = !dom.helpModal.hidden;
  }

  function toggleHardcore() {
    state.hardcore = !state.hardcore;
    if (state.hardcore) {
      state.nextEventAt = Date.now() + 20000;
      toast('เปิดโหมดท้าทาย: เหตุการณ์สุ่มจะมาเร็วขึ้น', 'warn');
    } else {
      state.nextEventAt = Date.now() + 45000;
      toast('ปิดโหมดท้าทายแล้ว', 'success');
    }
    saveState();
    updateUI();
  }

  function bindKeyboard() {
    window.addEventListener('keydown', event => {
      if (isTyping()) return;
      const key = event.key.toLowerCase();
      if (key === 'm') togglePanel();
      if (key === 'r') showRandomEvent();
      if (key === 's') autosaveGame();
      if (key === 'h') toggleHelp();
    });
  }

  function isTyping() {
    const tag = (document.activeElement && document.activeElement.tagName || '').toLowerCase();
    return tag === 'input' || tag === 'textarea' || tag === 'select' || document.activeElement?.isContentEditable;
  }

  function bindGlobalClicks() {
    document.addEventListener('click', event => {
      const target = event.target.closest('button, a, [role="button"], .btn, .button');
      if (!target || dom.root.contains(target)) return;

      const text = normalize(`${target.textContent || ''} ${target.getAttribute('aria-label') || ''} ${target.id || ''} ${target.className || ''}`);
      if (!text.trim()) return;

      state.stats.totalClicks += 1;
      state.combo = Math.min(99, state.combo + 1);
      addXp(2, false);

      if (/(ประกอบ|ผลิต|สร้าง|assembly|assemble|build|craft|manufacture)/i.test(text)) {
        state.stats.assembleClicks += 1;
        addXp(6, false);
        floating('+ผลิต', target);
      }
      if (/(ซื้อ|ซัพพลาย|supplier|parts|stock|คลัง|วัตถุดิบ|order)/i.test(text)) {
        state.stats.supplierClicks += 1;
        addXp(5, false);
        floating('+คลัง', target);
      }
      if (/(สัญญา|ส่งงาน|ขาย|contract|sell|deal|deliver|market)/i.test(text)) {
        state.stats.contractClicks += 1;
        addXp(8, false);
        floating('+ดีล', target);
      }

      checkMissionCompletion();
      checkAchievements();
      saveState();
      updateUI();
    }, true);
  }

  function normalize(value) {
    return String(value).replace(/\s+/g, ' ').trim();
  }

  function startTicker() {
    setInterval(() => {
      clearExpiredBuffs();
      if (!eventOpen && Date.now() >= state.nextEventAt) {
        showRandomEvent();
      }
      updateUI();
    }, 1000);

    setInterval(() => {
      state.combo = Math.max(0, state.combo - 1);
      saveState();
      updateUI();
    }, 7000);
  }

  function showRandomEvent() {
    if (eventOpen) return;
    eventOpen = true;
    const item = randomEvents[Math.floor(Math.random() * randomEvents.length)];
    dom.eventModal.hidden = false;
    dom.eventModal.innerHTML = `
      <article class="sl-event-card">
        <button class="sl-event-x" type="button" aria-label="ปิด">×</button>
        <span class="sl-pulse">⚠️ เหตุการณ์สุ่ม</span>
        <h2>${escapeHTML(item.title)}</h2>
        <p>${escapeHTML(item.body)}</p>
        <div class="sl-event-buttons">
          <button type="button" data-choice="accept">${escapeHTML(item.accept)}</button>
          <button type="button" data-choice="decline">${escapeHTML(item.decline)}</button>
        </div>
      </article>
    `;
    dom.eventModal.querySelector('.sl-event-x').addEventListener('click', closeEvent);
    dom.eventModal.querySelector('[data-choice="accept"]').addEventListener('click', () => resolveEvent(item.reward, true));
    dom.eventModal.querySelector('[data-choice="decline"]').addEventListener('click', () => resolveEvent(item.declineReward, false));
  }

  function closeEvent() {
    eventOpen = false;
    dom.eventModal.hidden = true;
    scheduleNextEvent();
  }

  function resolveEvent(reward, accepted) {
    state.stats.eventsSolved += accepted ? 1 : 0;
    grantReward(reward || {});
    if (accepted) {
      confetti();
      toast('ผ่านเหตุการณ์สำเร็จ ได้โบนัสเสริมแล้ว', 'success');
    } else {
      toast('เลือกทางปลอดภัย ได้ XP เล็กน้อย', 'info');
    }
    closeEvent();
    checkAchievements();
    saveState();
    updateUI();
  }

  function scheduleNextEvent() {
    const base = state.hardcore ? 28000 : 65000;
    const jitter = Math.floor(Math.random() * 25000);
    state.nextEventAt = Date.now() + base + jitter;
    saveState();
  }

  function grantReward(reward) {
    const xp = Number(reward.xp || 0);
    const coins = Number(reward.coins || 0);
    if (xp) addXp(xp, false);
    if (coins) state.coins += coins;
    if (reward.qualityBuff) addBuff('งานคุณภาพ +ชื่อเสียง', 5 * 60 * 1000);
    tryMutateGameState(reward);
  }

  function addBuff(label, ms) {
    state.activeBuffs.push({ label, until: Date.now() + ms });
  }

  function clearExpiredBuffs() {
    const old = state.activeBuffs.length;
    state.activeBuffs = state.activeBuffs.filter(buff => buff.until > Date.now());
    if (old !== state.activeBuffs.length) saveState();
  }

  function tryMutateGameState(reward) {
    const target = findGameStateObject();
    if (!target) return false;
    const maps = [
      ['money', 'cash', 'funds', 'budget', 'capital'],
      ['reputation', 'rep', 'fame'],
      ['score', 'points']
    ];
    const values = [Number(reward.money || reward.coins || 0), Number(reward.reputation || 0), Number(reward.score || 0)];
    maps.forEach((keys, index) => {
      if (!values[index]) return;
      const key = keys.find(k => typeof target[k] === 'number');
      if (key) target[key] += values[index];
    });
    window.dispatchEvent(new CustomEvent('sleepinglight:addonReward', { detail: reward }));
    return true;
  }

  function findGameStateObject() {
    const keys = ['gameState', 'GameState', 'state', 'appState', 'game', 'store'];
    for (const key of keys) {
      const value = window[key];
      if (value && typeof value === 'object') return value;
    }
    return null;
  }

  function addXp(amount, notify = true) {
    const comboBonus = Math.floor(state.combo / 10);
    state.xp += Number(amount || 0) + comboBonus;
    let leveled = false;
    while (state.xp >= xpNeed(state.level)) {
      state.xp -= xpNeed(state.level);
      state.level += 1;
      state.coins += 60 + state.level * 10;
      leveled = true;
    }
    if (leveled) {
      confetti();
      toast(`เลเวลเสริมเพิ่มเป็น LV ${state.level}!`, 'success');
    } else if (notify && amount) {
      toast(`ได้รับ XP +${amount}`, 'info');
    }
  }

  function xpNeed(level) {
    return 100 + (level - 1) * 45;
  }

  function checkMissionCompletion() {
    missionTemplates.forEach(mission => {
      if (state.completedMissions[mission.id]) return;
      if ((state.stats[mission.stat] || 0) >= mission.goal) {
        state.completedMissions[mission.id] = true;
        state.coins += mission.rewardCoins;
        addXp(mission.rewardXp, false);
        confetti();
        toast(`สำเร็จ: ${mission.title} ได้ ${mission.rewardCoins} เหรียญ`, 'success');
      }
    });
  }

  function checkAchievements() {
    achievements.forEach(item => {
      if (state.unlockedAchievements[item.id]) return;
      if (item.test(state)) {
        state.unlockedAchievements[item.id] = true;
        addXp(item.xp, false);
        confetti();
        toast(`ปลดล็อก Achievement: ${item.title}`, 'success');
      }
    });
  }

  function autosaveGame() {
    const data = {
      time: new Date().toISOString(),
      addon: state,
      guessedGameState: safeClone(findGameStateObject())
    };
    localStorage.setItem(GAME_SAVE_KEY, JSON.stringify(data));
    state.stats.autosaves += 1;
    saveState();
    toast('เซฟข้อมูลเสริมแล้ว หากเกมมี state แบบ global จะถูกเก็บสำรองด้วย', 'success');
    updateUI();
  }

  function safeClone(value) {
    try {
      if (!value) return null;
      return JSON.parse(JSON.stringify(value));
    } catch (_) {
      return null;
    }
  }

  function updateUI() {
    if (!dom.root) return;
    dom.level.textContent = state.level;
    dom.xp.textContent = `${state.xp}/${xpNeed(state.level)}`;
    dom.coins.textContent = state.coins;
    dom.combo.textContent = state.combo;
    dom.xpbar.style.width = `${Math.min(100, (state.xp / xpNeed(state.level)) * 100)}%`;
    renderMissions();
    renderAchievements();
    renderBuffs();
    dom.root.classList.toggle('sl-hardcore', state.hardcore);
  }

  function renderMissions() {
    dom.missions.innerHTML = missionTemplates.map(mission => {
      const progress = Math.min(mission.goal, state.stats[mission.stat] || 0);
      const done = state.completedMissions[mission.id];
      return `
        <div class="sl-card ${done ? 'is-done' : ''}">
          <strong>${done ? '✅ ' : ''}${escapeHTML(mission.title)}</strong>
          <p>${escapeHTML(mission.desc)}</p>
          <div class="sl-progress"><i style="width:${(progress / mission.goal) * 100}%"></i></div>
          <small>${progress}/${mission.goal} • รางวัล ${mission.rewardCoins} เหรียญ + ${mission.rewardXp} XP</small>
        </div>
      `;
    }).join('');
  }

  function renderAchievements() {
    dom.achievements.innerHTML = achievements.map(item => {
      const done = state.unlockedAchievements[item.id];
      return `
        <div class="sl-badge ${done ? 'is-on' : ''}">
          <span>${done ? '🏆' : '🔒'}</span>
          <div><b>${escapeHTML(item.title)}</b><small>${escapeHTML(item.desc)}</small></div>
        </div>
      `;
    }).join('');
  }

  function renderBuffs() {
    const next = Math.max(0, Math.ceil((state.nextEventAt - Date.now()) / 1000));
    const buffs = state.activeBuffs.map(buff => {
      const sec = Math.max(0, Math.ceil((buff.until - Date.now()) / 1000));
      return `<span>✨ ${escapeHTML(buff.label)} ${sec}s</span>`;
    });
    buffs.unshift(`<span>${state.hardcore ? '🔥 Hardcore' : '⏱️'} Event ใน ${next}s</span>`);
    dom.buffs.innerHTML = buffs.join('');
  }

  function toast(message, type) {
    if (!dom.toasts) return;
    const el = document.createElement('div');
    el.className = `sl-toast ${type || 'info'}`;
    el.textContent = message;
    dom.toasts.appendChild(el);
    requestAnimationFrame(() => el.classList.add('is-show'));
    setTimeout(() => {
      el.classList.remove('is-show');
      setTimeout(() => el.remove(), 300);
    }, 3600);
  }

  function floating(text, target) {
    const rect = target.getBoundingClientRect();
    const el = document.createElement('div');
    el.className = 'sl-floating';
    el.textContent = text;
    el.style.left = `${rect.left + rect.width / 2}px`;
    el.style.top = `${rect.top + window.scrollY}px`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 900);
  }

  function confetti() {
    const colors = ['#22c55e', '#f59e0b', '#38bdf8', '#f472b6', '#a78bfa'];
    for (let i = 0; i < 24; i += 1) {
      const el = document.createElement('i');
      el.className = 'sl-confetti';
      el.style.left = `${Math.random() * 100}%`;
      el.style.background = colors[i % colors.length];
      el.style.animationDelay = `${Math.random() * 0.2}s`;
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 1400);
    }
  }

  function escapeHTML(value) {
    return String(value).replace(/[&<>'"]/g, char => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[char]));
  }

  window.SleepinglightFunAddon = {
    getState: () => JSON.parse(JSON.stringify(state)),
    open: () => { panelOpen = true; dom.root.classList.add('sl-open'); },
    randomEvent: showRandomEvent,
    save: autosaveGame
  };
})();
