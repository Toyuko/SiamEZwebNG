/**
 * Inline script logic for initial theme (runs before React to avoid FOUC).
 * This string is injected into the root layout.
 */
export const THEME_SCRIPT = `
(function() {
  var key = 'siam-theme';
  var stored = 'auto';
  try { stored = localStorage.getItem(key) || 'auto'; } catch (e) {}
  if (stored !== 'light' && stored !== 'dark' && stored !== 'night' && stored !== 'auto') stored = 'auto';
  var resolved = stored;
  if (stored === 'auto') {
    resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  var html = document.documentElement;
  html.setAttribute('data-theme', resolved);
  if (resolved === 'dark' || resolved === 'night') html.classList.add('dark');
  else html.classList.remove('dark');
})();
`.replace(/\n/g, " ");
