import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

// VAPID Public Key aus Environment
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

export type NotificationPermissionState = 'default' | 'granted' | 'denied' | 'unsupported';

export interface PushSubscription {
  id: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

interface UsePushNotificationsReturn {
  // Zustand
  permission: NotificationPermissionState;
  isSubscribed: boolean;
  isLoading: boolean;
  error: string | null;
  isSupported: boolean;
  
  // Aktionen
  requestPermission: () => Promise<boolean>;
  subscribe: () => Promise<boolean>;
  unsubscribe: () => Promise<boolean>;
  checkSubscription: () => Promise<boolean>;
}

/**
 * Konvertiert Base64-String zu Uint8Array (für VAPID Key)
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Hook für Web Push Notifications
 * 
 * Verwaltet:
 * - Service Worker Registration
 * - Push Permission
 * - Push Subscription (Browser + Supabase)
 */
export function usePushNotifications(): UsePushNotificationsReturn {
  const { user } = useAuth();
  const [permission, setPermission] = useState<NotificationPermissionState>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Feature-Detection
  const isSupported = typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window;

  // Permission-Status prüfen
  useEffect(() => {
    if (!isSupported) {
      setPermission('unsupported');
      return;
    }
    setPermission(Notification.permission as NotificationPermissionState);
  }, [isSupported]);

  // Subscription-Status bei Login prüfen
  useEffect(() => {
    if (user && isSupported) {
      checkSubscription();
    } else {
      setIsSubscribed(false);
    }
  }, [user, isSupported]);

  /**
   * Service Worker registrieren
   */
  const getServiceWorkerRegistration = useCallback(async (): Promise<ServiceWorkerRegistration | null> => {
    if (!isSupported) return null;

    try {
      const registration = await navigator.serviceWorker.ready;
      return registration;
    } catch (err) {
      console.error('[usePushNotifications] Service Worker nicht bereit:', err);
      return null;
    }
  }, [isSupported]);

  /**
   * Permission anfordern
   */
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      setError('Push Notifications werden nicht unterstützt');
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result as NotificationPermissionState);
      return result === 'granted';
    } catch (err) {
      console.error('[usePushNotifications] Permission-Anfrage fehlgeschlagen:', err);
      setError('Berechtigung konnte nicht angefordert werden');
      return false;
    }
  }, [isSupported]);

  /**
   * Prüft ob User bereits eine Subscription hat
   */
  const checkSubscription = useCallback(async (): Promise<boolean> => {
    if (!user || !isSupported) return false;

    try {
      // Browser-Subscription prüfen
      const registration = await getServiceWorkerRegistration();
      if (!registration) return false;

      const browserSubscription = await registration.pushManager.getSubscription();
      
      // Supabase-Subscription prüfen
      const { data } = await supabase
        .from('push_subscriptions')
        .select('id, endpoint')
        .eq('user_id', user.id)
        .maybeSingle();

      // Beide müssen existieren und matchen
      const hasValidSubscription = !!(
        browserSubscription &&
        data &&
        browserSubscription.endpoint === data.endpoint
      );

      setIsSubscribed(hasValidSubscription);
      return hasValidSubscription;
    } catch (err) {
      setIsSubscribed(false);
      return false;
    }
  }, [user, isSupported, getServiceWorkerRegistration]);

  /**
   * Push-Subscription erstellen und speichern
   */
  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!user) {
      setError('Nicht angemeldet');
      return false;
    }

    if (!isSupported) {
      setError('Push Notifications werden nicht unterstützt');
      return false;
    }

    if (!VAPID_PUBLIC_KEY) {
      setError('VAPID Public Key nicht konfiguriert');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      // 1. Permission prüfen/anfordern
      if (Notification.permission !== 'granted') {
        const granted = await requestPermission();
        if (!granted) {
          setError('Benachrichtigungen wurden nicht erlaubt');
          return false;
        }
      }

      // 2. Service Worker holen
      const registration = await getServiceWorkerRegistration();
      if (!registration) {
        setError('Service Worker nicht verfügbar');
        return false;
      }

      // 3. Bestehende Subscription entfernen
      const existingSubscription = await registration.pushManager.getSubscription();
      if (existingSubscription) {
        await existingSubscription.unsubscribe();
      }

      // 4. Neue Subscription erstellen
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      // 5. Keys extrahieren
      const subscriptionJson = subscription.toJSON();
      const p256dh = subscriptionJson.keys?.p256dh || '';
      const auth = subscriptionJson.keys?.auth || '';

      if (!p256dh || !auth) {
        setError('Subscription-Keys fehlen');
        return false;
      }

      // 6. In Supabase speichern (upsert)
      const { error: dbError } = await supabase
        .from('push_subscriptions')
        .upsert({
          user_id: user.id,
          endpoint: subscription.endpoint,
          p256dh,
          auth,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id',
        });

      if (dbError) {
        console.error('[usePushNotifications] Subscription speichern fehlgeschlagen:', dbError);
        setError('Subscription konnte nicht gespeichert werden');
        return false;
      }

      setIsSubscribed(true);
      return true;
    } catch (err) {
      console.error('[usePushNotifications] Subscribe fehlgeschlagen:', err);
      setError('Subscription fehlgeschlagen');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user, isSupported, requestPermission, getServiceWorkerRegistration]);

  /**
   * Push-Subscription entfernen
   */
  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!user) return false;

    setIsLoading(true);
    setError(null);

    try {
      // 1. Browser-Subscription entfernen
      if (isSupported) {
        const registration = await getServiceWorkerRegistration();
        if (registration) {
          const subscription = await registration.pushManager.getSubscription();
          if (subscription) {
            await subscription.unsubscribe();
          }
        }
      }

      // 2. Supabase-Subscription löschen
      const { error: dbError } = await supabase
        .from('push_subscriptions')
        .delete()
        .eq('user_id', user.id);

      if (dbError) {
        console.error('[usePushNotifications] Subscription löschen fehlgeschlagen:', dbError);
        setError('Subscription konnte nicht entfernt werden');
        return false;
      }

      setIsSubscribed(false);
      return true;
    } catch (err) {
      console.error('[usePushNotifications] Unsubscribe fehlgeschlagen:', err);
      setError('Abmeldung fehlgeschlagen');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user, isSupported, getServiceWorkerRegistration]);

  return {
    permission,
    isSubscribed,
    isLoading,
    error,
    isSupported,
    requestPermission,
    subscribe,
    unsubscribe,
    checkSubscription,
  };
}
