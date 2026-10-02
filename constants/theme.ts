export const colors = {
  // Primary & Accent Brand Colors
  primary: '#005F60', // Deep Teal
  primaryLight: '#008486',
  primaryDark: '#003E3F',
  accent: '#FF9933', // Warm Saffron
  accentLight: '#FFB266',
  accentDark: '#CC7A29',

  // Neutrals & Backgrounds
  background: '#F8FAFA',
  surface: '#FFFFFF',
  surfaceSubtle: '#F0F4F4',
  border: '#E2E8F0',
  borderDark: '#CBD5E1',

  // Text Colors (Accessible Contrast)
  textPrimary: '#0F172A', // Slate 900
  textSecondary: '#475569', // Slate 600
  textMuted: '#64748B', // Slate 500
  textInverse: '#FFFFFF',

  // Feedback Colors
  success: '#16A34A',
  successBackground: '#F0FDF4',
  warning: '#D97706',
  warningBackground: '#FFFBEB',
  error: '#DC2626',
  errorBackground: '#FEF2F2',
  info: '#0284C7',
  infoBackground: '#F0F9FF',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const radius = {
  xs: 4,
  sm: 8,
  md: 12,
  card: 16, // 16dp rounded cards per spec
  full: 9999,
} as const;

export const typography = {
  h1: {
    fontSize: 28,
    fontWeight: '700' as const,
    lineHeight: 34,
    color: colors.textPrimary,
  },
  h2: {
    fontSize: 22,
    fontWeight: '700' as const,
    lineHeight: 28,
    color: colors.textPrimary,
  },
  h3: {
    fontSize: 18,
    fontWeight: '600' as const,
    lineHeight: 24,
    color: colors.textPrimary,
  },
  body: {
    fontSize: 15,
    fontWeight: '400' as const,
    lineHeight: 22,
    color: colors.textPrimary,
  },
  bodySmall: {
    fontSize: 13,
    fontWeight: '400' as const,
    lineHeight: 18,
    color: colors.textSecondary,
  },
  caption: {
    fontSize: 11,
    fontWeight: '500' as const,
    lineHeight: 14,
    color: colors.textMuted,
  },
  button: {
    fontSize: 15,
    fontWeight: '600' as const,
    lineHeight: 20,
  },
} as const;

export const shadows = {
  subtle: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
} as const;
