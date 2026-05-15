export function initPanels() {
  const buttons = [...document.querySelectorAll('.segmented button')];
  buttons.forEach((btn) => {
    btn.setAttribute('aria-pressed', btn.classList.contains('active') ? 'true' : 'false');
    btn.addEventListener('click', () => {
      buttons.forEach((b) => b.setAttribute('aria-pressed', 'false'));
      btn.setAttribute('aria-pressed', 'true');
      window.__simulatia?.setViewMode?.(btn.getAttribute('data-view'));
    });
  });
}
