'use client';

import { useEffect, useState } from 'react';

type State = 'loading' | 'unsupported' | 'denied' | 'off' | 'on';

async function registerSW(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;
  return navigator.serviceWorker.register('/sw.js');
}

async function subscribe(reg: ServiceWorkerRegistration): Promise<PushSubscription> {
  return reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
  });
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

export default function PushToggle() {
  const [state, setState] = useState<State>('loading');

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setState('unsupported'); return;
    }
    const perm = Notification.permission;
    if (perm === 'denied') { setState('denied'); return; }

    navigator.serviceWorker.ready.then(reg =>
      reg.pushManager.getSubscription().then(sub => {
        setState(sub ? 'on' : 'off');
      })
    );
    registerSW();
  }, []);

  async function toggle() {
    if (state === 'on') {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setState('off');
    } else {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') { setState('denied'); return; }
      const reg = await navigator.serviceWorker.ready;
      const sub = await subscribe(reg);
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sub.toJSON()),
      });
      setState('on');
    }
  }

  if (state === 'loading' || state === 'unsupported') return null;

  if (state === 'denied') {
    return (
      <span className="text-xs text-muted px-2">
        🔕 Thông báo bị chặn (mở cài đặt trình duyệt)
      </span>
    );
  }

  return (
    <button
      onClick={toggle}
      title={state === 'on' ? 'Tắt thông báo bán hàng' : 'Bật thông báo bán hàng'}
      className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
        state === 'on'
          ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 hover:bg-amber-500/25'
          : 'bg-border/60 text-muted hover:bg-border'
      }`}
    >
      <span className="text-sm leading-none">{state === 'on' ? '🔔' : '🔕'}</span>
      {state === 'on' ? 'Thông báo bật' : 'Bật thông báo'}
    </button>
  );
}
