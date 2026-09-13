'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export type SupermarketState = { ok: boolean; error: string | null };

export async function createBatch(
  _prev: SupermarketState,
  formData: FormData,
): Promise<SupermarketState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Phiên đăng nhập hết hạn.' };

  const batch_date = String(formData.get('batch_date') ?? '').trim();
  const quantity_in = parseInt(String(formData.get('quantity_in') ?? ''));
  const note = String(formData.get('note') ?? '').trim() || null;

  if (!batch_date) return { ok: false, error: 'Thiếu ngày giao hàng.' };
  if (!quantity_in || quantity_in <= 0) return { ok: false, error: 'Số hộp không hợp lệ.' };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from('supermarket_batches').insert({
    batch_date, quantity_in, note, created_by: user.id,
  });
  if (error) return { ok: false, error: (error as { message: string }).message };

  revalidatePath('/supermarket');
  return { ok: true, error: null };
}

export async function updateSold(
  _prev: SupermarketState,
  formData: FormData,
): Promise<SupermarketState> {
  const supabase = await createClient();
  const id = String(formData.get('id') ?? '').trim();
  const quantity_sold = parseInt(String(formData.get('quantity_sold') ?? ''));
  if (!id) return { ok: false, error: 'Thiếu ID.' };
  if (isNaN(quantity_sold) || quantity_sold < 0) return { ok: false, error: 'Số không hợp lệ.' };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('supermarket_batches')
    .update({ quantity_sold })
    .eq('id', id);
  if (error) return { ok: false, error: (error as { message: string }).message };

  revalidatePath('/supermarket');
  return { ok: true, error: null };
}

export async function deleteBatch(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const id = String(formData.get('id') ?? '').trim();
  if (!id) return;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from('supermarket_batches').delete().eq('id', id);
  revalidatePath('/supermarket');
}
