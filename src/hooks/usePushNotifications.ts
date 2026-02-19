import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

const STORAGE_KEY = 'push_subscribed';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

export function usePushNotifications() {
  const [subscribing, setSubscribing] = useState(false);

  const subscribe = useCallback(async (userId: string) => {
    // Already subscribed for this user
    if (localStorage.getItem(STORAGE_KEY) === userId) return;

    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    if (Notification.permission === 'denied') return;

    setSubscribing(true);
    try {
      // Fetch VAPID public key from backend
      const { data: keyData, error: keyError } = await supabase.functions.invoke('vapid-public-key');
      if (keyError || !keyData?.vapid_public_key) {
        console.warn('VAPID key not available');
        return;
      }
      const vapidPublicKey = keyData.vapid_public_key;

      // Register SW
      const registration = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      // Request permission (only shows dialog if 'default')
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return;

      // Subscribe to push
      const subscription = await (registration as any).pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      const subJson = subscription.toJSON();

      // Save to backend
      const { error } = await supabase.functions.invoke('save-push-subscription', {
        body: { user_id: userId, subscription: subJson },
      });

      if (!error) {
        localStorage.setItem(STORAGE_KEY, userId);
      } else {
        console.error('Erro ao salvar subscription:', error);
      }
    } catch (err) {
      console.error('Erro ao registrar push:', err);
    } finally {
      setSubscribing(false);
    }
  }, []);

  return { subscribe, subscribing };
}
