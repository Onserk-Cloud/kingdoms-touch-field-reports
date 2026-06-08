import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from './theme-context';
import { I18nProvider } from './lib/i18n';
import { App } from './App';
import { installAutoFlush } from './lib/offline-store';
import { uploadReport } from './lib/uploader';
import { HAS_SUPABASE } from './lib/supabase';
import { seedDemoData } from './lib/seed-demo';
import './index.css';

// Auto-flush pending offline reports whenever the device comes online.
// Only when a real backend is configured. In demo mode there is nothing to
// flush to, and a boot-time flush would silently "upload" (and clear) the
// seeded "awaiting sync" reports on every reload.
if (HAS_SUPABASE) {
  installAutoFlush(uploadReport, (r) => {
    if (r.ok > 0) {
      // Soft toast — left simple, can be replaced by a real toast lib later.
      console.info(`[KT] flushed ${r.ok} report(s) to backend`);
    }
  });
}

// Seed mock data on first launch in demo mode (no Supabase configured).
// Idempotent — runs once per device.
if (!HAS_SUPABASE) {
  void seedDemoData().catch((err) =>
    console.warn('[KT] demo seed failed', err),
  );
}

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Missing #root');

createRoot(rootEl).render(
  <StrictMode>
    <BrowserRouter
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <I18nProvider>
        <ThemeProvider>
          <App />
        </ThemeProvider>
      </I18nProvider>
    </BrowserRouter>
  </StrictMode>,
);
