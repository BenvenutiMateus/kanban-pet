// ════════════════════════════════════════════════════════
// UI.JS - RENDERIZAÇÃO E INTERAÇÃO DA UI
// ════════════════════════════════════════════════════════

import { STATE, _currentView, _activeBoardId, currentUser,
  setLocalNav, setLastBoardHash, setSearchQ,
  setCalMonth, setCalYear, setModalCardId,
  get_lastBoardHash, get_searchQ, get_calMonth, get_calYear,
  get_modalCardId, get_drag, get_pendingRender, setPendingRender } from './state.js';
import { TAGS, AV_COLORS, GRP_COLORS, BOARD_COLORS, COL_ACCENT_COLORS, FB_CONFIG } from './constants.js';
import { uid, esc, initials, createUsername, fmtDate, fmtTs, today, toast } from './utils.js';
import { dialog } from './dialog.js';
import { saveBoard, saveMeta, saveUser, saveMeeting, deleteMeeting, saveNotification, markNotificationRead, deleteNotification } from './firestore.js';
import { db, auth } from './main.js';
import { doc, deleteDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signOut, updateProfile } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";
import { storage } from './main.js';

export function me() {
  return currentUser ? STATE.users[currentUser.uid] : null;
}

export function isAdmin() {
  const u = me();
  return u && ['admin', 'tutor'].includes(u.role);
}

export function activeBoard() {
  return STATE.boards[_activeBoardId] || null;
}

export function findCard(cardId) {
  const b = activeBoard();
  if (!b) return null;
  for (const c of b.columns) {
    const k = c.cards.find(x => x.id === cardId);
    if (k) return { card: k, col: c };
  }
  return null;
}

export function renderAll() {
  renderSidebar();
  renderBoard();
  renderNotifications();

  const adminOverlay = document.getElementById('admin-overlay');
  if (adminOverlay && adminOverlay.classList.contains('open')) {
    renderUserList();
  }

  const membersOverlay = document.getElementById('members-overlay');
  if (membersOverlay && membersOverlay.classList.contains('open')) {
    renderMembersPanel();
  }

  checkDueReminders();
}

function checkDueReminders() {
  if (!currentUser) return;
  const nowTime = new Date(today() + 'T00:00:00').getTime();

  Object.values(STATE.boards).forEach(b => {
    if (!b.memberIds || !b.memberIds.includes(currentUser.uid)) return;
    (b.columns || []).forEach(col => {
      (col.cards || []).forEach(card => {
        if (!card.done && card.due && card.reminder && card.reminder !== '-1' && (card.assignees || []).includes(currentUser.uid)) {
          const dueTime = new Date(card.due + 'T00:00:00').getTime();
          const diffDays = Math.ceil((dueTime - nowTime) / (1000 * 60 * 60 * 24));
          const reminderDays = parseInt(card.reminder, 10);

          if (diffDays <= reminderDays) {
            let notifType = 'upcoming';
            if (diffDays === 0) notifType = 'today';
            else if (diffDays < 0) notifType = 'overdue';

            const notifId = `remind_${currentUser.uid}_${card.id}_${card.due}_${notifType}`;
            if (!STATE.notifications || !STATE.notifications[notifId]) {
              // Set locally immediately to prevent duplicate triggers before DB syncs
              if (!STATE.notifications) STATE.notifications = {};
              STATE.notifications[notifId] = { id: notifId, read: false }; // placeholder

              let text = `Lembrete: A tarefa "${card.title}" vence em ${diffDays} dia(s).`;
              if (diffDays === 0) text = `Lembrete: A tarefa "${card.title}" vence hoje.`;
              else if (diffDays < 0) text = `Atraso: A tarefa "${card.title}" está atrasada em ${Math.abs(diffDays)} dia(s).`;

              saveNotification({
                id: notifId,
                userId: currentUser.uid,
                type: 'reminder',
                text,
                boardId: b.id,
                cardId: card.id,
                read: false,
                ts: Date.now(),
                deleted: false
              });
            }
          }
        }
      });
    });
  });
}

// ─── NOTIFICATIONS ──────────────────────────────────────

function renderNotifications() {
  if (!currentUser) return;
  const badge = document.getElementById('notif-badge');
  const listEl = document.getElementById('notif-list');
  if (!badge || !listEl) return;

  const notifs = Object.values(STATE.notifications || {})
    .filter(n => n.userId === currentUser.uid && !n.deleted)
    .sort((a, b) => b.ts - a.ts);

  const unreadCount = notifs.filter(n => !n.read).length;
  if (unreadCount > 0) {
    badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
    badge.style.display = 'block';
  } else {
    badge.style.display = 'none';
  }

  listEl.innerHTML = '';

  const btnClear = document.getElementById('btn-clear-notifs');
  if (btnClear) {
    btnClear.style.display = notifs.length > 0 ? 'block' : 'none';
    btnClear.onclick = () => {
      notifs.forEach(n => {
        n.deleted = true; // Optimistic local update
        deleteNotification(n.id);
      });
      renderNotifications();
    };
  }

  if (notifs.length === 0) {
    listEl.innerHTML = '<div style="color:var(--text2); text-align:center; padding:10px;">Nenhuma notificação</div>';
    return;
  }

  notifs.forEach(n => {
    const item = document.createElement('div');
    item.style.cssText = `padding: 10px; border-bottom: 1px solid var(--border); display: flex; align-items: center; gap: 8px; ${!n.read ? 'background: var(--surface2);' : ''}`;

    // Dot indicator for unread
    const dot = document.createElement('div');
    dot.style.cssText = `width: 8px; height: 8px; border-radius: 50%; min-width: 8px; background: ${!n.read ? 'var(--accent)' : 'transparent'}`;

    const textDiv = document.createElement('div');
    textDiv.style.cssText = 'flex: 1; font-size: 13px; line-height: 1.4; cursor: pointer;';
    textDiv.innerHTML = `<div>${esc(n.text)}</div><div style="font-size: 11px; color: var(--text3); margin-top: 4px;">${fmtTs(n.ts)}</div>`;

    const delBtn = document.createElement('button');
    delBtn.innerHTML = '✖';
    delBtn.style.cssText = 'background: none; border: none; color: var(--text3); cursor: pointer; font-size: 12px; padding: 4px;';
    delBtn.title = 'Excluir';

    delBtn.onclick = (e) => {
      e.stopPropagation();
      n.deleted = true; // Optimistic local update
      deleteNotification(n.id);
      renderNotifications();
    };

    item.append(dot, textDiv, delBtn);

    textDiv.onclick = async () => {
      document.getElementById('notif-dropdown').style.display = 'none';
      if (!n.read) await markNotificationRead(n.id);

      // Navigate to the board and card if available
      if (n.boardId && STATE.boards[n.boardId]) {
        setLocalNav(n.boardId, 'board');
        renderAll();
        if (n.cardId) {
          // Add a small delay to let the board render first
          setTimeout(() => {
            const found = findCard(n.cardId);
            if (found) openModal(n.cardId);
          }, 50);
        }
      }
    };

    listEl.appendChild(item);
  });
}

// ─── SIDEBAR ────────────────────────────────────────────

