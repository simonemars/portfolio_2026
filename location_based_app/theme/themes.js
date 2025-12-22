export const DarkTheme = {
  name: 'dark',
  isDark: true,
  colors: {
    bg: '#0E2331',
    bg2: '#142C46',
    surface: '#1B3652',
    surfaceAlt: '#0F2634',
    text: '#EAF2F6',
    textPrimary: '#E9EDF2',
    textSecondary: 'rgba(233,237,242,0.75)',
    textDim: '#A8C1CF',
    primary: '#6BC1FF',
    accent: '#8FB4FF',
    border: 'rgba(255,255,255,0.08)',
    badge: 'rgba(255,255,255,0.08)',
    chip: 'rgba(255,255,255,0.06)',
    statusBar: 'light',
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

export const LightBlueTheme = {
  name: 'lightBlue',
  isDark: false,
  colors: {
    // very light blue tone
    bg: '#F1F7FC',           // page background (very light blue)
    bg2: '#E8F2FB',          // tab bar / nav
    surface: '#FFFFFF',      // cards
    surfaceAlt: '#E8F2FB',   // bars / nav
    text: '#0F2634',
    textPrimary: '#0F2634',
    textSecondary: '#3F5C6C',
    textDim: '#3F5C6C',
    primary: '#1976D2',      // accessible blue
    accent: '#1976D2',
    border: 'rgba(0,0,0,0.08)',
    badge: 'rgba(25,118,210,0.10)',
    chip: '#E1EEF9',
    statusBar: 'dark',
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



