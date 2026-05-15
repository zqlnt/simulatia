/**
 * Glass panels — dedicated chrome strip + edge rails when collapsed.
 */

const STORAGE_KEY = 'simulatia.panelState';

const PANELS = [
  { id: 'topbar', selector: '.topbar', label: 'Command bar', edge: 'top' },
  { id: 'sidebar', selector: '.sidebar', label: 'Places', edge: 'left' },
  { id: 'inspector', selector: '.inspector', label: 'Inspector', edge: 'right' },
  { id: 'command', selector: '.command-center', label: 'Command deck', edge: 'bottom' },
];

const INSPECTOR_TAB_ICONS = ['ti-list-details', 'ti-chart-line', 'ti-robot', 'ti-activity'];
const MINI_NAV_LIMIT = 4;
const MINI_DOCK_LIMIT = 4;
const PANEL_TRANSITION_MS = 580;

const reducedMotion =
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

function loadState() {
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveState(state) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

/** Sync collapse before async boot — avoids full panels flashing on mobile. */
export function collapsePanelsAtLaunch() {
  if (typeof document === 'undefined') return;
  document.body.classList.add(
    'panel-top-collapsed',
    'panel-bottom-collapsed',
    'panel-left-collapsed',
    'panel-right-collapsed'
  );
  PANELS.forEach((p) => {
    const el = document.querySelector(p.selector);
    if (!el) return;
    el.classList.add('panel--collapsed');
    el.setAttribute('aria-expanded', 'false');
  });
}

function chromeIcons(panel) {
  if (panel.edge === 'left') {
    return { collapse: 'ti-chevron-left', expand: 'ti-chevron-right' };
  }
  if (panel.edge === 'right') {
    return { collapse: 'ti-chevron-right', expand: 'ti-chevron-left' };
  }
  if (panel.edge === 'bottom') {
    return { collapse: 'ti-chevron-down', expand: 'ti-chevron-up' };
  }
  return { collapse: 'ti-chevron-up', expand: 'ti-chevron-down' };
}

function injectChrome(el, panel) {
  el?.querySelector('.panel-traffic')?.remove();
  if (!el || el.querySelector('.panel-chrome')) return;

  const icons = chromeIcons(panel);
  const chrome = document.createElement('div');
  chrome.className = 'panel-chrome';
  chrome.classList.add(`panel-chrome--${panel.edge}`);
  chrome.setAttribute('aria-label', `${panel.label} controls`);

  chrome.innerHTML = `
    <button type="button" class="panel-chrome-btn panel-chrome-btn--collapse" data-panel-action="collapse" data-panel-id="${panel.id}" aria-label="Minimize ${panel.label}" title="Minimize">
      <i class="ti ${icons.collapse}"></i>
    </button>
    <button type="button" class="panel-chrome-btn panel-chrome-btn--expand" data-panel-action="expand" data-panel-id="${panel.id}" aria-label="Expand ${panel.label}" title="Expand">
      <i class="ti ${icons.expand}"></i>
    </button>
  `;
  el.prepend(chrome);
}

function mirrorClick(bar, source, className = 'panel-mini-btn') {
  if (!source) return;
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = className;
  btn.setAttribute('aria-label', source.getAttribute('aria-label') || source.title || '');
  btn.innerHTML = source.innerHTML;
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    source.click();
  });
  bar.appendChild(btn);
}

