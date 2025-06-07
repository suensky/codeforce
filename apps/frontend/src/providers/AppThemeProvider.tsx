import React, { createContext, useState, useMemo, useEffect, ReactNode } from 'react';
import { getTheme } from '../theme/theme'; // Assuming theme definitions are here

// Placeholder for MUI ThemeProvider and CssBaseline
// In a real MUI app, you'd import these from '@mui/material/styles' and '@mui/material'
const MuiThemeProvider: React.FC<any> = ({ theme, children }) => <div data-theme-mode={theme.palette.mode}>{children}</div>;
const CssBaseline: React.FC = () => <React.Fragment /> ; // Placeholder
// End of Placeholders

type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
  mode: ThemeMode;
  toggleTheme: () => void;
}

export const ThemeContext = createContext<ThemeContextType>({
  mode: 'light', // Default value
  toggleTheme: () => {
    console.log('ThemeProvider not yet initialized');
  },
});

interface AppThemeProviderProps {
  children: ReactNode;
}

export const AppThemeProvider: React.FC<AppThemeProviderProps> = ({ children }) => {
  const [mode, setMode] = useState<ThemeMode>('light'); // Default to light

  // Load saved theme mode from localStorage on initial render
  useEffect(() => {
    const savedMode = localStorage.getItem('themeMode') as ThemeMode | null;
    if (savedMode) {
      setMode(savedMode);
    }
  }, []);

  const toggleTheme = () => {
    setMode((prevMode) => {
      const newMode = prevMode === 'light' ? 'dark' : 'light';
      localStorage.setItem('themeMode', newMode); // Persist to localStorage
      return newMode;
    });
  };

  // useMemo to recompute the theme only when mode changes
  const theme = useMemo(() => getTheme(mode), [mode]);

  return (
    <ThemeContext.Provider value={{ mode, toggleTheme }}>
      {/*
        MuiThemeProvider applies the theme to MUI components.
        CssBaseline provides baseline styling normalizations.
      */}
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
};

// Custom hook to use the theme context
export const useAppTheme = () => React.useContext(ThemeContext);
