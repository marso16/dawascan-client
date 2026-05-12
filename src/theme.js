import { Platform } from "react-native";

export const C = {
  // Core palette
  ink: "#0A1628", // deepest navy — headlines, icons
  navy: "#112240", // primary navy — header, buttons
  navyMid: "#1B3358", // tab bar bg
  navyLight: "#233F68", // card borders, dividers on dark
  teal: "#00B89C", // primary accent — CTA, active states
  tealLight: "#00D4B4", // hover / highlight
  tealBg: "#E6FAF7", // success backgrounds
  tealText: "#006B5A", // text on teal bg

  // Neutrals
  white: "#FFFFFF",
  snow: "#F8FAFC", // page background
  mist: "#F1F5F9", // card background
  silver: "#E2E8F0", // borders
  fog: "#CBD5E1", // placeholder borders
  ash: "#94A3B8", // placeholder text
  slate: "#64748B", // secondary text
  charcoal: "#334155", // primary text
  ink2: "#1E293B", // bold text

  // Semantic
  success: "#10B981",
  successBg: "#ECFDF5",
  successText: "#065F46",
  warn: "#F59E0B",
  warnBg: "#FFFBEB",
  warnText: "#92400E",
  danger: "#EF4444",
  dangerBg: "#FEF2F2",
  dangerText: "#991B1B",
  info: "#3B82F6",
  infoBg: "#EFF6FF",
  infoText: "#1E40AF",

  // Gradients (use with LinearGradient if available, else fallback to navy)
  gradStart: "#0A1628",
  gradEnd: "#1B3A6B",
};

export const F = {
  // Font sizes
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  xxxl: 30,
  hero: 38,

  // Font weights
  regular: "400",
  medium: "500",
  semibold: "600",
  bold: "700",
  extrabold: "800",
  black: "900",

  // Font family
  mono: Platform.OS === "ios" ? "Courier New" : "monospace",
};

export const S = {
  // Spacing
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  xxxl: 40,

  // Border radius
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 999,

  // Shadows
  shadow: Platform.select({
    ios: {
      shadowColor: "#0A1628",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
    },
    android: { elevation: 4 },
  }),
  shadowSm: Platform.select({
    ios: {
      shadowColor: "#0A1628",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 6,
    },
    android: { elevation: 2 },
  }),
  shadowLg: Platform.select({
    ios: {
      shadowColor: "#0A1628",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.15,
      shadowRadius: 24,
    },
    android: { elevation: 8 },
  }),
};
