/* ════════════════════════════════════════════════════════
   THEME MANAGER
   Gerencia tema escuro/claro com persistência localStorage
════════════════════════════════════════════════════════ */

const THEME_KEY = 'pet-theme';
const DARK_THEME = 'dark';
const LIGHT_THEME = 'light';

/**
 * Detecta preferência do sistema (light/dark)
 */
function getSystemTheme() {
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return DARK_THEME;
  }
  return LIGHT_THEME;
}

/**
 * Obtém tema salvo ou usa preferência do sistema
 */
export function getSavedTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === DARK_THEME || saved === LIGHT_THEME) {
    return saved;
  }
  return getSystemTheme();
}

/**
 * Aplica tema ao documento
 */
export function applyTheme(theme) {
  if (theme === LIGHT_THEME) {
    document.documentElement.setAttribute('data-theme', 'light');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
  localStorage.setItem(THEME_KEY, theme);
}

/**
 * Toggle entre temas
 */
export function toggleTheme() {
  const current = getSavedTheme();
  const next = current === DARK_THEME ? LIGHT_THEME : DARK_THEME;
  applyTheme(next);
  return next;
}

/**
 * Inicializa tema ao carregar página
 */
export function initTheme() {
  const theme = getSavedTheme();
  applyTheme(theme);
  
  // Escuta mudanças de preferência do sistema
  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (!localStorage.getItem(THEME_KEY)) {
        applyTheme(e.matches ? DARK_THEME : LIGHT_THEME);
      }
    });
  }
}

/**
 * Obtém tema atual
 */
export function getCurrentTheme() {
  return getSavedTheme();
}
