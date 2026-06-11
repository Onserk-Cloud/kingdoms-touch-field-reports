import { useEffect, useRef, useState } from 'react';

/**
 * PWA install helper.
 *
 * The `beforeinstallprompt` event is captured very early by an inline script in
 * index.html (stashed on window.__ktInstall) so we never miss it. This hook
 * exposes whether we can show a native install prompt, whether we're already
 * installed (running standalone), and an iOS flag (iOS Safari has no prompt —
 * the user must use Share → Add to Home Screen).
 */

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

declare global {
  interface Window {
    __ktInstall?: BeforeInstallPromptEvent | null;
  }
}

export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as { standalone?: boolean }).standalone === true
  );
}

export function isIOS(): boolean {
  if (typeof window === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

export function useInstall() {
  const [canInstall, setCanInstall] = useState(
    typeof window !== 'undefined' && !!window.__ktInstall,
  );
  const [installed, setInstalled] = useState(isStandalone());
  // If the user taps "Install" before Chrome has armed the prompt (it takes a
  // few seconds on a first visit), remember the intent and prompt as soon as
  // the event arrives instead of silently doing nothing.
  const wantRef = useRef(false);

  async function doPrompt(): Promise<boolean> {
    const e = window.__ktInstall;
    if (!e) return false;
    await e.prompt();
    const choice = await e.userChoice;
    window.__ktInstall = null;
    setCanInstall(false);
    return choice.outcome === 'accepted';
  }

  useEffect(() => {
    const onAvail = () => {
      setCanInstall(true);
      if (wantRef.current) {
        wantRef.current = false;
        void doPrompt();
      }
    };
    const onDone = () => {
      setCanInstall(false);
      setInstalled(true);
    };
    window.addEventListener('kt-installable', onAvail);
    window.addEventListener('kt-installed', onDone);
    return () => {
      window.removeEventListener('kt-installable', onAvail);
      window.removeEventListener('kt-installed', onDone);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function promptInstall(): Promise<boolean> {
    if (!window.__ktInstall) {
      // Not armed yet — queue the intent; onAvail will fire the prompt.
      wantRef.current = true;
      return false;
    }
    return doPrompt();
  }

  return { canInstall, installed, ios: isIOS(), promptInstall };
}
