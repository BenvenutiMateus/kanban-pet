// ════════════════════════════════════════════════════════
// DIALOG
// ════════════════════════════════════════════════════════

import { esc } from './utils.js';

let _dlgCb = null;

export function dialog({ title, msg, input, inputType='text', select, options, defaultVal='', okLabel='OK', danger=false }, cb) {
  _dlgCb = cb;
  document.getElementById('dlg-title').textContent = title;
  const p   = document.getElementById('dlg-msg');
  const inp = document.getElementById('dlg-inp');
  const sel = document.getElementById('dlg-sel');
  p.style.display   = msg    ? '' : 'none';
  if (msg) p.textContent = msg;
  inp.style.display = input  ? '' : 'none';
  if (input) {
    inp.type = inputType;
    inp.value = defaultVal;
    setTimeout(()=>{ inp.focus(); inp.select(); }, 80);
  }
  sel.style.display = select ? '' : 'none';
  if (select && options) sel.innerHTML = options.map(o=>`<option value="${esc(o.value)}">${esc(o.label)}</option>`).join('');
  const ok = document.getElementById('dlg-ok');
  ok.textContent = okLabel;
  ok.className = 'dlg-ok' + (danger ? ' is-danger' : '');
  document.getElementById('dialog-overlay').classList.add('open');
}

export function initDialog() {
  document.getElementById('dlg-ok').onclick = () => {
    document.getElementById('dialog-overlay').classList.remove('open');
    if (!_dlgCb) return;
    const inp = document.getElementById('dlg-inp');
    const sel = document.getElementById('dlg-sel');
    if (inp.style.display !== 'none')  _dlgCb(inp.value.trim());
    else if (sel.style.display !== 'none') _dlgCb(sel.value);
    else _dlgCb(true);
  };

  document.getElementById('dlg-cancel').onclick = () => {
    document.getElementById('dialog-overlay').classList.remove('open');
  };

  document.getElementById('dlg-inp').onkeydown = e => {
    if (e.key === 'Enter')  document.getElementById('dlg-ok').click();
    if (e.key === 'Escape') document.getElementById('dlg-cancel').click();
  };
}
