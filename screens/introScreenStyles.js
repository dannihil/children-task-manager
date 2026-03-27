import { StyleSheet } from 'react-native';

export function createIntroStyles(c, isDark = false) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: c.bg,
    },
    safePad: {
      flex: 1,
      paddingHorizontal: 22,
    },
    skipWrap: {
      alignItems: 'flex-end',
      paddingTop: 8,
      paddingBottom: 4,
    },
    skipText: {
      fontSize: 16,
      fontWeight: '600',
      color: c.textSecondary,
    },
    slideScroll: {
      flex: 1,
    },
    slideScrollContent: {
      flexGrow: 1,
      paddingBottom: 8,
    },
    slide: {
      flex: 1,
      minHeight: 320,
    },
    screenshotFrame: {
      alignSelf: 'stretch',
      height: 380,
      borderRadius: 30,
      overflow: 'hidden',
      backgroundColor: c.surface,
      borderWidth: 2,
      borderColor: isDark ? c.primary : c.borderStrong,
      marginBottom: 20,
      shadowColor: c.cardShadow,
      shadowOffset: { width: 0, height: 7 },
      shadowOpacity: isDark ? 0.22 : 0.12,
      shadowRadius: 16,
      elevation: 6,
    },
    screenshotImage: {
      width: '100%',
      height: '100%',
    },
    screenshotDarkTint: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(8, 12, 24, 0.24)',
    },
    title: {
      fontSize: 28,
      fontWeight: '900',
      color: c.primaryDark,
      textAlign: 'center',
      letterSpacing: 0.2,
      marginBottom: 18,
    },
    body: {
      fontSize: 17,
      color: c.text,
      lineHeight: 27,
      textAlign: 'center',
      paddingHorizontal: 12,
      fontWeight: '600',
    },
    dots: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 8,
      marginBottom: 16,
      marginTop: 8,
    },
    dot: {
      width: 11,
      height: 11,
      borderRadius: 5.5,
      backgroundColor: c.borderStrong,
    },
    dotActive: {
      backgroundColor: c.primary,
      width: 30,
    },
    footer: {
      paddingBottom: 8,
      gap: 12,
    },
  });
}
