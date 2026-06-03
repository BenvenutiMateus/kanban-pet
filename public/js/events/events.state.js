// ════════════════════════════════════════════════════════
// EVENTS.STATE.JS
// Estado reativo dos eventos (sem framework)
// ════════════════════════════════════════════════════════

let _events = [];
const _listeners = new Set();

export function getEvents() { return _events; }

export function setEvents(events) {
  _events = events;
  _listeners.forEach(fn => fn(_events));
}

/** Inscreve um callback chamado toda vez que os eventos mudam. */
export function onEventsChange(fn) {
  _listeners.add(fn);
  fn(_events); // dispara imediatamente com o estado atual
  return () => _listeners.delete(fn); // retorna função de limpeza
}

/** Retorna eventos visíveis para um usuário (convidado ou todos). */
export function getVisibleEvents(userId) {
  return _events.filter(ev =>
    !ev.invitedUserIds?.length || ev.invitedUserIds.includes(userId)
  );
}

/** Retorna eventos em um determinado mês. */
export function getEventsByMonth(year, month, userId) {
  return getVisibleEvents(userId).filter(ev => {
    const d = new Date(ev.startDate);
    return d.getFullYear() === year && d.getMonth() === month;
  });
}

/** Retorna eventos próximos (próximos N dias) para sidebar. */
export function getUpcomingEvents(userId, days = 7) {
  const now   = new Date();
  const limit = new Date(now.getTime() + days * 86_400_000);
  return getVisibleEvents(userId)
    .filter(ev => {
      const d = new Date(ev.startDate);
      return d >= now && d <= limit;
    })
    .sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
}