function buildMiniBar(el, panel) {
  if (el.querySelector('.panel-mini-bar')) return;

  const bar = document.createElement('div');
  bar.className = 'panel-mini-bar';
  bar.hidden = true;

  if (panel.id === 'topbar') {
    bar.classList.add('panel-mini-bar--row', 'panel-mini-bar--logo-only');
    const brand = el.querySelector('.logo-mark');
    if (brand) {
      const mark = document.createElement('button');
      mark.type = 'button';
      mark.className = 'panel-mini-brand panel-mini-brand--expand';
      mark.setAttribute('aria-label', 'Expand command bar');
      mark.title = 'Expand command bar';
      mark.appendChild(brand.cloneNode(true));
      mark.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (el.classList.contains('panel--collapsed')) {
          el.querySelector('[data-panel-action="expand"]')?.click();
        }
      });
      bar.appendChild(mark);
    }
  } else if (panel.id === 'sidebar') {
    bar.classList.add('panel-mini-bar--col', 'panel-mini-bar--side-rail');
    const sideIcons = chromeIcons(panel);
    const expandChip = document.createElement('button');
    expandChip.type = 'button';
    expandChip.className = 'panel-mini-btn panel-mini-btn--expand-chip';
    expandChip.setAttribute('aria-label', `Expand ${panel.label}`);
    expandChip.title = `Expand ${panel.label}`;
    expandChip.innerHTML = `<i class="ti ${sideIcons.expand}"></i>`;
    expandChip.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (el.classList.contains('panel--collapsed')) {
        el.querySelector('[data-panel-action="expand"]')?.click();
      }
    });
    bar.appendChild(expandChip);

    [...el.querySelectorAll('.tree .nav-row')].slice(0, 2).forEach((row) => {
      const focus = row.getAttribute('data-focus');
      if (!focus) return;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'panel-mini-btn';
      btn.setAttribute('data-focus', focus);
      const icon = row.querySelector('.icon-lens i');
      btn.innerHTML = icon ? `<i class="${icon.className}"></i>` : '<i class="ti ti-circle"></i>';
      if (row.classList.contains('warn')) btn.classList.add('warn');
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        if (el.classList.contains('panel--collapsed')) {
          el.querySelector('[data-panel-action="expand"]')?.click();
        }
        row.click();
      });
      bar.appendChild(btn);
    });
  } else if (panel.id === 'inspector') {
    bar.classList.add('panel-mini-bar--col', 'panel-mini-bar--side-rail');
    const sideIcons = chromeIcons(panel);
    const expandChip = document.createElement('button');
    expandChip.type = 'button';
    expandChip.className = 'panel-mini-btn panel-mini-btn--expand-chip';
    expandChip.setAttribute('aria-label', `Expand ${panel.label}`);
    expandChip.title = `Expand ${panel.label}`;
    expandChip.innerHTML = `<i class="ti ${sideIcons.expand}"></i>`;
    expandChip.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (el.classList.contains('panel--collapsed')) {
        el.querySelector('[data-panel-action="expand"]')?.click();
      }
    });
    bar.appendChild(expandChip);

    [...el.querySelectorAll('.tabs button')].slice(0, 2).forEach((tab, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'panel-mini-btn';
      btn.innerHTML = `<i class="ti ${INSPECTOR_TAB_ICONS[i] || 'ti-point'}"></i>`;
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        if (el.classList.contains('panel--collapsed')) {
          el.querySelector('[data-panel-action="expand"]')?.click();
        }
        tab.click();
      });
      bar.appendChild(btn);
    });
  } else if (panel.id === 'command') {
    bar.classList.add(
      'panel-mini-bar--row',
      'panel-mini-bar--command',
      'panel-mini-bar--prompt-capsule'
    );

    const expandDeck = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (el.classList.contains('panel--collapsed')) {
        el.querySelector('[data-panel-action="expand"]')?.click();
      }
    };

    const promptChip = document.createElement('button');
    promptChip.type = 'button';
    promptChip.className = 'panel-mini-btn panel-mini-btn--prompt panel-mini-btn--prompt-only';
    promptChip.setAttribute('aria-label', 'Expand command deck');
    promptChip.title = 'Ask, instruct, or run anything…';
    promptChip.innerHTML = '<i class="ti ti-sparkles" aria-hidden="true"></i>';
    promptChip.addEventListener('click', expandDeck);
    bar.appendChild(promptChip);
  }

  el.appendChild(bar);
}

