import { StyleSheet } from 'react-native';

export function createOnboardingStyles(c) {
  return StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: c.bg,
    },
    scroll: {
      flexGrow: 1,
      paddingHorizontal: 22,
      paddingTop: 20,
      paddingBottom: 36,
    },
    title: {
      fontSize: 28,
      fontWeight: '900',
      color: c.text,
      textAlign: 'center',
      marginBottom: 10,
      lineHeight: 34,
    },
    sub: {
      fontSize: 16,
      fontWeight: '600',
      color: c.textSecondary,
      textAlign: 'center',
      marginBottom: 28,
      lineHeight: 22,
      paddingHorizontal: 4,
    },
    card: {
      width: '100%',
      backgroundColor: c.surface,
      borderRadius: 20,
      padding: 18,
      borderWidth: 1,
      borderColor: c.border,
      marginBottom: 14,
    },
    rowLabel: {
      fontSize: 13,
      fontWeight: '800',
      color: c.textSecondary,
      marginBottom: 8,
    },
    input: {
      backgroundColor: c.surfaceMuted,
      borderRadius: 14,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 17,
      fontWeight: '600',
      color: c.text,
      borderWidth: 1,
      borderColor: c.border,
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
      marginTop: 24,
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