function renderSidebar() {
  const u = me();
  if (!u) return;

  const av = document.getElementById('sb-avatar');
  av.style.cssText = `width:30px;height:30px;min-width:30px;border-radius:50%;background:${u.color}22;color:${u.color};font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;`;
  av.textContent = initials(u.name);
  document.getElementById('sb-user-name').textContent = u.name;
  document.getElementById('sb-user-role').textContent = u.role.charAt(0).toUpperCase() + u.role.slice(1);
  document.getElementById('btn-admin').style.display = isAdmin() ? '' : 'none';

  const calBtn = document.getElementById('btn-calendar');
  calBtn.style.background = (_currentView === 'calendar') ? 'rgba(138,21,56,.25)' : 'rgba(138,21,56,.12)';

  const nav = document.getElementById('sb-nav');
  nav.innerHTML = '';

  const groups = STATE.meta.groups || [];
  const allBoards = Object.values(STATE.boards);
  const groupedIds = new Set(groups.flatMap(g => g.boardIds || []));
  const isAdm = isAdmin();

  const accessibleGroupIds = new Set(groups.filter(g =>
    isAdm || g.creatorId === currentUser.uid || (g.memberIds && g.memberIds.includes(currentUser.uid))
  ).map(g => g.id));

  const myBoards = allBoards.filter(b => {
    if (isAdm) return true;
    if (b.memberIds && b.memberIds.includes(currentUser.uid)) return true; // fallback to check if user has access to board
    if (b.groupId) return accessibleGroupIds.has(b.groupId);
    return false;
  });
  const myBoardIds = new Set(myBoards.map(b => b.id));

  groups.forEach(g => {
    const gBoards = (g.boardIds || []).filter(id => myBoardIds.has(id)).map(id => STATE.boards[id]).filter(Boolean);
    if (!isAdm && gBoards.length === 0 && g.creatorId !== currentUser.uid && !(g.memberIds && g.memberIds.includes(currentUser.uid))) return;

    const openKey = 'grp_open_' + g.id;
    const open = localStorage.getItem(openKey) !== 'false';
    const grp = document.createElement('div');
    grp.className = 'sb-group';
    grp.innerHTML = `
      <div class="sb-group-header" data-gid="${g.id}">
        <div class="sb-group-dot" style="background:${g.color}"></div>
        <span class="sb-group-name sb-label">${esc(g.name)}</span>
        <button class="grp-add-board sb-label" title="Novo quadro neste grupo" style="background:none;border:none;color:var(--text3);font-size:16px;padding:0 6px;margin-left:auto;line-height:1;" onmouseenter="this.style.color='var(--accent)'" onmouseleave="this.style.color='var(--text3)'">+</button>
        <button class="grp-rename sb-label" title="Renomear grupo" style="background:none;border:none;color:var(--text3);font-size:14px;padding:0 6px;line-height:1;" onmouseenter="this.style.color='var(--accent)'" onmouseleave="this.style.color='var(--text3)'">✏️</button>
        <button class="grp-members sb-label" title="Membros do grupo" style="background:none;border:none;color:var(--text3);font-size:16px;padding:0 6px;line-height:1;" onmouseenter="this.style.color='var(--accent)'" onmouseleave="this.style.color='var(--text3)'">👥</button>
        <button class="grp-del sb-label" title="Excluir grupo" style="background:none;border:none;color:var(--text3);font-size:16px;padding:0 6px;line-height:1;" onmouseenter="this.style.color='var(--red)'" onmouseleave="this.style.color='var(--text3)'">×</button>
        <span class="sb-arrow sb-label ${open ? 'open' : ''}">▶</span>
      </div>
      <div class="sb-group-boards" style="max-height:${open ? '600px' : '0'}"></div>
    `;
    const boardsDiv = grp.querySelector('.sb-group-boards');
    gBoards.forEach(b => boardsDiv.appendChild(sbBoardItem(b)));

    grp.querySelector('.sb-group-header').onclick = e => {
      if (e.target.closest('button')) return;
      const isOpen = localStorage.getItem(openKey) !== 'false';
      localStorage.setItem(openKey, isOpen ? 'false' : 'true');
      renderSidebar();
    };

    grp.querySelector('.grp-add-board').onclick = e => {
      e.stopPropagation();
      createNewBoard(g.id);
    };

    grp.querySelector('.grp-rename').onclick = e => {
      e.stopPropagation();
      dialog({ title: 'Renomear grupo', input: true, defaultVal: g.name, okLabel: 'Salvar' }, async name => {
        if (!name) return;
        g.name = name.trim();
        await saveMeta({ groups: STATE.meta.groups });
      });
    };

    grp.querySelector('.grp-members').onclick = e => {
      e.stopPropagation();
      openMembersPanel(g.id);
    };

    grp.querySelector('.grp-del').onclick = e => {
      e.stopPropagation();
      dialog({ title: 'Excluir grupo?', msg: `O grupo "${g.name}" será removido. Os quadros não serão apagados.`, danger: true, okLabel: 'Excluir' }, async ok => {
        if (!ok) return;
        await saveMeta({ groups: STATE.meta.groups.filter(x => x.id !== g.id) });
        toast('Grupo removido');
      });
    };

    nav.appendChild(grp);
  });

  const ungrouped = myBoards.filter(b => !groupedIds.has(b.id));
  if (ungrouped.length) {
    const sep = document.createElement('div');
    sep.className = 'sb-group-header';
    sep.style.cursor = 'default';
    sep.innerHTML = `<div class="sb-group-dot" style="background:var(--text3)"></div><span class="sb-group-name sb-label">Sem grupo</span>`;
    nav.appendChild(sep);
    ungrouped.forEach(b => nav.appendChild(sbBoardItem(b)));
  }
}

function sbBoardItem(b) {
  const el = document.createElement('div');
  const isActive = (b.id === _activeBoardId && _currentView === 'board');
  el.className = 'sb-board-item' + (isActive ? ' active' : '');
  el.innerHTML = `<span style="width:7px;height:7px;min-width:7px;border-radius:2px;background:${b.color};display:inline-block;"></span><span class="sb-board-name sb-label">${esc(b.name)}</span>`;
  el.onclick = () => { setLocalNav(b.id, 'board'); renderAll(); };
  return el;
}

// ─── BOARD ──────────────────────────────────────────────

