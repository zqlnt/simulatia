export function initTheme() {
  const doc = document.documentElement;
  const themeBtn = document.getElementById('theme-toggle');
  const themeIcon = document.getElementById('theme-icon');
  const saved = localStorage.getItem('simulatia-theme');
  if (saved) doc.setAttribute('data-theme', saved);

  if (!themeBtn) return;

  themeBtn.onclick = () => {
    const dark = doc.getAttribute('data-theme') !== 'dark';
    doc.setAttribute('data-theme', dark ? 'dark' : 'light');
    localStorage.setItem('simulatia-theme', dark ? 'dark' : 'light');
    if (themeIcon) themeIcon.className = `ti ${dark ? 'ti-sun' : 'ti-moon'}`;
    window.dispatchEvent(new CustomEvent('simulatia:theme', { detail: { dark } }));
  };

  const dark = doc.getAttribute('data-theme') === 'dark';
  if (themeIcon) themeIcon.className = `ti ${dark ? 'ti-sun' : 'ti-moon'}`;
}
