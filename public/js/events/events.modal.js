// ════════════════════════════════════════════════════════
// EVENTS.MODAL.JS
// Modal de criação / edição de evento
// ════════════════════════════════════════════════════════
import { currentUser } from '../state.js';
import { getState } from '../state.js';       // { users }
import { createEvent, updateEvent, deleteEvent, getAttendance, toggleAttendance } from './events.firestore.js';
import { toast } from '../utils.js';

const EVENT_COLORS = [
  { label: 'Azul',    value: '#4f9cf9' },
  { label: 'Verde',   value: '#34d399' },
  { label: 'Roxo',    value: '#a78bfa' },
  { label: 'Laranja', value: '#fb923c' },
  { label: 'Rosa',    value: '#f472b6' },
  { label: 'Amarelo', value: '#fbbf24' },
  { label: 'Vermelho',value: '#f87171' },
  { label: 'Ciano',   value: '#22d3ee' },
];

let _mode = 'create'; // 'create' | 'edit'
let _eventId = null;
let _checklistItems = [];

// ── Public API ────────────────────────────────────────────

export function openCreateEventModal(prefillDate = null) {
  _mode = 'create';
  _eventId = null;
  _checklistItems = [];
  resetForm();
  if (prefillDate) {
    const iso = prefillDate.toISOString().slice(0, 10);
    document.getElementById('ev-start').value = iso + 'T09:00';
    document.getElementById('ev-end').value   = iso + 'T10:00';
  }
  document.getElementById('ev-modal-title').textContent = 'Novo evento';
  document.getElementById('ev-btn-delete').style.display = 'none';
  document.getElementById('ev-attendance-section').style.display = 'none';
  showModal();
}

export function openEditEventModal(event) {
  _mode    = 'edit';
  _eventId = event.id;
  _checklistItems = (event.checklist || []).map(i => ({ ...i }));
  populateForm(event);
  document.getElementById('ev-modal-title').textContent = 'Editar evento';
  document.getElementById('ev-btn-delete').style.display = '';
  loadAttendance(event);
  showModal();
}

// ── Init ──────────────────────────────────────────────────

export function initEventModal() {
  injectHTML();

  document.getElementById('ev-modal-close').onclick  = closeModal;
  document.getElementById('ev-modal-overlay').onclick = e => {
    if (e.target === document.getElementById('ev-modal-overlay')) closeModal();
  };
  document.getElementById('ev-btn-save').onclick   = handleSave;
  document.getElementById('ev-btn-delete').onclick = handleDelete;
  document.getElementById('ev-recurrence').onchange = syncRecurrenceEnd;
  document.getElementById('ev-cl-add-btn').onclick  = addChecklistItem;
  document.getElementById('ev-cl-new').onkeydown    = e => {
    if (e.key === 'Enter') { e.preventDefault(); addChecklistItem(); }
  };

  // Color swatches
  document.getElementById('ev-color-swatches').addEventListener('click', e => {
    const sw = e.target.closest('.ev-swatch');
    if (!sw) return;
    document.querySelectorAll('.ev-swatch').forEach(s => s.classList.remove('selected'));
    sw.classList.add('selected');
  });
}

// ── Form Helpers ──────────────────────────────────────────