function renderBoard() {
  // Form de adicionar aberto — agenda e sai
  if (document.querySelector('.col-add-form.open')) {
    setPendingRender(true);
    return;
  }

  // Modal aberto — atualiza conteúdo do modal em tempo real e agenda re-render
  if (document.getElementById('modal-overlay').classList.contains('open')) {
    const found = findCard(get_modalCardId());
    if (found) {
      renderChecklist(found.card);
      renderComments(found.card);
      renderModalAttachments(found.card);
    }
    setPendingRender(true);
    return;
  }

  // Título de coluna sendo editado — agenda e sai
  if (document.querySelector('.col-title:not([readonly])')) {
    setPendingRender(true);
    return;
  }

  const wrap = document.getElementById('board-wrap');
  const empty = document.getElementById('empty-state');
  const meta = document.getElementById('board-meta');
  const search = document.getElementById('topbar-search');
  const calWrap = document.getElementById('calendar-wrap');

  if (_currentView === 'calendar') {
    wrap.style.display = 'none';
    empty.style.display = 'none';
    meta.style.display = 'none';
    search.style.display = 'none';
    calWrap.style.display = 'flex';
    renderCalendar();
    return;
  }

  calWrap.style.display = 'none';
  const b = activeBoard();
  const isAdm = isAdmin();
  const hasAccess = b && (isAdm || (b.memberIds && b.memberIds.includes(currentUser.uid)));

  if (!b || !hasAccess) {
    wrap.style.display = 'none';
    empty.style.display = 'flex';
    meta.style.display = 'none';
    search.style.display = 'none';
    return;
  }

  wrap.style.display = 'flex';
  empty.style.display = 'none';
  meta.style.display = 'flex';
  search.style.display = '';
  document.getElementById('board-title-text').textContent = b.name;

  const tba = document.getElementById('tb-members');
  tba.innerHTML = '';
  (b.memberIds || []).slice(0, 6).forEach(uid2 => {
    const u = STATE.users[uid2];
    if (!u) return;
    const el = document.createElement('div');
    el.className = 'tb-av';
    el.style.cssText = `background:${u.color}22;color:${u.color};`;
    el.setAttribute('data-tip', u.name);
    el.textContent = initials(u.name);
    tba.appendChild(el);
  });

  const q = get_searchQ().toLowerCase();
  wrap.innerHTML = '';

  // Timestamp de quando o board foi renderizado — usado para bloquear cliques propagados
  const renderTs = performance.now();

  (b.columns || []).forEach((col, ci) => {
    const cards = q
      ? col.cards.filter(k => k.title.toLowerCase().includes(q) || (k.desc || '').toLowerCase().includes(q))
      : col.cards;

    const colEl = document.createElement('div');
    colEl.className = 'kanban-col';
    colEl.dataset.colId = col.id;
    const accentColor = COL_ACCENT_COLORS[ci % COL_ACCENT_COLORS.length];

    const head = document.createElement('div');
    head.className = 'col-head';
    const colorBar = document.createElement('div');
    colorBar.className = 'col-color-bar';
    colorBar.style.background = accentColor;
    const titleInp = document.createElement('input');
    titleInp.className = 'col-title';
    titleInp.value = col.title;
    titleInp.readOnly = true;
    titleInp.ondblclick = () => { titleInp.readOnly = false; titleInp.focus(); titleInp.select(); };
    titleInp.onblur = async () => {
      titleInp.readOnly = true;
      const v = titleInp.value.trim();
      if (v && v !== col.title) {
        col.title = v;
        await saveBoard(b.id);
      } else titleInp.value = col.title;
    };
    titleInp.onkeydown = e => {
      if (e.key === 'Enter') titleInp.blur();
      if (e.key === 'Escape') { titleInp.value = col.title; titleInp.blur(); }
    };
    const cnt = document.createElement('span');
    cnt.className = 'col-count';
    cnt.textContent = col.cards.length;
    const delBtn = document.createElement('button');
    delBtn.className = 'col-delete';
    delBtn.textContent = '×';
    delBtn.title = 'Excluir coluna';
    delBtn.onclick = () => dialog({ title: 'Excluir coluna?', msg: `"${col.title}" e todos os seus cards serão removidos.`, danger: true, okLabel: 'Excluir' }, async ok => {
      if (!ok) return;
      const bd = activeBoard();
      if (!bd) return;
      bd.columns = bd.columns.filter(c => c.id !== col.id);
      await saveBoard(bd.id);
    });
    head.append(colorBar, titleInp, cnt, delBtn);
    colEl.appendChild(head);

    const container = document.createElement('div');
    container.className = 'cards-container';
    container.dataset.colId = col.id;
    cards.forEach(card => container.appendChild(buildCard(card, col.id, renderTs)));

    container.addEventListener('dragover', e => { e.preventDefault(); container.classList.add('drag-over'); });
    container.addEventListener('dragleave', e => { if (!container.contains(e.relatedTarget)) container.classList.remove('drag-over'); });
    container.addEventListener('drop', async e => {
      e.preventDefault();
      container.classList.remove('drag-over');
      const drag = get_drag();
      if (!drag.cardId) return;
      const bd = activeBoard();
      if (!bd) return;
      const fromCol = bd.columns.find(c => c.id === drag.colId);
      const toCol = bd.columns.find(c => c.id === col.id);
      if (!fromCol || !toCol) return;
      const idx = fromCol.cards.findIndex(c => c.id === drag.cardId);
      if (idx === -1) return;
      const [moved] = fromCol.cards.splice(idx, 1);
      if (fromCol.id !== toCol.id) {
        logAction(moved, `Moveu a tarefa para a coluna "${toCol.title}"`);
      }
      toCol.cards.push(moved);
      await saveBoard(bd.id);
    });
    colEl.appendChild(container);

    const form = document.createElement('div');
    form.className = 'col-add-form';
    const inp = document.createElement('textarea');
    inp.className = 'col-add-input';
    inp.placeholder = 'Título da tarefa...';
    inp.rows = 2;
    const actions = document.createElement('div');
    actions.className = 'col-add-actions';
    const addOk = document.createElement('button');
    addOk.className = 'btn-save';
    addOk.textContent = 'Adicionar';
    const addNo = document.createElement('button');
    addNo.className = 'btn-cancel';
    addNo.textContent = 'Cancelar';
    actions.append(addOk, addNo);
    form.append(inp, actions);

    addOk.onclick = async (e) => {
      e.stopPropagation();
      const t = inp.value.trim();
      if (!t) return;
      const bd = activeBoard();
      if (!bd) return;
      const c2 = bd.columns.find(c => c.id === col.id);
      if (!c2) return;
      const newCard = { id: uid(), title: t, desc: '', tags: [], due: '', checklist: [], comments: [], assignees: [], done: false, createdBy: currentUser.uid, createdAt: Date.now(), logs: [] };
      logAction(newCard, 'Criou a tarefa');
      c2.cards.push(newCard);
      form.classList.remove('open');
      inp.value = '';
      await saveBoard(bd.id);
    };
    addNo.onclick = () => { form.classList.remove('open'); inp.value = ''; };
    inp.onkeydown = e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addOk.click(); }
      if (e.key === 'Escape') addNo.click();
    };
    colEl.appendChild(form);

    const addBtn = document.createElement('button');
    addBtn.className = 'col-add-btn';
    addBtn.textContent = '+ Adicionar tarefa';
    addBtn.onclick = () => { form.classList.add('open'); inp.focus(); };
    colEl.appendChild(addBtn);

    wrap.appendChild(colEl);
  });

  const addCol = document.createElement('button');
  addCol.id = 'add-col-btn';
  addCol.textContent = '+ Nova coluna';
  addCol.onclick = () => dialog({ title: 'Nova coluna', input: true, defaultVal: 'Nova coluna', okLabel: 'Criar' }, async name => {
    if (!name) return;
    const bd = activeBoard();
    if (!bd) return;
    bd.columns.push({ id: uid(), title: name, cards: [] });
    await saveBoard(bd.id);
  });
  wrap.appendChild(addCol);
}

// ─── CARD ────────────────────────────────────────────────

function buildCard(card, colId, renderTs) {
  const el = document.createElement('div');
  el.className = 'card' + (card.done ? ' done' : '');
  el.dataset.id = card.id;
  el.draggable = true;

  el.addEventListener('dragstart', () => {
    const drag = get_drag();
    drag.cardId = card.id;
    drag.colId = colId;
    el.classList.add('dragging');
  });

  el.addEventListener('dragend', () => {
    const drag = get_drag();
    el.classList.remove('dragging');
    drag.cardId = null;
    drag.colId = null;
  });

  el.addEventListener('click', e => {
    if (e.target.closest('.card-done-btn')) return;
    // Bloqueia cliques que aconteceram antes do card ser criado no DOM
    // (propagação de cliques do sidebar ou do botão Adicionar)
    if (e.timeStamp < renderTs) return;
    openModal(card.id);
  });

  const total = card.checklist.length, doneC = card.checklist.filter(x => x.done).length;
  const late = card.due && card.due < today() && !card.done;
  const cmts = (card.comments || []).length;

  const doneBtn = document.createElement('button');
  doneBtn.className = 'card-done-btn';
  doneBtn.title = card.done ? 'Reabrir' : 'Concluir';
  doneBtn.textContent = card.done ? '↺' : '✓';
  doneBtn.onclick = async e => {
    e.stopPropagation();
    const bd = activeBoard();
    if (!bd) return;
    for (const c of bd.columns) {
      const k = c.cards.find(x => x.id === card.id);
      if (k) { k.done = !k.done; break; }
    }
    await saveBoard(bd.id);
  };
  el.appendChild(doneBtn);

  const tagsHtml = (card.tags || []).map(tid => {
    const t = TAGS.find(x => x.id === tid);
    return t ? `<span class="tag" style="background:${t.bg};color:${t.color}">${t.label}</span>` : '';
  }).join('');
  if (tagsHtml) el.insertAdjacentHTML('beforeend', `<div class="card-tags">${tagsHtml}</div>`);
  if (total > 0) {
    const pct = Math.round(doneC / total * 100);
    el.insertAdjacentHTML('beforeend', `<div class="card-progress-bar"><div class="card-progress-fill" style="width:${pct}%"></div></div>`);
  }

  el.insertAdjacentHTML('beforeend', `<div class="card-title">${esc(card.title)}</div>`);
  if (card.desc) el.insertAdjacentHTML('beforeend', `<div class="card-desc-preview">${esc(card.desc)}</div>`);

  let footHtml = '';
  if (total > 0) footHtml += `<span class="card-pill ${doneC === total ? 'pill-done' : 'pill-check'}">☑ ${doneC}/${total}</span>`;
  if (card.due) footHtml += `<span class="card-pill ${late ? 'pill-late' : 'pill-ok'}">${late ? '⚠' : '📅'} ${fmtDate(card.due)}</span>`;
  if (cmts > 0) footHtml += `<span class="card-pill pill-cmt">💬 ${cmts}</span>`;
  const assignsHtml = (card.assignees || []).map(uid2 => {
    const u = STATE.users[uid2];
    return u ? `<div class="card-av" style="background:${u.color}22;color:${u.color}" data-tip="${esc(u.name)}">${initials(u.name)}</div>` : '';
  }).join('');
  if (footHtml || assignsHtml) el.insertAdjacentHTML('beforeend', `<div class="card-footer">${footHtml}<div class="card-assignees">${assignsHtml}</div></div>`);
  return el;
}

// ─── CALENDAR ────────────────────────────────────────────

