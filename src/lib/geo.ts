import { useCallback, useEffect, useState } from 'react';

export interface GpsFix {
  lat: number;
  lng: number;
  accuracy: number;
  timestamp: number;
}

export type GpsState =
  | { phase: 'idle' }
  | { phase: 'capturing' }
  | { phase: 'ready'; fix: GpsFix }
  | { phase: 'denied'; message: string }
  | { phase: 'error'; message: string };

/**
 * Capture GPS once with high accuracy. Falls back to a low-accuracy fix if
 * the high-accuracy call times out.
 */
export function useGeolocation(autoStart = true) {
  const [state, setState] = useState<GpsState>({ phase: 'idle' });

  const capture = useCallback(() => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      setState({
        phase: 'error',
        message: 'Location not supported on this device.',
      });
      return;
    }
    setState({ phase: 'capturing' });

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setState({
          phase: 'ready',
          fix: {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            timestamp: pos.timestamp,
          },
        });
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setState({
            phase: 'denied',
            message:
              'Location permission denied. You can still submit the report.',
          });
        } else {
          // Retry without high accuracy.
          navigator.geolocation.getCurrentPosition(
            (pos) =>
              setState({
                phase: 'ready',
                fix: {
                  lat: pos.coords.latitude,
                  lng: pos.coords.longitude,
                  accuracy: pos.coords.accuracy,
                  timestamp: pos.timestamp,
                },
              }),
            (err2) =>
              setState({
                phase: 'error',
                message: err2.message || 'Could not get location.',
              }),
            { enableHighAccuracy: false, timeout: 8000 },
          );
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30_000 },
    );
  }, []);

  useEffect(() => {
    if (autoStart) capture();
  }, [autoStart, capture]);

  return { state, capture };
}
