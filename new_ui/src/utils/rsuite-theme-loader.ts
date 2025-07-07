// Utility for dynamically loading RSuite theme CSS files

export type RSuiteTheme = 'light' | 'dark' | 'ocean';

const RSUITE_THEME_LINK_ID = 'rsuite-theme-styles';

/**
 * Loads the appropriate RSuite theme CSS file dynamically
 */
export function loadRSuiteTheme(theme: RSuiteTheme): void {
  // Remove existing RSuite theme link if it exists
  const existingLink = document.getElementById(RSUITE_THEME_LINK_ID);
  if (existingLink) {
    existingLink.remove();
  }

  // Create new link element for the theme CSS
  const link = document.createElement('link');
  link.id = RSUITE_THEME_LINK_ID;
  link.rel = 'stylesheet';
  link.href = `/themes/${theme}.css`;
  
  // Add to document head
  document.head.appendChild(link);
  
  console.log(`RSuite theme loaded: ${theme}`);
}

/**
 * Preloads all RSuite theme CSS files for faster switching
 */
export function preloadRSuiteThemes(): void {
  const themes: RSuiteTheme[] = ['light', 'dark', 'ocean'];
  
  themes.forEach(theme => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'style';
    link.href = `/themes/${theme}.css`;
    document.head.appendChild(link);
  });
  
  console.log('RSuite themes preloaded');
}