function renderCalendar() {
  const wrap = document.getElementById('calendar-wrap');
  const myTasks = [];
  Object.values(STATE.boards).forEach(b => {
    if (!b.memberIds || !b.memberIds.includes(currentUser.uid)) return;
    (b.columns || []).forEach(col => {
      (col.cards || []).forEach(card => {
        if ((card.assignees || []).includes(currentUser.uid) && card.due)
          myTasks.push({ ...card, boardName: b.name, colName: col.title, type: 'task' });
      });
    });
  });

  const meetings = Object.values(STATE.meetings || {}).filter(m => {
  if (m.petEvent) return isPET(); 
  return (m.invitees || []).includes(currentUser.uid); 
});


  const firstDay = new Date(get_calYear(), get_calMonth(), 1).getDay();
  const daysInMonth = new Date(get_calYear(), get_calMonth() + 1, 0).getDate();
  const prevMonthDays = new Date(get_calYear(), get_calMonth(), 0).getDate();
  const monthNames = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

  let html = `
    <div class="cal-header">
      <h3>📅 Meu Calendário — ${monthNames[get_calMonth()]} ${get_calYear()}</h3>
      <div class="cal-nav">
        <button id="cal-prev">‹ Anterior</button>
        <button id="cal-today">Hoje</button>
        <button id="cal-next">Próximo ›</button>
        <button id="cal-new-meeting" style="background:var(--accent);color:#fff;border:none;border-radius:var(--r);padding:6px 14px;cursor:pointer;font-weight:600;">+ Reunião</button>
      </div>
    </div>
    <div class="cal-grid">
      <div class="cal-day-head">Dom</div><div class="cal-day-head">Seg</div><div class="cal-day-head">Ter</div>
      <div class="cal-day-head">Qua</div><div class="cal-day-head">Qui</div><div class="cal-day-head">Sex</div><div class="cal-day-head">Sáb</div>
  `;

  const todayStr = today();
  let dayCount = 1, nextMonthDay = 1;

  for (let i = 0; i < 42; i++) {
    let cellClass = 'cal-cell', dNum = '', fullDateStr = '';
    if (i < firstDay) {
      cellClass += ' other-month';
      dNum = prevMonthDays - firstDay + i + 1;
    } else if (dayCount <= daysInMonth) {
      dNum = dayCount;
      fullDateStr = `${get_calYear()}-${String(get_calMonth()+1).padStart(2,'0')}-${String(dNum).padStart(2,'0')}`;
      if (fullDateStr === todayStr) cellClass += ' today';
      dayCount++;
    } else {
      cellClass += ' other-month';
      dNum = nextMonthDay++;
    }

    html += `<div class="${cellClass}"><div class="cal-date">${dNum}</div>`;

    if (fullDateStr) {
      meetings
        .filter(m => m.date === fullDateStr)
        .sort((a, b) => (a.time || '').localeCompare(b.time || ''))
        .forEach(m => {
          html += `<div class="cal-meeting" data-meeting-id="${m.id}" title="${esc(m.title)}&#10;${m.time ? m.time + ' — ' : ''}${esc(m.location || '')}">
            🗓 <strong>${m.time || ''}</strong> ${esc(m.title)}
            ${m.location ? `<span class="cal-meeting-loc">📍${esc(m.location)}</span>` : ''}
          </div>`;
        });

      myTasks.filter(t => t.due === fullDateStr).forEach(t => {
        html += `<div class="cal-task ${t.done ? 'done' : ''}" data-cal-card="${t.id}" title="${esc(t.title)} (${esc(t.boardName)})">
          <span style="color:var(--accent)">•</span> ${esc(t.title)}
        </div>`;
      });
    }
    html += `</div>`;
  }
  html += `</div>`;
  wrap.innerHTML = html;

  document.getElementById('cal-prev').onclick = () => {
    setCalMonth(get_calMonth() - 1);
    if (get_calMonth() < 0) { setCalMonth(11); setCalYear(get_calYear() - 1); }
    renderCalendar();
  };
  document.getElementById('cal-next').onclick = () => {
    setCalMonth(get_calMonth() + 1);
    if (get_calMonth() > 11) { setCalMonth(0); setCalYear(get_calYear() + 1); }
    renderCalendar();
  };
  document.getElementById('cal-today').onclick = () => {
    const d = new Date(); setCalMonth(d.getMonth()); setCalYear(d.getFullYear());
    renderCalendar();
  };

  document.getElementById('cal-new-meeting')?.addEventListener('click', () => openMeetingDialog());

  wrap.querySelectorAll('[data-meeting-id]').forEach(el => {
    el.onclick = () => openMeetingDialog(STATE.meetings[el.dataset.meetingId]);
  });

  wrap.querySelectorAll('[data-cal-card]').forEach(el => {
    el.onclick = () => {
      const cardId = el.dataset.calCard;
      for (const b of Object.values(STATE.boards)) {
        for (const col of (b.columns || [])) {
          if (col.cards.find(c => c.id === cardId)) {
            setLocalNav(b.id, 'board');
            renderAll();
            setTimeout(() => openModal(cardId), 100);
            return;
          }
        }
      }
    };
  });
}

// ─── MEETING DIALOG ─────────────────────────────────────

function openMeetingDialog(meeting = null) {
  const editing = !!meeting;
  const adm = isAdmin();

  const overlay = document.getElementById('meeting-overlay');
  const dlg = document.getElementById('meeting-dialog');

  dlg.innerHTML = `
    <h3>${editing ? '🗓 Reunião' : 'Nova Reunião'}</h3>
    <div style="display:flex;flex-direction:column;gap:10px;margin:12px 0">
      <input id="mtg-title" type="text" placeholder="Título" value="${esc(meeting?.title || '')}" style="padding:8px;border-radius:var(--r);border:1px solid var(--border);background:var(--surface2);color:var(--text)">
      <input id="mtg-date"  type="date" value="${meeting?.date || ''}" style="padding:8px;border-radius:var(--r);border:1px solid var(--border);background:var(--surface2);color:var(--text)">
      <input id="mtg-time"  type="time" value="${meeting?.time || ''}" style="padding:8px;border-radius:var(--r);border:1px solid var(--border);background:var(--surface2);color:var(--text)">
      <input id="mtg-location" type="text" placeholder="Local (ex: Sala 3, Meet...)" value="${esc(meeting?.location || '')}" style="padding:8px;border-radius:var(--r);border:1px solid var(--border);background:var(--surface2);color:var(--text)">
      <textarea id="mtg-desc" placeholder="Descrição (opcional)" style="padding:8px;border-radius:var(--r);border:1px solid var(--border);background:var(--surface2);color:var(--text);resize:vertical;min-height:60px">${esc(meeting?.desc || '')}</textarea>
    </div>
    <div class="dlg-actions" style="display:flex;gap:8px;justify-content:flex-end">
      ${editing ? '<button class="btn-save" id="mtg-gcal" style="background:var(--surface2);color:var(--text);border:1px solid var(--border)">📅 G Agenda</button>' : ''}
      ${editing ? '<button class="btn-danger" id="mtg-del">🗑 Excluir</button>' : ''}
      <button class="dlg-cancel" id="mtg-cancel">Fechar</button>
      <button class="dlg-ok" id="mtg-save">Salvar</button>
    </div>
  `;

  overlay.classList.add('open');

  if (editing) {
    document.getElementById('mtg-gcal').onclick = () => {
      const title = meeting.title || 'Reunião Sem Título';
      const desc = meeting.desc || '';
      const loc = meeting.location || '';
      const date = meeting.date; // YYYY-MM-DD
      const time = meeting.time; // HH:MM

      let datesParam = '';
      if (date) {
        if (time) {
          // Trata como hora local
          const dStart = new Date(`${date}T${time}:00`);
          const dEnd = new Date(dStart.getTime() + 60*60*1000); // +1 hora padrão

          const formatStr = d => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
          // Para formatar como local sem o 'Z' (que indica UTC), basta não usar ISOString com Z,
          // mas o Google Agenda sem o Z assume o horário no timezone do usuário.

          const pad = n => String(n).padStart(2, '0');
          const fmt = d => `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;

          datesParam = `&dates=${fmt(dStart)}/${fmt(dEnd)}`;
        } else {
          // Apenas dia inteiro
          const d = new Date(date + 'T00:00:00');
          const pad = n => String(n).padStart(2, '0');
          const d1Str = `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}`;
          d.setDate(d.getDate() + 1);
          const d2Str = `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}`;
          datesParam = `&dates=${d1Str}/${d2Str}`;
        }
      }

      const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&details=${encodeURIComponent(desc)}&location=${encodeURIComponent(loc)}${datesParam}`;
      window.open(url, '_blank');
    };
  }

  document.getElementById('mtg-cancel').onclick = () => overlay.classList.remove('open');
  overlay.onclick = e => { if (e.target === overlay) overlay.classList.remove('open'); };

  document.getElementById('mtg-del')?.addEventListener('click', async () => {
    await deleteMeeting(meeting.id);
    overlay.classList.remove('open');
    toast('Reunião excluída');
  });

  document.getElementById('mtg-save')?.addEventListener('click', async () => {
  const title = document.getElementById('mtg-title').value.trim();
  const date  = document.getElementById('mtg-date').value;
  if (!title || !date) { toast('Título e data são obrigatórios', 'error'); return; }
 
  const m = {
    id:        meeting?.id || uid(),
    title,
    date,
    time:      document.getElementById('mtg-time').value,
    location:  document.getElementById('mtg-location').value.trim(),
    desc:      document.getElementById('mtg-desc').value.trim(),
    createdBy: currentUser.uid,
    // true = evento do PET (visível só para isPET), false = evento externo (visível só para convidados)
    petEvent:  isPET(),
    // Para eventos externos, lista de UIDs convidados (inclui o criador)
    invitees:  meeting?.invitees || [currentUser.uid],
  };
  await saveMeeting(m);
  overlay.classList.remove('open');
  toast(editing ? 'Evento atualizado' : 'Evento criado', 'success');
});
}