function resetForm() {
  ['ev-title','ev-desc','ev-start','ev-end','ev-location','ev-meeting-link','ev-recurrence-end'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  document.getElementById('ev-recurrence').value = 'none';
  document.getElementById('ev-recurrence-end-wrap').style.display = 'none';
  document.getElementById('ev-cl-list').innerHTML = '';
  renderColorSwatches('#4f9cf9');
  renderUserCheckboxes([]);
}

function populateForm(ev) {
  document.getElementById('ev-title').value           = ev.title || '';
  document.getElementById('ev-desc').value            = ev.description || '';
  document.getElementById('ev-start').value           = ev.startDate?.slice(0,16) || '';
  document.getElementById('ev-end').value             = ev.endDate?.slice(0,16) || '';
  document.getElementById('ev-location').value        = ev.location || '';
  document.getElementById('ev-meeting-link').value    = ev.meetingLink || '';
  document.getElementById('ev-recurrence').value      = ev.recurrence || 'none';
  document.getElementById('ev-recurrence-end').value  = ev.recurrenceEnd || '';
  syncRecurrenceEnd();
  renderColorSwatches(ev.color || '#4f9cf9');
  renderUserCheckboxes(ev.invitedUserIds || []);
  renderChecklistItems();
}

function renderColorSwatches(selected) {
  const wrap = document.getElementById('ev-color-swatches');
  wrap.innerHTML = '';
  EVENT_COLORS.forEach(c => {
    const sw = document.createElement('button');
    sw.type = 'button';
    sw.className = 'ev-swatch' + (c.value === selected ? ' selected' : '');
    sw.dataset.color = c.value;
    sw.title = c.label;
    sw.style.background = c.value;
    wrap.appendChild(sw);
  });
}

function renderUserCheckboxes(selectedIds) {
  const { users } = getState();
  const list = document.getElementById('ev-user-list');
  list.innerHTML = '';
  (users || []).filter(u => u.role !== 'pendente').forEach(u => {
    const row = document.createElement('label');
    row.className = 'ev-user-row';
    row.innerHTML = `
      <input type="checkbox" value="${u.id}" ${selectedIds.includes(u.id) ? 'checked' : ''}>
      <span class="ev-user-av" style="background:${u.color}22;color:${u.color}">${initials(u.name)}</span>
      <span>${escHtml(u.name)}</span>
    `;
    list.appendChild(row);
  });
}

function renderChecklistItems() {
  const list = document.getElementById('ev-cl-list');
  list.innerHTML = '';
  _checklistItems.forEach((item, i) => {
    const row = document.createElement('div');
    row.className = 'ev-cl-item';
    row.innerHTML = `
      <input type="checkbox" ${item.done ? 'checked' : ''} data-i="${i}">
      <input type="text" class="ev-cl-text" value="${escHtml(item.text)}" data-i="${i}">
      <button class="ev-cl-del" data-i="${i}">×</button>
    `;
    row.querySelector('input[type=checkbox]').onchange = e => { _checklistItems[i].done = e.target.checked; };
    row.querySelector('.ev-cl-text').onblur = e => { _checklistItems[i].text = e.target.value.trim(); };
    row.querySelector('.ev-cl-del').onclick = () => { _checklistItems.splice(i, 1); renderChecklistItems(); };
    list.appendChild(row);
  });
}

function addChecklistItem() {
  const inp = document.getElementById('ev-cl-new');
  const t   = inp.value.trim();
  if (!t) return;
  _checklistItems.push({ text: t, done: false });
  renderChecklistItems();
  inp.value = '';
  inp.focus();
}

function syncRecurrenceEnd() {
  const val  = document.getElementById('ev-recurrence').value;
  const wrap = document.getElementById('ev-recurrence-end-wrap');
  wrap.style.display = val !== 'none' ? '' : 'none';
}

// Armazena arquivos selecionados (somente metadados — upload real depende do seu Storage)

// ── Save / Delete ─────────────────────────────────────────

async function handleSave() {
  const title = document.getElementById('ev-title').value.trim();
  if (!title) { toast('Adicione um título ao evento.', 'error'); return; }
  const start = document.getElementById('ev-start').value;
  if (!start) { toast('Defina a data e hora de início.', 'error'); return; }

  const selectedColor = document.querySelector('.ev-swatch.selected')?.dataset.color || '#4f9cf9';
  const invitedIds    = Array.from(document.querySelectorAll('#ev-user-list input[type=checkbox]:checked')).map(cb => cb.value);
  const recurrence    = document.getElementById('ev-recurrence').value;
  const recurrenceEnd = document.getElementById('ev-recurrence-end').value || null;

  if (recurrence !== 'none' && !recurrenceEnd) {
    toast('Defina até quando o evento se repete.', 'error'); return;
  }

  const data = {
    title,
    description:    document.getElementById('ev-desc').value.trim(),
    startDate:      start,
    endDate:        document.getElementById('ev-end').value || start,
    location:       document.getElementById('ev-location').value.trim(),
    meetingLink:    document.getElementById('ev-meeting-link').value.trim(),
    color:          selectedColor,
    invitedUserIds: invitedIds,
    recurrence,
    recurrenceEnd,
    checklist:      _checklistItems,
  };

  const btn = document.getElementById('ev-btn-save');
  btn.disabled = true; btn.textContent = 'Salvando...';
  try {
    if (_mode === 'create') await createEvent(data);
    else                    await updateEvent(_eventId, data);
    closeModal();
  } finally {
    btn.disabled = false; btn.textContent = 'Salvar';
  }
}

async function handleDelete() {
  if (!_eventId) return;
  if (!confirm('Excluir este evento e todas as suas ocorrências?')) return;
  await deleteEvent(_eventId);
  closeModal();
}

// ── Attendance ────────────────────────────────────────────

async function loadAttendance(event) {
  const section = document.getElementById('ev-attendance-section');
  section.style.display = '';
  section.innerHTML = '<label>Presença</label><div class="ev-att-loading">Carregando...</div>';

  const { users } = getState();
  const invited   = event.invitedUserIds?.length ? users.filter(u => event.invitedUserIds.includes(u.id)) : users;
  const records   = await getAttendance(event.id);
  const byUser    = Object.fromEntries(records.map(r => [r.userId, r.present]));

  section.innerHTML = '<label>Presença</label>';
  const grid = document.createElement('div');
  grid.className = 'ev-att-grid';
  invited.filter(u => u.role !== 'pendente').forEach(u => {
    const present = byUser[u.id];
    const btn = document.createElement('button');
    btn.className = 'ev-att-btn' + (present === true ? ' present' : present === false ? ' absent' : '');
    btn.innerHTML = `<span class="ev-user-av" style="background:${u.color}22;color:${u.color}">${initials(u.name)}</span><span>${escHtml(u.name)}</span>`;
    btn.onclick = async () => {
      const next = present === true ? false : true;
      await toggleAttendance(event.id, u.id, next);
      await loadAttendance(event); // re-render
    };
    grid.appendChild(btn);
  });
  section.appendChild(grid);
}

// ── Modal visibility ──────────────────────────────────────

function showModal() {
  document.getElementById('ev-modal-overlay').classList.add('open');
  document.getElementById('ev-title').focus();
}
function closeModal() {
  document.getElementById('ev-modal-overlay').classList.remove('open');
}

// ── Inject HTML ───────────────────────────────────────────

function injectHTML() {
  const div = document.createElement('div');
  div.innerHTML = `
<div id="ev-modal-overlay">
  <div id="ev-modal">
    <div class="ev-modal-head">
      <span id="ev-modal-title">Novo evento</span>
      <button id="ev-modal-close">×</button>
    </div>
    <div class="ev-modal-body">
      <!-- Coluna principal -->
      <div class="ev-modal-main">
        <div class="ev-field">
          <label>Título *</label>
          <input type="text" id="ev-title" placeholder="Nome do evento">
        </div>
        <div class="ev-field">
          <label>Descrição</label>
          <textarea id="ev-desc" placeholder="Descreva o evento..."></textarea>
        </div>
        <div class="ev-row2">
          <div class="ev-field">
            <label>Início *</label>
            <input type="datetime-local" id="ev-start">
          </div>
          <div class="ev-field">
            <label>Término</label>
            <input type="datetime-local" id="ev-end">
          </div>
        </div>
        <div class="ev-field">
          <label>Local</label>
          <input type="text" id="ev-location" placeholder="Ex: Sala 3, Lab Estat...">
        </div>
        <div class="ev-field">
          <label>Link da reunião</label>
          <input type="url" id="ev-meeting-link" placeholder="https://meet.google.com/...">
        </div>
        <div class="ev-field">
          <label>Cor do evento</label>
          <div id="ev-color-swatches" class="ev-swatches"></div>
        </div>
        <div class="ev-field">
          <label>Checklist de presença / tarefas do evento</label>
          <div id="ev-cl-list"></div>
          <div class="ev-cl-add">
            <input type="text" id="ev-cl-new" placeholder="Novo item...">
            <button class="ev-cl-add-btn" id="ev-cl-add-btn">+</button>
          </div>
        </div>
        <div id="ev-attendance-section" class="ev-field" style="display:none"></div>
        <div class="ev-field">
        </div>
      </div>
      <!-- Coluna lateral -->
      <div class="ev-modal-side">
        <div class="ev-field">
          <label>Recorrência</label>
          <select id="ev-recurrence">
            <option value="none">Não recorrente</option>
            <option value="daily">Diário</option>
            <option value="weekly">Semanal</option>
            <option value="monthly">Mensal</option>
          </select>
        </div>
        <div id="ev-recurrence-end-wrap" class="ev-field" style="display:none">
          <label>Repetir até</label>
          <input type="date" id="ev-recurrence-end">
        </div>
        <div class="ev-field">
          <label>Quem pode ver</label>
          <small style="color:var(--text3);font-size:10px;margin-bottom:6px;display:block">Deixe todos desmarcados para visível a todos</small>
          <div id="ev-user-list" class="ev-user-list"></div>
        </div>
      </div>
    </div>
    <div class="ev-modal-footer">
      <button class="btn-danger" id="ev-btn-delete" style="display:none">🗑 Excluir</button>
      <button class="btn-save" id="ev-btn-save" style="margin-left:auto">Salvar</button>
    </div>
  </div>
</div>`;
  document.body.appendChild(div.firstElementChild);
}

// ── Utils ─────────────────────────────────────────────────
function initials(name) { return String(name||'').split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2); }
function escHtml(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
