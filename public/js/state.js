// ════════════════════════════════════════════════════════
// ESTADO
// ════════════════════════════════════════════════════════

export let STATE = {
  meta:   { groups: [] },
  users:  {},
  boards: {},
  meetings: {},
};

export let currentUser = null;
export let unsubs = [];

// ── Navegação local (por usuário, nunca sincronizada) ──
export let _activeBoardId = localStorage.getItem('activeBoardId') || null;
export let _currentView = localStorage.getItem('currentView') || 'board';

// ──────────────────────────────────────────────────────────
// MUTABLE STATE (use getters e setters para evitar const issues)
// ──────────────────────────────────────────────────────────
const mutableVars = {
  _lastBoardHash: '',
  _searchQ: '',
  _calMonth: new Date().getMonth(),
  _calYear: new Date().getFullYear(),
  _modalCardId: null,
  _drag: { cardId: null, colId: null },
  _pendingRender: false,
};

// Getters
export function get_pendingRender() { return mutableVars._pendingRender; }
export function get_lastBoardHash() { return mutableVars._lastBoardHash; }
export function get_searchQ() { return mutableVars._searchQ; }
export function get_calMonth() { return mutableVars._calMonth; }
export function get_calYear() { return mutableVars._calYear; }
export function get_modalCardId() { return mutableVars._modalCardId; }
export function get_drag() { return mutableVars._drag; }

// Setters
export function setPendingRender(v) { mutableVars._pendingRender = v; }
export function setLastBoardHash(hash) { mutableVars._lastBoardHash = hash; }
export function setSearchQ(q) { mutableVars._searchQ = q; }
export function setCalMonth(m) { mutableVars._calMonth = m; }
export function setCalYear(y) { mutableVars._calYear = y; }
export function setModalCardId(id) { mutableVars._modalCardId = id; }

// Navigation
export function setLocalNav(boardId, view = 'board') {
  _activeBoardId = boardId;
  _currentView = view;
  if (boardId) localStorage.setItem('activeBoardId', boardId);
  else localStorage.removeItem('activeBoardId');
  localStorage.setItem('currentView', view);
}

export function activeBoard() {
  return STATE.boards[_activeBoardId] || null;
}

export function updateState(newState) {
  Object.assign(STATE, newState);
}

export function updateCurrentUser(user) {
  currentUser = user;
}

export function addUnsub(unsub) {
  unsubs.push(unsub);
}

export function clearUnsubs() {
  unsubs.forEach(u => u());
  unsubs = [];
}
