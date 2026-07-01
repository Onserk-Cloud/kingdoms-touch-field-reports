import { Component, type ErrorInfo, type ReactNode } from 'react';

const CHUNK_RELOAD_KEY = 'kt:chunk-reload';

/** A failed lazy-import (usually a stale chunk after a new deploy). */
function isChunkError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /dynamically imported module|Loading chunk|Importing a module script failed|Failed to fetch dynamically/i.test(
    msg,
  );
}

function isEs(): boolean {
  try {
    const l = (
      localStorage.getItem('kt:lang') ||
      navigator.language ||
      'en'
    ).toLowerCase();
    return l.startsWith('es');
  } catch {
    return false;
  }
}

interface State {
  hasError: boolean;
}

/**
 * Catches render errors and failed lazy chunk loads so the app never shows a
 * blank white screen. Stale chunks (after a deploy) trigger a one-time reload
 * to pull the new build; anything else shows a friendly reload screen.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, _info: ErrorInfo): void {
    if (isChunkError(error)) {
      try {
        if (!sessionStorage.getItem(CHUNK_RELOAD_KEY)) {
          sessionStorage.setItem(CHUNK_RELOAD_KEY, '1');
          window.location.reload();
          return;
        }
      } catch {
        /* ignore */
      }
    }
    console.error('[KT] render error', error);
  }

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children;

    const es = isEs();
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: '#F7F3E8',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 28,
          textAlign: 'center',
          fontFamily: 'Manrope, system-ui, sans-serif',
        }}
      >
        <div style={{ fontSize: 16, fontWeight: 700, color: '#26302b' }}>
          {es ? 'Algo salió mal' : 'Something went wrong'}
        </div>
        <div
          style={{
            fontSize: 13,
            color: '#5b6b62',
            margin: '8px 0 20px',
            maxWidth: 280,
            lineHeight: 1.4,
          }}
        >
          {es ? 'Vuelve a cargar la app.' : 'Please reload the app.'}
        </div>
        <button
          onClick={() => {
            try {
              sessionStorage.removeItem(CHUNK_RELOAD_KEY);
            } catch {
              /* ignore */
            }
            window.location.reload();
          }}
          style={{
            height: 48,
            padding: '0 26px',
            borderRadius: 14,
            background: '#1F3D2B',
            color: '#fff',
            fontWeight: 700,
            fontSize: 15,
            border: 'none',
            cursor: 'pointer',
          }}
        >
          {es ? 'Recargar' : 'Reload'}
        </button>
      </div>
    );
  }
}
