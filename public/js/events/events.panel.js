// ════════════════════════════════════════════════════════
// EVENTS.PANEL.JS
// Painel de lista de eventos + badge na sidebar
// ════════════════════════════════════════════════════════
import { currentUser } from '../state.js';
import { getState } from '../state.js';
import { getVisibleEvents, getUpcomingEvents, onEventsChange } from './events.state.js';
import { openCreateEventModal, openEditEventModal } from './events.modal.js';
import { refreshCalendar } from './events.calendar.js';

const MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

// ── Sidebar badge ─────────────────────────────────────────

export function initSidebarEventsBadge() {
  onEventsChange(() => updateSidebarBadge());
}

function updateSidebarBadge() {
  const uid     = currentUser?.uid;
  const upcoming = getUpcomingEvents(uid, 7);
  const badge   = document.getElementById('sb-events-badge');
  if (badge) badge.textContent = upcoming.length > 0 ? upcoming.length : '';

  // Atualiza tooltip / mini-lista no botão do calendário
  const btn = document.getElementById('btn-calendar');
  if (btn) btn.title = upcoming.length
    ? `${upcoming.length} evento(s) nos próximos 7 dias`
    : 'Calendário';
}

// ── Events Panel ──────────────────────────────────────────

export function showEventsPanel() {
  // Esconde board
  document.getElementById('board-wrap').style.display    = 'none';
  document.getElementById('calendar-wrap').style.display = 'none';
  document.getElementById('empty-state').style.display   = 'none';
  document.getElementById('board-meta').style.display    = 'none';
  document.getElementById('topbar-search').style.display = 'none';

  let panel = document.getElementById('events-panel');
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'events-panel';
    document.getElementById('main').appendChild(panel);
  }
  panel.style.display = '';
  renderEventsPanel(panel);

  // Re-render quando estado mudar
  const unsub = onEventsChange(() => renderEventsPanel(panel));
  panel._unsub = unsub;
}

export function hideEventsPanel() {
  const panel = document.getElementById('events-panel');
  if (!panel) return;
  if (panel._unsub) panel._unsub();
  panel.style.display = 'none';
}

function renderEventsPanel(panel) {
  const uid    = currentUser?.uid;
  const events = getVisibleEvents(uid);
  const now    = new Date();

  const upcoming  = events.filter(ev => new Date(ev.startDate) >= now).sort((a,b) => new Date(a.startDate)-new Date(b.startDate));
  const past      = events.filter(ev => new Date(ev.startDate) < now).sort((a,b) => new Date(b.startDate)-new Date(a.startDate));

  panel.innerHTML = `
    <div class="ep-header">
      <h2 class="ep-title">📅 Eventos</h2>
      <button class="btn-save" id="ep-new-btn" style="font-size:12px;padding:6px 14px">+ Novo evento</button>
    </div>
    <div class="ep-body">
      ${upcoming.length === 0 && past.length === 0 ? '<div class="ep-empty">Nenhum evento ainda. Crie o primeiro!</div>' : ''}
      ${upcoming.length ? `<div class="ep-section-title">Próximos</div>${upcoming.map(ev => eventCard(ev)).join('')}` : ''}
      ${past.length ? `<div class="ep-section-title ep-past-title">Passados</div>${past.map(ev => eventCard(ev, true)).join('')}` : ''}
    </div>`;

  document.getElementById('ep-new-btn').onclick = () => openCreateEventModal();

  panel.querySelectorAll('.ep-card').forEach(card => {
    const evId = card.dataset.id;
    const ev   = events.find(e => e.id === evId);
    if (ev) card.onclick = () => openEditEventModal(ev);
  });
}

function eventCard(ev, past = false) {
  const { users } = getState();
  const start    = new Date(ev.startDate);
  const invCount = ev.invitedUserIds?.length;
  const creator  = users?.find(u => u.id === ev.createdBy);
  const recLabel = { none:'', daily:'Diário', weekly:'Semanal', monthly:'Mensal' }[ev.recurrence] || '';

  return `
  <div class="ep-card${past ? ' ep-past' : ''}" data-id="${ev.id}" style="border-left:4px solid ${ev.color}">
    <div class="ep-card-date">
      <span class="ep-day">${start.getDate()}</span>
      <span class="ep-mon">${MONTHS[start.getMonth()]}</span>
    </div>
    <div class="ep-card-body">
      <div class="ep-card-title">${escHtml(ev.title)}</div>
      <div class="ep-card-meta">
        🕐 ${fmtTime(ev.startDate)}${ev.endDate && ev.endDate !== ev.startDate ? ` – ${fmtTime(ev.endDate)}` : ''}
        ${ev.location ? ` &nbsp;📍 ${escHtml(ev.location)}` : ''}
        ${ev.meetingLink ? ` &nbsp;<a href="${escHtml(ev.meetingLink)}" target="_blank" onclick="event.stopPropagation()">🔗 Link</a>` : ''}
      </div>
      <div class="ep-card-tags">
        ${recLabel ? `<span class="ep-tag" style="background:${ev.color}22;color:${ev.color}">🔁 ${recLabel}</span>` : ''}
        ${invCount ? `<span class="ep-tag">👥 ${invCount} convidado${invCount>1?'s':''}</span>` : '<span class="ep-tag">👥 Todos</span>'}
        ${ev.checklist?.length ? `<span class="ep-tag">☑ ${ev.checklist.filter(i=>i.done).length}/${ev.checklist.length}</span>` : ''}
        ${creator ? `<span class="ep-tag">Por ${escHtml(creator.name)}</span>` : ''}
      </div>
    </div>
  </div>`;
}

// ── Utils ─────────────────────────────────────────────────
function fmtTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' });
}
function escHtml(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
