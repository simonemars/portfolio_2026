const palette = {
  darkBlue: "#0e2337",
  darkBlue2: "#142c46",
  card: "#1b3652",
  border: "rgba(255,255,255,0.08)",
  white: "#E9EDF2",
  whiteMuted: "rgba(233,237,242,0.75)",
  accent: "#8fb4ff"
};

export default {
  colors: {
    bg: palette.darkBlue,
    bg2: palette.darkBlue2,
    card: palette.card,
    border: palette.border,
    textPrimary: palette.white,
    textSecondary: palette.whiteMuted,
    accent: palette.accent
  },
  fonts: {
    serif: "CrimsonPro_600SemiBold",
    serifBold: "CrimsonPro_700Bold",
    sans: "Inter_400Regular",
    sansMed: "Inter_500Medium"
  },
  radii: {
    lg: 18,
    xl: 26
  },
  spacing: (n) => 4 * n
};

