import { HAS_SUPABASE, getSupabase } from './supabase';

/**
 * Check if push notifications are supported in the browser.
 */
export function isPushSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/**
 * Get the current Notification permission status.
 * Returns 'unsupported' if the browser does not support Notifications.
 */
export function getPushPermission(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

/**
 * Convert a VAPID public key from base64 to Uint8Array format.
 * Required by the Push API's applicationServerKey parameter.
 */
function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(b64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export type PushSubscriptionResult =
  | { status: 'granted'; subscription: PushSubscription }
  | { status: 'denied' }
  | { status: 'unsupported' }
  | { status: 'error'; error: string };

/**
 * Subscribe the current employee to push notifications.
 * Requests Notification permission and stores the subscription in Supabase.
 */
export async function subscribeToPush(
  employeeId: string,
): Promise<PushSubscriptionResult> {
  try {
    // Check browser support
    if (!isPushSupported()) {
      return { status: 'unsupported' };
    }

    // Request notification permission
    const permission = await Notification.requestPermission();
    if (permission === 'denied') {
      return { status: 'denied' };
    }

    if (permission !== 'granted') {
      return { status: 'denied' };
    }

    // Get the service worker registration
    const reg = await navigator.serviceWorker.ready;

    // Get VAPID public key from environment
    const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY as
      | string
      | undefined;
    if (!vapidPublicKey) {
      return {
        status: 'error',
        error: 'VITE_VAPID_PUBLIC_KEY not configured',
      };
    }

    // Subscribe to push notifications
    const subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
    });

    // Extract subscription details
    const subJson = subscription.toJSON();
    const endpoint = subscription.endpoint;
    const p256dh = subJson.keys?.p256dh;
    const auth = subJson.keys?.auth;

    if (!endpoint || !p256dh || !auth) {
      return {
        status: 'error',
        error: 'Failed to extract subscription keys',
      };
    }

    // Store subscription in Supabase if configured
    if (HAS_SUPABASE) {
      const sb = getSupabase();
      const userAgent = navigator.userAgent;

      await sb.from('push_subscriptions').upsert({
        employee_id: employeeId,
        endpoint,
        p256dh,
        auth,
        user_agent: userAgent,
      });
    }

    return { status: 'granted', subscription };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { status: 'error', error: message };
  }
}

/**
 * Unsubscribe the current employee from push notifications.
 * Removes the subscription from the browser and Supabase.
 */
export async function unsubscribeFromPush(): Promise<void> {
  try {
    if (!isPushSupported()) {
      return;
    }

    const reg = await navigator.serviceWorker.ready;
    const subscription = await reg.pushManager.getSubscription();

    if (!subscription) {
      return;
    }

    const endpoint = subscription.endpoint;

    // Unsubscribe from the browser
    await subscription.unsubscribe();

    // Remove from Supabase if configured
    if (HAS_SUPABASE) {
      const sb = getSupabase();
      await sb
        .from('push_subscriptions')
        .delete()
        .eq('endpoint', endpoint);
    }
  } catch (error) {
    console.error('[KT] Failed to unsubscribe from push:', error);
  }
}
