import { StyleSheet } from "react-native";

// Mirrors the brand tokens from the web app's Tailwind config
// (brand-midnight, brand-gold, brand-warm-white) so the app feels like
// the same product.
export const colors = {
  midnight: "#0F0F14",
  warmWhite: "#F5F4F0",
  gold: "#C8973A",
  goldLight: "#E8C47A",
  ink: "#1A1A1F",
  inkFaint: "#8C8C94",
  border: "#E7E5E0",
  cardBg: "#FFFFFF",
  danger: "#E11D48",
  success: "#10B981",
  warning: "#F59E0B",
};

export const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.warmWhite,
  },
  darkScreen: {
    flex: 1,
    backgroundColor: colors.midnight,
  },
  h1: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.ink,
    letterSpacing: -0.3,
  },
  h1Light: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.warmWhite,
    letterSpacing: -0.3,
  },
  subtle: {
    fontSize: 13,
    color: colors.inkFaint,
    lineHeight: 19,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 15,
    color: colors.ink,
  },
  goldButton: {
    backgroundColor: colors.gold,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  goldButtonText: {
    color: colors.midnight,
    fontWeight: "700",
    fontSize: 15,
  },
  outlineButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  outlineButtonText: {
    color: colors.ink,
    fontWeight: "600",
    fontSize: 14,
  },
  disabled: {
    opacity: 0.4,
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    marginTop: 10,
  },
  card: {
    backgroundColor: colors.cardBg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
    padding: 16,
  },
});
