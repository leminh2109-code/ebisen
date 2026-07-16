'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export type RegenState = { token: string | null; error: string | null };

/** Tạo lại token link công khai (vô hiệu link cũ). Owner-only (kiểm tra trong RPC). */
export async function regenerateLink(): Promise<RegenState> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('regenerate_public_form_token');
  if (error) {
    if (error.message.includes('not_owner'))
      return { token: null, error: 'Chỉ chủ DN được tạo lại link.' };
    return { token: null, error: 'Không tạo lại được. Thử lại.' };
  }
  revalidatePath('/share');
  return { token: data as string, error: null };
}
