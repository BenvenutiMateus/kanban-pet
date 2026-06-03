// ════════════════════════════════════════════════════════
// EVENTS.FIRESTORE.JS
// Leitura e escrita de eventos no Firestore
// ════════════════════════════════════════════════════════
import { db } from '../main.js';
import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  onSnapshot, query, orderBy, serverTimestamp,
  writeBatch, getDocs, where
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { currentUser } from '../state.js';
import { toast } from '../utils.js';

// ── Listener ativo ──────────────────────────────────────
let _unsubEvents = null;

/**
 * Inicia listener em tempo real de todos os eventos.
 * @param {function} onUpdate - callback(events[])
 */
export function startEventsListener(onUpdate) {
  stopEventsListener();
  const q = query(collection(db, 'events'), orderBy('startDate', 'asc'));
  _unsubEvents = onSnapshot(q, snap => {
    const events = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    onUpdate(events);
  }, err => console.error('Events listener error:', err));
}

export function stopEventsListener() {
  if (_unsubEvents) { _unsubEvents(); _unsubEvents = null; }
}

// ── CRUD ────────────────────────────────────────────────

/**
 * Cria um evento (e suas ocorrências recorrentes).
 * Retorna o ID do evento pai.
 */
export async function createEvent(data) {
  try {
    const payload = buildPayload(data);
    const ref = await addDoc(collection(db, 'events'), payload);

    // Gerar ocorrências recorrentes como documentos filhos
    if (data.recurrence && data.recurrence !== 'none' && data.recurrenceEnd) {
      const occurrences = generateOccurrences(data.startDate, data.endDate, data.recurrence, data.recurrenceEnd);
      const batch = writeBatch(db);
      occurrences.forEach(({ start, end }) => {
        const oRef = doc(collection(db, 'events', ref.id, 'occurrences'));
        batch.set(oRef, { startDate: start, endDate: end, parentId: ref.id });
      });
      await batch.commit();
    }

    toast('Evento criado!', 'success');
    return ref.id;
  } catch (e) {
    console.error(e);
    toast('Erro ao criar evento.', 'error');
  }
}

export async function updateEvent(eventId, data) {
  try {
    await updateDoc(doc(db, 'events', eventId), {
      ...buildPayload(data),
      updatedAt: serverTimestamp(),
    });
    toast('Evento atualizado!', 'success');
  } catch (e) {
    console.error(e);
    toast('Erro ao atualizar evento.', 'error');
  }
}

/**
 * Exclui evento e todas suas ocorrências.
 */
export async function deleteEvent(eventId) {
  try {
    // Deletar subcoleção de ocorrências
    const ocSnap = await getDocs(collection(db, 'events', eventId, 'occurrences'));
    const batch = writeBatch(db);
    ocSnap.docs.forEach(d => batch.delete(d.ref));
    batch.delete(doc(db, 'events', eventId));
    await batch.commit();
    toast('Evento excluído.', 'success');
  } catch (e) {
    console.error(e);
    toast('Erro ao excluir evento.', 'error');
  }
}

// ── Presença ─────────────────────────────────────────────

export async function toggleAttendance(eventId, userId, present) {
  try {
    const snap = await getDocs(
      query(collection(db, 'events', eventId, 'attendance'), where('userId', '==', userId))
    );
    const batch = writeBatch(db);
    if (!snap.empty) {
      batch.update(snap.docs[0].ref, { present, updatedAt: serverTimestamp() });
    } else {
      batch.set(doc(collection(db, 'events', eventId, 'attendance')), {
        userId, present, markedAt: serverTimestamp()
      });
    }
    await batch.commit();
  } catch (e) {
    console.error(e);
    toast('Erro ao registrar presença.', 'error');
  }
}

export async function getAttendance(eventId) {
  const snap = await getDocs(collection(db, 'events', eventId, 'attendance'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ── Helpers ──────────────────────────────────────────────

function buildPayload(data) {
  return {
    title:          data.title,
    description:    data.description || '',
    startDate:      data.startDate,       // ISO string "YYYY-MM-DDTHH:mm"
    endDate:        data.endDate || data.startDate,
    location:       data.location || '',
    meetingLink:    data.meetingLink || '',
    color:          data.color || '#4f9cf9',
    invitedUserIds: data.invitedUserIds || [],  // [] = todos
    recurrence:     data.recurrence || 'none',  // 'none'|'daily'|'weekly'|'monthly'
    recurrenceEnd:  data.recurrenceEnd || null,
    checklist:      data.checklist || [],
    attachments:    data.attachments || [],
    createdBy:      currentUser?.uid || '',
    createdAt:      serverTimestamp(),
  };
}

/**
 * Gera ocorrências entre startDate e recurrenceEnd (exclusive do evento pai).
 * Retorna array de { start, end }.
 */
function generateOccurrences(startISO, endISO, recurrence, recEndISO) {
  const results = [];
  const duration = endISO
    ? new Date(endISO) - new Date(startISO)
    : 0;
  const limit   = new Date(recEndISO);
  let current   = new Date(startISO);

  // pular o próprio evento pai
  advance(current, recurrence);

  while (current <= limit) {
    const start = current.toISOString().slice(0, 16);
    const end   = duration
      ? new Date(current.getTime() + duration).toISOString().slice(0, 16)
      : start;
    results.push({ start, end });
    advance(current, recurrence);
    if (results.length > 365) break; // proteção
  }
  return results;
}

function advance(date, recurrence) {
  if (recurrence === 'daily')        date.setDate(date.getDate() + 1);
  else if (recurrence === 'weekly')  date.setDate(date.getDate() + 7);
  else if (recurrence === 'monthly') date.setMonth(date.getMonth() + 1);
}
