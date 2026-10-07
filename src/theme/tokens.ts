import { Platform, TextStyle, ViewStyle } from 'react-native';

/**
 * Design tokens — the dnata design system (Courier DS) values with the Vault App overrides
 * from `Vault App copy.dc.html` (blue primary ramp, --app-* tokens, type scale).
 */
export const C = {
  primary25: '#F4F8FF', primary50: '#EAF1FF', primary100: '#D5E3FF', primary200: '#ABC6FE', primary300: '#80A9FD',
  primary400: '#558DFD', primary500: '#2B70FC', primary600: '#1F5DE0', primary700: '#1A4CB8', primary800: '#173E91', primary900: '#122F6B',
  accent50: '#EFEFFD', accent200: '#C5C4F7', accent500: '#6C68E0', accent700: '#4740A5',
  n0: '#FFFFFF', n25: '#FBFCFD', n50: '#F6F7F9', n100: '#EFF1F4', n150: '#E6E9EE', n200: '#DDE1E7', n300: '#C6CBD3',
  n400: '#9AA1AD', n500: '#6A7280', n600: '#555D6A', n700: '#3D4450', n800: '#272C35', n900: '#171A21', n950: '#0C0E12',
  successBg: '#EAF8EF', successBorder: '#BDE8CD', successIcon: '#1FA95B', successText: '#137A40',
  warningBg: '#FEF4E2', warningBorder: '#F6D9A0', warningIcon: '#E59A0B', warningText: '#8A5600',
  errorBg: '#FDEDED', errorBorder: '#F6C4C4', errorIcon: '#E5484D', errorText: '#B42328', errorStrong: '#D93036',

  text: '#171A21', text2: '#6A7280', text3: '#9AA1AD', textDisabled: '#C6CBD3', link: '#1F5DE0',
  bgApp: '#F2F3F5', surfaceInset: '#F5F6F8', borderSubtle: '#ECEEF1', borderDefault: '#DDE1E7', borderStrong: '#C6CBD3',
  scrim: 'rgba(12,14,18,0.40)',

  // --app-* tokens
  navy: '#0A1B4F', hairline: '#EEF0F4', muted: '#F6F7F9', pillBorder: '#E3E5E9', field: '#F4F5F7', fieldPressed: '#EDEEF1',
  onDarkMuted: 'rgba(255,255,255,0.65)', glass: 'rgba(255,255,255,0.12)', navInk: '#3B4658', tileBg: '#EAF1FF', tileFg: '#1F5DE0',
} as const;

export const R = { card: 20, input: 14, button: 14, tile: 12, sheet: 24, chip: 999, sm: 8, md: 12, xs: 6 } as const;

export const shadow = {
  float: Platform.select<ViewStyle>({
    ios: { shadowColor: '#0A1B4F', shadowOpacity: 0.28, shadowRadius: 16, shadowOffset: { width: 0, height: 12 } },
    default: { elevation: 6, shadowColor: '#0A1B4F' },
  }),
  bar: Platform.select<ViewStyle>({
    ios: { shadowColor: '#101828', shadowOpacity: 0.18, shadowRadius: 16, shadowOffset: { width: 0, height: 10 } },
    default: { elevation: 10, shadowColor: '#101828' },
  }),
  fab: Platform.select<ViewStyle>({
    ios: { shadowColor: '#0A1B4F', shadowOpacity: 0.5, shadowRadius: 12, shadowOffset: { width: 0, height: 10 } },
    default: { elevation: 10, shadowColor: '#0A1B4F' },
  }),
  sheet: Platform.select<ViewStyle>({
    ios: { shadowColor: '#101828', shadowOpacity: 0.12, shadowRadius: 16, shadowOffset: { width: 0, height: -4 } },
    default: { elevation: 16 },
  }),
  card2: Platform.select<ViewStyle>({
    ios: { shadowColor: '#101828', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 8 } },
    default: { elevation: 3, shadowColor: '#101828' },
  }),
  small: Platform.select<ViewStyle>({
    ios: { shadowColor: '#0A1B4F', shadowOpacity: 0.18, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
    default: { elevation: 2, shadowColor: '#0A1B4F' },
  }),
};

/**
 * SF Pro on iOS (system font); Inter everywhere else, as in the design system's font stack.
 * Android needs one font family per weight.
 */
type W = 400 | 500 | 600 | 700;
const INTER: Record<W, string> = { 400: 'Inter_400Regular', 500: 'Inter_500Medium', 600: 'Inter_600SemiBold', 700: 'Inter_700Bold' };
export const font = (weight: W, size: number, lineHeight?: number): TextStyle => ({
  fontSize: size,
  lineHeight: lineHeight ?? Math.round(size * 1.35),
  ...(Platform.OS === 'ios' ? { fontWeight: String(weight) as TextStyle['fontWeight'] } : { fontFamily: INTER[weight] }),
});
export const mono = (size: number, lineHeight?: number, weight: 400 | 500 = 500): TextStyle => ({
  fontSize: size,
  lineHeight: lineHeight ?? Math.round(size * 1.4),
  fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  fontWeight: String(weight) as TextStyle['fontWeight'],
});
export const tabular: TextStyle = { fontVariant: ['tabular-nums'] };

export type Tone = 'neutral' | 'primary' | 'info' | 'accent' | 'success' | 'warning' | 'error';

/** StatusChip tones: [background, text, dot]. 'primary' is not a StatusChip tone and falls back to neutral, as in the design system. */
export const STATUS_TONE: Record<string, [string, string, string]> = {
  neutral: [C.n100, C.n600, C.n400],
  info: [C.primary50, C.primary700, C.primary500],
  accent: [C.accent50, C.accent700, C.accent500],
  success: [C.successBg, C.successText, C.successIcon],
  warning: [C.warningBg, C.warningText, C.warningIcon],
  error: [C.errorBg, C.errorText, C.errorIcon],
};

/** IconTile tones: [background, foreground]. */
export const TILE_TONE: Record<string, [string, string]> = {
  primary: [C.primary50, C.primary500],
  accent: [C.accent50, C.accent500],
  neutral: [C.n100, C.n700],
  success: [C.successBg, C.successIcon],
  warning: [C.warningBg, C.warningIcon],
  error: [C.errorBg, C.errorIcon],
  solid: [C.primary500, '#fff'],
};

/** Icon tones from the design system. */
export const ICON_TONE: Record<string, string> = {
  default: C.n700, muted: C.n400, active: C.primary500, disabled: C.n300, success: C.successIcon, warning: C.warningIcon,
  error: C.errorIcon, inverse: '#fff', primary: C.primary500,
};

/** Sheet / push animation easing from the prototype: cubic-bezier(.32,.72,0,1). */
export const SHEET_EASE = [0.32, 0.72, 0, 1] as const;
