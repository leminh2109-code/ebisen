import { NextRequest, NextResponse } from 'next/server';
import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

webpush.setVapidDetails(
  process.env.VAPID_EMAIL!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
);

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-webhook-secret');
  if (secret !== process.env.PUSH_WEBHOOK_SECRET)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const record = body.record ?? {};

  const payload = JSON.stringify({
    title: 'EBISEN — Bán hàng mới 🍤',
    body: [
      record.cake_type ? `${record.cake_type}` : null,
      record.quantity  ? `SL: ${record.quantity}` : null,
      record.staff      ? `NV: ${record.staff}`   : null,
    ].filter(Boolean).join(' · ') || 'Có đơn mới vừa được nhập',
    url: '/sales/new',
  });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
  const { data: subs } = await supabase.from('push_subscriptions').select('endpoint,p256dh,auth_key');
  if (!subs?.length) return NextResponse.json({ sent: 0 });

  const results = await Promise.allSettled(
    subs.map(s =>
      webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth_key } },
        payload,
      )
    )
  );

  // Remove subscriptions that are no longer valid (410 Gone)
  const expired = results
    .map((r, i) => ({ r, sub: subs[i] }))
    .filter(({ r }) => r.status === 'rejected' && (r.reason as { statusCode?: number })?.statusCode === 410)
    .map(({ sub }) => sub.endpoint);
  if (expired.length) {
    await supabase.from('push_subscriptions').delete().in('endpoint', expired);
  }

  const sent = results.filter(r => r.status === 'fulfilled').length;
  return NextResponse.json({ sent });
}
