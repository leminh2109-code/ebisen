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

/** Đặt slug tùy chỉnh cho link nhập (vô hiệu link cũ). Owner-only (kiểm tra trong RPC). */
export async function setSlug(slug: string): Promise<RegenState> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('set_public_form_slug', {
    p_slug: slug,
  });
  if (error) {
    if (error.message.includes('not_owner'))
      return { token: null, error: 'Chỉ chủ DN được đổi link.' };
    if (error.message.includes('invalid_slug'))
      return {
        token: null,
        error: 'Chỉ dùng chữ thường, số, gạch ngang (3–40 ký tự).',
      };
    return { token: null, error: 'Không đổi được. Thử lại.' };
  }
  revalidatePath('/share');
  return { token: data as string, error: null };
}

/** Tạo lại token link XEM công khai (vô hiệu link cũ). Owner-only (kiểm tra trong RPC). */
export async function regenerateViewLink(): Promise<RegenState> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('regenerate_public_view_token');
  if (error) {
    if (error.message.includes('not_owner'))
      return { token: null, error: 'Chỉ chủ DN được tạo lại link.' };
    return { token: null, error: 'Không tạo lại được. Thử lại.' };
  }
  revalidatePath('/share');
  return { token: data as string, error: null };
}

/** Đặt slug tùy chỉnh cho link XEM (vô hiệu link cũ). Owner-only (kiểm tra trong RPC). */
export async function setViewSlug(slug: string): Promise<RegenState> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('set_public_view_slug', {
    p_slug: slug,
  });
  if (error) {
    if (error.message.includes('not_owner'))
      return { token: null, error: 'Chỉ chủ DN được đổi link.' };
    if (error.message.includes('invalid_slug'))
      return {
        token: null,
        error: 'Chỉ dùng chữ thường, số, gạch ngang (3–40 ký tự).',
      };
    return { token: null, error: 'Không đổi được. Thử lại.' };
  }
  revalidatePath('/share');
  return { token: data as string, error: null };
}

/** Tạo lại token link nhập KHÁCH công khai (vô hiệu link cũ). Owner-only. */
export async function regenerateCustomerLink(): Promise<RegenState> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('regenerate_public_customer_token');
  if (error) {
    if (error.message.includes('not_owner'))
      return { token: null, error: 'Chỉ chủ DN được tạo lại link.' };
    return { token: null, error: 'Không tạo lại được. Thử lại.' };
  }
  revalidatePath('/share');
  return { token: data as string, error: null };
}

/** Đặt slug tùy chỉnh cho link nhập KHÁCH (vô hiệu link cũ). Owner-only. */
export async function setCustomerSlug(slug: string): Promise<RegenState> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('set_public_customer_slug', {
    p_slug: slug,
  });
  if (error) {
    if (error.message.includes('not_owner'))
      return { token: null, error: 'Chỉ chủ DN được đổi link.' };
    if (error.message.includes('invalid_slug'))
      return {
        token: null,
        error: 'Chỉ dùng chữ thường, số, gạch ngang (3–40 ký tự).',
      };
    return { token: null, error: 'Không đổi được. Thử lại.' };
  }
  revalidatePath('/share');
  return { token: data as string, error: null };
}
