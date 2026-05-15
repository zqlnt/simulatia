import { agents as agentDefs } from '../data/agents.js';

export function initSidebar(store) {
  document.querySelectorAll('.agent-card').forEach((card) => {
    card.setAttribute('role', 'button');
    card.tabIndex = 0;
    card.addEventListener('click', () => {
      const title = card.querySelector('b')?.textContent?.trim() || '';
      const def =
        agentDefs.find((a) => title.includes(a.name) || title.includes(a.role.split(' ')[0])) ||
        null;
      if (def && window.__simulatia?.openAgent) {
        window.__simulatia.openAgent({
          key: def.key,
          name: def.name,
          role: def.role,
          roomOnly: true,
        });
      }
    });
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        card.click();
      }
    });
  });

  document.querySelectorAll('[data-focus]').forEach((el) => {
    el.addEventListener('click', () => {
      const key = el.getAttribute('data-focus');
      window.__simulatia?.focusTo?.(key);
    });
  });

  const search = document.getElementById('search-field');
  if (search) {
    search.addEventListener('input', () => {
      const q = search.value.trim().toLowerCase();
      document.querySelectorAll('[data-focus]').forEach((el) => {
        const match = !q || el.textContent.toLowerCase().includes(q);
        el.style.display = match ? '' : 'none';
      });
    });
  }

  store?.subscribe(() => {
    const { currentLayer } = store.getState();
    document.querySelectorAll('[data-focus]').forEach((el) => {
      /* nav highlight synced from scene focusTo */
    });
  });
}