// ─── MODAL ───────────────────────────────────────────────

export function openModal(cardId) {
  setModalCardId(cardId);
  const found = findCard(cardId);
  if (!found) return;
  const { card, col } = found;

  document.getElementById('modal-col-label').textContent = col.title;
  document.getElementById('modal-title').value = card.title;
  document.getElementById('modal-desc').value = card.desc || '';
  document.getElementById('modal-due').value = card.due || '';
  document.getElementById('modal-reminder').value = card.reminder !== undefined ? card.reminder : '-1';

  const te = document.getElementById('modal-tags');
  te.innerHTML = '';
  TAGS.forEach(t => {
    const btn = document.createElement('button');
    btn.className = 'tag-toggle' + ((card.tags || []).includes(t.id) ? ' active' : '');
    btn.textContent = t.label;
    btn.style.background = t.bg;
    btn.style.color = t.color;
    btn.dataset.tid = t.id;
    btn.onclick = () => btn.classList.toggle('active');
    te.appendChild(btn);
  });

  const al = document.getElementById('modal-assignees');
  al.innerHTML = '';
  const currentBoard = activeBoard();
  const boardMemberIds = currentBoard ? (currentBoard.memberIds || []) : [];
  if (!boardMemberIds.length) {
    al.innerHTML = '<div style="font-size:11px;color:var(--text3)">Nenhum membro neste quadro.</div>';
  } else {
    boardMemberIds.forEach(uid2 => {
      const u = STATE.users[uid2];
      if (!u) return;
      const row = document.createElement('div');
      row.className = 'assignee-row';
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = (card.assignees || []).includes(u.id);
      cb.dataset.uid = u.id;
      const sp = document.createElement('span');
      sp.textContent = u.name;
      const dot = document.createElement('div');
      dot.style.cssText = `width:8px;height:8px;border-radius:50%;background:${u.color};flex-shrink:0;`;
      row.append(cb, dot, sp);
      row.onclick = () => { cb.checked = !cb.checked; };
      cb.onclick = e => e.stopPropagation();
      al.appendChild(row);
    });
  }

  const creator = STATE.users[card.createdBy];
  document.getElementById('modal-info').innerHTML = `
    <div class="m-side-row"><span class="label">Criado por</span><span class="value">${esc(creator?.name || '—')}</span></div>
    <div class="m-side-row"><span class="label">Data</span><span class="value">${card.createdAt ? fmtDate(new Date(card.createdAt).toISOString().split('T')[0]) : '—'}</span></div>
    <div class="m-side-row"><span class="label">Status</span><span class="value" style="color:${card.done ? 'var(--green)' : 'var(--text2)'}">${card.done ? '✓ Concluído' : 'Em aberto'}</span></div>
  `;

  renderChecklist(card);
  renderComments(card);
  renderLogs(card);

  const btnGcal = document.getElementById('modal-add-to-gcal');
  if (btnGcal) {
    btnGcal.onclick = () => {
      const title = card.title || 'Tarefa Sem Título';
      const desc = card.desc || '';
      const due = card.due;

      let datesParam = '';
      if (due) {
        // Formato para dia inteiro: YYYYMMDD/YYYYMMDD (terminando no dia seguinte para ser de 1 dia)
        const d = new Date(due + 'T00:00:00'); // Trata como local time
        const pad = n => String(n).padStart(2, '0');
        const d1Str = `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}`;
        d.setDate(d.getDate() + 1);
        const d2Str = `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}`;
        datesParam = `&dates=${d1Str}/${d2Str}`;
      }

      const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&details=${encodeURIComponent(desc)}${datesParam}`;
      window.open(url, '_blank');
    };
  }

  document.getElementById('modal-overlay').classList.add('open');
  document.getElementById('modal-title').focus();
}

function renderChecklist(card) {
  const total = card.checklist.length, done = card.checklist.filter(x => x.done).length;
  document.getElementById('cl-summary').textContent = `${done}/${total}`;
  const pw = document.getElementById('cl-progress-wrap');
  if (total > 0) {
    pw.style.display = 'flex';
    const pct = Math.round(done / total * 100);
    document.getElementById('cl-bar-fill').style.width = pct + '%';
    document.getElementById('cl-pct').textContent = pct + '%';
  } else pw.style.display = 'none';

  const cl = document.getElementById('modal-checklist');
  cl.innerHTML = '';
  card.checklist.forEach((item, i) => {
    const row = document.createElement('div');
    row.className = 'cl-item';
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = item.done;
    cb.onchange = async () => {
      const f = findCard(get_modalCardId());
      if (!f) return;
      f.card.checklist[i].done = cb.checked;
      logAction(f.card, `Marcou "${item.text}" como ${cb.checked ? 'concluído' : 'pendente'}`);
      renderChecklist(f.card);
      renderLogs(f.card);
      await saveBoard(activeBoard().id);
    };
    const txt = document.createElement('input');
    txt.className = 'cl-item-text' + (item.done ? ' done' : '');
    txt.value = item.text;
    txt.onblur = async () => {
      const v = txt.value.trim();
      if (!v) { txt.value = item.text; return; }
      const f = findCard(get_modalCardId());
      if (!f) return;
      f.card.checklist[i].text = v;
      await saveBoard(activeBoard().id);
    };
    txt.onkeydown = e => { if (e.key === 'Enter') txt.blur(); };
    const del = document.createElement('button');
    del.className = 'cl-del';
    del.textContent = '×';
    del.onclick = async () => {
      const f = findCard(get_modalCardId());
      if (!f) return;
      const removedText = f.card.checklist[i].text;
      f.card.checklist.splice(i, 1);
      logAction(f.card, `Removeu "${removedText}" do checklist`);
      renderChecklist(f.card);
      renderLogs(f.card);
      await saveBoard(activeBoard().id);
    };
    row.append(cb, txt, del);
    cl.appendChild(row);
  });
}

export function logAction(card, actionText) {
  if (!card.logs) card.logs = [];
  card.logs.push({
    text: actionText,
    ts: Date.now(),
    userId: currentUser.uid
  });
}

function renderLogs(card) {
  const el = document.getElementById('modal-logs');
  if (!el) return;
  const logs = card.logs || [];
  el.innerHTML = '';
  if (!logs.length) {
    el.innerHTML = '<p style="font-size:11px;color:var(--text2);padding:0">Nenhum registro ainda.</p>';
    return;
  }
  logs.slice().reverse().forEach(lg => {
    const u = STATE.users[lg.userId];
    const div = document.createElement('div');
    div.style.fontSize = '11px';
    div.style.color = 'var(--text2)';
    div.style.padding = '4px 0';
    div.style.borderBottom = '1px solid var(--border)';
    div.innerHTML = `<strong style="color:var(--text);">${esc(u?.name || '?')}</strong> ${esc(lg.text)} <span style="opacity:0.6;margin-left:4px;">${fmtTs(lg.ts)}</span>`;
    el.appendChild(div);
  });
  // Remove last border
  if (el.lastChild) el.lastChild.style.borderBottom = 'none';
}

function renderComments(card) {
  const cmts = card.comments || [];
  document.getElementById('cm-count').textContent = cmts.length;
  const el = document.getElementById('modal-comments');
  el.innerHTML = '';
  if (!cmts.length) {
    el.innerHTML = '<p style="font-size:11px;color:var(--text2);padding:6px 0">Nenhum comentário ainda.</p>';
    return;
  }
  cmts.forEach((cm, i) => {
    const u = STATE.users[cm.userId];
    const div = document.createElement('div');
    div.className = 'comment';
    const avDiv = document.createElement('div');
    avDiv.className = 'cm-av';
    if (u) {
      avDiv.style.cssText = `background:${u.color}22;color:${u.color};`;
      avDiv.textContent = initials(u.name);
    } else avDiv.textContent = '?';
    div.innerHTML = `
      <div class="cm-body">
        <div class="cm-meta">
          <span class="cm-author">${esc(u?.name || '?')}</span>
          <span class="cm-time">${fmtTs(cm.ts)}</span>
          ${cm.userId === currentUser?.uid ? `<button class="cm-del" data-i="${i}">× remover</button>` : ''}
        </div>
        <div class="cm-text">${esc(cm.text).replace(/@([\w.-]+)/g, '<span style="color:var(--accent);font-weight:600;">@$1</span>')}</div>
      </div>
    `;
    div.prepend(avDiv);
    const delBtn = div.querySelector('.cm-del');
    if (delBtn) {
      delBtn.onclick = async () => {
        const f = findCard(get_modalCardId());
        if (!f) return;
        f.card.comments.splice(i, 1);
        logAction(f.card, 'Removeu um comentário');
        renderComments(f.card);
        renderLogs(f.card);
        await saveBoard(activeBoard().id);
      };
    }
    el.appendChild(div);
  });
}

function renderModalAttachments(card) {
  const container = document.getElementById('modal-attachments');
  if (!container) return;
  container.innerHTML = '';
  if (!card.attachments || card.attachments.length === 0) return;

  card.attachments.forEach(att => {
    const div = document.createElement('div');
    div.style.cssText = 'display:flex;justify-content:space-between;align-items:center;background:var(--surface2);padding:8px;border-radius:var(--r);border:1px solid var(--border);';

    const a = document.createElement('a');
    a.href = att.url;
    a.target = '_blank';
    a.textContent = att.name;
    a.style.cssText = 'color:var(--text);text-decoration:none;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:200px;';

    const btnDel = document.createElement('button');
    btnDel.textContent = '🗑';
    btnDel.style.cssText = 'background:none;border:none;color:var(--text3);cursor:pointer;';
    btnDel.onclick = () => deleteAttachment(card.id, att.id);

    div.appendChild(a);
    div.appendChild(btnDel);
    container.appendChild(div);
  });
}

async function deleteAttachment(cardId, attId) {
  if (!confirm("Tem certeza que deseja excluir este anexo?")) return;

  const f = findCard(cardId);
  if (!f) return;

  const attIdx = f.card.attachments.findIndex(a => a.id === attId);
  if (attIdx === -1) return;

  const att = f.card.attachments[attIdx];
  if (att && att.path) {
    const fileRef = ref(storage, att.path);
    deleteObject(fileRef).catch(err => console.error("Erro ao excluir arquivo do storage:", err));
  }

  f.card.attachments.splice(attIdx, 1);

  await saveBoard(activeBoard().id);
  renderModalAttachments(f.card);
}

async function saveAndCloseModal() {
  const found = findCard(get_modalCardId());
  if (!found) {
    document.getElementById('modal-overlay').classList.remove('open');
    if (get_pendingRender()) { setPendingRender(false); renderAll(); }
    return;
  }
  const card = found.card;
  const t = document.getElementById('modal-title').value.trim();
  if (t) card.title = t;
  card.desc = document.getElementById('modal-desc').value.trim();
  card.due = document.getElementById('modal-due').value;
  card.reminder = document.getElementById('modal-reminder').value;
  card.tags = Array.from(document.querySelectorAll('.tag-toggle.active')).map(el => el.dataset.tid).filter(Boolean);
  card.assignees = Array.from(document.querySelectorAll('.assignee-row input[type=checkbox]')).filter(cb => cb.checked).map(cb => cb.dataset.uid);
  const bd = activeBoard();
  if (bd) await saveBoard(bd.id);
  document.getElementById('modal-overlay').classList.remove('open');
  if (get_pendingRender()) { setPendingRender(false); renderAll(); }
}

// ─── MEMBERS PANEL ───────────────────────────────────────

function openMembersPanel(groupId = null) {
  let target = null;
  let titleName = '';

  const overlay = document.getElementById('members-overlay');

  if (groupId) {
    target = (STATE.meta.groups || []).find(x => x.id === groupId);
    if (!target) return;
    titleName = `Grupo: ${target.name}`;
    overlay.dataset.groupId = groupId;
  } else {
    const b = activeBoard();
    if (!b) return;
    target = b;
    titleName = b.name;
    if (b.groupId) {
      const g = (STATE.meta.groups || []).find(x => x.id === b.groupId);
      if (g) { target = g; titleName = `Grupo: ${g.name}`; }
    }
    delete overlay.dataset.groupId;
  }

  document.getElementById('members-panel-title').textContent = `👥 Membros — ${titleName}`;
  renderMembersPanel();
  overlay.classList.add('open');
}

function renderMembersPanel() {
  const overlay = document.getElementById('members-overlay');
  let target = null;

  if (overlay.dataset.groupId) {
    target = (STATE.meta.groups || []).find(x => x.id === overlay.dataset.groupId);
  } else {
    const b = activeBoard();
    if (!b) return;
    target = b;
    if (b.groupId) {
      const g = (STATE.meta.groups || []).find(x => x.id === b.groupId);
      if (g) target = g;
    }
  }

  if (!target) return;

  const memberIds = target.memberIds || [];
  const allUsers = Object.values(STATE.users);

  const cur = document.getElementById('current-members-list');
  cur.innerHTML = '';
  memberIds.forEach(uid2 => {
    const u = STATE.users[uid2];
    if (!u) return;
    const row = document.createElement('div');
    row.className = 'member-row';
    row.innerHTML = `
      <div class="member-av" style="background:${u.color}22;color:${u.color}">${initials(u.name)}</div>
      <div class="member-info"><div class="member-name">${esc(u.name)}</div><div class="member-role">${u.role} · ${esc(u.email || '')}</div></div>
      ${uid2 === currentUser.uid ? '<span style="font-size:10px;color:var(--text3);padding:0 6px">você</span>' : `<button class="member-remove" data-uid="${uid2}" title="Remover">×</button>`}
    `;
    const rb = row.querySelector('.member-remove');
    if (rb) rb.onclick = async () => {
      const overlay = document.getElementById('members-overlay');
      let targetGroup = null;
      let targetBoard = null;

      if (overlay.dataset.groupId) {
        const groups = STATE.meta.groups || [];
        targetGroup = groups.find(x => x.id === overlay.dataset.groupId);
      } else {
        targetBoard = activeBoard();
        if (targetBoard && targetBoard.groupId) {
          const groups = STATE.meta.groups || [];
          targetGroup = groups.find(x => x.id === targetBoard.groupId);
        }
      }

      if (targetGroup) {
        targetGroup.memberIds = (targetGroup.memberIds || []).filter(id => id !== uid2);
        await saveMeta({ groups: STATE.meta.groups });

        if (targetGroup.boardIds) {
          await Promise.all(
            targetGroup.boardIds.map(async (bId) => {
              const b = STATE.boards[bId];
              if (b && b.memberIds) {
                b.memberIds = b.memberIds.filter(id => id !== uid2);
                await saveBoard(b.id);
              }
            })
          );
        }
      } else if (targetBoard) {
        targetBoard.memberIds = (targetBoard.memberIds || []).filter(id => id !== uid2);
        await saveBoard(targetBoard.id);
      }
      renderMembersPanel();
      toast(`${u.name} removido`);
    };
    cur.appendChild(row);
  });
  if (!memberIds.length) cur.innerHTML = '<p style="font-size:12px;color:var(--text2);padding:4px 0">Nenhum membro ainda.</p>';

  const addList = document.getElementById('add-members-list');
  addList.innerHTML = '';
  const nonMembers = allUsers.filter(u => !memberIds.includes(u.id));
  if (!nonMembers.length) {
    addList.innerHTML = '<p style="font-size:12px;color:var(--text2);padding:4px 0">Todos os usuários já são membros.</p>';
    return;
  }
  nonMembers.forEach(u => {
    const row = document.createElement('div');
    row.className = 'members-add-row';
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.dataset.uid = u.id;
    const dot = document.createElement('div');
    dot.style.cssText = `width:8px;height:8px;border-radius:50%;background:${u.color};flex-shrink:0;`;
    const sp = document.createElement('span');
    sp.textContent = `${u.name} (${u.role})`;
    row.append(cb, dot, sp);
    row.onclick = () => { cb.checked = !cb.checked; };
    cb.onclick = e => e.stopPropagation();
    addList.appendChild(row);
  });
}

// ─── ADMIN ───────────────────────────────────────────────

function openAdmin() {
  renderUserList();
  ['nu-name', 'nu-email', 'nu-pass'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('admin-err').textContent = '';
  document.getElementById('admin-overlay').classList.add('open');
}

function renderUserList() {
  const ul = document.getElementById('user-list');
  ul.innerHTML = '';
  Object.values(STATE.users).forEach(u => {
    const row = document.createElement('div');
    row.className = 'user-row';
    const nextRole = u.role === 'admin' ? 'membro' : u.role === 'tutor' ? 'admin' : 'tutor';
    const roleColor = u.role === 'admin' ? 'var(--accent)' : u.role === 'tutor' ? 'var(--purple)' : 'var(--text2)';
    row.innerHTML = `
      <div class="user-av" style="background:${u.color}22;color:${u.color}">${initials(u.name)}</div>
      <div style="flex:1;min-width:0">
        <div class="user-name">${esc(u.name)}</div>
        <div class="user-meta">${esc(u.email || '')} · <span style="color:${roleColor};font-weight:600">${u.role}</span></div>
      </div>
      ${u.id !== currentUser.uid ? `<button class="tb-action" data-role-uid="${u.id}" style="font-size:10px;padding:3px 8px" title="Mudar para ${nextRole}">→ ${nextRole}</button>` : '<span style="font-size:10px;color:var(--text3);padding:0 6px">você</span>'}
      ${u.id !== currentUser.uid ? `<button class="user-del" data-uid="${u.id}" title="Remover usuário">×</button>` : ''}
    `;
    const rb = row.querySelector('[data-role-uid]');
    if (rb) rb.onclick = async () => {
      STATE.users[u.id].role = nextRole;
      renderUserList();
      await saveUser(u.id, { role: nextRole });
      toast(`${u.name} agora é ${nextRole}`, 'success');
    };
    const db2 = row.querySelector('.user-del');
    if (db2) db2.onclick = async () => {
      dialog({ title: 'Remover usuário?', msg: `"${u.name}" perderá o acesso.`, danger: true, okLabel: 'Remover' }, async ok => {
        if (!ok) return;
        await deleteDoc(doc(db, 'users', u.id));
        toast('Usuário removido');
        renderUserList();
      });
    };
    ul.appendChild(row);
  });
}

async function addUserAdmin() {
  const name = document.getElementById('nu-name').value.trim();
  const email = document.getElementById('nu-email').value.trim();
  const pass = document.getElementById('nu-pass').value;
  const role = document.getElementById('nu-role').value;
  const err = document.getElementById('admin-err');
  const btn = document.getElementById('btn-add-user');
  if (!name || !email || !pass) { err.textContent = 'Preencha todos os campos.'; return; }
  if (pass.length < 6) { err.textContent = 'A senha deve ter ao menos 6 caracteres.'; return; }
  err.textContent = '';
  btn.disabled = true;
  btn.textContent = 'Criando...';
  try {
    const secondApp = initializeApp(FB_CONFIG, 'secondary-' + Date.now());
    const secondAuth = getAuth(secondApp);
    const cred = await createUserWithEmailAndPassword(secondAuth, email, pass);
    await updateProfile(cred.user, { displayName: name });
    const colorIdx = Object.keys(STATE.users).length % AV_COLORS.length;
    await saveUser(cred.user.uid, { name, email, role, color: AV_COLORS[colorIdx] });
    await signOut(secondAuth);
    toast(`Usuário "${name}" criado!`, 'success');
    ['nu-name', 'nu-email', 'nu-pass'].forEach(id => document.getElementById(id).value = '');
    renderUserList();
  } catch (e) {
    const msgs = {
      'auth/email-already-in-use': 'Esse e-mail já está em uso.',
      'auth/invalid-email': 'E-mail inválido.',
      'auth/weak-password': 'Senha muito fraca.'
    };
    err.textContent = msgs[e.code] || 'Erro: ' + e.message;
  } finally {
    btn.disabled = false;
    btn.textContent = 'Criar usuário';
  }
}

// ─── INIT UI ─────────────────────────────────────────────

export function initUI() {
  const notifBtn = document.getElementById('btn-notif-toggle');
  const notifDropdown = document.getElementById('notif-dropdown');
  if (notifBtn && notifDropdown) {
    notifBtn.onclick = (e) => {
      e.stopPropagation();
      notifDropdown.style.display = notifDropdown.style.display === 'none' ? 'block' : 'none';
    };
    document.addEventListener('click', (e) => {
      if (!notifBtn.contains(e.target) && !notifDropdown.contains(e.target)) {
        notifDropdown.style.display = 'none';
      }
    });
  }

  document.getElementById('btn-calendar').onclick = () => {
    setLocalNav(null, 'calendar');
    renderAll();
  };

  document.getElementById('btn-rename-board').onclick = () => {
    const b = activeBoard();
    if (!b) return;
    dialog({ title: 'Renomear quadro', input: true, defaultVal: b.name, okLabel: 'Salvar' }, async name => {
      if (!name) return;
      b.name = name;
      await saveBoard(b.id);
    });
  };

  document.getElementById('btn-del-board').onclick = () => {
    const b = activeBoard();
    if (!b) return;
    dialog({ title: 'Excluir quadro?', msg: `"${b.name}" será removido permanentemente.`, danger: true, okLabel: 'Excluir' }, async ok => {
      if (!ok) return;
      const groups = STATE.meta.groups || [];
      groups.forEach(g => { g.boardIds = (g.boardIds || []).filter(id => id !== b.id); });
      await deleteDoc(doc(db, 'boards', b.id));
      setLocalNav(null, 'board');
      await saveMeta({ groups });
      renderAll();
    });
  };

  document.getElementById('topbar-search').oninput = e => {
    setSearchQ(e.target.value);
    renderBoard();
  };

  document.getElementById('sb-collapse').onclick = () => {
    const sb = document.getElementById('sidebar');
    const btn = document.getElementById('sb-collapse');
    sb.classList.toggle('collapsed');
    const isCol = sb.classList.contains('collapsed');
    btn.textContent = isCol ? '›' : '‹';
    btn.title = isCol ? 'Expandir barra lateral' : 'Recolher barra lateral';
  };

  document.getElementById('btn-new-group').onclick = () => {
    dialog({ title: 'Novo grupo', input: true, defaultVal: 'Novo Grupo', okLabel: 'Criar' }, async name => {
      if (!name) return;
      const groups = STATE.meta.groups || [];
      const color = GRP_COLORS[groups.length % GRP_COLORS.length];
      groups.push({ id: uid(), name: name.trim(), color, open: true, boardIds: [], creatorId: currentUser.uid });
      await saveMeta({ groups });
      toast('Grupo criado', 'success');
    });
  };

  document.getElementById('modal-close').onclick = saveAndCloseModal;
  document.getElementById('modal-overlay').onclick = e => { if (e.target === document.getElementById('modal-overlay')) saveAndCloseModal(); };

  document.getElementById('cl-add-btn').onclick = async () => {
    const inp = document.getElementById('cl-new-input');
    const t = inp.value.trim();
    if (!t) return;
    const f = findCard(get_modalCardId());
    if (!f) return;
    f.card.checklist.push({ id: uid(), text: t, done: false });
    logAction(f.card, `Adicionou o item "${t}" no checklist`);
    renderChecklist(f.card);
    renderLogs(f.card);
    await saveBoard(activeBoard().id);
    inp.value = '';
    inp.focus();
  };

  document.getElementById('cl-new-input').onkeydown = e => { if (e.key === 'Enter') document.getElementById('cl-add-btn').click(); };

  document.getElementById('cm-send').onclick = async () => {
    const inp = document.getElementById('cm-input');
    const t = inp.value.trim();
    if (!t) return;
    const f = findCard(get_modalCardId());
    if (!f) return;
    if (!f.card.comments) f.card.comments = [];
    f.card.comments.push({ id: uid(), userId: currentUser.uid, text: t, ts: Date.now() });
    logAction(f.card, 'Adicionou um comentário');

    // Parse mentions and create notifications
    const mentions = t.match(/@([\w.-]+)/g) || [];
    const bd = activeBoard();
    mentions.forEach(mention => {
      const username = mention.slice(1).toLowerCase(); // remove @
      // Find user by standard username format: lowercased, spaces to underscores
      const mentionedUser = Object.values(STATE.users).find(u =>
        (bd && bd.memberIds && bd.memberIds.includes(u.id)) &&
        (u.name && createUsername(u.name) === username ||
        u.email && createUsername(u.email.split('@')[0]) === username)
      );
      if (mentionedUser && mentionedUser.id !== currentUser.uid) {
        saveNotification({
          id: uid(),
          userId: mentionedUser.id,
          type: 'mention',
          text: `${STATE.users[currentUser.uid]?.name || 'Alguém'} mencionou você na tarefa "${f.card.title}"`,
          boardId: bd?.id,
          cardId: f.card.id,
          read: false,
          ts: Date.now()
        });
      }
    });

    renderComments(f.card);
    await saveBoard(activeBoard().id);
    inp.value = '';
  };

  document.getElementById('cm-input').oninput = e => {
    const val = e.target.value;
    const drop = document.getElementById('mention-dropdown');
    const match = val.match(/@([\w.-]*)$/);
    if (match) {
      const q = match[1].toLowerCase();
      const bd = activeBoard();
      const users = Object.values(STATE.users).filter(u => bd && bd.memberIds && bd.memberIds.includes(u.id)).filter(u =>
        (u.name && createUsername(u.name).includes(q)) ||
        (u.name && u.name.toLowerCase().includes(q)) ||
        (u.email && createUsername(u.email.split('@')[0]).includes(q))
      );
      if (users.length > 0) {
        drop.innerHTML = users.map(u => {
          const username = u.name ? createUsername(u.name) : createUsername(u.email.split('@')[0]);
          return `<div class="mention-item" style="padding:6px 10px;cursor:pointer;font-size:12px;display:flex;align-items:center;gap:8px;" data-username="${username}">
            <div style="width:20px;height:20px;border-radius:50%;background:${u.color}22;color:${u.color};display:flex;align-items:center;justify-content:center;font-weight:bold;">${initials(u.name)}</div>
            <div>${esc(u.name)} <span style="color:var(--text3);font-size:10px;">@${username}</span></div>
          </div>`;
        }).join('');
        drop.style.display = 'block';
        drop.querySelectorAll('.mention-item').forEach(item => {
          item.onclick = () => {
            const username = item.dataset.username;
            const newVal = val.replace(/@([\w.-]*)$/, `@${username} `);
            e.target.value = newVal;
            drop.style.display = 'none';
            e.target.focus();
          };
        });
      } else {
        drop.style.display = 'none';
      }
    } else {
      drop.style.display = 'none';
    }
  };

  document.getElementById('cm-input').onkeydown = e => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) document.getElementById('cm-send').click();
  };

  document.getElementById('modal-del-card').onclick = () => {
    dialog({ title: 'Excluir tarefa?', msg: 'Esta ação não pode ser desfeita.', danger: true, okLabel: 'Excluir' }, async ok => {
      if (!ok) return;
      const bd = activeBoard();
      if (!bd) return;
      for (const c of bd.columns) {
        const idx = c.cards.findIndex(k => k.id === get_modalCardId());
        if (idx !== -1) { c.cards.splice(idx, 1); break; }
      }
      await saveBoard(bd.id);
      document.getElementById('modal-overlay').classList.remove('open');
      if (get_pendingRender()) { setPendingRender(false); }
      renderAll();
      toast('Tarefa excluída');
    });
  };

  document.getElementById('members-close').onclick = () => document.getElementById('members-overlay').classList.remove('open');
  document.getElementById('members-overlay').onclick = e => {
    if (e.target === document.getElementById('members-overlay')) document.getElementById('members-overlay').classList.remove('open');
  };

  document.getElementById('btn-save-members').onclick = async () => {
    const overlay = document.getElementById('members-overlay');
    let targetGroup = null;
    let targetBoard = null;

    if (overlay.dataset.groupId) {
      const groups = STATE.meta.groups || [];
      targetGroup = groups.find(x => x.id === overlay.dataset.groupId);
    } else {
      targetBoard = activeBoard();
      if (targetBoard && targetBoard.groupId) {
        const groups = STATE.meta.groups || [];
        targetGroup = groups.find(x => x.id === targetBoard.groupId);
      }
    }

    if (!targetGroup && !targetBoard) return;

    const checked = Array.from(document.querySelectorAll('#add-members-list input[type=checkbox]:checked'));
    if (!checked.length) {
      document.getElementById('members-overlay').classList.remove('open');
      return;
    }
    const newIds = checked.map(cb => cb.dataset.uid);

    if (targetGroup) {
      targetGroup.memberIds = [...new Set([...(targetGroup.memberIds || []), ...newIds])];
      await saveMeta({ groups: STATE.meta.groups });

      // Update boards inside this group
      if (targetGroup.boardIds) {
        await Promise.all(
          targetGroup.boardIds.map(async (bId) => {
            const b = STATE.boards[bId];
            if (b) {
              b.memberIds = [...new Set([...(b.memberIds || []), ...newIds])];
              await saveBoard(b.id);
            }
          })
        );
      }
    } else if (targetBoard) {
      targetBoard.memberIds = [...new Set([...(targetBoard.memberIds || []), ...newIds])];
      await saveBoard(targetBoard.id);
    }
    document.getElementById('members-overlay').classList.remove('open');
    toast(`${newIds.length} membro(s) adicionado(s)`, 'success');
  };

  document.getElementById('btn-admin').onclick = openAdmin;
  document.getElementById('admin-close').onclick = () => document.getElementById('admin-overlay').classList.remove('open');
  document.getElementById('btn-add-user').onclick = addUserAdmin;
}

function createNewBoard(preselectedGroupId = null) {
  const groups = STATE.meta.groups || [];
  const step2 = async (name, gid) => {
    if (!name) return;
    const color = BOARD_COLORS[Object.keys(STATE.boards).length % BOARD_COLORS.length];
    const boardId = uid();
    const boardMemberIds = [currentUser.uid];
    if (gid && gid !== '__none') {
      const g = groups.find(x => x.id === gid);
      if (g && g.memberIds) {
        g.memberIds.forEach(mId => {
          if (!boardMemberIds.includes(mId)) {
            boardMemberIds.push(mId);
          }
        });
      }
    }
    const board = {
      id: boardId, name: name.trim(), color,
      groupId: gid || null,
      memberIds: boardMemberIds,
      columns: [
        { id: uid(), title: 'A fazer', cards: [] },
        { id: uid(), title: 'Em andamento', cards: [] },
        { id: uid(), title: 'Concluído', cards: [] },
      ]
    };
    await setDoc(doc(db, 'boards', boardId), board);
    if (gid && gid !== '__none') {
      const g = groups.find(x => x.id === gid);
      if (g) {
        g.boardIds = [...(g.boardIds || []), boardId];
        await saveMeta({ groups });
      }
    }
    setLocalNav(boardId, 'board');
    renderAll();
    toast('Quadro criado', 'success');
  };

  if (preselectedGroupId) {
    dialog({ title: 'Nome do quadro', input: true, defaultVal: 'Novo Quadro', okLabel: 'Criar' }, name => step2(name, preselectedGroupId));
    return;
  }

  const isAdm = isAdmin();
  const myBoards = Object.values(STATE.boards).filter(b => isAdm || (b.memberIds && b.memberIds.includes(currentUser.uid)));
  const myBoardIds = new Set(myBoards.map(b => b.id));

  const allowedGroups = groups.filter(g => {
    if (isAdm) return true;
    if (g.creatorId === currentUser.uid) return true;
    if (g.memberIds && g.memberIds.includes(currentUser.uid)) return true;
    const gBoards = (g.boardIds || []).filter(id => myBoardIds.has(id));
    return gBoards.length > 0;
  });

  if (!allowedGroups.length) {
    dialog({ title: 'Novo quadro', input: true, defaultVal: 'Novo Quadro', okLabel: 'Criar' }, name => step2(name, null));
    return;
  }
  const opts = [{ value: '__none', label: 'Sem grupo' }, ...allowedGroups.map(g => ({ value: g.id, label: g.name }))];
  dialog({ title: 'Novo quadro — escolha o grupo', select: true, options: opts, okLabel: 'Próximo' }, gid => {
    dialog({ title: 'Nome do quadro', input: true, defaultVal: 'Novo Quadro', okLabel: 'Criar' }, name => step2(name, gid));
  });
}