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

const EMOJI: Record<string, string> = {
  Nắng: '☀️',
  'Ít mây': '⛅',
  'Nhiều mây': '☁️',
  Mưa: '🌧️',
  Giông: '⛈️',
};

// Phân loại theo GIỜ NẮNG + MƯA (weathercode chỉ để nhận diện giông).
// weathercode = "thời tiết xấu nhất trong ngày" nên KHÔNG dùng làm điều kiện chính.
function classify(sunH: number, rainMm: number, code: number): string {
  if (rainMm >= 3 && sunH < 9) return code === 95 || code === 96 || code === 99 ? 'Giông' : 'Mưa';
  if (sunH >= 9) return 'Nắng';
  if (sunH >= 5) return 'Ít mây';
  return 'Nhiều mây';
}

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}` +
    `&daily=weathercode,temperature_2m_max,apparent_temperature_max,sunshine_duration,precipitation_sum` +
    `&past_days=7&forecast_days=1&timezone=Asia%2FBangkok`;
  const w = await fetch(url, { cache: 'no-store' }).then((r) => r.json());
  const d = w.daily;
  if (!d?.time) {
    return NextResponse.json({ error: 'weather_fetch_failed' }, { status: 502 });
  }

  const rows = d.time.map((day: string, i: number) => {
    const tmax = d.temperature_2m_max[i];
    const feels = d.apparent_temperature_max[i];
    const sunH = (d.sunshine_duration[i] ?? 0) / 3600;
    const rain = d.precipitation_sum[i] ?? 0;
    const cond = classify(sunH, rain, d.weathercode[i]);
    const disp =
      `${EMOJI[cond] ?? '🌡️'} ${cond} · ${Math.round(feels)}°` + (rain >= 1 ? ` · ${rain}mm` : '');
    return {
      date: day,
      weather: disp,
      weather_cond: cond,
      temp_max: tmax,
      feels_max: feels,
      sunshine_hours: Math.round(sunH * 10) / 10,
      rain_mm: rain,
    };
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
