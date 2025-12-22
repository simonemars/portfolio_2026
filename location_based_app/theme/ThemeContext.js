import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance } from 'react-native';
import { DarkTheme, LightBlueTheme } from './themes';

const ThemeCtx = createContext({});

export const useTheme = () => useContext(ThemeCtx);

const STORAGE_KEY = 'appearance_mode';

function resolveTheme(mode, osScheme) {
  if (mode === 'dark') return DarkTheme;
  if (mode === 'lightBlue') return LightBlueTheme;
  // system
  return osScheme === 'dark' ? DarkTheme : LightBlueTheme;
}

export function ThemeProvider({ children }) {
  const [mode, setModeState] = useState('system');
  const [osScheme, setOsScheme] = useState(Appearance.getColorScheme());

  // load saved mode
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved === 'dark' || saved === 'lightBlue' || saved === 'system') {
          setModeState(saved);
        }
      } catch (error) {
        console.error('Error loading theme:', error);
      }
    })();
  }, []);

  // listen to OS changes if on system
  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setOsScheme(colorScheme);
    });
    return () => subscription.remove();
  }, []);

  const setMode = async (m) => {
    setModeState(m);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, m);
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  };

  const theme = useMemo(() => resolveTheme(mode, osScheme), [mode, osScheme]);

  return (
    <ThemeCtx.Provider value={{ theme, mode, setMode }}>
      {children}
    </ThemeCtx.Provider>
  );
}



