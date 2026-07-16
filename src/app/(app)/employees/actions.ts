'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export type EmployeeState = { ok: boolean; error: string | null };

async function requireOwner() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, ok: false as const, error: 'Chưa đăng nhập.' };
  const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (data?.role !== 'owner')
    return { supabase, ok: false as const, error: 'Chỉ chủ DN được sửa nhân viên.' };
  return { supabase, ok: true as const, error: null };
}

export async function createEmployee(
  _prev: EmployeeState,
  formData: FormData,
): Promise<EmployeeState> {
  const { supabase, ok, error } = await requireOwner();
  if (!ok) return { ok: false, error };

  const name = String(formData.get('name') ?? '').trim();
  const phone = String(formData.get('phone') ?? '').trim() || null;
  if (!name) return { ok: false, error: 'Thiếu tên nhân viên.' };

  const { error: err } = await supabase.from('employees').insert({ name, phone });
  if (err) {
    if (err.code === '23505') return { ok: false, error: `Nhân viên "${name}" đã có.` };
    return { ok: false, error: err.message };
  }
  revalidatePath('/employees');
  revalidatePath('/entry/sale');
  return { ok: true, error: null };
}

export async function updateEmployee(
  _prev: EmployeeState,
  formData: FormData,
): Promise<EmployeeState> {
  const { supabase, ok, error } = await requireOwner();
  if (!ok) return { ok: false, error };

  const id = String(formData.get('id') ?? '');
  const name = String(formData.get('name') ?? '').trim();
  const phone = String(formData.get('phone') ?? '').trim() || null;
  const active = formData.get('active') === 'on';
  if (!id) return { ok: false, error: 'Thiếu id nhân viên.' };
  if (!name) return { ok: false, error: 'Thiếu tên nhân viên.' };

  const { error: err } = await supabase
    .from('employees')
    .update({ name, phone, active })
    .eq('id', id);
  if (err) {
    if (err.code === '23505') return { ok: false, error: `Nhân viên "${name}" đã có.` };
    return { ok: false, error: err.message };
  }

  revalidatePath('/employees');
  revalidatePath('/entry/sale');
  return { ok: true, error: null };
}
