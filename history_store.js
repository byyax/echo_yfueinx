// ===== v14 聊天记录主存储：IndexedDB =====
// 背景：localStorage 通常只有 5MB，导入 5.4MB 备份时会写满，导致设置和消息都保存失败。
// 现在完整聊天记录放在 IndexedDB；设置、字卡、标签等小数据仍放 localStorage。
// 页面启动时会先把完整记录读进内存，所以后台聊天记录搜索仍然能搜到全部消息。
(function () {
  const DB_NAME = 'echo_history';
  const DB_VERSION = 1;
  const STORE = 'history';
  const KEY = 'latest';
  const LS_KEY = 'chat_history';
  const TAIL_KEY = 'echo_history_tail';

  // v13 的旧备份库。首次升级时把它一起并进来，避免旧版本写满后留下的完整记录丢失。
  const LEGACY_DB = 'echo_chat_backup';
  const LEGACY_STORE = 'history';
  const LEGACY_CHECK_KEY = 'echo_legacy_backup_checked';

  let dbPromise = null;
  let saveTimer = null;
  let saveInFlight = false;
  let saveAgain = false;
  let usingIndexedDb = !!window.indexedDB;
  let lastKnownBytes = 0;
  let storeGeneration = 0;

  window.__chatDataReady = false;
  window.__historyStoreMode = usingIndexedDb ? 'indexeddb' : 'localstorage';

  function withTimeout(promise, ms) {
    return new Promise((resolve, reject) => {
      let done = false;
      const timer = setTimeout(() => {
        if (done) return;
        done = true;
        reject(new Error('indexeddb-timeout'));
      }, ms);
      promise.then(value => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        resolve(value);
      }, err => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        reject(err);
      });
    });
  }

  function openDb() {
    if (!window.indexedDB) return Promise.reject(new Error('no-indexeddb'));
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: 'id' });
        }
      };
      req.onsuccess = () => {
        const db = req.result;
        db.onversionchange = () => { try { db.close(); } catch (e) {} };
        resolve(db);
      };
      req.onerror = () => {
        dbPromise = null;
        reject(req.error || new Error('history-db-open-failed'));
      };
      req.onblocked = () => {
        dbPromise = null;
        reject(new Error('history-db-blocked'));
      };
    });
    return dbPromise;
  }

  function readLatestFromDb() {
    return openDb().then(db => new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(KEY);
      req.onsuccess = () => {
        const rec = req.result;
        resolve(rec && Array.isArray(rec.list) ? rec.list : []);
      };
      req.onerror = () => reject(req.error || new Error('history-read-failed'));
    }));
  }

  function writeLatestToDb(list, skipMerge, generation) {
    return openDb().then(db => new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      const store = tx.objectStore(STORE);
      const get = store.get(KEY);
      get.onsuccess = () => {
        // 清空/导入可能发生在这次写入排队期间；旧写入不能把新状态盖回去。
        if (generation !== undefined && generation !== storeGeneration) {
          reject(new Error('history-write-stale'));
          return;
        }
        const old = get.result;
        let outgoing = list;
        // 多开页面时，旧页面不要用落后的内存覆盖另一个页面刚写进去的新消息。
        if (!skipMerge && old && Array.isArray(old.list) &&
            typeof lastHistoryTime === 'function' &&
            lastHistoryTime(old.list) > lastHistoryTime(outgoing)) {
          outgoing = mergeHistoryLists(outgoing, old.list);
          chatHistory = outgoing;
        }
        store.put({ id: KEY, list: outgoing, savedAt: Date.now() });
        updateBytes(outgoing);
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error('history-write-failed'));
      tx.onabort = () => reject(tx.error || new Error('history-write-aborted'));
    }));
  }

  function readLegacyBackup() {
    return new Promise((resolve) => {
      if (!window.indexedDB || localStorage.getItem(LEGACY_CHECK_KEY)) return resolve([]);
      let req;
      try { req = indexedDB.open(LEGACY_DB, 1); } catch (e) { return resolve(null); }
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(LEGACY_STORE)) db.createObjectStore(LEGACY_STORE, { keyPath: 'id' });
      };
      req.onsuccess = () => {
        const db = req.result;
        try {
          const tx = db.transaction(LEGACY_STORE, 'readonly');
          const get = tx.objectStore(LEGACY_STORE).get('latest');
          get.onsuccess = () => {
            const rec = get.result;
            const list = rec && Array.isArray(rec.history) ? rec.history : [];
            try { db.close(); } catch (e) {}
            resolve(list);
          };
          get.onerror = () => {
            try { db.close(); } catch (e) {}
            resolve(null);
          };
        } catch (e) {
          try { db.close(); } catch (e2) {}
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    });
  }

  function deleteLegacyBackup() {
    if (!window.indexedDB) return;
    try { indexedDB.deleteDatabase(LEGACY_DB); } catch (e) {}
  }

  function parseLocalHistory() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return [];
      const list = JSON.parse(raw);
      return Array.isArray(list) ? list : [];
    } catch (e) {
      return [];
    }
  }

  // IndexedDB 是异步的，极端情况下“刚发完就关页面”可能来不及写完。
  // 只在页面隐藏/离开时把最近一小段消息同步写进 localStorage，下次启动再合并，成本很小。
  function readTailCache() {
    try {
      const raw = localStorage.getItem(TAIL_KEY);
      if (!raw) return [];
      const rec = JSON.parse(raw);
      return rec && Array.isArray(rec.list) ? rec.list : [];
    } catch (e) {
      return [];
    }
  }

  function writeTailCache() {
    if (!window.__chatDataReady) return;
    try {
      const tail = [];
      let chars = 0;
      for (let i = chatHistory.length - 1; i >= 0; i--) {
        const msg = chatHistory[i];
        if (!msg) continue;
        let raw = '';
        try { raw = JSON.stringify(msg); } catch (e) { continue; }
        // 图片/语音的 base64 可能一条就很大，只保护普通消息，避免又写满 localStorage。
        if (raw.length > 20000) continue;
        if (chars + raw.length > 180000) break;
        tail.unshift(msg);
        chars += raw.length;
        if (tail.length >= 40) break;
      }
      localStorage.setItem(TAIL_KEY, JSON.stringify({ savedAt: Date.now(), list: tail }));
    } catch (e) {}
  }

  function clearTailCache() {
    try { localStorage.removeItem(TAIL_KEY); } catch (e) {}
  }

  function normalizeList(list) {
    if (typeof normalizeChatHistoryList === 'function') return normalizeChatHistoryList(list || []);
    return list || [];
  }

  function updateBytes(list) {
    try { lastKnownBytes = JSON.stringify(list || []).length * 2; } catch (e) {}
  }

  function markDataReady() {
    if (window.__chatDataReady) return;
    window.__chatDataReady = true;
    try { window.dispatchEvent(new Event('chat-data-ready')); } catch (e) {}
  }

  async function init() {
    const localList = normalizeList(parseLocalHistory());
    const tailList = normalizeList(readTailCache());
    let idbList = [];
    let legacyList = [];
    let legacyOk = false;
    let idbOk = usingIndexedDb;

    if (idbOk) {
      try {
        idbList = normalizeList(await withTimeout(readLatestFromDb(), 6000));
      } catch (e) {
        idbOk = false;
      }
    }
    if (idbOk) {
      try {
        const legacyResult = await withTimeout(readLegacyBackup(), 1000);
        legacyOk = legacyResult !== null;
        legacyList = normalizeList(legacyResult || []);
      } catch (e) {
        // 旧备份读取超时不代表没有数据；先不要删除它，下次启动再试。
        legacyList = [];
      }
    }

    let list = idbList;
    if (legacyList.length) {
      list = list.length ? mergeHistoryLists(list, legacyList) : legacyList;
    }
    if (localList.length) {
      list = list.length ? mergeHistoryLists(list, localList) : localList;
    }
    if (tailList.length) {
      list = list.length ? mergeHistoryLists(list, tailList) : tailList;
    }
    list = normalizeList(list);
    chatHistory = list;

    if (!idbOk) {
      // 极少数浏览器禁用 IndexedDB：退回旧方案，至少还能用，但会受 5MB 限制。
      usingIndexedDb = false;
      window.__historyStoreMode = 'localstorage';
      updateBytes(chatHistory);
      markDataReady();
      return;
    }

    const needMigrationWrite =
      (!idbList.length && list.length > 0) ||
      (idbList.length !== list.length) ||
      (idbList.length && list.length &&
        typeof lastHistoryTime === 'function' && lastHistoryTime(idbList) !== lastHistoryTime(list)) ||
      localStorage.getItem(LS_KEY) !== null ||
      Boolean(legacyList.length) ||
      Boolean(tailList.length);

    if (needMigrationWrite && list.length) {
      try {
        await withTimeout(writeLatestToDb(chatHistory, true, storeGeneration), 6000);
      } catch (e) {
        // 写入失败时保留 localStorage 里的旧记录，下次再试。
        usingIndexedDb = false;
        window.__historyStoreMode = 'localstorage';
        updateBytes(chatHistory);
        markDataReady();
        return;
      }
    }

    // 新库里已经有这份数据，才删除 localStorage 副本，避免迁移中途失败时两份都丢。
    try { localStorage.removeItem(LS_KEY); } catch (e) {}
    clearTailCache();
    if (legacyOk) {
      try { localStorage.setItem(LEGACY_CHECK_KEY, '1'); } catch (e) {}
      deleteLegacyBackup();
    }
    updateBytes(chatHistory);
    markDataReady();
  }

  function writeLocalFallback() {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(chatHistory));
      updateBytes(chatHistory);
      return true;
    } catch (e) {
      if (typeof warnStorageProblem === 'function') warnStorageProblem();
      return false;
    }
  }

  function saveHistoryNow() {
    if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
    if (!window.__chatDataReady) return Promise.resolve();

    const skipMerge = window.__skipHistoryMerge === true;
    window.__skipHistoryMerge = false;

    if (!usingIndexedDb) {
      if (writeLocalFallback()) clearTailCache();
      return Promise.resolve();
    }
    if (saveInFlight) {
      saveAgain = true;
      if (skipMerge) window.__skipHistoryMerge = true;
      return Promise.resolve();
    }
    saveInFlight = true;
    const generation = storeGeneration;
    let savedOk = true;
    return writeLatestToDb(chatHistory, skipMerge, generation).catch(() => {
      if (generation !== storeGeneration) { savedOk = false; return; }
      usingIndexedDb = false;
      window.__historyStoreMode = 'localstorage';
      savedOk = writeLocalFallback();
    }).then(() => {
      if (savedOk) clearTailCache();
      saveInFlight = false;
      if (saveAgain) {
        saveAgain = false;
        return saveHistoryNow();
      }
    });
  }

  function scheduleHistorySave() {
    if (saveTimer) return;
    saveTimer = setTimeout(() => {
      saveTimer = null;
      saveHistoryNow();
    }, 900);
  }

  function flushHistorySave() {
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
    return saveHistoryNow();
  }

  // 导入时直接替换全部记录；清空时删除记录。两者都会跳过“合并旧数据”。
  function replaceHistoryStore(list) {
    if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
    storeGeneration++;
    window.__skipHistoryMerge = false;
    chatHistory = normalizeList(list || []);
    updateBytes(chatHistory);
    try { localStorage.removeItem(LS_KEY); } catch (e) {}
    if (!usingIndexedDb) { writeLocalFallback(); clearTailCache(); return Promise.resolve(); }
    return writeLatestToDb(chatHistory, true, storeGeneration).then(() => {
      clearTailCache();
    }).catch(() => {
      usingIndexedDb = false;
      window.__historyStoreMode = 'localstorage';
      if (writeLocalFallback()) clearTailCache();
    });
  }

  function clearHistoryStore() {
    if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
    storeGeneration++;
    window.__skipHistoryMerge = false;
    // 内存也必须一起清空，否则页面离开时的自动保存会把旧记录又写回去。
    chatHistory = [];
    try { localStorage.removeItem(LS_KEY); } catch (e) {}
    clearTailCache();
    deleteLegacyBackup();
    lastKnownBytes = 0;
    if (!usingIndexedDb) return Promise.resolve();
    return openDb().then(db => new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).delete(KEY);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
        tx.onabort = () => resolve();
      } catch (e) {
        resolve();
      }
    })).catch(() => {});
  }

  window.estimateChatHistoryBytes = function () {
    if (!lastKnownBytes) updateBytes(chatHistory);
    return lastKnownBytes;
  };
  window.scheduleHistorySave = scheduleHistorySave;
  window.flushHistorySave = flushHistorySave;
  window.writeHistoryTailCache = writeTailCache;
  window.clearHistoryTailCache = clearTailCache;
  window.replaceHistoryStore = replaceHistoryStore;
  window.clearHistoryStore = clearHistoryStore;
  window.saveHistoryToIDB = replaceHistoryStore; // 兼容旧调试命名

  init().catch(() => {
    // 兜底：读 IndexedDB 出错时，不让启动页一直卡住。
    usingIndexedDb = false;
    window.__historyStoreMode = 'localstorage';
    chatHistory = normalizeList(chatHistory);
    updateBytes(chatHistory);
    markDataReady();
  });
})();
