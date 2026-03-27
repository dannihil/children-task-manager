import { StyleSheet } from 'react-native';

export function createOnboardingStyles(c, isDark = false) {
  return StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: c.bg,
    },
    scroll: {
      flexGrow: 1,
      paddingHorizontal: 24,
      paddingTop: 24,
      paddingBottom: 40,
    },
    title: {
      fontSize: 30,
      fontWeight: '900',
      color: isDark ? c.primaryDark : c.text,
      textAlign: 'center',
      marginBottom: 12,
      lineHeight: 38,
    },
    sub: {
      fontSize: 16,
      fontWeight: '600',
      color: c.textSecondary,
      textAlign: 'center',
      marginBottom: 30,
      lineHeight: 22,
      paddingHorizontal: 10,
    },
    card: {
      width: '100%',
      backgroundColor: isDark ? c.surfaceMuted : c.surface,
      borderRadius: 24,
      padding: 20,
      borderWidth: 2,
      borderColor: isDark ? c.borderStrong : c.border,
      marginBottom: 16,
      shadowColor: c.cardShadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDark ? 0.22 : 0.08,
      shadowRadius: 12,
      elevation: 3,
    },
    rowLabel: {
      fontSize: 13,
      fontWeight: '800',
      color: c.textSecondary,
      marginBottom: 8,
    },
    input: {
      backgroundColor: isDark ? c.surface : c.surfaceMuted,
      borderRadius: 16,
      paddingHorizontal: 16,
      paddingVertical: 15,
      fontSize: 17,
      fontWeight: '600',
      color: c.text,
      borderWidth: 1.5,
      borderColor: isDark ? c.borderStrong : c.border,
    },
    childRow: {
      marginBottom: 16,
    },
    removeText: {
      marginTop: 8,
      fontSize: 15,
      fontWeight: '700',
      color: c.error,
    },
    addRow: {
      flexDirection: 'row',
      gap: 10,
      alignItems: 'center',
      marginTop: 4,
    },
    addInput: {
      flex: 1,
    },
    addBtnText: {
      fontSize: 15,
      fontWeight: '800',
      color: c.primary,
    },
    footer: {
      marginTop: 28,
      gap: 12,
    },
    switchBlock: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 16,
      gap: 12,
    },
    switchLabels: {
      flex: 1,
    },
    switchLabel: {
      fontSize: 16,
      fontWeight: '800',
      color: c.text,
    },
    switchSub: {
      fontSize: 13,
      fontWeight: '600',
      color: c.textSecondary,
      marginTop: 4,
    },
    hint: {
      fontSize: 13,
      fontWeight: '600',
      color: c.textSecondary,
      marginTop: 20,
      lineHeight: 18,
    },
  });
}
