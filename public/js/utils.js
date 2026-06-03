// ════════════════════════════════════════════════════════
// UTILIDADES
// ════════════════════════════════════════════════════════

export const uid = () => '_' + Math.random().toString(36).substr(2,9);
export const esc = s => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
export const initials = n => n.trim().split(/\s+/).map(w=>w[0]).join('').toUpperCase().substr(0,2);

export function fmtDate(d) {
  if (!d) return '';
  const [y,m,day] = d.split('-');
  return `${day}/${m}/${y}`;
}

export function fmtTs(ts) {
  return new Date(ts).toLocaleDateString('pt-BR',{ day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' });
}

export function today() {
  return new Date().toISOString().split('T')[0];
}

export function toast(msg, type = 'info') {
  const c = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = 'toast';
  el.style.borderLeft = `3px solid ${type==='error'?'var(--red)':type==='success'?'var(--green)':'var(--accent)'}`;
  el.textContent = (type==='error'?'✕ ':type==='success'?'✓ ':'') + msg;
  c.appendChild(el);
  setTimeout(()=>{ el.classList.add('out'); setTimeout(()=>el.remove(), 300); }, 3000);
}
