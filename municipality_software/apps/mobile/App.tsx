import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { Provider as PaperProvider } from 'react-native-paper';
import { Navigation } from './src/navigation';
import { theme } from './src/theme';

export default function App() {
  return (
    <PaperProvider theme={theme}>
      <Navigation />
      <StatusBar style="light" />
    </PaperProvider>
  );
}
