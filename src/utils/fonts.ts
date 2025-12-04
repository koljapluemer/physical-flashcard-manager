export interface GoogleFont {
  name: string;
  displayName: string;
  isSystem: boolean;
}

export const GOOGLE_FONTS: GoogleFont[] = [
  { name: 'Arial', displayName: 'Arial', isSystem: true },
  { name: 'Helvetica', displayName: 'Helvetica', isSystem: true },
  { name: 'Georgia', displayName: 'Georgia (Serif)', isSystem: true },
  { name: 'Times New Roman', displayName: 'Times New Roman (Serif)', isSystem: true },
  { name: 'Courier New', displayName: 'Courier New (Monospace)', isSystem: true },
  { name: 'Roboto', displayName: 'Roboto', isSystem: false },
  { name: 'Open Sans', displayName: 'Open Sans', isSystem: false },
  { name: 'Lato', displayName: 'Lato', isSystem: false },
  { name: 'Montserrat', displayName: 'Montserrat', isSystem: false },
  { name: 'Merriweather', displayName: 'Merriweather (Serif)', isSystem: false },
  { name: 'Playfair Display', displayName: 'Playfair Display (Serif)', isSystem: false },
  { name: 'Source Sans Pro', displayName: 'Source Sans Pro', isSystem: false },
  { name: 'Raleway', displayName: 'Raleway', isSystem: false },
  { name: 'Noto Sans', displayName: 'Noto Sans', isSystem: false },
  { name: 'PT Sans', displayName: 'PT Sans', isSystem: false },
];

const loadedFonts = new Set<string>();

export function loadGoogleFont(fontFamily: string): void {
  if (!fontFamily) {
    return;
  }

  const font = GOOGLE_FONTS.find((f) => f.name === fontFamily);

  if (!font || font.isSystem) {
    return;
  }

  if (loadedFonts.has(fontFamily)) {
    return;
  }

  const fontName = fontFamily.replace(/\s+/g, '+');
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${fontName}:wght@400;600;700&display=swap`;
  document.head.appendChild(link);

  loadedFonts.add(fontFamily);
}

export function getFontCSSValue(fontName: string): string {
  if (!fontName) {
    return 'Arial, sans-serif';
  }

  const font = GOOGLE_FONTS.find((f) => f.name === fontName);

  if (fontName === 'Arial') {
    return 'Arial, Helvetica, sans-serif';
  }

  if (fontName === 'Helvetica') {
    return 'Helvetica, Arial, sans-serif';
  }

  if (fontName === 'Times New Roman') {
    return '"Times New Roman", Times, serif';
  }

  if (fontName === 'Georgia') {
    return 'Georgia, serif';
  }

  if (fontName === 'Courier New') {
    return '"Courier New", Courier, monospace';
  }

  if (font && !font.isSystem) {
    return `"${fontName}", sans-serif`;
  }

  return `"${fontName}", Arial, sans-serif`;
}

export function isSystemFont(fontName: string): boolean {
  const font = GOOGLE_FONTS.find((f) => f.name === fontName);
  return font ? font.isSystem : false;
}
