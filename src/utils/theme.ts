export type Theme = 'dark' | 'light';

export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  root.setAttribute('data-theme', theme);
  root.style.colorScheme = theme;
}

export function getSavedTheme(): Theme | null {
  return localStorage.getItem('shikimore_theme') as Theme | null;
}

export function saveTheme(theme: Theme): void {
  localStorage.setItem('shikimore_theme', theme);
}
