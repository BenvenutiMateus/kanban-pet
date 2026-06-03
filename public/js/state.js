// ════════════════════════════════════════════════════════
// ESTADO
// ════════════════════════════════════════════════════════

export let STATE = {
  meta:   { groups: [] },
  users:  {},
  boards: {},
};

export let currentUser = null;
export let unsubs = [];

// ── Navegação local (por usuário, nunca sincronizada) ──
export let _activeBoardId = localStorage.getItem('activeBoardId') || null;
export let _currentView = localStorage.getItem('currentView') || 'board';
export let _calMonth = new Date().getMonth();
export let _calYear = new Date().getFullYear();
export let _searchQ = '';
export let _lastBoardHash = '';
export let _modalCardId = null;
export let _drag = { cardId: null, colId: null };

export function setLocalNav(boardId, view = 'board') {
  _activeBoardId = boardId;
  _currentView = view;
  _lastBoardHash = '';
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
