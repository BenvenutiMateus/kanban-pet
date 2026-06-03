// ════════════════════════════════════════════════════════
// FIRESTORE.JS - OPERAÇÕES FIRESTORE
// ════════════════════════════════════════════════════════

import { doc, collection, setDoc, getDoc, updateDoc, deleteDoc, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db } from './main.js';
import { STATE, updateState, addUnsub, clearUnsubs } from './state.js';
import { toast } from './utils.js';
import { renderAll } from './ui.js';

export async function saveMeta(patch) {
  delete patch.activeBoard;
  Object.assign(STATE.meta, patch);
  await setDoc(doc(db, 'meta', 'app'), STATE.meta);
}

export async function saveBoard(boardId) {
  const b = STATE.boards[boardId];
  if (!b) return;
  await setDoc(doc(db, 'boards', boardId), b);
}

export async function saveUser(uid2, data) {
  await setDoc(doc(db, 'users', uid2), data, { merge: true })
    .catch(e => toast('Erro ao salvar usuário: ' + e.message, 'error'));
}

export function startListeners() {
  stopListeners();

  // meta
  addUnsub(onSnapshot(doc(db, 'meta', 'app'), snap => {
    if (snap.exists()) {
      const data = snap.data();
      delete data.activeBoard;
      updateState({ meta: { ...STATE.meta, ...data } });
    } else {
      setDoc(doc(db, 'meta', 'app'), { groups: [] });
    }
    renderAll();
  }));

  // users
  addUnsub(onSnapshot(collection(db, 'users'), snap => {
    snap.forEach(d => { STATE.users[d.id] = { id: d.id, ...d.data() }; });
    snap.docChanges().forEach(ch => { if (ch.type === 'removed') delete STATE.users[ch.doc.id]; });
    renderAll();
  }));

  // boards
  addUnsub(onSnapshot(collection(db, 'boards'), snap => {
    snap.forEach(d => { STATE.boards[d.id] = { id: d.id, ...d.data() }; });
    snap.docChanges().forEach(ch => { if (ch.type === 'removed') delete STATE.boards[ch.doc.id]; });
    renderAll();

  }));

  // meetings — adiciona junto com os outros addUnsub
    addUnsub(onSnapshot(collection(db, 'meetings'), snap => {
  if (!STATE.meetings) STATE.meetings = {}; // ← guard por segurança
  snap.forEach(d => { STATE.meetings[d.id] = { id: d.id, ...d.data() }; });
  snap.docChanges().forEach(ch => { if (ch.type === 'removed') delete STATE.meetings[ch.doc.id]; });
  renderAll();
}));
}

export function stopListeners() {
  clearUnsubs();
}

export async function saveMeeting(meeting) {
  await setDoc(doc(db, 'meetings', meeting.id), meeting)
    .catch(e => toast('Erro ao salvar reunião: ' + e.message, 'error'));
}

export async function deleteMeeting(id) {
  await deleteDoc(doc(db, 'meetings', id))
    .catch(e => toast('Erro ao excluir reunião: ' + e.message, 'error'));
}