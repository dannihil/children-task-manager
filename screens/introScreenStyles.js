import { StyleSheet } from 'react-native';

export function createIntroStyles(c) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: c.bg,
    },
    safePad: {
      flex: 1,
      paddingHorizontal: 20,
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
      borderRadius: 28,
      overflow: 'hidden',
      backgroundColor: c.surface,
      borderWidth: 3,
      borderColor: c.primary,
      marginBottom: 18,
      shadowColor: c.cardShadow,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.14,
      shadowRadius: 14,
      elevation: 5,
    },
    screenshotImage: {
      width: '100%',
      height: '100%',
    },
    title: {
      fontSize: 26,
      fontWeight: '900',
      color: c.primaryDark,
      textAlign: 'center',
      letterSpacing: 0.2,
      marginBottom: 16,
    },
    body: {
      fontSize: 17,
      color: c.text,
      lineHeight: 26,
      textAlign: 'center',
      paddingHorizontal: 6,
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
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: c.borderStrong,
    },
    dotActive: {
      backgroundColor: c.primary,
      width: 28,
    },
    footer: {
      paddingBottom: 8,
      gap: 12,
    },
  });
}
