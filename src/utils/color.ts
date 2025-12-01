export const DEFAULT_HEADER_COLOR = '#100e75';

export function normalizeHexColor(color?: string, fallback = DEFAULT_HEADER_COLOR): string {
  if (!color) {
    return fallback;
  }

  let normalized = color.trim();

  if (!normalized.startsWith('#')) {
    normalized = `#${normalized}`;
  }

  const shortHexMatch = normalized.match(/^#([0-9a-fA-F]{3})$/);
  if (shortHexMatch) {
    const [r, g, b] = shortHexMatch[1].split('');
    normalized = `#${r}${r}${g}${g}${b}${b}`;
  }

  const isValid = /^#([0-9a-fA-F]{6})$/.test(normalized);
  return isValid ? normalized : fallback;
}

export function hexToRgba(color: string | undefined, alpha: number): string {
  const normalized = normalizeHexColor(color);
  const safeAlpha = Math.min(1, Math.max(0, alpha));

  const r = parseInt(normalized.slice(1, 3), 16);
  const g = parseInt(normalized.slice(3, 5), 16);
  const b = parseInt(normalized.slice(5, 7), 16);

  return `rgba(${r}, ${g}, ${b}, ${safeAlpha})`;
}
