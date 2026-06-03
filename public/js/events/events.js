// ════════════════════════════════════════════════════════
// EVENTS.JS — Entry point do módulo de eventos
// Importe este arquivo no seu main.js / ui.js
// ════════════════════════════════════════════════════════
import { startEventsListener, stopEventsListener } from './events.firestore.js';
import { setEvents, onEventsChange }               from './events.state.js';
import { initEventModal }                          from './events.modal.js';
import { initCalendar, refreshCalendar, showCalendar } from './events.calendar.js';
import { initSidebarEventsBadge, showEventsPanel, hideEventsPanel } from './events.panel.js';

let _started = false;

/**
 * Chame uma vez após login bem-sucedido.
 * Integra listeners, modal e badge da sidebar.
 */
export function startEvents() {
  if (_started) return;
  _started = true;

  // 1. Iniciar listener Firestore → atualiza estado reativo
  startEventsListener(events => setEvents(events));

  // 2. Quando estado mudar, atualizar calendário se visível
  onEventsChange(() => refreshCalendar());

  // 3. Iniciar modal (injeta HTML + listeners)
  initEventModal();

  // 4. Badge sidebar
  initSidebarEventsBadge();
}

export function stopEvents() {
  stopEventsListener();
  _started = false;
}

// Re-exports convenientes para ui.js
export { showCalendar, showEventsPanel, hideEventsPanel };


/* ══════════════════════════════════════════════════════
   GUIA DE INTEGRAÇÃO — leia antes de integrar
   ══════════════════════════════════════════════════════

   1. FIREBASE FIRESTORE — regras necessárias:
   ─────────────────────────────────────────────
   Adicione ao seu firestore.rules:

     match /events/{eventId} {
       allow read: if request.auth != null;
       allow create: if request.auth != null;   // qualquer membro cria
       allow update, delete: if request.auth != null &&
         (resource.data.createdBy == request.auth.uid ||
          get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['admin','tutor']);

       match /occurrences/{occId} {
         allow read, write: if request.auth != null;
       }
       match /attendance/{attId} {
         allow read, write: if request.auth != null;
       }
     }

   ─────────────────────────────────────────────
   2. FIRESTORE INDEXES — crie no Console Firebase:
   ─────────────────────────────────────────────
   Coleção: events
   Campos: startDate ASC, __name__ ASC

   ─────────────────────────────────────────────
   3. MAIN.JS — adicione após login:
   ─────────────────────────────────────────────

   import { startEvents, stopEvents } from './events/events.js';

   onAuthStateChanged(auth, async user => {
     if (user) {
       // ... seu código atual ...
       startEvents();   // ← adicionar aqui
     } else {
       stopEvents();    // ← adicionar aqui
       showLogin();
     }
   });

   ─────────────────────────────────────────────
   4. UI.JS — conectar botões da sidebar:
   ─────────────────────────────────────────────

   import { showCalendar, showEventsPanel, hideEventsPanel } from './events/events.js';

   // Botão "Meu Calendário" já existente no HTML:
   document.getElementById('btn-calendar').onclick = () => {
     hideEventsPanel();
     showCalendar();
   };

   // Botão "Lista de eventos" (adicionar no HTML sidebar se quiser):
   // document.getElementById('btn-events-panel').onclick = () => {
   //   showEventsPanel();
   // };

   ─────────────────────────────────────────────
   5. HTML — adicione no sidebar (sidebar section):
   ─────────────────────────────────────────────

   <!-- Já existe: btn-calendar. Adicione o badge dentro dele: -->
   <button class="sb-btn" id="btn-calendar" ...>
     <span class="sb-btn-icon">📅</span>
     <span class="sb-label">Calendário</span>
     <span id="sb-events-badge"></span>   ← ADICIONAR
   </button>

   <!-- Opcional — botão de lista de eventos: -->
   <button class="sb-btn" id="btn-events-panel">
     <span class="sb-btn-icon">📋</span>
     <span class="sb-label">Lista de eventos</span>
   </button>

   ─────────────────────────────────────────────
   6. CSS — importar no seu HTML ou no tokens.css:
   ─────────────────────────────────────────────

   <link rel="stylesheet" href="css/events.css">
   (copiar events.css para sua pasta css/)

   ─────────────────────────────────────────────
   7. STATE.JS — o módulo espera que você exporte:
   ─────────────────────────────────────────────

   export function getState() {
     return { users: _users, boards: _boards, ... };
   }

   Se já não tiver, adicione essa função ao seu state.js.

   ══════════════════════════════════════════════════════ */