export function initChrome() {
  document.querySelectorAll('.panel-dock, .panel-toggle').forEach((d) => d.remove());

  document.body.classList.add(
    'panel-top-collapsed',
    'panel-bottom-collapsed',
    'panel-left-collapsed',
    'panel-right-collapsed'
  );

  const state = loadState();
  const all = [...PANELS];

  function syncShellInsets() {
    const body = document.body;
    body.classList.toggle('panel-top-collapsed', !!state.topbar);
    body.classList.toggle('panel-bottom-collapsed', !!state.command);
    body.classList.toggle('panel-left-collapsed', !!state.sidebar);
    body.classList.toggle('panel-right-collapsed', !!state.inspector);
  }

  function syncChrome(el, collapsed) {
    el?.classList.toggle('panel--collapsed', collapsed);
    el?.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
    const chrome = el?.querySelector('.panel-chrome');
    chrome?.classList.toggle('is-collapsed', collapsed);
  }

  let liquidTransitionCount = 0;

  function beginLiquidTransition(el, collapsed) {
    if (reducedMotion) return;
    liquidTransitionCount += 1;
    document.body.classList.add('panel-liquid-transition');
    document.body.dataset.liquidPhase = collapsed ? 'collapse' : 'expand';
    el.classList.add(collapsed ? 'panel--liquid-collapse' : 'panel--liquid-expand');
    el.classList.add('panel--transitioning');
  }

  function endLiquidTransition(el) {
    el.classList.remove(
      'panel--transitioning',
      'panel--liquid-collapse',
      'panel--liquid-expand'
    );
    liquidTransitionCount = Math.max(0, liquidTransitionCount - 1);
    if (liquidTransitionCount === 0) {
      document.body.classList.remove('panel-liquid-transition');
      delete document.body.dataset.liquidPhase;
    }
  }

  function setCollapsed(id, collapsed) {
    state[id] = collapsed;
    saveState(state);
    const entry = all.find((p) => p.id === id);
    if (!entry) return;
    const el = document.querySelector(entry.selector);
    if (!el) return;

    if (reducedMotion) {
      syncChrome(el, collapsed);
      const mini = el.querySelector('.panel-mini-bar');
      if (mini) mini.hidden = !collapsed;
      syncShellInsets();
      return;
    }

    beginLiquidTransition(el, collapsed);
    syncChrome(el, collapsed);

    const mini = el.querySelector('.panel-mini-bar');
    if (mini) mini.hidden = !collapsed;

    syncShellInsets();

    window.setTimeout(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => endLiquidTransition(el));
      });
    }, PANEL_TRANSITION_MS);
  }

  function toggle(id) {
    setCollapsed(id, !state[id]);
  }

  // Each page load: all panels start minimized so the scene is unobstructed.
  PANELS.forEach((p) => {
    state[p.id] = true;
  });
  saveState(state);

  PANELS.forEach((p) => {
    const el = document.querySelector(p.selector);
    if (!el) return;
    el.classList.add('panel-surface');
    el.dataset.panel = p.id;
    el.setAttribute('role', 'region');
    el.setAttribute('aria-label', p.label);
    injectChrome(el, p);
    buildMiniBar(el, p);
  });

  all.forEach((p) => {
    const el = document.querySelector(p.selector);
    if (!el) return;
    syncChrome(el, true);
    const mini = el.querySelector('.panel-mini-bar');
    if (mini) mini.hidden = false;
  });
  syncShellInsets();

  document.addEventListener('click', (e) => {
    const collapse = e.target.closest('[data-panel-action="collapse"]');
    if (collapse) {
      setCollapsed(collapse.getAttribute('data-panel-id'), true);
      return;
    }
    const expand = e.target.closest('[data-panel-action="expand"]');
    if (expand) {
      setCollapsed(expand.getAttribute('data-panel-id'), false);
    }
  });

  return { setCollapsed, toggle };
}
