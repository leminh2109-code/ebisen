// Vercel Cron gọi route này mỗi tối để điền thời tiết cho các ngày gần nhất.
// Bảo mật: kiểm Authorization = CRON_SECRET (Vercel tự gửi), rồi gọi RPC
// cron_fill_weather bằng anon key (RPC security-definer tự kiểm secret) —
// KHÔNG dùng service_role trên Vercel.
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Trạm V52 — Km52 cao tốc Hà Nội – Hải Phòng (Gia Lộc, Hải Dương).
const LAT = 20.87;
const LON = 106.32;

function condEmoji(code: number): [string, string] {
  if (code === 0 || code === 1) return ['Nắng', '☀️'];
  if (code === 2) return ['Ít mây', '⛅'];
  if (code === 3) return ['Nhiều mây', '☁️'];
  if (code === 45 || code === 48) return ['Sương mù', '🌫️'];
  if (code === 95 || code === 96 || code === 99) return ['Giông', '⛈️'];
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 85, 86].includes(code))
    return ['Mưa', '🌧️'];
  return ['Khác', '🌡️'];
}

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}` +
    `&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum` +
    `&past_days=7&forecast_days=1&timezone=Asia%2FBangkok`;
  const w = await fetch(url, { cache: 'no-store' }).then((r) => r.json());
  const d = w.daily;
  if (!d?.time) {
    return NextResponse.json({ error: 'weather_fetch_failed' }, { status: 502 });
  }

  const rows = d.time.map((day: string, i: number) => {
    const [cond, emo] = condEmoji(d.weathercode[i]);
    const tmax = d.temperature_2m_max[i];
    const rain = d.precipitation_sum[i] ?? 0;
    const disp = `${emo} ${cond} · ${Math.round(tmax)}°` + (rain > 0 ? ` · ${rain}mm` : '');
    return { date: day, weather: disp, weather_cond: cond, temp_max: tmax, rain_mm: rain };
  });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  const { data, error } = await supabase.rpc('cron_fill_weather', {
    p_secret: secret,
    p_rows: rows,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, updated: data, days: rows.length });
}
