import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  applyTheme,
  getActiveTheme,
  getActiveThemeName,
  THEMES,
  type KtColors,
  type ThemeName,
} from './theme';

interface ThemeContextValue {
  name: ThemeName;
  colors: KtColors;
  setTheme: (name: ThemeName) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [name, setName] = useState<ThemeName>(() => getActiveThemeName());

  // Apply on mount + whenever it changes.
  useEffect(() => {
    applyTheme(name);
  }, [name]);

  const setTheme = useCallback((n: ThemeName) => setName(n), []);

  const value = useMemo<ThemeContextValue>(
    () => ({ name, colors: THEMES[name], setTheme }),
    [name, setTheme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

/** Access the active theme colour palette + setter. */
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    // Fallback for components that render outside the provider (unlikely
    // in our tree, but keeps stories/tests resilient).
    return {
      name: getActiveThemeName(),
      colors: getActiveTheme(),
      setTheme: () => undefined,
    };
  }
  return ctx;
}
