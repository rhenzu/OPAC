import React, { createContext, useState, useContext, useEffect, ReactNode, useMemo } from 'react';
import { createTheme, ThemeProvider as MuiThemeProvider, ThemeOptions, PaletteOptions } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

interface ThemeContextType {
  darkMode: boolean;
  toggleDarkMode: () => void;
}

export const ThemeContext = createContext<ThemeContextType>({
  darkMode: false,
  toggleDarkMode: () => {},
});

export const useThemeContext = () => useContext(ThemeContext);

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  // Check for saved preference or system preference
  const getSavedTheme = () => {
    const savedTheme = localStorage.getItem('darkMode');
    if (savedTheme !== null) {
      return savedTheme === 'true';
    }
    // Check for system preference
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  };

  const [darkMode, setDarkMode] = useState<boolean>(getSavedTheme());

  const toggleDarkMode = () => {
    setDarkMode(prevMode => !prevMode);
  };

  // Common palette options
  const commonPalette: Partial<PaletteOptions> = {
    primary: {
      main: '#4a6dff',
      light: '#7493ff',
      dark: '#254ae2',
      contrastText: '#fff',
      lightest: '#eef2ff',
    },
    secondary: {
      main: '#ff4e90',
      light: '#ff77ad',
      dark: '#e63e7b',
      contrastText: '#fff',
      lightest: '#fff0f5',
    },
    error: {
      main: '#f53d5b',
      light: '#ff6a84',
      dark: '#d42a46',
    },
    warning: {
      main: '#ff9900',
      light: '#ffb74d',
      dark: '#e68a00',
    },
    info: {
      main: '#0288d1',
      light: '#4dabf5',
      dark: '#01579b',
    },
    success: {
      main: '#21c16a',
      light: '#55d98f',
      dark: '#0a9e51',
    },
  };

  // Create light and dark theme configurations
  const lightTheme: ThemeOptions = {
    palette: {
      mode: 'light',
      ...commonPalette,
      background: {
        default: '#f9fafc',
        paper: '#ffffff',
      },
      text: {
        primary: '#1a2138',
        secondary: '#5b6987',
      },
    },
    typography: {
      fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
      h1: {
        fontWeight: 800,
        letterSpacing: '-0.025em',
      },
      h2: {
        fontWeight: 700,
        letterSpacing: '-0.025em',
      },
      h3: {
        fontWeight: 700,
        letterSpacing: '-0.015em',
      },
      h4: {
        fontWeight: 700,
        letterSpacing: '-0.01em',
      },
      h5: {
        fontWeight: 600,
        letterSpacing: '-0.005em',
      },
      h6: {
        fontWeight: 600,
      },
      button: {
        fontWeight: 600,
        letterSpacing: '0.01em',
      },
      subtitle1: {
        fontWeight: 500,
      },
      subtitle2: {
        fontWeight: 500,
      },
    },
    shape: {
      borderRadius: 12,
    },
    shadows: [
      'none',
      '0px 2px 4px rgba(0, 0, 0, 0.03), 0px 1px 2px rgba(0, 0, 0, 0.04)',
      '0px 3px 6px rgba(0, 0, 0, 0.04), 0px 2px 4px rgba(0, 0, 0, 0.06)',
      '0px 4px 8px rgba(0, 0, 0, 0.05), 0px 2px 4px rgba(0, 0, 0, 0.04)',
      '0px 6px 10px rgba(0, 0, 0, 0.06), 0px 2px 5px rgba(0, 0, 0, 0.04)',
      '0px 8px 12px rgba(0, 0, 0, 0.06), 0px 3px 6px rgba(0, 0, 0, 0.05)',
      '0px 10px 14px rgba(0, 0, 0, 0.06), 0px 4px 8px rgba(0, 0, 0, 0.07)',
      '0px 10px 16px rgba(0, 0, 0, 0.07), 0px 6px 10px rgba(0, 0, 0, 0.06)',
      '0px 12px 18px rgba(0, 0, 0, 0.07), 0px 7px 12px rgba(0, 0, 0, 0.06)',
      '0px 14px 20px rgba(0, 0, 0, 0.08), 0px 8px 14px rgba(0, 0, 0, 0.07)',
      '0px 16px 24px rgba(0, 0, 0, 0.08), 0px 10px 16px rgba(0, 0, 0, 0.07)',
      '0px 18px 28px rgba(0, 0, 0, 0.08), 0px 12px 18px rgba(0, 0, 0, 0.07)',
      '0px 20px 32px rgba(0, 0, 0, 0.09), 0px 14px 20px rgba(0, 0, 0, 0.08)',
      '0px 22px 38px rgba(0, 0, 0, 0.09), 0px 16px 24px rgba(0, 0, 0, 0.08)',
      '0px 24px 42px rgba(0, 0, 0, 0.09), 0px 18px 28px rgba(0, 0, 0, 0.08)',
      '0px 28px 48px rgba(0, 0, 0, 0.09), 0px 20px 32px rgba(0, 0, 0, 0.08)',
      '0px 32px 54px rgba(0, 0, 0, 0.1), 0px 24px 36px rgba(0, 0, 0, 0.08)',
      '0px 36px 60px rgba(0, 0, 0, 0.1), 0px 28px 42px rgba(0, 0, 0, 0.09)',
      '0px 40px 66px rgba(0, 0, 0, 0.1), 0px 32px 48px rgba(0, 0, 0, 0.09)',
      '0px 44px 72px rgba(0, 0, 0, 0.1), 0px 36px 54px rgba(0, 0, 0, 0.09)',
      '0px 48px 80px rgba(0, 0, 0, 0.1), 0px 40px 60px rgba(0, 0, 0, 0.09)',
      '0px 52px 88px rgba(0, 0, 0, 0.11), 0px 44px 66px rgba(0, 0, 0, 0.1)',
      '0px 56px 96px rgba(0, 0, 0, 0.11), 0px 48px 72px rgba(0, 0, 0, 0.1)',
      '0px 60px 104px rgba(0, 0, 0, 0.11), 0px 52px 80px rgba(0, 0, 0, 0.1)',
      '0px 64px 112px rgba(0, 0, 0, 0.11), 0px 56px 88px rgba(0, 0, 0, 0.1)',
    ],
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            borderRadius: 12,
            fontWeight: 600,
            padding: '8px 20px',
            boxShadow: 'none',
          },
          contained: {
            boxShadow: '0px 3px 6px rgba(0, 0, 0, 0.05), 0px 1px 3px rgba(0, 0, 0, 0.1)',
            '&:hover': {
              boxShadow: '0px 6px 10px rgba(0, 0, 0, 0.08), 0px 1px 4px rgba(0, 0, 0, 0.1)',
            },
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 16,
            boxShadow: '0px 4px 15px rgba(0,0,0,0.05)',
            transition: 'all 0.3s ease',
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            borderRadius: 16,
          },
          elevation1: {
            boxShadow: '0px 2px 10px rgba(0,0,0,0.035)',
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: 12,
            },
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 12,
          },
        },
      },
    },
  };

  const darkTheme: ThemeOptions = {
    palette: {
      mode: 'dark',
      ...commonPalette,
      background: {
        default: '#111827',
        paper: '#1f2937',
      },
      text: {
        primary: '#f3f4f6',
        secondary: '#d1d5db',
      },
    },
    typography: {
      fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
      h1: {
        fontWeight: 800,
        letterSpacing: '-0.025em',
      },
      h2: {
        fontWeight: 700,
        letterSpacing: '-0.025em',
      },
      h3: {
        fontWeight: 700,
        letterSpacing: '-0.015em',
      },
      h4: {
        fontWeight: 700,
        letterSpacing: '-0.01em',
      },
      h5: {
        fontWeight: 600,
        letterSpacing: '-0.005em',
      },
      h6: {
        fontWeight: 600,
      },
      button: {
        fontWeight: 600,
        letterSpacing: '0.01em',
      },
      subtitle1: {
        fontWeight: 500,
      },
      subtitle2: {
        fontWeight: 500,
      },
    },
    shape: {
      borderRadius: 12,
    },
    shadows: [
      'none',
      '0px 2px 4px rgba(0, 0, 0, 0.2), 0px 1px 2px rgba(0, 0, 0, 0.3)',
      '0px 3px 6px rgba(0, 0, 0, 0.2), 0px 2px 4px rgba(0, 0, 0, 0.3)',
      '0px 4px 8px rgba(0, 0, 0, 0.2), 0px 2px 4px rgba(0, 0, 0, 0.25)',
      '0px 6px 10px rgba(0, 0, 0, 0.2), 0px 2px 5px rgba(0, 0, 0, 0.25)',
      '0px 8px 12px rgba(0, 0, 0, 0.2), 0px 3px 6px rgba(0, 0, 0, 0.25)',
      '0px 10px 14px rgba(0, 0, 0, 0.2), 0px 4px 8px rgba(0, 0, 0, 0.25)',
      '0px 10px 16px rgba(0, 0, 0, 0.2), 0px 6px 10px rgba(0, 0, 0, 0.25)',
      '0px 12px 18px rgba(0, 0, 0, 0.2), 0px 7px 12px rgba(0, 0, 0, 0.25)',
      '0px 14px 20px rgba(0, 0, 0, 0.2), 0px 8px 14px rgba(0, 0, 0, 0.25)',
      '0px 16px 24px rgba(0, 0, 0, 0.2), 0px 10px 16px rgba(0, 0, 0, 0.25)',
      '0px 18px 28px rgba(0, 0, 0, 0.2), 0px 12px 18px rgba(0, 0, 0, 0.25)',
      '0px 20px 32px rgba(0, 0, 0, 0.2), 0px 14px 20px rgba(0, 0, 0, 0.25)',
      '0px 22px 38px rgba(0, 0, 0, 0.2), 0px 16px 24px rgba(0, 0, 0, 0.25)',
      '0px 24px 42px rgba(0, 0, 0, 0.2), 0px 18px 28px rgba(0, 0, 0, 0.25)',
      '0px 28px 48px rgba(0, 0, 0, 0.2), 0px 20px 32px rgba(0, 0, 0, 0.25)',
      '0px 32px 54px rgba(0, 0, 0, 0.2), 0px 24px 36px rgba(0, 0, 0, 0.25)',
      '0px 36px 60px rgba(0, 0, 0, 0.2), 0px 28px 42px rgba(0, 0, 0, 0.25)',
      '0px 40px 66px rgba(0, 0, 0, 0.2), 0px 32px 48px rgba(0, 0, 0, 0.25)',
      '0px 44px 72px rgba(0, 0, 0, 0.2), 0px 36px 54px rgba(0, 0, 0, 0.25)',
      '0px 48px 80px rgba(0, 0, 0, 0.2), 0px 40px 60px rgba(0, 0, 0, 0.25)',
      '0px 52px 88px rgba(0, 0, 0, 0.2), 0px 44px 66px rgba(0, 0, 0, 0.25)',
      '0px 56px 96px rgba(0, 0, 0, 0.2), 0px 48px 72px rgba(0, 0, 0, 0.25)',
      '0px 60px 104px rgba(0, 0, 0, 0.2), 0px 52px 80px rgba(0, 0, 0, 0.25)',
      '0px 64px 112px rgba(0, 0, 0, 0.2), 0px 56px 88px rgba(0, 0, 0, 0.25)',
    ],
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            borderRadius: 12,
            fontWeight: 600,
            padding: '8px 20px',
            boxShadow: 'none',
          },
          contained: {
            boxShadow: '0px 3px 6px rgba(0, 0, 0, 0.2), 0px 1px 3px rgba(0, 0, 0, 0.3)',
            '&:hover': {
              boxShadow: '0px 6px 10px rgba(0, 0, 0, 0.25), 0px 1px 4px rgba(0, 0, 0, 0.3)',
            },
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 16,
            background: 'rgba(31, 41, 55, 0.95)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            transition: 'all 0.3s ease',
            backdropFilter: 'blur(8px)',
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            borderRadius: 16,
            background: 'rgba(31, 41, 55, 0.95)',
          },
          elevation1: {
            boxShadow: '0px 2px 10px rgba(0,0,0,0.3)',
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: {
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: 12,
            },
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 12,
          },
        },
      },
    },
  };

  // Create the theme object based on darkMode state
  const theme = useMemo(() => createTheme(darkMode ? darkTheme : lightTheme), [darkMode]);

  // Save theme preference to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('darkMode', darkMode.toString());
    
    // Add Inter font to document if it doesn't exist
    const interFont = document.getElementById('inter-font');
    if (!interFont) {
      const link = document.createElement('link');
      link.id = 'inter-font';
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap';
      document.head.appendChild(link);
    }
  }, [darkMode]);

  return (
    <ThemeContext.Provider value={{ darkMode, toggleDarkMode }}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
}; 