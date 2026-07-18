'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export type MenuState = { ok: boolean; error: string | null };

function parsePrice(raw: string): number | null {
  const cleaned = raw.replace(/[.\s,₫đ]/gi, '').trim();
  if (cleaned === '') return null;
  const n = Number(cleaned);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

async function requireOwner() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, ok: false as const, error: 'Chưa đăng nhập.' };
  const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (data?.role !== 'owner')
    return { supabase, ok: false as const, error: 'Chỉ chủ DN được sửa thực đơn.' };
  return { supabase, ok: true as const, error: null };
}

export async function createMenuItem(
  _prev: MenuState,
  formData: FormData,
): Promise<MenuState> {
  const { supabase, ok, error } = await requireOwner();
  if (!ok) return { ok: false, error };

  const name = String(formData.get('name') ?? '').trim();
  const price = parsePrice(String(formData.get('price') ?? ''));
  if (!name) return { ok: false, error: 'Thiếu tên món.' };
  if (price === null) return { ok: false, error: 'Giá không hợp lệ.' };

  const { error: err } = await supabase.from('menu').insert({ name, price });
  if (err) {
    if (err.code === '23505') return { ok: false, error: `Món "${name}" đã có.` };
    return { ok: false, error: err.message };
  }
  revalidatePath('/menu');
  revalidatePath('/entry/sale');
  return { ok: true, error: null };
}

export async function updateMenuItem(
  _prev: MenuState,
  formData: FormData,
): Promise<MenuState> {
  const { supabase, ok, error } = await requireOwner();
  if (!ok) return { ok: false, error };

  const id = String(formData.get('id') ?? '');
  const price = parsePrice(String(formData.get('price') ?? ''));
  const active = formData.get('active') === 'on';
  const shrimpRaw = parsePrice(String(formData.get('shrimp_per_unit') ?? ''));
  const shrimp_per_unit = shrimpRaw === null ? 0 : Math.round(shrimpRaw);
  if (!id) return { ok: false, error: 'Thiếu id món.' };
  if (price === null) return { ok: false, error: 'Giá không hợp lệ.' };

  const { error: err } = await supabase
    .from('menu')
    .update({ price, active, shrimp_per_unit })
    .eq('id', id);
  if (err) return { ok: false, error: err.message };

  revalidatePath('/menu');
  revalidatePath('/entry/sale');
  revalidatePath('/inventory');
  return { ok: true, error: null };
}
