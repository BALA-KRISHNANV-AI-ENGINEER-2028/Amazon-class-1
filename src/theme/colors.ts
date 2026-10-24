/**
 * Amazon Fire TV / Prime Video Design System Palette & 10-Foot Tokens
 * Built for ClassStream AI on Fire TV & Vega OS.
 */

export const AmazonDarkPalette = {
  // Core Mandatory Palette
  background: '#0B0E14',
  card: '#1A222D',
  primaryAccent: '#FF9900',
  text: '#FFFFFF',

  // Structural Surfaces (30% Surface Budget - <= 12% brightness delta)
  surfaceElevated: '#232D3B',
  surfaceHeader: 'rgba(11, 14, 20, 0.90)',
  surfaceOverlay: 'rgba(11, 14, 20, 0.86)',
  surfaceSubtle: '#121822',

  // Borders & Focus Rings
  borderSubtle: 'rgba(255, 255, 255, 0.09)',
  borderMuted: 'rgba(255, 255, 255, 0.16)',
  focusBorder: '#FF9900',
  focusGlow: 'rgba(255, 153, 0, 0.34)',
  focusTint: 'rgba(255, 153, 0, 0.12)',

  // High-Contrast 10-Foot Typography Hierarchy (WCAG AA/AAA on #0B0E14 & #1A222D)
  textPrimary: '#FFFFFF',
  textSecondary: '#C8D1DC',
  textMuted: '#8B97A8',
  textInverse: '#0B0E14',

  // Prime Video Brand & Semantic Accents (Paired with explicit text/icon labels)
  primeCyan: '#00A8E1',
  statusCompleted: '#22C55E',
  statusWarning: '#F59E0B',
  statusAlert: '#EF4444',

  // Scrim Stops for 16:9 Media Readability
  scrimSolid: '#0B0E14',
  scrimHeavy: 'rgba(11, 14, 20, 0.92)',
  scrimMedium: 'rgba(11, 14, 20, 0.56)',
  scrimTransparent: 'rgba(11, 14, 20, 0.0)',
} as const;

export const TVTypography = {
  fontDisplay: "'Outfit', system-ui, -apple-system, sans-serif",
  fontBody: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
  fontMono: "'JetBrains Mono', monospace",

  // 10-Foot Viewing Distance Scale (px)
  heroTitle: 46,
  sectionTitle: 24,
  cardTitle: 19,
  bodyLarge: 18,
  bodyRegular: 16,
  metadata: 14,
} as const;

export const TVFocusConfig = {
  scaleFocused: 1.05,
  scaleBlurred: 1.0,
  borderWidthFocused: 3,
  cardRadius: 12,
  innerRadius: 9,
  springFriction: 8,
  springTension: 110,
  durationFastMs: 160,
} as const;

export type AmazonThemeColors = typeof AmazonDarkPalette;

export const colors = AmazonDarkPalette;
export default AmazonDarkPalette;
