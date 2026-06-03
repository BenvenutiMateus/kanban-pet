// ════════════════════════════════════════════════════════
// EVENTS.CALENDAR.JS
// Calendário mensal de eventos
// ════════════════════════════════════════════════════════
import { currentUser } from '../state.js';
import { getEventsByMonth } from './events.state.js';
import { openCreateEventModal, openEditEventModal } from './events.modal.js';

const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const DAYS_SHORT = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

let _year  = new Date().getFullYear();
let _month = new Date().getMonth();

// ── Public ────────────────────────────────────────────────

export function initCalendar() {
  const wrap = document.getElementById('calendar-wrap');
  if (!wrap) return;
  wrap.innerHTML = buildShell();
  document.getElementById('cal-prev').onclick  = () => { navigateMonth(-1); };
  document.getElementById('cal-next').onclick  = () => { navigateMonth(1); };
  document.getElementById('cal-today').onclick = () => { _year = new Date().getFullYear(); _month = new Date().getMonth(); renderGrid(); };
  document.getElementById('cal-new-event').onclick = () => openCreateEventModal(new Date());
  renderGrid();
}

export function refreshCalendar() {
  if (document.getElementById('calendar-wrap')?.style.display !== 'none') renderGrid();
}

export function showCalendar() {
  document.getElementById('board-wrap').style.display   = 'none';
  document.getElementById('calendar-wrap').style.display = '';
  document.getElementById('empty-state').style.display  = 'none';
  document.getElementById('board-meta').style.display   = 'none';
  document.getElementById('topbar-search').style.display = 'none';
  initCalendar();
}

// ── Navigation ────────────────────────────────────────────

function navigateMonth(delta) {
  _month += delta;
  if (_month > 11) { _month = 0;  _year++; }
  if (_month < 0)  { _month = 11; _year--; }
  renderGrid();
}

// ── Render ────────────────────────────────────────────────

function renderGrid() {
  document.getElementById('cal-month-label').textContent = `${MONTHS[_month]} ${_year}`;

  const events  = getEventsByMonth(_year, _month, currentUser?.uid);
  const byDay   = groupByDay(events);

  const firstDay = new Date(_year, _month, 1).getDay();
  const daysInMonth = new Date(_year, _month + 1, 0).getDate();
  const today = new Date();

  const grid = document.getElementById('cal-grid');
  grid.innerHTML = '';

  // Header row
  DAYS_SHORT.forEach(d => {
    const cell = document.createElement('div');
    cell.className = 'cal-day-header';
    cell.textContent = d;
    grid.appendChild(cell);
  });

  // Empty cells before first day
  for (let i = 0; i < firstDay; i++) {
    grid.appendChild(Object.assign(document.createElement('div'), { className: 'cal-cell cal-cell--empty' }));
  }

  // Day cells
  for (let day = 1; day <= daysInMonth; day++) {
    const isToday = today.getFullYear() === _year && today.getMonth() === _month && today.getDate() === day;
    const cell = document.createElement('div');
    cell.className = 'cal-cell' + (isToday ? ' cal-cell--today' : '');
    cell.dataset.day = day;

    const num = document.createElement('span');
    num.className = 'cal-day-num';
    num.textContent = day;
    cell.appendChild(num);

    const dayEvents = byDay[day] || [];
    const visible = dayEvents.slice(0, 3);
    const overflow = dayEvents.length - visible.length;

    visible.forEach(ev => {
      const pill = document.createElement('div');
      pill.className = 'cal-event-pill';
      pill.style.background = ev.color + '30';
      pill.style.borderLeft = `3px solid ${ev.color}`;
      pill.style.color = ev.color;
      pill.textContent = formatTime(ev.startDate) + ' ' + ev.title;
      pill.title = ev.title;
      pill.onclick = e => { e.stopPropagation(); openEditEventModal(ev); };
      cell.appendChild(pill);
    });

    if (overflow > 0) {
      const more = document.createElement('div');
      more.className = 'cal-more';
      more.textContent = `+${overflow} mais`;
      cell.appendChild(more);
    }

    // Click on empty area of cell → create event on that day
    cell.onclick = () => {
      const d = new Date(_year, _month, day, 9, 0);
      openCreateEventModal(d);
    };

    grid.appendChild(cell);
  }
}

// ── Helpers ───────────────────────────────────────────────

function groupByDay(events) {
  const map = {};
  events.forEach(ev => {
    const d = new Date(ev.startDate).getDate();
    if (!map[d]) map[d] = [];
    map[d].push(ev);
  });
  return map;
}

function formatTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

// ── Shell HTML ────────────────────────────────────────────

function buildShell() {
  return `
<div class="cal-container">
  <div class="cal-toolbar">
    <button class="cal-nav-btn" id="cal-prev">‹</button>
    <span class="cal-month-label" id="cal-month-label"></span>
    <button class="cal-nav-btn" id="cal-next">›</button>
    <button class="cal-today-btn" id="cal-today">Hoje</button>
    <button class="btn-save" id="cal-new-event" style="margin-left:auto;font-size:12px;padding:6px 14px">+ Novo evento</button>
  </div>
  <div class="cal-grid" id="cal-grid"></div>
</div>`;
}
